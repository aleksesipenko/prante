import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

import { exportTranslation, type ExportFormat } from "./export.js";
import { fuzzyScore, normalize } from "./fuzzy.js";
import {
  extractTermCandidates,
  findGlossaryHits,
  type GlossaryEntry,
} from "./glossary.js";
import { createTmStore, type TmUnit } from "./memory.js";
import { segmentText, repeatedFragments } from "./segmentation.js";
import { createJsonStorage } from "./storage.js";

type ApprovalStatus = "candidate" | "active" | "user_approved" | "client_approved" | "deprecated";
type CandidateType = "glossary_term" | "tm_unit" | "rule" | "post_edit_pattern";

const ApprovedStatus = Type.Union([
  Type.Literal("candidate"),
  Type.Literal("active"),
  Type.Literal("user_approved"),
  Type.Literal("client_approved"),
  Type.Literal("deprecated"),
]);

const ScopeArray = Type.Optional(Type.Array(Type.String(), { description: "Project/client/domain scopes. Empty means global." }));

function storage() {
  return createJsonStorage();
}

function nowIso(): string {
  return new Date().toISOString();
}

function approved(status: ApprovalStatus | undefined): boolean {
  return status === "active" || status === "user_approved" || status === "client_approved";
}

function safeStatus(requested: ApprovalStatus | undefined, explicitApproval: boolean | undefined): ApprovalStatus {
  const status = requested ?? "candidate";
  if (approved(status) && !explicitApproval) return "candidate";
  return status;
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function textIncludes(haystack: string, needle: string): boolean {
  const n = normalize(needle);
  if (!n) return false;
  return normalize(haystack).includes(n);
}

function styleMetrics(text: string, segments: ReturnType<typeof segmentText>) {
  const wordCount = segments.reduce((sum, s) => sum + s.wordCount, 0);
  const charCount = text.length;
  const averageSegmentWords = segments.length ? Math.round((wordCount / segments.length) * 10) / 10 : 0;
  const longSegments = segments.filter((s) => s.wordCount >= 35).map((s) => ({ index: s.index, wordCount: s.wordCount, preview: s.text.slice(0, 120) }));
  const risks: string[] = [];
  if (averageSegmentWords >= 28) risks.push("Длинные сегменты: вероятно, черновик лучше разбивать и проверять по частям.");
  if (longSegments.length > 0) risks.push("Есть очень длинные сегменты; возможны потери связей и терминов при переводе.");
  if (/\b(?:however|therefore|moreover|thus|nevertheless)\b/i.test(text)) risks.push("Есть логические связки; проверьте сохранение дискурсивных отношений в переводе.");
  if (/[A-Z][A-Z0-9_-]{2,}/.test(text)) risks.push("Есть аббревиатуры/коды; стоит проверить, переводятся ли они или остаются как есть.");
  return { charCount, wordCount, averageSegmentWords, longSegments, risks };
}

function extractPlaceholders(text: string): string[] {
  const patterns = [
    /\{\{?\s*[A-Za-z0-9_.-]+\s*\}?\}/g,
    /%\d*\$?[sdif]/g,
    /\$\{\s*[A-Za-z0-9_.-]+\s*\}/g,
    /\[[A-Za-z0-9_.-]+\]/g,
    /<\/?[A-Za-z][A-Za-z0-9:_-]*(?:\s+[^<>]*?)?>/g,
  ];
  return patterns.flatMap((pattern) => text.match(pattern) ?? []).map((item) => item.replace(/\s+/g, ""));
}

function extractNumbers(text: string): string[] {
  return (text.match(/(?<![\p{L}\p{N}])-?\d+(?:[.,:]\d+)*(?:[%‰])?(?![\p{L}\p{N}])/gu) ?? [])
    .map((item) => item.replace(/,/g, "."));
}

function extractUrlsAndEmails(text: string): string[] {
  return text.match(/(?:https?:\/\/[^\s)]+)|(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi) ?? [];
}

function multisetDiff(sourceItems: string[], targetItems: string[]) {
  const targetCounts = new Map<string, number>();
  for (const item of targetItems) targetCounts.set(item, (targetCounts.get(item) ?? 0) + 1);
  const missing: string[] = [];
  for (const item of sourceItems) {
    const count = targetCounts.get(item) ?? 0;
    if (count > 0) targetCounts.set(item, count - 1);
    else missing.push(item);
  }
  return missing;
}

function compareInvariantSets(sourceText: string, targetText: string) {
  const sourcePlaceholders = extractPlaceholders(sourceText);
  const targetPlaceholders = extractPlaceholders(targetText);
  const sourceNumbers = extractNumbers(sourceText);
  const targetNumbers = extractNumbers(targetText);
  const sourceLinks = extractUrlsAndEmails(sourceText);
  const targetLinks = extractUrlsAndEmails(targetText);
  return {
    placeholders: {
      source: sourcePlaceholders,
      target: targetPlaceholders,
      missing: multisetDiff(sourcePlaceholders, targetPlaceholders),
      added: multisetDiff(targetPlaceholders, sourcePlaceholders),
    },
    numbers: {
      source: sourceNumbers,
      target: targetNumbers,
      missing: multisetDiff(sourceNumbers, targetNumbers),
      added: multisetDiff(targetNumbers, sourceNumbers),
    },
    links: {
      source: sourceLinks,
      target: targetLinks,
      missing: multisetDiff(sourceLinks, targetLinks),
      added: multisetDiff(targetLinks, sourceLinks),
    },
  };
}

function compareSegmentPairs(sourceText: string, draftText: string | undefined, finalText: string) {
  const sourceSegments = segmentText(sourceText);
  const draftSegments = draftText ? segmentText(draftText) : [];
  const finalSegments = segmentText(finalText);
  const max = Math.max(sourceSegments.length, draftSegments.length, finalSegments.length);
  const pairs = [];
  const warnings: string[] = [];
  for (let i = 0; i < max; i++) {
    const source = sourceSegments[i]?.text ?? "";
    const draft = draftSegments[i]?.text ?? "";
    const final = finalSegments[i]?.text ?? "";
    const draftFinalScore = draft && final ? fuzzyScore(draft, final) : null;
    const sourceFinalLengthRatio = source && final ? Math.round((final.length / source.length) * 100) / 100 : null;
    if (!final) warnings.push(`Сегмент ${i}: нет финального перевода.`);
    if (source && final && sourceFinalLengthRatio !== null && (sourceFinalLengthRatio < 0.35 || sourceFinalLengthRatio > 2.8)) {
      warnings.push(`Сегмент ${i}: подозрительное соотношение длин source/final (${sourceFinalLengthRatio}).`);
    }
    pairs.push({ index: i, source, draft, final, draftFinalScore, sourceFinalLengthRatio });
  }
  const candidatePatterns = pairs
    .filter((p) => typeof p.draftFinalScore === "number" && p.draftFinalScore < 75 && p.draft && p.final)
    .slice(0, 8)
    .map((p) => ({
      type: "post_edit_pattern_candidate",
      segmentIndex: p.index,
      evidence: { draft: p.draft.slice(0, 240), final: p.final.slice(0, 240), score: p.draftFinalScore },
      status: "candidate",
    }));
  return { sourceSegments, draftSegments, finalSegments, pairs, warnings, candidatePatterns };
}

async function loadGlossary(): Promise<GlossaryEntry[]> {
  return storage().read<GlossaryEntry>("glossary_terms");
}

export async function qaCheck(params: {
  sourceText: string;
  targetText: string;
  sourceLang?: string;
  targetLang?: string;
  scope?: string;
}) {
  const glossary = await loadGlossary();
  const sourceHits = findGlossaryHits(params.sourceText, glossary, {
    sourceLang: params.sourceLang,
    targetLang: params.targetLang,
    scope: params.scope,
    includeCandidates: false,
  });
  const missingTerms = [];
  const forbiddenTerms = [];
  for (const hit of sourceHits) {
    if (!textIncludes(params.targetText, hit.preferred)) {
      missingTerms.push({ source: hit.source, preferred: hit.preferred, evidence: hit.matched });
    }
    const entry = glossary.find((e) => e.id === hit.entryId || hit.entryId.startsWith(`${e.id}#`));
    if (!entry) continue;
    for (const forbidden of entry.forbidden ?? []) {
      if (textIncludes(params.targetText, forbidden)) {
        forbiddenTerms.push({ source: entry.source, forbidden, preferred: entry.preferred });
      }
    }
  }

  const sourceSegments = segmentText(params.sourceText);
  const targetSegments = segmentText(params.targetText);
  const invariants = compareInvariantSets(params.sourceText, params.targetText);
  const warnings: string[] = [];
  if (sourceSegments.length !== targetSegments.length) {
    warnings.push(`Количество сегментов различается: source=${sourceSegments.length}, target=${targetSegments.length}. Это не всегда ошибка, но требует проверки.`);
  }
  for (let i = 0; i < Math.min(sourceSegments.length, targetSegments.length); i++) {
    const src = sourceSegments[i];
    const tgt = targetSegments[i];
    const ratio = src.charCount ? tgt.charCount / src.charCount : 1;
    if (ratio < 0.35 || ratio > 2.8) warnings.push(`Сегмент ${i}: подозрительное соотношение длин ${Math.round(ratio * 100) / 100}.`);
  }
  if (invariants.placeholders.missing.length || invariants.placeholders.added.length) {
    warnings.push(`Плейсхолдеры/теги не совпадают: missing=${invariants.placeholders.missing.length}, added=${invariants.placeholders.added.length}.`);
  }
  if (invariants.numbers.missing.length || invariants.numbers.added.length) {
    warnings.push(`Числа/даты не совпадают: missing=${invariants.numbers.missing.length}, added=${invariants.numbers.added.length}.`);
  }
  if (invariants.links.missing.length || invariants.links.added.length) {
    warnings.push(`URL/email не совпадают: missing=${invariants.links.missing.length}, added=${invariants.links.added.length}.`);
  }
  if (missingTerms.length) warnings.push(`Не найдены предпочтительные переводы терминов: ${missingTerms.length}.`);
  if (forbiddenTerms.length) warnings.push(`Обнаружены запрещённые варианты терминов: ${forbiddenTerms.length}.`);

  return {
    ok: warnings.length === 0,
    warnings,
    sourceSegmentCount: sourceSegments.length,
    targetSegmentCount: targetSegments.length,
    glossaryHits: sourceHits,
    missingTerms,
    forbiddenTerms,
    invariants,
  };
}

export default defineToolPlugin({
  id: "prante-translator-tools",
  name: "PRANTE Translator Tools",
  description: "Deterministic translation-analysis tools for PRANTE: segmentation, repeats, glossary, TM, memory candidates, comparison, QA, and exportable translation files.",
  configSchema: Type.Object({
    stateDir: Type.Optional(Type.String({ description: "Optional local state directory. Defaults to OPENCLAW_STATE_DIR/prante-translator-tools or ~/.openclaw-prante/state/prante-translator-tools." })),
    exportDir: Type.Optional(Type.String({ description: "Optional output directory for exported translation files. Defaults to the PRANTE workspace exports directory." })),
  }, { additionalProperties: false }),
  tools: (tool) => [
    tool({
      name: "prante_analyze_text",
      label: "PRANTE Analyze Text",
      description: "Run deterministic pre-translation analysis: segments, repeated fragments, term candidates, style/readability risks, and glossary hits.",
      parameters: Type.Object({
        text: Type.String({ description: "Source text to analyze." }),
        sourceLang: Type.Optional(Type.String()),
        targetLang: Type.Optional(Type.String()),
        domain: Type.Optional(Type.String()),
        maxTerms: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
      }),
      async execute({ text, sourceLang, targetLang, domain, maxTerms }) {
        const segments = segmentText(text);
        const glossary = await loadGlossary();
        const glossaryHits = findGlossaryHits(text, glossary, { sourceLang, targetLang, scope: domain, includeCandidates: false });
        return {
          segmentCount: segments.length,
          segments,
          repeats: repeatedFragments(text, { limit: 12 }),
          termCandidates: extractTermCandidates(text, { limit: maxTerms ?? 20 }),
          glossaryHits,
          metrics: styleMetrics(text, segments),
        };
      },
    }),
    tool({
      name: "prante_glossary_lookup",
      label: "PRANTE Glossary Lookup",
      description: "Find approved glossary matches and term candidates for a source text.",
      parameters: Type.Object({
        text: Type.String(),
        sourceLang: Type.Optional(Type.String()),
        targetLang: Type.Optional(Type.String()),
        scope: Type.Optional(Type.String()),
        includeCandidates: Type.Optional(Type.Boolean()),
      }),
      async execute({ text, sourceLang, targetLang, scope, includeCandidates }) {
        const entries = await loadGlossary();
        return {
          entryCount: entries.length,
          hits: findGlossaryHits(text, entries, { sourceLang, targetLang, scope, includeCandidates }),
          termCandidates: extractTermCandidates(text, { limit: 20 }),
        };
      },
    }),
    tool({
      name: "prante_memory_lookup",
      label: "PRANTE Memory Lookup",
      description: "Look up fuzzy translation-memory matches for a source text or source segments.",
      parameters: Type.Object({
        sourceText: Type.Optional(Type.String()),
        sourceSegments: Type.Optional(Type.Array(Type.String())),
        sourceLang: Type.Optional(Type.String()),
        targetLang: Type.Optional(Type.String()),
        scope: Type.Optional(Type.String()),
        limit: Type.Optional(Type.Number({ minimum: 1, maximum: 20 })),
        minScore: Type.Optional(Type.Number({ minimum: 0, maximum: 100 })),
      }),
      async execute({ sourceText, sourceSegments, sourceLang, targetLang, scope, limit, minScore }) {
        const store = createTmStore(storage());
        const queries = sourceSegments?.length ? sourceSegments : [sourceText ?? ""];
        const results = [];
        for (const query of queries.filter(Boolean)) {
          results.push({
            query,
            matches: await store.lookup(query, { sourceLang, targetLang, scope, limit, minScore }),
          });
        }
        return { results };
      },
    }),
    tool({
      name: "prante_save_memory_candidate",
      label: "PRANTE Save Memory Candidate",
      description: "Save a glossary term, TM unit, translation rule, or post-edit pattern. Approved/active statuses require explicitApproval=true.",
      parameters: Type.Object({
        type: Type.Union([
          Type.Literal("glossary_term"),
          Type.Literal("tm_unit"),
          Type.Literal("rule"),
          Type.Literal("post_edit_pattern"),
        ]),
        explicitApproval: Type.Optional(Type.Boolean({ description: "True only when the user explicitly said to save/remember/approve." })),
        approvalStatus: Type.Optional(ApprovedStatus),
        payload: Type.Object({}, { additionalProperties: true }),
      }),
      async execute({ type, explicitApproval, approvalStatus, payload }) {
        const st = storage();
        const status = safeStatus(approvalStatus as ApprovalStatus | undefined, explicitApproval);
        const timestamp = nowIso();
        let row: Record<string, unknown>;
        let collection: string;
        if (type === "glossary_term") {
          collection = "glossary_terms";
          row = {
            id: String(payload.id ?? randomUUID()),
            source: String(payload.source ?? payload.source_term ?? ""),
            preferred: String(payload.preferred ?? payload.preferred_target ?? payload.target ?? ""),
            forbidden: asStrings(payload.forbidden ?? payload.forbidden_variants),
            scope: asStrings(payload.scope),
            status,
            notes: typeof payload.notes === "string" ? payload.notes : undefined,
            sourceLang: typeof payload.sourceLang === "string" ? payload.sourceLang : undefined,
            targetLang: typeof payload.targetLang === "string" ? payload.targetLang : undefined,
            evidence: payload.evidence ?? [],
            createdAt: timestamp,
            updatedAt: timestamp,
          };
        } else if (type === "tm_unit") {
          collection = "tm_units";
          row = {
            id: String(payload.id ?? randomUUID()),
            source: String(payload.source ?? payload.source_text ?? ""),
            target: String(payload.target ?? payload.target_text ?? ""),
            sourceLang: typeof payload.sourceLang === "string" ? payload.sourceLang : undefined,
            targetLang: typeof payload.targetLang === "string" ? payload.targetLang : undefined,
            scope: asStrings(payload.scope),
            status,
            notes: typeof payload.notes === "string" ? payload.notes : undefined,
            evidence: payload.evidence ?? [],
            createdAt: timestamp,
            updatedAt: timestamp,
          } satisfies TmUnit & { evidence?: unknown };
        } else if (type === "rule") {
          collection = "translation_rules";
          row = { id: String(payload.id ?? randomUUID()), ...payload, status, createdAt: timestamp, updatedAt: timestamp };
        } else {
          collection = "post_edit_patterns";
          row = { id: String(payload.id ?? randomUUID()), ...payload, status, createdAt: timestamp, updatedAt: timestamp };
        }
        if ((type === "glossary_term" && (!row.source || !row.preferred)) || (type === "tm_unit" && (!row.source || !row.target))) {
          return { ok: false, error: "Missing required source/preferred or source/target fields.", statusForcedTo: status };
        }
        await st.append(collection, row);
        return { ok: true, collection, status, forcedCandidate: status === "candidate" && approved(approvalStatus as ApprovalStatus | undefined) && !explicitApproval, row };
      },
    }),
    tool({
      name: "prante_export_translation",
      label: "PRANTE Export Translation",
      description: "Materialize a finished translation as local .docx and/or .txt files under the PRANTE workspace export directory. Return files[].mediaUrl/path for the message tool's structured attachment payload; do not invent MEDIA paths.",
      parameters: Type.Object({
        translationText: Type.String({ description: "Final translated text to write into the exported file." }),
        sourceText: Type.Optional(Type.String({ description: "Optional source text to append for reviewer context." })),
        title: Type.Optional(Type.String({ description: "Human-readable document title." })),
        filenameBase: Type.Optional(Type.String({ description: "Safe base filename without extension, e.g. Rising_Oil_Prices_Translation_RU." })),
        targetLang: Type.Optional(Type.String({ description: "Target language label, e.g. ru." })),
        formats: Type.Optional(Type.Array(Type.Union([Type.Literal("docx"), Type.Literal("txt")]), { description: "Export formats. Defaults to both docx and txt." })),
        outputDir: Type.Optional(Type.String({ description: "Operator override for export directory. Usually omit." })),
      }),
      async execute({ translationText, sourceText, title, filenameBase, targetLang, formats, outputDir }) {
        return exportTranslation({
          translationText,
          sourceText,
          title,
          filenameBase,
          targetLang,
          formats: formats as ExportFormat[] | undefined,
          outputDir,
        });
      },
    }),
    tool({
      name: "prante_compare_translation",
      label: "PRANTE Compare Translation",
      description: "Compare source, optional draft, and final translation segments; propose candidate post-edit patterns without activating memory.",
      parameters: Type.Object({
        sourceText: Type.String(),
        finalText: Type.String(),
        draftText: Type.Optional(Type.String()),
        sourceLang: Type.Optional(Type.String()),
        targetLang: Type.Optional(Type.String()),
      }),
      async execute({ sourceText, draftText, finalText }) {
        return compareSegmentPairs(sourceText, draftText, finalText);
      },
    }),
    tool({
      name: "prante_qa_check",
      label: "PRANTE QA Check",
      description: "Run deterministic QA on source/target translation: terminology, forbidden variants, segment count, and length ratio warnings.",
      parameters: Type.Object({
        sourceText: Type.String(),
        targetText: Type.String(),
        sourceLang: Type.Optional(Type.String()),
        targetLang: Type.Optional(Type.String()),
        scope: Type.Optional(Type.String()),
      }),
      async execute({ sourceText, targetText, sourceLang, targetLang, scope }) {
        return qaCheck({ sourceText, targetText, sourceLang, targetLang, scope });
      },
    }),
  ],
});

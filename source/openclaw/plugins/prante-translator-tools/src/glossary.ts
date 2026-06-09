// PRANTE Translator Tools — glossary matching.
//
// A glossary entry maps a source term to a preferred target translation and
// optional forbidden variants. The matcher walks the input text linearly
// and emits a hit for every match. We use a normalized substring scan (case-
// insensitive, whitespace-collapsed) instead of building a full Aho-Corasick
// automaton because the corpus is small in MVP and the code stays readable.
//
// FlashText is documented as the preferred library once the corpus grows.
// To upgrade, replace `findGlossaryHits` with an FFI call to Python; the
// public tool surface does not change.

import { normalize } from "./fuzzy.js";

export interface GlossaryEntry {
  id: string;
  source: string;
  preferred: string;
  forbidden: string[];
  // Optional: scope (project / client / domain). Empty array = global.
  scope: string[];
  // Approval status. The plugin only auto-uses approved entries in QA.
  status: "candidate" | "active" | "user_approved" | "client_approved" | "deprecated";
  notes?: string;
  createdAt: string;
}

export interface GlossaryHit {
  entryId: string;
  source: string;
  preferred: string;
  start: number;
  end: number;
  matched: string;
  approved: boolean;
}

export interface GlossaryLookupOptions {
  sourceLang?: string;
  targetLang?: string;
  scope?: string;
  // If false, candidates are filtered out and only approved entries match.
  includeCandidates?: boolean;
}

function isApproved(status: GlossaryEntry["status"]): boolean {
  return status === "active" || status === "user_approved" || status === "client_approved";
}

function entryMatchesScope(entry: GlossaryEntry, scope: string | undefined): boolean {
  if (!scope) return true;
  if (!entry.scope || entry.scope.length === 0) return true;
  return entry.scope.includes(scope);
}

function entryMatchesLang(
  entry: GlossaryEntry & { sourceLang?: string; targetLang?: string },
  sourceLang: string | undefined,
  targetLang: string | undefined,
): boolean {
  if (entry.sourceLang && sourceLang && entry.sourceLang !== sourceLang) return false;
  if (entry.targetLang && targetLang && entry.targetLang !== targetLang) return false;
  return true;
}

// Scan the text for all occurrences of the entry's source and forbidden
// variants. Returns deterministic, non-overlapping hits sorted by position.
function scanForEntry(
  text: string,
  normalized: string,
  entry: GlossaryEntry,
  options: GlossaryLookupOptions,
): GlossaryHit[] {
  const includeCandidates = options.includeCandidates ?? false;
  if (!isApproved(entry.status) && !includeCandidates) return [];
  const sourceNorm = normalize(entry.source);
  if (!sourceNorm) return [];
  const approved = isApproved(entry.status);
  const hits: GlossaryHit[] = [];
  for (const occ of findAll(normalized, sourceNorm)) {
    hits.push({
      entryId: entry.id,
      source: entry.source,
      preferred: entry.preferred,
      start: occ.start,
      end: occ.end,
      matched: occ.matched,
      approved,
    });
  }
  for (const variant of entry.forbidden ?? []) {
    const variantNorm = normalize(variant);
    if (!variantNorm) continue;
    for (const occ of findAll(normalized, variantNorm)) {
      hits.push({
        entryId: `${entry.id}#forbidden:${variant}`,
        source: entry.source,
        preferred: entry.preferred,
        start: occ.start,
        end: occ.end,
        matched: occ.matched,
        approved: false,
      });
    }
  }
  return hits;
}

function findAll(haystack: string, needle: string): { start: number; end: number; matched: string }[] {
  if (!needle) return [];
  const out: { start: number; end: number; matched: string }[] = [];
  let idx = 0;
  while (idx <= haystack.length - needle.length) {
    const pos = haystack.indexOf(needle, idx);
    if (pos < 0) break;
    out.push({ start: pos, end: pos + needle.length, matched: needle });
    idx = pos + needle.length;
  }
  return out;
}

// Remove overlapping hits by keeping the longest match (then earliest
// position). This avoids the common false-positive where a 3-character
// source term matches inside a longer one.
function dedupeOverlaps(hits: GlossaryHit[]): GlossaryHit[] {
  const sorted = hits.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const out: GlossaryHit[] = [];
  for (const hit of sorted) {
    const last = out[out.length - 1];
    if (last && hit.start < last.end) {
      // Overlap: keep the longer one. If equal length, keep the first seen.
      if (hit.end - hit.start > last.end - last.start) {
        out[out.length - 1] = hit;
      }
      continue;
    }
    out.push(hit);
  }
  return out;
}

export function findGlossaryHits(
  text: string,
  entries: GlossaryEntry[],
  options: GlossaryLookupOptions = {},
): GlossaryHit[] {
  if (!text) return [];
  const normalized = normalize(text);
  const raw: GlossaryHit[] = [];
  for (const entry of entries) {
    if (!entryMatchesScope(entry, options.scope)) continue;
    if (!entryMatchesLang(entry as GlossaryEntry & { sourceLang?: string }, options.sourceLang, options.targetLang)) {
      continue;
    }
    raw.push(...scanForEntry(text, normalized, entry, options));
  }
  return dedupeOverlaps(raw);
}

// Surface candidate terms from the text that are not yet in the glossary.
// Strategy: extract word n-grams of length 1-3 that are non-stopword,
// capitalized, or contain digits, and deduplicate. The result is a
// deterministic ranked list — the LLM should treat it as a hint, not a
// verdict.
const STOPWORDS = new Set<string>([
  // English
  "the", "a", "an", "and", "or", "but", "of", "to", "in", "on", "at", "for", "by", "with", "as", "is", "are", "was", "were", "be", "been", "being",
  "this", "that", "these", "those", "it", "its", "he", "she", "they", "we", "you", "i",
  // Russian
  "и", "или", "но", "не", "в", "на", "по", "для", "к", "с", "из", "у", "о", "об", "за", "от", "до", "что", "это", "эти", "тот", "этот", "как", "так", "все", "его", "её", "их", "мы", "вы", "он", "она", "они",
]);

export interface TermCandidate {
  term: string;
  count: number;
  sample: string;
}

export interface TermCandidateOptions {
  minLength?: number;
  maxNgram?: number;
  limit?: number;
}

export function extractTermCandidates(
  text: string,
  options: TermCandidateOptions = {},
): TermCandidate[] {
  const minLength = options.minLength ?? 3;
  const maxNgram = options.maxNgram ?? 2;
  const limit = options.limit ?? 20;
  if (!text) return [];
  const norm = normalize(text);
  // Tokenize on whitespace and punctuation; keep Cyrillic + Latin words.
  const tokens = norm.split(/[^a-zа-яё0-9\u0400-\u04ff一-鿿]+/iu).filter(Boolean);
  if (tokens.length === 0) return [];
  const known = new Set<string>();
  for (const e of STOPWORDS) known.add(e);
  const counts = new Map<string, { count: number; sample: string }>();
  for (let n = 1; n <= maxNgram; n++) {
    if (tokens.length < n) break;
    for (let i = 0; i + n <= tokens.length; i++) {
      const slice = tokens.slice(i, i + n);
      // Drop if all words are stopwords or too short.
      if (slice.every((t) => known.has(t) || t.length < minLength)) continue;
      const joined = slice.join(" ");
      if (joined.length < minLength) continue;
      const cur = counts.get(joined);
      if (cur) {
        cur.count++;
      } else {
        const startTokenIndex = tokens.indexOf(slice[0], i);
        const sample = extractSample(text, tokens, startTokenIndex, n);
        counts.set(joined, { count: 1, sample });
      }
    }
  }
  const list: TermCandidate[] = [];
  for (const [term, info] of counts) {
    if (info.count < 2) continue;
    list.push({ term, count: info.count, sample: info.sample });
  }
  list.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));
  return list.slice(0, limit);
}

function extractSample(
  original: string,
  normalizedTokens: string[],
  startIdx: number,
  length: number,
): string {
  // Best-effort: return the original text slice around the first occurrence.
  if (startIdx < 0) return normalizedTokens.slice(0, length).join(" ");
  const first = normalizedTokens[startIdx];
  const pos = original.toLowerCase().indexOf(first);
  if (pos < 0) return normalizedTokens.slice(startIdx, startIdx + length).join(" ");
  const last = normalizedTokens[startIdx + length - 1];
  const end = original.toLowerCase().indexOf(last, pos);
  if (end < 0) return original.slice(Math.max(0, pos - 5), pos + 40);
  return original.slice(Math.max(0, pos - 5), end + last.length + 5).trim();
}

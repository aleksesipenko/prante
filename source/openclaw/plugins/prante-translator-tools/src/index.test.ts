import { describe, expect, it } from "vitest";
import entry, { qaCheck } from "./index.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportTranslation } from "./export.js";
import { getToolPluginMetadata } from "openclaw/plugin-sdk/tool-plugin";
import { segmentText, repeatedFragments } from "./segmentation.js";
import { extractTermCandidates, findGlossaryHits, type GlossaryEntry } from "./glossary.js";
import { createTmStore } from "./memory.js";
import { createMemoryStorage } from "./storage.js";

describe("prante-translator-tools", () => {
  it("declares PRANTE tool metadata", () => {
    expect(getToolPluginMetadata(entry)?.tools.map((tool) => tool.name)).toEqual([
      "prante_analyze_text",
      "prante_glossary_lookup",
      "prante_memory_lookup",
      "prante_save_memory_candidate",
      "prante_export_translation",
      "prante_compare_translation",
      "prante_qa_check",
    ]);
  });

  it("segments text and detects repeated fragments", () => {
    const text = "Translation memory improves quality. Translation memory improves speed.";
    const segments = segmentText(text);
    expect(segments).toHaveLength(2);
    const repeats = repeatedFragments(text, { minLength: 10, maxLength: 20, limit: 5 });
    expect(repeats.length).toBeGreaterThan(0);
    expect(repeats[0]?.count).toBe(2);
  });

  it("finds glossary hits and forbidden variants", () => {
    const entries: GlossaryEntry[] = [{
      id: "g1",
      source: "translation memory",
      preferred: "переводческая память",
      forbidden: ["память переводов"],
      scope: [],
      status: "user_approved",
      createdAt: new Date(0).toISOString(),
    }];
    expect(findGlossaryHits("Translation memory matters", entries)).toHaveLength(1);
    expect(findGlossaryHits("память переводов", entries)).toHaveLength(1);
  });

  it("extracts deterministic term candidates", () => {
    const candidates = extractTermCandidates("Adaptive memory helps adaptive memory workflows.", { limit: 5 });
    expect(candidates.some((c) => c.term.includes("adaptive"))).toBe(true);
  });

  it("looks up fuzzy TM matches", async () => {
    const store = createTmStore(createMemoryStorage());
    await store.append({
      id: "tm1",
      source: "Translation memory improves consistency.",
      target: "Переводческая память повышает последовательность.",
      scope: [],
      status: "user_approved",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    });
    const matches = await store.lookup("Translation memory improves consistency", { minScore: 50 });
    expect(matches[0]?.id).toBe("tm1");
  });

  it("flags placeholder, number, and link drift in QA", async () => {
    const result = await qaCheck({
      sourceText: "OpenAI released GPT-5 in 2025. Send {name} to https://example.com by 12:30.",
      targetText: "OpenAI выпустила GPT-5 в 2024. Отправьте данные к 12:30.",
      sourceLang: "en",
      targetLang: "ru",
    });
    expect(result.ok).toBe(false);
    expect(result.invariants.placeholders.missing).toContain("{name}");
    expect(result.invariants.numbers.missing).toContain("2025");
    expect(result.invariants.numbers.added).toContain("2024");
    expect(result.invariants.links.missing).toContain("https://example.com");
    expect(result.warnings.some((warning: string) => warning.includes("Плейсхолдеры"))).toBe(true);
    expect(result.warnings.some((warning: string) => warning.includes("Числа"))).toBe(true);
    expect(result.warnings.some((warning: string) => warning.includes("URL/email"))).toBe(true);
  });

  it("exports translation files as real local DOCX and TXT attachments", async () => {
    const dir = await mkdtemp(join(tmpdir(), "prante-export-"));
    try {
      const result = await exportTranslation({
        translationText: "Цена нефти выросла до $90/bbl. Плейсхолдер {client_name} сохранён.",
        sourceText: "Oil rose to $90/bbl. Keep {client_name}.",
        title: "Rising Oil Prices Translation",
        filenameBase: "Rising_Oil_Prices_Translation_RU",
        targetLang: "ru",
        formats: ["docx", "txt"],
        outputDir: dir,
      });
      expect(result.files.map((file) => file.format)).toEqual(["docx", "txt"]);
      for (const file of result.files) {
        expect(file.path).toBe(file.mediaUrl);
        expect(file.sizeBytes).toBeGreaterThan(100);
        expect(file.sha256).toMatch(/^[a-f0-9]{64}$/);
        const bytes = await readFile(file.path);
        expect(bytes.length).toBe(file.sizeBytes);
      }
      const docx = result.files.find((file) => file.format === "docx");
      expect(docx?.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const docxBytes = await readFile(docx!.path);
      expect(docxBytes.subarray(0, 2).toString("utf8")).toBe("PK");
      const txt = await readFile(result.files.find((file) => file.format === "txt")!.path, "utf8");
      expect(txt).toContain("{client_name}");
      expect(txt).toContain("Цена нефти");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

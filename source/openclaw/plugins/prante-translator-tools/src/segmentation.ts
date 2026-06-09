// PRANTE Translator Tools — text segmentation.
//
// Deterministic, language-neutral segmentation that does not depend on any
// optional library. The unit boundary rule is: a "segment" is one or more
// sentences that share the same paragraph. The paragraph and sentence
// boundaries are detected from whitespace, common punctuation, and CJK
// full-width sentence terminators (。 ！ ？) so the routine works for EN/RU
// and CJK source text without claiming a full locale database.

import { readFile } from "node:fs/promises";

export interface SegmentationOptions {
  minSegmentLength?: number;
  // The caller can override the default paragraph detector if the source is
  // already pre-cleaned (e.g. Telegram message list). Pass an array of
  // non-empty strings to skip the paragraph split.
  preSplitParagraphs?: string[];
}

export interface Segment {
  index: number;
  paragraphIndex: number;
  text: string;
  charCount: number;
  wordCount: number;
}

const SENTENCE_TERMINATORS = /[.!?…。！？]+["»”’)]?\s*/g;
const CJK_RE = /[\u3000-\u303f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const CYRILLIC_RE = /[\u0400-\u04FF]/;

export function detectScript(text: string): "latin" | "cyrillic" | "cjk" | "mixed" | "other" {
  let cjk = 0;
  let cyr = 0;
  let latin = 0;
  let other = 0;
  for (const ch of text) {
    if (CJK_RE.test(ch)) cjk++;
    else if (CYRILLIC_RE.test(ch)) cyr++;
    else if (/[A-Za-z]/.test(ch)) latin++;
    else if (/\s/.test(ch)) continue;
    else other++;
  }
  if (cjk > 0 && cyr + latin + other === 0) return "cjk";
  if (cyr > 0 && latin + cjk + other === 0) return "cyrillic";
  if (latin > 0 && cyr + cjk + other === 0) return "latin";
  if (cjk + cyr + latin + other === 0) return "other";
  return "mixed";
}

export function countWords(text: string): number {
  if (!text) return 0;
  // Split on whitespace; CJK characters each count as a word. This is a
  // coarse estimator, not a tokenizer.
  const script = detectScript(text);
  if (script === "cjk") {
    let count = 0;
    for (const ch of text) {
      if (/\s/.test(ch)) continue;
      if (CJK_RE.test(ch)) count++;
      else if (/[A-Za-z0-9]/.test(ch)) count++;
    }
    return count;
  }
  const tokens = text
    .replace(/[\u3002\uff01\uff1f]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return tokens.length;
}

export function splitParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n+|\r\n\s*\r\n+|\n{2,}/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function splitSentences(paragraph: string): string[] {
  if (!paragraph) return [];
  // Preserve trailing punctuation. We split on terminators, then trim and
  // drop empty pieces.
  const pieces: string[] = [];
  let buf = "";
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    buf += ch;
    if (/[.!?…。！？]/.test(ch)) {
      // Look ahead to absorb one trailing quote/bracket.
      const next = paragraph[i + 1];
      if (next && /["'»”’)]/.test(next)) {
        buf += next;
        i++;
      }
      const candidate = buf.trim();
      if (candidate) pieces.push(candidate);
      buf = "";
    }
  }
  const tail = buf.trim();
  if (tail) pieces.push(tail);
  return pieces;
}

export function segmentText(text: string, options: SegmentationOptions = {}): Segment[] {
  if (text == null) return [];
  const minLen = options.minSegmentLength ?? 0;
  const paragraphs = options.preSplitParagraphs ?? splitParagraphs(text);
  const out: Segment[] = [];
  let index = 0;
  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];
    const sentences = splitSentences(paragraph);
    // A segment is the whole paragraph if it is short, or a single sentence
    // otherwise. We keep it simple but deterministic.
    const chunks = sentences.length > 1 ? sentences : [paragraph];
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (trimmed.length < minLen) continue;
      out.push({
        index: index++,
        paragraphIndex: p,
        text: trimmed,
        charCount: trimmed.length,
        wordCount: countWords(trimmed),
      });
    }
  }
  return out;
}

// Lightweight n-gram (character shingles) repeat counter that is used by the
// analyzer. Returns the top-N shingles that appear more than `minOccurrences`
// times, ordered by (count desc, length desc, lexicographic).
export interface RepeatedFragment {
  fragment: string;
  length: number;
  count: number;
}

export interface RepeatDetectionOptions {
  minLength?: number;
  maxLength?: number;
  minOccurrences?: number;
  limit?: number;
  caseInsensitive?: boolean;
}

export function repeatedFragments(
  text: string,
  options: RepeatDetectionOptions = {},
): RepeatedFragment[] {
  const minLength = options.minLength ?? 4;
  const maxLength = options.maxLength ?? 24;
  const minOccurrences = options.minOccurrences ?? 2;
  const limit = options.limit ?? 10;
  const caseInsensitive = options.caseInsensitive ?? true;
  if (!text) return [];

  const counts = new Map<string, number>();
  const canonical = (s: string) => (caseInsensitive ? s.toLowerCase() : s);
  for (let len = minLength; len <= maxLength; len++) {
    if (text.length < len) break;
    for (let i = 0; i + len <= text.length; i++) {
      const shingle = text.slice(i, i + len);
      const norm = canonical(shingle);
      if (/\s/.test(norm[0]) || /\s/.test(norm[norm.length - 1])) {
        // Skip shingles that start or end on a word boundary — they would
        // mostly be substrings of longer repeats, so they are noise.
        continue;
      }
      counts.set(norm, (counts.get(norm) ?? 0) + 1);
    }
  }

  const filtered: RepeatedFragment[] = [];
  for (const [fragment, count] of counts) {
    if (count < minOccurrences) continue;
    filtered.push({ fragment, length: fragment.length, count });
  }
  filtered.sort((a, b) => b.count - a.count || b.length - a.length || a.fragment.localeCompare(b.fragment));
  return filtered.slice(0, limit);
}

// Read a UTF-8 text file. Helper for the CLI smoke tests.
export async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export { SENTENCE_TERMINATORS };

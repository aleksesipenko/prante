// PRANTE Translator Tools — fuzzy matching primitives (pure TypeScript).
//
// These are not as fast as RapidFuzz but they are deterministic, dependency-
// free, and good enough for the MVP corpus sizes (hundreds to a few thousand
// segments). When the user later installs `rapidfuzz` (Python) we can swap
// this module for an FFI call without changing the public tool surface.

export function normalize(s: string, caseInsensitive = true): string {
  if (!s) return "";
  // Strip leading/trailing whitespace, collapse internal whitespace, lower-
  // case for stable comparisons, drop zero-width characters. We do not strip
  // diacritics because that would change meaning for many translator users.
  const cleaned = s
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return caseInsensitive ? cleaned.toLowerCase() : cleaned;
}

// Iterative Levenshtein distance with early exit. Returns Infinity when the
// two strings differ by more than `maxDistance` (computed as
// abs(a.length - b.length) + 1 by default) so callers can short-circuit.
export function levenshtein(a: string, b: string, maxDistance?: number): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const max = maxDistance ?? Math.max(al, bl);
  if (Math.abs(al - bl) > max) return max + 1;

  // Single-row DP.
  let prev = new Array<number>(bl + 1);
  let curr = new Array<number>(bl + 1);
  for (let j = 0; j <= bl; j++) prev[j] = j;
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    const ac = a.charCodeAt(i - 1);
    for (let j = 1; j <= bl; j++) {
      const cost = ac === b.charCodeAt(j - 1) ? 0 : 1;
      const v = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[bl];
}

// Token-set Jaccard similarity in [0, 1]. Useful when Levenshtein is too
// strict (e.g. word reorder, punctuation differences).
export function jaccard(a: string, b: string): number {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function tokenize(s: string): string[] {
  if (!s) return [];
  return normalize(s)
    .split(/[^a-z0-9а-яё\u0400-\u04ff一-鿿]+/iu)
    .filter((t) => t.length > 0);
}

// Combined score in [0, 100] that prefers exact and near-exact matches but
// still surfaces reordered matches via token Jaccard. 100 = identical.
export function fuzzyScore(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na && !nb) return 100;
  if (!na || !nb) return 0;
  if (na === nb) return 100;
  const maxLen = Math.max(na.length, nb.length);
  const lev = levenshtein(na, nb, Math.max(1, Math.floor(maxLen * 0.6)));
  const levSim = Math.max(0, 1 - lev / maxLen);
  const jac = jaccard(na, nb);
  // Levenshtein dominates for short strings; Jaccard helps when words are
  // reordered. Round to one decimal for stable JSON output.
  return Math.round((0.6 * levSim + 0.4 * jac) * 1000) / 10;
}

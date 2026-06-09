// PRANTE Translator Tools — translation memory (TM) store.
//
// The TM keeps approved source↔target segment pairs. We expose two views:
//   - `listTM()` returns all approved units in a given scope.
//   - `lookupTM()` returns the best fuzzy matches for a source query.
//
// We do not trust upstream RapidFuzz to be installed in the MVP runtime, so
// fuzzy matching is done with the local `fuzzyScore` helper. Upgrading to
// RapidFuzz is a one-function swap.

import type { StorageBackend } from "./storage.js";
import { fuzzyScore, normalize } from "./fuzzy.js";

export const TM_COLLECTION = "tm_units";

export interface TmUnit {
  id: string;
  source: string;
  target: string;
  sourceLang?: string;
  targetLang?: string;
  // Domain / project scope. Empty = global.
  scope: string[];
  // Approval ladder (mirrors glossary). Only approved units are used for
  // draft suggestions, but all units are searchable in QA review.
  status: "candidate" | "active" | "user_approved" | "client_approved" | "deprecated";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TmLookupMatch {
  id: string;
  source: string;
  target: string;
  score: number;
  scope: string[];
  status: TmUnit["status"];
}

export interface TmLookupOptions {
  sourceLang?: string;
  targetLang?: string;
  scope?: string;
  limit?: number;
  minScore?: number;
  // If true (default), exclude deprecated units from results.
  excludeDeprecated?: boolean;
}

export interface TmStore {
  list(): Promise<TmUnit[]>;
  append(unit: TmUnit): Promise<TmUnit[]>;
  remove(id: string): Promise<TmUnit[]>;
  lookup(query: string, options?: TmLookupOptions): Promise<TmLookupMatch[]>;
  get(id: string): Promise<TmUnit | undefined>;
}

export function createTmStore(storage: StorageBackend): TmStore {
  return {
    async list() {
      return storage.read<TmUnit>(TM_COLLECTION);
    },
    async append(unit) {
      return storage.append<TmUnit>(TM_COLLECTION, unit);
    },
    async remove(id) {
      return storage.remove<TmUnit>(TM_COLLECTION, id);
    },
    async get(id) {
      const all = await storage.read<TmUnit>(TM_COLLECTION);
      return all.find((u) => u.id === id);
    },
    async lookup(query, options = {}) {
      const limit = options.limit ?? 5;
      const minScore = options.minScore ?? 30;
      const excludeDeprecated = options.excludeDeprecated ?? true;
      const all = await storage.read<TmUnit>(TM_COLLECTION);
      const sourceNorm = normalize(query);
      const matches: TmLookupMatch[] = [];
      for (const unit of all) {
        if (excludeDeprecated && unit.status === "deprecated") continue;
        if (options.sourceLang && unit.sourceLang && unit.sourceLang !== options.sourceLang) continue;
        if (options.targetLang && unit.targetLang && unit.targetLang !== options.targetLang) continue;
        if (options.scope && unit.scope.length > 0 && !unit.scope.includes(options.scope)) continue;
        const unitNorm = normalize(unit.source);
        if (!unitNorm) continue;
        const score = fuzzyScore(sourceNorm, unitNorm);
        if (score < minScore) continue;
        matches.push({
          id: unit.id,
          source: unit.source,
          target: unit.target,
          score,
          scope: unit.scope,
          status: unit.status,
        });
      }
      matches.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source));
      return matches.slice(0, limit);
    },
  };
}

export function makeUnitId(): string {
  const buf = new Uint8Array(8);
  globalThis.crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

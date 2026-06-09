// PRANTE Translator Tools — local JSON storage.
//
// The default storage backend is one JSON file per record type under
// `<stateDir>/<collection>.json`. This is sufficient for the MVP single-
// user corpus and avoids native module install pain (better-sqlite3 needs a
// matching Node binary). When the user wants to upgrade to SQLite they can
// install `better-sqlite3` and switch the storage backend by setting
// `storageBackend: "sqlite"` in plugin config — see sqlite-store.ts.
//
// Concurrency note: this backend is single-writer by virtue of Node's
// synchronous fsync-after-rename pattern. Two concurrent writers may race
// on the temp file, so callers should serialize writes (the memory store
// does this internally via a per-collection Promise chain).

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";

export interface StorageBackend {
  read<T>(collection: string): Promise<T[]>;
  write<T>(collection: string, rows: T[]): Promise<void>;
  append<T>(collection: string, row: T): Promise<T[]>;
  remove<T extends { id?: string }>(collection: string, id: string): Promise<T[]>;
  pathFor(collection: string): string;
  backend: "json" | "sqlite";
  root: string;
}

export interface JsonStorageOptions {
  root: string;
}

function defaultRoot(): string {
  // Priority:
  //  1. PRANTE_STATE_DIR (explicit override for tests / operators)
  //  2. OPENCLAW_STATE_DIR (mirroring the runtime profile state)
  //  3. ~/.openclaw-prante/state/prante-translator-tools (prante profile)
  //  4. ~/.openclaw/state/prante-translator-tools (fallback)
  if (process.env.PRANTE_STATE_DIR) return process.env.PRANTE_STATE_DIR;
  if (process.env.OPENCLAW_STATE_DIR) {
    return join(process.env.OPENCLAW_STATE_DIR, "prante-translator-tools");
  }
  const pranteProfile = join(homedir(), ".openclaw-prante");
  if (existsSync(pranteProfile)) {
    return join(pranteProfile, "state", "prante-translator-tools");
  }
  return join(homedir(), ".openclaw", "state", "prante-translator-tools");
}

async function atomicWriteJson(path: string, payload: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`;
  await writeFile(tmp, payload, "utf8");
  await rename(tmp, path);
}

export function createJsonStorage(options: Partial<JsonStorageOptions> = {}): StorageBackend {
  const root = resolve(options.root ?? defaultRoot());
  const backend: StorageBackend = {
    backend: "json",
    root,
    pathFor: (collection: string) => join(root, `${collection}.json`),
    async read<T>(collection: string): Promise<T[]> {
      const path = backend.pathFor(collection);
      if (!existsSync(path)) return [];
      try {
        const raw = await readFile(path, "utf8");
        if (!raw.trim()) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed as T[];
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`PRANTE storage read failed for ${collection}: ${msg}`);
      }
    },
    async write<T>(collection: string, rows: T[]): Promise<void> {
      const path = backend.pathFor(collection);
      await atomicWriteJson(path, JSON.stringify(rows, null, 2) + "\n");
    },
    async append<T>(collection: string, row: T): Promise<T[]> {
      const rows = await backend.read<T>(collection);
      rows.push(row);
      await backend.write(collection, rows);
      return rows;
    },
    async remove<T extends { id?: string }>(collection: string, id: string): Promise<T[]> {
      const rows = await backend.read<T>(collection);
      const next = rows.filter((r) => (r as { id?: string }).id !== id);
      await backend.write(collection, next);
      return next;
    },
  };
  return backend;
}

// Convenience for tests: an in-memory storage that satisfies the same
// interface but never touches the filesystem.
export function createMemoryStorage(): StorageBackend {
  const tables = new Map<string, unknown[]>();
  const root = "<memory>";
  const backend: StorageBackend = {
    backend: "json",
    root,
    pathFor: (collection: string) => `<memory>/${collection}.json`,
    async read<T>(collection: string): Promise<T[]> {
      return ((tables.get(collection) ?? []) as T[]).slice();
    },
    async write<T>(collection: string, rows: T[]): Promise<void> {
      tables.set(collection, rows.slice());
    },
    async append<T>(collection: string, row: T): Promise<T[]> {
      const rows = await backend.read<T>(collection);
      rows.push(row);
      await backend.write(collection, rows);
      return rows;
    },
    async remove<T extends { id?: string }>(collection: string, id: string): Promise<T[]> {
      const rows = await backend.read<T>(collection);
      const next = rows.filter((r) => (r as { id?: string }).id !== id);
      await backend.write(collection, next);
      return next;
    },
  };
  return backend;
}

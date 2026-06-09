// PRANTE Translator Tools — optional SQLite backend.
//
// Loaded only when the operator installs `better-sqlite3` AND sets
// `storageBackend: "sqlite"` in plugin config. We do not ship
// `better-sqlite3` as a default dependency because it needs a prebuilt
// binary and many WSL setups pin a specific Node ABI version.
//
// Schema is intentionally tiny: one table per record type, all columns
// JSON-typed so we can evolve the row shape without migrations. The plugin
// falls back to the JSON storage backend automatically if `better-sqlite3`
// cannot be loaded or the user did not opt in.

import type { StorageBackend } from "./storage.js";

export interface SqliteStorageOptions {
  root: string;
}

let cached: StorageBackend | null = null;

export async function tryCreateSqliteStorage(
  options: Partial<SqliteStorageOptions> = {},
): Promise<StorageBackend | null> {
  if (cached) return cached;
  let mod: typeof import("better-sqlite3") | null = null;
  try {
    mod = (await import("better-sqlite3")) as typeof import("better-sqlite3");
  } catch {
    return null;
  }
  const path = `${options.root ?? "<root>"}/prante.sqlite`;
  const DbCtor: any = (mod as any).default ?? mod;
  const db = new DbCtor(path);
  db.pragma("journal_mode = WAL");
  const ensureTable = (name: string) => {
    db.exec(`CREATE TABLE IF NOT EXISTS ${name} (id TEXT PRIMARY KEY, payload TEXT NOT NULL)`);
  };
  const backend: StorageBackend = {
    backend: "sqlite",
    root: options.root ?? "<root>",
    pathFor: (collection: string) => `${options.root ?? "<root>"}/${collection}.sqlite`,
    async read<T>(collection: string): Promise<T[]> {
      ensureTable(collection);
      const rows = db.prepare(`SELECT payload FROM ${collection}`).all() as { payload: string }[];
      return rows.map((r) => JSON.parse(r.payload) as T);
    },
    async write<T>(collection: string, rows: T[]): Promise<void> {
      ensureTable(collection);
      const tx = db.transaction((items: T[]) => {
        db.prepare(`DELETE FROM ${collection}`).run();
        const insert = db.prepare(`INSERT INTO ${collection} (id, payload) VALUES (?, ?)`);
        for (const item of items) {
          const id = (item as { id?: string }).id ?? cryptoRandom();
          insert.run(id, JSON.stringify(item));
        }
      });
      tx(rows);
    },
    async append<T>(collection: string, row: T): Promise<T[]> {
      ensureTable(collection);
      const id = (row as { id?: string }).id ?? cryptoRandom();
      db.prepare(`INSERT INTO ${collection} (id, payload) VALUES (?, ?)`).run(
        id,
        JSON.stringify(row),
      );
      return backend.read<T>(collection);
    },
    async remove<T extends { id?: string }>(collection: string, id: string): Promise<T[]> {
      ensureTable(collection);
      db.prepare(`DELETE FROM ${collection} WHERE id = ?`).run(id);
      return backend.read<T>(collection);
    },
  };
  cached = backend;
  return backend;
}

function cryptoRandom(): string {
  // Avoid the `crypto` import ceremony: 8 random bytes as hex.
  const buf = new Uint8Array(8);
  // globalThis.crypto is available in Node 20+.
  (globalThis.crypto as { getRandomValues: (b: Uint8Array) => void }).getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

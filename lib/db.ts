import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dataDir = process.env.VERCEL
  ? path.join("/tmp", "gakuhan-data")
  : path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const globalForDb = globalThis as unknown as { db?: Database.Database };

export const db =
  globalForDb.db ?? new Database(path.join(dataDir, "app.db"));

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");

db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id),
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id),
    size TEXT NOT NULL,
    price INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL REFERENCES schools(id),
    student_name TEXT NOT NULL,
    grade TEXT NOT NULL,
    guardian_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'received',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    variant_id TEXT NOT NULL REFERENCES product_variants(id),
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL
  );
`);

// 生徒氏名に外字・異体字が含まれる場合の手書き画像・説明メモ。
// 既存DBへの後方互換のため ALTER TABLE で追加する。
const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as {
  name: string;
}[];
const hasNameImage = orderColumns.some((c) => c.name === "name_image");
if (!hasNameImage) {
  db.exec(`
    ALTER TABLE orders ADD COLUMN name_image BLOB;
    ALTER TABLE orders ADD COLUMN name_image_type TEXT;
  `);
}
const hasNameNote = orderColumns.some((c) => c.name === "name_note");
if (!hasNameNote) {
  db.exec(`ALTER TABLE orders ADD COLUMN name_note TEXT;`);
}

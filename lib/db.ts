import { Pool, type PoolClient } from "pg";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL (または DATABASE_URL) が設定されていません。Postgresの接続文字列を環境変数に設定してください。",
  );
}

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  schemaReady?: Promise<void>;
};

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
  });

// pgのPoolはアイドル中のクライアントが接続断等でエラーを出すと'error'イベントを
// 発行する。リスナーがないとNodeのプロセスごと落ちてしまうため、必ず拾っておく。
pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

// next buildの静的生成やコールドスタートで複数プロセスが同時にCREATE TABLEを
// 実行すると、IF NOT EXISTSでも内部的な重複キーエラーで競合することがあるため、
// アドバイザリロックで排他制御する。
const SCHEMA_LOCK_KEY = 727271;

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [SCHEMA_LOCK_KEY]);
    try {
      await runSchemaDdl(client);
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [SCHEMA_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

async function runSchemaDdl(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
      student_furigana TEXT NOT NULL DEFAULT '',
      grade TEXT NOT NULL,
      guardian_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      note TEXT,
      name_note TEXT,
      name_image BYTEA,
      name_image_type TEXT,
      status TEXT NOT NULL DEFAULT 'received',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

    -- 注文送信前のメールアドレス確認（いたずら注文防止）。確認コード照合が
    -- 成功するまではordersテーブルに実データを作らず、ここに一時保存する。
    CREATE TABLE IF NOT EXISTS order_verifications (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL REFERENCES schools(id),
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      payload JSONB NOT NULL,
      name_image BYTEA,
      name_image_type TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      resend_count INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // 既存DB(name_image列追加前)への後方互換
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS name_image BYTEA;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS name_image_type TEXT;
  `);
}

// 接続の瞬断などで初期化に失敗した場合、そのPromiseを永久にキャッシュしてしまうと
// 同じサーバーインスタンスへの以降のリクエストが全て失敗し続ける（再起動まで復旧しない）。
// 失敗時は次回呼び出しで再試行できるよう、reject時にキャッシュを作り直す。
function createSchemaReady(): Promise<void> {
  return initSchema().catch((err) => {
    schemaReady = createSchemaReady();
    throw err;
  });
}

export let schemaReady = globalForDb.schemaReady ?? createSchemaReady();

if (process.env.NODE_ENV !== "production") {
  globalForDb.schemaReady = schemaReady;
}

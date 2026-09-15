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

// タイムアウトを何も設定しないと、プーラー越しの接続断やロック待ちが発生した際に
// クエリが無期限にハングし、Vercelの関数タイムアウト(300秒)いっぱいまでサイト全体が
// 応答不能になる。各種タイムアウトを設定し、詰まった場合は早期にエラーとして
// 失敗させることで、呼び出し元の再試行ロジック（createSchemaReady等）に委ねる。
export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
    query_timeout: 20_000,
    lock_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
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
//
// 旧実装はセッションレベルのpg_advisory_lock/unlockを使っていたが、本番の接続文字列が
// プーラー(PgBouncer等)を経由する場合、ロック取得後に論理セッションが別の物理接続へ
// 切り替わってしまいunlockが別セッションで実行される＝ロックが永久に解放されない
// 事故が発生した（全ページが応答不能になるまで進行）。トランザクション終了時に自動解放
// されるpg_advisory_xact_lockに切り替え、この種の孤立ロックが起き得ないようにする。
// 旧キーは孤立ロックとして残っている可能性があるため、別の値を使って競合を避ける。
const SCHEMA_LOCK_KEY = 727272;

async function initSchema() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock($1)", [SCHEMA_LOCK_KEY]);
      await runSchemaDdl(client);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
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

  // 既存DB(校章ロゴ列追加前)への後方互換
  await client.query(`
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo BYTEA;
    ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_type TEXT;
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

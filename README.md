# gakuhan-app

学校向け「学販」（制服・体操服のオンライン注文）アプリ。まず日向学院向けに構築し、将来的には複数校への展開を見据えている。

## セットアップ

```bash
npm install
cp .env.example .env  # 値を編集する
npm run dev
```

- `http://localhost:3000/hyuga-gakuin` — 日向学院の注文フォーム
- `http://localhost:3000/admin` — 管理画面（注文一覧・商品/価格編集）。`.env` の `ADMIN_PASSWORD` でログイン

## 環境変数（`.env.example` 参照）

- `DATABASE_URL` — SQLiteファイルのパス（開発時は `file:./dev.db` 相当だが、実体は `data/app.db`）
- `SMTP_*` / `ORDER_NOTIFY_TO` — 新規注文時のメール通知設定。未設定の場合は通知をスキップしDB保存のみ行う
- `ADMIN_PASSWORD` — 管理画面のログインパスワード

## データについて

- 商品・サイズ・価格は `data/app.db`（SQLite）で管理し、管理画面（`/admin/products`）から編集できる。販売直前の価格改定にコード変更なしで対応するための設計。
- 初回起動時、DBが空であれば日向学院向けのプレースホルダー商品データが自動投入される（`lib/schools.ts` の `SEED_PRODUCTS`）。実際の商品・価格は本番投入前に管理画面から差し替えること。
- 学校ごとに `School` を分ける設計にしてあるため、次の学校を追加する際は `SEED_SCHOOL`/`SEED_PRODUCTS` に相当するデータを追加し、`/[school]` の動的ルートで自動的にフォームが生成される。

## 本番デプロイ時の注意

- SQLiteはファイルベースのため、Vercelなど読み書き可能な永続ストレージがない環境ではデータが消える。自前サーバーやボリュームマウント可能な環境にデプロイすること。

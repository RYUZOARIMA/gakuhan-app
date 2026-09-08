# gakuhan-app

学校向け「学販」（制服・体操服のオンライン注文）アプリ。まず日向学院向けに構築し、将来的には複数校への展開を見据えている。

## セットアップ

```bash
npm install
cp .env.example .env  # DATABASE_URL 等の値を編集する
npm run dev
```

- `http://localhost:3000/hyuga-gakuin` — 日向学院の注文フォーム
- `http://localhost:3000/admin` — 管理画面（注文一覧・商品/価格編集）。`.env` の `ADMIN_PASSWORD` でログイン

## 環境変数（`.env.example` 参照）

- `DATABASE_URL`（本番では `POSTGRES_URL`） — Postgresの接続文字列。Vercel上で Storage タブから Postgres を作成しプロジェクトに Connect すると自動設定される
- `SMTP_*` / `ORDER_NOTIFY_TO` — 新規注文時のメール通知設定。未設定の場合は通知をスキップしDB保存のみ行う
- `ADMIN_PASSWORD` — 管理画面のログインパスワード

## データについて

- 商品・サイズ・価格はPostgresで管理し、管理画面（`/admin/products`）から編集できる。販売直前の価格改定にコード変更なしで対応するための設計。
- 初回アクセス時、DBが空であれば日向学院向けのプレースホルダー商品データが自動投入される（`lib/schools.ts` の `SEED_PRODUCTS`）。実際の商品・価格は本番投入前に管理画面から差し替えること。
- 学校ごとに `School` を分ける設計にしてあるため、次の学校を追加する際は `SEED_SCHOOL`/`SEED_PRODUCTS` に相当するデータを追加し、`/[school]` の動的ルートで自動的にフォームが生成される。

## 本番デプロイ（Vercel）時の注意

- 以前はSQLite（ファイルベース）で実装していたが、Vercelのサーバーレス環境では書き込み先の `/tmp` がインスタンスごと・デプロイごとに消えるため、注文履歴が失われる問題があった。そのため永続的なPostgres（Vercel Postgres等）に移行済み。
- Vercelプロジェクトの `Settings → Deployment Protection` で本番環境の保護が有効になっていると、注文フォーム自体が保護者・生徒からアクセスできなくなる。公開する場合は無効化するか、Standard Protectionの対象からProductionを外すこと。

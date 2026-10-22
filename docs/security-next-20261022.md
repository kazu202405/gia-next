# Next.jsのセキュリティ更新（2026-10-22）

- ブランチ：`fix/next-security-20261022`。mainの`c3f7f00`から作成。
- Next.js 16.1.1 → 16.4.2、React/React DOM 19.2.3 → 19.2.9、eslint-config-nextも16.4.2。
- sharpは0.35.5。Axiosなど互換範囲の実行時依存も修正版へ更新。
- 110テストと本番用ビルドが通過。本番DB・決済の接続情報をダミーへ置き換えた子プロセスで検証した。元の.envは変更していない。
- `npm audit --omit=dev` は全severity 0件。全依存のauditは開発ツールに27パッケージの指摘が残る（high16/moderate10/low1）。パッケージ数は独立した脆弱性の件数ではない。
- 本番反映は未実施。ユーザーの保留指示に従いpush・デプロイしていない。
- 料金改定の`feature/company-note-referral-9980`（84e4e71）は今回のブランチに含まない。料金・Stripe価格・クーポン・DB権限は変更していない。
- 酒場は別リポジトリ`system/claude/gia-sakaba`。共有しているGIAの会員情報と、実行するNext.jsの依存は区別する。
- 手元のNode.js 24.8.0の更新、本番Nodeの確認、Supabase権限監査、侵害ログ調査はこの更新の対象外。

公式告知：https://nextjs.org/blog/nextjs-security-update-october-14-2026
安定版：https://github.com/vercel/next.js/releases/tag/v16.4.2

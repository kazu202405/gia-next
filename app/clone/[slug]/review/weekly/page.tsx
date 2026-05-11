import { ComingSoon } from "../../_components/ComingSoon";

export default function ReviewPage() {
  return (
    <ComingSoon
      eyebrow="REVIEW"
      title="週次・月次レビュー"
      description="AI Clone が自動生成 → クライアント承認 のフロー。Phase 2 で実装。"
      bullets={[
        "週次レビュー（重要判断 / 進んだ案件 / 止まっている案件 / 来週の優先タスク）",
        "月次レビュー（売上・経費・利益率 / 上位人物・案件）",
        "ナレッジ候補・更新待ちルール（承認 / 却下）",
      ]}
    />
  );
}

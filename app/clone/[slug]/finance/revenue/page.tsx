import { ComingSoon } from "../../_components/ComingSoon";

export default function FinancePage() {
  return (
    <ComingSoon
      eyebrow="MEMORY / FINANCE"
      title="売上・経費"
      description="月次レビューの素材。粗利率・利益率の高い案件を可視化。"
      bullets={[
        "売上一覧（入金状態: 未入金 / 一部入金 / 入金済）",
        "経費一覧（カテゴリ別: 交通費 / 会議費 / 交際費 / 通信費 等）",
        "Phase 2 実装予定",
      ]}
    />
  );
}

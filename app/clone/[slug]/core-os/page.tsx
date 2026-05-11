import { ComingSoon } from "../_components/ComingSoon";

export default function CoreOsPage() {
  return (
    <ComingSoon
      eyebrow="CORE OS"
      title="あなたの脳（Core OS）"
      description="AI Clone の判断基盤。ミッション・KPI・判断基準・口調・NGルール・FAQ。Phase 1 で全種編集 UI を実装する。"
      bullets={[
        "01_ミッション・理念",
        "02_3年計画",
        "03_今年のKPI",
        "04_判断基準",
        "05_口調・対応ルール",
        "06_NG判断・確認ルール",
        "08_FAQ・返答案",
      ]}
    />
  );
}

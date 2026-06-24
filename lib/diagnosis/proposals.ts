// 売上ボトルネック診断 — 項目別の施策・診断タイプ素材。
// 「商品別の売り込み」ではなく「ボトルネック診断 → 改善手段」として提示する。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md

import type { DimensionKey } from "./questions";

// 項目が弱いときに有効な施策（おすすめ施策チップの元）。
export const SERVICES: Record<DimensionKey, string[]> = {
  awareness: ["SNS運用設計", "ショート動画制作", "広告・LP見直し"],
  capture: ["LP改善", "LINE/CRM導入", "無料診断・資料設計"],
  meeting: ["セミナー設計", "相談・予約導線設計", "営業代行"],
  closing: ["営業資料・提案設計", "クロージング改善"],
  retention: ["紹介導線設計", "CRM・右腕AI", "会員/継続プラン設計", "商談後フォロー自動化"],
};

// AI 生成が使えない時のフォールバック用：診断タイプ名（最弱項目から）。
export const FALLBACK_TYPE_NAME: Record<DimensionKey, string> = {
  awareness: "認知・集客不足タイプ",
  capture: "リスト化不足タイプ",
  meeting: "商談化不足タイプ",
  closing: "成約力不足タイプ",
  retention: "継続・紹介不足タイプ",
};

// フォールバック用：項目別の課題ヒント（1行）。
export const FALLBACK_ISSUE: Record<DimensionKey, string> = {
  awareness:
    "そもそも見込み客との接点が少なく、売上の“入口”が細い状態です。",
  capture:
    "接点はあるのに、興味を持った人をリスト化できず単発で終わっています。",
  meeting:
    "見込み客はいるのに、相談・商談まで進む“きっかけ”が弱い状態です。",
  closing:
    "商談まで進むのに、提案・クロージングで取りこぼしています。",
  retention:
    "一度きりで終わり、リピートと紹介の仕組みが整っていません。",
};

// 売上ボトルネック診断 — ボトルネック別の提案（クロスセルの入口）。
// 売り込まず「○○が必要では？」と気づきを渡し、必要なら紹介につなぐための素材。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md

import type { DimensionKey } from "./questions";

export interface Proposal {
  /** 「○○が必要かもしれません」の一言 */
  lead: string;
  /** 具体的な打ち手・サービス候補 */
  services: string[];
}

export const PROPOSALS: Record<DimensionKey, Proposal> = {
  acquisition: {
    lead: "“知ってもらう量”を増やす打ち手が要りそうです。",
    services: ["SNS運用の設計・代行", "ショート動画の制作", "広告・LPの見直し"],
  },
  closing: {
    lead: "“決まる流れ”を作る打ち手が要りそうです。",
    services: ["商談・提案の型づくり", "営業資料／提案書の整備", "LP・オファーの改善"],
  },
  price: {
    lead: "“正しく値づけする”打ち手が要りそうです。",
    services: ["商品設計・上位プランづくり", "値づけ（プライシング）の見直し", "ブランディング"],
  },
  retention: {
    lead: "“続く関係と紹介”を作る打ち手が要りそうです。",
    services: [
      "紹介の仕組み化（紹介設計研究所）",
      "顧客管理・右腕AIの活用",
      "会員／継続プランの設計",
    ],
  },
  capacity: {
    lead: "“捌く力”を増やす打ち手が要りそうです。",
    services: ["人材の採用支援", "人材の定着・育成支援", "業務の仕組み化・外注・DX"],
  },
};

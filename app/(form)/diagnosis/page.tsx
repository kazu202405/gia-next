// 売上ボトルネック診断（無料・公開・ログイン不要）。
// 正本: contexts/projects/gia/sales_bottleneck_diagnosis.md
//
// 20の質問で売上を5項目（集客/成約/単価/リピート/キャパ）に分解採点し、
// ボトルネックと「まず打つ一手」を返す自己診断ツール。
// リード取り（メール収集・DB保存）はなし。結果はその場で全表示＋画像/PDFで保存可。

import { DiagnosisForm } from "./_components/DiagnosisForm";

export const metadata = {
  title: "売上ボトルネック診断 | GIA",
  description:
    "20の質問であなたの売上の“詰まり”を特定。集客・成約・単価・リピート・キャパの5項目を採点し、まず打つべき一手を1つに絞ります。無料・登録不要。",
};

export default function DiagnosisPage() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <DiagnosisForm />
      </div>
    </div>
  );
}

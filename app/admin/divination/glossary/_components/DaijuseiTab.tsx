"use client";

// 十二大従星タブ。算命学のエネルギー指標 12 種を表示。
// 人生段階（胎児〜あの世）に対応し、エネルギー値 1〜12 が振られている。
// 陽占の宇宙盤の角 3 つに配置される。

import {
  DAIJUSEI_DESCRIPTIONS,
  JUNI_UNSEI_NAMES, JUNI_TO_DAIJUSEI,
  type Daijusei,
} from "@/lib/divination/sanmei/descriptions";

// エネルギー値の降順で並べる（最強の天将星から、最弱の天馳星まで）。
const SORTED_DAIJUSEI: Daijusei[] = (Object.keys(DAIJUSEI_DESCRIPTIONS) as Daijusei[])
  .sort((a, b) => DAIJUSEI_DESCRIPTIONS[b].energy - DAIJUSEI_DESCRIPTIONS[a].energy);

// 大従星 → 元の十二運名（人生段階の確認用）
const DAIJUSEI_TO_UNSEI: Record<Daijusei, string> = Object.fromEntries(
  JUNI_UNSEI_NAMES.map((u) => [JUNI_TO_DAIJUSEI[u], u])
) as Record<Daijusei, string>;

export function DaijuseiTab() {
  return (
    <section className="space-y-5">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十二大従星は算命学のエネルギー指標で、エネルギー値 1〜12 で人生のスケールを表します。
        人の一生のサイクル（胎児 → 赤ちゃん → … → あの世）に対応し、宇宙盤の角に配置される
        3 つの大従星のエネルギー合計が「人生の総エネルギー」と呼ばれます。
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SORTED_DAIJUSEI.map((star) => (
          <DaijuseiCard key={star} star={star} />
        ))}
      </div>
    </section>
  );
}

function DaijuseiCard({ star }: { star: Daijusei }) {
  const info = DAIJUSEI_DESCRIPTIONS[star];
  const unsei = DAIJUSEI_TO_UNSEI[star];

  // エネルギー値で色味を変える（高=金、中=ネイビー、低=グレー）。
  const tone =
    info.energy >= 10
      ? { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]" }
      : info.energy >= 6
        ? { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]" }
        : { bg: "bg-gray-50",   border: "border-gray-200",  text: "text-gray-600" };

  return (
    <div className={`border rounded p-3 ${tone.bg} ${tone.border}`}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className={`font-serif text-lg font-bold ${tone.text}`}>{star}</span>
        <span className={`font-mono text-[12px] font-bold ${tone.text}`}>
          E{info.energy}
        </span>
      </div>
      <div className="text-[11px] text-gray-500 mb-2">
        人生段階：{info.stage}（{unsei}）
      </div>
      <p className="text-[12px] text-gray-700 leading-relaxed">{info.trait}</p>
    </div>
  );
}

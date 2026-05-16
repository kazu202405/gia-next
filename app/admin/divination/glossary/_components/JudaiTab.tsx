"use client";

// 十大主星タブ。算命学の 10 主星を「5本能 × 陰陽」のグループに分けて表示。
// 陽占の人体星図に出てくる星名の意味を勉強できる。

import { JUDAI_DESCRIPTIONS, type Judai } from "@/lib/divination/sanmei/descriptions";

interface HonnouGroup {
  name: string;
  description: string;
  yang: Judai;  // 陽の主星
  yin: Judai;   // 陰の主星
  toneBg: string;
  toneBorder: string;
  toneText: string;
}

// 守備・伝達・引力・攻撃・習得 の 5 本能と対応する 2 主星。
const HONNOU_GROUPS: HonnouGroup[] = [
  {
    name: "守備本能",
    description: "自分の領域や価値観を守り、ペースを大切にする本能",
    yang: "貫索星",
    yin:  "石門星",
    toneBg: "#fbf3e3",   toneBorder: "#e6d3a3", toneText: "#8a5a1c",
  },
  {
    name: "伝達本能",
    description: "感じたこと・考えたことを表現して人に伝える本能",
    yang: "鳳閣星",
    yin:  "調舒星",
    toneBg: "#e6f1e8",   toneBorder: "#c5d3c8", toneText: "#3d6651",
  },
  {
    name: "引力本能",
    description: "人や財を引き寄せ、関わりの中で生きる本能",
    yang: "禄存星",
    yin:  "司禄星",
    toneBg: "#fbeede",   toneBorder: "#e6c8a3", toneText: "#8a4a18",
  },
  {
    name: "攻撃本能",
    description: "目標に向かって進み、相手と関わる中で力を発揮する本能",
    yang: "車騎星",
    yin:  "牽牛星",
    toneBg: "#f3e9e6",   toneBorder: "#d8c4be", toneText: "#8a4538",
  },
  {
    name: "習得本能",
    description: "学び・知識・経験を取り込んで自分を更新する本能",
    yang: "龍高星",
    yin:  "玉堂星",
    toneBg: "#e1ebf5",   toneBorder: "#cdd6e0", toneText: "#1c4a7a",
  },
];

export function JudaiTab() {
  return (
    <section className="space-y-5">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十大主星は算命学の中核で、その人の性格・才能・行動パターンを表します。
        5 つの本能（守備・伝達・引力・攻撃・習得）それぞれに陽性と陰性の星があり、合計 10 種類。
        陽占の人体星図に並ぶのがこの主星です。
      </p>

      {HONNOU_GROUPS.map((g) => (
        <div key={g.name}>
          <div className="flex items-baseline gap-3 mb-3">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-semibold"
              style={{ backgroundColor: g.toneBg, borderColor: g.toneBorder, color: g.toneText }}
            >
              {g.name}
            </span>
            <span className="text-[12px] text-gray-600">{g.description}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <JudaiCard
              star={g.yang} polarity="陽"
              tone={{ bg: g.toneBg, border: g.toneBorder, text: g.toneText }}
            />
            <JudaiCard
              star={g.yin} polarity="陰"
              tone={{ bg: g.toneBg, border: g.toneBorder, text: g.toneText }}
            />
          </div>
        </div>
      ))}
    </section>
  );
}

function JudaiCard({
  star, polarity, tone,
}: {
  star: Judai;
  polarity: "陽" | "陰";
  tone: { bg: string; border: string; text: string };
}) {
  const info = JUDAI_DESCRIPTIONS[star];
  return (
    <div
      className="border rounded p-3 bg-white"
      style={{ borderColor: tone.border }}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span
          className="font-serif text-lg font-bold"
          style={{ color: tone.text }}
        >
          {star}
        </span>
        <span className="text-[10px] tracking-[0.2em] text-gray-500">{polarity}性</span>
      </div>
      <div className="text-[11px] text-gray-500 mb-2">{info.keyword}</div>
      <p className="text-[12px] text-gray-700 leading-relaxed mb-2">{info.personality}</p>
      <div className="text-[11px] grid grid-cols-1 gap-1">
        <div className="text-gray-700">
          <span className="text-gray-400 mr-1">強み:</span>{info.strength}
        </div>
        <div className="text-gray-700">
          <span className="text-gray-400 mr-1">課題:</span>{info.weakness}
        </div>
      </div>
    </div>
  );
}

"use client";

// 十大主星タブ。算命学の 10 主星を「5本能 × 陰陽」のグループに分けて表示。
// 各本能には対応する五行（木火土金水）があり、それぞれの色で統一する。
// 木=守備／火=伝達／土=引力／金=攻撃／水=習得 が算命学の標準対応。

import { JUDAI_DESCRIPTIONS, type Judai } from "@/lib/divination/sanmei/descriptions";
import { GOGYO_COLORS, type Gogyo } from "@/lib/divination/kanshi/constants";

interface HonnouGroup {
  name: string;
  gogyo: Gogyo;       // 対応する五行
  description: string;
  yang: Judai;        // 陽の主星
  yin: Judai;         // 陰の主星
}

// 5 本能 × 陰陽 = 10 主星。五行は伝統的な対応関係。
const HONNOU_GROUPS: HonnouGroup[] = [
  {
    name: "守備本能",
    gogyo: "木",
    description: "自分の領域や価値観を守り、ペースを大切にする本能",
    yang: "貫索星",
    yin:  "石門星",
  },
  {
    name: "伝達本能",
    gogyo: "火",
    description: "感じたこと・考えたことを表現して人に伝える本能",
    yang: "鳳閣星",
    yin:  "調舒星",
  },
  {
    name: "引力本能",
    gogyo: "土",
    description: "人や財を引き寄せ、関わりの中で生きる本能",
    yang: "禄存星",
    yin:  "司禄星",
  },
  {
    name: "攻撃本能",
    gogyo: "金",
    description: "目標に向かって進み、相手と関わる中で力を発揮する本能",
    yang: "車騎星",
    yin:  "牽牛星",
  },
  {
    name: "習得本能",
    gogyo: "水",
    description: "学び・知識・経験を取り込んで自分を更新する本能",
    yang: "龍高星",
    yin:  "玉堂星",
  },
];

export function JudaiTab() {
  return (
    <section className="space-y-5">
      <p className="text-[12px] text-gray-600 leading-relaxed">
        十大主星は算命学の中核で、その人の性格・才能・行動パターンを表します。
        5 つの本能（守備・伝達・引力・攻撃・習得）はそれぞれ五行（木火土金水）に対応し、
        各本能に陽性・陰性の星があって合計 10 種類。陽占の人体星図に並ぶのがこの主星です。
      </p>

      {HONNOU_GROUPS.map((g) => {
        const color = GOGYO_COLORS[g.gogyo];
        return (
          <div key={g.name}>
            <div className="flex items-baseline gap-3 mb-3 flex-wrap">
              {/* 五行マーク */}
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 font-serif text-base font-bold"
                style={{
                  borderColor: color.hex,
                  backgroundColor: color.bg,
                  color: color.text,
                }}
                aria-label={`五行：${g.gogyo}`}
              >
                {g.gogyo}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full border text-[12px] font-semibold"
                style={{
                  backgroundColor: color.bg,
                  borderColor: color.hex,
                  color: color.text,
                }}
              >
                {g.name}
              </span>
              <span className="text-[12px] text-gray-600">{g.description}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <JudaiCard
                star={g.yang} polarity="陽"
                color={color}
              />
              <JudaiCard
                star={g.yin} polarity="陰"
                color={color}
              />
            </div>
          </div>
        );
      })}
    </section>
  );
}

function JudaiCard({
  star, polarity, color,
}: {
  star: Judai;
  polarity: "陽" | "陰";
  color: { hex: string; bg: string; text: string };
}) {
  const info = JUDAI_DESCRIPTIONS[star];
  return (
    <div
      className="border rounded p-3 bg-white"
      style={{ borderColor: color.hex + "44" }}
    >
      <div className="flex items-baseline gap-2 mb-2">
        <span className="font-serif text-lg font-bold" style={{ color: color.text }}>
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

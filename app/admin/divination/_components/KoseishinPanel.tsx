"use client";

// 個性心理學（弦本式）5キャラパネル。
// 日柱の運命数 N を起点に、+10/+20/+30/+40 のオフセットで
// 本質・表面・希望・意思決定・隠れ の 5 つを表示。
// オフセット値は流派により異なるため、五島さんの公式結果と合わない場合は
// lib/divination/animal/koseishin.ts のオフセットを調整する。

import type { KoseishinCharacter } from "@/lib/divination/animal/koseishin";

interface Props {
  characters: KoseishinCharacter[];
}

const ROLE_STYLES: Record<string, { bg: string; border: string; text: string; eyebrow: string }> = {
  本質:     { bg: "bg-[#fbf3e3]", border: "border-[#e6d3a3]", text: "text-[#8a5a1c]", eyebrow: "ESSENCE" },
  表面:     { bg: "bg-[#f1f4f7]", border: "border-[#d6dde5]", text: "text-[#1c3550]", eyebrow: "SURFACE" },
  希望:     { bg: "bg-[#e6f1e8]", border: "border-[#c5d3c8]", text: "text-[#3d6651]", eyebrow: "HOPE" },
  意思決定: { bg: "bg-[#e1ebf5]", border: "border-[#cdd6e0]", text: "text-[#1c4a7a]", eyebrow: "DECISION" },
  隠れ:     { bg: "bg-[#f3e9e6]", border: "border-[#d8c4be]", text: "text-[#8a4538]", eyebrow: "HIDDEN" },
};

export function KoseishinPanel({ characters }: Props) {
  return (
    <section className="bg-white border border-gray-200 rounded-md overflow-hidden">
      {/* タイトル帯 — InyoPanel と揃えた Navy */}
      <header className="bg-[#1c3550] text-white px-5 py-3 flex items-baseline gap-3">
        <span className="text-[10px] tracking-[0.3em] text-[#e8c98a]">KOSEISHIN</span>
        <h2 className="font-serif text-base sm:text-lg font-bold tracking-[0.08em]">
          個性心理學（動物占い 60分類）
        </h2>
      </header>

      <div className="p-5 sm:p-6">
        <p className="text-[12px] text-gray-600 mb-4 leading-relaxed">
          弦本式の正規ロジック。日柱の運命数を本質として、各キャラを算出しています。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {characters.map((c) => (
            <CharacterCard key={c.role} character={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CharacterCard({ character }: { character: KoseishinCharacter }) {
  const style = ROLE_STYLES[character.role];
  return (
    <div className={`border rounded p-3 ${style.bg} ${style.border}`}>
      <div className={`text-[10px] tracking-[0.25em] font-semibold mb-2 ${style.text}`}>
        {style.eyebrow} / {character.role}
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-mono text-[11px] text-gray-500">No.{character.number}</span>
        <span className="font-mono text-[11px] text-gray-400">{character.animal.kanshi}</span>
      </div>
      <div className="text-[9px] text-gray-400 mb-1.5">{character.source}</div>
      <div className="font-serif text-sm font-bold text-[#1c3550] mb-2 leading-tight">
        {character.animal.name}
      </div>
      <p className="text-[11px] text-gray-700 leading-relaxed">
        {character.description}
      </p>
    </div>
  );
}

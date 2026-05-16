"use client";

// 陽占（人体星図 + 宇宙盤）パネル。
// 鑑定書右半分：人体シルエット上に 5 主星と 3 大従星を配置し、
// 「陽占の特徴まとめ」「キーワード」「人生のテーマ」を出す。
// Phase 1a は機能優先のためシルエットは簡素な SVG。1b で意匠を磨く。

import type { YojoResult } from "@/lib/divination/sanmei/yojo";
import {
  JUDAI_DESCRIPTIONS, DAIJUSEI_DESCRIPTIONS,
  type Judai, type Daijusei,
} from "@/lib/divination/sanmei/descriptions";

interface Props {
  yojo: YojoResult;
}

export function YojoPanel({ yojo }: Props) {
  const j = yojo.jintai;
  const u = yojo.uchuban;
  const centerInfo = JUDAI_DESCRIPTIONS[j.center];

  return (
    <section className="bg-white border border-gray-200 rounded-md p-5 sm:p-6">
      <SectionHeader eyebrow="YOJO / 陽占" title="社会に出たときの自分・外側の顔" />

      {/* 人体星図 */}
      <div className="relative mx-auto mb-5" style={{ width: "100%", maxWidth: 440, aspectRatio: "3/4" }}>
        <HumanSilhouette />

        {/* 5 主星 */}
        <StarTag judai={j.head}      label="頭"   pos={{ top: "2%",  left: "50%", x: -50, y: 0 }} accent="judai" />
        <StarTag judai={j.rightHand} label="右手" pos={{ top: "32%", left: "2%",  x: 0,   y: 0 }} accent="judai" />
        <StarTag judai={j.center}    label="中心" pos={{ top: "44%", left: "50%", x: -50, y: 0 }} accent="center" />
        <StarTag judai={j.leftHand}  label="左手" pos={{ top: "32%", left: "98%", x: -100, y: 0 }} accent="judai" />
        <StarTag judai={j.waist}     label="腰"   pos={{ top: "64%", left: "50%", x: -50, y: 0 }} accent="judai" />

        {/* 3 大従星 */}
        <StarTag daijusei={u.leftShoulder} label="左肩" pos={{ top: "16%", left: "98%", x: -100, y: 0 }} accent="daijusei" />
        <StarTag daijusei={u.rightFoot}    label="右足" pos={{ top: "85%", left: "2%",  x: 0,    y: 0 }} accent="daijusei" />
        <StarTag daijusei={u.leftFoot}     label="左足" pos={{ top: "85%", left: "98%", x: -100, y: 0 }} accent="daijusei" />
      </div>

      {/* エネルギー合計 */}
      <div className="text-center mb-5 py-2 border-y border-gray-100">
        <span className="text-[11px] tracking-[0.2em] text-gray-500 mr-3">大従星エネルギー合計</span>
        <span className="font-serif text-2xl font-bold text-[#1c3550]">{u.totalEnergy}</span>
        <span className="text-[12px] text-gray-500 ml-1">/ 36 点</span>
      </div>

      {/* 中心星の詳細 */}
      <div className="rounded bg-[#fbf3e3] border border-[#e6d3a3] px-4 py-3 mb-4">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-[10px] tracking-[0.2em] text-[#8a5a1c]">中心星</span>
          <span className="font-serif text-lg font-bold text-[#1c3550]">{j.center}</span>
          <span className="text-[11px] text-gray-600">{centerInfo.keyword}</span>
        </div>
        <p className="text-[12px] text-gray-700 leading-relaxed">{centerInfo.personality}</p>
        <div className="text-[11px] text-gray-600 mt-2 grid grid-cols-2 gap-x-3">
          <div><span className="text-gray-400 mr-1">強み：</span>{centerInfo.strength}</div>
          <div><span className="text-gray-400 mr-1">課題：</span>{centerInfo.weakness}</div>
        </div>
      </div>

      {/* 陽占の特徴まとめ（中心星以外） */}
      {yojo.otherStars.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[11px] tracking-[0.2em] text-gray-500 mb-2">陽占の特徴まとめ</h3>
          <ul className="space-y-2">
            {yojo.otherStars.map((star) => {
              const info = JUDAI_DESCRIPTIONS[star];
              return (
                <li key={star} className="text-[12px] text-gray-700 leading-relaxed">
                  <span className="font-serif font-bold text-[#1c3550] mr-2">{star}</span>
                  <span className="text-gray-500 mr-2">{info.keyword}</span>
                  <span>{info.personality.split("。")[0]}。</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 大従星の詳細 */}
      <div>
        <h3 className="text-[11px] tracking-[0.2em] text-gray-500 mb-2">十二大従星</h3>
        <ul className="space-y-1.5">
          <DaijuseiLine pos="左肩（年柱・目上）" star={u.leftShoulder} />
          <DaijuseiLine pos="左足（月柱・現実）" star={u.leftFoot} />
          <DaijuseiLine pos="右足（日柱・自分）" star={u.rightFoot} />
        </ul>
      </div>
    </section>
  );
}

// ── パーツ ──────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="text-[11px] tracking-[0.3em] text-[#c08a3e] font-semibold">{eyebrow}</span>
      <h2 className="font-serif text-lg font-bold text-[#1c3550] mt-1">{title}</h2>
    </div>
  );
}

/** 人体シルエットの簡易 SVG（Phase 1a 用）。 */
function HumanSilhouette() {
  return (
    <svg
      viewBox="0 0 200 280"
      className="absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g fill="none" stroke="#d6dde5" strokeWidth="1.5">
        {/* 頭 */}
        <circle cx="100" cy="30" r="20" />
        {/* 首 */}
        <line x1="100" y1="50" x2="100" y2="62" />
        {/* 胴体 */}
        <path d="M 70 65 Q 70 70 75 75 L 70 175 Q 100 185 130 175 L 125 75 Q 130 70 130 65 Z" fill="#fafbfc" />
        {/* 腕 */}
        <path d="M 75 75 Q 50 100 45 145" />
        <path d="M 125 75 Q 150 100 155 145" />
        {/* 脚 */}
        <line x1="85" y1="180" x2="78" y2="265" />
        <line x1="115" y1="180" x2="122" y2="265" />
      </g>
    </svg>
  );
}

interface StarPos {
  top: string;
  left: string;
  /** px 単位の追加オフセット（左上基準）。-50 = 自身の半分左にずらす。 */
  x: number;
  y: number;
}

function StarTag({
  judai, daijusei, label, pos, accent,
}: {
  judai?: Judai;
  daijusei?: Daijusei;
  label: string;
  pos: StarPos;
  accent: "judai" | "center" | "daijusei";
}) {
  const star = judai ?? daijusei!;
  const info = judai
    ? JUDAI_DESCRIPTIONS[judai].keyword.split("（")[1]?.replace("）", "") ?? ""
    : `${DAIJUSEI_DESCRIPTIONS[daijusei!].stage}・E${DAIJUSEI_DESCRIPTIONS[daijusei!].energy}`;

  const style =
    accent === "center"
      ? "bg-[#fbf3e3] border-[#e6d3a3] text-[#8a5a1c]"
      : accent === "daijusei"
        ? "bg-[#eef2f7] border-[#cdd6e0] text-[#1c3550]"
        : "bg-white border-[#d6dde5] text-[#1c3550]";

  return (
    <div
      className={`absolute border rounded px-1.5 py-1 text-center shadow-sm ${style}`}
      style={{
        top: pos.top,
        left: pos.left,
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: 100,
      }}
    >
      <div className="text-[9px] text-gray-500 tracking-wider leading-none mb-0.5">{label}</div>
      <div className="font-serif text-[13px] font-bold leading-tight">{star}</div>
      <div className="text-[9px] text-gray-500 leading-tight mt-0.5 truncate">{info}</div>
    </div>
  );
}

function DaijuseiLine({ pos, star }: { pos: string; star: Daijusei }) {
  const info = DAIJUSEI_DESCRIPTIONS[star];
  return (
    <li className="text-[12px] text-gray-700 leading-relaxed">
      <span className="text-gray-500 mr-2">{pos}</span>
      <span className="font-serif font-bold text-[#1c3550] mr-2">{star}</span>
      <span className="text-[11px] text-gray-500">（{info.stage}・E{info.energy}）</span>
      <span className="ml-2">{info.trait}</span>
    </li>
  );
}

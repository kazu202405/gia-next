"use client";

// /admin/divination — 命式図解（社内鑑定ツール）。
// 五島さん専用。みやこ／アズクリエイトメンバーの陰陽・五行・人体星図を
// その場で確認するための内部ツール。AI Clone のテナント側には出さない。
//
// Phase 1a：データが正しく出るところまで（高尾義政系・3柱まで）。
// Phase 1b：A4 縦の鑑定書レイアウトに整え、html2canvas-pro で PNG 出力できるようにする。
// Phase 2 ：位相法／大運／年運。Phase 3：八門法／数理法。
//
// 認証ガードは proxy.ts → lib/supabase/middleware.ts 側で /admin/* を保護済み。

import { useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { EditorialHeader } from "../_components/EditorialChrome";
import { KanshiSearch } from "./_components/KanshiSearch";
import { BirthForm, type SubjectInput } from "./_components/BirthForm";
import { InyoPanel } from "./_components/InyoPanel";
import { YojoPanel } from "./_components/YojoPanel";
import { TarotPanel, NumerologyPanel, ColorPanel } from "./_components/OtherPanels";
import { calculateInyo } from "@/lib/divination/sanmei/inyo";
import { calculateYojo } from "@/lib/divination/sanmei/yojo";
import { calculateTarotBirthday } from "@/lib/divination/tarot/birthday";
import { calculateNumerology } from "@/lib/divination/numerology/birthday";
import { calculateBirthdayColor } from "@/lib/divination/color/birthday";

export default function DivinationPage() {
  // 入力フォーム（手入力のみ）。バリデーションは最低限。
  const [subject, setSubject] = useState<SubjectInput>({
    name: "",
    gender: "未指定",
    year: 1984,
    month: 3,
    day: 29,
    hour: null,
    birthplace: "",
  });

  // 鑑定済みフラグ。「鑑定する」を押すまでは結果を出さない設計。
  const [submitted, setSubmitted] = useState<SubjectInput | null>(null);

  // PNG エクスポート用。鑑定書部分を ref で掴んで html2canvas-pro に渡す。
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!sheetRef.current || !submitted) return;
    setExporting(true);
    try {
      // SSR/初期ロード負荷を避けるため動的 import。html2canvas-pro は
      // Tailwind v4 の oklch カラー対応版で、既に deps に入っている。
      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,                  // 2x で高解像度に
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      const yyyymmdd =
        `${submitted.year}${String(submitted.month).padStart(2, "0")}${String(submitted.day).padStart(2, "0")}`;
      const safeName = (submitted.name || "untitled").replace(/[\\/:*?"<>|]/g, "_");
      const link = document.createElement("a");
      link.download = `${safeName}_命式図解_${yyyymmdd}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG エクスポート失敗:", err);
      alert("画像生成に失敗しました。コンソールを確認してください。");
    } finally {
      setExporting(false);
    }
  };

  // 鑑定結果を入力から導出。
  const result = useMemo(() => {
    if (!submitted) return null;
    const inyo = calculateInyo({
      year: submitted.year,
      month: submitted.month,
      day: submitted.day,
      hour: submitted.hour ?? undefined,
    });
    const yojo = calculateYojo(submitted.year, submitted.month, submitted.day);
    const tarot = calculateTarotBirthday({
      year: submitted.year, month: submitted.month, day: submitted.day,
    });
    const num = calculateNumerology({
      year: submitted.year, month: submitted.month, day: submitted.day,
    });
    const color = calculateBirthdayColor({
      year: submitted.year, month: submitted.month, day: submitted.day,
    });
    return { inyo, yojo, tarot, num, color };
  }, [submitted]);

  return (
    <div className="px-5 sm:px-8 py-6 sm:py-10 max-w-7xl mx-auto space-y-6">
      <EditorialHeader
        eyebrow="GIA / DIVINATION"
        title="命式図解"
        description="社内鑑定用。生年月日から算命学・タロット・数秘・カラーを総合表示。Phase 1a：基本データのみ。"
      />

      {/* 暦検索（任意の日付の干支を見る） */}
      <KanshiSearch
        onPick={({ year, month, day }) =>
          setSubject((s) => ({ ...s, year, month, day }))
        }
      />

      {/* 入力フォーム */}
      <BirthForm
        value={subject}
        onChange={setSubject}
        onSubmit={() => setSubmitted({ ...subject })}
      />

      {/* 鑑定結果 */}
      {result && submitted && (
        <>
          {/* エクスポートツールバー（PNG 化される領域の外に置く） */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#1c3550] text-[#1c3550] text-sm font-semibold rounded hover:bg-[#1c3550]/5 disabled:opacity-60 disabled:cursor-wait"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  画像を生成中…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  画像でダウンロード
                </>
              )}
            </button>
          </div>

          {/* ── ここから下が PNG キャプチャ対象 ── */}
          <div ref={sheetRef} className="space-y-6 bg-white">
          {/* 鑑定書ヘッダー */}
          <header className="bg-[#1c3550] text-white rounded-md px-6 py-5">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wide">
                {submitted.year}年{submitted.month}月{submitted.day}日生まれ
                {submitted.gender !== "未指定" && (
                  <span className="ml-2 text-[#e8c98a]">（{submitted.gender}）</span>
                )}
                <span className="ml-3 text-base font-normal">命式図解</span>
              </h1>
              <div className="text-[12px] text-[#e8c98a]/80 ml-auto">
                {submitted.name && <span className="mr-3">対象：{submitted.name}</span>}
                {submitted.birthplace && <span>出生地：{submitted.birthplace}</span>}
              </div>
            </div>
          </header>

          {/* 左：陰占 / 右：陽占 の2カラム */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InyoPanel inyo={result.inyo} />
            <YojoPanel yojo={result.yojo} />
          </div>

          {/* 補助：タロット / 数秘 / カラー */}
          <TarotPanel tarot={result.tarot} />
          <NumerologyPanel num={result.num} />
          <ColorPanel color={result.color} />

          {/* フッター注釈 */}
          <p className="text-[11px] text-gray-400 text-center pt-2">
            ※ 命式は推定を含みます。詳細な鑑定は専門家にご相談ください。
          </p>
          </div>
          {/* ── PNG キャプチャ対象ここまで ── */}
        </>
      )}

      {!result && (
        <div className="text-center py-12 text-gray-500 text-sm">
          上のフォームに生年月日を入力して「鑑定する」を押してください。
        </div>
      )}
    </div>
  );
}

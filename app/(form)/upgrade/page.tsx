// 有料プランのランディング（ログイン済ユーザー専用）。
// 2プラン構成:
//   サロン会員 ¥990/月   … applicants.tier=paid, plan=salon（コーチ＝自分軸）
//   本会員    ¥4,980/月  … plan=pro。右腕AIフル込み＋相性鑑定＋紹介リンク＋懇親会＋stock。
//                          実体は AI Clone(assistant) の購入＝決済完了で webhook が
//                          右腕AIテナント作成＋applicants.plan='pro' を立てる。
//
// アクセス制御（Server Component）:
//   - 未ログイン → /login にリダイレクト（戻り先 /upgrade を query で保持）
//   - 既に plan='pro'（本会員）→ /members/app/mypage にリダイレクト（最上位なので）
//   - tier='paid' & plan='salon'（サロン会員）→ 本会員へのアップグレードのみ表示
//   - それ以外（無料/仮）→ サロン・本会員の両方を表示
//
// Stripe 未設定時は本会員ボタンが checkout-core 側で /upgrade?checkout=unavailable に倒れる。

import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UpgradeCta } from "./_components/UpgradeCta";
import { startProMembership } from "./_actions";
import { SALON_PLAN_ENABLED } from "@/lib/config/membership";

export const metadata = {
  title: "プランの変更 | GIA",
  description: SALON_PLAN_ENABLED
    ? "一般会員（月990円）と本会員（月4,980円・右腕AIフル込み）。紹介を仕組みにする実践コミュニティ。"
    : "本会員（月4,980円・右腕AIフル込み）。紹介を仕組みにする実践コミュニティ。",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const unavailable = checkout === "unavailable";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/upgrade");
  }

  const { data: applicant } = await supabase
    .from("applicants")
    .select("id, name, tier, plan")
    .eq("id", user.id)
    .single();

  const tier = (applicant?.tier as string | null) ?? "tentative";
  const plan = (applicant?.plan as string | null) ?? null;

  // 既に本会員（最上位）なら戻す
  if (plan === "pro") {
    redirect("/members/app/mypage");
  }

  const isSalon = tier === "paid" && plan === "salon";

  // 一般会員（¥990）の新規提示は SALON_PLAN_ENABLED=false で停止中。
  // 既存サロン会員（isSalon）は元々この枠を見ないので影響なし。
  const showSalonCard = SALON_PLAN_ENABLED && !isSalon;

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
            <span>MEMBERSHIP</span>
            <span aria-hidden className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]" />
          </div>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            {isSalon ? "本会員にアップグレード" : "プランの変更"}
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            {isSalon ? (
              <>
                右腕AIフル込みの本会員へ。
                <br className="hidden sm:block" />
                紹介を回し、人脈を動かす全部入りプランです。
              </>
            ) : (
              <>
                『紹介設計研究所』へようこそ。
                <br className="hidden sm:block" />
                紹介を仕組みにする実践コミュニティです。
              </>
            )}
          </p>
        </header>

        {unavailable && (
          <div
            role="alert"
            className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--gia-deck-gold)]/30 bg-[var(--gia-deck-gold)]/10 px-5 py-4"
          >
            <span aria-hidden className="text-[var(--gia-deck-gold)] mt-0.5">◆</span>
            <div className="text-sm text-[var(--gia-deck-ink)] leading-relaxed">
              ただいま本会員のオンライン決済を準備中です。
              <br className="hidden sm:block" />
              ご希望の方は主催者LINEへお問い合わせください。
            </div>
          </div>
        )}

        <div className={`grid gap-6 ${showSalonCard ? "md:grid-cols-2" : ""}`}>
          {/* ─── サロン会員 ¥990（無料/仮の人にだけ提示・SALON_PLAN_ENABLED で開閉） ─── */}
          {showSalonCard && (
            <PlanCard
              eyebrow="Member"
              name="一般会員"
              price="¥990"
              priceNote="/ 月（税別）"
              tagline="まず“自分を整える”入口"
              benefits={[
                "紹介コーチAI 24時間相談",
                "自分のストーリー・紹介文をAIと磨く",
                "気になる人への紹介依頼（主催者が仲介）",
                // "自分の鑑定で自分のことが分かる（近日）", // 鑑定は近日のため一旦非表示
                "限定回・少人数会への案内",
              ]}
            >
              <UpgradeCta />
            </PlanCard>
          )}

          {/* ─── 本会員 ¥4,980（おすすめ・右腕AIフル込み） ─── */}
          <PlanCard
            eyebrow="Full Member"
            name="本会員"
            price="¥4,980"
            priceNote="/ 月（税別）"
            tagline="右腕AI込みの“全部入り”"
            highlighted
            benefits={
              SALON_PLAN_ENABLED
                ? [
                    "一般会員の特典すべて",
                    "右腕AI ― 人も約束も忘れない、あなたの右腕",
                    // "任意の誕生日で鑑定（どなたでも・近日）", // 鑑定は近日のため一旦非表示
                    "限定の懇親会・勉強会（不定期）",
                  ]
                : [
                    "紹介コーチAI 24時間相談",
                    "自分のストーリー・紹介文をAIと磨く",
                    "気になる人への紹介依頼（主催者が仲介）",
                    "右腕AI ― 人も約束も忘れない、あなたの右腕",
                    // "任意の誕生日で鑑定（どなたでも・近日）", // 鑑定は近日のため一旦非表示
                    "限定の懇親会・勉強会（不定期）",
                  ]
            }
          >
            <form action={startProMembership}>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
              >
                本会員になる
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </PlanCard>
        </div>

        <p className="text-center text-[11px] text-[var(--gia-deck-sub)] mt-8 leading-relaxed">
          ※ いつでも解約可能。決済は Stripe（クレジットカード）。
          {isSalon && "　一般会員からの切替もこちらから。"}
        </p>
      </div>
    </div>
  );
}

// ─── プランカード ────────────────────────────────────────────────────
function PlanCard({
  eyebrow,
  name,
  price,
  priceNote,
  tagline,
  benefits,
  highlighted,
  children,
}: {
  eyebrow: string;
  name: string;
  price: string;
  priceNote: string;
  tagline: string;
  benefits: string[];
  highlighted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-white rounded-2xl overflow-hidden flex flex-col ${
        highlighted
          ? "border-2 border-[var(--gia-deck-gold)]/50 shadow-[0_8px_30px_-12px_rgba(180,140,60,0.25)]"
          : "border border-[var(--gia-deck-line)] shadow-[0_1px_2px_rgba(28,53,80,0.04)]"
      }`}
    >
      <div className="p-7 sm:p-8 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em]">
            {eyebrow.toUpperCase()}
          </span>
          {highlighted && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gia-deck-gold)]/15 text-[var(--gia-deck-gold)] tracking-[0.05em]">
              おすすめ
            </span>
          )}
        </div>
        <h2 className="font-serif text-xl font-bold text-[var(--gia-deck-navy)] tracking-[0.04em]">
          {name}
        </h2>
        <p className="text-xs text-[var(--gia-deck-sub)] mt-1 mb-4">{tagline}</p>

        <div className="flex items-baseline gap-1 mb-5">
          <span className="font-serif text-3xl font-bold text-[var(--gia-deck-navy)] tracking-tight">
            {price}
          </span>
          <span className="text-xs text-[var(--gia-deck-sub)]">{priceNote}</span>
        </div>

        <ul className="space-y-2.5 text-sm text-[var(--gia-deck-ink)] leading-relaxed mb-7 flex-1">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-2.5">
              <span aria-hidden className="text-[var(--gia-deck-gold)] mt-1 text-[11px]">◆</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {children}
      </div>
    </div>
  );
}

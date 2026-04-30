"use client";

/**
 * Challenges — Editorial 課題提起
 * オフホワイト中央寄せ：金線マーカー → "Challenge" lead → 明朝h2 →
 * チェックリスト → 締めの一文。
 */
const challenges = [
  "担当者が辞めたら、回らなくなる仕組みになっている",
  "営業の \"勝ちパターン\" が個人技で、再現できない",
  "ツールは導入したが、誰も日常的に使っていない",
];

export function Challenges() {
  return (
    <section className="edl-root bg-[var(--edl-off-white)] py-28 md:py-36 px-6 md:px-16 text-center">
      <div className="max-w-[880px] mx-auto">
        <span
          aria-hidden
          className="edl-reveal inline-block w-px h-14 bg-[var(--edl-gold)] mb-8"
        />
        <span
          className="edl-reveal block font-[family-name:var(--font-en)] text-xs tracking-[0.32em] text-[var(--edl-gold)] uppercase mb-7"
          data-delay="1"
        >
          Challenge
        </span>
        <h2
          className="edl-reveal edl-jp-keep font-[family-name:var(--font-mincho)] font-semibold text-[var(--edl-navy)] leading-[1.55] tracking-[0.04em]"
          data-delay="2"
          style={{ fontSize: "clamp(30px, 4vw, 56px)" }}
        >
          業務も営業も、
          <br />
          <span className="relative inline-block">
            属人化
            <span
              aria-hidden
              className="absolute left-0 right-0 bottom-1 h-2.5 bg-[var(--edl-gold)] opacity-30 -z-10"
            />
          </span>
          していませんか？
        </h2>

        <ul
          className="edl-reveal max-w-[640px] mx-auto mt-16 mb-8 text-left list-none"
          data-delay="3"
        >
          {challenges.map((line, i) => (
            <li
              key={line}
              className={`relative pl-9 py-5 text-[16px] leading-[1.7] text-[var(--edl-body)] ${
                i < challenges.length - 1
                  ? "border-b border-[var(--edl-line)]"
                  : ""
              }`}
            >
              <span className="absolute top-5 left-0 font-[family-name:var(--font-en)] text-[var(--edl-gold)] font-semibold">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>

        <p
          className="edl-reveal edl-jp-keep font-[family-name:var(--font-mincho)] text-[17px] text-[var(--edl-muted)] mt-6 tracking-[0.04em]"
          data-delay="4"
        >
          ── そのままでは、人が &quot;やらなくていいこと&quot;
          に時間を奪われ続けます。
        </p>
      </div>
    </section>
  );
}

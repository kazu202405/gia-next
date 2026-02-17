import Link from "next/link";

export default function ContactPage() {
  return (
    <section className="min-h-screen flex items-center justify-center bg-[#f8f7f5] px-4">
      <div className="text-center max-w-lg">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#2d8a80]/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#2d8a80]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6l4 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl font-semibold text-slate-800 mb-4">
          準備中です
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed mb-8">
          無料相談の受付ページは現在準備中です。
          <br />
          もうしばらくお待ちください。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#2d8a80] hover:text-[#236b63] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          トップページに戻る
        </Link>
      </div>
    </section>
  );
}

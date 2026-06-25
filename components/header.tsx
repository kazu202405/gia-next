"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

type NavChild = {
  label: string;
  desc: string;
  href: string;
  highlight?: boolean;
};
type NavItem = { label: string; href: string; children?: NavChild[] };

const navLinkItems: NavItem[] = [
  { label: "Home", href: "/" },
  {
    label: "Service",
    href: "/services/ai",
    children: [
      {
        label: "売上導線診断（無料）",
        desc: "20問で売上の伸びしろを見える化",
        href: "/diagnosis",
        highlight: true,
      },
      { label: "右腕AI", desc: "紹介を仕組みにする経営の右腕AI", href: "/services/ai" },
      { label: "紹介設計研究所", desc: "紹介を仕組みにする実践コミュニティ", href: "/members" },
      {
        label: "お申し込み・ご相談",
        desc: "プラン選択 / 体験セッション",
        href: "/start",
      },
    ],
  },
  // コミュニティは Service ドロップダウン内の「紹介設計研究所」に集約（重複解消）。
  { label: "Knowledge", href: "/behavioral-science" },
  { label: "Founder", href: "/founder" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={`edl-root edl-header fixed top-0 left-0 right-0 z-50 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? "py-3 px-6 md:px-12 bg-[rgba(248,246,241,0.95)] backdrop-blur-xl"
          : "py-4 md:py-[18px] px-6 md:px-12 bg-[rgba(248,246,241,0.85)] backdrop-blur-xl"
      } border-b border-[var(--edl-line)]`}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3.5 no-underline">
        <Image src="/gia-logo.png" alt="GIA" width={36} height={36} />
        <span className="hidden sm:flex flex-col leading-[1.15]">
          <span className="font-[family-name:var(--font-en)] text-[15px] font-semibold text-[var(--edl-navy)] tracking-[0.12em]">
            GIA
          </span>
          <span className="font-[family-name:var(--font-mincho)] text-[10px] text-[var(--edl-muted)] tracking-[0.14em] mt-0.5">
            Global Information Academy
          </span>
        </span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden lg:flex items-center gap-8 font-[family-name:var(--font-en)] text-[13px] tracking-[0.08em]">
        {navLinkItems.map((item) =>
          item.children ? (
            <div key={item.label} className="relative group flex items-center">
              <Link
                href={item.href}
                className="edl-nav-link relative inline-block pb-1.5 text-[var(--edl-body)] hover:text-[var(--edl-navy)] transition-colors no-underline"
              >
                {item.label}
              </Link>
              {/* ホバーで開くドロップダウン。pt-3 がラベル⇄パネル間のホバー橋渡し。 */}
              <div className="invisible absolute left-1/2 top-full z-50 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
                <div className="w-72 rounded-xl border border-[var(--edl-line)] bg-[var(--edl-off-white)] p-2 shadow-[0_12px_40px_-12px_rgba(15,31,51,0.25)]">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      className={`block rounded-lg px-4 py-3 no-underline transition-colors ${
                        c.highlight
                          ? "bg-[var(--edl-navy)] text-white hover:bg-[var(--edl-navy)]/90"
                          : "hover:bg-black/[0.04]"
                      }`}
                    >
                      <span
                        className={`block text-[13px] font-medium ${
                          c.highlight ? "text-white" : "text-[var(--edl-navy)]"
                        }`}
                      >
                        {c.label}
                      </span>
                      <span
                        className={`mt-0.5 block text-[11px] tracking-normal ${
                          c.highlight ? "text-white/75" : "text-[var(--edl-muted)]"
                        }`}
                      >
                        {c.desc}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="edl-nav-link relative pb-1.5 text-[var(--edl-body)] hover:text-[var(--edl-navy)] transition-colors no-underline"
            >
              {item.label}
            </Link>
          ),
        )}
        <a
          href="https://page.line.me/131liqrt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--edl-navy)] font-medium border border-[var(--edl-line)] px-4 py-2.5 transition-all duration-300 hover:bg-[var(--edl-navy)] hover:text-white hover:border-[var(--edl-navy)]"
        >
          無料相談
        </a>
      </nav>

      {/* Mobile burger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden p-2 text-[var(--edl-navy)]"
        aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu */}
      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-[var(--edl-off-white)] border-b border-[var(--edl-line)] overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-[80vh] opacity-100 py-6" : "max-h-0 opacity-0 py-0"
        }`}
      >
        <div className="px-6 space-y-1">
          {navLinkItems.map((item) => (
            <div key={item.label}>
              <Link
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="block font-[family-name:var(--font-en)] text-sm tracking-[0.1em] text-[var(--edl-body)] py-3 border-b border-[var(--edl-line)] no-underline"
              >
                {item.label}
              </Link>
              {item.children && (
                <div className="pl-4 py-1 space-y-0.5 border-b border-[var(--edl-line)]">
                  {item.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block text-[13px] py-2 no-underline ${
                        c.highlight
                          ? "text-[var(--edl-navy)] font-medium"
                          : "text-[var(--edl-muted)]"
                      }`}
                    >
                      {c.label}
                      <span className="ml-2 text-[11px] text-[var(--edl-muted)]">
                        {c.desc}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <a
            href="https://page.line.me/131liqrt"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="edl-cta-primary mt-5"
          >
            LINEで無料相談
            <span className="arrow" />
          </a>
        </div>
      </div>

      {/* gold underline on hover */}
      <style jsx>{`
        .edl-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: 0;
          width: 0;
          height: 1px;
          background: var(--edl-gold);
          transition: width 0.25s ease;
        }
        .edl-nav-link:hover::after {
          width: 100%;
        }
      `}</style>
    </header>
  );
}

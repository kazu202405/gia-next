"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navLinkItems = [
  { label: "Home", href: "/" },
  { label: "Service", href: "/services/ai" },
  { label: "Salon", href: "/members" },
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
        {navLinkItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="edl-nav-link relative pb-1.5 text-[var(--edl-body)] hover:text-[var(--edl-navy)] transition-colors no-underline"
          >
            {item.label}
          </Link>
        ))}
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
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block font-[family-name:var(--font-en)] text-sm tracking-[0.1em] text-[var(--edl-body)] py-3 border-b border-[var(--edl-line)] no-underline"
            >
              {item.label}
            </Link>
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

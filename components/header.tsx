"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

const navScrollItems = [
  { label: "サービス", id: "program" },
  { label: "私たちについて", id: "about" },
  { label: "成果", id: "results" },
];

const navLinkItems = [
  { label: "コミュニティ", href: "/members" },
  { label: "グルメサークル", href: "/gourmet" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const scrollToSection = (id: string) => {
    setMobileOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen
          ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)] border-b border-slate-200/50"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/gia-logo.png" alt="GIA" width={32} height={32} />
            <span
              className={`text-xl font-bold transition-colors duration-500 ${
                scrolled || mobileOpen ? "text-[#0f1f33]" : "text-white"
              }`}
            >
              GIA
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navScrollItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className={`text-sm font-medium transition-colors duration-300 ${
                  scrolled
                    ? "text-[#0f1f33]/70 hover:text-[#2d8a80]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
            {navLinkItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-300 ${
                  scrolled
                    ? "text-[#0f1f33]/70 hover:text-[#2d8a80]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="/contact"
              className="btn-glow text-sm font-bold text-white bg-[#c8a55a] hover:bg-[#b8954a] px-5 py-2.5 rounded-full transition-all duration-300 hover:-translate-y-0.5"
            >
              無料相談に申し込む
            </a>
          </nav>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`md:hidden p-2 rounded-lg transition-colors duration-300 ${
              scrolled || mobileOpen
                ? "text-[#0f1f33] hover:bg-slate-100"
                : "text-white hover:bg-white/10"
            }`}
            aria-label={mobileOpen ? "メニューを閉じる" : "メニューを開く"}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 ease-out overflow-hidden ${
          mobileOpen ? "max-h-[80vh] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-xl border-t border-slate-200/50 px-4 py-6 space-y-1">
          {navScrollItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="block w-full text-left text-base font-medium text-[#0f1f33]/80 hover:text-[#2d8a80] hover:bg-[#2d8a80]/5 py-3 px-4 rounded-xl transition-colors"
            >
              {item.label}
            </button>
          ))}
          <div className="border-t border-slate-200/60 my-2" />
          {navLinkItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block text-base font-medium text-[#0f1f33]/80 hover:text-[#2d8a80] hover:bg-[#2d8a80]/5 py-3 px-4 rounded-xl transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t border-slate-200/60 my-2" />
          <a
            href="/contact"
            onClick={() => setMobileOpen(false)}
            className="block text-center text-base font-bold text-white bg-[#c8a55a] hover:bg-[#b8954a] py-3.5 px-6 rounded-full transition-all mt-3"
          >
            無料相談に申し込む
          </a>
        </div>
      </div>
    </header>
  );
}

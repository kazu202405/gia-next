"use client";

import Link from "next/link";
import Image from "next/image";

export function Header() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/gia-logo.png" alt="GIA" width={32} height={32} />
            <span className="text-xl font-bold text-slate-800">GIA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("services")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              サービス
            </button>
            <button
              onClick={() => scrollToSection("about")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              私たちについて
            </button>
            <button
              onClick={() => scrollToSection("works")}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              実績
            </button>
            <Link
              href="/members"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              メンバー
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

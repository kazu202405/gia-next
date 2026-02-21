"use client";

import { useState, useEffect } from "react";
import { KnowledgeLogin } from "./knowledge-login";
import { KnowledgeEffects } from "./knowledge-effects";
import { KnowledgeCurriculum } from "./knowledge-curriculum";
import Link from "next/link";
import { ArrowLeft, Brain } from "lucide-react";

export function BehavioralScienceApp() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("knowledge-auth");
    if (auth === "true") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0f1f33] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2d8a80] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <KnowledgeLogin onSuccess={() => setAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#0f1f33]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0f1f33]/80 backdrop-blur-xl border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </Link>

          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-[#2d8a80]" />
            <h1 className="font-[family-name:var(--font-noto-serif-jp)] text-base sm:text-lg font-semibold text-white">
              行動科学
            </h1>
          </div>

          <div className="w-[72px]" />
        </div>
      </header>

      {/* Content */}
      <main>
        <KnowledgeEffects />
        <KnowledgeCurriculum />
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-white/30 text-sm">
            本コンテンツは行動科学の研究に基づいています。
          </p>
        </div>
      </footer>
    </div>
  );
}

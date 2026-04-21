"use client";

import { useEffect, useRef } from "react";
import {
  Calendar,
  Clock,
  Users,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// 仮のセミナー情報
// 次回日程・申込みURL・受講者の声は事実ベースで微調整予定
const takeaways = [
  "紹介が生まれる会社の共通パターン",
  "属人的な営業を仕組みに変える設計法",
  "現場で回る顧客管理・営業支援の設計手順",
  "KPIで測れる状態までの落とし込み方",
];

const attendeeVoices = [
  {
    quote: "紹介が偶然ではなく、仕組みで起こることが腹落ちしました。",
    role: "製造業 経営者",
  },
  {
    quote: "自社に何が足りないか、その日のうちに言語化できました。",
    role: "サービス業 取締役",
  },
];

export function Seminar() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".sm-content",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".sm-content",
            start: "top 85%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative bg-[#f8f7f5] py-24 md:py-32 overflow-hidden"
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="sm-content rounded-[32px] bg-gradient-to-br from-[#0f1f33] via-[#12263f] to-[#0f1f33] p-8 md:p-14 shadow-2xl overflow-hidden relative">
          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[#2d8a80]/20 blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-[250px] h-[250px] rounded-full bg-[#c8a55a]/10 blur-[100px] pointer-events-none" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-[#c8a55a] mb-5 px-3 py-1.5 rounded-full bg-white/5 border border-[#c8a55a]/30">
              <Calendar className="w-3.5 h-3.5" />
              次回セミナー開催
            </span>
            <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4 leading-tight">
              <span className="text-[#c8a55a]">紹介が自然に生まれる</span>
              <br className="hidden sm:block" />
              仕組みのつくり方
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed mb-10 max-w-2xl">
              属人的な営業・紹介を、仕組みで回る状態に変えるには何が必要か。
              <br className="hidden md:block" />
              アプリとして現場に落とし込むまでの設計手順を、90分でお伝えします。
            </p>

            {/* Details strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="flex items-center gap-3 text-white/80">
                <Calendar className="w-4 h-4 text-[#2d8a80]" />
                <span className="text-sm">月1回開催</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Clock className="w-4 h-4 text-[#2d8a80]" />
                <span className="text-sm">90分 / オンライン</span>
              </div>
              <div className="flex items-center gap-3 text-white/80">
                <Users className="w-4 h-4 text-[#2d8a80]" />
                <span className="text-sm">経営者・責任者向け</span>
              </div>
            </div>

            {/* Takeaways */}
            <div className="mb-10">
              <p className="text-sm font-semibold text-[#c8a55a] mb-4 tracking-wider">
                持ち帰っていただくこと
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {takeaways.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-2.5 text-white/85"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#2d8a80] mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Attendee voices */}
            <div className="mb-10 pt-8 border-t border-white/10">
              <p className="text-sm font-semibold text-[#c8a55a] mb-4 tracking-wider">
                過去参加者の声
              </p>
              <div className="space-y-4">
                {attendeeVoices.map((v) => (
                  <div key={v.role} className="flex items-start gap-3">
                    <span className="text-3xl text-[#2d8a80]/40 font-[family-name:var(--font-noto-serif-jp)] leading-none pt-1 select-none">
                      &ldquo;
                    </span>
                    <div>
                      <p className="text-sm text-white/85 leading-relaxed mb-1">
                        {v.quote}
                      </p>
                      <p className="text-xs text-white/45">— {v.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href="#"
                className="btn-glow group inline-flex items-center gap-3 px-8 py-4 bg-[#c8a55a] text-white font-bold text-base rounded-full hover:bg-[#b8954a] transition-all duration-300 shadow-lg hover:shadow-[0_12px_40px_rgba(200,165,90,0.3)] hover:-translate-y-0.5"
              >
                セミナーの詳細・お申込み
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <p className="text-xs text-white/50">
                参加費無料 / 録画配信あり
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

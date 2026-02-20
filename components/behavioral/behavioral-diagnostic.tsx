"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Clock, BarChart3 } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const domains = [
  { label: "意思決定", score: 72, angle: 0 },
  { label: "習慣設計", score: 45, angle: 60 },
  { label: "コミュニケーション", score: 68, angle: 120 },
  { label: "リーダーシップ", score: 55, angle: 180 },
  { label: "モチベーション", score: 80, angle: 240 },
  { label: "環境設計", score: 38, angle: 300 },
];

const sampleQuestions = [
  "会議で最初に発言するのは、いつも同じ人ですか？",
  "新しい業務プロセスは、3ヶ月後も使われていますか？",
  "部下のフィードバック頻度は週に何回ですか？",
];

function RadarChart() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const paths = svgRef.current.querySelectorAll(".radar-area");
    paths.forEach((path) => {
      gsap.fromTo(
        path,
        { opacity: 0, scale: 0.3, transformOrigin: "center center" },
        {
          opacity: 1,
          scale: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: svgRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        }
      );
    });
  }, []);

  const size = 280;
  const center = size / 2;
  const maxRadius = 100;
  const levels = [0.25, 0.5, 0.75, 1];

  const getPoint = (angle: number, radius: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const dataPoints = domains.map((d) =>
    getPoint(d.angle, (d.score / 100) * maxRadius)
  );
  const pathD =
    dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") +
    " Z";

  return (
    <svg ref={svgRef} viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {/* Grid levels */}
      {levels.map((level) => {
        const points = domains
          .map((d) => getPoint(d.angle, maxRadius * level))
          .map((p) => `${p.x},${p.y}`)
          .join(" ");
        return (
          <polygon
            key={level}
            points={points}
            fill="none"
            stroke="rgba(45,138,128,0.15)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Axis lines */}
      {domains.map((d) => {
        const p = getPoint(d.angle, maxRadius);
        return (
          <line
            key={d.label}
            x1={center}
            y1={center}
            x2={p.x}
            y2={p.y}
            stroke="rgba(45,138,128,0.1)"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Data area */}
      <path
        className="radar-area"
        d={pathD}
        fill="rgba(45,138,128,0.15)"
        stroke="#2d8a80"
        strokeWidth="2"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle
          key={i}
          className="radar-area"
          cx={p.x}
          cy={p.y}
          r="4"
          fill="#2d8a80"
          stroke="white"
          strokeWidth="2"
        />
      ))}

      {/* Labels */}
      {domains.map((d) => {
        const p = getPoint(d.angle, maxRadius + 28);
        return (
          <text
            key={d.label}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-500 text-[9px] font-medium"
          >
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

export function BehavioralDiagnostic() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".bd-header",
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bd-header",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bd-card",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bd-content",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );

      gsap.fromTo(
        ".bd-question",
        { x: -20, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".bd-questions",
            start: "top 90%",
            toggleActions: "play none none none",
          },
        }
      );
    }, containerRef);

    ScrollTrigger.refresh(true);

    return () => {
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <section
      ref={containerRef}
      id="diagnostic"
      className="relative overflow-hidden py-24 md:py-32 bg-[#f8f7f5]"
    >
      {/* Decorative circle */}
      <svg
        className="pointer-events-none absolute -top-20 -right-20 w-[400px] h-[400px] opacity-[0.04]"
        viewBox="0 0 400 400"
        fill="none"
        style={{ animation: "spin-slow 40s linear infinite" }}
      >
        <circle cx="200" cy="200" r="180" stroke="#2d8a80" strokeWidth="1.5" />
      </svg>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bd-header text-center mb-16">
          <span className="inline-block text-sm font-semibold tracking-[0.15em] text-[#2d8a80] mb-4">
            DIAGNOSTIC
          </span>
          <h2 className="font-[family-name:var(--font-noto-serif-jp)] text-3xl sm:text-4xl md:text-5xl font-semibold text-[#0f1f33] mb-4">
            3分で見える、組織の行動パターン
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            18問の設問で6領域をスコアリング。あなたの組織の「行動の癖」を可視化します。
          </p>
        </div>

        <div className="bd-content grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-5xl mx-auto">
          {/* Radar Chart Side */}
          <div className="bd-card">
            <div className="p-8 rounded-3xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-xl bg-[#2d8a80]/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#2d8a80]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0f1f33]">
                    6領域レーダーチャート
                  </h3>
                  <p className="text-xs text-slate-400">サンプル結果</p>
                </div>
              </div>
              <RadarChart />
              <div className="mt-6 grid grid-cols-3 gap-2">
                {domains.map((d) => (
                  <div
                    key={d.label}
                    className="text-center p-2 rounded-lg bg-[#f8f7f5]"
                  >
                    <p className="text-xs text-slate-400">{d.label}</p>
                    <p className="text-lg font-bold text-[#0f1f33]">
                      {d.score}
                      <span className="text-xs text-slate-400 font-normal">
                        /100
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Questions Side */}
          <div className="space-y-6">
            <div className="bd-card flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#c8a55a]/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-[#c8a55a]" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0f1f33]">
                  所要時間：約3分
                </p>
                <p className="text-xs text-slate-400">
                  18問 × 5段階評価
                </p>
              </div>
            </div>

            <div className="bd-questions space-y-3">
              <p className="text-sm font-bold text-[#0f1f33] mb-2">
                設問例：
              </p>
              {sampleQuestions.map((q, i) => (
                <div
                  key={i}
                  className="bd-question flex items-start gap-3 p-4 rounded-2xl bg-white/80 border border-slate-200/60"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#2d8a80]/10 flex items-center justify-center text-xs font-bold text-[#2d8a80]">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed">{q}</p>
                </div>
              ))}
            </div>

            <div className="bd-card pt-4">
              <a
                href="/diagnostic"
                className="btn-glow group inline-flex items-center gap-3 px-8 py-4 bg-[#2d8a80] text-white font-bold text-base rounded-full hover:bg-[#247a70] transition-all duration-300 shadow-lg hover:shadow-[0_12px_40px_rgba(45,138,128,0.25)] hover:-translate-y-0.5"
              >
                無料診断をしてみる
                <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <p className="text-xs text-slate-400 mt-3">
                診断後すぐに結果がわかります。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

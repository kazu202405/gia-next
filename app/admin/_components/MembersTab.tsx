"use client";

// 全会員一覧タブ。
// applicants テーブルを起点に、紹介者・参加歴・tier を一覧化する。
// 申請ベースではなく「人」起点の閲覧画面。
//
// 集計:
//   - tier 別カウント（tentative / registered / paid）
//   - 各会員の参加履歴件数（event_attendees status='approved'）
//   - 紹介者名（referrer_name → 自由入力）
//
// CSV エクスポートも対応。

import { useEffect, useMemo, useState } from "react";
import { Search, User, Loader2, Download, AlertCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard, FilterStatCard, formatDate } from "./EditorialChrome";

type Tier = "tentative" | "registered" | "paid";

interface MemberRow {
  id: string;
  name: string;
  name_furigana: string | null;
  nickname: string | null;
  email: string | null;
  referrer_name: string | null;
  referrer_id: string | null;
  tier: Tier;
  job_title: string | null;
  headline: string | null;
  created_at: string;
  attended_count: number; // status='approved' の参加履歴件数
  applied_count: number; // すべての申込件数
}

const tierStyle: Record<
  Tier,
  { label: string; bg: string; border: string; text: string; dotBg: string }
> = {
  tentative: {
    label: "仮登録",
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-600",
    dotBg: "bg-gray-400",
  },
  registered: {
    label: "本登録",
    bg: "bg-[#f1f4f7]",
    border: "border-[#d6dde5]",
    text: "text-[#1c3550]",
    dotBg: "bg-[#1c3550]",
  },
  paid: {
    label: "有料会員",
    bg: "bg-[#fbf3e3]",
    border: "border-[#e6d3a3]",
    text: "text-[#8a5a1c]",
    dotBg: "bg-[#c08a3e]",
  },
};

export function MembersTab() {
  const supabase = useMemo(() => createClient(), []);

  const [rows, setRows] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);

      // 1. applicants 全件
      const { data: applicants, error: aErr } = await supabase
        .from("applicants")
        .select(
          "id, name, name_furigana, nickname, email, referrer_name, referrer_id, tier, job_title, headline, created_at"
        )
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (aErr) {
        setLoadError(aErr.message);
        setRows([]);
        setLoading(false);
        return;
      }

      // 2. 各 applicant の参加件数（attendees join）
      // event_attendees から user_id ごとに status 別件数を取得
      const { data: attendees, error: bErr } = await supabase
        .from("event_attendees")
        .select("user_id, status");

      if (cancelled) return;
      if (bErr) {
        setLoadError(bErr.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const attCount = new Map<string, { applied: number; approved: number }>();
      (attendees ?? []).forEach((a: { user_id: string; status: string }) => {
        const cur = attCount.get(a.user_id) ?? { applied: 0, approved: 0 };
        cur.applied += 1;
        if (a.status === "approved") cur.approved += 1;
        attCount.set(a.user_id, cur);
      });

      const merged: MemberRow[] = (applicants ?? []).map(
        (p: Record<string, unknown>) => {
          const c = attCount.get(p.id as string) ?? { applied: 0, approved: 0 };
          return {
            id: p.id as string,
            name: (p.name as string) ?? "",
            name_furigana: (p.name_furigana as string | null) ?? null,
            nickname: (p.nickname as string | null) ?? null,
            email: (p.email as string | null) ?? null,
            referrer_name: (p.referrer_name as string | null) ?? null,
            referrer_id: (p.referrer_id as string | null) ?? null,
            tier: (p.tier as Tier) ?? "tentative",
            job_title: (p.job_title as string | null) ?? null,
            headline: (p.headline as string | null) ?? null,
            created_at: p.created_at as string,
            attended_count: c.approved,
            applied_count: c.applied,
          };
        }
      );
      setRows(merged);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      tentative: rows.filter((r) => r.tier === "tentative").length,
      registered: rows.filter((r) => r.tier === "registered").length,
      paid: rows.filter((r) => r.tier === "paid").length,
    };
  }, [rows]);

  const filtered = rows.filter((r) => {
    const q = search.trim();
    const matchSearch =
      q.length === 0 ||
      r.name.includes(q) ||
      (r.name_furigana ?? "").includes(q) ||
      (r.email ?? "").includes(q) ||
      (r.referrer_name ?? "").includes(q);
    const matchTier = tierFilter === "all" || r.tier === tierFilter;
    return matchSearch && matchTier;
  });

  const handleExportCsv = () => {
    const header = [
      "name",
      "furigana",
      "nickname",
      "email",
      "referrer",
      "tier",
      "job_title",
      "headline",
      "applied_count",
      "attended_count",
      "registered_at",
    ];
    const escape = (v: string | number | null | undefined) =>
      v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
    const lines = [header.join(",")];
    filtered.forEach((r) => {
      lines.push(
        [
          escape(r.name),
          escape(r.name_furigana),
          escape(r.nickname),
          escape(r.email),
          escape(r.referrer_name),
          escape(r.tier),
          escape(r.job_title),
          escape(r.headline),
          escape(r.applied_count),
          escape(r.attended_count),
          escape(r.created_at),
        ].join(",")
      );
    });
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `members_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {loadError && (
        <div className="mb-6 flex items-start gap-2 px-4 py-3 rounded-md border border-[#d8c4be] bg-[#f3e9e6] text-[#8a4538] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">データ取得エラー</p>
            <p className="mt-0.5 text-xs">{loadError}</p>
          </div>
        </div>
      )}

      {/* スタットカード（クリックで tier フィルタ切替） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <FilterStatCard
          label="全会員"
          count={counts.total}
          active={tierFilter === "all"}
          onClick={() => setTierFilter("all")}
        />
        <FilterStatCard
          label="仮登録"
          count={counts.tentative}
          active={tierFilter === "tentative"}
          onClick={() => setTierFilter("tentative")}
          dotColorClass={tierStyle.tentative.dotBg}
        />
        <FilterStatCard
          label="本登録"
          count={counts.registered}
          active={tierFilter === "registered"}
          onClick={() => setTierFilter("registered")}
          dotColorClass={tierStyle.registered.dotBg}
        />
        <FilterStatCard
          label="有料会員"
          count={counts.paid}
          active={tierFilter === "paid"}
          onClick={() => setTierFilter("paid")}
          dotColorClass={tierStyle.paid.dotBg}
        />
      </div>

      {/* 検索・CSV */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・フリガナ・メール・紹介者で検索..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent"
          />
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#c08a3e] hover:text-[#8a5a1c] transition-all disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isExpanded = expandedId === r.id;
            const t = tierStyle[r.tier];
            return (
              <EditorialCard key={r.id} variant="row" className="overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  className="w-full flex items-center gap-4 p-4 sm:p-5 text-left hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-[#f1f4f7] border border-[#d6dde5] rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-[#1c3550]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-bold text-[#1c3550]">
                        {r.name || "（名前なし）"}
                      </span>
                      {r.name_furigana && (
                        <span className="text-xs text-gray-400">
                          （{r.name_furigana}）
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${t.bg} ${t.border} ${t.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${t.dotBg}`} />
                        {t.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      {r.referrer_name && <span>紹介: {r.referrer_name}</span>}
                      <span>登録: {formatDate(r.created_at)}</span>
                      <span>
                        参加: {r.attended_count} / 申込: {r.applied_count}
                      </span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 sm:px-5 py-4 sm:py-5 bg-gray-50/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      {r.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600 break-all">
                            {r.email}
                          </span>
                        </div>
                      )}
                      {r.nickname && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tracking-[0.2em] text-gray-400">
                            NICKNAME
                          </span>
                          <span className="text-gray-700">{r.nickname}</span>
                        </div>
                      )}
                      {r.job_title && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] tracking-[0.2em] text-gray-400">
                            JOB
                          </span>
                          <span className="text-gray-700">{r.job_title}</span>
                        </div>
                      )}
                      {r.headline && (
                        <div className="flex items-start gap-2 sm:col-span-2">
                          <span className="text-[10px] tracking-[0.2em] text-gray-400 mt-0.5">
                            HEADLINE
                          </span>
                          <span className="text-gray-700">{r.headline}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </EditorialCard>
            );
          })}

          {filtered.length === 0 && (
            <EditorialCard className="text-center py-16">
              <p className="text-sm text-gray-400">
                該当する会員はいません
              </p>
            </EditorialCard>
          )}
        </div>
      )}
    </div>
  );
}

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

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Search,
  Loader2,
  Download,
  AlertCircle,
  Mail,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EditorialCard, FilterStatCard, formatDate } from "./EditorialChrome";

type SortKey = "name" | "tier" | "attended" | "created";
type SortDir = "asc" | "desc";

// tier の優先順位（paid > registered > tentative）
const tierRank: Record<"tentative" | "registered" | "paid", number> = {
  tentative: 0,
  registered: 1,
  paid: 2,
};

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
  const [referrerFilter, setReferrerFilter] = useState<string>("all"); // "all" / "__none__" / 紹介者名
  const [dateFilter, setDateFilter] =
    useState<"all" | "this_month" | "30d" | "90d" | "this_year" | "custom">(
      "all",
    );
  const [dateCustomDays, setDateCustomDays] = useState<string>("7"); // string で持って空欄も許容
  const [activityFilter, setActivityFilter] =
    useState<"all" | "attended" | "applied_only" | "custom">("all");
  const [activityCustomMin, setActivityCustomMin] = useState<string>("3");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // 列ヘッダークリックで toggle。同じ列なら方向反転、違う列ならデフォルト方向。
  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // 名前は asc、それ以外は desc がデフォルト
      setSortDir(key === "name" ? "asc" : "desc");
    }
  };

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

  // 紹介者フィルタの選択肢（rows から空でない referrer_name を集計）
  const referrerOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      const n = r.referrer_name?.trim();
      if (n && n.length > 0) set.add(n);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim();
    const now = new Date();
    const arr = rows.filter((r) => {
      const matchSearch =
        q.length === 0 ||
        r.name.includes(q) ||
        (r.name_furigana ?? "").includes(q) ||
        (r.email ?? "").includes(q) ||
        (r.referrer_name ?? "").includes(q);
      const matchTier = tierFilter === "all" || r.tier === tierFilter;

      // 紹介者
      const refName = r.referrer_name?.trim() ?? "";
      const matchReferrer =
        referrerFilter === "all" ||
        (referrerFilter === "__none__" && refName.length === 0) ||
        refName === referrerFilter;

      // 登録時期
      let matchDate = true;
      if (dateFilter !== "all") {
        const created = new Date(r.created_at);
        if (Number.isNaN(created.getTime())) {
          matchDate = false;
        } else if (dateFilter === "30d") {
          matchDate = (now.getTime() - created.getTime()) / 86400000 <= 30;
        } else if (dateFilter === "90d") {
          matchDate = (now.getTime() - created.getTime()) / 86400000 <= 90;
        } else if (dateFilter === "this_month") {
          matchDate =
            created.getFullYear() === now.getFullYear() &&
            created.getMonth() === now.getMonth();
        } else if (dateFilter === "this_year") {
          matchDate = created.getFullYear() === now.getFullYear();
        } else if (dateFilter === "custom") {
          const days = Number.parseInt(dateCustomDays, 10);
          if (Number.isNaN(days) || days <= 0) {
            matchDate = true; // 未入力時は絞り込まない
          } else {
            matchDate = (now.getTime() - created.getTime()) / 86400000 <= days;
          }
        }
      }

      // 参加状況
      let matchActivity = true;
      if (activityFilter === "attended") {
        matchActivity = r.attended_count >= 1;
      } else if (activityFilter === "applied_only") {
        matchActivity = r.attended_count === 0 && r.applied_count >= 1;
      } else if (activityFilter === "custom") {
        const min = Number.parseInt(activityCustomMin, 10);
        if (Number.isNaN(min) || min < 0) {
          matchActivity = true;
        } else {
          matchActivity = r.attended_count >= min;
        }
      }

      return (
        matchSearch &&
        matchTier &&
        matchReferrer &&
        matchDate &&
        matchActivity
      );
    });
    // ソート
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name, "ja") * dir;
        case "tier":
          return (tierRank[a.tier] - tierRank[b.tier]) * dir;
        case "attended":
          return (a.attended_count - b.attended_count) * dir;
        case "created":
        default:
          return a.created_at < b.created_at
            ? -1 * dir
            : a.created_at > b.created_at
              ? 1 * dir
              : 0;
      }
    });
    return arr;
  }, [
    rows,
    search,
    tierFilter,
    referrerFilter,
    dateFilter,
    dateCustomDays,
    activityFilter,
    activityCustomMin,
    sortKey,
    sortDir,
  ]);

  // 適用中フィルタ（チップ表示用）
  const dateLabelMap: Record<typeof dateFilter, string> = {
    all: "",
    this_month: "今月",
    "30d": "過去30日",
    "90d": "過去90日",
    this_year: "今年",
    custom: dateCustomDays ? `${dateCustomDays}日以内` : "カスタム",
  };
  const activityLabelMap: Record<typeof activityFilter, string> = {
    all: "",
    attended: "1回以上参加",
    applied_only: "申込のみ・未参加",
    custom: activityCustomMin ? `${activityCustomMin}回以上参加` : "カスタム",
  };
  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (referrerFilter !== "all") {
    activeFilters.push({
      key: "紹介者",
      label: referrerFilter === "__none__" ? "未指定" : referrerFilter,
      clear: () => setReferrerFilter("all"),
    });
  }
  if (dateFilter !== "all") {
    activeFilters.push({
      key: "登録時期",
      label: dateLabelMap[dateFilter],
      clear: () => setDateFilter("all"),
    });
  }
  if (activityFilter !== "all") {
    activeFilters.push({
      key: "参加状況",
      label: activityLabelMap[activityFilter],
      clear: () => setActivityFilter("all"),
    });
  }
  const clearAllFilters = () => {
    setReferrerFilter("all");
    setDateFilter("all");
    setActivityFilter("all");
  };

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

      {/* フィルタバー：紹介者 / 登録時期 / 参加状況 */}
      <div className="bg-white border border-gray-200 rounded-md px-3 py-2.5 mb-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] tracking-[0.22em] text-gray-500 uppercase font-semibold pr-1">
            Filters
          </span>
          <FilterSelect
            value={referrerFilter}
            onChange={setReferrerFilter}
            active={referrerFilter !== "all"}
          >
            <option value="all">紹介者：すべて</option>
            <option value="__none__">紹介者：未指定</option>
            {referrerOptions.map((name) => (
              <option key={name} value={name}>
                紹介者：{name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            value={dateFilter}
            onChange={(v) => setDateFilter(v as typeof dateFilter)}
            active={dateFilter !== "all"}
          >
            <option value="all">登録時期：全期間</option>
            <option value="this_month">登録時期：今月</option>
            <option value="30d">登録時期：過去30日</option>
            <option value="90d">登録時期：過去90日</option>
            <option value="this_year">登録時期：今年</option>
            <option value="custom">登録時期：カスタム（日数指定）</option>
          </FilterSelect>
          {dateFilter === "custom" && (
            <NumericInline
              prefix="登録から"
              suffix="日以内"
              value={dateCustomDays}
              onChange={setDateCustomDays}
              min={1}
              max={3650}
            />
          )}
          <FilterSelect
            value={activityFilter}
            onChange={(v) => setActivityFilter(v as typeof activityFilter)}
            active={activityFilter !== "all"}
          >
            <option value="all">参加状況：すべて</option>
            <option value="attended">参加状況：1回以上参加</option>
            <option value="applied_only">参加状況：申込のみ・未参加</option>
            <option value="custom">参加状況：カスタム（回数指定）</option>
          </FilterSelect>
          {activityFilter === "custom" && (
            <NumericInline
              prefix="参加"
              suffix="回以上"
              value={activityCustomMin}
              onChange={setActivityCustomMin}
              min={0}
              max={999}
            />
          )}
          {activeFilters.length > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="ml-auto inline-flex items-center gap-1 text-xs text-[#8a5a1c] hover:bg-[#fbf3e3] px-2 py-1 rounded-md transition-colors"
            >
              <X className="w-3 h-3" />
              クリア
            </button>
          )}
        </div>
      </div>

      {/* 適用中フィルタのチップ */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {activeFilters.map((f) => (
            <span
              key={`${f.key}-${f.label}`}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-[11px] font-bold bg-[#1c3550] text-white"
            >
              <span className="text-[9px] tracking-[0.18em] opacity-70 uppercase">
                {f.key}
              </span>
              <span>{f.label}</span>
              <button
                type="button"
                onClick={f.clear}
                aria-label={`${f.key}フィルタを解除`}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          <span className="inline-flex items-center text-[11px] text-gray-500 px-2">
            {filtered.length} / {rows.length} 人
          </span>
        </div>
      )}

      {loading && (
        <EditorialCard className="text-center py-16">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">読み込み中...</p>
        </EditorialCard>
      )}

      {!loading && (
        <>
          {filtered.length === 0 ? (
            <EditorialCard className="text-center py-16">
              <p className="text-sm text-gray-400">
                該当する会員はいません
              </p>
            </EditorialCard>
          ) : (
            <div className="bg-white border border-gray-200 rounded-md overflow-hidden relative">
              {/* 上辺ゴールド線（Editorial アクセント） */}
              <div
                aria-hidden
                className="absolute top-0 left-0 h-[2px] w-16 bg-[#c08a3e] z-10"
              />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1c3550]">
                      <SortHeader
                        label="Name"
                        sortKey="name"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[28%]"
                      />
                      <SortHeader
                        label="Tier"
                        sortKey="tier"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[12%]"
                      />
                      <th className="px-4 py-3 text-left font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase w-[18%]">
                        Referrer
                      </th>
                      <SortHeader
                        label="Attended"
                        sortKey="attended"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[12%] text-right"
                        align="right"
                      />
                      <SortHeader
                        label="Joined"
                        sortKey="created"
                        currentKey={sortKey}
                        currentDir={sortDir}
                        onClick={toggleSort}
                        className="w-[14%]"
                      />
                      <th className="px-4 py-3 text-left font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase w-[16%]">
                        Email
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => {
                      const isExpanded = expandedId === r.id;
                      const t = tierStyle[r.tier];
                      return (
                        <Fragment key={r.id}>
                          <tr
                            onClick={() =>
                              setExpandedId(isExpanded ? null : r.id)
                            }
                            className={`border-b border-gray-100 transition-colors cursor-pointer ${
                              isExpanded ? "bg-gray-50/70" : "hover:bg-gray-50/50"
                            }`}
                          >
                            <td className="px-4 py-3 align-middle">
                              <div className="font-bold text-[#1c3550]">
                                {r.name || "（名前なし）"}
                              </div>
                              {r.name_furigana && (
                                <div className="text-[11px] text-gray-400">
                                  {r.name_furigana}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${t.bg} ${t.border} ${t.text}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${t.dotBg}`}
                                />
                                {t.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 align-middle text-gray-700">
                              {r.referrer_name || (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-middle text-right tabular-nums text-gray-700">
                              {r.attended_count}
                              <span className="text-gray-300 mx-1">/</span>
                              {r.applied_count}
                            </td>
                            <td className="px-4 py-3 align-middle tabular-nums text-gray-500">
                              {formatDate(r.created_at)}
                            </td>
                            <td className="px-4 py-3 align-middle text-gray-500 truncate max-w-0">
                              {r.email || (
                                <span className="text-gray-400 italic">—</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50/40 border-b border-gray-100">
                              <td colSpan={6} className="px-4 py-4">
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
                                      <span className="text-gray-700">
                                        {r.nickname}
                                      </span>
                                    </div>
                                  )}
                                  {r.job_title && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] tracking-[0.2em] text-gray-400">
                                        JOB
                                      </span>
                                      <span className="text-gray-700">
                                        {r.job_title}
                                      </span>
                                    </div>
                                  )}
                                  {r.headline && (
                                    <div className="flex items-start gap-2 sm:col-span-2">
                                      <span className="text-[10px] tracking-[0.2em] text-gray-400 mt-0.5">
                                        HEADLINE
                                      </span>
                                      <span className="text-gray-700">
                                        {r.headline}
                                      </span>
                                    </div>
                                  )}
                                  {!r.nickname &&
                                    !r.job_title &&
                                    !r.headline &&
                                    !r.email && (
                                      <span className="text-gray-400 italic">
                                        詳細情報はまだ入力されていません
                                      </span>
                                    )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// 「○日以内」「参加○回以上」のように、prefix と suffix を伴う数値入力。
// セレクトの「カスタム」モード選択時にインラインで現れる。
function NumericInline({
  prefix,
  suffix,
  value,
  onChange,
  min,
  max,
}: {
  prefix: string;
  suffix: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#1c3550] bg-[#fafbfc] text-[13px] text-[#1c3550]">
      <span className="text-xs text-gray-500">{prefix}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 text-center bg-transparent border-0 outline-none font-semibold tabular-nums focus:bg-white focus:ring-1 focus:ring-[#1c3550] rounded-sm"
      />
      <span className="text-xs text-gray-500">{suffix}</span>
    </span>
  );
}

// フィルタ用 select（active時に navy 縁取り、ChevronDown 自前矢印）
function FilterSelect({
  value,
  onChange,
  active,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-3 pr-8 py-1.5 text-[13px] font-medium rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1c3550] focus:border-transparent transition-colors ${
          active
            ? "border-[#1c3550] bg-[#fafbfc] text-[#1c3550]"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
        }`}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className={`absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${active ? "text-[#1c3550]" : "text-gray-400"}`}
      />
    </div>
  );
}

// 列ヘッダー（クリックでソート、現在のソート列は方向矢印を表示）
function SortHeader({
  label,
  sortKey,
  currentKey,
  currentDir,
  onClick,
  className = "",
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  currentDir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
  align?: "left" | "right";
}) {
  const isActive = currentKey === sortKey;
  const Icon = !isActive
    ? ChevronsUpDown
    : currentDir === "asc"
      ? ChevronUp
      : ChevronDown;
  return (
    <th
      className={`px-4 py-3 font-serif text-[10px] font-bold tracking-[0.18em] text-[#1c3550] uppercase select-none ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1.5 hover:text-[#c08a3e] transition-colors ${
          align === "right" ? "ml-auto" : ""
        }`}
      >
        <span>{label}</span>
        <Icon
          className={`w-3 h-3 ${isActive ? "text-[#c08a3e]" : "text-gray-300"}`}
        />
      </button>
    </th>
  );
}

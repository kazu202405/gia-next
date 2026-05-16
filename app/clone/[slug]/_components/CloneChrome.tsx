"use client";

// /clone/[slug]/* 配下の共通シェル（TopBar + 左ナビ）。
// admin のレイアウトと近いトーンだが、テナント単位の AI Clone エリアであることを
// "AI CLONE / {tenant.name}" ヘッダで明示する。
//
// レスポンシブ:
//   * lg (1024px) 以上 → 左固定サイドナビ (w-56)
//   * lg 未満 (タブレット縦置・スマホ) → ハンバーガー(右) + 右ドロワー
//     /members/app 側の AppSidebar と方向を揃えるため右開きで統一。

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  MessageCircle,
  ListChecks,
  Wallet,
  Brain,
  Eye,
  Settings,
  LogOut,
  ArrowUpRight,
  Menu,
  X,
} from "lucide-react";
import type { ComponentType } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CloneTenant, CloneTenantRole } from "@/lib/ai-clone/tenant";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

function buildNavItems(slug: string): NavItem[] {
  const base = `/clone/${slug}`;
  return [
    { href: base, label: "ダッシュボード", icon: LayoutDashboard },
    { href: `${base}/people`, label: "人物", icon: Users },
    { href: `${base}/projects`, label: "案件", icon: Briefcase },
    { href: `${base}/services`, label: "サービス・商品", icon: Package },
    {
      href: `${base}/logs/conversations`,
      label: "会話・活動",
      icon: MessageCircle,
    },
    { href: `${base}/tasks`, label: "タスク", icon: ListChecks },
    { href: `${base}/finance`, label: "売上・経費", icon: Wallet },
    { href: `${base}/core-os`, label: "Core OS（脳）", icon: Brain },
    { href: `${base}/review`, label: "レビュー", icon: Eye },
    { href: `${base}/settings`, label: "設定", icon: Settings },
  ];
}

export function CloneChrome({
  tenant,
  role,
  children,
}: {
  tenant: CloneTenant;
  role: CloneTenantRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = buildNavItems(tenant.slug);
  const dashboardHref = `/clone/${tenant.slug}`;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  // ESC で drawer を閉じる + body scroll lock + パス変更時の自動close
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // パス変更時に閉じる
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // ナビ項目の描画（desktop / drawer 両方で使う）
  const renderNav = (onClick?: () => void) => (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const isActive =
          item.href === dashboardHref
            ? pathname === dashboardHref
            : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? "bg-[#fbf3e3] text-[#8a5a1c] border-l-2 border-[#c08a3e] -ml-px pl-[calc(0.75rem-1px)]"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 上部ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-5 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden
              className="inline-block w-1 h-5 bg-[#1c3550] rounded-sm"
            />
            <h1 className="font-serif text-[15px] font-semibold tracking-[0.12em] text-gray-900 truncate">
              <span className="text-[#c08a3e] mr-2 tracking-[0.22em] text-[11px] font-bold">
                AI CLONE
              </span>
              {tenant.name}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-[10px] tracking-[0.2em] text-gray-500">
              {role.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 text-xs">
            <Link
              href="/members/app/mypage"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">マイページへ</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
            {/* ─── lg未満：ハンバーガーボタン（右） ───────────────── */}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="メニューを開く"
              aria-expanded={drawerOpen}
              className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ─── lg以上：左サイドナビ（固定表示） ─────────────────── */}
        <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:min-h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200">
          {renderNav()}
          <div className="p-3 text-[10px] tracking-[0.18em] text-gray-400 border-t border-gray-100">
            右腕AI · {tenant.slug.toUpperCase()}
          </div>
        </aside>

        {/* メイン */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* ─── lg未満：Mobile/Tablet drawer overlay ──────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      {/* ─── lg未満：右からスライドインする drawer panel ──────── */}
      <aside
        className={`lg:hidden fixed inset-y-0 right-0 z-50 w-72 max-w-[85vw] bg-white border-l border-gray-200 flex flex-col transform transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200">
          <span className="font-serif text-sm font-semibold tracking-[0.12em] text-[#1c3550] truncate">
            {tenant.name}
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="メニューを閉じる"
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {renderNav(() => setDrawerOpen(false))}
        <div className="p-3 border-t border-gray-100 space-y-1">
          <Link
            href="/members/app/mypage"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            マイページへ
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
          <p className="px-3 pt-2 text-[10px] tracking-[0.18em] text-gray-400">
            右腕AI · {tenant.slug.toUpperCase()}
          </p>
        </div>
      </aside>
    </div>
  );
}

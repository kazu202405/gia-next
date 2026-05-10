"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Users,
  Loader2,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "@/components/auth/LogoutButton";

// 管理画面（旧 /members/app/admin）は admin 専用ルート（/admin）に分離した。
// ユーザー向けナビからは外し、主催者は /admin/login から入る運用。
// 管理画面リンクは下の visibleNavItems で isAdmin の時だけ末尾に追加する。
const navItems = [
  { href: "/members/app/mypage", label: "マイページ", icon: User },
  { href: "/members/app/members", label: "メンバー", icon: Users },
  { href: "/members/app/coach", label: "紹介コーチ", icon: Sparkles },
  // 以下はコアループ確認しながら順次復活:
  // { href: "/members/app/tree", label: "紹介ツリー", icon: GitBranch },
  // { href: "/members/app/board", label: "掲示板", icon: MessageSquareText },
  // { href: "/members/app/post", label: "会を探す", icon: CalendarSearch },
  // { href: "/members/app/members-admin", label: "つながり", icon: UserCog },
];

interface MeInfo {
  name: string;
  email: string;
  initial: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [me, setMe] = useState<MeInfo | null | "loading">("loading");
  const [isAdmin, setIsAdmin] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ユーザー情報取得 + admin 判定
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) setMe(null);
        return;
      }
      // admin 判定（is_admin RPC は migration 0001+0002 で定義済み）
      const { data: adminData } = await supabase.rpc("is_admin");
      if (!cancelled && adminData === true) setIsAdmin(true);

      const { data } = await supabase
        .from("applicants")
        .select("name, nickname, email")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (data) {
        const displayName = data.nickname || data.name || data.email || "";
        setMe({
          name: displayName,
          email: data.email || user.email || "",
          initial: displayName.slice(0, 1).toUpperCase(),
        });
      } else {
        setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // admin の場合のみ「管理画面」リンクを navItems の末尾に追加
  const visibleNavItems = isAdmin
    ? [...navItems, { href: "/admin", label: "管理画面", icon: ShieldCheck }]
    : navItems;

  // ESC で drawer を閉じる + body scroll lock
  // （パス遷移時の自動close は drawer 内の Link onClick={onNavClick} で対応）
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

  return (
    <>
      {/* ─── Desktop sidebar (lg以上で固定表示) ─────────────────── */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-gray-900 border-r border-gray-800">
        <SidebarContent
          me={me}
          pathname={pathname}
          navItems={visibleNavItems}
          onNavClick={() => {}}
        />
      </aside>

      {/* ─── Mobile top header (lg未満で常時表示) ─────────────── */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4">
        <Link
          href="/members/app/mypage"
          className="flex items-center gap-2 text-white"
        >
          <span className="text-lg">✦</span>
          <span className="text-sm font-bold tracking-tight">GIA Stories</span>
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="メニューを開く"
          aria-expanded={drawerOpen}
          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ─── Mobile drawer overlay ─────────────────────────────── */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />

      {/* ─── Mobile drawer panel (左からスライドイン) ─────────── */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gray-900 border-r border-gray-800 flex flex-col transform transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!drawerOpen}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="メニューを閉じる"
          className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent
          me={me}
          pathname={pathname}
          navItems={visibleNavItems}
          onNavClick={() => setDrawerOpen(false)}
        />
      </aside>
    </>
  );
}

// ─── 共通：サイドバー中身（desktop / mobile drawer 両方で使う） ───
interface NavItem {
  href: string;
  label: string;
  icon: typeof User;
}

interface SidebarContentProps {
  me: MeInfo | null | "loading";
  pathname: string;
  navItems: NavItem[];
  onNavClick: () => void;
}

function SidebarContent({
  me,
  pathname,
  navItems,
  onNavClick,
}: SidebarContentProps) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-800 flex-shrink-0">
        <span className="text-xl">✦</span>
        <span className="text-base font-bold text-white tracking-tight">
          GIA Stories
        </span>
      </div>

      {/* My profile mini */}
      <div className="px-4 py-5 border-b border-gray-800 flex-shrink-0">
        {me === "loading" ? (
          <div className="flex items-center gap-3 text-gray-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>読み込み中...</span>
          </div>
        ) : me ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/20 text-amber-300 font-bold border-2 border-gray-700 flex-shrink-0">
              {me.initial || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{me.name}</p>
              <p className="text-xs text-gray-500 truncate">{me.email}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">未ログイン</p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-800 flex-shrink-0">
        <LogoutButton
          redirectTo="/login"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        />
      </div>
    </>
  );
}

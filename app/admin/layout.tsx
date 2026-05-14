"use client";

// 管理者専用レイアウト。
// 一般ユーザー向け /members/app/* とは独立した admin エリアの枠。
// 認証ガードは middleware.ts で行う（未ログインで /admin/* に来たら /admin/login へ）。
// このレイアウト自身は session 状態を見ない（middleware を信頼する）。
//
// /admin/login だけはサイドバー / ヘッダー非表示で素のレイアウトに切り替える。

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LogOut,
  ArrowUpRight,
  CalendarDays,
  BrainCircuit,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const adminNavItems = [
  // /admin/ai-clone ダッシュボードは無効化（2026-05-14、/clone/<slug> に集約）
  // { href: "/admin/ai-clone", label: "AI Clone", icon: BrainCircuit },
  // /admin は会員管理ハブ（タブで申請・全会員・ダッシュボード・招待・ログを切替）
  { href: "/admin", label: "会員管理", icon: ClipboardList },
  { href: "/admin/seminars", label: "会の管理", icon: CalendarDays },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // ログイン画面はシェルを出さない（素の children のみ）
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // refresh して middleware を再評価させる（cookie 削除を反映）
    router.refresh();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* 上部ヘッダー */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block w-1 h-5 bg-[var(--gia-deck-navy,#1c3550)] rounded-sm"
            />
            <h1 className="font-serif text-[15px] font-semibold tracking-[0.12em] text-gray-900">
              GIA 管理画面
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 text-xs">
            <Link
              href="/members/app/mypage"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">マイページへ</span>
              <span className="sm:hidden">マイページ</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 左サイドナビ */}
        <aside className="hidden md:flex md:flex-col md:w-56 md:min-h-[calc(100vh-3.5rem)] bg-white border-r border-gray-200">
          <nav className="flex-1 p-3 space-y-1">
            {adminNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
          <div className="p-3 text-[10px] text-gray-400 border-t border-gray-100">
            主催者専用エリア
          </div>
        </aside>

        {/* メイン */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

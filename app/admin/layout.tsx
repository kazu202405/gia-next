"use client";

// 管理者専用レイアウト（mock）。
// 一般ユーザー向け /members/app/* とは独立した admin エリアの枠。
// Phase 1: 認証ガード未実装。URL 直打ちで誰でも到達可能（admin/login も含む）。
// Phase 2 で Supabase Auth + Role 判定に差し替える前提。
//
// /admin/login だけはサイドバー / ヘッダー非表示で素のレイアウトに切り替える。

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LogOut, ArrowUpRight } from "lucide-react";

const adminNavItems = [
  { href: "/admin", label: "入会申請", icon: ClipboardList },
  // 将来用の拡張ポイント（mock first 段階では出さない）
  // { href: "/admin/invitations", label: "招待管理", icon: Send },
  // { href: "/admin/members", label: "メンバー管理", icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // ログイン画面はシェルを出さない（素の children のみ）
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

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
              <span className="hidden sm:inline">ユーザーアプリへ戻る</span>
              <span className="sm:hidden">アプリへ</span>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              ログアウト
            </Link>
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
                      ? "bg-amber-50 text-amber-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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

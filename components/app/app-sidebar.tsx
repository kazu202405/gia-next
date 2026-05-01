"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CalendarSearch,
  // GitBranch,
  Shield,
  MessageSquare,
  // MessageSquareText,
  Users,
  User,
  // UserCog,
} from "lucide-react";
import { communityStats } from "@/lib/dashboard-data";

// 管理画面（旧 /members/app/admin）は admin 専用ルート（/admin）に分離した。
// ユーザー向けナビからは外し、主催者は /admin/login から入る運用。
//
// Phase 1（実DB化）スコープ：マイページのみ表示。
// メンバー一覧 / 掲示板 / 会を探す / 紹介ツリー / つながり は Phase 2（5/26 後）で復活予定。
const navItems = [
  { href: "/members/app/mypage", label: "マイページ", icon: User },
  // Phase 2 で復活予定:
  // { href: "/members/app/members", label: "メンバー", icon: Users },
  // { href: "/members/app/board", label: "掲示板", icon: MessageSquareText },
  // { href: "/members/app/post", label: "会を探す", icon: CalendarSearch },
  // { href: "/members/app/tree", label: "紹介ツリー", icon: GitBranch },
  // { href: "/members/app/members-admin", label: "つながり", icon: UserCog },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-gray-900 border-r border-gray-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-800">
          <span className="text-xl">✦</span>
          <span className="text-base font-bold text-white tracking-tight">
            GIA Stories
          </span>
        </div>

        {/* My profile mini */}
        <div className="px-4 py-5 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="https://images.unsplash.com/photo-1630572780329-e051273e980f?w=400&h=400&fit=crop&crop=face"
              alt="田中 一郎"
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-700"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">田中 一郎</p>
              <p className="text-xs text-gray-500">経営コンサルタント</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400">
              <Shield className="w-3.5 h-3.5" />
              <span className="font-bold">92</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>18件</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
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

        {/* Community stats */}
        <div className="px-4 py-5 border-t border-gray-800">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-3">
            コミュニティ
          </p>
          <div className="space-y-2.5 text-xs text-gray-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>メンバー</span>
              </div>
              <span className="font-bold text-gray-300">
                {communityStats.memberCount}人
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>おすすめ</span>
              </div>
              <span className="font-bold text-gray-300">
                {communityStats.recommendationCount}件
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarSearch className="w-3.5 h-3.5" />
                <span>今月の会</span>
              </div>
              <span className="font-bold text-gray-300">
                {communityStats.monthlyPosts}件
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom tab */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
        <div className="flex items-center justify-around h-14">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-gray-900" : "text-gray-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

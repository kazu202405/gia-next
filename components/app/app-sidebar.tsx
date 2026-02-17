"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarSearch,
  UtensilsCrossed,
  GitBranch,
  Shield,
  MessageSquare,
  Users,
  User,
  UserCog,
} from "lucide-react";
import { communityStats } from "@/lib/dashboard-data";

const navItems = [
  { href: "/app/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/app/post", label: "会を探す", icon: CalendarSearch },
  { href: "/app/discover", label: "おすすめ", icon: UtensilsCrossed },
  { href: "/app/tree", label: "紹介ツリー", icon: GitBranch },
  { href: "/app/members-admin", label: "つながり", icon: UserCog },
  { href: "/app/mypage", label: "マイページ", icon: User },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-64 bg-gray-900 border-r border-gray-800">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-gray-800">
          <span className="text-xl">🍴</span>
          <span className="text-base font-bold text-white tracking-tight">
            グルメサークル
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

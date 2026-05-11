"use client";

// /clone/[slug]/* 配下の共通シェル（TopBar + 左ナビ）。
// admin のレイアウトと近いトーンだが、テナント単位の AI Clone エリアであることを
// "AI CLONE / {tenant.name}" ヘッダで明示する。

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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/admin/login");
  };

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
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">マイページへ</span>
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
            {items.map((item) => {
              const isActive =
                item.href === dashboardHref
                  ? pathname === dashboardHref
                  : pathname === item.href || pathname.startsWith(item.href + "/");
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
          <div className="p-3 text-[10px] tracking-[0.18em] text-gray-400 border-t border-gray-100">
            右腕AI · {tenant.slug.toUpperCase()}
          </div>
        </aside>

        {/* メイン */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

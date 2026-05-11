"use client";

// /clone/[slug]/core-os/* 配下の内部ナビ。7セクション切替。
// 左ナビではなく、Core OS ページ内の上部タブ（横並び）として配置。

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  slug: string;
}

interface NavItem {
  href: string;
  label: string;
  num: string; // 表示用の番号
}

function buildItems(slug: string): NavItem[] {
  const base = `/clone/${slug}/core-os`;
  return [
    { href: `${base}/mission`, label: "ミッション", num: "01" },
    { href: `${base}/three-year-plan`, label: "3年計画", num: "02" },
    { href: `${base}/annual-kpi`, label: "今年のKPI", num: "03" },
    { href: `${base}/decision-principles`, label: "判断基準", num: "04" },
    { href: `${base}/tone-rules`, label: "口調ルール", num: "05" },
    { href: `${base}/ng-rules`, label: "NGルール", num: "06" },
    { href: `${base}/faq`, label: "FAQ", num: "08" },
  ];
}

export function CoreOsNav({ slug }: Props) {
  const pathname = usePathname();
  const items = buildItems(slug);

  return (
    <nav
      aria-label="Core OS セクション"
      className="border-b border-gray-200 -mx-5 sm:-mx-6 px-5 sm:px-6"
    >
      <div className="flex gap-5 -mb-px overflow-x-auto">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`py-3 text-sm border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                active
                  ? "border-[#1c3550] text-[#1c3550] font-semibold"
                  : "border-transparent text-gray-500 font-medium hover:text-gray-800"
              }`}
            >
              <span
                className={`text-[10px] tracking-[0.18em] tabular-nums ${
                  active ? "text-[#c08a3e]" : "text-gray-400"
                }`}
              >
                {item.num}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

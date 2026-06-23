"use client";

// admin「ログ」タブの中身。サブタブで切り替える:
//   - 履歴（ActivityTab）   … 申込/承認/却下/キャンセルのアクティビティログ（既存）
//   - アンケート（SurveysTab）… 売上ボトルネック診断の回答一覧（新規）
// 既存 ActivityTab は無改変で内包する。

import { useState } from "react";
import { History, ClipboardCheck } from "lucide-react";
import { ActivityTab } from "./ActivityTab";
import { SurveysTab } from "./SurveysTab";

type LogTab = "activity" | "surveys";

const subTabs: { key: LogTab; label: string; Icon: typeof History }[] = [
  { key: "activity", label: "履歴", Icon: History },
  { key: "surveys", label: "アンケート", Icon: ClipboardCheck },
];

export function LogsTab() {
  const [sub, setSub] = useState<LogTab>("activity");

  return (
    <div className="space-y-5">
      <div className="inline-flex gap-1 rounded-lg bg-gray-100 p-1">
        {subTabs.map((t) => {
          const Icon = t.Icon;
          const isActive = sub === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setSub(t.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white text-[#1c3550] shadow-sm"
                  : "text-gray-500 hover:text-[#1c3550]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === "activity" && <ActivityTab />}
      {sub === "surveys" && <SurveysTab />}
    </div>
  );
}

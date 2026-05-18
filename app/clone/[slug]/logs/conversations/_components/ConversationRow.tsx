"use client";

// 会話ログ一覧の 1 行を「クリック / タップで詳細（編集ダイアログ）」にできるラッパー。
// page.tsx（Server Component）から渡された行データと表示済みの中身（children）を
// クリック可能な div で包み、controlled モードの ConversationEditDialog を開閉する。
// 削除ボタンだけは外側の onClick が反応しないよう、RowDeleteButton 側で
// stopPropagation 済みなのでそのまま並べてよい。

import { useState } from "react";
import { ConversationEditDialog } from "./ConversationEditDialog";
import { ConversationDeleteButton } from "./ConversationDeleteButton";
import type { PersonCandidate } from "./PersonMultiPicker";
import type { ConversationInput } from "../_actions";

interface Props {
  slug: string;
  tenantId: string;
  conversationId: string;
  initial: ConversationInput;
  peopleCandidates: PersonCandidate[];
  /** 削除モーダルで「○○ を削除します」と表示する 1 行ラベル */
  deleteLabel: string;
  /** グリッドのテンプレ（page.tsx のヘッダーと揃える） */
  gridCols: string;
  /** 表示する 5 セル（日時 / チャンネル / 要約 / 重要度 / 次のアクション） */
  children: React.ReactNode;
}

export function ConversationRow({
  slug, tenantId, conversationId, initial, peopleCandidates,
  deleteLabel, gridCols, children,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`md:grid ${gridCols} gap-4 px-5 py-3.5 hover:bg-gray-50/60 active:bg-gray-100/70 transition-colors cursor-pointer focus:outline-none focus-visible:bg-gray-50/60 focus-visible:ring-1 focus-visible:ring-[#1c3550]/30`}
      >
        {children}
        <div className="flex items-center justify-end mt-1 md:mt-0">
          <ConversationDeleteButton
            slug={slug}
            tenantId={tenantId}
            conversationId={conversationId}
            label={deleteLabel}
          />
        </div>
      </div>

      <ConversationEditDialog
        slug={slug}
        tenantId={tenantId}
        conversationId={conversationId}
        initial={initial}
        peopleCandidates={peopleCandidates}
        controlledOpen={open}
        onControlledClose={() => setOpen(false)}
      />
    </>
  );
}

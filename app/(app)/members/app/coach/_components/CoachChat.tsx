"use client";

// 紹介コーチ chat の本体（クライアント）。
// Phase C: /api/coach/chat へ POST して OpenAI streaming で受信。
//   サーバ側で referral_worksheets と applicants を読み込み、system prompt に注入する。
//
// UI 方針: Linear AI / Notion AI 風の subtle bubble。
//   - assistant: 左寄せ、✦ 小アイコン + 白背景カード（border-gray-200）
//   - user:      右寄せ、navy 背景の角丸 bubble
//   - typing indicator: streaming 開始までの "…" アニメーション
//   - 入力エリア: sticky bottom、textarea オートグロウ、IME 対応
//
// 履歴方針:
//   同一セッション中のみ React state で保持。リロード / 遷移で消える（MVP）。
//   後で localStorage / Supabase に格上げ予定。
//
// 初回 greeting メッセージはサーバには送らず、クライアント表示のみ
//   （system prompt で人格を毎回作るので重複させる必要なし）。

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { Sparkles, ArrowUp, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { COACH_GREETING } from "@/lib/coach/greeting";

type Role = "assistant" | "user";

interface Message {
  id: string;
  role: Role;
  content: string;
}

interface Props {
  initialName: string | null;
}

const GREETING_ID = "greeting";

export function CoachChat({ initialName }: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: GREETING_ID,
      role: "assistant",
      content: COACH_GREETING(initialName),
    },
  ]);
  const [input, setInput] = useState("");
  // streaming 中はユーザー送信をブロック（次の送信は前の応答完了後）
  const [isStreaming, setIsStreaming] = useState(false);
  // IME 変換中は Enter で送信しない
  const [isComposing, setIsComposing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // メッセージ追加・streaming 変化のたびに最下部へ
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // textarea オートグロウ（最大 200px）
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  const send = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const assistantId = `a-${Date.now()}`;
    const assistantSeed: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    // ユーザー発話を即時追加 + 空の assistant 行を確保
    setMessages((prev) => [...prev, userMsg, assistantSeed]);
    setInput("");
    setIsStreaming(true);

    // greeting は API に送らない（毎回 system prompt で人格を構築）
    const apiMessages = [
      ...messages
        .filter((m) => m.id !== GREETING_ID)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: userMsg.role, content: userMsg.content },
    ];

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // 受け取ったぶんだけ assistant メッセージを更新
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: buffer } : m,
          ),
        );
      }
    } catch (err) {
      console.error("[CoachChat] stream error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "応答の取得中に問題が発生しました。少し時間をおいて、もう一度お試しください。",
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 送信 / Shift+Enter 改行 / IME 中は無視
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* ─── ヘッダー（sticky） ─────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" aria-hidden />
            <h1 className="text-base font-bold tracking-tight text-gray-900">
              紹介コーチ
            </h1>
          </div>
          <Link
            href="/members/app/worksheet"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ClipboardList className="w-3 h-3" aria-hidden />
            設計を編集
          </Link>
        </div>
      </header>

      {/* ─── メッセージ一覧 ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-6 space-y-6">
          {messages.map((m) => (
            <MessageRow key={m.id} role={m.role} content={m.content} />
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* ─── 入力エリア（sticky bottom） ────────────────────── */}
      <div className="sticky bottom-0 bg-gray-50/80 backdrop-blur border-t border-gray-200">
        <form
          onSubmit={onSubmit}
          className="max-w-3xl mx-auto px-4 lg:px-6 py-3 lg:py-4"
        >
          <div className="relative flex items-end gap-2 bg-white border border-gray-300 rounded-2xl shadow-sm focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="紹介の悩みを書いてみてください..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none max-h-[200px]"
              disabled={isStreaming}
            />
            <button
              type="submit"
              aria-label="送信"
              disabled={!input.trim() || isStreaming}
              className={cn(
                "shrink-0 inline-flex items-center justify-center w-9 h-9 m-1.5 rounded-xl transition-colors",
                input.trim() && !isStreaming
                  ? "bg-slate-900 text-white hover:bg-slate-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400 text-center">
            Enter で送信 / Shift + Enter で改行
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── メッセージ行 ─────────────────────────────────────────

function MessageRow({ role, content }: { role: Role; content: string }) {
  if (role === "assistant") {
    // 空 content = streaming 開始直後（最初の delta 待ち）→ dots アニメ
    const isWaiting = content.length === 0;
    return (
      <div className="flex gap-3">
        <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 border border-amber-200 mt-0.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-500 mb-1.5 tracking-wide">
            紹介コーチ
          </p>
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] inline-block">
            {isWaiting ? (
              <span className="flex gap-1 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
              </span>
            ) : (
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // user
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-slate-900 text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}


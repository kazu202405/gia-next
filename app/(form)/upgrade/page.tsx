"use client";

// Tier 3（有料会員）入会フォーム。
// 以前は /join に置かれていたが、/join を仮登録（Tier 1 / セミナー申込）に振り替えたため
// このルートに退避した。Phase 2 で Stripe 連携時に再構成する想定。
//
// 2026-04-27 仕様/デザイン更新:
// - Bootstrap 風 UI（indigo-500 ring / 灰色 mt-1 input）を全廃
// - GIA A系統（Navy + Warm Gold + ivory + Serif）に統一
// - 紹介者欄を /join と同じ autocomplete に揃える（lib/all-users.ts 流用）
// - 「氏名 / メアド / パスワード / パスワード確認 / 紹介者必須」のフォーム構成は維持
// - 値の保持・state ロジックも維持（パスワード一致検証など）
//
// metadata は同階層の layout.tsx から export している（client component なため）。

import Link from "next/link";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  Lock,
  Mail,
  User,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import {
  allUsers,
  filterUserCandidates,
  type UserCandidate,
} from "@/lib/all-users";

interface FormState {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  referrerName: string;
  referrerId: string;
}

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  referrerName: "",
  referrerId: "",
};

export default function UpgradePage() {
  const [form, setForm] = useState<FormState>(initialState);

  // confirm に何か入っているときだけ不一致を表示（初期表示でいきなり赤くしない）
  const passwordMismatch =
    form.passwordConfirm.length > 0 &&
    form.password !== form.passwordConfirm;

  // 紹介者は必須
  const canProceed =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.passwordConfirm.length >= 8 &&
    !passwordMismatch &&
    form.referrerName.trim().length > 0;

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* ヘッダー */}
        <header className="text-center mb-12">
          <ChapterTag>MEMBERSHIP</ChapterTag>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            有料会員登録
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            GIAの酒場へようこそ。
            <br className="hidden sm:block" />
            ご登録の前に、紹介者のお名前をご確認ください。
          </p>
        </header>

        {/* カード本体 */}
        <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
          <form
            className="p-7 sm:p-10 space-y-7"
            onSubmit={(e) => e.preventDefault()}
            noValidate
          >
            {/* セクション 1: 基本情報 */}
            <SectionLabel>BASIC</SectionLabel>

            <Field
              id="name"
              label="氏名"
              required
              icon={<User className="w-4 h-4" />}
            >
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="山田 太郎"
                className={inputClass}
              />
            </Field>

            <Field
              id="email"
              label="メールアドレス"
              required
              icon={<Mail className="w-4 h-4" />}
            >
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="your@email.com"
                className={inputClass}
              />
            </Field>

            <Field
              id="password"
              label="パスワード"
              required
              icon={<Lock className="w-4 h-4" />}
              hint="8文字以上"
            >
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>

            <Field
              id="passwordConfirm"
              label="パスワード（確認）"
              required
              icon={<Lock className="w-4 h-4" />}
              error={
                passwordMismatch ? "パスワードが一致しません" : undefined
              }
            >
              <input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.passwordConfirm}
                onChange={(e) =>
                  handleChange("passwordConfirm", e.target.value)
                }
                placeholder="••••••••"
                className={passwordMismatch ? inputClassError : inputClass}
              />
            </Field>

            {/* 仕切り */}
            <div className="border-t border-[var(--gia-deck-line)] pt-7">
              <SectionLabel>REFERRAL</SectionLabel>
            </div>

            <Field
              id="referrer"
              label="紹介者"
              required
              icon={<UserPlus className="w-4 h-4" />}
              hint="本コミュニティは紹介制です。該当する人がいない場合は、紹介者のお名前をご入力ください。"
            >
              <ReferrerAutocomplete
                value={form.referrerName}
                onChange={(name, id) => {
                  handleChange("referrerName", name);
                  handleChange("referrerId", id);
                }}
              />
            </Field>

            {/* 送信ボタン（Link で支払い画面へ。canProceed のときのみ active） */}
            <div className="mt-10 pt-7 border-t border-[var(--gia-deck-line)]">
              {canProceed ? (
                <Link
                  href="/upgrade/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200"
                >
                  支払い情報入力へ進む
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm opacity-40 cursor-not-allowed"
                >
                  支払い情報入力へ進む
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* フッターリンク */}
        <div className="mt-10 flex flex-col items-center gap-2 text-xs text-[var(--gia-deck-sub)]">
          <p>
            <Link
              href="/members"
              className="text-[var(--gia-deck-navy)] hover:text-[var(--gia-deck-gold)] underline underline-offset-4 decoration-[var(--gia-deck-line)] hover:decoration-[var(--gia-deck-gold)] transition-colors"
            >
              プラン詳細に戻る
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 紹介者 autocomplete（/join と同実装） ────────────────────────────

interface ReferrerAutocompleteProps {
  value: string;
  /** name 確定 + id（候補選択時のみ。自由入力なら空文字） */
  onChange: (name: string, id: string) => void;
}

function ReferrerAutocomplete({ value, onChange }: ReferrerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const candidates = useMemo(
    () => filterUserCandidates(value, allUsers),
    [value]
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleSelect = (cand: UserCandidate) => {
    onChange(cand.name, cand.id);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id="referrer"
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls="upgrade-referrer-listbox"
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value, "");
          if (!open) setOpen(true);
        }}
        placeholder="紹介者の名前を入力"
        className={inputClass}
      />

      {open && (
        <div
          id="upgrade-referrer-listbox"
          role="listbox"
          className="absolute z-20 left-0 right-0 mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-[var(--gia-deck-line)] bg-white shadow-lg"
        >
          {candidates.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-[var(--gia-deck-sub)]">
              該当する人が見つかりません。入力したお名前で記録します。
            </div>
          ) : (
            candidates.map((cand) => (
              <button
                key={cand.id}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => handleSelect(cand)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-[var(--gia-deck-paper)] focus:bg-[var(--gia-deck-paper)] focus:outline-none border-b border-[var(--gia-deck-line)]/60 last:border-b-0 flex items-center gap-2 transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-sm text-[var(--gia-deck-ink)] truncate">
                    {cand.name}
                  </span>
                  {(cand.nameFurigana || cand.affiliation) && (
                    <span className="block text-[11px] text-[var(--gia-deck-sub)] truncate">
                      {[cand.nameFurigana, cand.affiliation]
                        .filter(Boolean)
                        .join(" ・ ")}
                    </span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── 内部コンポーネント / スタイル定数 ───────────────────────────────

function ChapterTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center justify-center gap-3 text-[11px] font-medium text-[var(--gia-deck-navy)] tracking-[0.4em]">
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
      <span>{children}</span>
      <span
        aria-hidden
        className="inline-block w-6 h-px bg-[var(--gia-deck-gold)]"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em] mb-1">
      {children}
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-[var(--gia-deck-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--gia-deck-ink)] placeholder:text-zinc-400 transition-colors focus:outline-none focus:border-[var(--gia-deck-navy)] focus:ring-1 focus:ring-[var(--gia-deck-gold)]/20";

const inputClassError =
  "block w-full rounded-lg border border-rose-300 bg-white px-3.5 py-2.5 text-sm text-[var(--gia-deck-ink)] placeholder:text-zinc-400 transition-colors focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200";

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, required, icon, hint, error, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-medium text-[var(--gia-deck-ink)] mb-2"
      >
        {icon && (
          <span className="text-[var(--gia-deck-sub)]">{icon}</span>
        )}
        <span>{label}</span>
        {required && (
          <span className="text-[10px] font-medium text-[var(--gia-deck-gold)] bg-[var(--gia-deck-gold)]/10 px-1.5 py-0.5 rounded tracking-wider">
            必須
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-[11px] text-rose-600 mt-1.5">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--gia-deck-sub)] mt-1.5 leading-relaxed">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

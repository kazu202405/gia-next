"use client";

// 仮登録（Tier 1）/ GIA 紹介獲得セミナー参加申込フォーム。
// network_app の3-tier モデル（仮登録 / 本登録 / 有料会員）の入口。
// このページは Phase 1（mock first）。実認証・メール送信・DB 保存はまだ実装しない。
// Phase 2 で Supabase Auth に差し替える前提のため、入力スキーマだけ整えておく。
//
// 2026-04-27 仕様変更:
// - タブUI（基本/任意）を廃止し、1ページの単一フォームに変更
// - 「LINEアカウント名」「参加きっかけ」フィールドを廃止
// - 「パスワード確認」フィールドを追加（一致チェック）
// - 「紹介者（任意）」を combobox/autocomplete で追加
// - 「参加するセミナー回」を必須セクションに移動
//
// 2026-04-27 デザイン方針:
// - GIA A系統（フォーマル・エディトリアル / セミナー資料と地続きのトーン）に統一
// - Teal を完全排除し、Navy + Warm Gold + ivory + Serif で構成
// - 視覚リファレンスは contexts/projects/gia/decks/seminar_referral_slides.html

import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Mail,
  User,
  Lock,
  Calendar,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { upcomingSeminars, formatSeminarDate } from "@/lib/seminars";
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
  /** 紹介者の表示名（自由入力 or autocomplete で確定された値） */
  referrerName: string;
  /** autocomplete で候補を選択したときに保存される ID。自由入力なら空 */
  referrerId: string;
  seminarId: string;
  /** 招待コード（?invite=... から渡された値。フォーム送信時に保持するだけで mock では未使用） */
  inviteCode: string;
}

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  referrerName: "",
  referrerId: "",
  seminarId: upcomingSeminars[0]?.id ?? "",
  inviteCode: "",
};

/**
 * `useSearchParams()` を使うコンポーネントは Suspense 境界内に置く必要がある
 * （Next.js App Router の制約）。Page export はラッパーに留め、フォーム本体を切り出す。
 */
export default function JoinPage() {
  return (
    <Suspense fallback={<JoinPageFallback />}>
      <JoinPageInner />
    </Suspense>
  );
}

function JoinPageFallback() {
  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--gia-deck-sub)]" />
      </div>
    </div>
  );
}

function JoinPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite");

  // 招待コードが既知のセミナー id と一致した場合のみマッチング扱い
  const invitedSeminar = useMemo(() => {
    if (!inviteCode) return null;
    return upcomingSeminars.find((s) => s.id === inviteCode) ?? null;
  }, [inviteCode]);

  // 初期 state 計算：招待があれば seminarId を差し替え、inviteCode をフォームに保持
  const [form, setForm] = useState<FormState>(() => ({
    ...initialState,
    seminarId: invitedSeminar?.id ?? initialState.seminarId,
    inviteCode: inviteCode ?? "",
  }));
  const [submitting, setSubmitting] = useState(false);

  // パスワード一致チェック（confirm に何か入っているときだけ表示）
  const passwordMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  // 必須項目が埋まっているか
  const canSubmit =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    form.passwordConfirm.length >= 8 &&
    !passwordMismatch &&
    form.seminarId.length > 0 &&
    !submitting;

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    // mock: 実 API 呼び出しの代わりに疑似遅延 → 完了画面へ遷移
    setTimeout(() => {
      router.push("/join/complete");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* ヘッダー（A系統 chapter-tag 風 + serif h1） */}
        <header className="text-center mb-12">
          <ChapterTag>APPLICATION</ChapterTag>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            セミナー参加申込
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            GIA 紹介獲得セミナーへのお申込はこちら。
            <br className="hidden sm:block" />
            登録後、当日アプリを触りながらご参加いただけます。
          </p>
        </header>

        {/* 招待バナー（A系統：gold 淡背景 + navy 文字） */}
        {invitedSeminar && (
          <div
            role="status"
            className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--gia-deck-gold)]/30 bg-[var(--gia-deck-gold)]/10 px-5 py-4"
          >
            <Sparkles className="w-4 h-4 text-[var(--gia-deck-gold)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[var(--gia-deck-gold)] tracking-[0.3em] uppercase">
                Invitation
              </p>
              <p className="text-sm text-[var(--gia-deck-ink)] mt-1.5 leading-relaxed">
                ご招待ありがとうございます。
                <span className="font-serif font-semibold text-[var(--gia-deck-navy)]">
                  「{invitedSeminar.title}」
                </span>
                へのお申込ページです。
              </p>
              <p className="text-[11px] text-[var(--gia-deck-sub)] mt-1">
                {formatSeminarDate(invitedSeminar.date)}　{invitedSeminar.time}
              </p>
            </div>
          </div>
        )}

        {/* カード本体 */}
        <div className="bg-white border border-[var(--gia-deck-line)] rounded-2xl shadow-[0_1px_2px_rgba(28,53,80,0.04)] overflow-hidden">
          <form
            onSubmit={handleSubmit}
            className="p-7 sm:p-10 space-y-7"
            noValidate
          >
            {/* 招待コード（フォームデータの完全性のため hidden で保持。mock では未使用） */}
            {form.inviteCode && (
              <input
                type="hidden"
                name="inviteCode"
                value={form.inviteCode}
                readOnly
              />
            )}

            {/* セクション 1: 基本情報 */}
            <SectionLabel>BASIC</SectionLabel>

            <Field
              id="name"
              label="お名前"
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
              <SectionLabel>SEMINAR</SectionLabel>
            </div>

            <Field
              id="seminarId"
              label="参加するセミナー回"
              required
              icon={<Calendar className="w-4 h-4" />}
              hint="日程は仮で表示されています。後日変更可能です。"
            >
              <select
                id="seminarId"
                value={form.seminarId}
                onChange={(e) => handleChange("seminarId", e.target.value)}
                className={selectClass}
                required
              >
                {upcomingSeminars.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} / {formatSeminarDate(s.date)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              id="referrer"
              label="紹介者"
              icon={<UserPlus className="w-4 h-4" />}
              hint="該当する人がいない場合は、入力したお名前で記録します。"
            >
              <ReferrerAutocomplete
                value={form.referrerName}
                onChange={(name, id) => {
                  handleChange("referrerName", name);
                  handleChange("referrerId", id);
                }}
              />
            </Field>

            {/* 送信ボタン */}
            <div className="mt-10 pt-7 border-t border-[var(--gia-deck-line)]">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--gia-deck-navy)] text-white text-sm font-semibold tracking-[0.08em] py-4 px-6 shadow-sm hover:bg-[var(--gia-deck-navy-deep)] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>申込を送信する</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* フッターリンク */}
        <div className="mt-10 flex flex-col items-center gap-2 text-xs text-[var(--gia-deck-sub)]">
          <p>
            すでにアカウントをお持ちの方 →{" "}
            <Link
              href="/login"
              className="text-[var(--gia-deck-navy)] hover:text-[var(--gia-deck-gold)] underline underline-offset-4 decoration-[var(--gia-deck-line)] hover:decoration-[var(--gia-deck-gold)] transition-colors"
            >
              ログイン
            </Link>
          </p>
          <p>
            有料会員にアップグレード →{" "}
            <Link
              href="/upgrade"
              className="text-[var(--gia-deck-navy)] hover:text-[var(--gia-deck-gold)] underline underline-offset-4 decoration-[var(--gia-deck-line)] hover:decoration-[var(--gia-deck-gold)] transition-colors"
            >
              /upgrade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 紹介者 autocomplete ────────────────────────────────────────────
//
// 仕様:
// - フォーカスでドロップダウン展開
// - 入力でリアルタイムフィルター（クライアントのみ、debounce 不要）
// - 候補クリックで input 確定 + 隠し ID 保存
// - 該当なしでも自由入力で submit 可（任意フィールド）
// - 矢印キー操作・aria-activedescendant 等の高度な a11y は最小限に留める

interface ReferrerAutocompleteProps {
  value: string;
  /** name 確定 + id（候補選択時のみ。自由入力なら空文字） */
  onChange: (name: string, id: string) => void;
}

function ReferrerAutocomplete({ value, onChange }: ReferrerAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // フィルター結果。空入力時は全件、入力ありで部分一致
  const candidates = useMemo(
    () => filterUserCandidates(value, allUsers),
    [value]
  );

  // 外側クリックで閉じる
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
        aria-controls="referrer-listbox"
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          // 自由入力モード：候補との連携は切る（id 空に戻す）
          onChange(e.target.value, "");
          if (!open) setOpen(true);
        }}
        placeholder="紹介者の名前を入力（任意）"
        className={inputClass}
      />

      {open && (
        <div
          id="referrer-listbox"
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

/**
 * deck の chapter-tag を踏襲した小さな英字ラベル。
 * gold の短い罫線 + tracking-wide で「資料の格式感」を出す。
 */
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

/**
 * セクション内のミニ見出し（card.n の n を踏襲）。
 * letter-spacing を強めにとり gold で控えめに。
 */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-serif text-[11px] font-bold text-[var(--gia-deck-gold)] tracking-[0.3em] mb-1">
      {children}
    </div>
  );
}

// A系統の控えめなインプットスタイル。
// ・薄い罫線 / focus 時は navy + 半透明 gold ring
// ・shadow は限りなく薄く、紙質感を残す
const inputClass =
  "block w-full rounded-lg border border-[var(--gia-deck-line)] bg-white px-3.5 py-2.5 text-sm text-[var(--gia-deck-ink)] placeholder:text-zinc-400 transition-colors focus:outline-none focus:border-[var(--gia-deck-navy)] focus:ring-1 focus:ring-[var(--gia-deck-gold)]/20";

// エラー時のインプットスタイル（rose 系の控えめな枠）
const inputClassError =
  "block w-full rounded-lg border border-rose-300 bg-white px-3.5 py-2.5 text-sm text-[var(--gia-deck-ink)] placeholder:text-zinc-400 transition-colors focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200";

const selectClass =
  inputClass +
  " appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='none' stroke='%23555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M3 5l3 3 3-3'/></svg>\")] bg-no-repeat bg-[length:12px_12px] bg-[right_14px_center] pr-10";

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

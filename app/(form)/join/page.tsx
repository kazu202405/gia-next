"use client";

// 仮登録（Tier 1）/ GIA 紹介獲得セミナー参加申込フォーム。
// network_app の3-tier モデル（仮登録 / 本登録 / 有料会員）の入口。
//
// Run 2（2026-04-27）: Supabase 接続化
// - submit ロジックを実 API に切替（auth.signUp → applicants UPDATE → event_attendees INSERT）
// - セミナー一覧を seminars テーブルから取得（is_active=true 限定）
// - 招待コード ?invite=<slug> を seminars.slug で実DB lookup
// - 紹介者欄は廃止（仮登録は最小フィールド主義。紹介者は本登録 /upgrade で取得する）
// - 完了画面遷移時に slug をクエリで渡す（/join/complete?seminar=<slug>）
//
// 既存 A 系統デザイン（Navy + Warm Gold + ivory + Serif）は完全維持。

import { Suspense, useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Mail,
  User,
  Lock,
  Calendar,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── 型定義 ─────────────────────────────────────────────────────────

interface FormState {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  seminarId: string;
  /** 招待コード（?invite=... から渡された値。event_attendees.invite_code に保存） */
  inviteCode: string;
}

/** seminars テーブルから取得するセミナー情報の最小 shape */
interface SeminarLite {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  location: string | null;
}

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  passwordConfirm: "",
  seminarId: "",
  inviteCode: "",
};

// ─── ユーティリティ：日付フォーマット ───────────────────────────────
// lib/seminars.ts の formatSeminarDate を参考に自前で持つ
// （/join は Supabase 化済みのため lib/seminars.ts への依存を切る方針）
function formatSeminarDate(date: string): string {
  const d = new Date(date);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const wd = weekdays[d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 (${wd})`;
}

/** 開始時刻 "HH:MM:SS" を "HH:MM" 表示用に整形 */
function formatTime(time: string | null): string {
  if (!time) return "";
  return time.slice(0, 5);
}

// ─── ページ本体 ─────────────────────────────────────────────────────

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
  const isSalonMode = searchParams.get("intent") === "salon";

  // Supabase クライアントは初回マウント時に1回だけ作る
  const supabase = useMemo(() => createClient(), []);

  // ─── 副作用 0：salon モードかつログイン済みなら /upgrade に直行 ─────
  //   サロン LP からの動線。既に仮登録済みのユーザーがフォームを再入力しないよう、
  //   ログインセッションがあれば即 /upgrade（paid なら mypage に二段リダイレクト）。
  useEffect(() => {
    if (!isSalonMode) return;
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (user) {
        router.push("/upgrade");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSalonMode, router, supabase]);

  // セミナー一覧（is_active=true）と招待セミナー
  const [seminars, setSeminars] = useState<SeminarLite[]>([]);
  const [seminarsLoading, setSeminarsLoading] = useState(true);
  const [invitedSeminar, setInvitedSeminar] = useState<SeminarLite | null>(
    null
  );
  /**
   * 招待コードが invitations テーブルに存在し「現在使えない」状態だった時の理由。
   * 'revoked' / 'expired' / 'max_uses_reached' のいずれか。null=異常なし。
   * 'not_found' は警告対象外（seminars.slug fallback 経路があるため）。
   */
  const [inviteInvalidReason, setInviteInvalidReason] = useState<
    null | "revoked" | "expired" | "max_uses_reached"
  >(null);
  /**
   * メンバー紹介リンク（invitations.seminar_id IS NULL）で来た場合の紹介者名。
   * 「○○さんからのご紹介」バナー表示用。null=メンバー紹介経由でない。
   */
  const [referrerName, setReferrerName] = useState<string | null>(null);

  // フォーム state
  const [form, setForm] = useState<FormState>(() => ({
    ...initialState,
    inviteCode: inviteCode ?? "",
  }));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** email 重複時のみ true。message にログイン誘導 link を出すため別 flag で持つ */
  const [emailAlreadyRegistered, setEmailAlreadyRegistered] = useState(false);

  // ─── 副作用 1：セミナー一覧を取得 ───────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("seminars")
        .select("id, slug, title, date, start_time, location")
        .eq("is_active", true)
        .order("date", { ascending: true });
      if (cancelled) return;
      if (error) {
        // 一覧取得失敗。submit エラー枠とは独立に表示しない（select が空のままになるだけ）
        // 開発時のみ console に出す
        console.error("[/join] seminars fetch failed:", error);
        setSeminarsLoading(false);
        return;
      }
      const list = (data ?? []) as SeminarLite[];
      setSeminars(list);
      setSeminarsLoading(false);
      // 初期 seminarId：招待マッチが解決済みならそれを優先、未解決なら先頭を仮置き
      // salon モードは「セミナーに参加しない」(空) を初期値にする
      setForm((prev) => {
        if (prev.seminarId) return prev; // 既に invite で確定済み
        if (isSalonMode) return prev;
        return { ...prev, seminarId: list[0]?.id ?? "" };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, isSalonMode]);

  // ─── 副作用 2：招待コード解決 ─────────────────────────────────
  //   優先順:
  //     (1) invitations テーブルに code として登録されているか？
  //         → validate_invite_code RPC で「今使えるか」も判定
  //         → 紐付くセミナーがあればそれを invited seminar として表示
  //         → 失効・取消・上限到達なら invalid バナー表示
  //     (2) (1) で hit しなければ、seminars.slug にマッチするかを確認（legacy 流入）
  //         → マッチすればそのセミナーを invited として表示
  //   どちらも該当しない場合は何もしない（招待バナー非表示・コードは form 保持）。
  useEffect(() => {
    if (!inviteCode) return;
    let cancelled = false;
    (async () => {
      // (1) invitations を RPC で検証
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        "validate_invite_code",
        { p_code: inviteCode }
      );
      if (cancelled) return;

      type ValidateRow = {
        invitation_id: string | null;
        seminar_id: string | null;
        referrer_name: string | null;
        is_valid: boolean;
        reason: string;
      };
      const row = Array.isArray(rpcData)
        ? ((rpcData[0] ?? null) as ValidateRow | null)
        : null;

      if (rpcErr) {
        // RPC が無い / Postgres エラー → fallback 経路へ
        console.error("[/join] validate_invite_code failed:", rpcErr);
      } else if (row && row.reason !== "not_found") {
        // invitations に登録あり
        if (!row.is_valid) {
          // 取消 / 失効 / 上限到達 のいずれか
          if (
            row.reason === "revoked" ||
            row.reason === "expired" ||
            row.reason === "max_uses_reached"
          ) {
            setInviteInvalidReason(row.reason);
          }
          // 使えないので invited seminar はセットしない（バナーは invalid 側で出す）
          return;
        }
        // 使える招待だった
        if (row.seminar_id) {
          // admin が出したセミナー招待。紐付くセミナーを fetch
          const { data: semData, error: semErr } = await supabase
            .from("seminars")
            .select("id, slug, title, date, start_time, location")
            .eq("id", row.seminar_id)
            .eq("is_active", true)
            .single();
          if (!cancelled && !semErr && semData) {
            setInvitedSeminar(semData as SeminarLite);
            setForm((prev) => ({
              ...prev,
              seminarId: (semData as SeminarLite).id,
            }));
          }
        } else if (row.referrer_name) {
          // メンバー紹介リンク（seminar_id NULL）→ 紹介者名バナーを出す
          setReferrerName(row.referrer_name);
        }
        // 紐付くセミナーが無い汎用招待でも inviteCode は form に残っているので
        // event_attendees.invite_code に保存される
        return;
      }

      // (2) invitations に無し → seminars.slug にマッチするか legacy fallback
      const { data, error } = await supabase
        .from("seminars")
        .select("id, slug, title, date, start_time, location")
        .eq("slug", inviteCode)
        .eq("is_active", true)
        .single();
      if (cancelled) return;
      if (error || !data) {
        // どちらにも該当しない → 招待バナー非表示のままにする
        return;
      }
      setInvitedSeminar(data as SeminarLite);
      setForm((prev) => ({ ...prev, seminarId: (data as SeminarLite).id }));
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteCode, supabase]);

  // パスワード一致チェック（confirm に何か入っているときだけ表示）
  const passwordMismatch =
    form.passwordConfirm.length > 0 && form.password !== form.passwordConfirm;

  // touched: blur されたフィールドのみ赤いエラー表示（入力途中で赤くしない）
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
  });
  const markTouched = (key: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  // 各フィールドのバリデーションエラー
  const emailFormatValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const fieldErrors = {
    name:
      touched.name && form.name.trim().length === 0
        ? "お名前を入力してください"
        : undefined,
    email:
      touched.email && form.email.trim().length === 0
        ? "メールアドレスを入力してください"
        : touched.email && !emailFormatValid
        ? "メールアドレスの形式が正しくありません"
        : undefined,
    password:
      touched.password && form.password.length === 0
        ? "パスワードを入力してください"
        : touched.password && form.password.length < 8
        ? "8文字以上で入力してください"
        : undefined,
  };

  // 必須項目が埋まっているか（salon モードはセミナー任意）
  const canSubmit =
    form.name.trim().length > 0 &&
    form.email.trim().length > 0 &&
    emailFormatValid &&
    form.password.length >= 8 &&
    form.passwordConfirm.length >= 8 &&
    !passwordMismatch &&
    (isSalonMode || form.seminarId.length > 0) &&
    !submitting;

  const handleChange = <K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ─── 送信処理 ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    setEmailAlreadyRegistered(false);

    try {
      // 1. signUp（trigger で applicants 行が自動作成される。name は raw_user_meta_data 経由で保存）
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: { data: { name: form.name.trim() } },
        });

      if (signUpError) {
        const msg = signUpError.message ?? "";
        // Supabase は重複時に "User already registered" を返す
        if (
          msg.toLowerCase().includes("already registered") ||
          msg.toLowerCase().includes("user already")
        ) {
          setEmailAlreadyRegistered(true);
          setSubmitError(
            "このメールアドレスは既に登録されています。"
          );
        } else {
          setSubmitError(`登録に失敗しました：${msg}`);
        }
        setSubmitting(false);
        return;
      }

      const newUser = signUpData?.user;
      if (!newUser) {
        // 通常ここには来ないが念のため
        setSubmitError(
          "登録に失敗しました：ユーザー情報が取得できませんでした。"
        );
        setSubmitting(false);
        return;
      }

      // 2. event_attendees に参加表明 INSERT（セミナーを選択した場合のみ）
      //    （applicants 行は trigger 側で auth.signUp 時に name / email まで埋まる。
      //      紹介者は本登録 /upgrade のフォームで後から取得するため、ここでは触らない）
      if (form.seminarId) {
        const { error: attendeeError } = await supabase
          .from("event_attendees")
          .insert({
            user_id: newUser.id,
            seminar_id: form.seminarId,
            invite_code: form.inviteCode || null,
            status: "pending",
          });

        if (attendeeError) {
          // 参加表明の登録失敗は致命的（申込が成立しない）→ 中止して赤バナー
          setSubmitError(
            `参加申込の登録に失敗しました：${attendeeError.message}`
          );
          setSubmitting(false);
          return;
        }
      }

      // 3. 遷移：salon モードは決済へ直行、それ以外はセミナー完了画面へ
      if (isSalonMode) {
        router.push("/upgrade");
        return;
      }
      const selected =
        invitedSeminar?.id === form.seminarId
          ? invitedSeminar
          : seminars.find((s) => s.id === form.seminarId) ?? null;
      const slug = selected?.slug ?? "";
      router.push(
        slug
          ? `/join/complete?seminar=${encodeURIComponent(slug)}`
          : "/join/complete"
      );
    } catch (err) {
      // 予期せぬネットワーク／ランタイム例外
      const message = err instanceof Error ? err.message : String(err);
      setSubmitError(`通信エラーが発生しました：${message}`);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gia-deck-paper)] pt-24 pb-20">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* ヘッダー（A系統 chapter-tag 風 + serif h1） */}
        <header className="text-center mb-12">
          <ChapterTag>{isSalonMode ? "MEMBERSHIP" : "APPLICATION"}</ChapterTag>
          <h1 className="font-serif text-[28px] sm:text-[34px] font-bold text-[var(--gia-deck-navy)] tracking-[0.05em] leading-[1.4] mt-5">
            {isSalonMode ? "サロン入会申込" : "セミナー参加申込"}
          </h1>
          <p className="text-sm text-[var(--gia-deck-sub)] mt-4 leading-[1.9]">
            {isSalonMode ? (
              <>
                GIAの酒場へお申込はこちら。
                <br className="hidden sm:block" />
                紹介で動く、人脈の場です。
              </>
            ) : (
              <>
                GIA 紹介獲得セミナーへのお申込はこちら。
                <br className="hidden sm:block" />
                登録後、当日アプリを触りながらご参加いただけます。
              </>
            )}
          </p>
        </header>

        {/* 無効な招待コードの警告バナー（取消・失効・上限到達） */}
        {inviteInvalidReason && (
          <div
            role="alert"
            className="mb-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-red-700 tracking-[0.3em] uppercase">
                Invitation
              </p>
              <p className="text-sm text-red-800 mt-1.5 leading-relaxed">
                {inviteInvalidReason === "revoked"
                  ? "この招待リンクは取消されています。"
                  : inviteInvalidReason === "expired"
                    ? "この招待リンクは有効期限が切れています。"
                    : "この招待リンクの使用上限に達しています。"}
                <br />
                主催者にお問合せいただくか、下記のセミナー一覧から直接お申込ください。
              </p>
            </div>
          </div>
        )}

        {/* 紹介者バナー（メンバー紹介リンク経由） */}
        {referrerName && !invitedSeminar && (
          <div
            role="status"
            className="mb-8 flex items-start gap-3 rounded-xl border border-[var(--gia-deck-gold)]/30 bg-[var(--gia-deck-gold)]/10 px-5 py-4"
          >
            <Sparkles className="w-4 h-4 text-[var(--gia-deck-gold)] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-[var(--gia-deck-gold)] tracking-[0.3em] uppercase">
                Referral
              </p>
              <p className="text-sm text-[var(--gia-deck-ink)] mt-1.5 leading-relaxed">
                <span className="font-serif font-semibold text-[var(--gia-deck-navy)]">
                  {referrerName}
                </span>
                さんからのご紹介です。
              </p>
              <p className="text-[11px] text-[var(--gia-deck-sub)] mt-1">
                登録すると{referrerName}さんからの紹介として記録されます。
              </p>
            </div>
          </div>
        )}

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
                {formatSeminarDate(invitedSeminar.date)}
                {invitedSeminar.start_time
                  ? `　${formatTime(invitedSeminar.start_time)}`
                  : ""}
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
            {/* 招待コード（フォームデータの完全性のため hidden で保持） */}
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
              error={fieldErrors.name}
            >
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => markTouched("name")}
                placeholder="山田 太郎"
                className={fieldErrors.name ? inputClassError : inputClass}
              />
            </Field>

            <Field
              id="email"
              label="メールアドレス"
              required
              icon={<Mail className="w-4 h-4" />}
              error={fieldErrors.email}
            >
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => markTouched("email")}
                placeholder="your@email.com"
                className={fieldErrors.email ? inputClassError : inputClass}
              />
            </Field>

            <Field
              id="password"
              label="パスワード"
              required
              icon={<Lock className="w-4 h-4" />}
              hint="8文字以上"
              error={fieldErrors.password}
            >
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => markTouched("password")}
                placeholder="••••••••"
                className={fieldErrors.password ? inputClassError : inputClass}
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
              <SectionLabel>{isSalonMode ? "SEMINAR (OPTIONAL)" : "SEMINAR"}</SectionLabel>
            </div>

            <Field
              id="seminarId"
              label="参加するセミナー回"
              required={!isSalonMode}
              icon={<Calendar className="w-4 h-4" />}
              hint={
                isSalonMode
                  ? "サロン入会のみであれば選択不要。セミナーにも参加する場合のみ選択してください。"
                  : seminarsLoading
                  ? "セミナー情報を読み込み中..."
                  : seminars.length === 0
                  ? "現在募集中のセミナーがありません。"
                  : "募集中のセミナーから選択してください。"
              }
            >
              <select
                id="seminarId"
                value={form.seminarId}
                onChange={(e) => handleChange("seminarId", e.target.value)}
                className={selectClass}
                required={!isSalonMode}
                disabled={seminarsLoading || (!isSalonMode && seminars.length === 0)}
              >
                {isSalonMode && (
                  <option value="">セミナーに参加しない</option>
                )}
                {!isSalonMode && seminars.length === 0 && (
                  <option value="">
                    {seminarsLoading ? "読み込み中..." : "募集中の回なし"}
                  </option>
                )}
                {seminars.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} / {formatSeminarDate(s.date)}
                  </option>
                ))}
              </select>
            </Field>

            {/* エラーバナー（signUp / event_attendees エラー時のみ） */}
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-rose-700 leading-relaxed">
                  {submitError}
                  {emailAlreadyRegistered && (
                    <>
                      {" "}
                      <Link
                        href="/login"
                        className="underline underline-offset-2 font-medium hover:text-rose-900"
                      >
                        ログイン
                      </Link>
                      からお進みください。
                    </>
                  )}
                </div>
              </div>
            )}

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
  " appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path fill='none' stroke='%23555' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M3 5l3 3 3-3'/></svg>\")] bg-no-repeat bg-[length:12px_12px] bg-[right_14px_center] pr-10 disabled:bg-zinc-50 disabled:cursor-not-allowed";

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

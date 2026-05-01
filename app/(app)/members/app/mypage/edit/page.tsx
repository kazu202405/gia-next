"use client";

// マイページ プロフィール編集画面（Phase 1.5）。
// applicants の全プロフィールフィールドを1画面で編集可能。
//
// 認証：未ログインなら /login へリダイレクト。
// 保存：supabase.from('applicants').update(...) を直接呼ぶ。RLS で自分のレコードしか更新できない。

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Briefcase,
  Sparkles,
  Users as UsersIcon,
  Heart,
  AtSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ProfileForm {
  // 基本
  name: string;
  name_furigana: string;
  nickname: string;
  // 仕事
  role_title: string;
  job_title: string;
  headline: string;
  services_summary: string;
  // ストーリー
  story_origin: string;
  story_turning_point: string;
  story_now: string;
  story_future: string;
  // つながり
  want_to_connect_with: string;
  // 人柄
  status_message: string;
  favorites: string;
  current_hobby: string;
  school_days_self: string;
  personal_values: string;
  // 連絡先
  contact_line: string;
  contact_instagram: string;
  contact_website: string;
}

const emptyForm: ProfileForm = {
  name: "",
  name_furigana: "",
  nickname: "",
  role_title: "",
  job_title: "",
  headline: "",
  services_summary: "",
  story_origin: "",
  story_turning_point: "",
  story_now: "",
  story_future: "",
  want_to_connect_with: "",
  status_message: "",
  favorites: "",
  current_hobby: "",
  school_days_self: "",
  personal_values: "",
  contact_line: "",
  contact_instagram: "",
  contact_website: "",
};

const PROFILE_SELECT =
  "name, name_furigana, nickname, email, " +
  "role_title, job_title, headline, services_summary, " +
  "story_origin, story_turning_point, story_now, story_future, " +
  "want_to_connect_with, " +
  "status_message, favorites, current_hobby, school_days_self, personal_values, " +
  "contact_line, contact_instagram, contact_website";

export default function MypageEditPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  // 初回ロード：自分の applicants データを取得
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data, error } = await supabase
        .from("applicants")
        .select(PROFILE_SELECT)
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (error) {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      // 型安全のために emptyForm のキーで dataから取り出す（追加列が増えても安全）
      // PROFILE_SELECT は動的文字列なので Supabase の型推論が効かない → unknown 経由でキャスト
      const row = data as unknown as Record<string, unknown>;
      const next: ProfileForm = { ...emptyForm };
      (Object.keys(emptyForm) as (keyof ProfileForm)[]).forEach((key) => {
        const v = row[key];
        if (typeof v === "string") next[key] = v;
      });
      setForm(next);
      setEmail((row.email as string | null) ?? user.email ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  const change = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (saveError) setSaveError(null);
  };

  const canSave = form.name.trim().length > 0 && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // 空文字を NULL に正規化（任意フィールドの「未入力」を保持するため）
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()])
    );

    const { error } = await supabase
      .from("applicants")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      setSaveError(`保存に失敗しました：${error.message}`);
      setSaving(false);
      return;
    }

    setSaving(false);
    setSavedToast(true);
    // トーストは2秒で消す
    setTimeout(() => setSavedToast(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>プロフィールの取得に失敗しました：{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* スティッキーヘッダー */}
      <div className="sticky top-14 lg:top-0 z-20 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/members/app/mypage"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="マイページに戻る"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
              プロフィール編集
            </h1>
          </div>
          <button
            type="submit"
            form="profile-form"
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </button>
        </div>
      </div>

      <form
        id="profile-form"
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
      >
        {/* 保存エラー */}
        {saveError && (
          <div
            role="alert"
            className="flex items-start gap-2 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm"
          >
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* 保存成功トースト */}
        {savedToast && (
          <div
            role="status"
            className="flex items-start gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm"
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>プロフィールを保存しました。</span>
          </div>
        )}

        {/* メアド (read-only) */}
        <Section icon={<User className="w-4 h-4" />} title="アカウント">
          <Field label="メールアドレス" hint="変更できません">
            <input
              type="text"
              value={email}
              readOnly
              className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
            />
          </Field>
        </Section>

        {/* 基本情報 */}
        <Section icon={<User className="w-4 h-4" />} title="基本情報">
          <Field label="お名前" required>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => change("name", e.target.value)}
              placeholder="山田 太郎"
              className={inputClass}
            />
          </Field>
          <Field label="お名前のふりがな">
            <input
              type="text"
              value={form.name_furigana}
              onChange={(e) => change("name_furigana", e.target.value)}
              placeholder="やまだ たろう"
              className={inputClass}
            />
          </Field>
          <Field label="ニックネーム" hint="呼ばれ方。表示名として使われます。">
            <input
              type="text"
              value={form.nickname}
              onChange={(e) => change("nickname", e.target.value)}
              placeholder="たろちゃん"
              className={inputClass}
            />
          </Field>
          <Field label="ステータスメッセージ" hint="LINEのプロフ一言と同じ感覚で。気軽に書き換えてOK。">
            <input
              type="text"
              value={form.status_message}
              onChange={(e) => change("status_message", e.target.value)}
              placeholder="今月は人材育成に集中中"
              maxLength={60}
              className={inputClass}
            />
          </Field>
        </Section>

        {/* 仕事 */}
        <Section icon={<Briefcase className="w-4 h-4" />} title="仕事">
          <Field label="役職" hint="例：代表取締役 / マネージャー">
            <input
              type="text"
              value={form.role_title}
              onChange={(e) => change("role_title", e.target.value)}
              placeholder="代表取締役"
              className={inputClass}
            />
          </Field>
          <Field label="職種・専門">
            <input
              type="text"
              value={form.job_title}
              onChange={(e) => change("job_title", e.target.value)}
              placeholder="経営コンサルタント"
              className={inputClass}
            />
          </Field>
          <Field label="一言で「何をしている人」？" hint="紹介されるときの一言を意識して">
            <input
              type="text"
              value={form.headline}
              onChange={(e) => change("headline", e.target.value)}
              placeholder="人の可能性を信じ、組織を変える"
              className={inputClass}
            />
          </Field>
          <Field label="サービス内容" hint="提供しているサービスを簡潔に">
            <textarea
              value={form.services_summary}
              onChange={(e) => change("services_summary", e.target.value)}
              rows={3}
              placeholder="例：中小企業向けの組織開発コンサルティング、研修設計、AIツール導入支援"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </Section>

        {/* ストーリー */}
        <Section
          icon={<Sparkles className="w-4 h-4" />}
          title="ストーリー"
          description="あなたを知ってもらうための4つの問い。紹介されやすさにつながります。"
        >
          <Field label="この仕事を始めたきっかけは？">
            <textarea
              value={form.story_origin}
              onChange={(e) => change("story_origin", e.target.value)}
              rows={3}
              placeholder="何があって、いまの道に進んだか"
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field label="転機になった出来事は？">
            <textarea
              value={form.story_turning_point}
              onChange={(e) => change("story_turning_point", e.target.value)}
              rows={3}
              placeholder="あなたの考え方が変わった瞬間"
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field label="今どんな想いで活動していますか？">
            <textarea
              value={form.story_now}
              onChange={(e) => change("story_now", e.target.value)}
              rows={3}
              placeholder="いま大切にしていること"
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field label="これからやりたいことは？">
            <textarea
              value={form.story_future}
              onChange={(e) => change("story_future", e.target.value)}
              rows={3}
              placeholder="これから挑戦したいこと"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </Section>

        {/* つながり */}
        <Section
          icon={<UsersIcon className="w-4 h-4" />}
          title="つながり"
          description="紹介してほしい相手像。具体的だと届きやすくなります。"
        >
          <Field label="どんな人とつながりたいですか？">
            <textarea
              value={form.want_to_connect_with}
              onChange={(e) => change("want_to_connect_with", e.target.value)}
              rows={4}
              placeholder="例：地方で人材育成に取り組む経営者の方、組織開発に悩んでる方"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </Section>

        {/* 人柄（任意） */}
        <Section
          icon={<Heart className="w-4 h-4" />}
          title="人柄（任意）"
          description="あなたの人となりが伝わる質問。書けるところだけでOK。"
        >
          <Field label="好きなものは？">
            <input
              type="text"
              value={form.favorites}
              onChange={(e) => change("favorites", e.target.value)}
              placeholder="例：コーヒー、サウナ、村上春樹"
              className={inputClass}
            />
          </Field>
          <Field label="最近ハマっていることは？">
            <input
              type="text"
              value={form.current_hobby}
              onChange={(e) => change("current_hobby", e.target.value)}
              placeholder="例：盆栽、Pickleball、生成AI触り倒し"
              className={inputClass}
            />
          </Field>
          <Field label="学生時代どんな子でしたか？">
            <textarea
              value={form.school_days_self}
              onChange={(e) => change("school_days_self", e.target.value)}
              rows={2}
              placeholder="例：体育会系で部活漬け、文化祭が一番盛り上がる派"
              className={`${inputClass} resize-y`}
            />
          </Field>
          <Field label="大切にしていることは？">
            <textarea
              value={form.personal_values}
              onChange={(e) => change("personal_values", e.target.value)}
              rows={2}
              placeholder="例：相手の立場で考える、約束を守る、誠実であること"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </Section>

        {/* 連絡先（任意） */}
        <Section
          icon={<AtSign className="w-4 h-4" />}
          title="連絡先（任意）"
          description="他のメンバーや主催者からの連絡導線。空欄でも構いません。"
        >
          <Field label="LINE" hint="LINE ID または LINE 表示名">
            <input
              type="text"
              value={form.contact_line}
              onChange={(e) => change("contact_line", e.target.value)}
              placeholder="@line_id"
              className={inputClass}
            />
          </Field>
          <Field label="Instagram" hint="ユーザー名（@ なしでも可）">
            <input
              type="text"
              value={form.contact_instagram}
              onChange={(e) => change("contact_instagram", e.target.value)}
              placeholder="@username"
              className={inputClass}
            />
          </Field>
          <Field label="Webサイト">
            <input
              type="url"
              value={form.contact_website}
              onChange={(e) => change("contact_website", e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
          </Field>
        </Section>

        {/* 下部 Save ボタン（モバイルでスクロール末尾でも保存できるように） */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── 内部コンポーネント ────────────────────────────────

const inputClass =
  "block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10";

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function Section({ icon, title, description, children }: SectionProps) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
      <header className="mb-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="text-amber-700">{icon}</span>
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed mt-2">
            {description}
          </p>
        )}
      </header>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-1.5">
        <span>{label}</span>
        {required && (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded tracking-wider">
            必須
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}

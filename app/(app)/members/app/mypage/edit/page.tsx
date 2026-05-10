"use client";

// マイページ プロフィール編集画面（Phase 2）。
// applicants の全プロフィールフィールドを1画面で編集可能。
//
// 認証：未ログインなら /login へリダイレクト。
// 保存：autosave（debounce 2秒）。手動保存ボタンは廃止。
// レイアウト：編集フォームの1カラム。
// ストーリー入力：各設問に「例で書く」ボタンを置き、テンプレで書き出しの抵抗を下げる。

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  User,
  Briefcase,
  Sparkles,
  Users as UsersIcon,
  Heart,
  AtSign,
  WandSparkles,
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

type TabKey = "profile" | "story" | "other";
type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

// タブごとの集計対象フィールド（進捗 N/Total 計算用）
const TAB_FIELDS: Record<TabKey, (keyof ProfileForm)[]> = {
  profile: [
    "name",
    "name_furigana",
    "nickname",
    "status_message",
    "role_title",
    "job_title",
    "headline",
    "services_summary",
  ],
  story: [
    "story_origin",
    "story_turning_point",
    "story_now",
    "story_future",
    "want_to_connect_with",
  ],
  other: [
    "favorites",
    "current_hobby",
    "school_days_self",
    "personal_values",
    "contact_line",
    "contact_instagram",
    "contact_website",
  ],
};

function calcProgress(form: ProfileForm, tabKey: TabKey) {
  const fields = TAB_FIELDS[tabKey];
  const filled = fields.filter((k) => form[k].trim().length > 0).length;
  return { filled, total: fields.length };
}

// ストーリー設問のテンプレ。〇〇 を残して「埋め方」を示すドラフト
const STORY_EXAMPLES: Record<
  "story_origin" | "story_turning_point" | "story_now" | "story_future",
  string
> = {
  story_origin:
    "前職で〇〇な状況に直面したとき、自分なら違うやり方ができると思った。〇〇な人を支えるなら自分が一番役に立てる、と確信したのがきっかけ。",
  story_turning_point:
    "〇〇の出来事をきっかけに、それまで信じていた〇〇という前提が揺らいだ。代わりに「〇〇」を大事にするようになり、いまの仕事の核ができた。",
  story_now:
    "いま向き合っているのは〇〇な人。〇〇を提供することで、〇〇な状態に届ける役を担っている。一度に多くは扱わず、深く伴走することを大切にしている。",
  story_future:
    "これから先は〇〇という仕組みを残したい。一人ではなく〇〇な人と一緒に、〇〇な状態を当たり前にする。それが次に積みたい一段。",
};

export default function MypageEditPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [tab, setTab] = useState<TabKey>("profile");

  const lastSavedFormRef = useRef<ProfileForm | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const row = data as unknown as Record<string, unknown>;
      const next: ProfileForm = { ...emptyForm };
      (Object.keys(emptyForm) as (keyof ProfileForm)[]).forEach((key) => {
        const v = row[key];
        if (typeof v === "string") next[key] = v;
      });
      setForm(next);
      setEmail((row.email as string | null) ?? user.email ?? "");
      lastSavedFormRef.current = next;
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  // autosave: form 変更を検知して 2秒 debounce で保存
  useEffect(() => {
    if (loading || !lastSavedFormRef.current) return;

    const baseline = lastSavedFormRef.current;
    const changed = (Object.keys(form) as (keyof ProfileForm)[]).some(
      (k) => form[k] !== baseline[k],
    );
    if (!changed) return;

    if (form.name.trim().length === 0) {
      setSaveStatus("unsaved");
      return;
    }

    setSaveStatus("unsaved");
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      void autoSave();
    }, 2000);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // autoSave は form を closure で読むため依存に form が必要
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading]);

  const autoSave = async () => {
    setSaveStatus("saving");
    setSaveError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
    );

    const { error } = await supabase
      .from("applicants")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      setSaveError(`保存に失敗しました：${error.message}`);
      setSaveStatus("unsaved");
      return;
    }

    lastSavedFormRef.current = form;
    setSaveStatus("saved");
  };

  const change = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (saveError) setSaveError(null);
  };

  // ストーリーの「例で書く」ボタンが押された時のハンドラ。既存値があれば確認してから上書き
  const applyStoryExample = (
    key: "story_origin" | "story_turning_point" | "story_now" | "story_future",
  ) => {
    const current = form[key].trim();
    if (current.length > 0) {
      const ok = window.confirm(
        "今書かれている内容を例文で上書きします。よろしいですか？",
      );
      if (!ok) return;
    }
    change(key, STORY_EXAMPLES[key]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  const tabsMeta = [
    { key: "profile" as const, label: "プロフィール" },
    { key: "story" as const, label: "ストーリー" },
    { key: "other" as const, label: "その他" },
  ];

  return (
    <div className="min-h-screen">
      {/* スティッキーヘッダー */}
      <div className="sticky top-14 lg:top-0 z-20 bg-gray-50/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
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

          {/* 保存ステータス表示（autosave 連動） */}
          <SaveStatusIndicator status={saveStatus} />
        </div>

        {/* タブナビ（Linear風アンダーラインタブ + 進捗 N/Total） */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            role="tablist"
            aria-label="プロフィール編集セクション"
            className="flex gap-6 -mb-px"
          >
            {tabsMeta.map((t) => {
              const active = tab === t.key;
              const { filled, total } = calcProgress(form, t.key);
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  id={`tab-${t.key}`}
                  aria-selected={active}
                  aria-controls={`tabpanel-${t.key}`}
                  onClick={() => setTab(t.key)}
                  className={`py-3 text-sm border-b-2 transition-colors flex items-center gap-2 ${
                    active
                      ? "border-gray-900 text-gray-900 font-semibold"
                      : "border-transparent text-gray-500 font-medium hover:text-gray-700"
                  }`}
                >
                  <span>{t.label}</span>
                  <span
                    className={`text-[11px] tabular-nums font-medium ${
                      active ? "text-gray-500" : "text-gray-400"
                    }`}
                    aria-label={`${filled}件 / 全${total}件 入力済み`}
                  >
                    {filled}/{total}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 編集フォーム */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form
          id="profile-form"
          onSubmit={handleSubmit}
          className="min-w-0"
        >
            {/* タブ: プロフィール（アカウント / 基本 / 仕事） */}
            <div
              role="tabpanel"
              id="tabpanel-profile"
              aria-labelledby="tab-profile"
              className={`space-y-8 ${tab === "profile" ? "" : "hidden"}`}
            >
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

              <Section icon={<User className="w-4 h-4" />} title="基本情報">
                {/* お名前は最重要なので大きめに */}
                <Field label="お名前" required>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => change("name", e.target.value)}
                    placeholder="山田 太郎"
                    className={`${inputClass} text-base py-3 font-medium`}
                  />
                </Field>
                {/* ふりがな + ニックネームは補助情報。2列に並べて視覚的に格下げ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="ふりがな">
                    <input
                      type="text"
                      value={form.name_furigana}
                      onChange={(e) => change("name_furigana", e.target.value)}
                      placeholder="やまだ たろう"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="ニックネーム" hint="呼ばれ方として表示されます">
                    <input
                      type="text"
                      value={form.nickname}
                      onChange={(e) => change("nickname", e.target.value)}
                      placeholder="たろちゃん"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field
                  label="ステータスメッセージ"
                  hint="LINEのプロフ一言と同じ感覚で。気軽に書き換えてOK。"
                >
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
                <Field
                  label="一言で「何をしている人」？"
                  hint="紹介されるときの一言を意識して"
                >
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
            </div>

            {/* タブ: ストーリー（4問 / つながり） */}
            <div
              role="tabpanel"
              id="tabpanel-story"
              aria-labelledby="tab-story"
              className={`space-y-8 ${tab === "story" ? "" : "hidden"}`}
            >
              <Section
                icon={<Sparkles className="w-4 h-4" />}
                title="ストーリー"
                description="あなたを知ってもらうための4つの問い。書き出しに迷ったら「例で書く」を押すとテンプレが入ります。"
              >
                <Field
                  label="この仕事を始めたきっかけは？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_origin")}
                >
                  <textarea
                    value={form.story_origin}
                    onChange={(e) => change("story_origin", e.target.value)}
                    rows={3}
                    placeholder="何があって、いまの道に進んだか"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field
                  label="転機になった出来事は？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_turning_point")}
                >
                  <textarea
                    value={form.story_turning_point}
                    onChange={(e) =>
                      change("story_turning_point", e.target.value)
                    }
                    rows={3}
                    placeholder="あなたの考え方が変わった瞬間"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field
                  label="今どんな想いで活動していますか？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_now")}
                >
                  <textarea
                    value={form.story_now}
                    onChange={(e) => change("story_now", e.target.value)}
                    rows={3}
                    placeholder="いま大切にしていること"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field
                  label="これからやりたいことは？"
                  exampleLabel="例で書く"
                  onApplyExample={() => applyStoryExample("story_future")}
                >
                  <textarea
                    value={form.story_future}
                    onChange={(e) => change("story_future", e.target.value)}
                    rows={3}
                    placeholder="これから挑戦したいこと"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </Section>

              <Section
                icon={<UsersIcon className="w-4 h-4" />}
                title="つながり"
                description="紹介してほしい相手像。具体的だと届きやすくなります。"
              >
                <Field label="どんな人とつながりたいですか？">
                  <textarea
                    value={form.want_to_connect_with}
                    onChange={(e) =>
                      change("want_to_connect_with", e.target.value)
                    }
                    rows={4}
                    placeholder="例：地方で人材育成に取り組む経営者の方、組織開発に悩んでる方"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </Section>
            </div>

            {/* タブ: その他（人柄 / 連絡先 = 任意） */}
            <div
              role="tabpanel"
              id="tabpanel-other"
              aria-labelledby="tab-other"
              className={`space-y-8 ${tab === "other" ? "" : "hidden"}`}
            >
              <Section
                icon={<Heart className="w-4 h-4" />}
                title="人柄(任意)"
                description="あなたの人となりが伝わる質問。書けるところだけでOK。"
                collapsible
              >
                <Field label="好きなものは?">
                  <input
                    type="text"
                    value={form.favorites}
                    onChange={(e) => change("favorites", e.target.value)}
                    placeholder="例：コーヒー、サウナ、村上春樹"
                    className={inputClass}
                  />
                </Field>
                <Field label="最近ハマっていることは?">
                  <input
                    type="text"
                    value={form.current_hobby}
                    onChange={(e) => change("current_hobby", e.target.value)}
                    placeholder="例：盆栽、Pickleball、生成AI触り倒し"
                    className={inputClass}
                  />
                </Field>
                <Field label="学生時代どんな子でしたか?">
                  <textarea
                    value={form.school_days_self}
                    onChange={(e) => change("school_days_self", e.target.value)}
                    rows={2}
                    placeholder="例：体育会系で部活漬け、文化祭が一番盛り上がる派"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
                <Field label="大切にしていることは?">
                  <textarea
                    value={form.personal_values}
                    onChange={(e) => change("personal_values", e.target.value)}
                    rows={2}
                    placeholder="例：相手の立場で考える、約束を守る、誠実であること"
                    className={`${inputClass} resize-y`}
                  />
                </Field>
              </Section>

              <Section
                icon={<AtSign className="w-4 h-4" />}
                title="連絡先(任意)"
                description="他のメンバーや主催者からの連絡導線。空欄でも構いません。"
                collapsible
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
                    onChange={(e) =>
                      change("contact_instagram", e.target.value)
                    }
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
            </div>
        </form>
      </div>

      {/* エラー時のみ画面下部固定スナックバー */}
      {saveError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-2 px-4 py-3 rounded-xl shadow-lg border text-sm max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-2 duration-200 border-red-200 bg-red-50 text-red-700"
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{saveError}</span>
        </div>
      )}
    </div>
  );
}

// ─── 内部コンポーネント ────────────────────────────────

const inputClass =
  "block w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900/10";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
}

function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === "idle") {
    return <div className="w-16 flex-shrink-0" aria-hidden="true" />;
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0"
    >
      {status === "saving" && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>保存中…</span>
        </>
      )}
      {status === "saved" && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>保存済み</span>
        </>
      )}
      {status === "unsaved" && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>未保存の変更</span>
        </>
      )}
    </div>
  );
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** true なら開閉可能（任意項目向け）。<details> でネイティブ実装する */
  collapsible?: boolean;
  /** collapsible 時の初期状態。デフォルトは閉じる */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({
  icon,
  title,
  description,
  collapsible = false,
  defaultOpen = false,
  children,
}: SectionProps) {
  if (!collapsible) {
    return (
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
        <header className="mb-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <span className="text-teal-700">{icon}</span>
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

  // 開閉可能なセクション。<details>/<summary> でネイティブ実装
  return (
    <details
      open={defaultOpen}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    >
      <summary className="cursor-pointer select-none list-none p-6 sm:p-8 flex items-center justify-between gap-2 hover:bg-gray-50/60 transition-colors [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-base font-bold text-gray-900">
          <span className="text-teal-700">{icon}</span>
          {title}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-1 space-y-5">
        {description && (
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
        )}
        {children}
      </div>
    </details>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  /** 「例で書く」など、ラベル右に置く補助アクションのラベル */
  exampleLabel?: string;
  /** exampleLabel ボタンが押された時のハンドラ */
  onApplyExample?: () => void;
  children: React.ReactNode;
}

function Field({
  label,
  required,
  hint,
  exampleLabel,
  onApplyExample,
  children,
}: FieldProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <span>{label}</span>
          {required && (
            <span className="text-[10px] font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">
              必須
            </span>
          )}
        </label>
        {exampleLabel && onApplyExample && (
          <button
            type="button"
            onClick={onApplyExample}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-teal-700 transition-colors"
          >
            <WandSparkles className="w-3 h-3" />
            {exampleLabel}
          </button>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}


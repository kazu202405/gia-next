import { ComingSoon } from "../_components/ComingSoon";

export default function SettingsPage() {
  return (
    <ComingSoon
      eyebrow="SETTINGS"
      title="設定"
      description="テナント情報・メンバー管理・プラン情報。"
      bullets={[
        "テナント名（表示用）の編集",
        "slug（URL識別子）の編集 ※変更時は警告を出す（古いURLが無効になる）",
        "メンバー追加・削除・role 変更（owner / admin / member / viewer）",
        "Phase 3（マルチテナント本格運用）でメンバー招待フロー追加・slug 履歴301リダイレクト",
      ]}
    />
  );
}

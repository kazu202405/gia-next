"use client";

// ヘッダー（詳細を編集・削除の隣）に置く「画像を追加」ボタン。
// 複数画像をブラウザから Storage に直接アップロード → DB 記録 → router.refresh で
// ギャラリー/アバターを再描画。

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addPersonPhoto } from "../_photo_actions";

const BUCKET = "ai-clone-people";

export function PersonPhotoUploadButton({
  slug,
  tenantId,
  personId,
}: {
  slug: string;
  tenantId: string;
  personId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);
    setUploading(true);
    const supabase = createClient();

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const rand =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
      const path = `${tenantId}/${personId}/${rand}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: "3600", contentType: file.type });
      if (upErr) {
        setError(`アップロードに失敗しました：${upErr.message}`);
        continue;
      }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const res = await addPersonPhoto(slug, tenantId, personId, path, pub.publicUrl);
      if (!res.ok) setError(res.error ?? "記録に失敗しました");
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  };

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-40 transition-colors"
      >
        {uploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ImagePlus className="w-3 h-3" />
        )}
        {uploading ? "アップロード中…" : "画像を追加"}
      </button>
      {error && <span className="mt-1 text-[11px] text-[#8a4538]">{error}</span>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPick}
        className="hidden"
      />
    </div>
  );
}

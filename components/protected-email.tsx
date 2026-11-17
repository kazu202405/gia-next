"use client";

import { useEffect, useState } from "react";

/*
 * メールアドレスを、画面に出す直前にブラウザの中で組み立てる（2026-11-17 五島さん）。
 *
 * 公開ページにアドレスを文字のまま置くと、ページを読んで回る機械に拾われて迷惑メールが増える。
 * ここではアドレスを部品に分けて持ち、ページのHTML（機械が読む所）にはアドレスを一切出さない。
 * 「[at]」や「★」に置き換える形は、置き換えを戻す処理で拾われるので使わない。
 *
 * ⚠️ ブラウザと同じように画面を組み立ててから読む機械には、これでも拾われる（数は少ない）。
 * ⚠️ アドレスを変えるときは、ここの部品だけを直す。
 */
const PARTS = {
  user: ["global", "information", "academy"],
  domain: ["gmail", "com"],
};

export function ProtectedEmail({ className }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    setAddress(PARTS.user.join(".") + String.fromCharCode(64) + PARTS.domain.join("."));
  }, []);

  if (!address) {
    // 組み立てる前（とJavaScriptが動かないとき）。アドレスの文字は出さない
    return <span className={className}>（メールアドレスを表示しています…）</span>;
  }
  return (
    <a href={`mailto:${address}`} className={className ?? "underline underline-offset-2"}>
      {address}
    </a>
  );
}

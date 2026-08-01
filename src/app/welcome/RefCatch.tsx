"use client";

/**
 * 紹介リンク（/welcome?ref=◯◯）で来た人を覚えておく。
 * ここでは Cookie に置くだけ。ログイン後の初回読み込み（/api/bootstrap）で
 * 「誰の紹介で来たか」として本人の設定に1回だけ記録される。
 */
import { useEffect } from "react";

export function RefCatch() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (ref && ref.length < 80) {
        document.cookie = `sw_ref=${encodeURIComponent(ref)}; path=/; max-age=${180 * 86400}; SameSite=Lax`;
      }
    } catch { /* ignore */ }
  }, []);
  return null;
}

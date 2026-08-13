"use client";

/**
 * 会話の表示が壊れたとき、**黙って消えない**ようにする受け皿。
 *
 * 【なぜ要るか】
 * 「返信は来るのに、そのあとチャットの表示が消えて背景の絵だけになる」
 * という声が届いた。何が起きたのか、こちらからは何も分からない状態だった。
 *
 * 描画で例外が出ると、その部分だけがごっそり消える。見た目は「背景だけ」。
 * ここで受け止めて、
 *   ・何が起きたかを画面に出す（読み込み直すボタンつき）
 *   ・記録に残す（/api/client-error）
 * ようにする。原因が分からないまま同じ声を何度も聞かないために。
 *
 * ※ タブそのものがメモリで落とされた場合は、ここでは受け止められない。
 *   それは先読みを減らす側（ShingaWorld の背景先読み）で手当てしている。
 */
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { err: string };

export class TalkBoundary extends Component<Props, State> {
  state: State = { err: "" };

  static getDerivedStateFromError(e: any): State {
    return { err: String(e?.message ?? e ?? "不明") };
  }

  componentDidCatch(e: any, info: any) {
    try {
      void fetch("/api/client-error", {
        method: "POST", headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          where: "shinga-talk",
          message: String(e?.message ?? e ?? ""),
          stack: String(e?.stack ?? "").slice(0, 1200),
          componentStack: String(info?.componentStack ?? "").slice(0, 1200),
          ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
        }),
      }).catch(() => {});
    } catch { /* 記録できなくても、画面は出す */ }
  }

  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="talkerr">
        <p className="t">会話の表示が止まってしまった。</p>
        <p className="s">きみのせいじゃないよ。話した内容は残っているから、読み込み直せば続きから話せる。</p>
        <button onClick={() => { try { window.location.reload(); } catch { /* ignore */ } }}>
          読み込み直す
        </button>
        <p className="d">{this.state.err}</p>
      </div>
    );
  }
}

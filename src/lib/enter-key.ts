/**
 * Enterキーの扱い。全部の入力欄でここを通す。
 *
 * 【なぜ要るか】
 * 「まだ書きたかったのに送信されてしまう」というお客様の声。
 * パソコンには Shift キーがあるので Shift+Enter で改行できる。
 * でも**スマホのキーボードに Shift は無い**。改行キーを押すと Enter が飛んで、
 * そのまま送信されていた。作った本人（パソコン）では起きないから気づけなかった。
 *
 * 【決めた振る舞い】
 * ・スマホ・タブレット（指で触る端末）→ Enter は**改行**。送るのは ▶ ボタンだけ
 * ・パソコン → これまで通り Enter で送信、Shift+Enter で改行
 * ・どの端末でも Ctrl+Enter / ⌘+Enter で送信できる（外付けキーボード派のため）
 * ・日本語を変換している最中（isComposing）は何もしない。変換確定のEnterで送らない
 */

/** 物理キーボードのある端末か（＝Enterで送っていいか） */
export function enterSends(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // 指で触る端末は coarse／hover無し。マウスのある端末は fine／hoverあり
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  } catch {
    return false;   // 分からないときは「送らない」側に倒す（消えるより残るほうがいい）
  }
}

/** 指で触る端末（案内文の出し分けに使う） */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.matchMedia("(hover: none), (pointer: coarse)").matches; } catch { return false; }
}

type KeyEvt = {
  key: string;
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
  nativeEvent?: { isComposing?: boolean };
  preventDefault: () => void;
};

/**
 * 送信するべきときだけ send() を呼ぶ。それ以外は何もしない（＝改行が入る）。
 * 使い方: onKeyDown={(e) => handleEnter(e, send)}
 */
export function handleEnter(e: KeyEvt, send: () => void): void {
  if (e.key !== "Enter") return;
  if (e.nativeEvent?.isComposing) return;              // 変換中は触らない
  if (e.metaKey || e.ctrlKey) { e.preventDefault(); send(); return; }
  if (e.shiftKey) return;                              // 明示的に改行
  if (!enterSends()) return;                           // スマホ：改行のまま
  e.preventDefault();
  send();
}

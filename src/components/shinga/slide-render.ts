/**
 * カルーセル1枚（1080×1350）のHTMLを組み立てる。
 * プレビューと画像書き出しで「完全に同じHTML」を使う＝見たまま保存される。
 *
 * デザインの芯（Singa Worldの宝の地図の世界観をSNS品質で）:
 *  - 二重フレーム＋四隅の金の飾り＝「カード」としての格
 *  - 光（radial glow）で奥行き。ベタ塗りにしない
 *  - 明朝の大きな見出し＋ **強調** は金色
 *  - 全身アバターは「アーチ窓」に立たせる（背景付き画像でも様になる）
 *  - 下部に 顔チップ＋名前／ページドット／ページ番号
 */
import type { Slide, SlideTheme } from "@/lib/broadcast-types";

export type SlideMeta = {
  penName: string;
  avatar: string | null;   // dataURL（書き出しでも使えるように）
  heroLine: string;        // 主人公像
  methodName: string;
  refUrl: string;
};

type Pal = {
  bg: string; glow1: string; glow2: string;
  ink: string; sub: string; gold: string; goldSoft: string;
  card: string; line: string; frame: string; ghost: string; portal: string; bubble: string;
};

const T: Record<SlideTheme, Pal> = {
  night: {
    bg: "#110d1c",
    glow1: "radial-gradient(circle, rgba(224,189,114,.22), transparent 65%)",
    glow2: "radial-gradient(circle, rgba(111,90,190,.3), transparent 65%)",
    ink: "#f4ecdd", sub: "#a99a7f", gold: "#e0bd72", goldSoft: "rgba(224,189,114,.55)",
    card: "rgba(255,255,255,.045)", line: "rgba(224,189,114,.34)", frame: "rgba(224,189,114,.2)",
    ghost: "rgba(224,189,114,.07)", portal: "linear-gradient(180deg,#f6efdd,#e3d3ae)",
    bubble: "rgba(0,0,0,.32)",
  },
  paper: {
    bg: "#efe5cc",
    glow1: "radial-gradient(circle, rgba(255,250,235,.9), transparent 65%)",
    glow2: "radial-gradient(circle, rgba(196,168,110,.35), transparent 65%)",
    ink: "#3b2f1a", sub: "#8a7350", gold: "#9a742c", goldSoft: "rgba(154,116,44,.6)",
    card: "rgba(59,47,26,.05)", line: "rgba(154,116,44,.4)", frame: "rgba(154,116,44,.28)",
    ghost: "rgba(154,116,44,.09)", portal: "linear-gradient(180deg,#fbf6ea,#efe0bd)",
    bubble: "rgba(255,255,255,.7)",
  },
  light: {
    bg: "#f7f5fc",
    glow1: "radial-gradient(circle, rgba(151,124,220,.16), transparent 65%)",
    glow2: "radial-gradient(circle, rgba(255,214,150,.28), transparent 65%)",
    ink: "#2a2440", sub: "#777190", gold: "#7c5fc0", goldSoft: "rgba(124,95,192,.55)",
    card: "rgba(42,36,64,.045)", line: "rgba(124,95,192,.35)", frame: "rgba(124,95,192,.22)",
    ghost: "rgba(124,95,192,.08)", portal: "linear-gradient(180deg,#ffffff,#ece7fa)",
    bubble: "rgba(255,255,255,.85)",
  },
};

const SERIF = "Georgia,'Times New Roman','Yu Mincho','游明朝','Hiragino Mincho ProN',serif";
const SANS = "-apple-system,'Segoe UI','Hiragino Sans','Noto Sans JP',sans-serif";

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** **強調** をテーマ色の太字に。\n は改行に */
function rich(s: string, gold: string): string {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, `<b style="color:${gold};font-weight:700">$1</b>`)
    .replace(/\n/g, "<br/>");
}

/** 顔チップ（全身画像でも顔のあたりをズームして丸く切り出す） */
function faceChip(meta: SlideMeta, size: number, t: Pal): string {
  if (meta.avatar) {
    // 立ち絵は顔が上部1/3にあることが多いので、2.2倍にズームして顔を中央へ
    return `<div style="width:${size}px;height:${size}px;border-radius:999px;overflow:hidden;background:#f4ecd8;border:3px solid ${t.goldSoft};box-shadow:0 4px 14px rgba(0,0,0,.25);position:relative">
      <img src="${meta.avatar}" style="position:absolute;width:220%;height:220%;left:-60%;top:-14%;object-fit:cover;object-position:50% 0%"/></div>`;
  }
  const ch = esc((meta.penName || "私").slice(0, 1));
  return `<div style="width:${size}px;height:${size}px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:${t.gold};color:#221a08;font-size:${Math.round(size * 0.44)}px;font-weight:700;font-family:${SERIF}">${ch}</div>`;
}

/** アーチ窓に立つ全身キャラ（背景付き画像でも様になる） */
function portal(meta: SlideMeta, w: number, h: number, t: Pal): string {
  const inner = meta.avatar
    ? `<img src="${meta.avatar}" style="width:100%;height:100%;object-fit:cover;object-position:50% 30%"/>`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-family:${SERIF};font-size:${Math.round(w * 0.4)}px;font-weight:700;color:${t.gold}">${esc((meta.penName || "私").slice(0, 1))}</div>`;
  return `<div style="width:${w}px;height:${h}px;border-radius:${w / 2}px ${w / 2}px 26px 26px;overflow:hidden;background:${t.portal};border:6px solid ${t.goldSoft};box-shadow:0 24px 60px rgba(0,0,0,.35), inset 0 0 40px rgba(0,0,0,.06)">${inner}</div>`;
}

/** 舞台装置：光・二重フレーム・四隅の金・下部の署名列（全スライド共通） */
function stage(t: Pal, meta: SlideMeta, page: number, total: number, inner: string): string {
  const corner = (css: string) =>
    `<div style="position:absolute;width:64px;height:64px;border:0 solid ${t.gold};${css}"></div>`;
  const dots = Array.from({ length: total }, (_, i) =>
    `<span style="width:${i === page - 1 ? 30 : 12}px;height:12px;border-radius:999px;background:${i === page - 1 ? t.gold : t.frame};display:inline-block;margin:0 5px"></span>`).join("");
  return `<div style="width:1080px;height:1350px;box-sizing:border-box;position:relative;overflow:hidden;background:${t.bg};color:${t.ink};font-family:${SANS}">
    <div style="position:absolute;width:900px;height:900px;top:-320px;left:-300px;background:${t.glow1}"></div>
    <div style="position:absolute;width:1000px;height:1000px;bottom:-380px;right:-320px;background:${t.glow2}"></div>
    <div style="position:absolute;inset:34px;border:1.5px solid ${t.frame};border-radius:10px"></div>
    ${corner("left:22px;top:22px;border-left-width:6px;border-top-width:6px;border-radius:10px 0 0 0")}
    ${corner("right:22px;top:22px;border-right-width:6px;border-top-width:6px;border-radius:0 10px 0 0")}
    ${corner("left:22px;bottom:22px;border-left-width:6px;border-bottom-width:6px;border-radius:0 0 0 10px")}
    ${corner("right:22px;bottom:22px;border-right-width:6px;border-bottom-width:6px;border-radius:0 0 10px 0")}
    <div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;flex-direction:column">${inner}</div>
    <div style="position:absolute;left:88px;right:88px;bottom:56px;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:16px">${faceChip(meta, 58, t)}
        <span style="font-size:27px;letter-spacing:.1em;color:${t.sub}">${esc(meta.penName)}</span></div>
      <div style="display:flex;align-items:center">${dots}</div>
      <div style="font-size:25px;color:${t.sub};letter-spacing:.12em">${page} / ${total}</div>
    </div>
  </div>`;
}

/** 小さな見出しラベル（英字＋線） */
function kicker(t: Pal, en: string): string {
  return `<div style="display:flex;align-items:center;gap:20px;margin-bottom:40px">
    <span style="width:58px;height:2.5px;background:${t.gold}"></span>
    <span style="font-size:26px;letter-spacing:.34em;color:${t.gold};font-weight:600">${esc(en)}</span></div>`;
}

/** 1080×1350 のスライドHTML */
export function slideHtml(s: Slide, theme: SlideTheme, meta: SlideMeta, page: number, total: number): string {
  const t = T[theme];
  let inner = "";

  if (s.kind === "cover") {
    const hasChar = !!meta.avatar;
    // タイトルの長さに合わせて文字サイズを落とす（中途半端な折り返しを防ぐ）
    const tl = String(s.title ?? "").replace(/\n/g, "").length;
    const fs = tl <= 14 ? 96 : tl <= 22 ? 84 : tl <= 30 ? 74 : 64;
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:120px 92px 190px">
      ${kicker(t, "SINGA WORLD")}
      <div style="font-family:${SERIF};font-size:${fs}px;font-weight:700;line-height:1.45;letter-spacing:.015em;text-shadow:0 4px 24px rgba(0,0,0,.18)">${rich(s.title ?? "", t.gold)}</div>
      ${s.body ? `<div style="margin-top:48px;font-size:36px;line-height:1.8;color:${t.sub};max-width:${hasChar ? 560 : 860}px">${rich(s.body, t.gold)}</div>` : ""}
    </div>
    ${hasChar ? `<div style="position:absolute;right:76px;bottom:170px">${portal(meta, 300, 380, t)}</div>` : ""}`;
  } else if (s.kind === "quote") {
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 100px 120px;position:relative">
      <div style="position:absolute;top:120px;left:80px;font-family:${SERIF};font-size:320px;line-height:1;color:${t.ghost}">“</div>
      <div style="width:130px;height:2px;background:${t.goldSoft};margin-bottom:66px"></div>
      <div style="font-family:${SERIF};font-size:70px;font-weight:700;line-height:1.75;letter-spacing:.03em">${rich(s.body ?? s.title ?? "", t.gold)}</div>
      <div style="width:130px;height:2px;background:${t.goldSoft};margin-top:66px"></div>
      ${s.accent ? `<div style="margin-top:44px;font-size:29px;letter-spacing:.14em;color:${t.sub}">${esc(s.accent)}</div>` : ""}
    </div>`;
  } else if (s.kind === "list") {
    const items = (s.items ?? []).filter(Boolean).map((it, i) =>
      `<div style="display:flex;gap:34px;align-items:center;padding:34px 40px;border-radius:20px;background:${t.card};border-left:6px solid ${t.goldSoft};margin-bottom:26px">
        <div style="font-family:${SERIF};font-size:58px;font-weight:700;color:${t.gold};min-width:64px;text-align:center">${String(i + 1).padStart(2, "0")}</div>
        <div style="font-size:38px;line-height:1.65">${rich(it, t.gold)}</div></div>`).join("");
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:60px 88px 150px">
      ${kicker(t, "CHECK")}
      <div style="font-family:${SERIF};font-size:60px;font-weight:700;line-height:1.45;margin-bottom:56px">${rich(s.title ?? "", t.gold)}</div>${items}</div>`;
  } else if (s.kind === "compare") {
    const rows = (s.items ?? []).filter(Boolean).map((it) => {
      const [l, r] = String(it).split("|");
      return `<div style="display:flex;gap:24px;margin-bottom:26px">
        <div style="flex:1;padding:44px 38px;border-radius:22px;background:${t.card};font-size:37px;line-height:1.7;color:${t.sub};display:flex;align-items:center">${rich(l ?? "", t.gold)}</div>
        <div style="flex:1;padding:44px 38px;border-radius:22px;border:3px solid ${t.goldSoft};background:${t.card};font-size:37px;line-height:1.7;font-weight:700;display:flex;align-items:center">${rich(r ?? "", t.gold)}</div></div>`;
    }).join("");
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:60px 80px 150px">
      ${kicker(t, "DIFFERENCE")}
      <div style="font-family:${SERIF};font-size:58px;font-weight:700;line-height:1.45;margin-bottom:40px">${rich(s.title ?? "", t.gold)}</div>
      <div style="display:flex;gap:24px;margin-bottom:22px">
        <div style="flex:1;text-align:center;font-size:29px;letter-spacing:.2em;color:${t.sub}">— よくある —</div>
        <div style="flex:1;text-align:center;font-size:29px;letter-spacing:.2em;color:${t.gold}">— こっち —</div></div>${rows}</div>`;
  } else if (s.kind === "manga") {
    const panels = (s.panels ?? []).slice(0, 4).map((p, i) =>
      `<div style="border:3px solid ${t.line};border-radius:18px;padding:18px 24px;display:flex;flex-direction:column;justify-content:center;background:${t.card};overflow:hidden">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
          <span style="font-family:${SERIF};font-size:30px;font-weight:700;color:${t.gold}">${i + 1}</span>
          <span style="font-size:22px;color:${t.sub}">${esc(p.scene ?? "")}</span>
          ${p.narration ? `<span style="font-size:21px;color:${t.sub};margin-left:auto">※ ${esc(p.narration)}</span>` : ""}</div>
        <div style="display:flex;align-items:center;gap:18px">
          ${p.speaker === "自分" ? faceChip(meta, 82, t) : `<div style="min-width:82px;width:82px;height:82px;border-radius:999px;border:3px solid ${t.line};display:flex;align-items:center;justify-content:center;font-size:24px;color:${t.sub};text-align:center;line-height:1.25;padding:4px;box-sizing:border-box">${esc((p.speaker ?? "").slice(0, 4))}</div>`}
          <div style="flex:1;padding:20px 26px;border-radius:18px 18px 18px 6px;background:${t.bubble};font-size:30px;line-height:1.55">${rich(p.line ?? "", t.gold)}</div>
        </div>
      </div>`).join("");
    inner = `<div style="flex:1;padding:84px 72px 170px;display:flex;flex-direction:column">
      ${s.title ? `<div style="font-family:${SERIF};font-size:46px;font-weight:700;margin-bottom:26px">${rich(s.title, t.gold)}</div>` : kicker(t, "STORY")}
      <div style="flex:1;display:grid;grid-template-rows:repeat(4,1fr);gap:18px;min-height:0">${panels}</div></div>`;
  } else if (s.kind === "ask") {
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 92px 160px">
      ${kicker(t, "QUESTION")}
      <div style="font-family:${SERIF};font-size:76px;font-weight:700;line-height:1.55">${rich(s.title ?? "", t.gold)}</div>
      ${s.body ? `<div style="margin-top:52px;font-size:36px;line-height:1.85;color:${t.sub};max-width:${meta.avatar ? 580 : 880}px">${rich(s.body, t.gold)}</div>` : ""}
    </div>
    ${meta.avatar ? `<div style="position:absolute;right:80px;bottom:180px">${portal(meta, 260, 330, t)}</div>` : ""}`;
  } else if (s.kind === "signature") {
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 92px 130px">
      ${portal(meta, 340, 430, t)}
      <div style="margin-top:52px;font-family:${SERIF};font-size:48px;font-weight:700;line-height:1.65;max-width:840px">${rich(meta.heroLine || meta.penName, t.gold)}</div>
      ${meta.methodName ? `<div style="margin-top:30px;display:inline-block;padding:14px 36px;border-radius:999px;border:2.5px solid ${t.goldSoft};font-size:31px;color:${t.gold};letter-spacing:.1em">「${esc(meta.methodName)}」実践中</div>` : ""}
      <div style="margin-top:64px;display:flex;align-items:center;gap:24px;color:${t.sub}">
        <span style="width:70px;height:1.5px;background:${t.frame}"></span>
        <span style="font-size:26px;letter-spacing:.24em">SINGA WORLD</span>
        <span style="width:70px;height:1.5px;background:${t.frame}"></span></div>
      <div style="margin-top:22px;font-size:25px;color:${t.sub};line-height:1.9">このワークができる場所 →<br/><span style="color:${t.gold}">${esc(meta.refUrl.replace(/^https?:\/\//, ""))}</span></div>
    </div>`;
  } else { // body
    inner = `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 92px 140px;position:relative">
      <div style="position:absolute;top:86px;right:92px;font-family:${SERIF};font-size:210px;font-weight:700;color:${t.ghost};line-height:1">${String(page).padStart(2, "0")}</div>
      ${s.title ? `<div style="font-family:${SERIF};font-size:60px;font-weight:700;line-height:1.5;margin-bottom:20px">${rich(s.title, t.gold)}</div>
      <div style="width:96px;height:3px;background:${t.gold};margin-bottom:52px"></div>` : ""}
      <div style="font-size:43px;line-height:2.05;letter-spacing:.01em">${rich(s.body ?? "", t.gold)}</div>
      ${s.accent ? `<div style="margin-top:48px;font-size:29px;color:${t.gold};letter-spacing:.06em">── ${esc(s.accent)}</div>` : ""}
    </div>`;
  }
  return stage(t, meta, page, total, inner);
}

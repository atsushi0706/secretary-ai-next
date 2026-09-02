"use client";

/**
 * チャットの流れに置くカード。
 *
 * 幻獣が現れた、守り手が解き放たれた、内なる子に会った、光を取り戻した——
 * こういう出来事は、そのときだけ画面いっぱいの演出が出て、閉じたら消えていた。
 * だから後から見返したときに「いつ何が出たのか」がまったく分からない。
 *
 * そこで、出来事が起きた**その瞬間に**、チャットの流れへカードを1枚置く。
 * スタンプを送ったのと同じ扱いなので、そのまま上下にスクロールできるし、
 * 会話の時系列の中に残りつづける。
 *
 * 置き方：メッセージ本文を `[[card]]{JSON}` にして流し、ここで描く。
 */
import { SHADOW_PAIRS } from "@/lib/shadow";
import { PARTS, type PartColor } from "@/lib/parts";
import { CardArt } from "./CardArt";
import { PartArt } from "./PartsTemple";

/** チャットに置けるカードの種類 */
export type ChatCardData =
  | { t: "beast"; pair: string }                                    // 幻獣が現れた
  | { t: "light"; pair: string; own?: string }                      // 光を取り戻した
  | { t: "keeper"; color: PartColor }                               // 守り手が姿を見せた（会話から見立てたとき）
  | { t: "child"; color: PartColor }                                // 内なる子に会った
  | { t: "guardian"; color: PartColor; from?: string }              // 守り手が解き放たれた
  | { t: "skill"; title: string; body?: string; rarity?: "gold" | "silver" | "bronze"; source?: string }
  | { t: "draw"; name: string; meaning?: string };                  // カードを引いた（じぶんワーク）

export function encodeChatCard(d: ChatCardData): string {
  return `[[card]]${JSON.stringify(d)}`;
}
export function decodeChatCard(content: string): ChatCardData | null {
  if (!content.startsWith("[[card]]")) return null;
  try { return JSON.parse(content.slice(8)) as ChatCardData; } catch { return null; }
}

const now = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export function ChatCard({ data, at }: { data: ChatCardData; at?: string }) {
  const stamp = at ?? now();

  if (data.t === "beast" || data.t === "light") {
    const pair = SHADOW_PAIRS.find((p) => p.id === data.pair) ?? SHADOW_PAIRS[0];
    const lit = data.t === "light";
    return (
      <div className={`cc ${lit ? "is-light" : "is-beast"}`} style={{ ["--cc" as any]: pair.hue }}>
        <div className="cc-head">
          <span className="cc-kicker">{lit ? "光を取り戻した" : "幻獣が現れた"}</span>
          <span className="cc-at">{stamp}</span>
        </div>
        <div className="cc-body">
          <span className="cc-emblem">{lit ? "✦" : pair.emoji}</span>
          <div className="cc-text">
            <b>{lit ? pair.light.label : pair.shadow.label}</b>
            <span>{lit ? (data.own || pair.light.desc) : pair.shadow.desc}</span>
          </div>
        </div>
        {/*
          幻獣が出た瞬間に、**どういう幻獣なのか**を一緒に残す。
          これが無いと、あとで会話をさかのぼっても
          「何の幻獣だったか」が分からず、振り返れない（淳くんの指摘）。
        */}
        {!lit && (
          <div className="cc-traits">
            <div className="cc-trait">
              <b>出かた</b>
              <span>{pair.shadow.signals.join("／")}</span>
            </div>
            <div className="cc-trait">
              <b>奥にある力</b>
              <span>{pair.core.join("・")}</span>
            </div>
            <div className="cc-trait">
              <b>取り戻すと</b>
              <span>{pair.light.label}——{pair.light.desc}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (data.t === "child" || data.t === "guardian" || data.t === "keeper") {
    const trio = PARTS[data.color];
    const face = data.t === "guardian" ? trio.guardian : data.t === "keeper" ? trio.defense : trio.child;
    return (
      <div className={`cc ${data.t === "guardian" ? "is-guardian" : "is-child"}`} style={{ ["--cc" as any]: trio.hue }}>
        <div className="cc-head">
          <span className="cc-kicker">{data.t === "guardian" ? "守り手が解き放たれた" : data.t === "keeper" ? "守り手が姿を見せた" : "内なる子に出会った"}</span>
          <span className="cc-at">{stamp}</span>
        </div>
        <div className="cc-body">
          <PartArt face={face} color={data.color} size={54} glow={data.t === "guardian"} />
          <div className="cc-text">
            <b>{face.name}（{face.title}）</b>
            <span>{data.t === "guardian"
              ? (data.from ? `${data.from} が役目を終えた` : trio.guardian.message)
              : data.t === "keeper"
              ? `こういうとき前に出る：${trio.cue}`
              : "この子を守るために、守り手は前に立っていた。"}</span>
          </div>
        </div>
      </div>
    );
  }

  if (data.t === "skill") {
    const rarity = data.rarity ?? "bronze";
    return (
      <div className={`cc is-skill r-${rarity}`}>
        <div className="cc-head">
          <span className="cc-kicker">スキルカードを手に入れた</span>
          <span className="cc-at">{stamp}</span>
        </div>
        <div className="cc-body">
          <CardArt seed={`${data.title}${data.source ?? ""}`} rarity={rarity} size={54} className="cc-art" />
          <div className="cc-text">
            <b>{data.title}</b>
            {data.body && <span>{data.body}</span>}
            {data.source && <em>{data.source}</em>}
          </div>
        </div>
      </div>
    );
  }

  // じぶんワークで引いたカード
  return (
    <div className="cc is-draw">
      <div className="cc-head">
        <span className="cc-kicker">カードを引いた</span>
        <span className="cc-at">{stamp}</span>
      </div>
      <div className="cc-body">
        <span className="cc-emblem">🎴</span>
        <div className="cc-text">
          <b>{data.name}</b>
          {data.meaning && <span>{data.meaning}</span>}
        </div>
      </div>
    </div>
  );
}

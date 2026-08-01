/**
 * じぶんワーク（ユーザーが自分で作るワーク／カードワーク）。
 * クライアント・サーバ共用（DBアクセス禁止）。
 *
 * ワーク＝「進め方の列」。ステップは2種類だけにして、初めての人でも迷わない：
 *   💬 問いかけ … 清瀬リンクがその質問を1つ聞いて、答えに寄り添う
 *   🎴 カード   … カードを1枚引いて、その意味を今の話に重ねる（オラクル）
 *
 * カードの絵は、もともとアプリにある紋章（/quest-sym-1..16.png）を使う。
 * じぶんの札（名前と意味を自分で書く）も作れる。
 */

export type WorkStep =
  | { kind: "q"; q: string }
  | { kind: "card"; deck: "oracle" | "own"; lead?: string };

export type OwnCard = { name: string; meaning: string; img: string };

export type CustomWork = {
  id?: number;
  name: string;
  emoji: string;
  purpose: string;          // 何のためのワークか（一覧と冒頭で見せる）
  intro: string;            // 始まりのひとこと（清瀬リンクが言う）
  closing: string;          // 締めのトーン（どう終わりたいか）
  steps: WorkStep[];
  cards: OwnCard[];         // じぶんの札（deck:"own" のとき使う）
  runs?: number;            // やった回数
  created_at?: string;
};

/** 選べる絵（すべて既存アセット）。カードの顔になる */
export const CARD_ART: string[] = [
  ...Array.from({ length: 16 }, (_, i) => `/quest-sym-${i + 1}.png`),
];

/**
 * 内蔵オラクル「星の紋章」16枚。
 * 意味は断定ではなく「問いを開く」向きに書く（引いた人が自分で意味を見つけられるように）。
 */
export const ORACLE_DECK: OwnCard[] = [
  { name: "はじまりの火", meaning: "小さく始めたことが、いちばん遠くまで行く。今日の最初の一歩は何？", img: "/quest-sym-1.png" },
  { name: "しずかな水", meaning: "急がなくていい合図。流れに任せたら、何が楽になる？", img: "/quest-sym-2.png" },
  { name: "ひらく扉", meaning: "もう開きかけている扉がある。ノックを待っているのは誰？", img: "/quest-sym-3.png" },
  { name: "かくれた鍵", meaning: "答えはすでに持っている。どのポケットに入れたままにしてる？", img: "/quest-sym-4.png" },
  { name: "のぼる月", meaning: "満ちるまでの途中。いま育っている最中のものは何？", img: "/quest-sym-5.png" },
  { name: "まく種", meaning: "結果はまだ見えなくていい。今日まける種はどれ？", img: "/quest-sym-6.png" },
  { name: "わたる橋", meaning: "こちら側とあちら側をつなぐもの。渡るのを迷っている橋は？", img: "/quest-sym-7.png" },
  { name: "やすむ木", meaning: "根を張る時間も前進のうち。何を休ませてあげる？", img: "/quest-sym-8.png" },
  { name: "とぶ鳥", meaning: "高く上がると景色が変わる。一段引いて見ると、何が見える？", img: "/quest-sym-9.png" },
  { name: "ともす灯", meaning: "誰かの暗がりを照らせる灯。きみの灯を待っているのは誰？", img: "/quest-sym-10.png" },
  { name: "ほどける結び目", meaning: "力づくじゃなく、ゆるめるとほどける。握りしめているものは？", img: "/quest-sym-11.png" },
  { name: "うつす鏡", meaning: "気になるあの人は、自分の何かを映している。何が見える？", img: "/quest-sym-12.png" },
  { name: "つむぐ糸", meaning: "バラバラに見えたことが、あとで一本につながる。今つむいでいる糸は？", img: "/quest-sym-13.png" },
  { name: "ふる雨", meaning: "降ったあとの土がいちばん柔らかい。この雨は何を育てる？", img: "/quest-sym-14.png" },
  { name: "みちびく星", meaning: "迷ったら遠くの一点を見る。きみの北極星はどこにある？", img: "/quest-sym-15.png" },
  { name: "かえる場所", meaning: "帰る場所がある人は遠くへ行ける。きみが戻ってこられる場所は？", img: "/quest-sym-16.png" },
];

export function isValidWork(w: any): w is CustomWork {
  return !!w && typeof w.name === "string" && Array.isArray(w.steps) && w.steps.length > 0 &&
    w.steps.every((s: any) => (s?.kind === "q" && typeof s.q === "string") ||
      (s?.kind === "card" && (s.deck === "oracle" || s.deck === "own")));
}

/** カードを引く（呼び出しごとにランダム） */
export function drawCard(work: CustomWork, deck: "oracle" | "own"): OwnCard {
  const pool = deck === "own" && work.cards.length > 0 ? work.cards : ORACLE_DECK;
  return pool[Math.floor(Math.random() * pool.length)];
}

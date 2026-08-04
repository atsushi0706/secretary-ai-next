/**
 * 主人公の5つの領域と、その段階。**画面とサーバの両方から使う。**
 *
 * 以前は同じものを画面側にも書き写していて、値がずれていた。
 * （心の中の4段目が、片方は 75、もう片方は 72 になっていた。）
 * すると「サーバが決めた値に当てはまる段階が画面に無い」ことが起きるので、
 * ここ1か所だけに置く。DBを触らないので、画面から読み込んでも安全。
 */

export type HeroDomain = "inner" | "embodiment" | "relationship" | "delivery" | "socialization";

export const DOMAINS: {
  key: HeroDomain; label: string; hint: string; kind: "state" | "reach";
}[] = [
  { key: "inner", label: "内側（心の中）", hint: "望む世界と“なりたい自分”が、自分の中でどれだけ明確か", kind: "state" },
  { key: "embodiment", label: "体現（暮らし）", hint: "その生き方が、毎日の習慣・選択にどれだけ表れているか", kind: "state" },
  { key: "relationship", label: "人間関係", hint: "身近な人との関わりに、その自分がどれだけ出ているか", kind: "state" },
  { key: "delivery", label: "提供（届ける）", hint: "必要としている人に、価値をどれだけ届けられているか（規模で測れる）", kind: "reach" },
  { key: "socialization", label: "社会化（広がり）", hint: "自分ひとりを超えて、世の中にどれだけ広がっているか（規模で測れる）", kind: "reach" },
];

/** 各領域の段階。これが「どこに到達したら」の定義そのもの。value=その段階の値 */
export type Step = { label: string; value: number };

export const STEPS: Record<HeroDomain, Step[]> = {
  // 内面＝状態値。完成は置かず、"深さの今"を選ぶ
  inner: [
    { label: "まだ言葉にできない", value: 15 },
    { label: "増やしたい世界を言葉にできる", value: 35 },
    { label: "なぜ望むのかも分かっている", value: 55 },
    { label: "古い思い込みに気づけている", value: 72 },
    { label: "迷っても望む方向を思い出せる", value: 90 },
  ],
  embodiment: [
    { label: "まだ生活には出ていない", value: 15 },
    { label: "自分に実践しようとしている", value: 35 },
    { label: "続いている小さな行動がある", value: 58 },
    { label: "言うことと生活がだいたい一致", value: 78 },
    { label: "自分が望む世界の見本になっている", value: 92 },
  ],
  relationship: [
    { label: "まだ身近な人には出せていない", value: 15 },
    { label: "身近な人にも出そうとしている", value: 38 },
    { label: "感謝・応援を言葉にできている", value: 60 },
    { label: "流されず、自分の態度で表せる", value: 78 },
    { label: "相手から肯定的な反応がある", value: 92 },
  ],
  // 外＝規模・到達で測れる
  delivery: [
    { label: "まだ提供していない", value: 12 },
    { label: "誰かに提供したことがある", value: 30 },
    { label: "場があれば提供できる", value: 45 },
    { label: "自分で募集して提供できる", value: 62 },
    { label: "継続的に提供できている", value: 78 },
    { label: "対価が出て、仕事になっている", value: 95 },
  ],
  socialization: [
    { label: "まだ自分ひとりの範囲", value: 12 },
    { label: "方法を言語化できている", value: 35 },
    { label: "他者に教えられる", value: 55 },
    { label: "教材・サービスに体系化している", value: 72 },
    { label: "自分抜きでも価値が届く／広がっている", value: 92 },
  ],
};


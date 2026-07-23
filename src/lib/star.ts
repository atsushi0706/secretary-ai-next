/**
 * 「星」— 生年月日から、その人の持って生まれた性質と、今の時期を出す。
 *
 * ■ 絶対ルール
 *   計算の元になっている体系の名前（算命学）、および専門用語
 *   （日干・十二運・命式・宿命・大運・年運・天中殺 など）を
 *   ユーザーに向けて出力してはいけない。
 *   ユーザーに見せる言葉は「あなたの星」「今はこういう時期」「星の流れ」だけ。
 *
 * ■ 使い方
 *   このファイルが返す説明文は AI への内部指示にだけ混ぜる。
 *   AI は「あなたはこういうタイプだから」と宣言せず、
 *   その人に合った聞き方・励まし方をするために使う。
 *
 * 計算部分は family-compass / kiyose-mind-compass から移植。
 */

const JIKKAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const JUNISHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 10タイプ。ユーザーには番号も名前も見せない（AIへの内部指示専用） */
export type StarType =
  | "貫索" | "石門" | "鳳閣" | "調舒" | "禄存"
  | "司禄" | "車騎" | "牽牛" | "龍高" | "玉堂";

const STAR_ORDER: StarType[] = [
  "貫索", "石門", "鳳閣", "調舒", "禄存",
  "司禄", "車騎", "牽牛", "龍高", "玉堂",
];

export type StarProfile = {
  /** どういう人か（AIに渡す説明。ユーザーには見せない） */
  nature: string;
  /** この人が心を開く聞き方 */
  howToTalk: string;
  /** この人に言ってはいけないこと */
  avoid: string;
  /** 動けなくなっているときの、動かし方 */
  whenStuck: string;
};

/**
 * 10タイプの性質。すべて日常語で書く（占い用語を1つも使わない）。
 * ここに書いた文章がそのまま AI の内部指示になる。
 */
const STAR_PROFILES: Record<StarType, StarProfile> = {
  貫索: {
    nature: "自分の中に自分の基準を持っている人。人に合わせるより、自分が納得できるかで決める。決めたことは時間がかかっても最後までやる。ころころ変わる話や、急かされることが苦手。",
    howToTalk: "答えを渡さず、本人の中にある答えを聞き出す。「どうしたい？」「何が引っかかってる？」と、本人に決めさせる。急かさず、沈黙を待つ。",
    avoid: "「みんなこうしてるよ」「早く決めて」「そのやり方は違う」。周りと比べる言い方と、やり方への口出しは一番効かない。",
    whenStuck: "選択肢を2つに絞って、どちらを選んでもいいと伝える。決定権が自分にあると分かった瞬間に動き出す。",
  },
  石門: {
    nature: "人と人の間に自然に立てる人。輪を作るのがうまく、頼られやすい。ただ、みんなに合わせすぎて自分の望みが分からなくなることがある。一人の時間が足りなくなりがち。",
    howToTalk: "「他の人はどうでもいいとして、あなたはどうしたい？」と、主語を本人に戻し続ける。人の話になったら、そっと自分の話に引き戻す。",
    avoid: "「みんなのために」「協力しなきゃ」。もともとやりすぎているので、これを言うと余計に自分を後回しにする。",
    whenStuck: "一人になる時間を先に予定に入れる。人と離れると自分の望みが戻ってくるタイプ。",
  },
  鳳閣: {
    nature: "自然体で、楽しいことに素直に動ける人。難しく考えるより、面白いかどうかで判断する。無理や我慢を続けると急に力が抜ける。表現すること、味わうことが得意。",
    howToTalk: "軽く、遊びとして提案する。「やってみたら面白そうじゃない？」が一番効く。重い言葉や義務の話にすると逃げる。",
    avoid: "「ちゃんとやらないと」「責任がある」。義務にした瞬間に楽しさが消えて、動けなくなる。",
    whenStuck: "やることを小さくして、遊びに変える。「15分だけ、遊びとしてやってみる」が突破口。",
  },
  調舒: {
    nature: "感じる力が強く、細かいところまで気づく人。納得できないことを飲み込めない。孤独を感じやすいが、その感受性が表現の源になっている。中途半端が嫌い。",
    howToTalk: "感情を正面から受け止める。整理したり解決しようとせず、まず「それはしんどいね」と一緒にいる。理解されたと感じると一気に開く。",
    avoid: "「気にしすぎだよ」「前向きに考えよう」。感じたことを否定されると、心を閉じる。",
    whenStuck: "感じていることを全部言葉にする時間を取る。吐き出しきると自分で答えを見つける。",
  },
  禄存: {
    nature: "人に与えることで満たされる人。面倒見がよく、放っておけない。ただ、与えすぎて自分が空になりやすい。見返りがないと感じたときに、静かに疲れが溜まる。",
    howToTalk: "「もう十分やってるよ」と、まず認める。誰かのためではなく、自分のために何をしたいかを聞く。",
    avoid: "「もっと頑張れる」「あの人のために」。これを言うとさらに自分を削る。",
    whenStuck: "自分のためだけの小さなことを1つ決める。人のためを外すと動き出す。",
  },
  司禄: {
    nature: "こつこつ積み上げるのが得意な人。急な変化より、確実に続くことを選ぶ。家族や身近な人を大事にする。決めたことを毎日続ける力がある。先が見えないと不安になる。",
    howToTalk: "手順と見通しを具体的に示す。「まずこれ、次にこれ」と順番があると安心して動く。曖昧なままにしない。",
    avoid: "「とりあえずやってみよう」「なんとかなる」。見通しがない話は不安になるだけ。",
    whenStuck: "今日やる1つだけに絞って、いつやるかを決める。積み上げが始まれば強い。",
  },
  車騎: {
    nature: "動きながら考える人。まず体を動かすと調子が出る。まっすぐで嘘がつけない。じっとしていると調子が悪くなる。悩む前に動いたほうが結果が出るタイプ。",
    howToTalk: "考えさせずに、動く一歩を渡す。「じゃあ今から5分でこれだけやろう」が効く。長い説明はいらない。",
    avoid: "「よく考えてから」「もう少し様子を見よう」。止められると力が行き場を失う。",
    whenStuck: "体を動かす。歩く、片付ける、何でもいい。動き出すと頭も戻ってくる。",
  },
  牽牛: {
    nature: "きちんとしていたい人。責任を大事にし、周りの期待に応えようとする。恥ずかしい思いをすることを避ける。誇りが動く力になるが、それが重荷にもなる。",
    howToTalk: "正しさや誇りに触れる言い方をする。ただし、できていないことを指摘するのではなく、すでにできていることを認める。",
    avoid: "人前で否定すること、雑に扱うこと。「適当でいいよ」も、この人には手抜きの強要に聞こえる。",
    whenStuck: "完璧じゃなくていい範囲を、こちらから具体的に決めてあげる。「70点で出していい」と許可があると動ける。",
  },
  龍高: {
    nature: "知らない世界に惹かれる人。同じことの繰り返しに耐えられない。自分で確かめないと納得しない。型からはみ出すことで力を発揮する。変化があるほど元気になる。",
    howToTalk: "新しさ・未知の要素を混ぜて提案する。「やったことないけど、こうしてみたら？」に反応する。前例の話はしない。",
    avoid: "「普通はこうする」「決まりだから」。枠に入れられると一気に興味を失う。",
    whenStuck: "やり方を変えていいと伝える。同じ目的でも、違う道なら動ける。",
  },
  玉堂: {
    nature: "深く考え、筋道を大事にする人。納得できるまで理解したい。学ぶこと、伝えることが得意。感情より理屈で整理したほうが落ち着く。急かされると混乱する。",
    howToTalk: "理由をきちんと説明する。「なぜそうするのか」が分かれば自分から動く。感情論だけで押さない。",
    avoid: "「いいから今すぐやって」「理由はないけど」。納得のないまま動かされることに強く抵抗する。",
    whenStuck: "情報を集める時間を先に取る。分かった瞬間に一気に進む。",
  },
};

// ── 今の時期（12段階） ────────────────────────────────

export type Season = {
  /** ユーザーに見せてよい表現 */
  label: string;
  /** どんな時期か（AI への内部指示） */
  meaning: string;
  /** この時期に合う動き方 */
  advice: string;
};

/**
 * 12段階の「時期」。専門用語は一切使わず、季節の言葉に翻訳してある。
 * 配列の順番が、そのまま巡ってくる順番。
 */
const SEASONS: Season[] = [
  { label: "芽吹きの時期", meaning: "新しいものが生まれ始めている。まだ形にはなっていない。", advice: "小さく始めるのに向いている。完成させようとしなくていい。" },
  { label: "揺れやすい時期", meaning: "気持ちが定まりにくい。迷いや揺らぎが出やすい。", advice: "大きな決断は先送りしていい。揺れているのが自然な時期。" },
  { label: "形になり始める時期", meaning: "やってきたことが少しずつ見える形になる。", advice: "人に見せてみるといい。反応が次の材料になる。" },
  { label: "力が満ちる時期", meaning: "自分の力で動かせる感覚がある。手応えが出る。", advice: "やりたかったことに手をつけるなら今。" },
  { label: "いちばん強い時期", meaning: "エネルギーが最も高い。押し切れる。", advice: "大きく動いていい。ただし周りへの配慮を忘れずに。" },
  { label: "ゆるめる時期", meaning: "張っていたものが緩む。少し落ち着いてくる。", advice: "広げるより、整えるほうが合っている。" },
  { label: "内側を見る時期", meaning: "外に向かう力が落ちて、内側に意識が向く。", advice: "無理に動かず、感じていることを言葉にするといい。" },
  { label: "手放す時期", meaning: "終わるものが出てくる。抱えていたものが離れていく。", advice: "終わらせることを怖がらなくていい。空いたところに次が入ってくる。" },
  { label: "蓄える時期", meaning: "動きは少ないが、内側に溜まっている。", advice: "休むこと・学ぶことに時間を使うと後で効いてくる。" },
  { label: "空っぽになる時期", meaning: "何も残っていない感じがする。力が入らない。", advice: "何もしないことを自分に許す。ここで無理をすると長引く。" },
  { label: "種が宿る時期", meaning: "まだ形はないが、次のものが静かに始まっている。", advice: "やりたいことの気配を、書き留めておくだけでいい。" },
  { label: "育てる時期", meaning: "守られながら、少しずつ育っていく。", advice: "急がず、続けられる形を作るのに向いている。" },
];

// ── 計算 ────────────────────────────────────────────

function toJulianDayNumber(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** 生まれた日から、10タイプのどれかを出す */
function getStemIndex(year: number, month: number, day: number): number {
  const diff = Math.floor(
    toJulianDayNumber(year, month, day) - toJulianDayNumber(1900, 1, 1),
  );
  const i = ((diff % 10) + 6) % 10;
  return i >= 0 ? i : i + 10;
}

function getBranchIndex(year: number, month: number, day: number): number {
  const diff = Math.floor(
    toJulianDayNumber(year, month, day) - toJulianDayNumber(1900, 1, 1),
  );
  const i = diff % 12;
  return i >= 0 ? i : i + 12;
}

/**
 * 時期の起点。生まれた日のタイプごとに、12段階のどこから始まるかが決まる。
 * 偶数番目のタイプは順回り、奇数番目は逆回り。
 */
const SEASON_START_BRANCH = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 各タイプの「芽吹き」に当たる月
const IS_FORWARD = [true, false, true, false, true, false, true, false, true, false];

/** その月が12段階のどこか（1月=丑 … 12月=子 の簡易対応） */
function monthBranchIndex(month: number): number {
  return (month + 1) % 12;
}

export type StarReading = {
  /** 10タイプのどれか（内部用。ユーザーには出さない） */
  type: StarType;
  profile: StarProfile;
  /** 今月の時期 */
  season: Season;
};

/**
 * 生年月日と、判定したい年月から「星」を読む。
 * @param birth "YYYY-MM-DD"
 * @param at    判定する日（省略時は今日）
 */
export function readStar(birth: string, at?: Date): StarReading | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth?.trim() ?? "");
  if (!m) return null;
  const [, ys, ms, ds] = m;
  const y = Number(ys), mo = Number(ms), d = Number(ds);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const stem = getStemIndex(y, mo, d);
  const type = STAR_ORDER[stem];

  const now = at ?? new Date();
  const nowBranch = monthBranchIndex(now.getMonth() + 1);
  const start = SEASON_START_BRANCH[stem];
  const step = IS_FORWARD[stem]
    ? (nowBranch - start + 12) % 12
    : (start - nowBranch + 12) % 12;

  return { type, profile: STAR_PROFILES[type], season: SEASONS[step] };
}

/** 生年月日が正しい形かどうか */
export function isValidBirth(birth: string): boolean {
  return readStar(birth) !== null;
}

// ── 周期（アカシックレコーダー：年・3ヶ月・月・週・日） ──────────

/** その人（日干）にとって、ある「支」がどの時期段階か */
function stageSeason(stem: number, branch: number): Season {
  const start = SEASON_START_BRANCH[stem];
  const step = IS_FORWARD[stem] ? (branch - start + 12) % 12 : (start - branch + 12) % 12;
  return SEASONS[step];
}

function yearBranchIndex(year: number): number {
  return ((year - 4) % 12 + 12) % 12; // 子=西暦%12==4
}

/** 週の頭（月曜）を返す */
function mondayOf(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 月=0
  x.setDate(x.getDate() - dow);
  return x;
}

export type Cycle = { key: string; period: string; season: Season };

/**
 * 生年月日から、いまの「年・3ヶ月・月・週・今日」の周期をまとめて出す。
 * すべて同じ12段階モデルで、時間スケールだけ変えている。
 * 誕生日が無い/不正なら null。
 */
export function computeCycles(birth: string | null | undefined, at?: Date): Cycle[] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth?.trim() ?? "");
  if (!m) return null;
  const [, ys, ms, ds] = m;
  const stem = getStemIndex(Number(ys), Number(ms), Number(ds));

  const now = at ?? new Date();
  const y = now.getFullYear();
  const mo = now.getMonth() + 1;
  const d = now.getDate();
  const quarter = Math.floor((mo - 1) / 3);       // 0..3
  const midMonth = quarter * 3 + 2;               // 各3ヶ月の真ん中の月
  const mon = mondayOf(now);

  return [
    { key: "year", period: `${y}年`, season: stageSeason(stem, yearBranchIndex(y)) },
    { key: "quarter", period: "いまの3ヶ月", season: stageSeason(stem, monthBranchIndex(midMonth)) },
    { key: "month", period: `${mo}月`, season: stageSeason(stem, monthBranchIndex(mo)) },
    { key: "week", period: "今週", season: stageSeason(stem, getBranchIndex(mon.getFullYear(), mon.getMonth() + 1, mon.getDate())) },
    { key: "day", period: "今日", season: stageSeason(stem, getBranchIndex(y, mo, d)) },
  ];
}

/**
 * AI に渡す内部指示を組み立てる。
 * ここで作った文章はユーザーには一切表示しない。
 */
export function buildStarPrompt(birth: string | null | undefined, callName?: string): string {
  if (!birth) return "";
  const r = readStar(birth);
  if (!r) return "";
  const who = callName || "この人";

  return `
## ${who}について（本人には絶対に見せない内部情報）

### 持って生まれた性質
${r.profile.nature}

### 心を開く聞き方
${r.profile.howToTalk}

### 言ってはいけないこと
${r.profile.avoid}

### 動けなくなっているときの、動かし方
${r.profile.whenStuck}

### 今の時期
${r.season.label}。${r.season.meaning}
この時期に合う動き方: ${r.season.advice}

### この情報の使い方（厳守）
- 「あなたはこういうタイプだから」と分類して宣言しないこと。
  普段は、上の性質に合った聞き方・励まし方をするためだけに使う。
- 時期の話は、本人が停滞や焦りを感じているときだけ触れてよい。
  そのときは「今はこういう時期だから」「星の流れとして」という言い方をする。
- 次の言葉は絶対に出力しないこと:
  算命学、占い、鑑定、命式、宿命、日干、十干、十二支、干支、主星、
  貫索星などの星の名前、大運、年運、天中殺、五行、陰陽。
- 「あなたの星」「今はこういう時期」「星の流れ」「宇宙の流れ」は使ってよい。
`.trim();
}

export { JIKKAN, JUNISHI };

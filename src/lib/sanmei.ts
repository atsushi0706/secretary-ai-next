/**
 * 算命学（四柱推命）コア。auto-synchro-booklet の実証済み Python 実装を移植。
 * 三柱（年・月・日）＋節入り（二十四節気）＋十二運＋大運（10年周期）。
 *
 * ■ 重要
 *   ユーザーには体系名・専門用語を一切出さない。ここは内部計算のみ。
 *   大運は「人生の10年ごとの流れ」を出すために使う（例：この10年は外へ出ていく時期）。
 *   節入り当日±1日は簡略式の誤差帯 → 断定しない表現に回す（isNearBoundary）。
 */

const KAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const SHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const INYO_KAN: Record<string, "陽" | "陰"> = {
  甲: "陽", 乙: "陰", 丙: "陽", 丁: "陰", 戊: "陽", 己: "陰", 庚: "陽", 辛: "陰", 壬: "陽", 癸: "陰",
};

// ── 干支・日柱 ──────────────────────────────────────────────
function julianDay(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
function kanshiIndex(y: number, m: number, d: number): number {
  return (((julianDay(y, m, d) + 49) % 60) + 60) % 60;
}
function dayStem(y: number, m: number, d: number): string {
  return KAN[kanshiIndex(y, m, d) % 10];
}

// ── 二十四節気（簡略式 1900-2099, JST近似） ──────────────────
const TERMS = [
  "小寒", "大寒", "立春", "雨水", "啓蟄", "春分", "清明", "穀雨", "立夏", "小満", "芒種", "夏至",
  "小暑", "大暑", "立秋", "処暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
];
const SETSU_TO_SHI: Record<string, string> = {
  立春: "寅", 啓蟄: "卯", 清明: "辰", 立夏: "巳", 芒種: "午", 小暑: "未",
  立秋: "申", 白露: "酉", 寒露: "戌", 立冬: "亥", 大雪: "子", 小寒: "丑",
};
const C19 = [6.11, 20.84, 4.6295, 19.4599, 6.3826, 21.4155, 5.59, 20.888, 6.318, 21.86, 6.5, 22.20, 7.928, 23.65, 8.35, 23.95, 8.44, 23.822, 9.098, 24.218, 8.218, 23.08, 7.9, 22.60];
const C20 = [5.4055, 20.12, 3.87, 18.73, 5.63, 20.646, 4.81, 20.1, 5.52, 21.04, 5.678, 21.37, 7.108, 22.83, 7.5, 23.13, 7.646, 23.042, 8.318, 23.438, 7.438, 22.36, 7.18, 21.94];
const MONTH_OF_TERM = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12];

function termDay(year: number, ti: number): number {
  let C: number, Y: number;
  if (year <= 2000) { C = C19[ti]; Y = year - 1900; }
  else { C = C20[ti]; Y = year - 2000; }
  const leap = ti <= 3 ? Math.floor((Y - 1) / 4) : Math.floor(Y / 4);
  return Math.floor(C + 0.2422 * Y - leap);
}
function termDate(year: number, ti: number): [number, number, number] {
  return [year, MONTH_OF_TERM[ti], termDay(year, ti)];
}
function ymdKey(y: number, m: number, d: number): number { return y * 10000 + m * 100 + d; }

function pillarYear(y: number, m: number, d: number): number {
  const [ry, rm, rd] = termDate(y, 2); // 立春
  return ymdKey(y, m, d) < ymdKey(ry, rm, rd) ? y - 1 : y;
}
function yearStem(setsuYear: number): string {
  return KAN[(((setsuYear - 4) % 10) + 10) % 10];
}
function monthBranch(y: number, m: number, d: number): string {
  const key = ymdKey(y, m, d);
  const setsuIdx = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  let current = "丑";
  let found: string | null = null;
  for (const ti of setsuIdx) {
    const [ty, tm, td] = termDate(y, ti);
    if (key >= ymdKey(ty, tm, td)) found = TERMS[ti];
  }
  if (found && SETSU_TO_SHI[found]) current = SETSU_TO_SHI[found];
  else if (found === "小寒") current = "丑";
  if (m === 1) {
    const [sy, sm, sd] = termDate(y, 0);
    if (key < ymdKey(sy, sm, sd)) current = "子";
  }
  return current;
}
function monthPillar(yk: string, msh: string): [string, string] {
  const toraStart: Record<string, string> = { 甲: "丙", 己: "丙", 乙: "戊", 庚: "戊", 丙: "庚", 辛: "庚", 丁: "壬", 壬: "壬", 戊: "甲", 癸: "甲" };
  const startIdx = KAN.indexOf(toraStart[yk]);
  const steps = ((SHI.indexOf(msh) - SHI.indexOf("寅")) % 12 + 12) % 12;
  return [KAN[(startIdx + steps) % 10], msh];
}

export function isNearBoundary(y: number, m: number, d: number): boolean {
  for (let ti = 0; ti < 24; ti++) {
    const [, tm, td] = termDate(y, ti);
    if (tm === m && Math.abs(td - d) <= 1) return true;
  }
  return false;
}

// ── 十二運（人生のエネルギー段階） ──────────────────────────
const UNSEI_ORDER = ["長生", "沐浴", "冠帯", "建禄", "帝旺", "衰", "病", "死", "墓", "絶", "胎", "養"];
const CHOSEI_SHI: Record<string, string> = { 甲: "亥", 乙: "午", 丙: "寅", 丁: "酉", 戊: "寅", 己: "酉", 庚: "巳", 辛: "子", 壬: "申", 癸: "卯" };
function juniunIndex(nikkan: string, shi: string): number {
  const start = SHI.indexOf(CHOSEI_SHI[nikkan]);
  const forward = INYO_KAN[nikkan] === "陽";
  return forward ? ((SHI.indexOf(shi) - start) % 12 + 12) % 12 : ((start - SHI.indexOf(shi)) % 12 + 12) % 12;
}

/** 十二運 → 人生フェーズの言葉（体系名・専門用語なし） */
const LIFE_PHASE: { label: string; meaning: string }[] = [
  { label: "芽吹きの時期", meaning: "新しい流れが始まる。育て始める、種をまく10年。" },
  { label: "揺れながら磨かれる時期", meaning: "定まりにくく、迷いや揺れが出やすい。試行錯誤で自分を探す10年。" },
  { label: "形になっていく時期", meaning: "自分が整い、外へ出る準備が進む。輪郭がはっきりしていく10年。" },
  { label: "地に足がつく時期", meaning: "力が定まり、社会の中で自分の場を築いていく10年。" },
  { label: "外へ出ていく時期", meaning: "最も力が出る。世界へ出ていく、広げる、絶頂の10年。" },
  { label: "ゆるめて整える時期", meaning: "張りが少しゆるむ。広げるより、整え深める10年。" },
  { label: "内側を見る時期", meaning: "外へ向かう力が落ち着き、内省が深まる。立ち止まって見つめる10年。" },
  { label: "手放す時期", meaning: "一区切り。抱えていたものを手放す、終わりと始まりの10年。" },
  { label: "蓄える時期", meaning: "まとめて、蓄える。次への土台をつくる、静かな10年。" },
  { label: "リセットの時期", meaning: "ゼロに戻る。まだ形にならない、切り替わりの10年。" },
  { label: "種が宿る時期", meaning: "次の芽の気配が生まれる。新しい何かが静かに始まる10年。" },
  { label: "育てて備える時期", meaning: "守られながら育つ。準備と充電の10年。" },
];

// ── 大運（10年周期） ────────────────────────────────────────
function nextSetsuJdn(y: number, m: number, d: number, forward: boolean): number {
  const setsuIdx = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const birth = julianDay(y, m, d);
  const cands: number[] = [];
  for (const yr of [y - 1, y, y + 1]) {
    for (const ti of setsuIdx) {
      const [ty, tm, td] = termDate(yr, ti);
      cands.push(julianDay(ty, tm, td));
    }
  }
  cands.sort((a, b) => a - b);
  if (forward) {
    for (const c of cands) if (c > birth) return c;
  } else {
    for (let i = cands.length - 1; i >= 0; i--) if (cands[i] <= birth) return cands[i];
  }
  return birth;
}

export type LifePeriod = {
  ageStart: number;
  ageEnd: number;
  label: string;
  meaning: string;
  isCurrent: boolean;
};

export type LifeReading = {
  startAge: number;
  periods: LifePeriod[];
  currentIndex: number;
  nearBoundary: boolean;
};

/**
 * 大運（人生の10年ごとの流れ）を読む。
 * @param birth  "YYYY-MM-DD"
 * @param gender "male" | "female"（順行/逆行に必要）
 * @param at     判定する日（現在の年齢を出すため）
 */
export function computeLife(
  birth: string | null | undefined,
  gender: "male" | "female" | null | undefined,
  at?: Date,
): LifeReading | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth?.trim() ?? "");
  if (!m || !gender) return null;
  const by = Number(m[1]), bm = Number(m[2]), bd = Number(m[3]);
  if (bm < 1 || bm > 12 || bd < 1 || bd > 31) return null;

  const nikkan = dayStem(by, bm, bd);
  const py = pillarYear(by, bm, bd);
  const yk = yearStem(py);
  const [, msh] = monthPillar(yk, monthBranch(by, bm, bd));
  const monthKanshi = KAN.indexOf(monthPillar(yk, monthBranch(by, bm, bd))[0]) + 0; // 使わないが月柱確定用
  void monthKanshi;

  // 順行/逆行：年干が陽で男 or 陰で女 → 順行
  const yangYear = INYO_KAN[yk] === "陽";
  const forward = (yangYear && gender === "male") || (!yangYear && gender === "female");

  // 立運数：出生から節入りまでの日数 ÷ 3
  const birthJdn = julianDay(by, bm, bd);
  const setsuJdn = nextSetsuJdn(by, bm, bd, forward);
  const days = Math.abs(setsuJdn - birthJdn);
  let startAge = Math.round(days / 3);
  if (startAge < 1) startAge = 1;

  // 月柱の干支序数を基点に、方向へ1つずつ進める
  const monthShiIdx = SHI.indexOf(msh);
  const monthKanIdx = KAN.indexOf(monthPillar(yk, msh)[0]);
  // 月柱を60干支序数へ
  let monthKanshiIdx = -1;
  for (let i = 0; i < 60; i++) if (i % 10 === monthKanIdx && i % 12 === monthShiIdx) { monthKanshiIdx = i; break; }

  const now = at ?? new Date();
  const age = now.getFullYear() - by - (
    now.getMonth() + 1 < bm || (now.getMonth() + 1 === bm && now.getDate() < bd) ? 1 : 0
  );

  const periods: LifePeriod[] = [];
  let currentIndex = 0;
  for (let i = 0; i < 9; i++) {
    const dir = forward ? 1 : -1;
    const idx = (((monthKanshiIdx + dir * (i + 1)) % 60) + 60) % 60;
    const branch = SHI[idx % 12];
    const phase = LIFE_PHASE[juniunIndex(nikkan, branch)];
    const aS = startAge + 10 * i;
    const aE = aS + 10;
    const isCur = age >= aS && age < aE;
    if (isCur) currentIndex = i;
    periods.push({ ageStart: aS, ageEnd: aE, label: phase.label, meaning: phase.meaning, isCurrent: isCur });
  }

  return { startAge, periods, currentIndex, nearBoundary: isNearBoundary(by, bm, bd) };
}

/* ══════════════════════════════════════════════════════════════
   鑑定に使う材料をまとめて取り出す（取扱説明書用）

   これまでは「星10種＋今の10年」しか渡しておらず、鑑定が浅くなっていた。
   本来の鑑定は、三柱・五行の偏り・エネルギーの段階・10年ごとの流れを
   突き合わせて読む。ここでその材料を全部そろえる。
   ※ ユーザーには専門用語を出さない。AIへの内部資料としてだけ使う。
   ══════════════════════════════════════════════════════════════ */

export type Chart = {
  /** 三柱（内部用） */
  year: { kan: string; shi: string };
  month: { kan: string; shi: string };
  day: { kan: string; shi: string };
  /** 日干＝その人の本質 */
  nikkan: string;
  /** 五行の数（多い＝強く出る／0＝欠けている） */
  gogyo: Record<"木" | "火" | "土" | "金" | "水", number>;
  /** 多すぎるもの・欠けているもの */
  strong: string[];
  missing: string[];
  /** 生まれ持ったエネルギーの段階（十二運・日支基準） */
  energy: { label: string; meaning: string };
  /** 節入り際で計算がぶれる生まれか */
  nearBoundary: boolean;
};

const KAN_GOGYO: Record<string, "木" | "火" | "土" | "金" | "水"> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土", 己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};
const SHI_GOGYO: Record<string, "木" | "火" | "土" | "金" | "水"> = {
  寅: "木", 卯: "木", 巳: "火", 午: "火", 申: "金", 酉: "金", 亥: "水", 子: "水",
  辰: "土", 戌: "土", 丑: "土", 未: "土",
};

/** 日支から見た十二支（日柱の地支）を出す */
function dayBranch(y: number, m: number, d: number): string {
  return SHI[kanshiIndex(y, m, d) % 12];
}

/** 生年月日から命式の材料をそろえる */
export function computeChart(birth: string | null | undefined): Chart | null {
  const m0 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth?.trim() ?? "");
  if (!m0) return null;
  const y = Number(m0[1]), mo = Number(m0[2]), d = Number(m0[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const py = pillarYear(y, mo, d);
  const yk = yearStem(py);
  const ysh = SHI[(((py - 4) % 12) + 12) % 12];
  const [mk, msh] = monthPillar(yk, monthBranch(y, mo, d));
  const dk = dayStem(y, mo, d);
  const dsh = dayBranch(y, mo, d);

  const gogyo = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const k of [yk, mk, dk]) gogyo[KAN_GOGYO[k]]++;
  for (const s of [ysh, msh, dsh]) gogyo[SHI_GOGYO[s]]++;

  const entries = Object.entries(gogyo) as ["木" | "火" | "土" | "金" | "水", number][];
  const strong = entries.filter(([, n]) => n >= 3).map(([k]) => k);
  const missing = entries.filter(([, n]) => n === 0).map(([k]) => k);

  const energy = LIFE_PHASE[juniunIndex(dk, dsh)];

  return {
    year: { kan: yk, shi: ysh },
    month: { kan: mk, shi: msh },
    day: { kan: dk, shi: dsh },
    nikkan: dk,
    gogyo,
    strong,
    missing,
    energy,
    nearBoundary: isNearBoundary(y, mo, d),
  };
}

/** 日干（本質）の読み。専門用語を出さず、性質だけを日常語で */
export const NIKKAN_NATURE: Record<string, { core: string; work: string; caution: string }> = {
  甲: { core: "まっすぐ伸びる大木。曲がることを嫌い、正面から進む。頼られると強い。", work: "旗を立てる／先頭に立つ／組織を育てる／教える", caution: "折れるまで曲げないので、無理が限界まで見えにくい" },
  乙: { core: "しなやかな草花。折れずに巻きつき、環境に合わせて生き延びる。", work: "調整する／間をつなぐ／育てる／細やかな仕事", caution: "合わせすぎて、自分の望みが分からなくなる" },
  丙: { core: "太陽。惜しみなく照らし、いるだけで場が明るくなる。裏表がない。", work: "人前に出る／広める／盛り上げる／看板になる", caution: "照らし続けて燃え尽きる。陰の努力が見えにくい" },
  丁: { core: "灯火。小さくでも暗がりを照らす。一点を深く温める。", work: "一対一で寄り添う／専門を極める／文章・表現", caution: "気が回りすぎて消耗する。嫉妬を抱えやすい" },
  戊: { core: "山。動かない安心感。時間をかけて大きなものを築く。", work: "土台をつくる／守る／長期の事業／不動のポジション", caution: "動き出しが遅く、一度決めると変えにくい" },
  己: { core: "畑の土。何を植えても育てる。人を伸ばす力がある。", work: "育成／裏方／整える／人の可能性を引き出す", caution: "抱え込みすぎる。自分の作物を持ち忘れる" },
  庚: { core: "鋼。曲がらない。白黒つける強さと、切り開く力。", work: "決断する／改革する／勝負する／技術を磨く", caution: "強さが人を傷つける。柔らかい場面で浮く" },
  辛: { core: "宝石。磨けば磨くほど光る。繊細で、美意識が鋭い。", work: "美しさを扱う／細部を仕上げる／人を魅せる", caution: "傷つきやすく、雑に扱われることに耐えられない" },
  壬: { core: "大河・海。境界を越えて流れる。自由と広さを求める。", work: "越境する／広い世界を見る／流れをつくる／発信", caution: "留まれず、深い関係を築く前に流れてしまう" },
  癸: { core: "雨・雫。静かに深く染み込む。感受性が高く、察しがいい。", work: "感じ取る／癒やす／研究する／内面を扱う", caution: "受け取りすぎて、人の感情まで自分のものにする" },
};

/** 五行の欠け・過多が示すもの（内部資料） */
export const GOGYO_MEANING: Record<string, { much: string; none: string }> = {
  木: { much: "伸びる力が強く、方向が決まると速い。ただし折り合いが苦手", none: "始める勢いが出にくい。誰かの号令があると動ける" },
  火: { much: "熱量と表現力。人を巻き込むが、消耗も激しい", none: "自分を見せるのが苦手。表に出す場を意識的に作る必要がある" },
  土: { much: "安定と受容。動かない強さがあるが、腰が重い", none: "土台が揺れやすい。習慣と居場所を先に作ると安定する" },
  金: { much: "決断力と鋭さ。切り分けるのが得意だが、当たりが強くなる", none: "断ることが苦手。線を引く練習が要る" },
  水: { much: "柔軟さと知性。流れに乗るが、留まるのが苦手", none: "溜め込みやすい。流す・出す習慣が効く" },
};

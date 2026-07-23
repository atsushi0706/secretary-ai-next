"use client";

/**
 * 感情の10段階メーター。
 * 落ち着いている（緑）→ ふつう（黄）→ しんどい・波がある（赤）。
 * 各段階に名前を付けて、いまどのへんかが一目で分かるようにする。クリックで選ぶ。
 */

export const EMO_LEVELS: { n: number; name: string }[] = [
  { n: 1, name: "究極に落ち着いている" },
  { n: 2, name: "とても穏やか" },
  { n: 3, name: "落ち着いている" },
  { n: 4, name: "わりと穏やか" },
  { n: 5, name: "ふつう" },
  { n: 6, name: "少しざわつく" },
  { n: 7, name: "ざわついている" },
  { n: 8, name: "かなり波立っている" },
  { n: 9, name: "強く揺れている" },
  { n: 10, name: "究極に感情の波がある" },
];

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

/** 1(緑) → 5(黄) → 10(赤) のグラデーション */
export function emoColor(n: number): string {
  const t = Math.max(0, Math.min(1, (n - 1) / 9));
  const green = [63, 174, 90], yellow = [230, 192, 46], red = [224, 80, 58];
  let r, g, b;
  if (t < 0.5) {
    const u = t * 2;
    r = lerp(green[0], yellow[0], u); g = lerp(green[1], yellow[1], u); b = lerp(green[2], yellow[2], u);
  } else {
    const u = (t - 0.5) * 2;
    r = lerp(yellow[0], red[0], u); g = lerp(yellow[1], red[1], u); b = lerp(yellow[2], red[2], u);
  }
  return `rgb(${r},${g},${b})`;
}

export function emoName(n: number): string {
  return EMO_LEVELS.find((e) => e.n === n)?.name ?? "";
}

export function EmotionMeter({
  value, onChange, title = "いまの感情の波",
}: {
  value: number | null;
  onChange: (n: number) => void;
  title?: string;
}) {
  return (
    <div className="emeter">
      <div className="emeter-head">
        <span className="emeter-title">{title}</span>
        {value != null && (
          <span className="emeter-now" style={{ color: emoColor(value) }}>
            {value}．{emoName(value)}
          </span>
        )}
      </div>

      {/* グラデーションのゲージ本体（クリックで選ぶ） */}
      <div className="emeter-bar">
        {EMO_LEVELS.map((e) => {
          const on = value === e.n;
          return (
            <button
              key={e.n}
              className={`emeter-seg ${on ? "is-on" : ""}`}
              style={{ background: emoColor(e.n) }}
              onClick={() => onChange(e.n)}
              title={`${e.n}. ${e.name}`}
              aria-label={`${e.n} ${e.name}`}
            >
              <span className="num">{e.n}</span>
              {on && <span className="needle" />}
            </button>
          );
        })}
      </div>

      <div className="emeter-ends">
        <span>落ち着き</span>
        <span>ふつう</span>
        <span>波がある</span>
      </div>
    </div>
  );
}

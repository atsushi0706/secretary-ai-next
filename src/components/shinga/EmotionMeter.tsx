"use client";

/**
 * 感情の10段階メーター。
 * 落ち着いている（緑）→ ふつう（黄）→ しんどい・波がある（赤）。
 * 各段階に名前を付けて、いまどのへんかが一目で分かるようにする。クリックで選ぶ。
 */

export const EMO_LEVELS: { n: number; name: string }[] = [
  { n: 1, name: "すごく穏やか" },
  { n: 2, name: "穏やか" },
  { n: 3, name: "落ち着いている" },
  { n: 4, name: "わりと落ち着き" },
  { n: 5, name: "ふつう" },
  { n: 6, name: "少しモヤモヤ" },
  { n: 7, name: "モヤモヤする" },
  { n: 8, name: "しんどい" },
  { n: 9, name: "かなりしんどい" },
  { n: 10, name: "もう限界" },
];

function lerp(a: number, b: number, t: number) { return Math.round(a + (b - a) * t); }

/** 緑 → 黄 → 橙 → 赤 の4色グラデーション（橙もちゃんと入れる） */
export function emoColor(n: number): string {
  const t = Math.max(0, Math.min(1, (n - 1) / 9));
  const stops = [
    [63, 174, 90],   // 緑
    [230, 200, 50],  // 黄
    [232, 140, 42],  // 橙（だいだい）
    [214, 60, 50],   // 赤
  ];
  const seg = Math.min(2, Math.floor(t * 3)); // 0,1,2 の3区間
  const u = t * 3 - seg;
  const a = stops[seg], b = stops[seg + 1];
  return `rgb(${lerp(a[0], b[0], u)},${lerp(a[1], b[1], u)},${lerp(a[2], b[2], u)})`;
}

export function emoName(n: number): string {
  return EMO_LEVELS.find((e) => e.n === n)?.name ?? "";
}

export function EmotionMeter({
  value, onChange, title = "いまの気分は？",
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
        <span>穏やか</span>
        <span>ふつう</span>
        <span>しんどい</span>
      </div>
    </div>
  );
}

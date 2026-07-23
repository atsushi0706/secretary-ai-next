import Link from "next/link";

/**
 * アプリ最上位の領域切り替え（リアルバース / インナーワールド）。
 *
 * - リアルバース = 青い海と島々の世界（PLAN IT. DO IT. BECOME IT.）
 * - インナーワールド = 心の宝の地図（EXPLORE. HEAL. REMEMBER. BECOME.）
 * - 既存の秘書AIトップ（リアルバース）のレイアウトを崩さないよう、
 *   コンテンツの一番上に置くだけの独立コンポーネントにしている。
 * - クエストはインナーワールド内の機能なので、ここには出さない。
 */
export type Realm = "realverse" | "shinga";

const REALMS: Array<{ key: Realm; href: string; emoji: string; label: string; tag: string }> = [
  {
    key: "realverse",
    href: "/",
    emoji: "🧭",
    label: "リアルバース",
    tag: "Plan it. Do it. Become it.",
  },
  {
    key: "shinga",
    href: "/shinga",
    emoji: "🔑",
    label: "インナーワールド",
    tag: "Explore. Heal. Remember. Become.",
  },
];

export function RealmNav({ active }: { active: Realm }) {
  return (
    <nav className="mb-3">
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-purple-100 shadow-sm">
        {REALMS.map((r) => {
          const on = r.key === active;
          const tone = on
            ? r.key === "shinga"
              ? "realm-tab-singa-on"
              : "realm-tab-realverse-on"
            : "realm-tab-off";
          return (
            <Link
              key={r.key}
              href={r.href}
              aria-current={on ? "page" : undefined}
              className={`realm-tab ${tone}`}
            >
              <div className="realm-name truncate">
                <span className="mr-1">{r.emoji}</span>
                {r.label}
              </div>
              <div className="realm-tag truncate">{r.tag}</div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

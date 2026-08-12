/**
 * 「どんな感覚？」の絵。
 *
 * ピークステートで吸ってインストールする感情は、その日によって変わる。
 * 言葉（「コップに水が静かに満ちて…」）だけだと、体に入る前に読み流される。
 * だから **その文章のとおりの絵** を、静かに動かして見せる。
 *
 * 【守ったこと】
 * ・**文章と絵を一致させる。** 「コップに水が満ちる」なら、本当にコップに水が満ちる。
 *   それっぽい光をふわふわさせるだけ、は雑（淳くんの指摘）。
 * ・**一目で何の絵か分かること。** 描いたあと必ず画で確認して、
 *   読めないもの（手が桶に見える・扉が柱に見える等）は描き直した。
 * ・呼吸の邪魔をしない。ゆっくり・小さく・繰り返す。目を奪わない。
 * ・OSで「動きを減らす」にしている人には、**動かない完成形**を見せる（絵は消さない）。
 *
 * 絵は感情ごとに feelGuide.ts の scene で決まる。ここに無い感情は warm（胸に広がる熱）。
 */

export type SceneKey =
  | "fill" | "gatherFill" | "openHand" | "radiate" | "ground" | "sky"
  | "bubbles" | "still" | "spine" | "pillar" | "catch" | "dawn"
  | "flame" | "lift" | "space" | "thread" | "sunspot" | "settle"
  | "door" | "clear" | "draw" | "tree" | "warm";

/** 立っている人。どこに起きる感覚かを外さないために、多くの絵で共通に使う */
function Body({ x = 100, y = 0 }: { x?: number; y?: number }) {
  return (
    <g className="fs-body" transform={`translate(${x - 100} ${y})`}>
      <circle cx="100" cy="28" r="11" />
      <path d="M100 39 V80" />
      <path d="M100 52 L84 62 M100 52 L116 62" />
      <path d="M100 80 L89 108 M100 80 L111 108" />
    </g>
  );
}

/**
 * 手のかたち。手のひらと指がひと続きの輪郭。
 * 指が上を向いた状態で、だいたい (78,32)〜(122,114) に収まる。
 * 「解放（ひらく手）」「安心（背中を支える手）」「信頼（受け止める手）」で、
 * 向きと大きさだけ変えて使い回す（**ちゃんと手に見える形をひとつ**作って共有する）。
 */
const HAND_D = "M82 112 q-5 -16 -1 -28"
  + " q1 -6 5 -6 q4 0 5 6 l1 8"
  + " l1 -30 q0 -6 5 -6 q5 0 5 6 l1 30 l1 -34"
  + " q0 -6 5 -6 q5 0 5 6 l1 34 l2 -26"
  + " q1 -6 5 -5 q4 1 4 7 l-2 24"
  + " q0 12 -4 20 z";
/** 親指（手のひらの左下から出る） */
const THUMB_D = "M83 92 q-12 -2 -18 -10";

/* ══ それぞれの絵 ══════════════════════════════════════════ */

const SCENES: Record<SceneKey, () => React.ReactElement> = {
  /** 充足：コップに水が静かに満ちて、もう何も足さなくていい */
  fill: () => (
    <>
      <path className="fs-line" d="M72 34 L80 106 h40 l8 -72" />
      <clipPath id="fsGlass"><path d="M73 36 L81 104 h38 l8 -68 z" /></clipPath>
      <g clipPath="url(#fsGlass)">
        <rect className="fs-water" x="60" y="34" width="80" height="80" />
        <rect className="fs-water-top" x="60" y="34" width="80" height="2" />
      </g>
      <path className="fs-line fs-rim" d="M72 34 h56" />
      {/* 満ちきったら、上でひとつだけ光る（もう足さなくていい合図） */}
      <circle className="fs-done" cx="100" cy="22" r="3.4" />
    </>
  ),

  /** 感謝：受け取ってきたものが胸に集まり、静かに満ちる */
  gatherFill: () => (
    <>
      <Body />
      <circle className="fs-chest-fill" cx="100" cy="56" r="17" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle key={i} className={`fs-mote fs-m${i}`} cx="100" cy="56" r="3.2" />
      ))}
      <circle className="fs-chest-core" cx="100" cy="56" r="5" />
    </>
  ),

  /** 解放：ずっと握っていた手を開いて、風が通り抜ける */
  openHand: () => (
    <>
      <g className="fs-palm">
        <path className="fs-line fs-hand-out" d={HAND_D} />
        <path className="fs-line fs-f0" d={THUMB_D} />
      </g>
      {[0, 1, 2].map((i) => (
        <path key={i} className={`fs-wind fs-w${i}`} d="M16 0 q32 -9 64 0 q32 9 64 0" />
      ))}
    </>
  ),

  /** 慈愛・愛：胸から温かい光がふわっと放たれて、まわりを包む */
  radiate: () => (
    <>
      {[0, 1, 2].map((i) => (
        <circle key={i} className={`fs-ring fs-r${i}`} cx="100" cy="56" r="16" />
      ))}
      <Body />
      <circle className="fs-chest" cx="100" cy="56" r="7" />
    </>
  ),

  /**
   * 安心：足の裏が地面にぴったりつき、背中を支えられている。
   *
   * 手は指を上に向けて、背中にそえる（横に倒すと👎の絵文字に見えた）。
   *
   * ※ 外側の g で動かし、内側の g で置いている。
   *   ひとつの g にまとめると、CSSのアニメ（transform）が
   *   SVGの配置（transform属性）を**丸ごと打ち消して**、手が原寸で真ん中に出る。
   */
  ground: () => (
    <>
      <g className="fs-support">
        <g transform="translate(112 64) scale(.46) translate(-100 -74)">
          <path d={HAND_D} />
          <path d={THUMB_D} />
        </g>
      </g>
      <Body />
      <path className="fs-ground" d="M40 110 h120" />
      <path className="fs-sole" d="M83 109 h12" />
      <path className="fs-sole fs-sole2" d="M105 109 h12" />
      <ellipse className="fs-soleglow" cx="100" cy="110" rx="26" ry="4" />
    </>
  ),

  /**
   * 自由：雲の帯が左右に割れて、空がひらけ、どこへでも行ける道が見える。
   *
   * 道は**塗らない**（塗ると必ず「山」に見えた）。
   * さらに**人を小さく置く**と、一気に「向こうへ続く道」として読める。
   */
  sky: () => (
    <>
      <g className="fs-cloud fs-cL">
        <path d="M4 18 h84" /><path d="M16 30 h72" /><path d="M30 42 h58" />
      </g>
      <g className="fs-cloud fs-cR">
        <path d="M112 18 h84" /><path d="M112 30 h72" /><path d="M112 42 h58" />
      </g>
      {/* 割れたあいだ、地平のむこうが光っている */}
      <circle className="fs-far" cx="100" cy="66" r="5" />
      <path className="fs-horizon" d="M8 72 h184" />
      {/* こちらから地平へ、まっすぐ伸びる道 */}
      <path className="fs-road" d="M28 122 L96 73 M172 122 L104 73" />
      <path className="fs-lane" d="M100 118 V80" />
      {/* 道の入口に立っている人（小さく置くと、道の奥行きが読める） */}
      <g className="fs-tiny" transform="translate(56 122) scale(.34) translate(-100 -112)">
        <Body />
      </g>
    </>
  ),

  /** 歓び：内側から小さな泡が次々のぼってくる */
  bubbles: () => (
    <>
      <Body />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle
          key={i} className={`fs-bub fs-b${i}`}
          cx={93 + (i % 4) * 5} cy="88" r={2.8 + (i % 3) * 1}
        />
      ))}
    </>
  ),

  /** 静けさ：風のない水面に、何も波が立っていない */
  still: () => (
    <>
      <path className="fs-surface" d="M20 66 h160" />
      <ellipse className="fs-still-glow" cx="100" cy="66" rx="58" ry="8" />
      {/* 立ちかけた波が、すぐに消える */}
      {[0, 1].map((i) => (
        <ellipse key={i} className={`fs-calm fs-cm${i}`} cx="100" cy="66" rx="14" ry="3" />
      ))}
      <path className="fs-reflect" d="M58 82 h84 M70 92 h60 M82 102 h36" />
    </>
  ),

  /** 誇り：足の裏から背骨を通って頭のてっぺんまで、まっすぐ1本 */
  spine: () => (
    <>
      <Body />
      <path className="fs-axis" d="M100 112 V14" />
      <circle className="fs-crown" cx="100" cy="14" r="3.8" />
    </>
  ),

  /** 自信：体の中心に太い柱が1本立っている（頭は隠さない） */
  pillar: () => (
    <>
      <rect className="fs-pillar" x="93" y="42" width="14" height="68" rx="7" />
      <Body />
      <path className="fs-base" d="M76 110 h48" />
    </>
  ),

  /**
   * 信頼：後ろに倒れても必ず受け止めてもらえる、と知っている。
   * 倒れていく背中の、ちょうど行く先に手のひらがある。
   */
  catch: () => (
    <>
      <g className="fs-hands" transform="translate(140 56) rotate(-62) scale(.46) translate(-100 -74)">
        <path d={HAND_D} />
        <path d={THUMB_D} />
      </g>
      <g className="fs-fall"><Body /></g>
      <path className="fs-ground" d="M40 112 h120" />
    </>
  ),

  /** 希望：夜明け前の空が、だんだん明るくなる */
  dawn: () => (
    <>
      <rect className="fs-nightsky" x="14" y="8" width="172" height="76" rx="6" />
      <circle className="fs-sun" cx="100" cy="84" r="17" />
      <path className="fs-horizon" d="M14 84 h172" />
      {[0, 1, 2].map((i) => (
        <circle key={i} className={`fs-star fs-s${i}`} cx={46 + i * 54} cy={26 + (i % 2) * 12} r="1.7" />
      ))}
    </>
  ),

  /** 情熱：静かな炎が、体の中心で燃えている */
  flame: () => (
    <>
      <Body />
      <path className="fs-flame" d="M100 82 q-12 -14 0 -30 q12 16 0 30" />
      <path className="fs-flame-in" d="M100 78 q-5 -8 0 -17 q5 9 0 17" />
    </>
  ),

  /**
   * 軽さ：荷物を下ろして、風にふわりと押される。
   * 荷物は地面に置いてある。人だけが、地面から少し浮く。
   */
  lift: () => (
    <>
      <path className="fs-ground" d="M34 116 h132" />
      <path className="fs-bag" d="M132 116 v-18 h22 v18 z" />
      <path className="fs-bag-h" d="M137 98 q6 -8 12 0" />
      <g className="fs-float"><Body x={86} /></g>
      <ellipse className="fs-shadow" cx="86" cy="116" rx="20" ry="3.4" />
      {[0, 1].map((i) => (
        <path key={i} className={`fs-wind fs-w${i}`} d="M14 0 q30 -8 60 0 q30 8 60 0" />
      ))}
    </>
  ),

  /**
   * 余裕：自分と世界のあいだに、ゆったりした空間がある。
   * 世界（外の壁）は近づいてこない。あいだの空間がゆっくり呼吸する。
   */
  space: () => (
    <>
      <path className="fs-world" d="M12 14 v96 M188 14 v96" />
      <path className="fs-world-in" d="M28 26 v72 M172 26 v72" />
      <circle className="fs-bound fs-bd0" cx="100" cy="64" r="44" />
      <circle className="fs-bound fs-bd1" cx="100" cy="64" r="34" />
      <Body y={6} />
    </>
  ),

  /** つながり：自分から伸びた光が、大切な人へ静かに繋がる */
  thread: () => (
    <>
      <g className="fs-me"><Body x={60} /></g>
      <g className="fs-you"><Body x={140} /></g>
      <path className="fs-thread" d="M60 56 q40 -20 80 0" />
      <circle className="fs-spark" cx="60" cy="56" r="3" />
    </>
  ),

  /** 幸福：陽だまりの中にいて、時間がゆっくり流れる */
  sunspot: () => (
    <>
      <path className="fs-beam" d="M58 0 L30 118 h140 L142 0 z" />
      <ellipse className="fs-pool" cx="100" cy="114" rx="52" ry="8" />
      <Body />
      {[0, 1, 2].map((i) => (
        <circle key={i} className={`fs-dust fs-d${i}`} cx={72 + i * 28} cy="64" r="1.9" />
      ))}
    </>
  ),

  /**
   * 安らぎ：眠る直前の、静かでやわらかい状態。
   * 横から見た姿。枕の**上**に頭をのせ、上掛けが体の形にそって上下する。
   */
  settle: () => (
    <>
      <path className="fs-bed" d="M20 106 h160" />
      <path className="fs-pillow" d="M32 106 q-4 -18 14 -20 q22 -2 24 8 q2 10 -6 12 z" />
      <circle className="fs-head" cx="58" cy="80" r="12" />
      <path className="fs-lash" d="M52 79 q6 4 11 0" />
      <g className="fs-breathe">
        <path className="fs-quilt" d="M72 106 q4 -22 34 -22 q42 0 62 12 q4 10 0 10 z" />
      </g>
      {[0, 1, 2].map((i) => (
        <circle key={i} className={`fs-zzz fs-z${i}`} cx={78 + i * 13} cy="52" r="2.2" />
      ))}
    </>
  ),

  /**
   * 勇気：扉の前で、手をかけている瞬間。
   * ひらくと向こうから光がさし、こちらの床にこぼれる。
   */
  door: () => (
    <>
      <path className="fs-spill" d="M64 114 L52 122 h96 L136 114 z" />
      <rect className="fs-frame" x="60" y="8" width="80" height="106" rx="3" />
      <rect className="fs-beyond" x="63" y="11" width="74" height="100" rx="2" />
      <g className="fs-door">
        <rect className="fs-panel" x="63" y="11" width="74" height="100" rx="2" />
        <rect className="fs-panel-in" x="72" y="22" width="56" height="32" rx="2" />
        <circle className="fs-knob" cx="126" cy="64" r="3.6" />
      </g>
      {/* こちら側から伸びる腕と、ノブにかかった指 */}
      <path className="fs-arm" d="M182 92 L136 68" />
      <path className="fs-arm fs-fingers" d="M136 68 q-9 -1 -12 -4 M136 68 q-8 4 -11 3" />
    </>
  ),

  /**
   * 誠実：全部見せても大丈夫だ、と分かっている。
   * 隠していた覆いが左右にひらいて、姿がぜんぶ見える。
   * （灰色の卵で包むと、逆に「隠している」絵になっていた）
   */
  clear: () => (
    <>
      <g className="fs-shown"><Body /></g>
      <circle className="fs-chest" cx="100" cy="56" r="5.5" />
      <rect className="fs-veil fs-vL" x="10" y="4" width="90" height="116" rx="3" />
      <rect className="fs-veil fs-vR" x="100" y="4" width="90" height="116" rx="3" />
    </>
  ),

  /** 創造：何もない場所に、線が1本引かれる瞬間 */
  draw: () => (
    <>
      <rect className="fs-canvas" x="24" y="16" width="152" height="88" rx="4" />
      <path className="fs-stroke" d="M46 88 q34 -56 62 -28 q22 22 46 -22" />
      <circle className="fs-pen" cx="46" cy="88" r="3.6" />
    </>
  ),

  /** 豊かさ：実がたわわに実った木の下に立っている */
  tree: () => (
    <>
      <path className="fs-trunk" d="M100 114 V62" />
      <path className="fs-branch" d="M100 78 q-20 -8 -28 -20 M100 70 q20 -8 28 -20" />
      <circle className="fs-crownleaf" cx="100" cy="44" r="36" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} className={`fs-fruit fs-ft${i}`} cx={74 + i * 13} cy={36 + (i % 3) * 13} r="4.2" />
      ))}
      <path className="fs-ground" d="M36 114 h128" />
    </>
  ),

  /** 辞書に無い感情：胸のあたりに、それがじんわり広がる */
  warm: () => (
    <>
      {[0, 1].map((i) => (
        <circle key={i} className={`fs-warm fs-wm${i}`} cx="100" cy="56" r="12" />
      ))}
      <Body />
      <circle className="fs-chest" cx="100" cy="56" r="6.5" />
    </>
  ),
};

export const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];
export const isSceneKey = (v: unknown): v is SceneKey =>
  typeof v === "string" && v in SCENES;

/**
 * @param scene どの絵か
 * @param label 読み上げ用（絵が読めない人にも、同じことが伝わるように）
 */
export function FeelScene({ scene, label }: { scene: SceneKey; label: string }) {
  const Draw = SCENES[scene] ?? SCENES.warm;
  return (
    <svg
      /* 名前の頭を分ける（fs-door などの部品名と衝突させない） */
      className={`fs fs-s-${scene}`} viewBox="0 0 200 124"
      role="img" aria-label={label} focusable="false"
    >
      <Draw />
    </svg>
  );
}

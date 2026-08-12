/**
 * 感情を「体でどう感じるか」に翻訳するガイド。
 *
 * 未来からの手紙で届く感情（充足・解放・慈愛…）は、言葉だけでは体に入らない。
 * ピークステートで“吸う”ときに、どこにどんな感覚が起きるかの目安を1行で渡す。
 * ここに無い感情は、字面から近いものを推測し、最後は汎用の言い方に落とす。
 */

/**
 * scene は「どんな感覚？」で見せる絵（FeelScene.tsx）。
 * **image の文章と絵が一致していること**が条件。
 * 例：「コップに水が静かに満ちて」なら fill（本当にコップに水が満ちる絵）。
 */
export type FeelGuide = { body: string; image: string; scene: SceneKey };
export type SceneKey =
  | "fill" | "gatherFill" | "openHand" | "radiate" | "ground" | "sky"
  | "bubbles" | "still" | "spine" | "pillar" | "catch" | "dawn"
  | "flame" | "lift" | "space" | "thread" | "sunspot" | "settle"
  | "door" | "clear" | "draw" | "tree" | "warm";

const TABLE: Record<string, FeelGuide> = {
  充足:   { body: "みぞおちの奥が、あたたかく満ちていく感じ", image: "コップに水が静かに満ちて、もう何も足さなくていい状態をイメージして", scene: "fill" },
  解放:   { body: "胸と肩の力がふっと抜けて、軽くなる感じ", image: "ずっと握っていた手を開いて、風が通り抜けるのをイメージして", scene: "openHand" },
  慈愛:   { body: "胸の中心があたたかくなり、外へやわらかく広がる感じ", image: "胸から温かい光がふわっと放たれて、まわりを包むのをイメージして", scene: "radiate" },
  安心:   { body: "お腹の底が静かに落ち着いて、呼吸が深くなる感じ", image: "足の裏が地面にぴったりつき、誰かに背中を支えられているのをイメージして", scene: "ground" },
  自由:   { body: "背筋がすっと伸びて、視界が広がる感じ", image: "空が高くひらけて、どこへでも行ける道が見えるのをイメージして", scene: "sky" },
  歓び:   { body: "胸の奥が弾んで、上へ湧き上がる感じ", image: "内側から小さな泡が次々のぼってくるのをイメージして", scene: "bubbles" },
  喜び:   { body: "胸の奥が弾んで、上へ湧き上がる感じ", image: "内側から小さな泡が次々のぼってくるのをイメージして", scene: "bubbles" },
  感謝:   { body: "胸がじんわり熱くなって、目の奥がゆるむ感じ", image: "受け取ってきたものが胸に集まり、静かに満ちるのをイメージして", scene: "gatherFill" },
  静けさ: { body: "頭の中の音が引いて、体の輪郭がやわらぐ感じ", image: "風のない水面に、何も波が立っていないのをイメージして", scene: "still" },
  平安:   { body: "頭の中の音が引いて、体の輪郭がやわらぐ感じ", image: "風のない水面に、何も波が立っていないのをイメージして", scene: "still" },
  // 自分の姿を外から見せるのはやめた。向けるのは体の感覚のほう（ideal-ask.ts）
  誇り:   { body: "胸が上へ持ち上がり、背中に芯が通る感じ", image: "足の裏から背骨を通って頭のてっぺんまで、まっすぐ1本つながるのをイメージして", scene: "spine" },
  自信:   { body: "みぞおちに芯が通って、揺れなくなる感じ", image: "体の中心に太い柱が1本立っているのをイメージして", scene: "pillar" },
  信頼:   { body: "肩の警戒がほどけて、呼吸が浅くならない感じ", image: "後ろに倒れても必ず受け止めてもらえる、と知っている状態をイメージして", scene: "catch" },
  希望:   { body: "胸の上のほうが明るくなって、前へ引かれる感じ", image: "夜明け前の空がだんだん明るくなるのをイメージして", scene: "dawn" },
  情熱:   { body: "お腹の奥に熱が生まれて、手足が動きたくなる感じ", image: "静かな炎が体の中心で燃えているのをイメージして", scene: "flame" },
  軽さ:   { body: "肩と眉間がゆるんで、体が浮くように軽い感じ", image: "荷物を下ろして、風にふわりと押されるのをイメージして", scene: "lift" },
  余裕:   { body: "呼吸が長くなり、急ぐ気持ちが消える感じ", image: "自分と世界のあいだに、ゆったりした空間があるのをイメージして", scene: "space" },
  つながり:{ body: "胸の前がひらいて、外と隔てがなくなる感じ", image: "自分から伸びた光が、大切な人へ静かに繋がるのをイメージして", scene: "thread" },
  愛:     { body: "胸の中心が満ちて、あふれて外へ流れる感じ", image: "内側からあふれた温かさが、まわりに流れていくのをイメージして", scene: "radiate" },
  幸福:   { body: "全身がゆるみ、何も足りなくない感じ", image: "陽だまりの中にいて、時間がゆっくり流れるのをイメージして", scene: "sunspot" },
  安らぎ: { body: "首と顎の力が抜けて、深く息が入る感じ", image: "眠る直前の、あの静かでやわらかい状態をイメージして", scene: "settle" },
  勇気:   { body: "胸の中心に熱が集まって、一歩前に出たくなる感じ", image: "扉の前で、手をかけている瞬間をイメージして", scene: "door" },
  誠実:   { body: "背骨がまっすぐ通って、隠すものがない感じ", image: "全部見せても大丈夫だ、と分かっている状態をイメージして", scene: "clear" },
  創造:   { body: "頭の後ろが涼しくなり、手の先がむずむずする感じ", image: "何もない場所に、線が1本引かれる瞬間をイメージして", scene: "draw" },
  豊かさ: { body: "呼吸が深く広がり、内側にゆとりが増える感じ", image: "実がたわわに実った木の下に立っているのをイメージして", scene: "tree" },
};

/** 部分一致でひろう（例：「深い安心」→ 安心） */
export function feelGuide(emotion: string | null | undefined): FeelGuide | null {
  const e = (emotion ?? "").trim();
  if (!e) return null;
  if (TABLE[e]) return TABLE[e];
  for (const key of Object.keys(TABLE)) {
    if (e.includes(key)) return TABLE[key];
  }
  // 辞書に無い感情：汎用の入り方（それでも体に向かわせる）
  return {
    body: `胸のあたりに、その「${e}」がじんわり広がる感じ`,
    image: `すでに「${e}」を持っている自分が、どんな姿勢で、どんな呼吸をしているかをイメージして`,
    scene: "warm",
  };
}

import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP1_ADVENTURE = defineAdventureScenario({
  id: "ep1-case-unconscious-response",
  caseNo: "CASE 01",
  title: "『動け』と念じても動かなかった足が、走る自分を思い浮かべた時に動いた。何が違った？",
  question: "『動け』と念じた時と、走る感覚を思い浮かべた時を比べる",
  objective: "二つの場面を比べ、反応の条件と観察の役割を突き止める",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  evidence: [
    {
      id: "direct-command", title: "診療記録", summary: "本人は動くことを強く望み、『足を動かせ』と繰り返した",
      detail: "この時間帯の記録には、目と首以外の動きは確認されていない。", icon: "✕",
    },
    {
      id: "vivid-image", title: "本人の回想", summary: "窓の外を走る姿から、風・地面・足運びの感覚を思い出した",
      detail: "回想の直後、足先に、それまで記録されていなかった小さな反応があった。", icon: "◉",
    },
    {
      id: "visible-response", title: "椅子の記録", summary: "足先の小さな反応の直後、揺り椅子がわずかに動いた",
      detail: "時系列は『足先の反応→椅子の揺れ』。椅子が先に動いた記録はない。", icon: "↻",
    },
    {
      id: "heel-record", title: "歩行記録A", summary: "妹の足は、かかとから床へ触れた",
      detail: "一歩目の接地を繰り返し見た記録。", icon: "①",
    },
    {
      id: "balance-record", title: "歩行記録B", summary: "接地の後、身体の重さが次の足へ移った",
      detail: "かかとが触れた後に起きた動きとして記録されている。", icon: "②",
    },
    {
      id: "toe-record", title: "歩行記録C", summary: "最後につま先が床を押し、次の一歩へつながった",
      detail: "接地・重心移動に続く三つ目の動きとして記録されている。", icon: "③",
    },
  ],
  nodes: [
    {
      kind: "dialogue", id: "adv-01", scene: "問いの確認", camera: "link",
      line: { id: "adv-01", who: "link", face: "think", text: "先生。椅子が揺れた刺激で、足が動いたんでしょうか？" },
      nextLabel: "問いを確かめる",
    },
    {
      kind: "dialogue", id: "adv-02", scene: "問いの確認", camera: "teacher",
      line: { id: "adv-02", who: "teacher", face: "smile", text: "まだ決めないでください。命令、足の反応、椅子の揺れ。三つの記録を時間順に並べると、どれが先でしょう。" },
    },
    {
      kind: "dialogue", id: "adv-03", scene: "問いの確認", camera: "link",
      line: { id: "adv-03", who: "link", face: "think", text: "先に答えを決めず、反応がなかった時と、あった時の記録を比べます。" },
      nextLabel: "二つの場面を比べる",
    },
    {
      kind: "investigate", id: "investigate-trigger", scene: "反応条件の検証",
      title: "足の反応が起きた順序を調べる", prompt: "三つの記録を開き、命令・最初の反応・その後の出来事を確認してください。",
      spots: [
        { id: "spot-command", label: "診療記録", x: 24, y: 59, evidenceId: "direct-command", linkComment: "動きたい意思は強い。それでも、この時点では反応の記録がない。" },
        { id: "spot-image", label: "本人の回想", x: 54, y: 48, evidenceId: "vivid-image", linkComment: "走る姿だけでなく、風や地面の感覚まで思い出している。" },
        { id: "spot-response", label: "椅子の記録", x: 82, y: 59, evidenceId: "visible-response", linkComment: "椅子が動いたのは、足先の反応より後だ。僕の最初の仮説は逆だった。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-04", scene: "仮説", camera: "link",
      line: { id: "adv-04", who: "link", face: "aha", text: "順序は、命令では反応なし。走る感覚を思い出す。足が反応する。その後に椅子が揺れた。" },
    },
    {
      kind: "dialogue", id: "adv-05", scene: "仮説", camera: "teacher",
      line: { id: "adv-05", who: "teacher", text: "ではリンク。命令した時と比べて、最初の反応が出た場面の違いを選んでください。" },
      nextLabel: "違いを選ぶ",
    },
    {
      kind: "deduction", id: "deduce-trigger", scene: "第一推理",
      title: "三つの記録と矛盾しない説明は？", prompt: "原因と結果の順序が、すべての記録に合うものを選んでください。",
      hint: "足の反応と椅子の揺れは、どちらが先か。",
      options: [
        { id: "willpower", label: "命令を重ねた効果が遅れて現れ、足が反応した", correct: false, feedback: "命令と反応の間に、走る感覚を思い出した記録があります。これを説明できません。" },
        { id: "imagery", label: "走る感覚へ注意が向いた後に足が反応し、椅子が揺れた", correct: true, feedback: "三つの記録と時系列が一致します。ただし、この一例だけで『イメージなら必ず動く』とは言えません。" },
        { id: "chair", label: "椅子の揺れが刺激になり、その後で足が反応した", correct: false, feedback: "椅子の記録では、足の反応が先です。原因と結果が逆になります。" },
      ],
    },
    {
      kind: "reveal", id: "reveal-trigger", scene: "第一推理成立", kicker: "FIRST RESPONSE FOUND",
      title: "この事例では、走る感覚へ注意が向いた後に足が反応した",
      body: "命令した時には反応の記録がない。走る感覚を思い出した後に足が反応し、その後の椅子の揺れで外から確認できた。",
      evidenceIds: ["direct-command", "vivid-image", "visible-response"], nextLabel: "次の問いへ進む",
    },
    {
      kind: "dialogue", id: "adv-06", scene: "次の問い", camera: "link",
      line: { id: "adv-06", who: "link", face: "think", text: "最初の反応が起きた条件は分かりました。でも、一度の小さな反応だけでは歩けません。" },
    },
    {
      kind: "dialogue", id: "adv-07", scene: "次の問い", camera: "teacher",
      line: { id: "adv-07", who: "teacher", face: "smile", text: "その通り。次に観察したのは、小さな反応を歩行へ広げるために必要な動きです。" },
      nextLabel: "観察の目的を確かめる",
    },
    {
      kind: "investigate", id: "investigate-gait", scene: "歩行観察",
      title: "小さな反応を、歩行へどう広げた？", prompt: "妹の歩き方を三つの動きに分け、観察の目的を確かめてください。",
      spots: [
        { id: "spot-heel", label: "歩行記録A", x: 24, y: 61, evidenceId: "heel-record", linkComment: "一歩を丸ごと見るのではなく、最初の接地だけを記録している。" },
        { id: "spot-balance", label: "歩行記録B", x: 53, y: 49, evidenceId: "balance-record", linkComment: "接地の次に、身体の重さが移っている。" },
        { id: "spot-toe", label: "歩行記録C", x: 82, y: 61, evidenceId: "toe-record", linkComment: "最後につま先で押して、次の一歩へつながる。三つには順序がある。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-08", scene: "観察の意味", camera: "link",
      line: { id: "adv-08", who: "link", face: "think", text: "かかと、重心、つま先。歩行を三つに分けたのは、どこまで反応を広げられるか確かめるため？" },
    },
    {
      kind: "dialogue", id: "adv-09", scene: "観察の意味", camera: "teacher",
      line: { id: "adv-09", who: "teacher", text: "その仮説を、三つの記録と照らして選んでください。" },
      nextLabel: "観察の役割を選ぶ",
    },
    {
      kind: "deduction", id: "deduce-observation", scene: "第二推理",
      title: "妹の歩き方を観察した目的は？", prompt: "最初の足の反応が起きた後に、観察を続けた理由を選んでください。",
      options: [
        { id: "record-only", label: "珍しい出来事として記録を残すため", correct: false, feedback: "記録だけが目的ではありません。観察した動きを自分の反応と照合しています。" },
        { id: "expand", label: "小さな反応を、歩行の動きへ広げるため", correct: true, feedback: "正解。反応を確認し、歩行の順序と照合して、小さく反復しました。" },
        { id: "copy", label: "妹と同じ歩き方を、そのまま真似するため", correct: false, feedback: "完全な模倣ではありません。自分に起きた微細な反応を出発点にしています。" },
      ],
    },
    {
      kind: "reveal", id: "reveal-observation", scene: "因果成立", kicker: "OBSERVATION HAS A PURPOSE",
      title: "観察は、起きた反応を次の一歩へ広げるためにある",
      body: "足の微細な反応を確認し、歩行を小さな動きへ分けて照合した。観察と反復によって、反応を歩行へ広げていった。",
      evidenceIds: ["heel-record", "balance-record", "toe-record"], nextLabel: "自分の実例へつなげる",
    },
    {
      kind: "dialogue", id: "adv-10", scene: "自分への適用", camera: "link",
      line: { id: "adv-10", who: "link", face: "aha", dynamic: true, text: "僕の『{{theme}}』にも、『{{exception}}』では{{exceptionScore}}だった実例がある。そこが出発点ですね。" },
    },
    {
      kind: "dialogue", id: "adv-11", scene: "自分への適用", camera: "teacher",
      line: { id: "adv-11", who: "teacher", dynamic: true, text: "ええ。治療をまねるのではなく、あなたが実際に書いた『{{clue}}』を、次の場面で一つだけ安全に試します。" },
      nextLabel: "最初の一手を選ぶ",
    },
    {
      kind: "apply", id: "apply-self", scene: "自己適用", title: "あなたの最初の一手",
      prompt: "『{{theme}}』が100ではなかった条件を、次にどう使いますか？", storeAs: "resource",
      options: [
        { id: "push", label: "できるまで自分へ強く命令する", value: "命令を強める", correct: false, feedback: "事件で反応しなかった方法です。まず、実際に違いがあった条件を一つ使います。" },
        { id: "analyze", label: "100だった原因を全部分析する", value: "100だった原因を全部分析する", correct: false, feedback: "原因を全部解く前に、100ではなかった実例を小さく再現できます。" },
        { id: "observe", label: "『{{clue}}』を次の場面で一つ再現する", value: "次の場面で『{{clue}}』を一つ再現する", correct: true, feedback: "正解。すでに差があった条件を一つ使い、結果をまた観察します。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-12", scene: "解決", camera: "link",
      line: { id: "adv-12", who: "link", face: "smile", dynamic: true, text: "『{{theme}}』を一気に消すのではなく、まず{{resource}}。その結果の違いを見る。" },
    },
    {
      kind: "dialogue", id: "adv-13", scene: "解決", camera: "teacher",
      line: { id: "adv-13", who: "teacher", face: "smile", dynamic: true, text: "前と同じ点数まで軽くならなくても構いません。何が起きたかを観察すれば、次の材料になります。" },
    },
    {
      kind: "dialogue", id: "adv-14", scene: "解決", camera: "link",
      line: { id: "adv-14", who: "link", face: "aha", text: "命令で無理に動かそうとせず、本人に実際に起きた小さな変化を見つけ、次に使う。これが今回の学びなんですね。" },
      nextLabel: "事件の答えを確定する",
    },
    {
      kind: "reveal", id: "case-closed", scene: "CASE CLOSED", kicker: "CASE CLOSED",
      title: "命令を強める代わりに、実際の反応を観察して使う",
      body: "この事例で確認できた足の反応を出発点に、歩行を小さく分けて観察し、できる範囲を広げた。この流れを講義で催眠とUtilizationの理屈へつなげます。",
      evidenceIds: ["vivid-image", "visible-response", "heel-record", "balance-record", "toe-record"],
      nextLabel: "講義で理屈を確かめる",
    },
  ],
});

/** 開発画面・自動生成パイプラインから読める審査結果 */
export const EP1_ADVENTURE_QUALITY = reviewAdventureScenario(EP1_ADVENTURE);

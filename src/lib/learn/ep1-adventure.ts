import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP1_ADVENTURE = defineAdventureScenario({
  id: "ep1-case-unconscious-response",
  caseNo: "CASE 01",
  title: "命令では動かなかった足が、なぜ反応した？",
  question: "命令した時と反応した時、何が違った？",
  objective: "二つの場面を比べ、反応の条件と観察の役割を突き止める",
  background: "/learn/adventure/erickson-study-v1.webp",
  teacherSprite: "/learn/adventure/erickson-cutout-v1.webp",
  linkSprite: "/learn/chars/link-neutral.webp",
  evidence: [
    {
      id: "direct-command", title: "命令した時", summary: "『足を動かせ』と強く命令 → 反応なし",
      detail: "動きたいという意思は強かった。それでも、結果を直接求める命令では、足に確認できる反応は起きなかった。", icon: "✕",
    },
    {
      id: "vivid-image", title: "走る感覚へ向いた注意", summary: "光景・風・地面を蹴る感覚が鮮明になった",
      detail: "足へ命令する代わりに、外を走る体験へ注意が深く向いた。その時、足に最初の微細な反応が起きた。", icon: "◉",
    },
    {
      id: "visible-response", title: "外から見えた反応", summary: "足の微細な反応に続いて、揺り椅子が動いた",
      detail: "椅子を動かすことが目的ではない。椅子の揺れによって、足に実際の反応が起きたと外から確認できた。", icon: "↻",
    },
    {
      id: "heel-record", title: "かかとの観察", summary: "妹のかかとが床へ触れる順序を見た",
      detail: "歩行を一つの動作として眺めず、まず、かかとが床へ触れる小さな動きへ分けて観察した。", icon: "①",
    },
    {
      id: "balance-record", title: "重心移動の観察", summary: "身体の重さが片足から次の足へ移る",
      detail: "足先だけでなく、身体の重さがどの順序で移るかを観察し、自分の小さな反応と照合した。", icon: "②",
    },
    {
      id: "toe-record", title: "つま先の観察", summary: "最後につま先が床を押し、次の一歩へつながる",
      detail: "かかと、重心、つま先という順序を、自分に起きた反応で小さく反復し、歩行へ広げた。", icon: "③",
    },
  ],
  nodes: [
    {
      kind: "dialogue", id: "adv-01", scene: "問いの確認", camera: "link",
      line: { id: "adv-01", who: "link", face: "think", text: "先生。今回は、命令では動かなかった足に、なぜ反応が出たのかを突き止めるんですよね？" },
      nextLabel: "問いを確かめる",
    },
    {
      kind: "dialogue", id: "adv-02", scene: "問いの確認", camera: "teacher",
      line: { id: "adv-02", who: "teacher", face: "smile", text: "その通りです。命令した時と、最初の反応が出た時。その二つの場面の違いを見てください。" },
    },
    {
      kind: "dialogue", id: "adv-03", scene: "問いの確認", camera: "link",
      line: { id: "adv-03", who: "link", face: "aha", text: "意思が弱かったから、では説明できない。実際に変わった条件を証拠から比べます。" },
      nextLabel: "二つの場面を比べる",
    },
    {
      kind: "investigate", id: "investigate-trigger", scene: "反応条件の検証",
      title: "命令した時と、反応した時を比べる", prompt: "三つの証拠を開き、足の反応が起きる前後を確認してください。",
      spots: [
        { id: "spot-command", label: "命令した時", x: 26, y: 56, evidenceId: "direct-command", linkComment: "動きたい意思はあった。でも、命令には足が反応していない。" },
        { id: "spot-image", label: "走る感覚", x: 54, y: 42, evidenceId: "vivid-image", linkComment: "光景だけでなく、風や地面を蹴る感覚へ注意が深く向いている。" },
        { id: "spot-response", label: "足の反応", x: 82, y: 56, evidenceId: "visible-response", linkComment: "足の反応が先。その結果、椅子が揺れて外から確認できた。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-04", scene: "仮説", camera: "link",
      line: { id: "adv-04", who: "link", face: "think", text: "命令では反応なし。走る体験が鮮明になった時、足が反応し、その後に椅子が揺れた。" },
    },
    {
      kind: "dialogue", id: "adv-05", scene: "仮説", camera: "teacher",
      line: { id: "adv-05", who: "teacher", text: "ではリンク。命令した時と比べて、最初の反応が出た場面の違いを選んでください。" },
      nextLabel: "違いを選ぶ",
    },
    {
      kind: "deduction", id: "deduce-trigger", scene: "第一推理",
      title: "足に最初の反応が出た時、何が違った？", prompt: "意思の強さではなく、証拠に残っている違いを選んでください。",
      hint: "反応がなかった場面と、反応があった場面を比べる。",
      options: [
        { id: "willpower", label: "足への命令を、さらに強くした", correct: false, feedback: "その証拠はありません。強い命令をした場面では、反応は起きていません。" },
        { id: "imagery", label: "外を走る身体感覚へ、注意が深く向いた", correct: true, feedback: "正解。命令ではなく、走る体験が鮮明になった時に最初の反応が起きました。" },
        { id: "chair", label: "椅子が、足を動かしてくれた", correct: false, feedback: "順序が逆です。足の反応が先にあり、その結果として椅子が揺れました。" },
      ],
    },
    {
      kind: "reveal", id: "reveal-trigger", scene: "第一推理成立", kicker: "FIRST RESPONSE FOUND",
      title: "命令ではなく、走る体験へ注意が向いた時に反応した",
      body: "足への命令には反応しなかった。走る感覚が鮮明になった時、足に微細な反応が起き、椅子の揺れで確認できた。",
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
        { id: "spot-heel", label: "かかと", x: 26, y: 58, evidenceId: "heel-record", linkComment: "最初に、かかとが床へ触れる。歩行を小さな動きへ分けている。" },
        { id: "spot-balance", label: "重心移動", x: 53, y: 43, evidenceId: "balance-record", linkComment: "身体の重さが移る順序を、自分の反応と照合した。" },
        { id: "spot-toe", label: "つま先", x: 82, y: 58, evidenceId: "toe-record", linkComment: "つま先で押し出す動きまでつなぎ、小さく反復している。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-08", scene: "観察の意味", camera: "link",
      line: { id: "adv-08", who: "link", face: "aha", text: "観察は記録を増やすためじゃない。起きた反応を、歩行へ広げる順序を見つけるためだった。" },
    },
    {
      kind: "dialogue", id: "adv-09", scene: "観察の意味", camera: "teacher",
      line: { id: "adv-09", who: "teacher", text: "ええ。最初の反応を確かめ、歩行の動きと照合し、再現できる範囲を少しずつ広げました。" },
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
      line: { id: "adv-11", who: "teacher", dynamic: true, text: "ええ。その時に違っていた『{{clue}}』を、次の場面で一つだけ安全に試します。" },
      nextLabel: "最初の一手を選ぶ",
    },
    {
      kind: "apply", id: "apply-self", scene: "自己適用", title: "あなたの最初の一手",
      prompt: "『{{theme}}』が100ではなかった条件を、次にどう使いますか？", storeAs: "resource",
      options: [
        { id: "push", label: "できるまで自分へ強く命令する", value: "命令を強める", correct: false, feedback: "事件で反応しなかった方法です。まず、実際に違いがあった条件を一つ使います。" },
        { id: "analyze", label: "100だった原因を全部分析する", value: "100だった原因を全部分析する", correct: false, feedback: "原因を全部解く前に、100ではなかった実例を小さく再現できます。" },
        { id: "observe", label: "『{{clue}}』を次の場面で一つ再現する", value: "{{clue}}を次の場面で一つ再現する", correct: true, feedback: "正解。すでに差があった条件を一つ使い、結果をまた観察します。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-12", scene: "解決", camera: "link",
      line: { id: "adv-12", who: "link", face: "smile", dynamic: true, text: "『{{theme}}』を一気に消すのではなく、まず『{{resource}}』を試して違いを見る。" },
    },
    {
      kind: "dialogue", id: "adv-13", scene: "解決", camera: "teacher",
      line: { id: "adv-13", who: "teacher", face: "smile", dynamic: true, text: "結果が{{exceptionScore}}より小さく変わらなくても構いません。何が起きたかを観察すれば、次の材料になります。" },
    },
    {
      kind: "dialogue", id: "adv-14", scene: "解決", camera: "link",
      line: { id: "adv-14", who: "link", face: "aha", text: "命令で作るのではなく、すでに起きた反応を見つけて使う。これが今回の学びなんですね。" },
      nextLabel: "事件の答えを確定する",
    },
    {
      kind: "reveal", id: "case-closed", scene: "CASE CLOSED", kicker: "CASE CLOSED",
      title: "命令より先に、実際の反応を観察して使う",
      body: "走る体験へ注意が向いた時の足の反応を見つけ、歩行の観察と反復で広げた。この流れを講義で催眠とUtilizationの理屈へつなげます。",
      evidenceIds: ["vivid-image", "visible-response", "heel-record", "balance-record", "toe-record"],
      nextLabel: "講義で理屈を確かめる",
    },
  ],
});

/** 開発画面・自動生成パイプラインから読める審査結果 */
export const EP1_ADVENTURE_QUALITY = reviewAdventureScenario(EP1_ADVENTURE);

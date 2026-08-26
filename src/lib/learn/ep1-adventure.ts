import { defineAdventureScenario, reviewAdventureScenario } from "./adventure";

export const EP1_ADVENTURE = defineAdventureScenario({
  id: "ep1-case-unconscious-response",
  caseNo: "CASE 01",
  title: "『動け』と念じても動かなかった足が、走る自分を思い浮かべた時に動いた。何が違った？",
  question: "『動け』と念じた時と、走る感覚を思い浮かべた時を比べる",
  objective: "二つの場面を比べ、反応の順序と観察の使い方を確かめる",
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
      id: "heel-record", title: "歩行の分解", summary: "妹の一歩を、接地・重心移動・蹴り出しに分けて観察した",
      detail: "一歩を丸ごと真似るのではなく、小さな動きの順序として記録している。", icon: "①",
    },
    {
      id: "balance-record", title: "本人の反復記録", summary: "すでに起きた小さな足の反応から、分けた動きを一つずつ試した",
      detail: "最初から歩こうと命令せず、確認できた反応を出発点にした記録。", icon: "②",
    },
    {
      id: "toe-record", title: "経過記録", summary: "反応できる小さな動きが増え、やがて歩行練習へ広がった",
      detail: "一度の反応で治ったのではなく、観察と反復を重ねた経過が残っている。", icon: "③",
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
      line: { id: "adv-04", who: "link", face: "think", text: "椅子の記録だけを見ると順序を間違えそうです。本人の回想を、どこへ置くかが鍵ですね。" },
    },
    {
      kind: "dialogue", id: "adv-05", scene: "仮説", camera: "teacher",
      line: { id: "adv-05", who: "teacher", text: "原因はまだ決めません。三つの記録から、確実に言える順序だけを選んでください。" },
      nextLabel: "記録を並べる",
    },
    {
      kind: "deduction", id: "deduce-trigger", scene: "第一推理",
      title: "記録から確実に言える順序は？", prompt: "原因を推測せず、三つの記録と一致する時系列を選んでください。",
      hint: "本人の回想、足の反応、椅子の揺れは、どの順か。",
      options: [
        { id: "willpower", label: "命令を繰り返す → 足が反応する → 走る感覚を思い出す", correct: false, feedback: "本人の回想では、走る感覚を思い出した後に初めて足の反応が記録されています。" },
        { id: "imagery", label: "命令時は反応なし → 走る感覚を思い出す → 足が反応する → 椅子が揺れる", correct: true, feedback: "時系列が三つの記録と一致します。ここで確定できるのは順序までで、原因の一般化はしません。" },
        { id: "chair", label: "椅子が揺れる → 足が反応する → 走る感覚を思い出す", correct: false, feedback: "椅子の記録では、足の反応が先です。順序が逆になっています。" },
      ],
    },
    {
      kind: "reveal", id: "reveal-trigger", scene: "第一推理成立", kicker: "FIRST RESPONSE FOUND",
      title: "確認できたのは、足の反応が起きた順序",
      body: "命令した時には反応の記録がない。走る感覚を思い出した後に足が反応し、その後に椅子が揺れた。原因はまだ一つに決めない。",
      evidenceIds: ["direct-command", "vivid-image", "visible-response"], nextLabel: "次の問いへ進む",
    },
    {
      kind: "dialogue", id: "adv-06", scene: "次の問い", camera: "link",
      line: { id: "adv-06", who: "link", face: "think", text: "反応が起きた順序は確認できた。でも、なぜ動いたかを一例だけで断定はできないんですね。" },
    },
    {
      kind: "dialogue", id: "adv-07", scene: "次の問い", camera: "teacher",
      line: { id: "adv-07", who: "teacher", face: "smile", text: "その通りです。では私は、その一度の小さな反応を、どう次の変化へ使ったのでしょう。" },
      nextLabel: "次の記録を見る",
    },
    {
      kind: "investigate", id: "investigate-gait", scene: "歩行観察",
      title: "小さな反応を、その後どう使った？", prompt: "歩行の分解・本人の反復・その後の経過を順に確認してください。",
      spots: [
        { id: "spot-heel", label: "歩行の分解", x: 24, y: 61, evidenceId: "heel-record", linkComment: "妹の一歩を、いくつかの小さな動きとして見ている。" },
        { id: "spot-balance", label: "本人の反復", x: 53, y: 49, evidenceId: "balance-record", linkComment: "最初から歩こうとせず、すでに起きた小さな反応から試している。" },
        { id: "spot-toe", label: "その後の経過", x: 82, y: 61, evidenceId: "toe-record", linkComment: "一度で治ったのではない。反応できる範囲を少しずつ広げている。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-08", scene: "観察の意味", camera: "link",
      line: { id: "adv-08", who: "link", face: "think", text: "三つの記録はつながっている。でも、歩行を分けたことと、反復したことの関係をどう説明すればいい？" },
    },
    {
      kind: "dialogue", id: "adv-09", scene: "観察の意味", camera: "teacher",
      line: { id: "adv-09", who: "teacher", text: "その仮説を、三つの記録と照らして選んでください。" },
      nextLabel: "観察の役割を選ぶ",
    },
    {
      kind: "deduction", id: "deduce-observation", scene: "第二推理",
      title: "三つの記録から、観察の役割は？", prompt: "小さな反応、歩行の分解、その後の反復をつなぐ説明を選んでください。",
      options: [
        { id: "record-only", label: "珍しい出来事として記録を残すため", correct: false, feedback: "記録だけが目的ではありません。観察した動きを自分の反応と照合しています。" },
        { id: "expand", label: "起きた小さな反応から、歩行を分けて一つずつ試すため", correct: true, feedback: "正解。確認できた反応を出発点に、歩行を小さく分けて反復しています。" },
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
      line: { id: "adv-10", who: "link", face: "aha", dynamic: true, text: "あなたの今の記録は『{{theme}}／{{exception}}／困難の強さ：{{exceptionScore}}』。さらに『{{clue}}』を、次に確かめる手がかりに選んだ。" },
    },
    {
      kind: "dialogue", id: "adv-11", scene: "自分への適用", camera: "teacher",
      line: { id: "adv-11", who: "teacher", dynamic: true, text: "ええ。治療をまねず、次の似た場面で、あなたが選んだ手がかり『{{clue}}』を一度だけ確かめます。" },
      nextLabel: "最初の一手を選ぶ",
    },
    {
      kind: "apply", id: "apply-self", scene: "自己適用", title: "あなたの最初の一手",
      prompt: "次に似た場面が来た時、どの一手を試しますか？", storeAs: "resource",
      options: [
        { id: "push", label: "できるまで自分へ強く命令する", value: "命令を強める", correct: false, feedback: "事件で反応しなかった方法です。まず、実際に違いがあった条件を一つ使います。" },
        { id: "analyze", label: "100だった原因を全部分析する", value: "100だった原因を全部分析する", correct: false, feedback: "原因を全部解く前に、選んだ手がかりを一つ試して結果を観察できます。" },
        { id: "observe", label: "選んだ手がかりを、次の似た場面で一度だけ確かめる", value: "次に似た場面で『{{clue}}』を一度だけ確かめる", correct: true, feedback: "正解。選んだ手がかりを一つだけ確かめ、結果をまた観察します。" },
      ],
    },
    {
      kind: "dialogue", id: "adv-12", scene: "解決", camera: "link",
      line: { id: "adv-12", who: "link", face: "smile", dynamic: true, text: "困りごとを一気に消そうとせず、まず{{resource}}。その結果を見る。" },
    },
    {
      kind: "dialogue", id: "adv-13", scene: "解決", camera: "teacher",
      line: { id: "adv-13", who: "teacher", face: "smile", dynamic: true, text: "前より軽くならなくても構いません。何が起きたかを観察すれば、次の材料になります。" },
    },
    {
      kind: "dialogue", id: "adv-14", scene: "解決", camera: "link",
      line: { id: "adv-14", who: "link", face: "aha", text: "命令で無理に動かそうとせず、本人に実際に起きた小さな変化を見つけ、次に使う。これが今回の学びなんですね。" },
      nextLabel: "事件の答えを確定する",
    },
    {
      kind: "reveal", id: "case-closed", scene: "CASE CLOSED", kicker: "CASE CLOSED",
      title: "命令を強める代わりに、実際の反応を観察して使う",
      body: "確認できた小さな反応を出発点に、歩行を分けて一つずつ試し、できる範囲を広げた。この観察の使い方を、講義で催眠とUtilizationの理屈へつなげます。",
      evidenceIds: ["vivid-image", "visible-response", "heel-record", "balance-record", "toe-record"],
      nextLabel: "講義で理屈を確かめる",
    },
  ],
});

/** 開発画面・自動生成パイプラインから読める審査結果 */
export const EP1_ADVENTURE_QUALITY = reviewAdventureScenario(EP1_ADVENTURE);

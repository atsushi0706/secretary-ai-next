import type { Episode, Line, Scene, Slide } from "./types";
import { EP5_ADVENTURE_V2 as EP5_ADVENTURE } from "./erickson-adventures-v2";
import { EP5_FOUNDATION } from "./ep5-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";
import { canonicalMangaFrames } from "./erickson-canon";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "混乱は、空白へ答えを急いで入れる", lines: [
    L("ep5-lec1-1", "カードがない。ミオもいない。それだけで僕は『全部嘘だった』まで決めました。", { face: "think", slide: S({ h: "事実\nカードがない\n↓\n空白\n↓\n解釈\n全部嘘だった", style: "flow" }) }),
    T("ep5-lec1-2", "予想外の出来事で混乱すると、人は分からない空白を早く埋めたくなります。最初に浮かんだ説明が、そのまま注意を縛る催眠になります。"),
    T("ep5-lec1-2b", "既読ならすぐ返すのが誠実だと覚えているほど、『返事がない。嫌われたかもしれない』という文化的催眠で空白を埋めやすくなります。"),
    T("ep5-lec1-3", "そこで答えを反対の答えへ変えるのではなく、事実と解釈を分けます。"),
  ], ticketHint: "混乱時の思い込みについて質問できます" },
  { no: 2, title: "事実・未確定・次の一手", lines: [
    T("ep5-lec2-1", "カードがない。鍵の印がある。映像は切れた。三つは今確かめられる事実です。", { slide: S({ h: "1  今分かる事実\n2  まだ分からない意味\n3  今できる確認", style: "steps" }) }),
    L("ep5-lec2-2", "『ミオはずっと嘘だった』は事実じゃなく、まだ僕の解釈。次は送信元を確認できる。", { face: "aha" }),
    T("ep5-lec2-3", "その三つへ分けると、混乱が残っていても選択を一つ取り戻せます。これを再定位と呼びます。"),
  ], ticketHint: "事実と解釈の分け方を質問できます" },
  { no: 3, title: "混乱技法は、人を操る免許ではない", lines: [
    L("ep5-lec3-1", "エリクソンの混乱技法は、相手をわざと混乱させて命令を通す方法なんですか？", { face: "think", slide: S({ h: "CONFUSION AND REORIENTATION\n（混乱と再定位）", style: "cross", left: "混乱に乗じて\n従わせる", right: "事実へ戻し\n選択を返す" }) }),
    T("ep5-lec3-2", "この授業では、違います。混乱に乗じて同意を奪うことは、催眠の倫理を越えます。"),
    T("ep5-lec3-3", "固まった見方をゆるめる時も、安全、同意、本人が選べる次の行動を守ります。"),
    L("ep5-lec3-4", "混乱を使うなら、僕の判断を奪うんじゃなく、判断を取り戻せる方向へ使うんですね。", { face: "aha" }),
  ], ticketHint: "混乱技法の倫理と限界を質問できます" },
  { no: 4, title: "失った時こそ、学んだ原理を自分で使う", lines: [
    T("ep5-lec4-1", "原理カードは今、保管庫にありません。しかし、あなたが体験し、自分の言葉で使った順番まで消えたわけではありません。", { slide: S({ h: "カードは失われた\n体験は残っている", style: "vs", left: "保管庫\n空", right: "あなたの判断\n残る" }) }),
    L("ep5-lec4-2", "集め直すだけじゃない。なぜ持ち出したか、僕たちが学んだ催眠で調べる。", { face: "think" }),
    T("ep5-lec4-3", "ここから、あなたは答えを受け取る生徒ではありません。技術の使い方を判断する調査役です。"),
  ], ticketHint: "これからの調査と学びについて質問できます" },
];

export const EP5: Episode = {
  key: "ep5", no: 5,
  title: "信じていた相手に予想を裏切られた時、催眠をどう解く？",
  subtitle: "変態催眠学者の催眠の極意05｜Confusion and Reorientation",
  listing: { cover: "/learn/ep5/manga-v1/01.webp", coverAlt: "扉が開き原理カードが全て消えた保管庫", caseNo: "CASE 05", hook: "仲間と、原理カードが消えた。", principleNo: "エリクソン原理 05", mangaPages: 5, classroomScenes: 4, minutes: 20 },
  goal: { before: ["最初の解釈を事実だと決める", "混乱を急いで消そうとする", "誰かの命令へ判断を渡す"], after: ["今分かる事実を三つ挙げる", "まだ分からない意味を残す", "確認できる次の一手を選ぶ"], takeaway: "混乱を結論で埋めず、事実と未確定を分けて、選択を現在へ戻す。" }, tickets: 5,
  parts: [
    { kind: "manga", title: "第5の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校", beats: [
      { who: "teacher", tone: "question", text: "大切な相手との関係を壊したくないのに、予想外の行動を見た瞬間、『もう信じられない』と答えを決めたことはありませんか？" },
      { who: "teacher", tone: "example", text: "大切な相手から既読のまま返事が来ない夜、『返事がない。嫌われたかもしれない』と浮かび、何度も履歴を見直す。その瞬間、事実より先に文化的催眠が答えを決めています。" },
      { who: "link", tone: "reaction", text: "先生、講義どころじゃない。保管庫が開いてる。原理カードが全部ありません。" },
      { who: "teacher", tone: "example", text: "今分かるのは、扉が開いていることと、カードがないことです。" },
      { who: "link", tone: "reaction", text: "ミオもいない。昨日、鍵の場所を見ていた。あいつが裏切ったんだ。" },
      { who: "teacher", tone: "reveal", text: "それは答えではなく、混乱が作った最初の物語かもしれません。" },
      { who: "teacher", tone: "address", text: "{{userName}}。今まで学んだものを失った事件を、事実から調べてください。" },
    ], cta: "空の保管庫へ入る →" }, briefing: { caseNo: "CASE 05", eyebrow: "SINGA WORLD｜ARCHIVE INCIDENT", title: "原理カード消失", principle: "第5の催眠事件", hook: "カードを持ち出したミオは、本当に最初から二人を騙していた？", teaser: "映像にはミオが映っている。けれど、目的まではまだ分からない。", cta: "事件の漫画を見る →", note: "EPISODE 05｜漫画は1ページずつ進みます" }, frames: canonicalMangaFrames(5) },
    { kind: "experience", title: "予想を裏切られた場面を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "ミオがカードを持ち出した事実は分かりました。けれどリンクが本当に望むのは、関係を切ることではなく、なぜそうしたのか本人の理由を確かめることです。" },
      { who: "link", text: "裏切られた気持ちは消えません。でも、全部嘘だったと決める前に、本当の理由は知りたい。あなたなら、どんな時に答えを急ぎますか？" },
      { who: "teacher", text: "{{userName}}。自分に近い混乱を一つ選んでください。その場面で、現在へ戻る一言を作ります。" },
    ], cta: "自分の混乱を一つ選ぶ →" }, steps: [{ kind: "choice", q: "予想外の出来事で、意味を決めつけやすいのはどんな時ですか？", help: "近いものを選ぶか、自分の出来事を一文で書けます。", storeAs: "shockScene", completion: "option-or-detail", detail: { id: "ep5Detail", storeAs: "shockScene", label: "何が起きた時、最初の答えへ飛びつきますか？", placeholder: "例：返信がなく、嫌われたと決める", helper: "個人名は書かなくて大丈夫です。", then: [{ kind: "say", line: T("ep5-exp-detail", "その出来事を、事実とまだ分からない意味へ分けます。") }, { kind: "fade", text: "保管庫事件を調べる" }] }, options: [
      { label: "返事がなく、嫌われたと決める", value: "返事がないだけで嫌われたと決める時", then: [{ kind: "say", line: T("ep5-exp-a", "返事がない事実と、その理由の解釈を分けます。") }, { kind: "fade", text: "保管庫事件を調べる" }] },
      { label: "予定が崩れ、全部失敗だと思う", value: "予定が崩れて全部失敗だと思う時", then: [{ kind: "say", line: T("ep5-exp-b", "起きた変更と、全部失敗という解釈を分けます。") }, { kind: "fade", text: "保管庫事件を調べる" }] },
      { label: "仲間の行動を見て、裏切りだと思う", value: "仲間の予想外の行動を裏切りだと思う時", then: [{ kind: "say", line: T("ep5-exp-c", "行動の事実と、まだ分からない目的を分けます。") }, { kind: "fade", text: "保管庫事件を調べる" }] },
    ] }] },
    { kind: "adventure", scenario: EP5_ADVENTURE },
    { kind: "classroom", intro: { title: "ミオに裏切られたと思ったリンクが、なぜ送信元を調べると決められた？", lead: "リンクは、カードがないこと、鍵の印があること、映像が途中で切れたことを事実として確認しました。『最初から全部嘘だった』という結論を保留し、今できる確認を選ぶ順番を整理します。", basis: { subjectAnchor: "リンク", eventAnchor: "裏切られた", learningGoal: "混乱の中で事実と解釈を分け、確認できる次の一手を選ぶ順番" } }, scenes: SCENES },
    { kind: "qa", title: "混乱から注意を戻す催眠と、その倫理について質問はありますか？" },
    { kind: "card", lines: [T("ep5-card-01", "保管庫へ置くカードはありません。代わりに、この事件の中で使った順番を記録します。")], card: { series: "ERICKSON PRINCIPLE", no: "05", name: "CONFUSION AND REORIENTATION", reading: "混乱と再定位", principle: ["混乱を、急いだ結論で埋めない。", "事実・未確定・次の一手へ注意を戻す。"], summary: "予想外の出来事で判断が固まった時、確認できる事実、まだ分からない意味、今できる行動を分け、選択を現在へ戻す方法。", effect: "混乱が残っていても、最初に浮かんだ物語だけへ注意を縛られず、確認できる一手を選びやすくする。", useWhen: ["予想外の出来事で頭が真っ白になった時", "短い情報から相手の意図を決めつけた時", "混乱に乗じた命令から自分の判断を取り戻したい時"], howTo: ["今確認できる事実を三つ挙げる", "まだ分からない意味を未確定のまま残す", "自分で選べる確認行動を一つ決める"] }, after: [T("ep5-card-02", "この原理も今は事件記録へ封印します。カードが戻るまで、あなた自身の判断で覚えておいてください。", { face: "think" })] },
    { kind: "outro", lines: [
      L("ep5-out-01", "{{shockScene}}という時も、起きた事実と、頭が作った答えを分けられる。", { dynamic: true, face: "aha" }),
      T("ep5-out-02", "あなたはリンクへ、{{ep5Move}}。混乱を消さず、確認できる次の一手へ注意を戻しました。", { dynamic: true, face: "smile" }),
      L("ep5-out-03", "でも、ミオがカードを持ち出した事実は変わりません。僕は理由を知りたい。", { face: "think" }),
      T("ep5-out-04", "今日の講義は、ここまでです。ここから先は、事件の調査になります。", { face: "think" }),
      L("ep5-out-05", "淳。次は、ミオが残した映像の送信元を二人で調べない？ 誰が、どこから僕らへ暗示を送ったのか知りたい。", { face: "think" }),
      T("ep5-out-06", "原理を知る生徒から、その使い方を判断する調査役へ。あなたの次の授業は、もう始まっています。", { face: "smile" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "broken-card", narr: "保管庫の奥に、一枚だけ破れた紙が残っていた。" }] }, { panels: [{ art: "note-close", big: ["あなたは、", "もう生徒ではない。"] }, { art: "link-resolve", say: { who: "リンク", text: "送信元を追おう。" } }] }] }], hook: ["原理カードは戻らない。", "ミオの目的を追う、最初の校外調査が始まる。"], next: { no: "第6話", title: "言われていない意味を信じた時、催眠をどう解く？", series: "変態催眠学者の催眠の極意06", principle: "他人の言葉と、自分で受け入れた前提を見分ける" }, preview: { caseNo: "NEXT CASE 06", first: { who: "清瀬リンク", text: "この映像、送られた場所が学校の外です。" }, teacher: "では次は、誰の言葉を信じたのかではなく、どの前提を受け入れたかを調べましょう。" }, unlock: ["第6話へ進む"] },
  ],
  sceneSummaries: ["第5話は、原理カードが消え、信じていたミオが持ち出したと判明する危機から始まる。", "プレイヤーは事実と解釈を分け、過去の全てが嘘だったという早い結論を保留する。", "リンクの混乱へ、三つの事実と一つの確認行動を使い、現在へ注意を戻す。", "混乱と再定位は、混乱に乗じて相手を操る技法ではなく、本人の選択を取り戻す方向で扱う。", "物語上、獲得済み原理カードは保管庫から失われるが、実データは削除しない。", "プレイヤーは答えを受け取る生徒から、催眠の使い方と事件を判断する調査役へ変わる。"],
};

export const EP5_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP5, EP5_FOUNDATION);
export const EP5_EXPERIENCE_QUALITY = assertEpisodeExperience(EP5);

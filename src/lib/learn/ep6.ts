import type { Episode, Line, Scene, Slide } from "./types";
import { EP6_ADVENTURE } from "./ep6-adventure";
import { EP6_FOUNDATION } from "./ep6-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "文化的催眠は、誰か一人の命令ではない", lines: [
    L("ep6-lec1-1", "『迷惑をかけるな』『我慢できる人が偉い』。誰が言ったか覚えてなくても、自分の声みたいに残ることがあります。", { face: "think", slide: S({ h: "周囲の常識\n↓\n何度も聞く\n↓\n自分の声に聞こえる", style: "flow" }) }),
    T("ep6-lec1-2", "この授業では、社会で繰り返され、考え方や選択を狭める前提を『文化的催眠』として扱います。"),
    T("ep6-lec1-3", "常識を全部否定するのではありません。自分が何を受け入れているかに気づき、選び直せることが目的です。"),
  ], ticketHint: "文化的催眠と常識の違いを質問できます" },
  { no: 2, title: "言葉と、聞き手が作った意味", lines: [
    T("ep6-lec2-1", "『旧校舎へ』は言葉です。『一人で今すぐ』はリンクが補った意味でした。", { slide: S({ h: "言葉\n旧校舎へ\n≠\n推論\n一人で今すぐ", style: "cross" }) }),
    L("ep6-lec2-2", "言われてないのに、僕の中では命令みたいになっていました。", { face: "aha" }),
    T("ep6-lec2-3", "言葉が直接言っていない意味を、聞き手が推論して受け取る。これを Verbal Implication と呼びます。"),
  ], ticketHint: "言葉と推論の分け方を質問できます" },
  { no: 3, title: "前提は、否定しても残る", lines: [
    T("ep6-lec3-1", "『あなたはすぐ変われる力がある』を『私は嬉しくない』と否定しても、『変われる力がある』という部分は残ります。", { slide: S({ h: "PRESUPPOSITION\n（前提）", items: ["文を否定しても残ること", "気づけば同意しない選択もできる"], style: "list" }) }),
    L("ep6-lec3-2", "文の表面じゃなく、最初から本当として置かれた部分を見るんですね。", { face: "aha" }),
    T("ep6-lec3-3", "はい。前提を見抜く目的は、相手を疑い続けることではなく、自分の同意を取り戻すことです。"),
  ], ticketHint: "含意と前提の違いを質問できます" },
  { no: 4, title: "主人公が、この学校で学ぶ理由", lines: [
    T("ep6-lec4-1", "あなたは、常識を壊すためだけに入学したのではありません。自分と他者を縛る暗示に気づき、選択を返せる人になるために来ました。", { slide: S({ h: "見えない催眠に気づく\n↓\n受け入れる前提を選ぶ\n↓\n選べる世界をつくる", style: "flow" }) }),
    L("ep6-lec4-2", "カードを集めるのが目的じゃない。僕らが生きる世界で、誰の声を自分の声にするか選ぶためなんだ。", { face: "smile" }),
    T("ep6-lec4-3", "今回の校外調査は、その目的を初めて他人のためにも使う実習です。"),
  ], ticketHint: "主人公の目的と今後の物語を質問できます" },
];

export const EP6: Episode = {
  key: "ep6", no: 6,
  title: "言われていない意味を信じた時、催眠をどう解く？",
  subtitle: "変態催眠学者の催眠の極意06｜Verbal Implication",
  listing: { cover: "/learn/ep6/manga-v1/01.webp", coverAlt: "周囲の常識の声に囲まれた主人公と旧校舎からのメッセージ", caseNo: "CASE 06", hook: "その声は、本当に自分の声か。", principleNo: "エリクソン原理 06", mangaPages: 5, classroomScenes: 4, minutes: 22 },
  goal: { before: ["言われていない意味まで事実だと思う", "周囲の常識を自分の声だと思う", "隠れた前提へ急いで従う"], after: ["実際の言葉を取り出す", "自分が補った意味を分ける", "前提を受け入れるか選び直す"], takeaway: "言葉と、自分がそこから作った意味を分けると、見えない暗示を選び直せる。" },
  tickets: 5,
  parts: [
    { kind: "manga", title: "第6の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校｜入学理由", beats: [
      { who: "teacher", tone: "question", text: "『人に迷惑をかけるな』『我慢しろ』『目立つな』。それを、自分の本心だと思ったことはありませんか？" },
      { who: "link", tone: "reaction", text: "それは催眠じゃなく、普通の常識じゃないんですか？" },
      { who: "teacher", tone: "reveal", text: "何度も聞いた常識が、自分の選択を狭める時。それは、見えない文化的催眠として働きます。" },
      { who: "teacher", tone: "example", text: "{{userName}}の入学願書には『周りの普通を自分の声だと思い、本当の望みが分からなくなった』とあります。" },
      { who: "link", tone: "reaction", text: "だからこの学校で、自分にかかった催眠を見抜こうとしたんだ。" },
      { who: "teacher", tone: "address", text: "そして、誰もが受け入れる前提を自分で選べる世界をつくる。その最初の校外実習が始まります。" },
    ], cta: "入学の理由から事件へ →" }, briefing: { caseNo: "CASE 06", eyebrow: "SINGA WORLD｜FIRST FIELDWORK", title: "見えない命令", principle: "変態催眠学者の催眠の極意", hook: "言われていないのに、なぜ一人で行かなければと思った？", teaser: "ミオの映像を追う二人へ、旧校舎から一文だけが届く。", cta: "事件の漫画を見る →", note: "EPISODE 06｜漫画は1ページずつ進みます" }, frames: [1,2,3,4,5].map((n) => ({ img: "/learn/ep6/manga-v1/0" + n + ".webp", alt: "文化的催眠と旧校舎の暗示を追う漫画 " + n + "ページ目" })) },
    { kind: "experience", title: "自分の中に残る言葉を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "昔のあなたも、周囲の言葉を自分の本心だと思い、苦しみました。" },
      { who: "link", text: "事件の言葉だけじゃない。今も自分を止める『当然』はありますか？" },
      { who: "teacher", text: "{{userName}}。今の自分に近い文化的催眠を一つ選んでください。後で、言葉と前提を分けます。" },
    ], cta: "自分の中の言葉を選ぶ →" }, steps: [{ kind: "choice", q: "今も自分を縛りやすい『当然』はどれですか？", help: "近いものを選ぶか、自分の言葉を一文で書けます。", storeAs: "culturalTrance", completion: "option-or-detail", detail: { id: "ep6Detail", storeAs: "culturalTrance", label: "自分を縛る『当然』を一文にすると？", placeholder: "迷惑をかけてはいけない、など", helper: "誰が言ったか分からなくても大丈夫です。", then: [{ kind: "say", line: T("ep6-exp-detail", "その言葉が、本当に今のあなたが選んだ前提かを確かめます。") }, { kind: "fade", text: "旧校舎からの言葉を追う" }] }, options: [
      { label: "人に迷惑をかけてはいけない", value: "人に迷惑をかけてはいけない", then: [{ kind: "say", line: T("ep6-exp-a", "配慮することと、一度も助けを求めないことは同じかを分けます。") }, { kind: "fade", text: "旧校舎からの言葉を追う" }] },
      { label: "我慢できる人が立派だ", value: "我慢できる人が立派だ", then: [{ kind: "say", line: T("ep6-exp-b", "耐える選択と、苦しくても耐えるしかない前提を分けます。") }, { kind: "fade", text: "旧校舎からの言葉を追う" }] },
      { label: "良い成績・学校・仕事が人の価値だ", value: "良い成績や学校や仕事が人の価値を決める", then: [{ kind: "say", line: T("ep6-exp-c", "評価を得ることと、人の価値が一つの基準で決まることを分けます。") }, { kind: "fade", text: "旧校舎からの言葉を追う" }] },
    ] }] },
    { kind: "adventure", scenario: EP6_ADVENTURE },
    { kind: "classroom", intro: { title: "言われていないのに、なぜ命令されたように感じた？", lead: "言葉そのものと、聞き手が補った意味を分けると、受け入れた前提が見えてきます。" }, scenes: SCENES },
    { kind: "qa", title: "文化的催眠、言葉の含意、前提の見抜き方について質問はありますか？" },
    { kind: "card", lines: [T("ep6-card-01", "今は保管庫へ戻せません。この原理も事件記録として持って進んでください。")], card: { series: "ERICKSON PRINCIPLE", no: "06", name: "VERBAL IMPLICATION", reading: "ヴァーバル・インプリケーション（言葉の含意）", principle: ["実際に言われたことと、", "自分が補った意味を分ける。"], summary: "言葉が直接述べていない意味を聞き手が推論して受け取る働きに気づき、受け入れる前提を選び直す方法。", effect: "短い言葉や周囲の常識から自動的に作った意味を、事実と混同せず見直しやすくする。", useWhen: ["短い返信から嫌われたと思った時", "広告や強い言葉で急いで決めそうな時", "昔からの常識を自分の本心だと思う時"], howTo: ["実際に言われた言葉だけを取り出す", "自分がそこへ足した意味を書く", "その前提を今も選ぶか決める"] }, after: [T("ep6-card-02", "言葉の暗示を見抜く力は、旧校舎の扉でも必要になります。", { face: "think" })] },
    { kind: "outro", lines: [
      L("ep6-out-01", "{{culturalTrance}}も、最初から自分が選んだ声とは限らない。言葉と前提を分けていい。", { dynamic: true, face: "aha" }),
      T("ep6-out-02", "あなたはリンクへ、{{ep6Move}}。相手の言葉へ反対したのではなく、隠れた前提を外しました。", { dynamic: true, face: "smile" }),
      L("ep6-out-03", "僕らがつくりたいのは、誰かの普通に気づかず従う世界じゃない。選び直せる世界だ。", { face: "smile" }),
      T("ep6-out-04", "今日の講義はここまでです。次は、旧校舎の入口で『選べる二択』があなたを待っています。"),
      L("ep6-out-05", "選べるなら安全ですよね？ ……先生、その聞き方がもう怪しいですか？", { face: "think" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "locked-door", narr: "旧校舎の扉に、二つの選択が光る。" }] }, { panels: [{ art: "note-close", big: ["今、一人で入る", "一分後、一人で入る"] }, { art: "link-resolve", say: { who: "リンク", text: "選べるのに、何か変だ。" } }] }] }], hook: ["二つから選べる。", "それでも、自分で選んだとは限らない。"], next: { no: "第7話", title: "選ばされた二択から、自分の選択を取り戻すには？", series: "変態催眠学者の催眠の極意07", principle: "二択に共通する前提と、消された選択を見る" }, preview: { caseNo: "NEXT CASE 07", first: { who: "清瀬リンク", text: "今入るか、一分後に入るか。時間は選べます。" }, teacher: "では、どちらを選んでも同じことになる部分を見つけてください。" }, unlock: ["第7話へ進む"] },
  ],
  sceneSummaries: ["第6話は主人公の入学理由を描き、文化的催眠に苦しんだ過去と、選べる世界をつくる目的を明かす。", "ミオの映像を追う二人へ旧校舎から短いメッセージが届く。", "プレイヤーは実際の言葉と、リンクが補った意味を分ける。", "Verbal Implication と Presupposition を、隠れた操作ではなく選択を取り戻すために学ぶ。", "主人公は文化的催眠を見抜く学びを、初めて校外調査で他者のために使う。"],
};

export const EP6_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP6, EP6_FOUNDATION);
export const EP6_EXPERIENCE_QUALITY = assertEpisodeExperience(EP6);

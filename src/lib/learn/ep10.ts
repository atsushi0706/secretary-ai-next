import type { Episode, Line, Scene, Slide } from "./types";
import { EP10_ADVENTURE } from "./ep10-adventure";
import { EP10_FOUNDATION } from "./ep10-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "使える技法でも、使ってよいとは限らない", lines: [
    T("ep10-lec1-1", "ミオへ暗示すれば扉は開きました。しかし、扉が開くことは同意の証明ではありません。", { slide: S({ h: "技法が効く\n≠\n使ってよい", style: "cross" }) }),
    L("ep10-lec1-2", "カードを戻す正しい目的に、僕は方法まで正しいと思い込んでいました。", { face: "think" }),
    T("ep10-lec1-2b", "『答えが見えているのに、黙るのは無責任だ』という文化的催眠が、相手の同意より先に正解を渡そうとさせます。"),
    T("ep10-lec1-3", "目的と手段を分け、本人がどちらへ同意したか確かめます。"),
  ], ticketHint: "催眠を使わない判断について質問できます" },
  { no: 2, title: "催眠の前に、三つを本人へ返す", lines: [
    T("ep10-lec2-1", "何のために行うか。どの方法を使うか。いつでも止められるか。この三つを、本人が選べる言葉で確認します。", { slide: S({ h: "CONSENT BEFORE SUGGESTION", items: ["目的を共有する", "方法へ同意する", "途中で止められる"], style: "list" }) }),
    L("ep10-lec2-2", "『返したいと言ったから押すのも同意』とは決めない。", { face: "aha" }),
    T("ep10-lec2-3", "はい。目的への同意と、方法への同意は別です。"),
  ], ticketHint: "目的・方法・停止の確認を質問できます" },
  { no: 3, title: "同意できなければ、催眠を使わない", lines: [
    T("ep10-lec3-1", "本人が断る、分からない、怖いと言った時は止めます。気づかれない言葉へ変えて続けることはしません。", { slide: S({ h: "NO CONSENT\n↓\nSTOP\n↓\n別の安全な方法", style: "flow" }) }),
    L("ep10-lec3-2", "催眠を使わず三人で解除板を押した判断も、催眠を学んだ結果なんですね。", { face: "aha" }),
    T("ep10-lec3-3", "使わない判断までできて初めて、技法を扱えると言えます。"),
  ], ticketHint: "催眠の停止条件を質問できます" },
  { no: 4, title: "主人公が作るのは、選び直せる世界", lines: [
    T("ep10-lec4-1", "あなたは、我慢、成績、学校、お金、周囲の評価を唯一の正解だと思い、自分の望みを言えずに苦しみました。"),
    L("ep10-lec4-2", "だから学校へ来た。常識という催眠を見抜いて、誰かに別の正解を押し付けず、選び直せる世界を作るために。", { face: "smile" }),
    T("ep10-lec4-3", "今日、あなたはその世界を一度だけ実現しました。三人が従わず、それでも同じ扉を開けた。"),
  ], ticketHint: "主人公の目的と文化的催眠について質問できます" },
];

export const EP10: Episode = {
  key: "ep10", no: 10,
  title: "催眠で相手を動かせる時、何を守る？",
  subtitle: "変態催眠学者の催眠の極意10｜Consent Before Suggestion",
  listing: { cover: "/learn/ep10/manga-v1/01.webp", coverAlt: "催眠を使えば開く保管室の扉を前に立つ三人", caseNo: "CASE 10", hook: "使えば勝てる。使わないと決められるか。", principleNo: "エリクソン原理 10", mangaPages: 5, classroomScenes: 4, minutes: 24 },
  goal: { before: ["正しい目的なら方法も正しいと思う", "目的への同意を手段への同意とみなす", "効く技法を使うことを優先する"], after: ["目的と方法を分けて確認する", "同意と停止の自由を先に守る", "必要なら催眠を使わない"], takeaway: "催眠を使う前に目的・方法・停止の自由を本人と確認し、同意がなければ使わない。" },
  tickets: 5,
  parts: [
    { kind: "manga", title: "第10の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校｜原理保管室", beats: [
      { who: "teacher", tone: "question", text: "相手に結果を出してほしいほど、『早くこれをやって』と、本人の同意より先に方法を決めたくなることはありませんか？" },
      { who: "teacher", tone: "example", text: "相談を聞いて、自分には答えが見えた。相手はまだ考えているのに、『答えが見えているのに、黙っているのは無責任だ』と、先に方法まで決めて話す。それも文化的催眠です。" },
      { who: "link", tone: "reaction", text: "今の僕がそうです。ミオへ暗示すれば、盗まれたカードを全部戻せます。" },
      { who: "teacher", tone: "reveal", text: "技法が効くことと、使ってよいことは別です。最後の試験は、催眠を使う強さではありません。" },
      { who: "link", tone: "example", text: "ミオはカードを返したい。でも『戻れ』と命令されることは拒んでいます。" },
      { who: "teacher", tone: "address", text: "{{userName}}。カードより先に守るものを決め、三人の選択で扉を開けてください。" },
    ], cta: "最後の扉へ →" }, briefing: { caseNo: "CASE 10", eyebrow: "SINGA WORLD｜THE LAST DOOR", title: "使えば開く扉", principle: "変態催眠学者の催眠の極意", hook: "相手を一度動かせば全部戻る。それでも使う？", teaser: "勝つための暗示には、本人の同意だけがなかった。", cta: "最終事件の漫画を見る →", note: "EPISODE 10｜漫画は1ページずつ進みます" }, frames: [1,2,3,4,5].map((n) => ({ img: "/learn/ep10/manga-v1/0" + n + ".webp", alt: "同意のない催眠を使うか選ぶ最終事件漫画 " + n + "ページ目" })) },
    { kind: "experience", title: "正しい目的で急ぐ場面を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "カードを戻したいという目的は同じでした。しかし、ミオは命令されて戻る方法を選んでいません。良い結果を望むことと、その方法への同意は別です。" },
      { who: "link", text: "助けたい、成功してほしい。その気持ちが強い時ほど、相手のためと思って方法まで決めてしまうことはありますか？" },
      { who: "teacher", text: "{{userName}}。近い場面を選んでください。目的と方法を分ける最終判断に使います。" },
    ], cta: "自分の場面を選ぶ →" }, steps: [{ kind: "choice", q: "相手のためと思うほど、方法まで決めやすいのはどんな時ですか？", help: "近いものを選ぶか、自分の場面を一文で書けます。", storeAs: "ethicalConflict", completion: "option-or-detail", detail: { id: "ep10Detail", storeAs: "ethicalConflict", label: "どんな場面で方法まで決めますか？", placeholder: "急いで助けるため、説明せず代わりに決める時、など", helper: "具体名は書かなくて大丈夫です。", then: [{ kind: "say", line: T("ep10-exp-detail", "その場面で、目的・方法・止める自由を分けて確認します。") }, { kind: "fade", text: "最後の扉へ進む" }] }, options: [
      { label: "早く助けるため、説明を省く時", value: "早く助けるため説明を省いて決める時", then: [{ kind: "say", line: T("ep10-exp-a", "急ぐ時ほど、目的と方法への同意を分けます。") }, { kind: "fade", text: "最後の扉へ進む" }] },
      { label: "相手のために、代わりに決める時", value: "相手のためと思い代わりに決める時", then: [{ kind: "say", line: T("ep10-exp-b", "善意を理由にせず、本人へ選択を返します。") }, { kind: "fade", text: "最後の扉へ進む" }] },
      { label: "結果が出るなら、方法はよいと思う時", value: "結果が出るなら方法はよいと思う時", then: [{ kind: "say", line: T("ep10-exp-c", "結果ではなく、使う前の条件で判断します。") }, { kind: "fade", text: "最後の扉へ進む" }] },
    ] }] },
    { kind: "adventure", scenario: EP10_ADVENTURE },
    { kind: "classroom", intro: { title: "ミオへ『戻れ』と暗示すればカードが戻るのに、なぜ三人は催眠を使わなかった？", lead: "ミオはカードを返す目的には賛成していましたが、命令されて戻る方法は拒んでいました。三人は別の方法へ同意し、自分の手で解除板を押しました。催眠を使う前に、目的・方法・停止の自由を確認する原則を整理します。", basis: { subjectAnchor: "ミオ", eventAnchor: "カード", learningGoal: "目的への賛成と方法への同意を分け、催眠を使わない判断も含める" } }, scenes: SCENES },
    { kind: "qa", title: "催眠の同意、停止条件、専門家へつなぐ判断について質問はありますか？" },
    { kind: "card", lines: [T("ep10-card-01", "原理カードが保管庫へ戻ります。最後の一枚は、技法を使う前の条件です。")], card: { series: "ERICKSON PRINCIPLE", no: "10", name: "CONSENT BEFORE SUGGESTION", reading: "コンセント・ビフォー・サジェスチョン（暗示の前の同意）", principle: ["催眠の前に、", "本人の選択がある。"], summary: "催眠や暗示を使う前に、目的と具体的な方法を共有し、本人の同意、安全、途中で止める自由を確認する原則。", effect: "技法の成功を急いで相手の選択を飛ばさず、使う・使わないを倫理的に判断できる。", useWhen: ["他者へ催眠や暗示を使う前", "相手のために方法を決めたくなった時", "拒否やためらいが示された時"], howTo: ["目的を本人と共有する", "具体的な方法への同意を確認する", "断る・途中で止める自由を明示する"] }, after: [T("ep10-card-02", "封印が解除されました。失われた原理カードは、宝物庫でいつでも見返せます。", { face: "smile" })] },
    { kind: "outro", lines: [
      L("ep10-out-01", "{{ethicalConflict}}という時も、目的への賛成だけで方法まで決めたら、また誰かの常識へ従わせることになる。", { dynamic: true, face: "aha" }),
      T("ep10-out-02", "あなたはミオへ、{{ep10Move}}。カードより先に、本人の選択を守りました。", { dynamic: true, face: "smile" }),
      L("ep10-out-03", "三人で扉を開けた。誰も従わされていないのに、同じ目的へ進めたんですね。", { face: "smile" }),
      T("ep10-out-04", "{{userName}}。今日からあなたは、催眠実習調査員です。常識という催眠を見抜き、選び直せる世界を作ってください。", { face: "smile" }),
      L("ep10-out-05", "入学した時は、自分が何を望むかも言えなかった。でも先生、誰も命令していない『迷惑をかけるな』のような催眠は、学校の外でどう見抜くんですか？", { face: "think" }),
      T("ep10-out-06", "今日の講義は、ここまでです。第11話からは、学校の外にある文化的催眠を調査します。"),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "card-light", narr: "原理カードが戻ると、校外から新しい依頼が届いた。" }] }, { panels: [{ art: "mio-video", say: { who: "雨宮ミオ", text: "『迷惑をかけるな』で、助けを求められない教室があります。" } }, { art: "link-resolve", say: { who: "清瀬リンク", text: "今度は学校の外へ行くんだ。" } }] }] }], hook: ["誰がかけたか分からない。", "それでも、社会の言葉は人を止める。"], next: { no: "第11話", title: "『迷惑をかけるな』で助けを求められない時、催眠をどう解く？", series: "文化的催眠調査編", principle: "社会の前提を、自分の選択と分ける" }, preview: { caseNo: "NEXT CASE 11", first: { who: "雨宮ミオ", text: "困っているのに、誰も『助けて』と言えません。" }, teacher: "では、言えない人を責めず、その教室で正解になっている言葉から調べましょう。" }, unlock: ["第11話は準備中"] },
  ],
  sceneSummaries: ["暗示を使えばカードが戻る最後の扉に到着する。", "ミオは目的には同意するが、命令される方法を拒む。", "プレイヤーは目的・方法・停止の自由を分け、催眠を使わない判断を選ぶ。", "三人が自分で同意して解除板を押し、原理カードと宝物庫を取り戻す。", "主人公は催眠実習調査員となり、文化的催眠を見抜いて選び直せる世界を作る側へ進む。"],
};

export const EP10_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP10, EP10_FOUNDATION);
export const EP10_EXPERIENCE_QUALITY = assertEpisodeExperience(EP10);

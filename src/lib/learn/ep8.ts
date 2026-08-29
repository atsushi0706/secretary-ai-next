import type { Episode, Line, Scene, Slide } from "./types";
import { EP8_ADVENTURE } from "./ep8-adventure";
import { EP8_FOUNDATION } from "./ep8-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "説明は、正しくても届かないことがある", lines: [
    L("ep8-lec1-1", "僕は『決めつけは間違い』と説明されるより、鳥の見え方が変わった時に自分の決めつけへ気づきました。", { face: "aha", slide: S({ h: "説明\n正解を聞く\n≠\n体験\n自分で気づく", style: "cross" }) }),
    T("ep8-lec1-2", "情報を覚えるなら説明が役立ちます。状態や見方を変える時は、本人が経験する気づきが必要なことがあります。"),
    T("ep8-lec1-3", "催眠は情報を押し込むのではなく、別の体験を呼び起こすためにも使われます。"),
  ], ticketHint: "説明と体験の違いを質問できます" },
  { no: 2, title: "Metaphor は、似た構造を渡す", lines: [
    T("ep8-lec2-1", "鳥とミオは同じ人物ではありません。『持ち出した行動が、後の場面で別の意味に見える』構造が似ています。", { slide: S({ h: "鳥\n鍵を運ぶ\n↓\nミオ\nカードを運ぶ", style: "flow" }) }),
    L("ep8-lec2-2", "同じ話にするんじゃなく、考える形だけ借りるんですね。", { face: "aha" }),
    T("ep8-lec2-3", "これを Therapeutic Metaphor、治療的メタファーと呼びます。"),
  ], ticketHint: "メタファーの作り方を質問できます" },
  { no: 3, title: "物語の意味は、術者が決めない", lines: [
    T("ep8-lec3-1", "物語を語った後は、教訓を発表せず『どこが自分に重なりましたか』と聞きます。", { slide: S({ h: "語る\n↓\n重なった場面を聞く\n↓\n本人の意味を次へ使う", style: "flow" }) }),
    L("ep8-lec3-2", "答えを言ったら、遠回しな説教に戻ってしまう。", { face: "think" }),
    T("ep8-lec3-3", "その通りです。曖昧さは操作を隠すためでなく、本人の意味が入る余白です。"),
  ], ticketHint: "物語の後の質問を相談できます" },
  { no: 4, title: "主人公は、分からない人を置いていかない", lines: [
    T("ep8-lec4-1", "あなたは以前、説明を理解できない自分を悪いと思い、分からないと言えず我慢しました。"),
    L("ep8-lec4-2", "だから今は、正解を押し込まず、その人の経験から分かる道を作ろうとしている。", { face: "smile" }),
    T("ep8-lec4-3", "それが、理解の速さや表現の違いで人を置いていかない世界への一歩です。"),
  ], ticketHint: "学びを伝える設計について質問できます" },
];

export const EP8: Episode = {
  key: "ep8", no: 8,
  title: "説明しても届かない時、催眠をどう伝える？",
  subtitle: "変態催眠学者の催眠の極意08｜Therapeutic Metaphor",
  listing: { cover: "/learn/ep8/manga-v1/01.webp", coverAlt: "資料室で鍵を運ぶ鳥の物語を開くリンク", caseNo: "CASE 08", hook: "答えのない物語が、事件を動かす。", principleNo: "エリクソン原理 08", mangaPages: 5, classroomScenes: 4, minutes: 22 },
  goal: { before: ["正解を長く説明する", "物語の意味を一つに決める", "理解できない人を責める"], after: ["似た構造の短い物語を選ぶ", "重なった場面を本人に聞く", "本人の意味を次の質問へ使う"], takeaway: "物語は答えを隠すものではなく、本人が自分で意味を見つける体験にできる。" },
  tickets: 5,
  parts: [
    { kind: "manga", title: "第8の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校｜資料室", beats: [
      { who: "teacher", tone: "question", text: "正しい説明を聞くほど、責められた気がして内容が入らなくなることはありませんか？" },
      { who: "link", tone: "reaction", text: "あります。分からないと言えなくて、分かったふりをします。" },
      { who: "teacher", tone: "reveal", text: "説明を増やす代わりに、本人が自分で意味を見つける物語を使う催眠があります。" },
      { who: "link", tone: "example", text: "資料室に、ミオが残した『鍵を運ぶ鳥』の話があります。答えは書いてません。" },
      { who: "teacher", tone: "address", text: "{{userName}}。一場面ずつ読み、見方が変わる瞬間を自分で見つけてください。" },
    ], cta: "ミオの物語を開く →" }, briefing: { caseNo: "CASE 08", eyebrow: "SINGA WORLD｜THE STORY IN THE ARCHIVE", title: "鍵を運ぶ鳥", principle: "変態催眠学者の催眠の極意", hook: "盗んだ鳥は、なぜ鍵を壊さず隠した？", teaser: "物語の続きを見るたび、ミオの行動の意味が変わっていく。", cta: "事件の漫画を見る →", note: "EPISODE 08｜漫画は1ページずつ進みます" }, frames: [1,2,3,4,5].map((n) => ({ img: "/learn/ep8/manga-v1/0" + n + ".webp", alt: "鍵を運ぶ鳥とミオの意味を読む漫画 " + n + "ページ目" })) },
    { kind: "experience", title: "説明が届かなかった場面を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "鳥の物語は、ミオが善人だと説明してはいません。二人に別の見方を体験させました。" },
      { who: "link", text: "あなたも、正しい説明をされるほど心が閉じたことはありますか？" },
      { who: "teacher", text: "{{userName}}。近い場面を選んでください。後で、説明を短い物語へ変えます。" },
    ], cta: "自分の場面を選ぶ →" }, steps: [{ kind: "choice", q: "説明されるほど、受け取りにくくなるのはどんな時ですか？", help: "近いものを選ぶか、自分の場面を一文で書けます。", storeAs: "blockedExplanation", completion: "option-or-detail", detail: { id: "ep8Detail", storeAs: "blockedExplanation", label: "どんな説明が届きにくいですか？", placeholder: "失敗の理由を長く説明される時、など", helper: "誰の話かはぼかして大丈夫です。", then: [{ kind: "say", line: T("ep8-exp-detail", "その場面と似た構造を持つ、短い物語を考えます。") }, { kind: "fade", text: "ミオの物語を読む" }] }, options: [
      { label: "失敗の理由を長く説明される時", value: "失敗の理由を長く説明される時", then: [{ kind: "say", line: T("ep8-exp-a", "間違いの説明ではなく、見直した体験を物語にします。") }, { kind: "fade", text: "ミオの物語を読む" }] },
      { label: "正論で『考え方を変えて』と言われる時", value: "正論で考え方を変えるよう言われる時", then: [{ kind: "say", line: T("ep8-exp-b", "正解を言わず、別の見方が生まれる場面を使います。") }, { kind: "fade", text: "ミオの物語を読む" }] },
      { label: "できない自分を励まされ続ける時", value: "できない自分を励まされ続ける時", then: [{ kind: "say", line: T("ep8-exp-c", "反対の評価ではなく、自分で力に気づける物語を使います。") }, { kind: "fade", text: "ミオの物語を読む" }] },
    ] }] },
    { kind: "adventure", scenario: EP8_ADVENTURE },
    { kind: "classroom", intro: { title: "正解を説明していないのに、なぜ見方が変わった？", lead: "物語の場面を追い、自分に重なる意味を本人が選んだからです。" }, scenes: SCENES },
    { kind: "qa", title: "Therapeutic Metaphor、物語の作り方、意味の聞き方について質問はありますか？" },
    { kind: "card", lines: [T("ep8-card-01", "物語から得た原理を、事件記録へ加えます。")], card: { series: "ERICKSON PRINCIPLE", no: "08", name: "THERAPEUTIC METAPHOR", reading: "セラピューティック・メタファー（治療的メタファー）", principle: ["似た構造の物語で、", "本人が自分の意味を見つける。"], summary: "正解を直接説明する代わりに、相手の状況と似た構造の物語を示し、本人が重なる意味を発見できるようにする方法。", effect: "説明へ身構えている時も、責められずに別の見方や可能性へ気づきやすくする。", useWhen: ["正論が届かず会話が止まる時", "自分を責めず別の見方を試したい時", "複雑な原理を体験として伝えたい時"], howTo: ["相手の問題と似た構造を一つ見つける", "短い物語として結末まで語る", "どこが重なったか本人へ聞く"] }, after: [T("ep8-card-02", "物語の奥から、ミオ本人の声が聞こえました。", { face: "think" })] },
    { kind: "outro", lines: [
      L("ep8-out-01", "{{blockedExplanation}}という時も、説明を増やすより、自分で気づける体験が必要かもしれない。", { dynamic: true, face: "aha" }),
      T("ep8-out-02", "あなたはリンクへ、{{ep8Move}}。教訓を言わず、本人が自分の力を見つける物語を渡しました。", { dynamic: true, face: "smile" }),
      L("ep8-out-03", "ミオは資料室の奥にいる。カードを盗んだ理由を、今度は自分の言葉で話すって。", { face: "think" }),
      T("ep8-out-04", "今日の講義はここまでです。次は、戻りたいのに戻れないミオへ実際に催眠を使います。"),
      L("ep8-out-05", "会えたら『今すぐ戻れ』って言いたい。でも、それがまた命令になるんですよね？", { face: "think" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "mio-video", narr: "資料室の奥で、ミオが出口を見つめていた。" }] }, { panels: [{ art: "mio-video", say: { who: "ミオ", text: "戻りたい。でも戻れば、二人の学びを壊す。" } }, { art: "link-resolve", say: { who: "リンク", text: "戻れって言えない。" } }] }] }], hook: ["戻りたい。", "それでも、体は一歩も動かない。"], next: { no: "第9話", title: "戻りたいのに動けない相手へ、催眠をどう使う？", series: "変態催眠学者の催眠の極意09", principle: "しない自由を残し、できる可能性を渡す" }, preview: { caseNo: "NEXT CASE 09", first: { who: "雨宮ミオ", text: "私は戻れません。戻れば、全部壊れます。" }, teacher: "戻れとは言いません。まず、戻りたいと言った声も一緒に聞きましょう。" }, unlock: ["第9話へ進む"] },
  ],
  sceneSummaries: ["資料室でミオが残した鍵を運ぶ鳥の物語を見つける。", "三場面を順に読むと、盗みが保護だった可能性へ見方が変わる。", "プレイヤーは物語を使って自分を責めるリンクに気づきを促す。", "Therapeutic Metaphor は説明を隠す技法ではなく、本人が意味を見つける体験である。", "主人公は理解できない人を置いていかない伝え方を学ぶ。"],
};

export const EP8_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP8, EP8_FOUNDATION);
export const EP8_EXPERIENCE_QUALITY = assertEpisodeExperience(EP8);

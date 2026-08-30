/**
 * 第2話｜催眠を拒否する相手を説得せず、本人が選べる暗示へ変える
 */
import type { Episode, Line, Scene, Slide } from "./types";
import { EP2_ADVENTURE } from "./ep2-adventure";
import { EP2_FOUNDATION } from "./ep2-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  {
    no: 1,
    title: "説得すると、なぜ守りが強くなる？",
    lines: [
      T("ep2-lec1-1", "相手が『催眠にかかりたくない』と言う時、その人は自分を守ろうとしています。そこで『大丈夫』『かかります』と反論すると、会話は催眠ではなく勝負になります。", {
        slide: S({ h: "相手『かかりたくない』\n↓\nこちら『大丈夫、かかります』\n↓\n相手は、もっと自分を守る", style: "flow" }),
      }),
      L("ep2-lec1-2", "僕が『怖くないから閉じて』と言われた時、怖さより先に『分かってもらえてない』と思ったのは、そのせいですか？", { face: "think" }),
      T("ep2-lec1-3", "そうです。相手の感じ方を否定すると、相手は催眠を体験するより、自分の拒否が正しいと証明することへ注意を向けます。"),
      T("ep2-lec1-4", "だから先に、何をしたくないのかを具体的に聞きます。そして、その行動を本当にしなくてよい状態を作ります。"),
    ],
    ticketHint: "拒否された時に、どこまで聞けばよいか質問できます",
  },
  {
    no: 2,
    title: "拒否を、催眠の最初の行動へ変える",
    lines: [
      L("ep2-lec2-1", "男性は、催眠に入りたくてまぶたを見たんじゃない。かからないと証明するために見た。でも、その観察が催眠の始まりになったんですね。", { face: "aha", slide: S({ style: "vs", left: "目を閉じさせる\n説得・命令", right: "閉じないために\nまぶたを観察する" }) }),
      T("ep2-lec2-2", "その通りです。拒否を消したのではありません。『目を閉じない』という目的を残したまま、本人が自分のまぶたを観察できる暗示へ変えました。"),
      T("ep2-lec2-3", "観察を始めると、本人は呼吸やまぶたの重さなど、実際に起きている変化を自分で見つけられます。"),
      L("ep2-lec2-4", "だから僕も、先生に目を閉じさせられたんじゃない。閉じないために見ていたら、閉じた方が楽だと自分で気づいたんですね。", { face: "aha" }),
      T("ep2-lec2-5", "はい。閉じるか、続けるか、やめるか。その決定は最後まで本人のものです。"),
    ],
    ticketHint: "『拒否を使う』と『逆らわせない』の違いを質問できます",
  },
  {
    no: 3,
    title: "抵抗のUtilization",
    lines: [
      L("ep2-lec3-1", "では、相手が拒否したら、毎回『しなくていい』と言えばいいんですか？", { face: "think", slide: S({ h: "UTILIZATION OF RESISTANCE\n（抵抗のユーティライゼーション）", style: "steps", items: ["何をしたくないのか聞く", "その選択を本当に残す", "拒否するための観察を暗示にする"] }) }),
      T("ep2-lec3-2", "いいえ。言葉だけを真似しても、内心で相手を従わせようとしていれば、逆心理の罠になります。"),
      T("ep2-lec3-3", "まず『目を閉じたくない』『言う通りにしたくない』など、拒否の内容を具体的に聞きます。次に、その選択を本当に残します。"),
      T("ep2-lec3-4", "そのうえで、『閉じないために重さを確かめる』『変化しないことを自分で確かめる』と、本人が自分で行える観察へ変えます。"),
      L("ep2-lec3-5", "拒否を利用するって、拒否を裏から破ることじゃない。拒否したまま本人ができることから、催眠を始めるんですね。", { face: "aha" }),
    ],
    ticketHint: "自分が作った一言を先生に確認できます",
  },
  {
    no: 4,
    title: "『しなくていい』を罠にしない",
    lines: [
      T("ep2-lec4-1", "ここは最も大切です。『しなくていい』は、相手に逆の行動をさせるための罠ではありません。", { slide: S({ h: "断る自由が、本当にある", style: "big" }) }),
      L("ep2-lec4-2", "もし僕が最後まで目を閉じなかったり、途中でやめたいと言ったら？", { face: "think" }),
      T("ep2-lec4-3", "その選択を受け入れ、止めます。催眠を望んでいない人へ、気づかれないようにかける技術として使ってはいけません。"),
      T("ep2-lec4-4", "また、医療や心理の問題を扱う催眠は、訓練を受けた専門家の範囲です。この授業だけで治療できるとは考えないでください。"),
      L("ep2-lec4-5", "選べると言いながら、実は選ばせない。それをした瞬間に、今日の催眠とは別物になるんですね。", { face: "aha" }),
    ],
    ticketHint: "同意、安全、途中で止める判断も質問できます",
  },
];

export const EP2: Episode = {
  key: "ep2",
  no: 2,
  title: "『私は絶対に催眠にかかりません』と言う相手へ、どう催眠をかける？",
  subtitle: "変態催眠学者の催眠の極意02｜抵抗のUtilization",
  listing: {
    cover: "/learn/ep2/episode-cover.webp",
    coverAlt: "腕を組んで催眠を拒否する男性と、反論せずに向き合うミルトン・エリクソン",
    caseNo: "CASE 02",
    hook: "『絶対にかからない』と言う相手。",
    principleNo: "エリクソン原理 02",
    mangaPages: 5,
    classroomScenes: 4,
    minutes: 17,
  },
  goal: {
    before: ["拒否されたら、説得する", "強い暗示で従わせようとする", "無理だと思って催眠を諦める"],
    after: ["相手が何を拒否しているか聞く", "その選択を本当に残す", "拒否するための観察を、本人が選べる暗示へ変える"],
    takeaway: "相手の『したくない』を否定せず、そのまま本人が選べる催眠の一言へ変える。",
  },
  tickets: 5,
  parts: [
    {
      kind: "manga",
      title: "第2の催眠事件",
      schoolIntro: {
        kicker: "SINGA WORLD 催眠学校",
        beats: [
          { who: "teacher", tone: "question", text: "催眠が自分に役立つなら試したい。でも、誰かに操られるのは怖い。そう話す人が来たら、どうしますか？" },
          { who: "teacher", tone: "example", text: "この男性も、友人に勧められて自分から来ました。けれど、主導権は渡したくない。だから『私は絶対に催眠にかかりません』と言ったのです。" },
          { who: "link", tone: "reaction", text: "受けたい気持ちもあるのに、怖くて入口で止まってるんだ。説得したら、余計に警戒されそうです。" },
          { who: "teacher", tone: "reveal", text: "私は、その人へ『では、かからないようにしてください』と答えました。" },
          { who: "link", tone: "reaction", text: "拒否している人に、もっと拒否してって言うんですか？" },
          { who: "teacher", tone: "address", text: "{{userName}}。拒否が残ったまま、なぜ催眠が始まったのか。事件を見てください。" },
        ],
        cta: "事件を見る →",
      },
      briefing: {
        caseNo: "CASE 02",
        eyebrow: "変態催眠学者｜MILTON H. ERICKSON",
        title: "催眠を拒む男",
        principle: "第2の催眠事件",
        hook: "『絶対にかからない』と警戒した男が、なぜ自分から目を閉じたのか？",
        teaser: "変わりたい気持ちと、操られたくない拒否。その両方を残したまま催眠を始めた。",
        cta: "事件の漫画を見る →",
        note: "EPISODE 02｜漫画は1ページずつ進みます",
      },
      frames: [
        { img: "/learn/ep2/manga-v1/01.webp", alt: "自分の意思で診察室へ来た男性が、腕を組み、催眠には絶対にかからないと宣言する" },
        { img: "/learn/ep2/manga-v1/02.webp", alt: "エリクソンが説得せず、では催眠にかからないようにしてくださいと答え、男性が驚く" },
        { img: "/learn/ep2/manga-v1/03.webp", alt: "男性が催眠にかからないと証明するため、目を開けたまま自分のまぶたを観察する" },
        { img: "/learn/ep2/manga-v1/04.webp", alt: "男性がまぶたの重さと呼吸の変化を自分で見つけ、エリクソンが観察を続けるよう伝える" },
        { img: "/learn/ep2/manga-v1/05.webp", alt: "男性が自分で目を閉じてもよいか聞き、決定を返され、自分の意思で目を閉じる" },
      ],
    },
    {
      kind: "experience",
      title: "拒否された場面を選ぶ",
      minutes: 2,
      bridge: {
        beats: [
          { who: "teacher", text: "この男性が欲しかったのは、命令どおりに目を閉じることではありません。自分の意思を保ったまま、催眠が役立つか確かめることでした。" },
          { who: "link", text: "だから、拒否したまま自分の変化を確かめて、最後は続けるかどうかも自分で決めたんですね。" },
          { who: "teacher", text: "その通りです。{{userName}}。あなたが催眠をかける側なら、相手のどの拒否が一番難しいと思いますか？" },
        ],
        cta: "難しい拒否を一つ選ぶ →",
      },
      steps: [
        {
          kind: "choice",
          q: "催眠の相手に言われたら、一番困るのはどれですか？",
          help: "近いものを一つ選ぶか、別の言葉を下へ書いてください。どちらか一方で進めます。",
          storeAs: "resistanceScene",
          completion: "option-or-detail",
          detail: {
            id: "ep2ResistanceDetail",
            storeAs: "resistanceScene",
            label: "相手が拒否するとしたら、どんな一言ですか？",
            placeholder: "例：あなたの言う通りには絶対にしません",
            helper: "一文で書くか、そのまま話してください。後の実演で使います。",
            then: [
              { kind: "say", line: T("ep2-exp-detail", "その拒否をやめさせず、催眠を始める一言へ変えてみましょう。") },
              { kind: "fade", text: "拒否が催眠へ変わる瞬間を追う" },
            ],
          },
          options: [
            { label: "『私は絶対に催眠にかかりません』", value: "私は絶対に催眠にかかりません", then: [{ kind: "say", line: T("ep2-exp-no-hypnosis", "『かからない』を否定せず、そのまま催眠の最初の行動へ変えてみましょう。") }, { kind: "fade", text: "拒否が催眠へ変わる瞬間を追う" }] },
            { label: "『目は閉じません』", value: "目は閉じません", then: [{ kind: "say", line: T("ep2-exp-eyes", "目を閉じさせず、目を閉じないまま始められる催眠を作ってみましょう。") }, { kind: "fade", text: "拒否が催眠へ変わる瞬間を追う" }] },
            { label: "『あなたの言う通りにはしません』", value: "あなたの言う通りにはしません", then: [{ kind: "say", line: T("ep2-exp-control", "従わせようとせず、本人が選ぶ催眠へ変えてみましょう。") }, { kind: "fade", text: "拒否が催眠へ変わる瞬間を追う" }] },
          ],
        },
      ],
    },
    { kind: "adventure", scenario: EP2_ADVENTURE },
    {
      kind: "classroom",
      intro: {
        title: "拒否を消さずに、なぜ催眠が始まった？",
        lead: "男性とリンクは、拒否したまま自分の感覚を確かめ、自分で次の行動を選びました。その流れを催眠の原理として整理します。",
      },
      scenes: SCENES,
    },
    { kind: "qa", title: "拒否する相手への催眠について、エリクソンに聞きたいことはありますか？" },
    {
      kind: "card",
      lines: [T("ep2-card-01", "では最後に、拒否された時の順番を、そのまま持って帰ってください。")],
      card: {
        series: "ERICKSON PRINCIPLE",
        no: "02",
        name: "UTILIZATION OF RESISTANCE",
        reading: "抵抗のユーティライゼーション",
        principle: ["相手の『したくない』を否定しない。", "そのまま、本人が選べる暗示へ変える。"],
        summary: "相手が催眠を拒否している時、拒否を説得で消さず、その人が拒否するためにできる観察を、本人が選べる暗示へ変える方法。",
        effect: "相手との勝負を作らず、断る自由を残したまま、本人が自分の感覚を確かめるところから催眠を始められる。",
        useWhen: [
          "『私は絶対に催眠にかかりません』と言われた時",
          "『目を閉じたくない』など、一つのやり方を拒否された時",
          "説得するほど、相手の警戒が強くなっている時",
        ],
        howTo: [
          "相手が何をしたくないのか、具体的に聞く",
          "その選択を本当に残す",
          "拒否するために本人ができる観察を、次の暗示にする",
        ],
      },
      after: [T("ep2-card-02", "肝は、『しなくていい』という言葉ではありません。本当に断れること。そのうえで、拒否するために本人ができる観察から催眠を始めることです。", { face: "smile" })],
    },
    {
      kind: "outro",
      lines: [
        L("ep2-out-01", "最初の実演では、{{openingMove}}。その一言で僕は、催眠を怖がったままでも、続けるかどうかを自分で選べました。", { face: "aha", dynamic: true }),
        T("ep2-out-02", "『{{resistanceScene}}』と言う相手に対し、あなたは{{personalMove}}。それが、あなたが作った抵抗のUtilizationです。", { face: "smile", dynamic: true }),
        T("ep2-out-03", "今日、あなたは拒否する相手を言い負かしませんでした。断る自由を残したまま、本人が自分で確かめられる催眠へ変えました。", { face: "smile" }),
        T("ep2-out-04", "今日の講義は、ここまでです。", { face: "smile" }),
        L("ep2-out-05", "ありがとうございました。……先生。目は閉じたのに、頭の中のおしゃべりが止まらない人は、どうするんですか？", { face: "think" }),
        T("ep2-out-06", "止めようとするほど、声は大きくなることがあります。次は、そのおしゃべりから催眠を始めましょう。", { face: "smile" }),
      ],
    },
    {
      kind: "teaser",
      manga: [{ rows: [{ panels: [{ art: "link-worry", say: { who: "リンク", text: "目は閉じたのに、頭の中がずっとしゃべっています。" } }, { art: "erickson-calm", say: { who: "エリクソン", text: "止めなくて結構です。" } }] }, { h: 1.4, panels: [{ art: "erickson-say", say: { who: "エリクソン", text: "その声に、もっと話してもらいましょう。" }, sfx: "え？" }] }] }],
      hook: ["目を閉じても、考えが次々に浮かぶ。", "止めようとするほど止まらない頭へ、どう催眠をかける？"],
      next: {
        no: "第3話",
        title: "考えすぎて催眠に入れない人へ、どう催眠をかける？",
        series: "変態催眠学者の催眠の極意03",
        principle: "止まらない思考を消さず、そのまま催眠の声へ変える",
      },
      preview: {
        caseNo: "NEXT CASE 03",
        first: { who: "清瀬リンク", text: "目は閉じたのに、頭の中のおしゃべりが止まりません。" },
        teacher: "止めなくて結構です。その声に、もっと話してもらいましょう。",
      },
      unlock: ["🔒 70コインで解放"],
    },
  ],
  sceneSummaries: [
    "第2話は、『私は絶対に催眠にかかりません』と言う相手へ、拒否を説得で消さず、本人が選べる催眠の一言へ変える方法を学ぶ。",
    "漫画では、エリクソンが『では、かからないようにしてください』と拒否を認め、男性が拒否するために自分のまぶたと呼吸を観察し始める。",
    "男性は警戒を捨てたのではなく、閉じるかどうかを自分で決め、最後は自分の意思で目を閉じた。",
    "ユーザーは漫画を三段階で読み返し、拒否を認めたこと、拒否するために観察したこと、最後まで本人が決めたことを言葉にする。",
    "ユーザーは、目を閉じないと言うリンクへ、目を閉じない自由を残し、まぶたの感覚を確かめてもらう一言を選ぶ。",
    "リンクは怖さが少し残ったまま、自分の感覚を観察し、自分で目を閉じると決める。",
    "抵抗のUtilizationは、相手の『したくない』を否定せず、そのまま本人が選べる暗示へ変える方法として扱う。",
    "『しなくていい』は逆心理の罠ではなく、本当に断る自由を残す必要がある。同意のない相手へ隠れて催眠をかける技術とは扱わない。",
  ],
};

export const EP2_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP2, EP2_FOUNDATION);
export const EP2_EXPERIENCE_QUALITY = assertEpisodeExperience(EP2);

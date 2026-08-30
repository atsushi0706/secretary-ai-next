import type { Episode, Line, Scene, Slide } from "./types";
import { EP7_ADVENTURE } from "./ep7-adventure";
import { EP7_FOUNDATION } from "./ep7-foundation";
import { assertEpisodeLearningFlow } from "./episode-review";
import { assertEpisodeExperience } from "./episode-experience-review";

const T = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "teacher", text, ...extra });
const L = (id: string, text: string, extra: Partial<Line> = {}): Line => ({ id, who: "link", text, ...extra });
const S = (slide: Slide): Slide => slide;

const SCENES: Scene[] = [
  { no: 1, title: "二択は、共通する前提を隠せる", lines: [
    T("ep7-lec1-1", "『今入る』『一分後に入る』は時間の選択です。しかし、どちらも一人で入る前提でした。", { slide: S({ h: "今、一人で入る\n／\n一分後、一人で入る", style: "vs", left: "違う\n時間", right: "同じ\n一人で入る" }) }),
    L("ep7-lec1-2", "選んでいる間に、もっと大きな決定をしたことになっていました。", { face: "aha" }),
    T("ep7-lec1-2b", "仕事でも『ここで辞めたら逃げだ』という文化的催眠が残ると、我慢するか、全部捨てるかの二択しか見えなくなります。"),
    T("ep7-lec1-3", "まず違う部分ではなく、二つに共通する行動を見ます。"),
  ], ticketHint: "二択の隠れた前提を質問できます" },
  { no: 2, title: "Therapeutic Bind は、動ける道を増やす", lines: [
    T("ep7-lec2-1", "エリクソンは、どちらを選んでも本人の目的へ近づける therapeutic bind を使いました。", { slide: S({ h: "THERAPEUTIC BIND\n（セラピューティック・バインド）", items: ["本人の目的が同じ", "どれも安全", "選ばない自由も残る"], style: "list" }) }),
    L("ep7-lec2-2", "術者の望みへ追い込む二択とは、目的の持ち主が違うんですね。", { face: "aha" }),
    T("ep7-lec2-3", "はい。催眠の二択は、相手の選択を奪う技法ではありません。"),
  ], ticketHint: "治療的バインドの使い方を質問できます" },
  { no: 3, title: "選択には、断る道を見えるようにする", lines: [
    T("ep7-lec3-1", "進む、待つ、戻る。どれも罰や恥へ結びつけない時、本人は本当に選べます。", { slide: S({ h: "進む\n待つ\n戻る", style: "list" }) }),
    L("ep7-lec3-2", "『怖くないなら入れる』は、戻る道を恥にして消す言葉です。", { face: "think" }),
    T("ep7-lec3-3", "正解に見える選択肢より、本人が安全に断れることを先に確かめます。"),
  ], ticketHint: "断る自由の示し方を質問できます" },
  { no: 4, title: "主人公は、用意された正解の外へ進む", lines: [
    T("ep7-lec4-1", "あなたは以前、周囲が用意した正解の中で選ぶことを、自分で決めることだと思っていました。"),
    L("ep7-lec4-2", "今回は、扉が用意していない道を僕らで見つけた。調査って、選択肢を増やすことでもあるんだ。", { face: "smile" }),
    T("ep7-lec4-3", "その判断が、誰もが断る、待つ、別の道を作ることを選べる世界へつながります。"),
  ], ticketHint: "主人公の成長と選択について質問できます" },
];

export const EP7: Episode = {
  key: "ep7", no: 7,
  title: "選ばされた二択から、自分の選択を取り戻すには？",
  subtitle: "変態催眠学者の催眠の極意07｜Therapeutic Bind",
  listing: { cover: "/learn/ep7/manga-v1/01.webp", coverAlt: "二つの選択が光る旧校舎の扉", caseNo: "CASE 07", hook: "選べるのに、逃げ道がない。", principleNo: "エリクソン原理 07", mangaPages: 5, classroomScenes: 4, minutes: 21 },
  goal: { before: ["出された二択の中だけで考える", "二択に共通する前提を見落とす", "断ることを恥だと思う"], after: ["二択の共通点を見る", "保留・拒否・別案を見つける", "本人が安全に選べる形へ直す"], takeaway: "二択を選ぶ前に共通する前提を見て、断る・待つ・別の道を取り戻す。" },
  tickets: 5,
  parts: [
    { kind: "manga", title: "第7の催眠事件", schoolIntro: { kicker: "SINGA WORLD 催眠学校｜旧校舎", beats: [
      { who: "teacher", tone: "question", text: "今の仕事を我慢して続けるか、すぐ辞めるか。二つから選べるのに、どちらでも望む未来へ進めないことはありませんか？" },
      { who: "teacher", tone: "example", text: "眠れないまま会社へ向かう朝、『ここで辞めたら逃げだ。みんな我慢している』と浮かび、今日も何も相談せず電車に乗る。それも文化的催眠です。" },
      { who: "link", tone: "example", text: "辞めたい。でも逃げたと思われたくない。そうなると、我慢するか、全部捨てて辞めるかしか見えなくなるんだ。" },
      { who: "teacher", tone: "reveal", text: "選択肢の違いへ注意を向けると、両方に共通する前提が見えなくなります。" },
      { who: "link", tone: "reaction", text: "旧校舎の扉も同じだ。今か一分後かは選べても、一人で入ることは決まってる。" },
      { who: "teacher", tone: "address", text: "{{userName}}。用意された二択の外から、安全な第三の道を見つけてください。" },
    ], cta: "旧校舎の扉へ →" }, briefing: { caseNo: "CASE 07", eyebrow: "SINGA WORLD｜THE FALSE CHOICE", title: "逃げ道のない二択", principle: "変態催眠学者の催眠の極意", hook: "『今入る』『一分後に入る』。本当に選べている？", teaser: "一人で入ることだけは、どちらにも書かれていた。", cta: "事件の漫画を見る →", note: "EPISODE 07｜漫画は1ページずつ進みます" }, frames: [1,2,3,4,5].map((n) => ({ img: "/learn/ep7/manga-v1/0" + n + ".webp", alt: "旧校舎の二択と第三の道を探す漫画 " + n + "ページ目" })) },
    { kind: "experience", title: "自分を狭める二択を選ぶ", minutes: 2, bridge: { beats: [
      { who: "teacher", text: "扉の二択は、時間を選ばせながら、一人で入ることを前提にしていました。" },
      { who: "link", text: "仕事を我慢するか辞めるかみたいに、人生でも第三の道が消えることがあります。あなたにも近い二択はありますか？" },
      { who: "teacher", text: "{{userName}}。近い場面を一つ選んでください。断る道を戻す練習に使います。" },
    ], cta: "自分の二択を選ぶ →" }, steps: [{ kind: "choice", q: "選択肢があるのに、追い込まれやすいのはどんな時ですか？", help: "近いものを選ぶか、自分の場面を一文で書けます。", storeAs: "forcedChoice", completion: "option-or-detail", detail: { id: "ep7Detail", storeAs: "forcedChoice", label: "どんな二択に追い込まれますか？", placeholder: "今やるか、失敗するか、など", helper: "二つに共通する前提も思い出せれば書いてください。", then: [{ kind: "say", line: T("ep7-exp-detail", "その二択に共通する前提と、消された選択を探します。") }, { kind: "fade", text: "旧校舎の扉を調べる" }] }, options: [
      { label: "今の仕事を我慢するか、すぐ辞めるか", value: "仕事を我慢して続けるか、すぐ辞めるかで迷う時", then: [{ kind: "say", line: T("ep7-exp-a", "相談する、条件を変える、小さく試す選択も戻せます。") }, { kind: "fade", text: "旧校舎の扉を調べる" }] },
      { label: "完璧に準備して始めるか、諦めるか", value: "完璧に準備して始めるか、諦めるかで迷う時", then: [{ kind: "say", line: T("ep7-exp-b", "小さく試す、助けを借りる、期限を決めて保留する道もあります。") }, { kind: "fade", text: "旧校舎の扉を調べる" }] },
      { label: "我慢するか、迷惑をかけるか", value: "我慢するか迷惑をかけるかを迫られる時", then: [{ kind: "say", line: T("ep7-exp-c", "相談する、範囲を決める、断る道も探せます。") }, { kind: "fade", text: "旧校舎の扉を調べる" }] },
    ] }] },
    { kind: "adventure", scenario: EP7_ADVENTURE },
    { kind: "classroom", intro: { title: "『今一人で入る』『一分後に一人で入る』から選んだリンクが、なぜ追い込まれた？", lead: "二つの選択肢は時間だけが違い、どちらもリンクが一人で旧校舎へ入ることを前提にしていました。二択に共通する前提を見つけ、断る・待つ・別案を選択肢へ戻す方法を整理します。", basis: { subjectAnchor: "リンク", eventAnchor: "一人で入る", learningGoal: "二択に隠れた共通の前提を見抜き、第三の道を戻す" } }, scenes: SCENES },
    { kind: "qa", title: "二択の前提、Therapeutic Bind、断る自由について質問はありますか？" },
    { kind: "card", lines: [T("ep7-card-01", "この原理も、カードが戻るまで事件記録へ残します。")], card: { series: "ERICKSON PRINCIPLE", no: "07", name: "THERAPEUTIC BIND", reading: "セラピューティック・バインド（治療的な選択）", principle: ["二択の共通点を見て、", "断る・待つ・別案を戻す。"], summary: "選択肢に共通する前提を見抜き、本人の目的に合う安全な道と、選ばない自由を見える形へ戻す方法。", effect: "出された選択肢の中だけで追い込まれず、自分の目的と安全に合う道を選びやすくする。", useWhen: ["二択を迫られて苦しくなった時", "買う・従う前提で選ばされる時", "相手へ催眠で選択を提案する時"], howTo: ["選択肢に共通する行動を探す", "拒否・保留・別案が残るか確認する", "罰なく選べる形で本人へ返す"] }, after: [T("ep7-card-02", "選択を取り戻した二人は、管理用通路から資料室へ入ります。", { face: "smile" })] },
    { kind: "outro", lines: [
      L("ep7-out-01", "{{forcedChoice}}という時も、出された二つだけが世界の全部じゃない。", { dynamic: true, face: "aha" }),
      T("ep7-out-02", "あなたはリンクへ、{{ep7Move}}。正解を与えず、本当に選べる範囲を返しました。", { dynamic: true, face: "smile" }),
      L("ep7-out-03", "管理用通路の先に、ミオのノートがあります。文字じゃなく、鳥の物語だけです。", { face: "think" }),
      T("ep7-out-04", "今日の講義はここまでです。次は、説明では届かない意味を物語から受け取ります。"),
      L("ep7-out-05", "先生、物語に正解がないなら、どうやって事件の証拠にするんですか？", { face: "think" }),
    ] },
    { kind: "teaser", manga: [{ rows: [{ panels: [{ art: "note-close", narr: "資料室の机に、鳥と鍵の物語が残されていた。" }] }, { panels: [{ art: "mio-video", say: { who: "ミオ", text: "説明したら、また誰かの正解になる。" } }, { art: "link-think", say: { who: "リンク", text: "じゃあ、何を読めばいい？" } }] }] }], hook: ["答えは書かれていない。", "それでも、物語は見方を変え始める。"], next: { no: "第8話", title: "説明しても届かない時、催眠をどう伝える？", series: "変態催眠学者の催眠の極意08", principle: "物語を、本人が気づく体験へ変える" }, preview: { caseNo: "NEXT CASE 08", first: { who: "清瀬リンク", text: "鳥が鍵を盗んだ。それ以外に読めません。" }, teacher: "では、結末を教える前に、次の一場面だけ見てください。" }, unlock: ["第8話へ進む"] },
  ],
  sceneSummaries: ["旧校舎の扉は二択で一人の侵入を前提にする。", "プレイヤーは二択の共通部分と消された選択を見抜く。", "リンクへ安全、保留、撤退を含む選択を返し、二人で管理用通路へ進む。", "Therapeutic Bind と強制的な二択を、本人の目的・安全・拒否権で区別する。", "主人公は用意された正解の外に道を作る役割へ成長する。"],
};

export const EP7_LEARNING_FLOW_QUALITY = assertEpisodeLearningFlow(EP7, EP7_FOUNDATION);
export const EP7_EXPERIENCE_QUALITY = assertEpisodeExperience(EP7);

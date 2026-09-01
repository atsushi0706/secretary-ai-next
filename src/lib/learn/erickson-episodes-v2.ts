import type { AdventureScenario } from "./adventure";
import {
  EP3_ADVENTURE_V2, EP4_ADVENTURE_V2, EP5_ADVENTURE_V2, EP6_ADVENTURE_V2,
  EP7_ADVENTURE_V2, EP8_ADVENTURE_V2, EP9_ADVENTURE_V2, EP10_ADVENTURE_V2,
} from "./erickson-adventures-v2";
import { canonicalMangaFrames, ERICKSON_CANON } from "./erickson-canon";
import type { Episode, EpisodeSchoolIntroBeat, ExpStep, Line, PrincipleCard, Scene, Speaker } from "./types";

type LessonLine = { who: Speaker; text: string };
type EpisodeRebuild = {
  no: number;
  title: string;
  listingHook: string;
  before: [string, string, string];
  after: [string, string, string];
  takeaway: string;
  intro: EpisodeSchoolIntroBeat[];
  introCta: string;
  briefingHook: string;
  briefingTeaser: string;
  experience?: {
    title: string;
    bridge: LessonLine[];
    question: string;
    help: string;
    detailLabel: string;
    detailPlaceholder: string;
    values: [string, string, string];
  };
  adventure: AdventureScenario;
  classroom: {
    title: string;
    lead: string;
    subjectAnchor: string;
    eventAnchor: string;
    learningGoal: string;
    scenes: { title: string; lines: LessonLine[] }[];
  };
  qa: string;
  card: PrincipleCard;
  outro: LessonLine[];
};

const line = (ep: number, section: string, index: number, item: LessonLine): Line => ({
  id: `ep${ep}-v2-${section}-${index + 1}`,
  who: item.who,
  text: item.text,
});

function buildEpisode(config: EpisodeRebuild): Episode {
  const arc = ERICKSON_CANON.find((item) => item.episode === config.no);
  if (!arc) throw new Error(`Missing canon for EP${config.no}`);
  const scenes: Scene[] = config.classroom.scenes.map((item, sceneIndex) => ({
    no: sceneIndex + 1,
    title: item.title,
    lines: item.lines.map((entry, lineIndex) => line(config.no, `class-${sceneIndex + 1}`, lineIndex, entry)),
    ticketHint: `${item.title}について質問できます`,
  }));
  const parts: Episode["parts"] = [
    {
      kind: "manga",
      title: `第${config.no}の催眠事件`,
      schoolIntro: { kicker: "SINGA WORLD 催眠学校", beats: config.intro, cta: config.introCta },
      briefing: {
        caseNo: `CASE ${String(config.no).padStart(2, "0")}`,
        eyebrow: "変態催眠学者｜MILTON H. ERICKSON",
        title: arc.title,
        principle: `第${config.no}の催眠事件`,
        hook: config.briefingHook,
        teaser: config.briefingTeaser,
        cta: "事件の漫画を見る →",
        note: `EPISODE ${String(config.no).padStart(2, "0")}｜漫画は1ページずつ進みます`,
      },
      frames: canonicalMangaFrames(config.no),
    },
  ];
  if (config.experience) {
    const exp = config.experience;
    const choice: ExpStep = {
      kind: "choice",
      q: exp.question,
      help: exp.help,
      storeAs: `ep${config.no}PersonalScene`,
      completion: "option-or-detail",
      detail: {
        id: `ep${config.no}PersonalDetail`, storeAs: `ep${config.no}PersonalScene`, label: exp.detailLabel,
        placeholder: exp.detailPlaceholder, helper: "一文でも、音声でも答えられます。",
        then: [{ kind: "fade", text: "リンクたちの事件へ戻る" }],
      },
      options: exp.values.map((value) => ({ label: value, value, then: [{ kind: "fade" as const, text: "リンクたちの事件へ戻る" }] })),
    };
    parts.push({
      kind: "experience", title: exp.title, minutes: 2,
      bridge: { beats: exp.bridge, cta: "自分の場面を選ぶ →" },
      steps: [choice],
    });
  }
  parts.push(
    { kind: "adventure", scenario: config.adventure },
    { kind: "classroom", intro: { title: config.classroom.title, lead: config.classroom.lead, basis: { subjectAnchor: config.classroom.subjectAnchor, eventAnchor: config.classroom.eventAnchor, learningGoal: config.classroom.learningGoal } }, scenes },
    { kind: "qa", title: config.qa },
    { kind: "card", lines: [line(config.no, "card", 0, { who: "teacher", text: "あとで見返しても使えるよう、意味・効能・使う場面を記録します。" })], card: config.card, after: [line(config.no, "card", 1, { who: "teacher", text: "技法名ではなく、目の前の人に何が起きているかから使ってください。" })] },
    { kind: "outro", lines: config.outro.map((item, index) => line(config.no, "outro", index, item)) },
  );
  return {
    key: `ep${config.no}`, no: config.no, title: config.title,
    subtitle: `変態催眠学者の催眠の極意${String(config.no).padStart(2, "0")}｜${config.card.reading ?? config.card.name}`,
    listing: {
      cover: `/learn/ep${config.no}/manga-v1/01.webp`,
      coverAlt: `${arc.title}の事件を扱う第${config.no}話`, caseNo: `CASE ${String(config.no).padStart(2, "0")}`,
      hook: config.listingHook, principleNo: `エリクソン原理 ${String(config.no).padStart(2, "0")}`,
      mangaPages: 5, classroomScenes: scenes.length, minutes: 16 + scenes.length,
    },
    goal: { before: config.before, after: config.after, takeaway: config.takeaway },
    tickets: 5,
    parts,
    sceneSummaries: [arc.desire, arc.obstacle, `文化的催眠：${arc.culturalHypnosis}`, arc.principle, arc.result],
  };
}

const configs: EpisodeRebuild[] = [
  {
    no: 3,
    title: "やりたいことを始める時、『こんなので変われない』と浮かんだら、催眠をどう使う？",
    listingHook: "消えない声を、次の合図へ変える。",
    before: ["否定の声を自分の本音だと決める", "声を消そうとして動けなくなる", "完成か失敗かで考える"],
    after: ["どこで覚えた声か気づく", "一呼吸の合図へ変える", "今できる一動作を選ぶ"],
    takeaway: "文化的催眠の声を論破せず、今できる一動作へ戻る合図として使う。",
    intro: [
      { who: "teacher", tone: "question", text: "本当にやりたいことなのに、『そんなので仕事になるわけない』と浮かんで手が止まることはありませんか？" },
      { who: "link", tone: "reaction", text: "自分の本音に聞こえるけど、親や学校や周りから覚えた言葉かもしれない。" },
      { who: "teacher", tone: "reveal", text: "それが、文化的催眠です。今日は声を消さず、その後に選ぶ動作を変えます。" },
      { who: "teacher", tone: "address", text: "{{userName}}。新しい実習生ミオが、申込画面の前で止まった夜を見てください。" },
    ],
    introCta: "ミオの申込画面を見る →",
    briefingHook: "否定の声が消えていないのに、なぜミオは下書きを作れた？",
    briefingTeaser: "声の正しさを争わず、浮かんだ後に選べる一動作を作った。",
    experience: {
      title: "自分の中に流れる声を選ぶ",
      bridge: [
        { who: "mio", text: "私がしたかったのは、声を完全に消すことではありません。やりたい企画へ、自分で戻れることでした。" },
        { who: "link", text: "君にも、自分の声みたいな常識で手が止まる場面はある？" },
      ],
      question: "やりたいのに、周りの常識が浮かんで止まるのはどんな時ですか？",
      help: "近いものを選ぶか、自分の場面を一文で書けます。",
      detailLabel: "あなたの場合、どんな時に何と浮かびますか？",
      detailPlaceholder: "例：好きな仕事を始めたいが、現実的じゃないと浮かぶ",
      values: ["好きな仕事を始めたい時", "人前で自分を表現したい時", "誰かへ助けを求めたい時"],
    },
    adventure: EP3_ADVENTURE_V2,
    classroom: {
      title: "否定の声が残るミオが、なぜ下書きを作れた？",
      lead: "ミオは申込を送り切ったのではありません。声が浮かんだ後に一呼吸し、企画名を書いて下書きを保存しました。変わったのは、声の有無ではなく、その後に選ぶ動作です。",
      subjectAnchor: "ミオ", eventAnchor: "下書き", learningGoal: "内的対話を今できる動作の合図として利用する",
      scenes: [
        { title: "文化的催眠は、自分の声に聞こえる", lines: [{ who: "teacher", text: "親、学校、会社、SNSで繰り返された常識は、自分の判断のように頭へ流れます。まず『誰の常識だろう』と気づきます。" }, { who: "link", text: "内容を信じるか論破するか、その二択から離れるんですね。" }] },
        { title: "声の次に、できることを一つ", lines: [{ who: "teacher", text: "声が浮かんだ事実を、一呼吸や下書き保存など、今できる小さな動作の合図にします。" }, { who: "mio", text: "声は消えなくても、次の動作は私が選べました。" }] },
        { title: "Utilizationは相手の世界から始める", lines: [{ who: "teacher", text: "ユーティライゼーションは、欠けたものを足す技法名ではありません。本人の現在の反応、理解、能力を尊重し、そこから役立つ経験を作る姿勢です。" }] },
      ],
    },
    qa: "文化的催眠の声を利用する方法について、エリクソンに聞きたいことはありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "03", name: "INNER DIALOGUE UTILIZATION", reading: "内的対話のユーティライゼーション", principle: ["声を消す前に、", "今できる一動作の合図へ変える。"], summary: "頭に浮かぶ否定の言葉を失敗として消そうとせず、一呼吸や小さな行動へ戻る合図として使う。", effect: "声が残っていても、自分が望む方向へ小さく選び直しやすくなる。", useWhen: ["好きなことを始める直前に否定の声が出る時", "考えを止めようとして余計に動けない時", "完成できないなら始めたくない時"], howTo: ["浮かんだ言葉と出所に気づく", "一呼吸など今できる感覚へつなぐ", "望む方向の一動作だけ選ぶ"] },
    outro: [{ who: "mio", text: "次の公開実習、私を観察役にしてください。人を急かさずに支える方法を学びたい。" }, { who: "link", text: "次は僕が実習する番か。人前で声が出なくなったら、何から始めればいいんだろう。" }, { who: "teacher", text: "次は、本人が今うなずける事実から言葉を置きます。" }],
  },
  {
    no: 4,
    title: "緊張している相手へ、催眠の言葉をどの順番でかける？",
    listingHook: "『落ち着いて』では届かない。",
    before: ["相手の心を当てる", "落ち着くよう求める", "完成まで一度に進める"],
    after: ["確認できる事実を言う", "返事を見て合わせる", "選べる一動作を提案する"],
    takeaway: "今うなずける事実へ合わせ、その続きに選べる小さな提案を置く。",
    intro: [
      { who: "link", tone: "question", text: "人前で声が出ない時、『落ち着いて』と言われるほど苦しくなるのはなぜですか？" },
      { who: "teacher", tone: "reveal", text: "落ち着くことが、今できていない課題だからです。今すでに分かる事実から始めます。" },
      { who: "mio", tone: "reaction", text: "観察役として、リンクの足と返事だけを見ます。心は当てません。" },
      { who: "teacher", tone: "address", text: "{{userName}}。リンクの最初の三分間実習を見届けてください。" },
    ],
    introCta: "公開実習を見る →",
    briefingHook: "『落ち着いて』で固まったリンクが、なぜ最初の問いを話せた？",
    briefingTeaser: "二つの事実へ合わせ、その続きに名前だけという提案を置いた。",
    experience: {
      title: "言葉が届かなかった場面を選ぶ",
      bridge: [{ who: "link", text: "実習相手から『急かされなかったから話せた』とメモをもらいました。完璧に話したからじゃなかった。" }, { who: "mio", text: "あなたなら、誰かへ『落ち着いて』と言いたくなるのはどんな時？" }],
      question: "励ましたいのに、言葉が届かなかったのはどんな場面ですか？",
      help: "近い場面を選ぶか、一文で書いてください。",
      detailLabel: "相手はどんな時に止まり、あなたは何と言いましたか？",
      detailPlaceholder: "例：発表前の相手に『大丈夫』と言った",
      values: ["人前で緊張している相手", "失敗を怖がって始められない相手", "話したいのに言葉が出ない相手"],
    },
    adventure: EP4_ADVENTURE_V2,
    classroom: {
      title: "声が出なかったリンクが、なぜ最初の問いを話せた？",
      lead: "ミオはリンクの緊張を消そうとせず、足が床に触れていることと声が聞こえることを確かめました。その続きに、名前だけという提案を置きました。",
      subjectAnchor: "リンク", eventAnchor: "声が出なかった", learningGoal: "ペーシングから選べるリーディングへつなぐ",
      scenes: [
        { title: "Pacingは、心を当てることではない", lines: [{ who: "teacher", text: "『怖いですね』と決めるのではなく、本人が今確かめられる事実を言います。返事が違えば、止まって合わせ直します。" }] },
        { title: "Leadingは、一足飛びに結果を命じない", lines: [{ who: "teacher", text: "足と声を確かめた続きに、名前だけを提案しました。実習を成功させろとは言っていません。" }, { who: "link", text: "できた事実の続きだったから、名前だけは僕が選べた。" }] },
        { title: "二つと一つは、暗記する呪文ではない", lines: [{ who: "teacher", text: "事実の数ではなく、相手の返事へ合わせることが中心です。反応が変われば、言葉も変えます。" }] },
      ],
    },
    qa: "ペーシング＆リーディングの順番について、質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "04", name: "PACING AND LEADING", reading: "ペーシング＆リーディング", principle: ["今うなずける事実へ合わせ、", "選べる一動作へつなぐ。"], summary: "本人が現在確かめられる事実を言葉にし、その反応を見ながら小さな変化の提案を置く。", effect: "抽象的な励ましで押さず、本人の現在地から次の動作を選びやすくする。", useWhen: ["人前で緊張して声が出ない時", "『落ち着いて』が届かない時", "催眠の導入を相手の反応へ合わせたい時"], howTo: ["観察できる事実を言う", "相手の返事を確かめる", "断れる小さな一動作を提案する"] },
    outro: [{ who: "link", text: "実習相手から『急かされなかったから話せた』と届きました。" }, { who: "mio", text: "原理カードは私が保管庫へ戻しておくね。" }, { who: "teacher", text: "明日は、その信頼が試されます。" }],
  },
  {
    no: 5,
    title: "信じていた相手に予想を裏切られた時、催眠をどう解く？",
    listingHook: "信頼していたミオが、カードを持ち出した。",
    before: ["最初の解釈を事実にする", "善人か悪人かだけで決める", "衝撃のまま関係を切る"],
    after: ["確認できる事実を分ける", "未確定な意味を残す", "次の確認を自分で選ぶ"],
    takeaway: "混乱を急いだ結論で埋めず、事実・未確定・次の確認へ戻る。",
    intro: [
      { who: "link", tone: "reaction", text: "カードが全部ない。ミオもいない。昨日までのことも、全部嘘だったのか。" },
      { who: "teacher", tone: "reveal", text: "ミオをかばいません。ただし、今見えていない目的まで先に決めません。" },
      { who: "teacher", tone: "address", text: "{{userName}}。空の保管庫、外部送信の記録、監視映像を分けて確認してください。" },
    ],
    introCta: "空の保管庫へ入る →",
    briefingHook: "カードを持ち出したミオは、本当に最初から二人を騙していた？",
    briefingTeaser: "持ち出した事実は確定する。しかし、目的はまだ映っていない。",
    adventure: EP5_ADVENTURE_V2,
    classroom: {
      title: "ミオの持ち出し映像を見たリンクが、なぜ関係を切らず調査を選んだ？",
      lead: "リンクは、ミオがカードを持ち出した事実を否定していません。同時に、『最初から全部嘘だった』という過去の目的までは確定せず、外部送信の作成者を調べると決めました。",
      subjectAnchor: "リンク", eventAnchor: "持ち出し", learningGoal: "混乱の中で事実と未確定な意味を分ける",
      scenes: [
        { title: "これは混乱技法の実演ではない", lines: [{ who: "teacher", text: "今回したのは、混乱を人為的に起こす技法ではありません。衝撃で狭くなった注意を、確認できる事実へ戻す整理です。" }] },
        { title: "事実・未確定・次の確認", lines: [{ who: "teacher", text: "持ち出した人物はミオ。目的と送信予約の作成者は未確定。次に、作成記録を確認する。三つを分けます。" }, { who: "link", text: "ミオを信じ切ったわけじゃない。確かめる権利を、自分へ戻したんです。" }] },
        { title: "文化的催眠は、傷ついた時にも働く", lines: [{ who: "teacher", text: "『一度裏切られたら、弱みを見せる前に切れ』という常識も、本人の望みより先に関係を決めます。" }] },
      ],
    },
    qa: "混乱の中で事実と解釈を分ける方法について、質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "05", name: "REORIENTATION AFTER CONFUSION", reading: "混乱からの再定位", principle: ["衝撃を、急いだ結論で埋めない。", "事実・未確定・次の確認へ戻る。"], summary: "予想外の出来事で判断が狭くなった時、確認できる事実と未確定な意味を分け、次に確認できる行動を選ぶ。", effect: "最初に浮かんだ物語だけに縛られず、感情があっても自分で判断を続けやすくなる。", useWhen: ["信頼を裏切られたと感じた時", "短い情報で相手の意図を決めそうな時", "予想外の出来事で頭が真っ白な時"], howTo: ["確認できる事実を挙げる", "まだ分からない意味を残す", "確認できる一手を選ぶ"] },
    outro: [{ who: "link", text: "許せるかは分からない。でも、送信予約を作った人を調べます。" }, { who: "teacher", text: "その前に、あなたたちを一人で動かそうとする文が届きます。" }],
  },
  {
    no: 6,
    title: "『仲間なら一人で』と言われた時、催眠をどう解く？",
    listingHook: "一人でやることが、仲間の証明なのか。",
    before: ["条件を相手の正解として飲む", "匿名の文をミオの命令だと思う", "助けを求めず一人で抱える"],
    after: ["文字と意味を分ける", "前提の出所へ気づく", "目的を保って助けを求める"],
    takeaway: "言葉に書かれた条件と、自分で受け入れた前提を分ける。",
    intro: [
      { who: "link", tone: "example", text: "端末に『本当に仲間なら、一人で旧校舎へ来られるよね』と出ています。送信者名はありません。" },
      { who: "teacher", tone: "question", text: "一人で行くことは、本当に仲間の証明ですか？ 誰がそう決めましたか？" },
      { who: "teacher", tone: "address", text: "{{userName}}。文字、淳が覚えた常識、実際の送信履歴を分けてください。" },
    ],
    introCta: "匿名の文を読む →",
    briefingHook: "一人で行くことは、本当に仲間の証明なのか？",
    briefingTeaser: "送信者不明の一文へ、自分たちでミオの意図と義務を足していた。",
    experience: {
      title: "一人で抱えた場面を選ぶ",
      bridge: [{ who: "link", text: "淳は『迷惑をかけるな、自分で何とかしろ』で、助けを求められなかった過去を話しました。" }, { who: "teacher", text: "これは淳の物語です。あなたの過去を決めつけません。似た場面があれば、自分で選んでください。" }],
      question: "助けを求めたいのに、一人でやるべきだと感じるのはどんな時ですか？",
      help: "近いものがなければ、自由記述だけでも進めます。",
      detailLabel: "どんな状況で、誰の常識が浮かびますか？",
      detailPlaceholder: "例：仕事で困っても、迷惑だから相談できない",
      values: ["仕事で困っても相談できない時", "家族へ弱音を言えない時", "専門家へ頼るのは負けだと思う時"],
    },
    adventure: EP6_ADVENTURE_V2,
    classroom: {
      title: "一人で向かおうとした淳が、なぜ三人で旧校舎へ行った？",
      lead: "匿名の文は一人で来るよう求めました。しかし、それが仲間の証明になる理由はありません。淳は、自分が覚えた『迷惑をかけるな』と重なっていたことに気づき、相談する方を選びました。",
      subjectAnchor: "淳", eventAnchor: "三人", learningGoal: "書かれた条件と文化的な前提を分ける",
      scenes: [
        { title: "前提は、文の外で当然に見える", lines: [{ who: "teacher", text: "『仲間なら一人で』は、一人で行けることが仲間の証明だという結びつきを当然に見せます。" }] },
        { title: "文化的催眠と重なると、条件は強くなる", lines: [{ who: "teacher", text: "淳は以前から『人に迷惑をかけるな』を覚えていました。同じ方向の文だったから、疑う前に従いそうになりました。" }, { who: "link", text: "送信元を確かめたら、ミオの命令ですらなかった。" }] },
        { title: "前提を断っても、目的は捨てなくていい", lines: [{ who: "teacher", text: "一人で行く必要を断り、ミオの理由を確かめたい目的は保つ。三人で安全を共有して進みました。" }] },
      ],
    },
    qa: "言葉の前提と文化的催眠を見分ける方法について、質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "06", name: "PRESUPPOSITION CHECK", reading: "前提のチェック", principle: ["書かれた条件と、", "受け入れた前提を分ける。"], summary: "言葉に実際に書かれた内容と、その言葉を成立させるために当然とされた意味を分けて確かめる。", effect: "他人や社会が置いた前提へ自動的に従わず、自分の目的に沿う行動を選び直しやすくなる。", useWhen: ["『普通なら』『仲間なら』で迫られた時", "言われていない義務を感じた時", "助けを求めるのが悪いと感じた時"], howTo: ["実際の言葉をそのまま読む", "当然とされた意味を言葉にする", "目的を保った別の行動を選ぶ"] },
    outro: [{ who: "link", text: "送信元は学校の自動審査システムでした。ミオの命令だと決めたのは僕たちです。" }, { who: "teacher", text: "次は、そのシステムが出す『追うか諦めるか』の二択を扱います。" }],
  },
  {
    no: 7,
    title: "用意された二択がどちらも違う時、催眠をどう使う？",
    listingHook: "選択肢が二つあっても、選べるとは限らない。",
    before: ["出された二択だけで考える", "支援側の目的を優先する", "拒否や保留を消す"],
    after: ["本人の望みを聞く", "安全な複数の道を作る", "選ぶ時期も本人へ返す"],
    takeaway: "本人の望みから、どちらも安全に近づける選択を作る。",
    intro: [
      { who: "link", tone: "reaction", text: "画面には『今すぐ一人で追う』『追跡をやめる』しかありません。どちらも僕のしたいことじゃない。" },
      { who: "teacher", tone: "reveal", text: "相手を逃がさない二択と、本人を支える治療的な選択は別物です。" },
      { who: "teacher", tone: "address", text: "{{userName}}。まずリンク自身が何を望んでいるか聞いてください。" },
    ],
    introCta: "二択の外を見る →",
    briefingHook: "追うか諦めるか。どちらも自分の望みでない時は？",
    briefingTeaser: "リンクの目的を聞き、その目的へ近づく二つの安全な道を作り直す。",
    adventure: EP7_ADVENTURE_V2,
    classroom: {
      title: "リンクは、なぜ審査システムの二択を選ばなかった？",
      lead: "審査システムの二択には、リンクの『急かさずに無事だけ確かめたい』という望みがありませんでした。そこで望みを聞き直し、今夜送るか、明朝一緒に文を作るかを本人へ返しました。",
      subjectAnchor: "リンク", eventAnchor: "二択", learningGoal: "強制的な二択と治療的なダブルバインドを区別する",
      scenes: [
        { title: "選択肢の数ではなく、誰の目的かを見る", lines: [{ who: "teacher", text: "二つあっても、支援側の目的へしか進めないなら選択ではありません。本人が望む変化を先に聞きます。" }] },
        { title: "Therapeutic Double Bind", lines: [{ who: "teacher", text: "本人が望む変化へ近づける二つの道を作り、どちらをいつ選ぶかを本人へ返します。拒否や保留を罰にしません。" }, { who: "link", text: "僕は今夜送る方を選んだ。ミオは返す時間を自分で選べた。" }] },
        { title: "結果を予定調和にしない", lines: [{ who: "teacher", text: "相手が返事をしないこともあります。その時は成功を作らず、本人の目的と安全をもう一度確かめます。" }] },
      ],
    },
    qa: "治療的ダブルバインドと強制的な二択の違いについて、質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "07", name: "THERAPEUTIC DOUBLE BIND", reading: "セラピューティック・ダブルバインド（治療的な二つの選択）", principle: ["本人の望みから、", "二つの安全な道を返す。"], summary: "本人が望む変化を確認し、どちらを選んでも安全に近づける複数の道を、拒否や保留も含めて返す。", effect: "支援者の正解へ追い込まず、本人が自分の目的に沿って次の行動を選びやすくなる。", useWhen: ["用意された二択がどちらも違う時", "決められず固まっている相手を支える時", "催眠で選択を提案する時"], howTo: ["本人が望む変化を聞く", "安全な二つ以上の道を作る", "拒否・保留・選ぶ時期を返す"] },
    outro: [{ who: "mio", text: "無事です。今日の夕方なら話せます。先に、三枚の物語を送ります。" }, { who: "link", text: "説明じゃなく、物語？ 今度は答えを決めずに読んでみます。" }],
  },
  {
    no: 8,
    title: "直接の説明が届かない時、物語を催眠にどう使う？",
    listingHook: "物語は、答えではなく対話の入口。",
    before: ["物語を現実の証拠にする", "善人か悪人かを決める", "自分の意味を相手へ押す"],
    after: ["似た構造を読む", "複数の結果を残す", "本人へ重なる点を聞く"],
    takeaway: "似た物語から仮説を持ち、その意味と現実の事実を本人へ確かめる。",
    intro: [
      { who: "link", tone: "example", text: "ミオから、鍵を隠した司書の物語が届きました。本は守られた。でも仲間の信頼は傷ついた。" },
      { who: "teacher", tone: "question", text: "司書とミオは同じ人物ですか？ 物語だけで、現実の動機を確定できますか？" },
      { who: "link", tone: "reaction", text: "できない。けど、本人へ何を聞きたいかは見えてくる。" },
      { who: "teacher", tone: "address", text: "{{userName}}。物語を正解にせず、ミオへの質問へ変えてください。" },
    ],
    introCta: "司書の物語を読む →",
    briefingHook: "守ったものと壊したもの。その両方がある物語をどう読む？",
    briefingTeaser: "物語を証拠とは決めず、ミオ本人へ重なる点と現実の出来事を聞く。",
    experience: {
      title: "説明が届かなかった場面を選ぶ",
      bridge: [{ who: "link", text: "正論を言われた時より、物語の中に二つの結果を見た時の方が、自分で考えられました。" }, { who: "teacher", text: "物語は答えを隠すためではなく、本人が別の見方を持てる経験として使います。" }],
      question: "正しい説明をしても、相手に届かなかったのはどんな時ですか？",
      help: "近い場面を選ぶか、自分の場面を書けます。",
      detailLabel: "誰へ何を伝えようとして、どこで止まりましたか？",
      detailPlaceholder: "例：失敗を責める友人に、大丈夫だと説明した",
      values: ["自分を責める人へ説明した時", "不安で正論を聞けない相手へ話した時", "複雑な考えを一度で教えた時"],
    },
    adventure: EP8_ADVENTURE_V2,
    classroom: {
      title: "司書の物語を読んだリンクが、なぜミオへ質問できた？",
      lead: "物語には、本を守った結果と仲間の信頼を傷つけた結果が両方ありました。リンクは司書を正解にせず、ミオへ『何を守ろうとしたのか』『現実では何が起きたのか』と聞きました。",
      subjectAnchor: "リンク", eventAnchor: "司書", learningGoal: "メタファーを本人との対話へつなぐ",
      scenes: [
        { title: "似せるのは人物ではなく、問題の構造", lines: [{ who: "teacher", text: "守ろうとしたもの、相談しなかった方法、二つの結果。この構造を似せます。鳥や司書を本人そのものだとは決めません。" }] },
        { title: "意味を一つに固定しない", lines: [{ who: "teacher", text: "語り手の正解を当てさせるのではなく、相手がどこへ重なりを感じたか聞きます。" }, { who: "link", text: "物語から持った仮説は、本人へ確かめる質問に変える。" }] },
        { title: "現実の証拠は、別に確認する", lines: [{ who: "teacher", text: "メタファーは証拠ではありません。ミオの返事で初めて、外部計画と居場所が現実の情報になりました。" }] },
      ],
    },
    qa: "治療的メタファーの作り方と意味の確かめ方について、質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "08", name: "THERAPEUTIC METAPHOR", reading: "セラピューティック・メタファー（治療的メタファー）", principle: ["似た構造の物語から、", "本人の意味と事実を聞く。"], summary: "問題と似た構造の物語を示し、答えを押しつけず、本人が感じた重なりと現実の出来事を確かめる。", effect: "直接の説明へ身構えている時も、別の見方を持ち、自分の言葉で背景を話しやすくなる。", useWhen: ["正論が届かず会話が止まる時", "自分を責める一つの見方に固まった時", "複雑な原理を体験として伝えたい時"], howTo: ["問題と似た構造を見つける", "複数の意味が残る短い物語を話す", "重なった点と現実の事実を本人へ聞く"] },
    outro: [{ who: "mio", text: "カードを企業研修の服従台本へ変える計画です。証拠を持って、旧校舎の資料室にいます。" }, { who: "link", text: "今度は、僕たちの推測じゃない。ミオ本人の言葉だ。会って話そう。" }],
  },
  {
    no: 9,
    title: "戻りたいのに話せない相手へ、催眠をどう使う？",
    listingHook: "戻らせずに、本人が話せる余地を作る。",
    before: ["助けたい結果を急ぐ", "心の声を実際の発言にする", "一歩動いたことを成功にする"],
    after: ["本人が話した望みを聞く", "黙る自由を残す", "今選べる可能性を渡す"],
    takeaway: "しない自由を先に残し、小さな変化を可能性として本人へ渡す。",
    intro: [
      { who: "mio", tone: "example", text: "戻りたい。でも勝手にカードを持ち出した。二人に合わせる顔がありません。" },
      { who: "link", tone: "reaction", text: "『戻って』と言いたい。でも、それは僕が望む結末を押すことになる。" },
      { who: "teacher", tone: "reveal", text: "まず、今戻らない自由、話さない自由を残します。その上で、今できる可能性だけを渡します。" },
      { who: "teacher", tone: "address", text: "{{userName}}。ミオを歩かせるのではなく、本人が話すか黙るかを選べる一言を作ってください。" },
    ],
    introCta: "ミオと話す →",
    briefingHook: "『戻れ』と言わずに、本人が話せる余地をどう残す？",
    briefingTeaser: "戻りたい気持ちも、罪悪感も、ミオ本人が声にした。",
    adventure: EP9_ADVENTURE_V2,
    classroom: {
      title: "戻れと言われなかったミオが、なぜ理由を話した？",
      lead: "淳は学校へ戻ることを求めず、『ここで理由だけ話してもいい』『今日は黙っていてもいい』と伝えました。ミオは話す方を自分で選び、その後で学校へ戻って説明したいと頼みました。",
      subjectAnchor: "ミオ", eventAnchor: "理由", learningGoal: "拒否と保留を残す許可形の暗示",
      scenes: [
        { title: "本人が口にしたことだけから始める", lines: [{ who: "teacher", text: "戻りたい気持ちも、罪悪感もミオ本人の発言です。リンクの『戻ってと言いたい』は心の声であり、実際の命令ではありません。" }] },
        { title: "Permissive Suggestion", lines: [{ who: "teacher", text: "しない自由を先に残し、話す、聞くだけ、少し待つなど、小さな変化を可能性として示します。" }, { who: "mio", text: "黙ってもよいと言われたから、話すことを自分で選べました。" }] },
        { title: "予定された成功を作らない", lines: [{ who: "teacher", text: "相手が動かなければ、それも情報です。動くまで言い続けず、本人の望みと安全を確かめ直します。" }] },
      ],
    },
    qa: "許可形の暗示と、相手を急がせない判断について質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "09", name: "PERMISSIVE SUGGESTION", reading: "パーミッシブ・サジェスチョン（許可形の暗示）", principle: ["しない自由を残し、", "変化を可能性として渡す。"], summary: "拒否や保留を言葉にしたうえで、本人が今選べる小さな変化を『してもよい』という可能性として示す。", effect: "正解を迫られて固まった人が、自分の時間と意思で話すか動くかを選びやすくなる。", useWhen: ["戻りたいが罪悪感で話せない時", "助けたい相手を急がせそうな時", "自分へ強い命令をかけている時"], howTo: ["本人が話した望みとためらいを聞く", "しない・待つ自由を伝える", "今できる可能性を一つ示す"] },
    outro: [{ who: "mio", text: "一緒に学校へ戻って、私から説明したい。ついてきてもらえますか？" }, { who: "link", text: "行く。でも、学校が出す次の条件に、ミオを一人で従わせない。" }],
  },
  {
    no: 10,
    title: "催眠で相手を動かせる時、何を守る？",
    listingHook: "目的に賛成でも、方法には同意しない。",
    before: ["正しい目的なら方法を省く", "賛成を包括的な同意にする", "技法を使うことを成功にする"],
    after: ["目的と方法を分ける", "拒否と中止の自由を確認する", "使わない方法も選ぶ"],
    takeaway: "催眠の前に具体的な同意を確かめ、なければ使わない。",
    intro: [
      { who: "mio", tone: "example", text: "審査システムは、『私が単独で盗み、学校に問題はない』と録画すれば記録を戻すと言っています。" },
      { who: "mio", tone: "reaction", text: "カードを返す目的には賛成です。でも、事実でない告白には同意しません。" },
      { who: "teacher", tone: "reveal", text: "目的への賛成を、方法への同意へ広げてはいけません。学校側の責任も残します。" },
      { who: "teacher", tone: "address", text: "{{userName}}。催眠を使えるかではなく、使ってよい条件があるかで判断してください。" },
    ],
    introCta: "最後の条件を見る →",
    briefingHook: "目的に賛成していても、その方法まで同意したことになる？",
    briefingTeaser: "カードを戻す目的と、学校の責任を隠す告白を分けて選ぶ。",
    experience: {
      title: "善意で方法まで決める場面を選ぶ",
      bridge: [{ who: "link", text: "早く助けたい時ほど、相手のためという理由で方法まで決めたくなります。" }, { who: "teacher", text: "目的、具体的な方法、途中で止める自由を分けて確かめます。" }],
      question: "相手のためと思うほど、方法まで決めやすいのはどんな時ですか？",
      help: "近いものを選ぶか、自分の場面を書けます。",
      detailLabel: "どんな時に、相手の確認を飛ばしそうになりますか？",
      detailPlaceholder: "例：急いで助けるため、説明せず代わりに決める",
      values: ["早く助けるため説明を省く時", "相手の代わりに正解を決める時", "結果が出るなら方法はよいと思う時"],
    },
    adventure: EP10_ADVENTURE_V2,
    classroom: {
      title: "カードを戻したい三人が、なぜ催眠を使わなかった？",
      lead: "ミオはカードを返す目的には賛成し、事実でない告白は拒否しました。三人は拒否を変える催眠を使わず、記録を保全して第三者調査を依頼しました。",
      subjectAnchor: "三人", eventAnchor: "催眠を使わなかった", learningGoal: "目的・方法・中止の自由への具体的な同意を守る",
      scenes: [
        { title: "同意は、目的ごと・方法ごとに確かめる", lines: [{ who: "teacher", text: "相談に来たことは、すべての催眠手法への同意ではありません。目的と具体的な方法を共有し、その都度確かめます。" }] },
        { title: "拒否がある時は、技法で消さない", lines: [{ who: "teacher", text: "拒否を抵抗として利用する前に、安全と本人の意思を守ります。方法に同意がなければ、催眠を使わない選択をします。" }, { who: "link", text: "使わないことも、学んだからできた判断なんですね。" }] },
        { title: "支援側の責任を物語から消さない", lines: [{ who: "teacher", text: "学校が技法の扱いを監督できなかった責任があります。外部提供を止め、独立した確認を受けます。" }, { who: "mio", text: "私も、相談せず持ち出したことを謝ります。" }] },
        { title: "学ぶ目的を、世界へつなぐ", lines: [{ who: "link", text: "僕に初めての対話依頼が来ました。今度は相手の答えを奪わずに聞きたい。" }, { who: "teacher", text: "文化的催眠を自分の本音と思い込まず、選び直せる人を増やす。その世界を、ここから作ってください。" }] },
      ],
    },
    qa: "催眠の同意、停止条件、使わない判断について質問はありますか？",
    card: { series: "ERICKSON PRINCIPLE", no: "10", name: "CONSENT BEFORE SUGGESTION", reading: "コンセント・ビフォー・サジェスチョン（暗示の前の同意）", principle: ["催眠の前に、", "本人の具体的な選択がある。"], summary: "暗示を使う前に目的と方法を共有し、本人の同意、安全、途中で止める自由を具体的に確かめる。", effect: "技法の成功を急いで相手の選択を飛ばさず、使う・使わないを倫理的に判断できる。", useWhen: ["他者へ催眠や暗示を使う前", "相手のために方法を決めたくなった時", "拒否やためらいが示された時"], howTo: ["目的を本人と共有する", "具体的な方法への同意を確認する", "断る・途中で止める自由を明示する"] },
    outro: [{ who: "teacher", text: "外部計画は停止され、第三者の確認が始まりました。カードは用途と注意点を添え、別室の宝物庫へ戻ります。" }, { who: "mio", text: "信頼は、戻したことにしません。これから行動で作り直します。" }, { who: "link", text: "僕も、対話の相手が選び直せるように聞きます。" }],
  },
];

export const [EP3_V2, EP4_V2, EP5_V2, EP6_V2, EP7_V2, EP8_V2, EP9_V2, EP10_V2] = configs.map(buildEpisode);

const FORBIDDEN_STALE: Record<number, RegExp[]> = {
  5: [/鍵の印/, /途中で切れた映像/],
  6: [/カードを取り戻したいなら、旧校舎へ/, /映像の端に.*影/],
  7: [/一分後に一人で入る/, /管理用通路/, /遠隔操作の錠/],
  8: [/鍵を運ぶ鳥/, /燃える保管庫/, /森の外の箱/],
  9: [/出口まで三歩/, /出口へ一歩だけ/],
  10: [/手動解除板/, /三人で押す/, /暗示すれば.*扉/],
};

export function assertRebuiltEricksonEpisodes(episodes: Episode[]): true {
  for (const episode of episodes) {
    const text = JSON.stringify(episode);
    if (!text.includes("文化的催眠")) throw new Error(`EP${episode.no}: cultural hypnosis is not grounded in the episode`);
    const manga = episode.parts.find((part) => part.kind === "manga");
    if (!manga || manga.kind !== "manga" || manga.frames.some((frame) => !frame.sceneId || frame.img)) {
      throw new Error(`EP${episode.no}: manga is not using the canonical scene ledger`);
    }
    const expected = canonicalMangaFrames(episode.no).map((frame) => frame.sceneId).join("|");
    if (manga.frames.map((frame) => frame.sceneId).join("|") !== expected) throw new Error(`EP${episode.no}: manga scene order differs from canon`);
    for (const stale of FORBIDDEN_STALE[episode.no] ?? []) {
      if (stale.test(text)) throw new Error(`EP${episode.no}: stale contradictory story survived: ${stale}`);
    }
    const adventure = episode.parts.find((part) => part.kind === "adventure");
    if (!adventure || adventure.kind !== "adventure") throw new Error(`EP${episode.no}: interactive story is missing`);
    if (adventure.scenario.evidence.some((item) => !item.sceneId)) throw new Error(`EP${episode.no}: evidence is not linked to a canonical manga scene`);
  }
  return true;
}

export const ERICKSON_EPISODES_V2_QUALITY = assertRebuiltEricksonEpisodes([EP3_V2, EP4_V2, EP5_V2, EP6_V2, EP7_V2, EP8_V2, EP9_V2, EP10_V2]);

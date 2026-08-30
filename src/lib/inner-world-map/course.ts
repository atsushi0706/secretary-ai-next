export type InnerWorldAnswerKey =
  | "currentConflict"
  | "culturalVoice"
  | "automaticPattern"
  | "lightDirection"
  | "deepSelfHypothesis"
  | "sharedPurpose"
  | "newRoute"
  | "firstMove";

export type InnerWorldSpeaker = "jun" | "link";
export type InnerWorldMood = "neutral" | "worry" | "smile" | "think";

export type InnerWorldScreen =
  | { kind: "dialogue"; speaker: InnerWorldSpeaker; text: string; mood?: InnerWorldMood; scene?: string }
  | {
      kind: "lesson";
      eyebrow: string;
      title: string;
      paragraphs: string[];
      diagram?: { label: string; detail: string; tone: "blue" | "violet" | "gold" | "green" }[];
      takeaway: string;
    }
  | {
      kind: "choice";
      eyebrow: string;
      title: string;
      context: string;
      options: { id: string; label: string; correct: boolean; feedback: string }[];
    }
  | {
      kind: "input";
      key: InnerWorldAnswerKey;
      eyebrow: string;
      title: string;
      prompt: string;
      placeholder: string;
      helper: string;
      skipLabel?: string;
      fallbackReply: string;
    }
  | {
      kind: "map";
      eyebrow: string;
      title: string;
      lead: string;
      refs: { key: InnerWorldAnswerKey; label: string }[];
      insight: string;
    }
  | { kind: "complete"; eyebrow: string; title: string; lead: string };

export type InnerWorldModule = {
  id: number;
  zone: string;
  shortTitle: string;
  title: string;
  hook: string;
  result: string;
  color: string;
  sourceUrl: string;
  sourceTitle: string;
  screens: InnerWorldScreen[];
};

export const INNER_WORLD_PREMISE = {
  title: "なぜ、場所を変えても同じ問題が繰り返されるのか",
  url: "https://youtu.be/rwINMtsM9y8",
} as const;

export const INNER_WORLD_MODULES: InnerWorldModule[] = [
  {
    id: 1,
    zone: "THE TWO MINDS",
    shortTitle: "二つの意識",
    title: "変わりたいのに、なぜ元へ戻る？",
    hook: "言葉で望む自分と、言葉になる前に反応する自分を見分ける。",
    result: "顕在意識と潜在意識の違いを、自分の一場面で説明できる",
    color: "#82d8ff",
    sourceUrl: "https://youtu.be/zKD0tVCY6Ug",
    sourceTitle: "悩みが生まれる内的構図",
    screens: [
      { kind: "dialogue", speaker: "jun", scene: "清瀬 淳の心の構造学・第1講", text: "職場を変えた。付き合う人も変えた。今度こそ我慢しないと決めた。それでも、また同じところで苦しくなる。そんな経験はありませんか？", mood: "neutral" },
      { kind: "dialogue", speaker: "link", text: "それは、たまたま相手や環境が悪かっただけじゃないんですか？", mood: "worry" },
      { kind: "dialogue", speaker: "jun", text: "もちろん、外の環境が原因のこともあります。ただ、場所を変えても『我慢する、限界になる、関係が壊れる』を繰り返すなら、自分の中で自動的に選ばれている行動も確かめます。", mood: "think" },
      {
        kind: "lesson", eyebrow: "LESSON 01｜心には二つの動きがある", title: "顕在意識と潜在意識は、何が違う？",
        paragraphs: [
          "顕在意識は、『こうしたい』『これは嫌だ』と頭で考え、言葉にできる部分です。",
          "潜在意識は、考えるより先に起きる感情、身体の反応、いつもの選択です。頭の奥に別人がいる、という意味ではありません。",
        ],
        diagram: [
          { label: "顕在意識", detail: "言葉にできる望み\n例：自分の意見を言いたい", tone: "blue" },
          { label: "潜在意識", detail: "先に起きる反応\n例：喉が詰まり、笑って合わせる", tone: "violet" },
        ],
        takeaway: "悩みは、『こうしたい』という言葉と、実際に起きる反応が別の方向へ進む時に生まれます。",
      },
      { kind: "dialogue", speaker: "link", text: "潜在意識って、頭の中でこっそり反対している別人格じゃないんですね。言葉より先に、体や行動に出ているものを見るんだ。", mood: "neutral" },
      {
        kind: "choice", eyebrow: "CHECK 01", title: "潜在意識の材料は、どちら？", context: "『発信したい』と考えた直後、胸が重くなり、投稿画面を閉じました。",
        options: [
          { id: "wish", label: "『発信したい』と考えたこと", correct: false, feedback: "これは言葉にできる望みなので、顕在意識の材料です。" },
          { id: "reaction", label: "胸が重くなり、投稿画面を閉じたこと", correct: true, feedback: "その通りです。考えるより先に起きた身体反応と行動が、潜在意識を観察する材料です。" },
          { id: "platform", label: "使っていたSNSの種類", correct: false, feedback: "SNSの種類は外部条件です。この問いでは、本人に起きた反応を見ます。" },
        ],
      },
      {
        kind: "input", key: "currentConflict", eyebrow: "YOUR NOTE 01", title: "あなたの中の綱引きを、一文にする",
        prompt: "『本当は○○したい。けれど実際は○○してしまう』の形で、一つだけ書いてください。",
        placeholder: "例：本当は自分のサービスを届けたい。けれど、人にどう思われるか怖くなり発信を閉じてしまう",
        helper: "原因はまだ考えません。望みと、実際に起きる行動だけで十分です。", skipLabel: "例だけ理解して進む",
        fallbackReply: "今は自分の例を作らなくても大丈夫です。まず、言葉の望みと実際の反応が別々にあると分かれば十分です。",
      },
      {
        kind: "map", eyebrow: "LESSON CLEAR", title: "二つの意識を、敵同士にしない。",
        lead: "『やりたいのにできない』時、意志の弱さだけで説明せず、言葉にできる望みと、先に起きる反応の両方を見ます。",
        refs: [{ key: "currentConflict", label: "あなたの綱引き" }],
        insight: "次は、その反応がどこで『当たり前』になったのか、文化的催眠から見ていきます。",
      },
    ],
  },
  {
    id: 2,
    zone: "THE BORROWED RULES",
    shortTitle: "文化的催眠",
    title: "その『普通』は、誰から受け取った？",
    hook: "社会、家族、会社、友人の常識が、自分の答えに見えるまで。",
    result: "文化的催眠を、日常の具体的な言葉から見分ける",
    color: "#8bb8ff",
    sourceUrl: "https://youtu.be/wmEBDylsmUo",
    sourceTitle: "悩みのフェーズ",
    screens: [
      { kind: "dialogue", speaker: "link", scene: "第2講・借り物の『普通』", text: "でも先生。合わせたり我慢したりするのは、僕が自分で選んでいることですよね？", mood: "worry" },
      { kind: "dialogue", speaker: "jun", text: "では、その『正しい』を最初に教えたのは誰でしょう。『人に迷惑をかけるな』『我慢できる人が大人だ』『お金を欲しがるのは卑しい』。何度も聞くうちに、自分で決めた答えのように感じることがあります。", mood: "think" },
      {
        kind: "lesson", eyebrow: "LESSON 02｜文化的催眠", title: "外から受け取った常識が、自分の声になる。",
        paragraphs: [
          "文化的催眠とは、社会、地域、家族、学校、会社、友人の間で繰り返されたルールが、自分の中で『当然』になることです。",
          "この教材では、同じ問題が繰り返される始まりを、文化的催眠として見ます。『本当はこうしたい』より先に、借り物のルールがいつもの反応を選ばせるからです。",
          "すべての常識が悪いわけではありません。今の自分が進みたい方向と合わないのに、確かめず従い続けている時に問題になります。",
        ],
        diagram: [
          { label: "外から届く言葉", detail: "『失敗したら恥ずかしい』\n『期待には応えるべき』", tone: "blue" },
          { label: "自分の前提になる", detail: "反対意見を言う前に謝る\n疲れていても引き受ける", tone: "violet" },
          { label: "同じ結果を作る", detail: "我慢する→限界になる\nまた自分を責める", tone: "gold" },
        ],
        takeaway: "文化的催眠は、難しい思想ではなく、場面の中で自動再生される『こうするべき』として見つけます。",
      },
      { kind: "dialogue", speaker: "link", text: "じゃあ、常識を全部捨てれば本当の自分になれるんですか？", mood: "worry" },
      { kind: "dialogue", speaker: "jun", text: "捨てるか従うかを、先に決める必要はありません。まず『これは今の私が選んだ答えか。それとも、確かめず使っている借り物の答えか』と見分けます。", mood: "neutral" },
      {
        kind: "choice", eyebrow: "CHECK 02", title: "文化的催眠として確かめるのは、どれ？", context: "会議で反対意見があったのに、『空気を乱す人だと思われる』と考え、笑って同意しました。",
        options: [
          { id: "personality", label: "本人は意志が弱い、と決める", correct: false, feedback: "性格で決めると、どのルールが働いたか見えなくなります。" },
          { id: "rule", label: "『反対すると嫌われる』を、どこで当たり前にしたか確かめる", correct: true, feedback: "その通りです。場面で自動再生されたルールを、文化的催眠の仮説として確かめます。" },
          { id: "society", label: "社会の常識は全部間違いだと決める", correct: false, feedback: "全部を否定する授業ではありません。今の自分に合うかを選び直す授業です。" },
        ],
      },
      {
        kind: "input", key: "culturalVoice", eyebrow: "YOUR NOTE 02", title: "止まる場面で流れる『べき』は？",
        prompt: "第1講で書いた場面に、『○○すべき』『○○してはいけない』という言葉があるなら、一つだけ書いてください。",
        placeholder: "例：自信がつくまで、人前で自分の考えを話してはいけない",
        helper: "誰から聞いたか分からなくても構いません。実際に頭へ浮かぶ言葉を残します。", skipLabel: "今は見つからない",
        fallbackReply: "見つからない時に、無理に文化や家族を原因にする必要はありません。実際の場面へ戻った時に、また確かめられます。",
      },
      {
        kind: "map", eyebrow: "LESSON CLEAR", title: "自分を責める前に、使っている前提を見る。",
        lead: "文化的催眠は『社会が悪い』という結論ではありません。自分の選択に見えているルールを、一度手に取って確かめるための言葉です。",
        refs: [{ key: "culturalVoice", label: "自動再生されるルール" }],
        insight: "次は、そのルールが現実の場面でどんな行動を選ばせているかを追います。",
      },
    ],
  },
  {
    id: 3,
    zone: "THE REPEATING SCENE",
    shortTitle: "自動反応",
    title: "同じ問題は、どんな順番で作られる？",
    hook: "抽象的な原因探しをやめ、現実で繰り返す一連の動きを見る。",
    result: "きっかけから結果までの自動反応を、行動として追える",
    color: "#ffd47d",
    sourceUrl: "https://youtu.be/wmEBDylsmUo",
    sourceTitle: "悩みのフェーズ",
    screens: [
      { kind: "dialogue", speaker: "link", scene: "第3講・繰り返される一場面", text: "文化的催眠に気づけば、それだけで同じ問題は起きなくなるんですか？", mood: "neutral" },
      { kind: "dialogue", speaker: "jun", text: "名前を知っただけでは、まだ行動は変わりません。大切なのは、その言葉が流れた後に、体がどう反応し、何を選び、どんな結果を作っているかを順番に見ることです。", mood: "think" },
      {
        kind: "lesson", eyebrow: "LESSON 03｜反応の連鎖", title: "悩みは、一つの場面の中で組み立てられる。",
        paragraphs: [
          "例えば『期待には応えるべき』が当たり前になった人は、頼まれた瞬間に緊張し、断らず引き受け、仕事を抱え込み、最後に限界になります。",
          "恋愛では我慢し、職場では他人の仕事まで引き受ける。一見別の問題でも、『相手を優先して自分を後にする』という行動が共通していることがあります。",
        ],
        diagram: [
          { label: "きっかけ", detail: "頼み事をされる", tone: "blue" },
          { label: "内側のルール", detail: "断ると嫌われる", tone: "violet" },
          { label: "自動反応", detail: "笑って引き受ける", tone: "gold" },
          { label: "繰り返す結果", detail: "抱え込み、限界になる", tone: "green" },
        ],
        takeaway: "『なぜ私はこうなの？』ではなく、『何が起きた後、私は何をした？』と聞くと、選び直せる場所が見えます。",
      },
      {
        kind: "choice", eyebrow: "CHECK 03", title: "最初に観察するなら、どれ？", context: "集客が不安になると、新しい講座を次々に買い、今やっている発信を止めてしまいます。",
        options: [
          { id: "diagnosis", label: "どんな性格や病気なのかを決める", correct: false, feedback: "診断を作る前に、実際に繰り返している選択を見ます。" },
          { id: "action", label: "不安の後に『今の発信を止め、新しい講座を買う』を繰り返していると確認する", correct: true, feedback: "その通りです。まずカメラに映る行動を見つけると、流れを追えます。" },
          { id: "past", label: "幼少期の原因をすぐ一つに決める", correct: false, feedback: "今の行動を見ずに過去へ飛ぶと、都合のよい原因を作ってしまいます。" },
        ],
      },
      {
        kind: "input", key: "automaticPattern", eyebrow: "YOUR NOTE 03", title: "止まる直前、何をしている？",
        prompt: "あなたの場面で、きっかけが起きた後に繰り返している行動を、一つだけ書いてください。",
        placeholder: "例：反応がないと不安になり、三日で発信方法を変えてしまう",
        helper: "『弱くなる』『自信をなくす』ではなく、画面を閉じる、引き受ける、変える、避けるなどの行動で書きます。", skipLabel: "例だけ理解して進む",
        fallbackReply: "自分の行動がまだ浮かばなくても、きっかけから結果までを順番に見る方法を覚えれば十分です。",
      },
      { kind: "dialogue", speaker: "link", text: "なるほど。『潜在意識が悪い』で終わらせず、現実で何を繰り返しているかまで見ないと、変える場所が分からないんですね。", mood: "smile" },
      {
        kind: "map", eyebrow: "LESSON CLEAR", title: "見えない心を、見える行動から読む。",
        lead: "潜在意識そのものは見えません。だから、きっかけ、身体、選択、結果として外に出たものを順番に観察します。",
        refs: [{ key: "automaticPattern", label: "あなたが繰り返す行動" }],
        insight: "次は、その行動を続ける『深層自己』が、何を守ろうとしているのかを学びます。",
      },
    ],
  },
  {
    id: 4,
    zone: "THE DEEP SELF",
    shortTitle: "深層自己",
    title: "変わらない自分は、何を守っている？",
    hook: "問題を作る敵ではなく、昔覚えた方法を今も使う自分として見る。",
    result: "深層自己を、人格や病名ではなく一つの自己モデルとして説明できる",
    color: "#c59cff",
    sourceUrl: "https://youtu.be/voBQYRQIl6Y",
    sourceTitle: "陰の体験〜深層自己",
    screens: [
      { kind: "dialogue", speaker: "link", scene: "第4講・変化を止める自分の正体", text: "繰り返す行動が分かったなら、『もうやめろ』と自分へ言えばいいんじゃないですか？", mood: "worry" },
      { kind: "dialogue", speaker: "jun", text: "それでは、また自分へ命令を増やすだけです。その行動は、過去のある場面では自分を守る役に立ったかもしれません。まず、何を守るために覚えたのかを見ます。", mood: "neutral" },
      {
        kind: "lesson", eyebrow: "LESSON 04｜深層自己", title: "昔の守り方を、今も繰り返す自分。",
        paragraphs: [
          "この教材でいう深層自己は、過去に覚えた考え方と行動を使い、今も何かを守ろうとする自己モデルです。本人の全部でも、頭の中に住む別人格でもありません。",
          "例えば、意見を言って仲間外れにされた人が『合わせれば居場所を守れる』と覚えたなら、大人になって安全な場面でも先に同意することがあります。",
        ],
        diagram: [
          { label: "境目の体験", detail: "意見を言って拒まれた", tone: "blue" },
          { label: "覚えたルール", detail: "合わせれば居場所を守れる", tone: "violet" },
          { label: "繰り返す行動", detail: "安全な場面でも先に同意する", tone: "gold" },
          { label: "深層自己", detail: "自分を抑えて関係を守る自分", tone: "green" },
        ],
        takeaway: "深層自己を見つける目的は、責める相手を増やすことではなく、古い守り方を選び直せるようにすることです。",
      },
      {
        kind: "choice", eyebrow: "CHECK 04", title: "深層自己の説明として近いのは？", context: "疲れていても頼みを断れず、後で限界になる人を考えます。",
        options: [
          { id: "whole", label: "その人の本当の性格すべて", correct: false, feedback: "深層自己は本人の全部ではありません。特定の場面で働く一つの自己モデルです。" },
          { id: "enemy", label: "変化を邪魔するので、消すべき敵", correct: false, feedback: "敵にすると、なぜその方法が必要だったかを見失います。" },
          { id: "protector", label: "『断ると関係を失う』と覚え、引き受けて関係を守ろうとする自分", correct: true, feedback: "その通りです。覚えたルール、行動、守りたいものまでつなげて見ます。" },
        ],
      },
      {
        kind: "input", key: "deepSelfHypothesis", eyebrow: "YOUR NOTE 04", title: "あなたの深層自己を、仮説にする",
        prompt: "『○○を守る／避けるために、△△する自分』の形で、今分かる範囲だけ書いてください。",
        placeholder: "例：人から否定されるのを避けるために、準備が整うまで表に出ない自分",
        helper: "事実ではなく仮説です。過去の原因を無理に作らず、今の行動から言える範囲にします。", skipLabel: "まだ仮説にしない",
        fallbackReply: "深層自己は、証拠がないまま作るものではありません。今は『昔の守り方が残ることがある』と理解できれば十分です。",
      },
      { kind: "dialogue", speaker: "link", text: "変わらないのは、深層自己が僕を困らせたいからじゃない。昔は役に立った方法を、今も使い続けているからかもしれないんですね。", mood: "neutral" },
      {
        kind: "map", eyebrow: "LESSON CLEAR", title: "変わらない自分にも、理由がある。",
        lead: "深層自己という言葉は、原因を断定するためではありません。今の反応が、何を守ろうとしているかを相談できる形にするために使います。",
        refs: [{ key: "deepSelfHypothesis", label: "深層自己の仮説" }],
        insight: "次は、望む自分と深層自己が、方法の奥で何を求めているかを確かめます。",
      },
    ],
  },
  {
    id: 5,
    zone: "THE COMMON PURPOSE",
    shortTitle: "二つの統合",
    title: "反対する二つの自分は、本当に敵同士？",
    hook: "手段の違いから降りて、両方が守りたい目的を見つける。",
    result: "深層自己を消さず、同じ目的へ進む新しい手段を作る",
    color: "#7ee6c3",
    sourceUrl: "https://youtu.be/rd10343M2-Y",
    sourceTitle: "深層自己統合",
    screens: [
      { kind: "dialogue", speaker: "link", scene: "第5講・綱を引く二人", text: "深層自己は、今の問題をずっと残したいんですか？", mood: "worry" },
      { kind: "dialogue", speaker: "jun", text: "欲しいのは問題そのものではなく、その方法で得ようとしているものです。発信したい自分は、人とつながりたい。批判を恐れて隠れる自分も、仲間から拒まれずつながっていたい。手段は反対でも、目的が近いことがあります。", mood: "think" },
      {
        kind: "lesson", eyebrow: "LESSON 05｜統合", title: "古い手段を、新しい手段へ置き換える。",
        paragraphs: [
          "望む自分と深層自己を戦わせると、『やれ』『まだ危ない』の綱引きが続きます。そこで、二つの自分がそれぞれ何を得たいのかを確かめます。",
          "共通する目的が見つかったら、深層自己が守りたいものを捨てず、今の自分が選べる別の方法を作ります。これを、この教材では統合と呼びます。",
        ],
        diagram: [
          { label: "望む自分の手段", detail: "発信して人へ届ける", tone: "blue" },
          { label: "深層自己の手段", detail: "隠れて拒絶を避ける", tone: "violet" },
          { label: "共通する目的", detail: "人と安全につながる", tone: "gold" },
          { label: "新しい手段", detail: "信頼できる一人へ先に見せる", tone: "green" },
        ],
        takeaway: "統合は、嫌な自分を消すことではなく、同じ目的へ進める方法を増やすことです。",
      },
      {
        kind: "choice", eyebrow: "CHECK 05", title: "統合になっているのは、どれ？", context: "人前で話したい一方、『失敗して笑われる』のが怖くて避ける人です。",
        options: [
          { id: "force", label: "怖がる自分を無視して、大勢の前へ出る", correct: false, feedback: "望む自分だけを勝たせると、綱引きが強くなることがあります。" },
          { id: "giveup", label: "安全のため、人前で話す望みを捨てる", correct: false, feedback: "深層自己の古い手段だけを残すと、望む方向へ進めません。" },
          { id: "newroute", label: "安全につながりたい目的を守り、信頼できる三人の前で短く話す", correct: true, feedback: "その通りです。守りたい目的を残しながら、新しい手段を作っています。" },
        ],
      },
      {
        kind: "input", key: "sharedPurpose", eyebrow: "YOUR NOTE 05-A", title: "二つの自分が、どちらも欲しいものは？",
        prompt: "進みたい自分と、止める自分が、方法は違っても両方ほしいものを一言で書いてください。",
        placeholder: "例：自分を否定せず、人とつながっていたい",
        helper: "正解はありません。『安心』『つながり』『認められる』『自由』など、今しっくりくる仮説で構いません。", skipLabel: "まだ分からない",
        fallbackReply: "共通目的は、きれいな言葉を作る場所ではありません。両方の行動を説明できる言葉が見つかるまで、空白でも大丈夫です。",
      },
      {
        kind: "input", key: "newRoute", eyebrow: "YOUR NOTE 05-B", title: "同じ目的へ進む、別の方法を一つ作る",
        prompt: "止まる自分が守りたいものを捨てず、今の自分が試せる小さな方法を一つ書いてください。",
        placeholder: "例：不特定多数へ出す前に、信頼できる一人へ文章を見せる",
        helper: "人生を変える大きな行動ではなく、次に試して結果を確かめられる大きさにします。", skipLabel: "講義だけ理解して進む",
        fallbackReply: "今すぐ方法を作れなくても、目的と手段を分ける考え方を覚えれば、後から地図を使えます。",
      },
      {
        kind: "map", eyebrow: "LESSON CLEAR", title: "綱引きの外に、三本目の道を作る。",
        lead: "『進むか、止まるか』の二択ではなく、両方が守りたい目的へ進める新しい手段を探します。",
        refs: [{ key: "sharedPurpose", label: "二つに共通する目的" }, { key: "newRoute", label: "新しく選べる手段" }],
        insight: "最後に、ここまでの心の構造を一枚の地図として、日常でどう使うかを整理します。",
      },
    ],
  },
  {
    id: 6,
    zone: "THE INNER MAP",
    shortTitle: "地図の使い方",
    title: "心の構造が見えた後、何を選ぶ？",
    hook: "自分を診断する地図ではなく、反応する前に選び直す地図にする。",
    result: "文化的催眠に気づき、自分の方向へ進む最初の一手を作る",
    color: "#ffb5de",
    sourceUrl: "https://youtu.be/CicUWsowFac",
    sourceTitle: "ハイヤーコンパス、ジーニアスキー",
    screens: [
      { kind: "dialogue", speaker: "link", scene: "最終講・インナーワールドマップ", text: "先生。ここまで分かったら、インナーワールドマップは何に使うんですか？ 自分の悪い原因を保存するためですか？", mood: "worry" },
      { kind: "dialogue", speaker: "jun", text: "いいえ。自分を裁く記録ではありません。同じ反応が始まった時に、『今の私は、どのルールで、何を守ろうとしている？』と立ち止まり、次の手段を選ぶための地図です。", mood: "smile" },
      {
        kind: "lesson", eyebrow: "LESSON 06｜地図の全体像", title: "見えなかった心の流れを、一枚につなぐ。",
        paragraphs: [
          "地図は、①言葉にできる望み、②文化的催眠、③自動反応、④深層自己が守るもの、⑤共通目的と新しい手段、の順に読みます。",
          "さらに、自然に自分を発揮できた体験から未来の方角を見つけます。陰の経験で磨いた観察力や粘りなどは、古い生き方と分け、望む方向へ使い直します。",
        ],
        diagram: [
          { label: "ハイヤーコンパス", detail: "自然に自分を発揮できた体験から見つける、未来の方角", tone: "blue" },
          { label: "ジーニアスキー", detail: "苦しい生き方そのものではなく、その中で実際に磨いた能力", tone: "gold" },
        ],
        takeaway: "過去の苦痛を才能と美化せず、そこで育った力だけを取り出して、進みたい方向へ使います。",
      },
      {
        kind: "choice", eyebrow: "FINAL CHECK", title: "地図の使い方として近いのは？", context: "新しい仕事へ応募しようとすると、『失敗したら恥ずかしい』が浮かび、画面を閉じました。",
        options: [
          { id: "blame", label: "また逃げた自分を責め、今すぐ応募させる", correct: false, feedback: "命令を増やすだけでは、同じ綱引きへ戻ります。" },
          { id: "map", label: "借り物のルールと守りたいものを確認し、今日は募集要項を保存する", correct: true, feedback: "その通りです。反応を理解し、望む方向へ進める次の手段を選んでいます。" },
          { id: "memory", label: "原因になった過去を、正解が出るまで探し続ける", correct: false, feedback: "地図は過去探しで止まるためではなく、現在の選択へ戻るために使います。" },
        ],
      },
      {
        kind: "input", key: "lightDirection", eyebrow: "YOUR NOTE 06-A", title: "自然に自分を出せた時、何をしていた？",
        prompt: "楽しかった、夢中だった、頼まれなくても動けた場面から、これからも大切にしたい方向を一つ書いてください。",
        placeholder: "例：難しいことを分かる言葉にして、人へ伝えていた",
        helper: "成果ではなく、その時にしていたことを残します。これが未来の方角を考える材料です。", skipLabel: "今は例だけで進む",
        fallbackReply: "思い出せない時は、今後『少し自然に動けた場面』があった日に書き足せます。",
      },
      {
        kind: "input", key: "firstMove", eyebrow: "YOUR NOTE 06-B", title: "24時間以内の一動作を選ぶ",
        prompt: "あなたの新しい手段を試すために、24時間以内にできる一動作を書いてください。",
        placeholder: "例：発信文の最初の三行だけを、信頼できる一人へ送る",
        helper: "成功させる約束ではありません。地図の仮説が役立つかを確かめる、小さな実験です。", skipLabel: "講義を終えて後で決める",
        fallbackReply: "一手は、必要になった場面で作れば大丈夫です。地図は完成品ではなく、経験が増えるたびに書き直せます。",
      },
      {
        kind: "map", eyebrow: "YOUR LEARNING MAP", title: "学んだ構造が、あなたの一場面につながった。",
        lead: "これは診断結果ではありません。今見えている反応を、次に選び直せる形へ並べた学習ノートです。",
        refs: [
          { key: "currentConflict", label: "望みと実際の反応" }, { key: "culturalVoice", label: "自動再生される文化的催眠" },
          { key: "automaticPattern", label: "繰り返している行動" }, { key: "deepSelfHypothesis", label: "深層自己の仮説" },
          { key: "sharedPurpose", label: "二つに共通する目的" }, { key: "newRoute", label: "新しく選べる手段" },
          { key: "lightDirection", label: "未来の方角" }, { key: "firstMove", label: "最初の一動作" },
        ],
        insight: "答えは固定しません。新しい経験が増えたら、地図の仮説も書き直してください。",
      },
      {
        kind: "complete", eyebrow: "COURSE COMPLETE", title: "自分を変える前に、心の中で何が起きているかを読めるようになった。",
        lead: "顕在意識、潜在意識、文化的催眠、深層自己、統合。五つの言葉を、日常の一場面から説明できれば、この講義の目的は達成です。",
      },
    ],
  },
];

export const INNER_WORLD_SESSIONS = [
  {
    id: 1,
    title: "『悪と戦う戦士』という言葉が、地図になるまで",
    url: "https://youtu.be/eSGEJxc3wBo",
    duration: "1:00:48",
    caseSummary: "人へ気を使い、自分の言葉を抑える相談者が、自分の中で繰り返している行動と、その奥で守りたいものを言葉にしていく実演です。",
    watchFor: ["相談者の比喩を奪わず、本人の言葉を残している", "答えを教えず、どの場面で何をしたかへ質問を戻している", "長い回答を復唱せず、次の発見に必要な核だけをまとめている"],
  },
  {
    id: 2,
    title: "仕事と関係に共通する『期待へ合わせる』を見つける",
    url: "https://youtu.be/EtXDKPnUpbU",
    duration: "1:23:28",
    caseSummary: "別々に見えた仕事と人間関係の問題から、同じ場面で繰り返す行動を見つけ、本人へ仮説を返していく実演です。",
    watchFor: ["二つの問題に共通する行動を、本人へ確認している", "コーチの仮説を事実にせず、主導権を本人へ戻している", "抽象的な理想を、誰へ何を届けるかまで具体化している"],
  },
] as const;

export const INNER_WORLD_ANSWER_LABELS: Record<InnerWorldAnswerKey, string> = {
  currentConflict: "望みと実際の反応",
  culturalVoice: "自動再生される文化的催眠",
  automaticPattern: "繰り返している行動",
  lightDirection: "自然に自分を出せる方向",
  deepSelfHypothesis: "深層自己の仮説",
  sharedPurpose: "二つに共通する目的",
  newRoute: "新しく選べる手段",
  firstMove: "24時間以内の一動作",
};

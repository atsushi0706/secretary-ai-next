export type InnerWorldAnswerKey =
  | "currentProblem"
  | "desiredState"
  | "currentPattern"
  | "shadowSelf1"
  | "shadowSelf2"
  | "shadowSelf3"
  | "pastPattern"
  | "immediateReason"
  | "lightExperience1"
  | "lightExperience2"
  | "lightExperience3"
  | "lightSelf"
  | "turningPoint"
  | "bornThought"
  | "bornAction"
  | "bornValue"
  | "deepSelf"
  | "consciousPurpose"
  | "deepPurpose"
  | "sharedPurpose"
  | "newRoute"
  | "higherCompass"
  | "geniusKey"
  | "firstMove";

export type InnerWorldScreen =
  | {
      kind: "guide";
      eyebrow: string;
      title: string;
      paragraphs: string[];
      bullets?: string[];
      tone?: "mist" | "light" | "shadow" | "bridge" | "compass";
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
  | {
      kind: "complete";
      eyebrow: string;
      title: string;
      lead: string;
    };

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

export const INNER_WORLD_MODULES: InnerWorldModule[] = [
  {
    id: 1,
    zone: "THE FOG",
    shortTitle: "悩みの構造",
    title: "なぜ、同じ悩みを繰り返すのか？",
    hook: "変わりたい自分と、変わりたくない自分が、同時にいる。",
    result: "『こうしたい／こうできない』を一枚目の地図にする",
    color: "#82d8ff",
    sourceUrl: "https://youtu.be/zKD0tVCY6Ug",
    sourceTitle: "悩みが生まれる内的構図",
    screens: [
      {
        kind: "guide",
        eyebrow: "INNER WORLD MAP 01",
        title: "変わりたいのに、同じところで止まる。",
        paragraphs: [
          "やりたい。変わりたい。もう繰り返したくない。それでも、同じ場面になると止まってしまう。",
          "それを『意志が弱いから』だけで片づけると、心の中で実際に起きている綱引きが見えません。",
          "この教材では、頭で望む自分とは別に、今の状態を守ろうとする自分がいると捉えます。まず二人を責めずに、地図へ置きます。",
        ],
        tone: "mist",
      },
      {
        kind: "guide",
        eyebrow: "MENTAL MODEL",
        title: "『こうしたい』と『こうできない』は、どちらも自分。",
        paragraphs: [
          "言葉にできる望みだけが、あなたの全部ではありません。感情、身体の反応、いつもの選択にも、別の自分の意図が現れます。",
          "この教材でいう『信念が現実に反映される』とは、信念が注意、受け取り方、無意識の選択を変え、その積み重ねが結果に表れるという見方です。考えただけで外の出来事を起こす、という意味ではありません。",
          "ここで使う『複数の自分』は、病名ではなく、葛藤を見やすくするための心のモデルです。",
        ],
        bullets: ["頭で望んでいる方向", "実際に繰り返している反応", "二つの間で起きている綱引き"],
        tone: "mist",
      },
      {
        kind: "input",
        key: "currentProblem",
        eyebrow: "MAP POINT 01",
        title: "今、何を変えたい？",
        prompt: "同じように繰り返していること、または今いちばん解決したいことを、普段の言葉で一つ教えてください。",
        placeholder: "例：集客を始めたいのに、人にどう思われるか怖くて発信できない",
        helper: "病名や立派な説明はいりません。『何をしたいのに、何が起きるか』が分かれば十分です。",
        fallbackReply: "まず、いま止まっている場所が地図に入りました。ここを出発点にします。",
      },
      {
        kind: "input",
        key: "desiredState",
        eyebrow: "MAP POINT 02",
        title: "本当は、どうなりたい？",
        prompt: "その問題が少し軽くなったら、何をしている自分でいたいですか？",
        placeholder: "例：怖さがあっても、自分の言葉で週に一度は発信している",
        helper: "『悩みがない』ではなく、悩みが軽くなった後にしている行動を書きます。",
        fallbackReply: "消したい問題だけでなく、その先で生きたい姿が見えてきました。",
      },
      {
        kind: "map",
        eyebrow: "FIRST MAP",
        title: "最初の綱引きが見えた。",
        lead: "いまは答えを出しません。望む方向と、そこへ進めない現実を、同時に地図へ置けたことが最初の前進です。",
        refs: [
          { key: "currentProblem", label: "いま繰り返していること" },
          { key: "desiredState", label: "本当は進みたい方向" },
        ],
        insight: "次は、止めている自分を敵にせず、どんな動きをしているのか確かめます。",
      },
    ],
  },
  {
    id: 2,
    zone: "THE PATTERN",
    shortTitle: "悩みのフェーズ",
    title: "問題を繰り返す時、どの自分が現れる？",
    hook: "責めるためではなく、無意識の動きを見つける。",
    result: "現在の問題を支えている反応と過去の反復を特定する",
    color: "#8bb8ff",
    sourceUrl: "https://youtu.be/wmEBDylsmUo",
    sourceTitle: "悩みのフェーズ",
    screens: [
      {
        kind: "guide",
        eyebrow: "INNER WORLD MAP 02",
        title: "『なぜできない？』ではなく、『その時、何をしている？』",
        paragraphs: [
          "問題が起きるたび、自分を責めても地図は増えません。見るのは、止まる直前や失敗した後に、実際に繰り返している行動です。",
          "外側の原因を否定するのではありません。この章では、自分で選び直せる部分だけを見つけます。",
        ],
        tone: "mist",
      },
      {
        kind: "input",
        key: "currentPattern",
        eyebrow: "OBSERVATION 01",
        title: "問題が起きる場面で、何をしてしまう？",
        prompt: "先ほど書いた問題が起きる時、あなたは実際に何をしますか。避ける、急ぐ、やり方を変える、相手へ合わせるなど、行動で書いてください。",
        placeholder: "例：反応がないと不安になり、別の企画へすぐ変えてしまう",
        helper: "性格ではなく、カメラで見える行動にします。",
        fallbackReply: "性格ではなく行動で見ると、変えられる場所が見つけやすくなります。",
      },
      {
        kind: "input",
        key: "shadowSelf1",
        eyebrow: "SHADOW 01",
        title: "その行動をするのは、どんな自分？",
        prompt: "今の行動をする自分に、短い呼び名をつけるなら何ですか？",
        placeholder: "例：結果が出ないと、すぐ別の道へ逃げる自分",
        helper: "『弱い自分』のような評価ではなく、何をする自分かを書きます。",
        fallbackReply: "名前がつくと、悩みと自分自身を少し分けて見られます。",
      },
      {
        kind: "input",
        key: "shadowSelf2",
        eyebrow: "SHADOW 02",
        title: "別の場面では、どんな自分が現れる？",
        prompt: "同じ問題を支えていそうな、もう一つの行動や反応はありますか？",
        placeholder: "例：うまくいっていない数字を見るのを避ける自分",
        helper: "同じ答えしか浮かばなければ、『一つ目と同じ』でも構いません。",
        skipLabel: "一つ目だけで進む",
        fallbackReply: "同じ問題でも、場面によって別の反応が現れることがあります。",
      },
      {
        kind: "input",
        key: "shadowSelf3",
        eyebrow: "SHADOW 03",
        title: "まだ隠れている動きはある？",
        prompt: "アイデアを増やす、誰かを責める、何も感じないふりをするなど、ほかに繰り返す動きがあれば一つ書いてください。",
        placeholder: "例：考えることを増やしすぎて、何をしたいか分からなくなる自分",
        helper: "無理に三つ作る必要はありません。",
        skipLabel: "今は見つからない",
        fallbackReply: "見つからない場所を無理に埋めないことも、観察の一部です。",
      },
      {
        kind: "input",
        key: "pastPattern",
        eyebrow: "PAST ECHO",
        title: "昔も、同じ動きをしたことはある？",
        prompt: "子どもの頃から十代くらいまでで、似た反応によって困った場面を一つ思い出せますか？",
        placeholder: "例：成果が出なくなると習い事を休み、叱られた",
        helper: "強い出来事を無理に掘り返す必要はありません。話せる範囲の小さな場面で十分です。",
        skipLabel: "思い出せないまま進む",
        fallbackReply: "昔との共通点は、今の反応がいつ身についたかを見る手がかりになります。",
      },
      {
        kind: "input",
        key: "immediateReason",
        eyebrow: "ONE LINE",
        title: "その時、なぜその行動をした？",
        prompt: "当時の自分の目線で、一番近い理由を一文にしてください。",
        placeholder: "例：結果が出ない自分を見たくなかったから",
        helper: "正しい分析ではなく、その時の自分が信じていた理由を書きます。",
        skipLabel: "まだ言葉にならない",
        fallbackReply: "行動の奥にあった理由が見えると、責める以外の見方が生まれます。",
      },
      {
        kind: "map",
        eyebrow: "PATTERN FOUND",
        title: "悩みを支える動きが、輪郭になった。",
        lead: "ここで見つけた自分は、倒す敵ではありません。何かを守るために、同じ方法を繰り返してきた可能性があります。",
        refs: [
          { key: "currentPattern", label: "現在の行動" },
          { key: "shadowSelf1", label: "現れる自分" },
          { key: "pastPattern", label: "過去の似た場面" },
          { key: "immediateReason", label: "当時の理由" },
        ],
        insight: "次は、問題が生まれる前に、どんな自分でいられたのかを探します。",
      },
    ],
  },
  {
    id: 3,
    zone: "THE SUNLIT FIELD",
    shortTitle: "陽の体験",
    title: "まだ問題になる前、どんな自分だった？",
    hook: "楽しかった、夢中だった、自然にできた。そこに元の方向がある。",
    result: "自己発揮できていた体験から『陽の自分』を言葉にする",
    color: "#ffd47d",
    sourceUrl: "https://youtu.be/q6Zzlrvn3kI",
    sourceTitle: "陽の体験",
    screens: [
      {
        kind: "guide",
        eyebrow: "INNER WORLD MAP 03",
        title: "傷ついた場面だけでは、元の自分が見えない。",
        paragraphs: [
          "悩みの根を探す時、苦しかった記憶だけを追うと、『傷ついた自分』しか地図に残りません。",
          "その前に、自然に自分を出せた時、楽しかった時、誰かに言われなくても動けた時を探します。これを陽の体験と呼びます。",
        ],
        tone: "light",
      },
      {
        kind: "input",
        key: "lightExperience1",
        eyebrow: "LIGHT MEMORY 01",
        title: "夢中になれた場面は？",
        prompt: "子どもの頃から十代くらいまでで、時間を忘れて楽しめたことを一つ教えてください。",
        placeholder: "例：放課後に友達とサッカーをしている時、誰より夢中だった",
        helper: "賞や成果がなくても構いません。自分が生きていた感覚を優先します。",
        fallbackReply: "評価より先に動けた場面には、あなたの自然な方向が現れています。",
      },
      {
        kind: "input",
        key: "lightExperience2",
        eyebrow: "LIGHT MEMORY 02",
        title: "自分らしく表現できた場面は？",
        prompt: "話す、作る、遊ぶ、助けるなど、自分の力を自然に出せた場面を一つ教えてください。",
        placeholder: "例：絵を描いて見せたら、友達が続きを楽しみにしてくれた",
        helper: "『得意だった』より、その時に何をしていたかを書きます。",
        skipLabel: "今は一つ目だけで進む",
        fallbackReply: "自分から出したものが誰かへ届いた体験も、陽の地図になります。",
      },
      {
        kind: "input",
        key: "lightExperience3",
        eyebrow: "LIGHT MEMORY 03",
        title: "誰かに言われなくても、できたことは？",
        prompt: "頼まれなくても始めたこと、工夫したこと、守ったことがあれば一つ教えてください。",
        placeholder: "例：困っている後輩を見ると、自分から練習方法を考えた",
        helper: "思い出せなければ、今の生活の中から選んでも構いません。",
        skipLabel: "今は見つからない",
        fallbackReply: "自発的に動いた場面には、何を大事にしているかが表れます。",
      },
      {
        kind: "input",
        key: "lightSelf",
        eyebrow: "NAME THE LIGHT",
        title: "三つの場面にいたのは、どんな自分？",
        prompt: "陽の体験を一つにまとめて、『○○する自分』と名前をつけてください。",
        placeholder: "例：夢中で作り、誰かと面白さを分け合う自分",
        helper: "書いた瞬間に『これだ』と感じる言葉まで、何度直しても構いません。",
        fallbackReply: "陽の自分は、これから進む方向を測る基準になります。",
      },
      {
        kind: "map",
        eyebrow: "LIGHT FOUND",
        title: "問題より前にいた自分を、取り戻した。",
        lead: "陰の自分だけが本当の自分ではありません。陽の体験も同じように、あなたの一部です。",
        refs: [
          { key: "lightExperience1", label: "夢中だった時" },
          { key: "lightExperience2", label: "表現できた時" },
          { key: "lightExperience3", label: "自分から動いた時" },
          { key: "lightSelf", label: "陽の自分" },
        ],
        insight: "次は、陽の自分から今の反応へ変わった境目を探します。",
      },
    ],
  },
  {
    id: 4,
    zone: "THE SHADOW VALLEY",
    shortTitle: "陰の体験",
    title: "何が起きて、今の生き方が必要になった？",
    hook: "出来事ではなく、そこで作った考え方が今へ続いている。",
    result: "原体験から考え方・行動・価値観・深層自己までをつなぐ",
    color: "#c59cff",
    sourceUrl: "https://youtu.be/voBQYRQIl6Y",
    sourceTitle: "陰の体験〜深層自己",
    screens: [
      {
        kind: "guide",
        eyebrow: "INNER WORLD MAP 04",
        title: "傷そのものではなく、そこで覚えた生き方を見る。",
        paragraphs: [
          "陽の自分でいられなくなった境目には、何かの出来事があります。けれど、同じ出来事を経験した全員が同じ生き方になるわけではありません。",
          "地図にするのは、出来事の後に自分が作った考え方、選ぶようになった行動、正しいと信じた価値観です。",
          "つらさが強くなる場合は、無理に続けず、ここで閉じて構いません。深刻な記憶や症状は、適切な専門家と安全に扱ってください。",
        ],
        tone: "shadow",
      },
      {
        kind: "input",
        key: "turningPoint",
        eyebrow: "TURNING POINT",
        title: "陽の自分でいられなくなった境目は？",
        prompt: "先ほどの『陽の自分』から、今の反応をする自分へ変わるきっかけになった場面を一つ教えてください。",
        placeholder: "例：得意だと思っていた場所を離れたら、周りよりできない自分になった",
        helper: "一番強い傷を選ぶ必要はありません。流れを説明できる場面で十分です。",
        skipLabel: "今日はここを空白にする",
        fallbackReply: "境目を決めつけず、今見えている範囲だけを地図に残します。",
      },
      {
        kind: "input",
        key: "bornThought",
        eyebrow: "BORN RULE 01",
        title: "その時、何を考えるようになった？",
        prompt: "その出来事の後から、自分・人・世界について、どんな考えが増えましたか？",
        placeholder: "例：できない姿を見せたら、自分の価値が下がる",
        helper: "今の意見ではなく、当時の自分が身につけた言葉を書きます。",
        skipLabel: "まだ分からない",
        fallbackReply: "当時の考えは、今も自動的に場面の意味を決めているかもしれません。",
      },
      {
        kind: "input",
        key: "bornAction",
        eyebrow: "BORN RULE 02",
        title: "その考えから、何をするようになった？",
        prompt: "自分を守るために、避ける、頑張る、隠す、合わせるなど、どんな行動を選ぶようになりましたか？",
        placeholder: "例：負けそうな場所を避け、勝てそうな場所へ移るようになった",
        helper: "その時には必要だった行動として、責めずに書きます。",
        skipLabel: "まだ分からない",
        fallbackReply: "行動は、当時の自分が考えた守り方だった可能性があります。",
      },
      {
        kind: "input",
        key: "bornValue",
        eyebrow: "BORN RULE 03",
        title: "続けるうちに、何が『正しい』になった？",
        prompt: "その考えと行動を繰り返す中で、どんな生き方が正しい、必要だと思うようになりましたか？",
        placeholder: "例：できない理由を隠せば、自分の評価を守れる",
        helper: "ここでいう価値観は、善悪の判定ではなく、自分の中で当然になったルールです。",
        skipLabel: "まだ言葉にならない",
        fallbackReply: "繰り返したルールは、考えなくても選ぶ前提になっていきます。",
      },
      {
        kind: "input",
        key: "deepSelf",
        eyebrow: "DEEP SELF",
        title: "そのルールで生きるのは、どんな自分？",
        prompt: "出来事、考え、行動、価値観を一つにまとめて、『○○として生きる自分』と名前をつけてください。",
        placeholder: "例：失敗を隠し、悲劇の主人公として注目を守る自分",
        helper: "これがこの教材でいう『深層自己』です。人格全体ではなく、問題の場面で現れる一つの自己モデルです。",
        skipLabel: "仮の名前をつけずに進む",
        fallbackReply: "深層自己は敵ではなく、昔の方法で今も何かを守ろうとしている自分です。",
      },
      {
        kind: "map",
        eyebrow: "DEEP SELF FOUND",
        title: "点だった記憶が、一つの流れになった。",
        lead: "出来事が直接いまを決めたのではなく、そこで作った考え・行動・価値観が、現在の反応へ続いているという地図です。",
        refs: [
          { key: "turningPoint", label: "境目の体験" },
          { key: "bornThought", label: "生まれた考え" },
          { key: "bornAction", label: "選ぶようになった行動" },
          { key: "bornValue", label: "当然になったルール" },
          { key: "deepSelf", label: "深層自己" },
        ],
        insight: "次は、望む自分と深層自己が、本当は何を求めているかを確かめます。",
      },
    ],
  },
  {
    id: 5,
    zone: "THE INNER BRIDGE",
    shortTitle: "深層自己統合",
    title: "二つの自分は、本当は何を望んでいる？",
    hook: "手段は反対でも、目的は同じかもしれない。",
    result: "顕在的な望みと深層自己の目的をつなぎ、新しい手段を作る",
    color: "#7ee6c3",
    sourceUrl: "https://youtu.be/rd10343M2-Y",
    sourceTitle: "深層自己統合",
    screens: [
      {
        kind: "guide",
        eyebrow: "INNER WORLD MAP 05",
        title: "深層自己は、問題そのものが欲しいわけではない。",
        paragraphs: [
          "頭では問題を終わらせたい。一方で、深層自己は同じ問題を繰り返す。その二つを敵同士にすると、綱引きは強くなります。",
          "ここでは『その方法で、何を得ようとしていたのか』『何を守ろうとしていたのか』まで降ります。手段が違っても、最後の目的が重なることがあります。",
        ],
        tone: "bridge",
      },
      {
        kind: "input",
        key: "consciousPurpose",
        eyebrow: "PURPOSE 01",
        title: "望む未来で、何を得たい？",
        prompt: "最初に書いた『こうなりたい』が実現したら、あなたは何を感じ、何を得られますか？",
        placeholder: "例：自分の価値を実感し、安心して人に見てもらえる",
        helper: "売上、成功、関係改善のさらに先にある、感情や意味を一つ書きます。",
        fallbackReply: "望む結果の奥にある目的が、顕在的な自分の進みたい方角です。",
      },
      {
        kind: "input",
        key: "deepPurpose",
        eyebrow: "PURPOSE 02",
        title: "深層自己は、何を守ろうとしていた？",
        prompt: "今の問題を繰り返すことで、深層自己は何を避け、何を得ようとしていたと思いますか？",
        placeholder: "例：失敗して価値がないと思われるのを避け、注目やつながりを失わないようにしていた",
        helper: "『問題が好きだから』で終わらせず、その行動のさらに先にある目的を見ます。",
        skipLabel: "まだ推測できない",
        fallbackReply: "問題を続ける手段にも、守りたかった目的が隠れていることがあります。",
      },
      {
        kind: "input",
        key: "sharedPurpose",
        eyebrow: "COMMON DESTINATION",
        title: "二つの目的に、共通する言葉はある？",
        prompt: "望む自分と深層自己が、方法は違っても両方ほしかったものを、一言にまとめてください。",
        placeholder: "例：自分には価値があり、誰かとつながっていると感じたい",
        helper: "完全に同じでなければ、両方を大事にできる上位の目的を探します。",
        skipLabel: "まだ一つにできない",
        fallbackReply: "共通目的が見えると、深層自己を消さずに別の道を相談できます。",
      },
      {
        kind: "input",
        key: "newRoute",
        eyebrow: "NEW ROUTE",
        title: "問題を繰り返さずに、その目的へ進むなら？",
        prompt: "深層自己が守りたいものを捨てず、今の自分が選べる新しい行動を一つ作ってください。",
        placeholder: "例：成果を隠す代わりに、途中経過を一人へ見せ、つながりを確かめる",
        helper: "大きな解決策ではなく、同じ目的へ向かう別の小さな手段にします。",
        fallbackReply: "古い手段を禁止するのではなく、同じ目的へ進める別の道が増えました。",
      },
      {
        kind: "map",
        eyebrow: "BRIDGE OPEN",
        title: "綱引きの間に、橋がかかった。",
        lead: "統合は、陰の自分を消すことではありません。二つの目的を理解し、どちらも無視しない新しい手段を選べる状態です。",
        refs: [
          { key: "consciousPurpose", label: "望む自分の目的" },
          { key: "deepPurpose", label: "深層自己の目的" },
          { key: "sharedPurpose", label: "共通の目的" },
          { key: "newRoute", label: "新しい手段" },
        ],
        insight: "最後は、この地図を未来へ進むコンパスに変えます。",
      },
    ],
  },
  {
    id: 6,
    zone: "THE COMPASS ROOM",
    shortTitle: "理想へのコンパス",
    title: "陽と陰を、これからの力へ変える。",
    hook: "陽の自分が方角を示し、陰の自分が磨いた力を鍵にする。",
    result: "ハイヤーコンパス・ジーニアスキー・最初の一手を完成する",
    color: "#ffb5de",
    sourceUrl: "https://youtu.be/CicUWsowFac",
    sourceTitle: "ハイヤーコンパス、ジーニアスキー",
    screens: [
      {
        kind: "guide",
        eyebrow: "INNER WORLD MAP 06",
        title: "地図は、過去を説明するためだけに作るのではない。",
        paragraphs: [
          "陽の自分からは、どちらへ進むと自分を発揮できるかを受け取ります。これをハイヤーコンパスと呼びます。",
          "陰の自分からは、生き延びるために磨いてきた能力を受け取ります。これをジーニアスキーと呼びます。",
          "過去を美化するのではなく、古い使い方から能力だけを取り出し、望む方向へ使い直します。",
        ],
        tone: "compass",
      },
      {
        kind: "input",
        key: "higherCompass",
        eyebrow: "HIGHER COMPASS",
        title: "陽の自分は、どちらを指している？",
        prompt: "陽の体験に共通していた『自分が自然に生きる方向』を、これからの方角として一文にしてください。",
        placeholder: "例：夢中で作ったものを、人と分かち合える方向へ進む",
        helper: "職業名ではなく、どんな状態で何をしているかを書きます。",
        fallbackReply: "陽の体験は、未来で何を選ぶと自分を発揮しやすいかを示します。",
      },
      {
        kind: "input",
        key: "geniusKey",
        eyebrow: "GENIUS KEY",
        title: "陰の自分は、どんな力を磨いてきた？",
        prompt: "深層自己が問題を守るために使ってきた力のうち、使う方向を変えれば役立つものは何ですか？",
        placeholder: "例：危険を早く察知し、別の道をいくつも見つける力",
        helper: "傷を才能と呼ぶのではありません。そこで実際に使ってきた観察力、粘り、発想などを分けて見ます。",
        skipLabel: "まだ見つからない",
        fallbackReply: "古い生き方を続けなくても、その中で磨いた能力は持っていけます。",
      },
      {
        kind: "input",
        key: "firstMove",
        eyebrow: "FIRST MOVE",
        title: "この地図を使って、最初に何をする？",
        prompt: "ハイヤーコンパスの方向へ、ジーニアスキーを使って、24時間以内にできる一動作を決めてください。",
        placeholder: "例：企画を増やす力を使い、今ある一案だけを一人へ見せて反応を聞く",
        helper: "完成ではなく、始まったと分かる一動作にします。",
        fallbackReply: "地図が行動につながった時、インナーワールドマップは現在の道具になります。",
      },
      {
        kind: "complete",
        eyebrow: "MAP COMPLETED",
        title: "あなたのインナーワールドマップが完成しました。",
        lead: "この地図は診断結果ではありません。新しい経験が増えれば、何度でも書き直せます。問題が戻った時は、意志の弱さを責める前に、どの自分が何を守ろうとしているかをもう一度確かめてください。",
      },
    ],
  },
];

export const INNER_WORLD_SESSIONS = [
  {
    id: 1,
    title: "言いたいことを抑え、心身に負担が出ていた相談",
    url: "https://youtu.be/eSGEJxc3wBo",
    duration: "1:32:27",
    caseSummary: "人へ気を使い、自分の言葉を抑える状態から、内側にいる『悪と戦う戦士』と、自由に自己表現する自分を地図へ置いていく実演です。",
    watchFor: [
      "相談者の比喩を奪わず、『どんな自分と言えそうか』と本人へ返している",
      "現在の悩みだけでなく、自己発揮できた体験を先に確かめている",
      "出来事→考え方と行動→価値観→深層自己の順に、本人の言葉を短く整理している",
      "顕在的な望みと深層自己が、それぞれ何を求めているかへ降りている",
    ],
  },
  {
    id: 2,
    title: "期待に応えようとして、仕事や関係で無理をしていた相談",
    url: "https://youtu.be/EtXDKPnUpbU",
    duration: "1:23:28",
    caseSummary: "仕事でも関係でも人の期待へ合わせてしまう共通パターンを見つけ、自己犠牲を必要とする自分と、本当に表現したい自分を分けていく実演です。",
    watchFor: [
      "仕事とパートナーシップを別問題にせず、二つに共通する行動を本人へ確認している",
      "コーチ側の仮説を断定せず、『この認識で合っていますか』と戻している",
      "本人がすでに気づいている内容を、結論として奪わず次の問いへつないでいる",
      "理想を抽象語で終わらせず、その状態なら何を作り、誰へ届けたいかまで具体化している",
    ],
  },
] as const;

export const INNER_WORLD_ANSWER_LABELS: Record<InnerWorldAnswerKey, string> = {
  currentProblem: "いま繰り返していること",
  desiredState: "本当は進みたい方向",
  currentPattern: "問題が起きる時の行動",
  shadowSelf1: "現れる自分 1",
  shadowSelf2: "現れる自分 2",
  shadowSelf3: "現れる自分 3",
  pastPattern: "過去の似た場面",
  immediateReason: "当時の理由",
  lightExperience1: "陽の体験 1",
  lightExperience2: "陽の体験 2",
  lightExperience3: "陽の体験 3",
  lightSelf: "陽の自分",
  turningPoint: "境目の体験",
  bornThought: "生まれた考え",
  bornAction: "選ぶようになった行動",
  bornValue: "当然になったルール",
  deepSelf: "深層自己",
  consciousPurpose: "望む自分の目的",
  deepPurpose: "深層自己の目的",
  sharedPurpose: "共通目的",
  newRoute: "新しい手段",
  higherCompass: "ハイヤーコンパス",
  geniusKey: "ジーニアスキー",
  firstMove: "最初の一手",
};

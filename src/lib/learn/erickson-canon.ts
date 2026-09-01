import type { CanonicalMangaCharacter, MangaFrame } from "./types";

export type CanonicalMangaSetting = "classroom" | "archive" | "old-school" | "control-room" | "after-school";

export type CanonicalMangaLine = {
  who: CanonicalMangaCharacter;
  text: string;
  kind?: "spoken" | "thought";
};

export type CanonicalMangaScene = {
  id: string;
  episode: number;
  page: number;
  setting: CanonicalMangaSetting;
  time: string;
  present: CanonicalMangaCharacter[];
  focus: CanonicalMangaCharacter;
  narration?: string;
  lines: CanonicalMangaLine[];
  /** 後の推理で「絵にあった」と言ってよい、観察可能な事実だけを書く。 */
  observableFacts: string[];
  /** この場面でまだ断定してはいけないこと。 */
  unresolved?: string[];
};

export type CanonicalEpisodeArc = {
  episode: number;
  title: string;
  desire: string;
  obstacle: string;
  culturalHypnosis: string;
  principle: string;
  result: string;
  scenes: CanonicalMangaScene[];
};

const scene = (
  episode: number,
  page: number,
  data: Omit<CanonicalMangaScene, "id" | "episode" | "page">,
): CanonicalMangaScene => ({ id: `ep${episode}-canon-${page}`, episode, page, ...data });

export const ERICKSON_CANON: CanonicalEpisodeArc[] = [
  {
    episode: 3,
    title: "自分の声に聞こえる常識",
    desire: "ミオは、本当にやりたい対話会の企画を自分の言葉で始めたい。",
    obstacle: "申込画面を開くと、周囲から覚えた否定の声を自分の本音だと思い、手が止まる。",
    culturalHypnosis: "好きなことは仕事にならない。現実的で正しくなければ認められない。",
    principle: "今ある内的対話を、次に選べる感覚の合図として利用する。",
    result: "否定の声は残ったが、ミオは企画名を書いて下書きを保存し、次の実習の観察役を引き受ける。",
    scenes: [
      scene(3, 1, { setting: "after-school", time: "授業後", present: ["mio", "link"], focus: "mio", narration: "授業後。ミオは申込画面を開いたまま、手を止めていた。", lines: [{ who: "mio", text: "やってみたいのに、『こんなので仕事になるわけない』って浮かぶんです。" }], observableFacts: ["ミオは申込画面を開いている", "申し込みたい気持ちを口にした", "否定する言葉が浮かぶと話した"] }),
      scene(3, 2, { setting: "classroom", time: "その直後", present: ["teacher", "mio", "link", "jun"], focus: "teacher", lines: [{ who: "teacher", text: "その声を消す前に、どこで覚えた言葉か確かめてみましょう。" }, { who: "mio", text: "親と学校と、成功例ばかり流れてくる画面です。" }], observableFacts: ["エリクソンは声を止めろと言っていない", "ミオは言葉を覚えた場所を三つ挙げた"] }),
      scene(3, 3, { setting: "classroom", time: "実習中", present: ["teacher", "mio", "link", "jun"], focus: "mio", lines: [{ who: "teacher", text: "また浮かんだら、息を一つ吐く合図にしてもいい。送信ではなく、下書き保存まででもいい。" }], observableFacts: ["エリクソンは一呼吸と下書き保存を提案した", "送信までは求めていない"] }),
      scene(3, 4, { setting: "after-school", time: "数分後", present: ["mio", "link", "jun"], focus: "mio", narration: "ミオは息を一つ吐き、企画名を入力した。", lines: [{ who: "mio", text: "声はまだあります。でも、下書きは保存できました。" }], observableFacts: ["否定の声は消えていない", "企画名を書いた", "下書きを保存した"] }),
      scene(3, 5, { setting: "classroom", time: "帰り際", present: ["mio", "link", "jun"], focus: "mio", lines: [{ who: "mio", text: "次の実習、私を観察役にしてください。人を急かさずに支える方法を学びたい。" }], observableFacts: ["ミオは次の実習へ参加すると自分で決めた", "学びたい理由を自分の言葉で話した"] }),
    ],
  },
  {
    episode: 4,
    title: "声が出ない公開実習",
    desire: "リンクは、緊張しても最初の問いを自分の声で届けたい。",
    obstacle: "人前では失敗してはいけないという思いが強まり、『落ち着いて』と言われるほど固まる。",
    culturalHypnosis: "人前では失敗を見せてはいけない。うまく話せなければ価値がない。",
    principle: "本人が今うなずける事実へ合わせ、その続きに選べる一動作を提案する。",
    result: "リンクは名前と最初の問いだけを話し、実習相手から『急かされなかったから話せた』と伝えられる。",
    scenes: [
      scene(4, 1, { setting: "classroom", time: "公開実習の開始", present: ["teacher", "link", "mio", "jun"], focus: "link", narration: "三分間の対話実習。リンクは前へ出たまま、声が出なかった。", lines: [{ who: "link", text: "……。", kind: "spoken" }, { who: "link", text: "失敗したら、ここにいる資格がない。", kind: "thought" }], observableFacts: ["リンクは前に立っている", "声が出ていない", "失敗への恐れはリンクの心の声である"] }),
      scene(4, 2, { setting: "classroom", time: "実習中", present: ["link", "mio", "jun"], focus: "mio", lines: [{ who: "mio", text: "足が床に触れてる。私の声は聞こえる？" }, { who: "link", text: "……うん。" }], observableFacts: ["ミオは観察できる二つの事実を確かめた", "リンクは返事をした"] }),
      scene(4, 3, { setting: "classroom", time: "実習中", present: ["link", "mio", "jun"], focus: "link", lines: [{ who: "mio", text: "息を一つ吐ける。できそうなら、名前だけ言ってもいい。" }, { who: "link", text: "清瀬リンクです。" }], observableFacts: ["ミオは落ち着けと命令していない", "名前だけという小さな提案をした", "リンクは自分の名前を言った"] }),
      scene(4, 4, { setting: "classroom", time: "実習の続き", present: ["link", "mio", "jun", "teacher"], focus: "link", lines: [{ who: "link", text: "今日は、何を話せたら少し楽になりそうですか？" }], observableFacts: ["リンクは最初の問いを一つ話した", "三分間を完璧に話したとは描かれていない"] }),
      scene(4, 5, { setting: "archive", time: "実習後", present: ["link", "mio", "jun"], focus: "mio", narration: "実習相手から、短いメモが届いた。", lines: [{ who: "link", text: "『急かされなかったから話せた』って。" }, { who: "mio", text: "よかった。原理カードは私が保管庫へ戻しておくね。" }], observableFacts: ["実習相手の感想が届いた", "ミオはカードを返す役を引き受けた"] }),
    ],
  },
  {
    episode: 5,
    title: "原理カード消失",
    desire: "リンクは、信じた相手を決めつけず、本当の理由を確かめたい。",
    obstacle: "カードとミオが同時に消え、『最初から全部嘘だった』という結論へ飛びつく。",
    culturalHypnosis: "一度裏切られたら、弱みを見せる前に関係を切るべきだ。",
    principle: "混乱を急いだ結論で埋めず、事実・未確定・次の確認へ注意を戻す。",
    result: "リンクは関係を切る連絡を送らず、アクセス記録を確認すると決める。",
    scenes: [
      scene(5, 1, { setting: "archive", time: "翌朝", present: ["link", "jun"], focus: "link", narration: "保管庫は空だった。机には、本物の金属の鍵だけが残っていた。", lines: [{ who: "link", text: "カードもミオもいない。最初から全部、嘘だったのか。" }], observableFacts: ["カードが保管庫にない", "ミオがその場にいない", "金属の鍵が机にある"], unresolved: ["誰がカードを持ち出したか", "ミオの目的", "鍵を残した理由"] }),
      scene(5, 2, { setting: "archive", time: "同じ朝", present: ["link", "jun", "teacher"], focus: "jun", lines: [{ who: "jun", text: "分かるのは、カードがない、ミオがいない、鍵は返っている。この三つまでだ。" }], observableFacts: ["淳は観察事実だけを三つに分けた"], unresolved: ["裏切りかどうか"] }),
      scene(5, 3, { setting: "control-room", time: "記録確認", present: ["teacher", "link", "jun"], focus: "teacher", lines: [{ who: "teacher", text: "これは混乱技法の実演ではありません。混乱した自分を、確認できる事実へ戻す場面です。" }], observableFacts: ["エリクソンは混乱技法だと呼んでいない", "記録を確認しようとしている"] }),
      scene(5, 4, { setting: "control-room", time: "数分後", present: ["link", "jun", "teacher"], focus: "link", narration: "記録には、外部企業への『従わせる会話テンプレート』送信予約が残っていた。", lines: [{ who: "link", text: "カードを、こんな使い方に？" }], observableFacts: ["外部送信の予約記録がある", "送信名に従わせる会話テンプレートとある"], unresolved: ["予約した人物", "ミオが知っていたか"] }),
      scene(5, 5, { setting: "control-room", time: "監視映像", present: ["link", "jun", "teacher", "mio"], focus: "mio", narration: "映像には、カードを鞄へ入れるミオが映っていた。", lines: [{ who: "mio", text: "誰にも渡さない。", kind: "spoken" }, { who: "link", text: "……ミオ。" }], observableFacts: ["ミオ本人がカードを鞄へ入れた", "ミオは誰にも渡さないと言った"], unresolved: ["誰に渡さないのか", "なぜ説明せずに去ったのか"] }),
    ],
  },
  {
    episode: 6,
    title: "『仲間なら一人で』という条件",
    desire: "淳は、誰かを助ける時も一人で抱え込まず、必要な助けを求めたい。",
    obstacle: "匿名の文をミオの命令だと思い込み、『一人で行くことが仲間の証明』という前提を受け入れそうになる。",
    culturalHypnosis: "人に迷惑をかけるな。自分の問題は一人で解決しろ。",
    principle: "文に書かれた事実と、受け手が受け入れた前提を分ける。",
    result: "淳はリンクとエリクソンへ相談し、三人で旧校舎へ向かう。",
    scenes: [
      scene(6, 1, { setting: "control-room", time: "監視映像の直後", present: ["jun", "link"], focus: "jun", narration: "端末に、送信者不明の一文が届いた。", lines: [{ who: "jun", text: "『本当に仲間なら、一人で旧校舎へ来られるよね』。" }], observableFacts: ["文面に一人で旧校舎へと書かれている", "送信者名は表示されていない"], unresolved: ["送信者", "一人で行く必要性"] }),
      scene(6, 2, { setting: "after-school", time: "出発前", present: ["jun", "link"], focus: "link", lines: [{ who: "link", text: "『一人で行け』とは書いてある。でも、一人で行くことが仲間の証明だとは決まってない。" }], observableFacts: ["リンクは文面と意味を分けた"] }),
      scene(6, 3, { setting: "classroom", time: "相談中", present: ["jun", "link", "teacher"], focus: "jun", lines: [{ who: "jun", text: "僕は『迷惑をかけるな、自分で何とかしろ』で、助けを求められなかった。だからこの学校に来たんです。覚えた常識と、本当に望むことを分けられるようになるために。" }], observableFacts: ["淳は助けを求められなかった過去を自分で話した", "催眠学校へ入った理由を話した"] }),
      scene(6, 4, { setting: "old-school", time: "その夜", present: ["jun", "link", "teacher"], focus: "jun", narration: "三人は、行き先と帰る時刻を共有して旧校舎へ向かった。", lines: [{ who: "jun", text: "一人で抱えない。これが僕の選択です。" }], observableFacts: ["三人で行動している", "行き先と帰る時刻を共有した"] }),
      scene(6, 5, { setting: "old-school", time: "旧校舎の端末室", present: ["jun", "link", "teacher"], focus: "link", narration: "端末の送信履歴は、学校の自動審査システムを指していた。", lines: [{ who: "link", text: "ミオの文じゃない。僕たちが、ミオの命令だと決めてたんだ。" }], observableFacts: ["送信元は自動審査システムだった", "ミオの名は送信履歴にない"] }),
    ],
  },
  {
    episode: 7,
    title: "追うか諦めるか、以外の選択",
    desire: "リンクは、ミオを急かさずに安全だけを確かめたい。",
    obstacle: "自動審査システムが『今すぐ一人で追う／追跡をやめる』の二択を示す。",
    culturalHypnosis: "正しい答えは用意された選択肢の中にある。迷うなら覚悟が足りない。",
    principle: "本人の望みを確認し、その望みに近づく安全な複数の道を本人へ返す。",
    result: "リンクは返信不要の連絡を送り、ミオから翌朝に話すという返事を受け取る。",
    scenes: [
      scene(7, 1, { setting: "old-school", time: "端末室", present: ["link", "jun", "teacher"], focus: "link", narration: "画面には二つのボタンしかなかった。", lines: [{ who: "link", text: "『今すぐ一人で追う』か『追跡をやめる』。どっちも、僕がしたいことじゃない。" }], observableFacts: ["画面に二つの選択肢がある", "リンクはどちらも望みではないと話した"] }),
      scene(7, 2, { setting: "old-school", time: "同じ夜", present: ["teacher", "link", "jun"], focus: "teacher", lines: [{ who: "teacher", text: "相手を逃がさない二択は、治療的ダブルバインドではありません。まず、リンクが望むことを聞きましょう。" }], observableFacts: ["エリクソンはシステムの二択を治療的とは呼んでいない"] }),
      scene(7, 3, { setting: "old-school", time: "同じ夜", present: ["teacher", "link", "jun"], focus: "link", lines: [{ who: "link", text: "理由を聞きたい。でも今は、無事かだけ分かればいい。" }, { who: "teacher", text: "今夜、返信不要の文を残すか。明朝、送る文を一緒に作るか。どちらなら近づけますか？" }], observableFacts: ["リンクは自分の目的を言った", "二つの案はどちらもリンクの目的と安全を守る"] }),
      scene(7, 4, { setting: "old-school", time: "送信時", present: ["link", "jun"], focus: "link", lines: [{ who: "link", text: "『説明は急がなくていい。無事かだけ知らせて。話す場所と時間は君が選べる』。これで送る。" }], observableFacts: ["返信を強制しない文面をリンクが自分で選んだ"] }),
      scene(7, 5, { setting: "after-school", time: "翌朝", present: ["mio", "link", "jun"], focus: "link", narration: "朝、画面の中のミオから短い返事が届いた。", lines: [{ who: "mio", text: "無事です。今日の夕方なら、話せます。" }, { who: "link", text: "返す時を、ミオが選んだ。" }], observableFacts: ["ミオは無事だと返した", "話す時間をミオ自身が提示した"] }),
    ],
  },
  {
    episode: 8,
    title: "鍵を隠した司書の物語",
    desire: "ミオは、決めつけられずにカードを持ち出した背景を伝えたい。",
    obstacle: "直接説明すると言い訳に聞こえると思い、まず出来事と同じ構造の短い物語を送る。",
    culturalHypnosis: "一度間違えた人の説明は言い訳だ。最初の評価を変えるのは弱さだ。",
    principle: "似た構造の物語を渡し、意味を決めつけず、本人に重なる点を確かめる。",
    result: "リンクは物語を証拠とは扱わず質問を返し、ミオから実際の計画と居場所を聞く。",
    scenes: [
      scene(8, 1, { setting: "after-school", time: "夕方前", present: ["mio", "link", "jun"], focus: "link", narration: "画面の中のミオから、三枚の短い物語が届いた。", lines: [{ who: "mio", text: "ある司書は、町の人から大切な本の鍵を預かりました。" }], observableFacts: ["ミオが物語を送った", "物語の司書は鍵を預かった"] }),
      scene(8, 2, { setting: "archive", time: "物語の中", present: ["mio"], focus: "mio", narration: "司書は、本の言葉を『人を従わせる手引き』として売る注文書を見つけた。", lines: [{ who: "mio", text: "司書は鍵を隠しました。でも、仲間へ相談しませんでした。" }], observableFacts: ["物語には販売の注文書が出る", "司書は鍵を隠す", "司書は相談しない"] }),
      scene(8, 3, { setting: "archive", time: "物語の結末", present: ["mio"], focus: "mio", narration: "本は守られた。しかし、鍵を預けた仲間は裏切られたと思った。", lines: [{ who: "mio", text: "司書は、守ったものと壊したものの両方を見ました。" }], observableFacts: ["物語では本が守られた", "仲間の信頼は傷ついた"] }),
      scene(8, 4, { setting: "after-school", time: "読後", present: ["link", "jun", "teacher"], focus: "link", lines: [{ who: "link", text: "ミオのことかもしれない。でも物語だけで事実とは決めない。『何を守ろうとしたの？』って聞く。" }], observableFacts: ["リンクは物語を事実の証拠にしていない", "ミオへ開いた質問を返した"] }),
      scene(8, 5, { setting: "after-school", time: "返信後", present: ["mio", "link", "jun", "teacher"], focus: "link", narration: "画面の中のミオが、物語と現実を分けて答えた。", lines: [{ who: "mio", text: "カードを企業研修の服従台本へ変える計画です。証拠を持って、旧校舎の資料室にいます。" }], observableFacts: ["ミオ本人が計画の内容を説明した", "居場所を旧校舎の資料室だと伝えた"], unresolved: ["計画の全証拠", "学校側の関与"] }),
    ],
  },
  {
    episode: 9,
    title: "戻れないミオ",
    desire: "ミオは学校へ戻り、自分の行動と理由を自分の言葉で説明したい。",
    obstacle: "カードを無断で持ち出した罪悪感から、戻る資格がないと思っている。",
    culturalHypnosis: "間違えた人は、迷惑をかけないよう一人で責任を取るべきだ。",
    principle: "しない自由を残し、小さな変化を可能性として提案する。",
    result: "ミオは歩かされたのではなく、まず理由を話し、三人と学校へ戻って説明したいと自分から頼む。",
    scenes: [
      scene(9, 1, { setting: "old-school", time: "夕方", present: ["mio", "link", "jun", "teacher"], focus: "mio", lines: [{ who: "mio", text: "戻りたい。でも勝手にカードを持ち出した。二人に合わせる顔がない。" }], observableFacts: ["戻りたい気持ちはミオが声に出した", "罪悪感もミオが声に出した"] }),
      scene(9, 2, { setting: "old-school", time: "対話中", present: ["mio", "link", "jun", "teacher"], focus: "link", lines: [{ who: "link", text: "『戻って』って言いたい。でも、それじゃまた僕の答えを押しつける。", kind: "thought" }], observableFacts: ["戻ってと言いたい部分はリンクの心の声である", "リンクはまだ口にしていない"] }),
      scene(9, 3, { setting: "old-school", time: "対話中", present: ["mio", "link", "jun", "teacher"], focus: "jun", lines: [{ who: "jun", text: "今戻らなくてもいい。ここで話せる理由だけ話してもいいし、今日は黙っていてもいい。" }], observableFacts: ["淳は戻ることを命令していない", "話す・黙る選択を残した"] }),
      scene(9, 4, { setting: "old-school", time: "少し後", present: ["mio", "link", "jun", "teacher"], focus: "mio", lines: [{ who: "mio", text: "話します。外部への送信を止めたかった。でも、二人へ相談せず持ち出したのは私の間違いです。" }], observableFacts: ["ミオは理由を話す選択をした", "自分の行動の問題も認めた"] }),
      scene(9, 5, { setting: "old-school", time: "対話の終わり", present: ["mio", "link", "jun", "teacher"], focus: "mio", lines: [{ who: "mio", text: "一緒に学校へ戻って、私から説明したい。ついてきてもらえますか？" }], observableFacts: ["学校へ戻る提案はミオ自身がした", "同行を頼んだ"] }),
    ],
  },
  {
    episode: 10,
    title: "目的に賛成でも、方法には同意しない",
    desire: "三人はカードを戻し、技法を人を従わせる商品にしない仕組みを作りたい。",
    obstacle: "学校の審査システムは、ミオが学校の責任を隠す告白映像を撮れば記録を戻すと迫る。",
    culturalHypnosis: "大きな目的のためなら、一人の意思や事実を曲げても仕方がない。",
    principle: "暗示の前に、目的・方法・中止の自由への同意を確かめ、同意がなければ使わない。",
    result: "学校は外部計画を停止して第三者監査を受け、カードは用途と注意点を添えた別室の宝物庫へ戻る。",
    scenes: [
      scene(10, 1, { setting: "control-room", time: "学校へ戻った夜", present: ["mio", "link", "jun", "teacher"], focus: "mio", narration: "審査画面に、記録を戻す条件が表示された。", lines: [{ who: "mio", text: "『私が単独で盗み、学校に問題はありません』と録画すれば、カードを戻すって。" }], observableFacts: ["審査システムは告白映像を条件にした", "告白文は学校に問題がないとする内容"] }),
      scene(10, 2, { setting: "control-room", time: "条件確認", present: ["mio", "link", "jun", "teacher"], focus: "mio", lines: [{ who: "mio", text: "カードを返す目的には賛成です。でも、事実でない告白には同意しません。" }], observableFacts: ["ミオは目的と方法を分けた", "告白の方法を拒否した"] }),
      scene(10, 3, { setting: "control-room", time: "最終判断", present: ["mio", "link", "jun", "teacher"], focus: "jun", lines: [{ who: "jun", text: "従わせる暗示は使いません。記録を保全して、第三者へ調査を依頼します。" }], observableFacts: ["淳は催眠を使わないと決めた", "記録保全と第三者調査を選んだ"] }),
      scene(10, 4, { setting: "classroom", time: "翌日", present: ["mio", "link", "jun", "teacher"], focus: "teacher", lines: [{ who: "teacher", text: "学校が技法の扱いを監督できなかった責任があります。外部提供を止め、独立した確認を受けます。" }, { who: "mio", text: "私も、二人へ相談せず持ち出したことを謝ります。" }, { who: "link", text: "許せるかはまだ分からない。でも、話は聞く。" }], observableFacts: ["エリクソンは学校側の責任を認めた", "ミオは謝罪した", "リンクは即座に完全和解していない"] }),
      scene(10, 5, { setting: "archive", time: "数週間後", present: ["mio", "link", "jun", "teacher"], focus: "jun", narration: "外部計画は停止された。原理カードは、効能・使う場面・注意点とともに別室の宝物庫へ戻った。", lines: [{ who: "link", text: "初めての対話依頼が来た。今度は、相手の答えを奪わずに聞きたい。" }, { who: "jun", text: "文化的催眠を自分の本音と思い込まず、選び直せる人を増やす。そのために僕はここで学ぶ。" }], observableFacts: ["外部計画は停止された", "カードは別室へ戻った", "リンクに次の対話依頼が来た", "淳は学ぶ目的と作りたい世界を語った"] }),
    ],
  },
];

const SCENES = new Map(ERICKSON_CANON.flatMap((episode) => episode.scenes.map((item) => [item.id, item] as const)));

export function getCanonicalMangaScene(sceneId: string): CanonicalMangaScene {
  const item = SCENES.get(sceneId);
  if (!item) throw new Error(`Unknown canonical manga scene: ${sceneId}`);
  return item;
}

export function canonicalMangaFrames(episode: number): MangaFrame[] {
  const arc = ERICKSON_CANON.find((item) => item.episode === episode);
  if (!arc) throw new Error(`Unknown canonical episode: ${episode}`);
  return arc.scenes.map((item) => ({ sceneId: item.id, alt: `${arc.title} ${item.page}ページ目。${item.observableFacts.join("。")}` }));
}

export function assertEricksonCanon(): true {
  const ids = new Set<string>();
  for (const arc of ERICKSON_CANON) {
    if (arc.scenes.length !== 5) throw new Error(`EP${arc.episode}: canonical manga must have exactly five pages`);
    arc.scenes.forEach((item, index) => {
      if (item.page !== index + 1) throw new Error(`${item.id}: page order is broken`);
      if (ids.has(item.id)) throw new Error(`${item.id}: duplicate scene id`);
      ids.add(item.id);
      if (!item.present.includes(item.focus)) throw new Error(`${item.id}: focused character is not present`);
      for (const line of item.lines) {
        if (!item.present.includes(line.who)) throw new Error(`${item.id}: ${line.who} speaks but is not present`);
      }
      if (!item.observableFacts.length) throw new Error(`${item.id}: observable facts are missing`);
    });
  }
  return true;
}

export const ERICKSON_CANON_QUALITY = assertEricksonCanon();

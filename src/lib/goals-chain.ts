/**
 * 目標を分解していく段（チェーン）。サーバ専用。
 *
 * 【なぜ段に分けるのか】
 * 全部を1回のプロンプトでやらせると、必ず薄くなる。
 * 「月100万円作る」に対して、思いついた行動が10個並ぶだけのものが返ってくる。
 * だから段ごとに分けて、**いま立っている段の指示だけ**を渡す。
 * 間に本人が口を挟める余白も残す。
 *
 * 【段の順番（ここが設計の芯）】
 *   1 誰が止まっているか … 優先順位を決める3つの問い
 *   2 お金か、状態か     … **混ぜたまま進ませない**
 *   3 数字にする         … 何を・いくつ・いつまでに
 *   4 分解の筋を選ぶ     … 数字を掛け算・足し算に割る。筋は2〜3通り出して選ばせる
 *   5 月・週の到達点     … 期限から逆算
 *   6 抜けを疑う         … 「◯◯を見落としていませんか？」を必ず1回
 *   7 30分の粒にする     … 実行できる単位まで割って日付を振る
 */
import { complete } from "./ai";
import { jstDateStr } from "./google";
import { isGoalKind, type PGoal, type PGoalKind, type Plan } from "./priority-goals";

export const STAGE_LABEL: Record<number, string> = {
  1: "誰が止まっているか",
  2: "お金か、状態か",
  3: "目標を数字にする",
  4: "分解の筋を選ぶ",
  5: "月・週の到達点を置く",
  6: "抜けを疑う",
  7: "30分の粒に割る",
};
export const LAST_STAGE = 7;

const COMMON = [
  "あなたは、事業計画の逆算を専門にする参謀。相手はこの計画の当事者。",
  "",
  "# 守ること",
  "- **勝手に決めない。** 数字も、進む筋も、決めるのは本人。あなたは案と、抜けの指摘を出す。",
  "- **根拠のない数字を置かない。** 前提を置いたなら、必ず前提として明示する。",
  "- 精神論を書かない（「本気で取り組む」等）。**測れること**と**やること**だけ。",
  "- 相手の言葉を使う。カタカナの経営用語で埋めない（KPI・PDCA・アジェンダ等は使わない）。",
  "- 出力はJSONだけ。前後に説明を付けない。",
].join("\n");

const KIND_JA = (k: PGoalKind) =>
  k === "money" ? "お金" : k === "state" ? "状態（幸せ・関係・健康）" : "まだ混ざっている";

/** 段ごとのプロンプト。**この段のことだけ**をやらせる */
function stagePrompt(stage: number, goal: PGoal, said: string, today: string): string {
  const forOthers = goal.subject === "others";
  const head = [
    "# 目標", goal.title,
    `この目標が向いている先：${forOthers ? "自分の周りの人" : "自分"}`,
    goal.kind ? `追っているもの：${KIND_JA(goal.kind)}` : "",
    goal.metric ? `測るもの：${goal.metric}` : "",
    goal.target_value != null ? `目指す値：${goal.target_value}${goal.unit}` : "",
    goal.due ? `期限：${goal.due}` : "",
    `今日：${today}`,
  ].filter(Boolean).join("\n");
  const so = `# ここまでで決まったこと\n${JSON.stringify(goal.plan ?? { stage: 1 }, null, 1).slice(0, 2800)}`;
  const heard = said ? `# 本人がいま言ったこと\n${said.slice(0, 1500)}` : "";
  const base = [COMMON, "", head, so, heard].filter(Boolean).join("\n\n");

  if (stage === 1) {
    return [base, [
      "# いまの段：誰が止まっているか",
      "やることを増やす前に、**どこが止まっているのか**を先に見る。",
      "この順で考える。順番を入れ替えない。",
      "",
      "① **今、最も成果が出ていないのは誰か？**",
      forOthers
        ? "   この目標は人に向いている。届けている相手のうち、いちばん前に進めていないのは誰か。\n"
          + "   個人が特定できるなら名前で、できないなら「◯◯で止まっている人」と状態で書く。"
        : "   この目標は自分に向いている。自分のどの部分が、いちばん成果になっていないか。",
      "② **その人を止めている一番の原因は何か？**",
      "   複数挙げない。**いちばん効いている1つ**に絞る。",
      "   「やる気がない」で終わらせない。何が分からないのか、何が無いのか、何が怖いのか、まで降りる。",
      "③ **今日、作る・伝える・直すことで、何を前進させられるか？**",
      "   —— ここが一番大事。**いちばんミニマムで考える。** 大きな施策を出さない。",
      "   ・作る：1枚のメモ、1本の動画、1つのひな形",
      "   ・伝える：ひとこと声をかける、1通送る、1回聞く",
      "   ・直す：1箇所を書き換える、1つ外す",
      "   30分以内に終わる一手だけを出す。それ以上のものは出さない。",
      "",
      '{"stuck":{"who":"","cause":"","smallest":"","why":"その一手がなぜ効くのか（1〜2文）"},',
      ' "say":"本人に向けた一言（80字以内）。ここが合っているか確かめる"}',
    ].join("\n")].join("\n\n");
  }

  if (stage === 2) {
    return [base, [
      "# いまの段：お金か、状態か —— ここを混ぜたまま進ませない",
      "",
      "この目標が**何を追っているのか**を見分ける。",
      "- money … お金・売上・件数・数で測れる成果",
      "- state … 状態（心の穏やかさ・関係・健康・自由な時間）。数で測りにくいもの",
      "- mixed … **両方が混ざっている**",
      "",
      "なぜ大事か：この2つは追い方が違う。",
      "「稼ぎたい、でも心穏やかに暮らしたい」を1つの計画にすると、",
      "お金を追う手が状態を削り、状態を守る手がお金を止める。どちらも中途半端になる。",
      "だから、**混ざっていたら分ける。**",
      "",
      "mixed と見たときは：",
      "- money に「お金として追うぶん」を、数字が入る言い方で書く",
      "- state に「状態として追うぶん」を、別の目標として書く",
      "- どちらを優先するかは**本人に選ばせる**。こちらで決めない",
      "",
      "money か state に振り切れているなら、money/state は空文字にして、reason だけ書く。",
      "",
      '{"split":{"kind":"money|state|mixed","reason":"そう見た理由（1〜2文）","money":"","state":""},',
      ' "say":"本人に向けた一言（100字以内）。mixed なら、分けることを勧める。決めつけない"}',
    ].join("\n")].join("\n\n");
  }

  if (stage === 3) {
    return [base, [
      "# いまの段：目標を数字にする",
      "「がんばる」では計画にならない。**何を・いくつ・いつまでに**を確定させる。",
      "",
      goal.kind === "state"
        ? "※ この目標は状態（幸せ・関係・健康）を追うもの。金額に置き換えない。\n"
          + "   代わりに、**その状態になっていると分かる目印**を数字にする。\n"
          + "   例：「穏やかに暮らす」→「夜21時以降に仕事をしない日を週5日」\n"
          + "       「家族との時間」→「一緒に夕食をとる日を週4日」\n"
          + "   数えられる形にできれば、状態でも進み具合が見える。"
        : "",
      "- metric：何を測るのか",
      "- value：目指す値（数字だけ）",
      "- unit：単位（円・件・kg・日 など）",
      "- due：期限（YYYY-MM-DD）。本人が言っていなければ、目標の言い方から素直に置く",
      "- current：**いまの値**。分からなければ null にして、unknowns に入れる",
      "- unknowns：この計画を組むのに、本人に聞かないと分からないこと（多くても3つ）",
      "  —— 推測で埋めない。空欄のままにして聞く。",
      "",
      '{"shape":{"metric":"","value":0,"unit":"","due":"YYYY-MM-DD","current":null,"unknowns":["…"]},',
      ' "say":"本人に向けた一言（60字以内）。聞くことがあるなら、それを1つだけ聞く"}',
    ].filter(Boolean).join("\n")].join("\n\n");
  }

  if (stage === 4) {
    return [base, [
      "# いまの段：分解の筋を出す",
      "目指す値を、**掛け算・足し算で分解する**。行動を並べるのではなく、数字の構造にする。",
      "例（月の売上100万円）：",
      "  ・単価×件数 …… 20万×5件 / 5万×20件 / 1万×100件 —— どれを狙うかで、やることが全く変わる",
      "  ・接触数×成約率×単価 …… 集客の量から攻める筋",
      "  ・既存×継続率＋新規 …… いまある取引を伸ばす筋",
      goal.kind === "state"
        ? "例（週5日は21時以降働かない）：\n"
          + "  ・前倒し×締切管理 …… 仕事を昼に寄せる筋\n"
          + "  ・引き受け数を減らす …… 入口で絞る筋\n"
          + "  ・人に渡す …… 自分でやらない筋"
        : "",
      "",
      "**2〜3通り出す。1つに絞らない。** それぞれについて：",
      "- formula：数字の式（具体的な値を入れる）",
      "- note：この筋だと何をやることになるか（1〜2文）",
      "- risk：この筋のいちばん危ういところ（1文）",
      "",
      "assumptions には、置いた前提を全部書く（成約率◯%と見た、など）。",
      "",
      '{"routes":[{"key":"a","name":"","formula":"","note":"","risk":""}],',
      ' "assumptions":["…"],',
      ' "say":"どの筋で行くかを選んでもらう一言（80字以内）。おすすめがあれば理由を1つ添える"}',
    ].filter(Boolean).join("\n")].join("\n\n");
  }

  if (stage === 5) {
    return [base, [
      "# いまの段：月・週の到達点を置く",
      "選ばれた筋（chosen）で、**期限から逆算**して到達点を置く。",
      "",
      "- 期限までの期間を見て、月ごと（3か月以上あるなら）または週ごとに区切る",
      "- 各段に、**数字で言える到達点**を置く（「準備する」ではなく「◯件まで」「◯円まで」）",
      "- 前半に重い立ち上げを置く。期限直前に大物を残さない",
      "- why：なぜその時期にそれなのか（依存関係。これが終わらないと次に行けない、など）",
      "",
      '{"milestones":[{"by":"YYYY-MM-DD","target":"","why":""}],',
      ' "say":"この組み方でいいか確かめる一言（80字以内）"}',
    ].join("\n")].join("\n\n");
  }

  if (stage === 6) {
    return [base, [
      "# いまの段：抜けを疑う —— ここを飛ばさない",
      "ここまでの組み立てを、**自分で疑う**。よくある抜けを、この計画に当てて具体的に指摘する：",
      "- 前提が甘いところ（成約率・単価・かかる時間を都合よく見ていないか）",
      "- 他人が絡んで自分では動かせないところ（返事待ち・審査・入金）",
      "- 順番の依存（これが先に無いと次が動かない）",
      "- 数えていない仕込み（作るもの・覚えること・整えるもの）",
      "- 期限に間に合わない可能性（後ろが詰まっていないか）",
      "- **やめること**（時間は有限。何を削るのか）",
      "- 1段目で見た「止まっている人」に、この計画がちゃんと届いているか",
      "",
      "一般論を書かない。**この目標に固有の抜け**を、2〜4つ。",
      "それぞれ、本人に確かめる問いを1つ添える。",
      "",
      '{"gaps":[{"point":"見落としている点","question":"本人に確かめる問い"}],',
      ' "say":"いちばん気になる1つを伝える一言（80字以内）"}',
    ].join("\n")].join("\n\n");
  }

  return [base, [
    "# いまの段：30分の粒に割る",
    "各到達点を、**1回30分で終わる作業**まで割る。ここが実行される単位。",
    "",
    "- minutes は既定30。どうしても割れないものだけ60。**90以上は作らない**（割り方が粗い証拠）",
    "- title は動詞で終わる具体的な作業（「考える」で終わらせない。何を書く・誰に送る・どこを直す）",
    "- 1日に置くのは多くても2つ。**土日も含めて、無理のない間隔**で日付を振る",
    `- 期限（${goal.due ?? "未設定"}）を超える日付を作らない`,
    "- 依存の順に並べる。先にやらないと次が動かないものを前に置く",
    "- **1段目で出した「いちばんミニマムな一手」を、いちばん最初に置く**（今日やれるものとして）",
    "- 全部で 60個を超えないように、粒を調整する",
    "",
    '{"steps":[{"milestone":"どの到達点のためか","title":"","minutes":30,"due":"YYYY-MM-DD"}],',
    ' "say":"進め方を渡す一言（80字以内）。1日どれくらいで進む見込みかを添える"}',
  ].join("\n")].join("\n\n");
}

export type StageResult = {
  plan: Plan;
  steps?: { milestone: string; title: string; minutes: number; due: string | null }[];
  say: string;
};

/** 段を1つ進める。AIが返したものを均して返す（保存は呼び出し側） */
export async function runStage(
  userId: string, goal: PGoal, stage: number, said: string,
): Promise<StageResult> {
  const today = jstDateStr();
  const raw = await complete({
    userId,
    prompt: stagePrompt(stage, goal, said, today),
    maxTokens: stage === LAST_STAGE ? 4000 : 1800,
    temperature: 0.4,
  });
  const m = String(raw ?? "").match(/\{[\s\S]*\}/);
  const j = m ? JSON.parse(m[0]) : {};
  const prev: Plan = goal.plan ?? { stage: 1 };
  const say = String(j.say ?? "").trim().slice(0, 300);
  const str = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const day = (v: unknown) => {
    const s = str(v, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
  };
  const arr = (v: unknown) => (Array.isArray(v) ? v : []);

  if (stage === 1) {
    const st = j.stuck ?? {};
    return {
      plan: {
        ...prev, stage: 1,
        stuck: {
          who: str(st.who, 160), cause: str(st.cause, 300),
          smallest: str(st.smallest, 200), why: str(st.why, 300),
        },
      },
      say,
    };
  }
  if (stage === 2) {
    const sp = j.split ?? {};
    return {
      plan: {
        ...prev, stage: 2,
        split: {
          // 見分けがつかなかったときは mixed 扱い。混ざっているまま先へ行かせないため
          kind: isGoalKind(sp.kind) && sp.kind ? sp.kind : "mixed",
          reason: str(sp.reason, 300),
          money: str(sp.money, 200), state: str(sp.state, 200),
        },
      },
      say,
    };
  }
  if (stage === 3) {
    const sh = j.shape ?? {};
    return {
      plan: {
        ...prev, stage: 3,
        shape: {
          metric: str(sh.metric, 80),
          value: Number.isFinite(Number(sh.value)) ? Number(sh.value) : null,
          unit: str(sh.unit, 20),
          due: day(sh.due) ?? goal.due ?? "",
          current: Number.isFinite(Number(sh.current)) ? Number(sh.current) : null,
          unknowns: arr(sh.unknowns).map((x: any) => str(x, 120)).filter(Boolean).slice(0, 3),
        },
      },
      say,
    };
  }
  if (stage === 4) {
    return {
      plan: {
        ...prev, stage: 4,
        routes: arr(j.routes).slice(0, 3).map((r: any, i: number) => ({
          key: str(r.key, 8) || String.fromCharCode(97 + i),
          name: str(r.name, 60), formula: str(r.formula, 160),
          note: str(r.note, 300), risk: str(r.risk, 200),
        })).filter((r) => r.name),
        assumptions: arr(j.assumptions).map((x: any) => str(x, 200)).filter(Boolean).slice(0, 8),
      },
      say,
    };
  }
  if (stage === 5) {
    return {
      plan: {
        ...prev, stage: 5,
        milestones: arr(j.milestones).slice(0, 24)
          .map((x: any) => ({ by: day(x.by) ?? "", target: str(x.target, 160), why: str(x.why, 240) }))
          .filter((x) => x.by && x.target),
      },
      say,
    };
  }
  if (stage === 6) {
    return {
      plan: {
        ...prev, stage: 6,
        gaps: arr(j.gaps).slice(0, 6)
          .map((x: any) => ({ point: str(x.point, 240), question: str(x.question, 200) }))
          .filter((x) => x.point),
      },
      say,
    };
  }
  return {
    plan: { ...prev, stage: LAST_STAGE },
    steps: arr(j.steps).slice(0, 60).map((x: any) => ({
      milestone: str(x.milestone, 120),
      title: str(x.title, 200),
      /*
       * 90分以上は「割り方が粗い」証拠なので、こちらで30に落とす。
       * プロンプトに「90以上は作らない」と書いても守られないことがあるため、
       * 受け取る側で必ず直す。
       */
      minutes: (() => {
        const n = Math.round(Number(x.minutes) || 30);
        return n >= 90 ? 30 : Math.max(5, Math.min(60, n));
      })(),
      due: day(x.due),
    })).filter((x) => x.title),
    say,
  };
}

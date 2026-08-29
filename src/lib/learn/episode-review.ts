import type { EpisodeFoundation } from "./episode-foundation";
import type { AdventureNode } from "./adventure";
import type { Episode, ExpStep, Part } from "./types";

export type EpisodeReviewIssue = {
  severity: "error" | "warning";
  lens: "beginner" | "learning" | "story" | "game" | "ethics" | "system";
  message: string;
};

export type EpisodeReview = { ok: boolean; issues: EpisodeReviewIssue[] };

function collectExperienceSteps(steps: ExpStep[]): ExpStep[] {
  return steps.flatMap((step) => {
    if (step.kind === "choice") return [
      step,
      ...step.options.flatMap((option) => collectExperienceSteps(option.then)),
      ...(step.detail?.then ? collectExperienceSteps(step.detail.then) : []),
    ];
    if (step.kind === "input" && step.skip) return [step, ...collectExperienceSteps(step.skip.then)];
    return [step];
  });
}

function storedDecisionKeys(episode: Episode): string[] {
  const experience = episode.parts.find((part): part is Extract<Part, { kind: "experience" }> => part.kind === "experience");
  const experienceKeys = experience
    ? collectExperienceSteps(experience.steps).flatMap((step) => step.kind === "choice" && step.storeAs ? [step.storeAs] : [])
    : [];
  const adventure = episode.parts.find((part): part is Extract<Part, { kind: "adventure" }> => part.kind === "adventure");
  const adventureKeys = adventure?.scenario.nodes.flatMap((node) => node.kind === "apply" ? [node.storeAs] : []) ?? [];
  return [...new Set([...experienceKeys, ...adventureKeys])];
}

/**
 * 固有の単語を強制する検査ではなく、学習者の変化と物語の因果が実装に存在するかを見る。
 * コピーの自然さ、漫画の連続性、実機の触り心地は別の通し監査で確認する。
 */
export function reviewEpisodeLearningFlow(episode: Episode, foundation: EpisodeFoundation): EpisodeReview {
  const issues: EpisodeReviewIssue[] = [];
  const push = (severity: EpisodeReviewIssue["severity"], lens: EpisodeReviewIssue["lens"], message: string) => issues.push({ severity, lens, message });
  const kinds = episode.parts.map((part) => part.kind);
  const required: Part["kind"][] = ["manga", "adventure", "classroom", "card", "outro"];
  required.forEach((kind) => {
    if (!kinds.includes(kind)) push("error", "system", `学習の因果を回収するため「${kind}」パートが必要です。`);
  });
  const causalOrder: Part["kind"][] = ["manga", "adventure", "classroom", "card", "outro"];
  const causalIndexes = causalOrder.map((kind) => kinds.indexOf(kind));
  if (causalIndexes.every((index) => index >= 0) && causalIndexes.some((index, position) => position > 0 && index < causalIndexes[position - 1])) {
    push("error", "story", "事件を体験し、自分で判断し、講義で整理し、原理を持ち帰る因果の順番を確認してください。");
  }

  if (!foundation.learner.problem.trim() || foundation.learner.livedExamples.some((item) => !item.trim())) {
    push("error", "learning", "学ぶ技術より先に、学習者が日常で困っている具体的な場面を定義してください。");
  }
  if (!foundation.learner.attentionTrap.trim() || !foundation.lesson.awayFrom.trim() || !foundation.lesson.turnToward.trim() || !foundation.lesson.nextAction.trim()) {
    push("error", "learning", "変化前、転換点、変化後、次の行動を一続きで定義してください。");
  }
  if (!foundation.teacher.experience.trim() || !foundation.teacher.belief.trim() || !foundation.teacher.decisionRule.trim()) {
    push("error", "story", "先生の台詞が人物の経験と信念から生まれるよう、人物前提を定義してください。");
  }
  if (!foundation.link.learnerState.trim() || !foundation.link.role.trim()) {
    push("error", "beginner", "リンクがどこで分からなくなり、何を読者の代わりに聞くかを定義してください。");
  }
  if (episode.no >= 6 && (!foundation.player.wound?.trim() || !foundation.player.reasonForEnrolling?.trim() || !foundation.player.worldToCreate?.trim())) {
    push("error", "story", "第6話以降は、主人公の痛み・催眠学校へ入った理由・作りたい世界を定義し、技法を学ぶ意味を人物の人生へつないでください。");
  }
  if (foundation.causalChain.length < 5 || foundation.causalChain.some((beat) => !beat.trim())) {
    push("error", "story", "前の出来事が次の台詞を生む因果の鎖を、少なくとも5段階で定義してください。");
  }
  if (!foundation.presentation.primaryQuestion.trim()) {
    push("error", "beginner", "この回で答える中心質問を、一文で定義してください。");
  } else if (episode.title !== foundation.presentation.primaryQuestion) {
    push("error", "beginner", "一覧、事件、講義で問いを増やさず、回のタイトルを制作前提の中心質問へ揃えてください。");
  }

  const manga = episode.parts[0]?.kind === "manga" ? episode.parts[0] : null;
  if (!manga?.briefing || !manga.schoolIntro) {
    push("error", "beginner", "漫画の前に、学習者の問題と事件の問いをそれぞれ一画面で見せてください。");
  } else {
    const introBeats = manga.schoolIntro.beats;
    if (introBeats.length < 4) push("error", "game", "冒頭は一括説明にせず、問い・具体例・発見・授業への招待を一台詞ずつ進めてください。");
    if (!introBeats[0]?.text.includes("？")) push("error", "story", "冒頭の最初の一拍は、学習者が自分事として答えられる問いにしてください。");
    if (!introBeats.some((beat) => beat.who === "link")) push("error", "beginner", "冒頭でリンクが初学者の驚きか疑問を口にしてください。");
    if (!introBeats.some((beat) => beat.text.includes("{{userName}}"))) push("error", "story", "冒頭の最後は、登録名でプレイヤーを授業へ招いてください。");
    if (!manga.briefing.hook.includes("？")) push("error", "story", "漫画へ入る前に、答えを知りたくなる問いを一つ置いてください。");
    const coverLength = [manga.briefing.eyebrow, manga.briefing.title, manga.briefing.principle, manga.briefing.hook, manga.briefing.teaser].join("").length;
    if (coverLength > 155) push("warning", "game", "冒頭タイトルの情報量が多めです。実画面で、問いより説明が先に立っていないか確認してください。");
    if (manga.frames.length < 2) push("warning", "story", "漫画だけで葛藤と転換を追えるか、ネームとして確認してください。");
  }

  const experience = episode.parts.find((part): part is Extract<Part, { kind: "experience" }> => part.kind === "experience");
  if (!experience) {
    push("error", "game", "漫画後に、学習者が自分の場面を選ぶ体験が必要です。");
  } else {
    const choices = collectExperienceSteps(experience.steps).filter((step): step is Extract<ExpStep, { kind: "choice" }> => step.kind === "choice");
    if (experience.gate) push("error", "game", "漫画後に工程一覧を重ねず、物語の一場面から選択へ渡してください。");
    const bridgeBeats = experience.bridge?.beats ?? (experience.bridge?.line ? [{ who: "teacher" as const, text: experience.bridge.line }] : []);
    if (bridgeBeats.length === 0) push("error", "story", "漫画から本人の問題へ移る理由を、人物の台詞でつないでください。");
    if (!bridgeBeats.some((beat) => beat.text.includes("？"))) push("error", "beginner", "漫画後の橋では、学習者が自分の経験を思い出せる具体的な問いを入れてください。");
    if (!bridgeBeats.some((beat) => beat.who === "link")) push("warning", "story", "漫画の事件と本人の問題を同一視していないか、リンクに疑問を言わせて確認してください。");
    if (!choices.some((choice) => choice.storeAs && choice.options.length >= 2)) push("error", "game", "学習者が自分に近い場面を選び、後半で使える形で保存してください。");
    if (!choices.some((choice) => choice.detail?.storeAs && choice.detail.storeAs === choice.storeAs)) push("error", "learning", "選択だけで終わらせず、学習者が自分の具体的な場面を文字か音声で補足できるようにしてください。");
    if (foundation.interaction.personalResponse === "choice-or-detail"
      && !choices.some((choice) => choice.completion === "option-or-detail" && choice.detail?.then?.length)) {
      push("error", "game", "本人の場面は、三択か自由記述のどちらか一方だけでも送信できるようにしてください。");
    }
  }

  const adventure = episode.parts.find((part): part is Extract<Part, { kind: "adventure" }> => part.kind === "adventure");
  const nodes: AdventureNode[] = adventure?.scenario.nodes ?? [];
  if (adventure) {
    if (adventure.scenario.title !== foundation.presentation.primaryQuestion) {
      push("error", "beginner", "事件画面の主見出しを、この回の中心質問へ揃えてください。");
    }
    if (foundation.presentation.secondaryQuestion.mode === "none" && adventure.scenario.question) {
      push("error", "beginner", "主見出しだけで意味が通る回に、別の副質問を足さないでください。");
    }
    if (foundation.presentation.secondaryQuestion.mode === "needed") {
      if (!foundation.presentation.secondaryQuestion.adds.trim()) push("error", "beginner", "副質問が補う前提を言語化してください。");
      if (adventure.scenario.question !== foundation.presentation.secondaryQuestion.text) push("error", "system", "必要と判断した副質問を事件画面へ反映してください。");
    }
  }
  if (!nodes.some((node) => node.kind === "investigate" || node.kind === "guided-investigation") || !nodes.some((node) => node.kind === "deduction") || !nodes.some((node) => node.kind === "apply")) {
    push("error", "game", "見る、考える、自分で使うの三つをプレイヤー操作として入れてください。");
  }
  if (!nodes.some((node) => node.kind === "recall")) {
    push("warning", "learning", "教材を見直す前に、学習者が自分の記憶を言葉にする場面がありません。");
  }
  const recallNodes = nodes.filter((node): node is Extract<AdventureNode, { kind: "recall" }> => node.kind === "recall");
  foundation.interaction.reflectionMoments.forEach((moment) => {
    if (moment === "application") return;
    if (!recallNodes.some((node) => node.purpose === moment)) {
      const label = moment === "memory" ? "証拠を見る前の記憶" : moment === "hypothesis" ? "証拠を見た後の仮説" : "目の前で起きた変化の理由";
      push("error", "game", `${label}を、プレイヤー自身の言葉でリンクへ返す場面が必要です。`);
    }
  });
  const firstRecall = recallNodes[0];
  if (firstRecall) {
    const hasFullExample = firstRecall.placeholder?.includes("例：") ?? false;
    if (foundation.presentation.recallScaffolding === "full-example" && !hasFullExample) push("warning", "learning", "第1話の答え方の支援として、記憶回答に具体例を一つ示してください。");
    if (foundation.presentation.recallScaffolding === "independent" && hasFullExample) push("error", "learning", "自力回答の回で、入力例に答えをそのまま書かないでください。");
  }
  const linkLines = nodes.filter((node) => node.kind === "dialogue" && node.line.who === "link");
  if (linkLines.length === 0) push("warning", "beginner", "初学者がつまずく地点を、リンクか別の演出で実際に表せているか確認してください。");
  const dynamicKeys = storedDecisionKeys(episode);
  const outro = episode.parts.find((part): part is Extract<Part, { kind: "outro" }> => part.kind === "outro");
  const outroText = JSON.stringify(outro);
  dynamicKeys.forEach((key) => {
    if (!outroText.includes(`{{${key}}}`)) push("error", "story", `プレイヤーが選んだ「${key}」を、終盤の会話で具体的に回収してください。`);
  });

  const classroom = episode.parts.find((part): part is Extract<Part, { kind: "classroom" }> => part.kind === "classroom");
  if (!classroom?.scenes.length) push("error", "learning", "体験後に、起きたことの因果を言葉で整理する講義が必要です。");
  classroom?.scenes.forEach((scene) => {
    if (scene.lines.length > 5) push("warning", "game", `講義SCENE ${scene.no}が5台詞を超えています。理解操作のない受動タップを減らしてください。`);
  });

  if (!foundation.evidenceBoundary.historical.trim() || !foundation.evidenceBoundary.teachingInterpretation.trim() || !foundation.evidenceBoundary.claimLimit.trim()) {
    push("error", "ethics", "史実、教材としての解釈、断定しない範囲を分けてください。");
  }

  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}

export function assertEpisodeLearningFlow(episode: Episode, foundation: EpisodeFoundation): EpisodeReview {
  const report = reviewEpisodeLearningFlow(episode, foundation);
  if (!report.ok) {
    throw new Error(`Episode failed learning-flow gate:\n${report.issues.filter((issue) => issue.severity === "error").map((issue) => `- [${issue.lens}] ${issue.message}`).join("\n")}`);
  }
  return report;
}

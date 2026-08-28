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
    if (step.kind === "choice") return [step, ...step.options.flatMap((option) => collectExperienceSteps(option.then))];
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
  if (foundation.causalChain.length < 5 || foundation.causalChain.some((beat) => !beat.trim())) {
    push("error", "story", "前の出来事が次の台詞を生む因果の鎖を、少なくとも5段階で定義してください。");
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
    if (!experience.bridge?.line.trim()) push("error", "story", "漫画から本人の問題へ移る理由を、人物の台詞でつないでください。");
    if (!choices.some((choice) => choice.storeAs && choice.options.length >= 2)) push("error", "game", "学習者が自分に近い場面を選び、後半で使える形で保存してください。");
    if (!choices.some((choice) => choice.detail?.storeAs && choice.detail.storeAs === choice.storeAs)) push("error", "learning", "選択だけで終わらせず、学習者が自分の具体的な場面を文字か音声で補足できるようにしてください。");
  }

  const adventure = episode.parts.find((part): part is Extract<Part, { kind: "adventure" }> => part.kind === "adventure");
  const nodes: AdventureNode[] = adventure?.scenario.nodes ?? [];
  if (!nodes.some((node) => node.kind === "investigate") || !nodes.some((node) => node.kind === "deduction") || !nodes.some((node) => node.kind === "apply")) {
    push("error", "game", "見る、考える、自分で使うの三つをプレイヤー操作として入れてください。");
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

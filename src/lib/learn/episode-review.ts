import type { Episode, ExpStep, Part } from "./types";

export type EpisodeReviewIssue = {
  severity: "error" | "warning";
  lens: "beginner" | "learning" | "story" | "game" | "ethics" | "system";
  message: string;
};

export type EpisodeReview = { ok: boolean; issues: EpisodeReviewIssue[] };

function collectExperienceSteps(steps: ExpStep[]): ExpStep[] {
  return steps.flatMap((step) => step.kind === "choice"
    ? [step, ...step.options.flatMap((option) => collectExperienceSteps(option.then))]
    : [step]);
}

/**
 * 新しい話を投入した時に必ず通す最低品質ゲート。
 * 個別画面の構造チェックであり、実機の通し監査は別に必要。
 */
export function reviewEpisodeLearningFlow(episode: Episode): EpisodeReview {
  const issues: EpisodeReviewIssue[] = [];
  const push = (severity: EpisodeReviewIssue["severity"], lens: EpisodeReviewIssue["lens"], message: string) => issues.push({ severity, lens, message });
  const kinds = episode.parts.map((part) => part.kind);
  const required: Part["kind"][] = ["manga", "experience", "adventure", "classroom", "qa", "card", "outro", "teaser"];

  if (required.some((kind, index) => kinds[index] !== kind)) {
    push("error", "system", `パート順は ${required.join(" → ")} にしてください。`);
  }

  const manga = episode.parts[0]?.kind === "manga" ? episode.parts[0] : null;
  if (!manga?.briefing) {
    push("error", "beginner", "漫画より前に、学習目標・物語の問い・到達成果を示すbriefingが必要です。");
  } else {
    if (!manga.briefing.plainDefinition.includes("Utilization")) push("error", "learning", "冒頭で平易な説明の後に主概念Utilizationの名前を示してください。");
    if (!manga.briefing.storyQuestion.includes("？")) push("error", "story", "漫画へ入る前に未解決の物語上の問いが必要です。");
    if (!manga.briefing.mentorMessage || !manga.briefing.personalBenefit) push("error", "beginner", "エリクソンから何を教わり、受講後に何を持ち帰るかを明記してください。");
  }

  const experience = episode.parts.find((part): part is Extract<Part, { kind: "experience" }> => part.kind === "experience");
  if (!experience) {
    push("error", "system", "自分の実例を作る体験パートが必要です。");
  } else {
    const allSteps = collectExperienceSteps(experience.steps);
    const inputIds = new Set(allSteps.flatMap((step) => step.kind === "input" || step.kind === "scale" ? [step.id] : []));
    for (const id of ["theme", "exception", "exceptionScore", "clue"]) {
      if (!inputIds.has(id)) push("error", "learning", `${id}を本人が入力する工程がありません。`);
    }
    const firstInput = experience.steps.findIndex((step) => step.kind === "input");
    if (firstInput > 3) push("error", "game", "最初の入力までに説明台詞が4回以上続いています。入口の説明と重複させないでください。");
    if (!allSteps.some((step) => step.kind === "choice" && step.storeAs === "clueCategory")) {
      push("error", "learning", "差のカテゴリを選び、その後clueを具体語で入力する二段階が必要です。");
    }
  }

  const classroom = episode.parts.find((part): part is Extract<Part, { kind: "classroom" }> => part.kind === "classroom");
  const renderedText = JSON.stringify({ experience, classroom, card: episode.parts.find((part) => part.kind === "card") });
  for (const banned of ["自己催眠", "間接暗示", "イメージなら身体が治る"]) {
    if (renderedText.includes(banned)) push("error", "learning", `第1話の中心概念をぼかす「${banned}」が残っています。`);
  }
  classroom?.scenes.forEach((scene) => {
    if (scene.lines.length > 5) push("warning", "game", `講義SCENE ${scene.no}が5台詞を超えています。理解操作のない受動タップを減らしてください。`);
  });

  if (!episode.goal.takeaway.includes("本人") || !episode.goal.takeaway.includes("役立てる")) {
    push("error", "ethics", "中心命題には、本人にすでにあるものを本人の望む変化へ役立てる、と明記してください。");
  }

  const teaser = episode.parts.find((part): part is Extract<Part, { kind: "teaser" }> => part.kind === "teaser");
  const teaserText = JSON.stringify(teaser);
  if (/かかってしまった|都合がよかった/.test(teaserText) || !/尊重|壊さず/.test(teaserText)) {
    push("error", "ethics", "次回予告が拒否を無視して催眠へかける印象です。拒否の尊重を明記してください。");
  }

  return { ok: !issues.some((issue) => issue.severity === "error"), issues };
}

export function assertEpisodeLearningFlow(episode: Episode): EpisodeReview {
  const report = reviewEpisodeLearningFlow(episode);
  if (!report.ok) {
    throw new Error(`Episode failed learning-flow gate:\n${report.issues.filter((issue) => issue.severity === "error").map((issue) => `- [${issue.lens}] ${issue.message}`).join("\n")}`);
  }
  return report;
}

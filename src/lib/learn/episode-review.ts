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
    push("error", "beginner", "漫画より前に、作品名と未解決の問いだけを見せるタイトル画面が必要です。");
  } else {
    if (!manga.briefing.title.includes("催眠") || !manga.briefing.principle.toUpperCase().includes("UTILIZATION")) {
      push("error", "learning", "タイトル画面だけで、催眠の何を扱う回か分かる作品名にしてください。");
    }
    if (!manga.briefing.hook.includes("？")) push("error", "story", "漫画へ入る前に未解決の問いを一つだけ置いてください。");
    const coverLength = [manga.briefing.eyebrow, manga.briefing.title, manga.briefing.principle, manga.briefing.hook, manga.briefing.teaser].join("").length;
    if (coverLength > 125) push("error", "game", "冒頭タイトルの情報量が多すぎます。定義・手順・成果は体験後へ移してください。");
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
    if (firstInput !== 0 || experience.steps[0]?.kind !== "input" || experience.steps[0].id !== "theme") {
      push("error", "story", "漫画の直後は工程説明を挟まず、『今、困っていることは何ですか？』から始めてください。");
    }
    if (experience.gate) push("error", "game", "漫画直後の体験入口は重複説明になるため、工程一覧のgateを置かないでください。");
    if (!experience.bridge) {
      push("error", "story", "漫画から本人への質問へ直結させず、世界観の中でエリクソンが話を渡す一場面を挟んでください。");
    } else {
      if (!experience.bridge.line.includes("あなた")) push("error", "story", "橋渡しの台詞は、エリクソンがプレイヤー本人へ話を向ける内容にしてください。");
      if (experience.bridge.narration.length + experience.bridge.line.length > 95) push("error", "game", "橋渡し場面は説明ページにせず、ナレーションと一台詞だけにしてください。");
    }
    const experienceText = JSON.stringify(experience.steps);
    if (/漫画の答え|それを消せるとは/.test(experienceText)) push("error", "story", "作者都合のメタ発言や、誰も求めていない否定から会話を始めないでください。");
    if (!experienceText.includes("催眠")) push("error", "learning", "本人の回答を受けた直後に、今回扱う催眠との関係を会話として示してください。");
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

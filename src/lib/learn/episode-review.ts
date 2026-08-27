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
    push("error", "beginner", "漫画より前に、作品名・未解決の問い・この回で得るものを一画面で見せてください。");
  } else {
    if (![manga.briefing.eyebrow, manga.briefing.title, manga.briefing.hook].join("").includes("催眠")) {
      push("error", "learning", "タイトル画面だけで、催眠を学ぶ回だと分かるようにしてください。");
    }
    if (!manga.briefing.hook.includes("？")) push("error", "story", "漫画へ入る前に未解決の問いを一つだけ置いてください。");
    const coverLength = [manga.briefing.eyebrow, manga.briefing.title, manga.briefing.principle, manga.briefing.hook, manga.briefing.teaser].join("").length;
    if (coverLength > 155) push("error", "game", "冒頭タイトルの情報量が多すぎます。定義や工程一覧は体験後へ移してください。");
  }

  const experience = episode.parts.find((part): part is Extract<Part, { kind: "experience" }> => part.kind === "experience");
  if (!experience) {
    push("error", "system", "説明を聞くだけでなく、本人が選ぶ催眠体験パートが必要です。");
  } else {
    const allSteps = collectExperienceSteps(experience.steps);
    if (experience.gate) push("error", "game", "漫画直後の体験入口は重複説明になるため、工程一覧のgateを置かないでください。");
    if (!experience.bridge) {
      push("error", "story", "漫画から催眠体験へ直結させず、書斎の掛け合いへ戻る一場面を挟んでください。");
    } else {
      if (experience.bridge.narration.length + experience.bridge.line.length > 110) push("error", "game", "橋渡し場面は説明ページにせず、ナレーションと一台詞だけにしてください。");
    }
    const experienceText = JSON.stringify(experience.steps);
    if (/困難.{0,12}100|100ではない瞬間|差の条件/.test(experienceText)) {
      push("error", "learning", "催眠と関係の薄い『困難を100と置く』共通ワークを、第1話へ戻さないでください。");
    }
    if (!experienceText.includes("催眠の入口") || !experienceText.includes("海辺にいるところをイメージ") || !experienceText.includes("そこで催眠が止まりました")) {
      push("error", "learning", "誰が何を頼まれ、何ができずに催眠が止まったのかを、具体的な出来事として明示してください。");
    }
    const channelChoice = allSteps.find((step): step is Extract<ExpStep, { kind: "choice" }> => step.kind === "choice" && step.storeAs === "channel");
    if (!channelChoice || channelChoice.options.length < 4) {
      push("error", "game", "言葉・身体感覚・実際に見えるもの・同じイメージの反復、の選択で相手の返事と次の催眠が変わる必要があります。");
    }
    const firstJudgmentChoice = allSteps.find((step): step is Extract<ExpStep, { kind: "choice" }> => step.kind === "choice" && step.storeAs === "firstJudgment");
    if (!firstJudgmentChoice || firstJudgmentChoice.options.length < 3) {
      push("error", "story", "先生の正解を見る前に、主人公が最初の判断をして物語を動かす選択が必要です。");
    }
  }

  const outro = episode.parts.find((part): part is Extract<Part, { kind: "outro" }> => part.kind === "outro");
  const outroText = JSON.stringify(outro);
  if (!outroText.includes("{{firstJudgment}}") || !outroText.includes("{{channel}}")) {
    push("error", "story", "主人公の二つの判断を、登場人物が終盤で具体的に覚えている会話が必要です。");
  }
  if (!outroText.includes("あなたが最初の一言") || !JSON.stringify(episode.parts).includes("見習い")) {
    push("error", "game", "一話の終わりで主人公の立場を変え、次の事件で担う役目を明示してください。");
  }

  const classroom = episode.parts.find((part): part is Extract<Part, { kind: "classroom" }> => part.kind === "classroom");
  const renderedText = JSON.stringify({ experience, classroom, card: episode.parts.find((part) => part.kind === "card") });
  for (const banned of ["自己催眠", "間接暗示", "イメージなら身体が治る"]) {
    if (renderedText.includes(banned)) push("error", "learning", `第1話の中心概念をぼかす「${banned}」が残っています。`);
  }
  classroom?.scenes.forEach((scene) => {
    if (scene.lines.length > 5) push("warning", "game", `講義SCENE ${scene.no}が5台詞を超えています。理解操作のない受動タップを減らしてください。`);
  });

  if (!episode.goal.takeaway.includes("催眠") || !episode.goal.takeaway.includes("本人") || !episode.goal.takeaway.includes("暗示")) {
    push("error", "ethics", "中心命題には、催眠で本人が使えるやり方から次の暗示を作る、と明記してください。");
  }

  const teaser = episode.parts.find((part): part is Extract<Part, { kind: "teaser" }> => part.kind === "teaser");
  const teaserText = JSON.stringify(teaser);
  if (/かかってしまった|都合がよかった/.test(teaserText) || !/尊重|壊さず|やめさせず|断る/.test(teaserText)) {
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

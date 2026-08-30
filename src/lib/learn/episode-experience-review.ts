import type { AdventureNode } from "./adventure";
import type { Episode, Part } from "./types";

export type ExperienceReviewRole = "designer" | "gameCreator" | "writer" | "director" | "beginner";

export type ExperienceReviewIssue = {
  severity: "error" | "warning";
  role: ExperienceReviewRole;
  message: string;
};

export type ExperienceReviewReport = {
  ok: boolean;
  issues: ExperienceReviewIssue[];
  metrics: {
    mangaPages: number;
    openingBeats: number;
    interactions: number;
    freeResponses: number;
    deductions: number;
    linkLines: number;
    lectureScenes: number;
  };
};

/**
 * 実装後の見た目確認を置き換える検査ではない。
 * 制作前提が抜けたエピソードを、画面へ載せる前に止める五役の品質ゲート。
 */
export function reviewEpisodeExperience(episode: Episode): ExperienceReviewReport {
  const issues: ExperienceReviewIssue[] = [];
  const push = (severity: ExperienceReviewIssue["severity"], role: ExperienceReviewRole, message: string) => {
    issues.push({ severity, role, message });
  };
  const manga = episode.parts.find((part): part is Extract<Part, { kind: "manga" }> => part.kind === "manga");
  const experience = episode.parts.find((part): part is Extract<Part, { kind: "experience" }> => part.kind === "experience");
  const adventure = episode.parts.find((part): part is Extract<Part, { kind: "adventure" }> => part.kind === "adventure");
  const classroom = episode.parts.find((part): part is Extract<Part, { kind: "classroom" }> => part.kind === "classroom");
  const card = episode.parts.find((part): part is Extract<Part, { kind: "card" }> => part.kind === "card");
  const outro = episode.parts.find((part): part is Extract<Part, { kind: "outro" }> => part.kind === "outro");
  const teaser = episode.parts.find((part): part is Extract<Part, { kind: "teaser" }> => part.kind === "teaser");
  const nodes: AdventureNode[] = adventure?.scenario.nodes ?? [];
  const interactions = nodes.filter((node) => ["recall", "guided-investigation", "deduction", "apply"].includes(node.kind));
  const freeResponses = nodes.filter((node) => node.kind === "recall" || (node.kind === "apply" && Boolean(node.freeAnswer)));
  const deductions = nodes.filter((node) => node.kind === "deduction");
  const dialogue = nodes.filter((node): node is Extract<AdventureNode, { kind: "dialogue" }> => node.kind === "dialogue");
  const linkLines = dialogue.filter((node) => node.line.who === "link");

  // デザイナー：一画面一目的に必要な、画面単位の情報分割を検査する。
  if (!manga?.schoolIntro || !manga.briefing) push("error", "designer", "冒頭の会話と事件サムネイルを別画面として定義してください。");
  if ((manga?.schoolIntro?.beats.length ?? 0) > 8) push("error", "designer", "冒頭会話が長すぎます。一画面一台詞のまま8拍以内にしてください。");
  manga?.schoolIntro?.beats.forEach((beat, index) => {
    if (beat.text.length > 82) push("warning", "designer", `冒頭${index + 1}拍目が長めです。スマホ実機で3〜4行に収まるか確認してください。`);
  });
  if (!classroom?.intro.title || !classroom.intro.lead) push("error", "designer", "講義へ入る前に、この講義で整理する一つの問いを表示してください。");
  if (classroom) {
    const visibleIntro = `${classroom.intro.title}${classroom.intro.lead}`;
    const basis = classroom.intro.basis;
    if (![basis.subjectAnchor, basis.eventAnchor, basis.learningGoal].every((value) => value.trim())) {
      push("error", "writer", "講義導入には、誰の話か・直前に何が起きたか・何を学ぶかを定義してください。");
    }
    if (!visibleIntro.includes(basis.subjectAnchor)) {
      push("error", "beginner", `講義導入の画面に主語「${basis.subjectAnchor}」が表示されていません。前画面を覚えている前提で省略しないでください。`);
    }
    if (!visibleIntro.includes(basis.eventAnchor)) {
      push("error", "beginner", `講義導入の画面に直前の出来事「${basis.eventAnchor}」が表示されていません。何の続きかを同じ画面で復元してください。`);
    }
  }
  classroom?.scenes.forEach((scene) => {
    if (scene.lines.length > 5) push("error", "designer", `講義SCENE ${scene.no}は5台詞以内に分割してください。`);
  });

  // ゲームクリエイター：見るだけでなく、思い出す・調べる・推理する・使うをプレイヤー操作にする。
  if (interactions.length < 6) push("error", "gameCreator", "プレイヤー操作が少なすぎます。記憶・調査・推理・実演・応用を操作にしてください。");
  if (!nodes.some((node) => node.kind === "guided-investigation")) push("error", "gameCreator", "証拠を順番に開き、各段階で考える調査が必要です。");
  if (deductions.length < 2) push("error", "gameCreator", "事件の答えと、体験の意味を別々に推理させてください。");
  if (!nodes.some((node) => node.kind === "apply" && node.freeAnswer)) push("error", "gameCreator", "最後は三択だけでなく、プレイヤー自身の一言も作れるようにしてください。");
  nodes.forEach((node) => {
    if (node.kind !== "deduction" && node.kind !== "apply") return;
    node.options.filter((option) => !option.correct).forEach((option) => {
      if (option.feedback.length < 16) push("error", "gameCreator", `${node.id}: 不正解の理由と、次に見る場所を具体的に返してください。`);
    });
  });

  // 作家：人物の欲求から台詞が生まれ、漫画から本人の問題へ橋が架かるかを見る。
  const introSpeakers = manga?.schoolIntro?.beats.map((beat) => beat.who) ?? [];
  if (!introSpeakers.includes("teacher") || !introSpeakers.includes("link")) push("error", "writer", "冒頭からエリクソンとリンクを掛け合わせてください。");
  const bridgeSpeakers = experience?.bridge?.beats?.map((beat) => beat.who) ?? [];
  if (!bridgeSpeakers.includes("teacher") || !bridgeSpeakers.includes("link")) push("error", "writer", "漫画後の橋渡しは、先生の説明だけでなくリンクの疑問を挟んでください。");
  if (!experience?.bridge?.beats?.some((beat) => beat.text.includes("？"))) push("error", "writer", "漫画の事件を、プレイヤー自身の場面へ渡す具体的な問いが必要です。");
  if (linkLines.length < 4) push("error", "writer", "リンクが単なる相槌ではなく、初学者の疑問と感情を担う台詞を増やしてください。");
  if (!outro?.lines.some((line) => line.who === "link" && line.text.includes("？"))) push("error", "writer", "終幕はリンクの次の疑問から、次話の事件を発生させてください。");

  // 演出家：問い、意外な答え、実演、発見、余韻、次の謎という感情の波を検査する。
  const tones = manga?.schoolIntro?.beats.map((beat) => beat.tone) ?? [];
  for (const required of ["question", "reveal", "address"] as const) {
    if (!tones.includes(required)) push("error", "director", `冒頭に${required}の演出拍がありません。`);
  }
  const applyIndex = nodes.findIndex((node) => node.kind === "apply");
  const reflectionIndex = nodes.findIndex((node) => node.kind === "recall" && node.purpose === "reflection");
  if (applyIndex < 0 || reflectionIndex < applyIndex) push("error", "director", "プレイヤーの一手、相手の変化、その理由を考える順で見せてください。");
  if (!teaser?.preview?.first.text || !teaser.preview.teacher || !teaser.next.title) push("error", "director", "次話予告は、リンクの困りごとと先生の意外な一言を会話として見せてください。");

  // 初学者：前の文脈を忘れても、誰が・いつ・何を答えるかを画面内で復元できるようにする。
  if (!episode.title.includes("？")) push("error", "beginner", "この回で答える問いを、タイトルだけで分かる疑問文にしてください。");
  nodes.forEach((node) => {
    if (node.kind !== "deduction" && node.kind !== "apply") return;
    const basis = node.questionBasis;
    if (![basis.subject, basis.before, basis.asks, basis.goal].every((value) => value.trim())) {
      push("error", "beginner", `${node.id}: 誰が・いつ・何を考える問いかを定義してください。`);
    }
  });
  if (!card?.card.reading) push("error", "beginner", "英語の原理名には日本語の読み方を付けてください。");
  if (!card?.card.summary || !card.card.effect || !card.card.useWhen.length || !card.card.howTo.length) {
    push("error", "beginner", "獲得カードは、意味・効能・使う時・手順を後から一画面で確認できるようにしてください。");
  }

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    metrics: {
      mangaPages: manga?.frames.length ?? 0,
      openingBeats: manga?.schoolIntro?.beats.length ?? 0,
      interactions: interactions.length,
      freeResponses: freeResponses.length,
      deductions: deductions.length,
      linkLines: linkLines.length,
      lectureScenes: classroom?.scenes.length ?? 0,
    },
  };
}

export function assertEpisodeExperience(episode: Episode): ExperienceReviewReport {
  const report = reviewEpisodeExperience(episode);
  if (!report.ok) {
    const errors = report.issues
      .filter((issue) => issue.severity === "error")
      .map((issue) => `- [${issue.role}] ${issue.message}`)
      .join("\n");
    throw new Error(`Episode failed five-role experience gate:\n${errors}`);
  }
  return report;
}

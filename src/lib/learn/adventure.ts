import { z } from "zod";

const faceSchema = z.enum(["neutral", "smile", "think", "aha", "laugh", "shy"]);
const cameraSchema = z.enum(["wide", "teacher", "link", "evidence"]);

const lineSchema = z.object({
  id: z.string().min(1),
  who: z.enum(["teacher", "link"]),
  text: z.string().min(1),
  pause: z.number().optional(),
  face: faceSchema.optional(),
  react: faceSchema.optional(),
  note: z.string().optional(),
  dynamic: z.boolean().optional(),
});

const evidenceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  detail: z.string().min(1),
  icon: z.string().min(1),
});

const dialogueNodeSchema = z.object({
  kind: z.literal("dialogue"),
  id: z.string().min(1),
  scene: z.string().min(1),
  line: lineSchema,
  camera: cameraSchema.optional(),
  nextLabel: z.string().optional(),
});

const investigateNodeSchema = z.object({
  kind: z.literal("investigate"),
  id: z.string().min(1),
  scene: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  spots: z.array(z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    x: z.number().min(4).max(96),
    y: z.number().min(8).max(82),
    evidenceId: z.string().min(1),
    linkComment: z.string().min(1),
  })).min(3),
});

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  correct: z.boolean(),
  feedback: z.string().min(1),
});

const deductionNodeSchema = z.object({
  kind: z.literal("deduction"),
  id: z.string().min(1),
  scene: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  hint: z.string().optional(),
  options: z.array(optionSchema).min(3),
});

const applyNodeSchema = z.object({
  kind: z.literal("apply"),
  id: z.string().min(1),
  scene: z.string().min(1),
  title: z.string().min(1),
  prompt: z.string().min(1),
  storeAs: z.string().min(1),
  options: z.array(optionSchema.extend({ value: z.string().min(1) })).min(3),
});

const revealNodeSchema = z.object({
  kind: z.literal("reveal"),
  id: z.string().min(1),
  scene: z.string().min(1),
  kicker: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
  evidenceIds: z.array(z.string()).optional(),
  nextLabel: z.string().optional(),
});

const nodeSchema = z.discriminatedUnion("kind", [
  dialogueNodeSchema,
  investigateNodeSchema,
  deductionNodeSchema,
  applyNodeSchema,
  revealNodeSchema,
]);

export const adventureScenarioSchema = z.object({
  id: z.string().min(1),
  caseNo: z.string().min(1),
  title: z.string().min(1),
  question: z.string().min(1),
  objective: z.string().min(1),
  background: z.string().min(1),
  teacherSprite: z.string().min(1),
  linkSprite: z.string().min(1),
  evidence: z.array(evidenceSchema).min(3),
  nodes: z.array(nodeSchema).min(8),
});

export type AdventureScenario = z.infer<typeof adventureScenarioSchema>;
export type AdventureNode = AdventureScenario["nodes"][number];
export type AdventureEvidence = AdventureScenario["evidence"][number];

export type QualityIssue = {
  severity: "error" | "warning";
  lens: "beginner" | "game" | "story" | "system";
  message: string;
};

export type QualityReport = {
  ok: boolean;
  issues: QualityIssue[];
  metrics: {
    dialogue: number;
    linkLines: number;
    teacherLines: number;
    interactions: number;
    evidence: number;
    dynamicUses: number;
  };
};

/**
 * シナリオ投入時の三者審査。
 * 初見ユーザー・ゲーム制作者・作家のどれか一つでも致命的に弱ければ失敗させる。
 */
export function reviewAdventureScenario(input: unknown): QualityReport {
  const parsed = adventureScenarioSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({ severity: "error", lens: "system", message: `${issue.path.join(".")}: ${issue.message}` })),
      metrics: { dialogue: 0, linkLines: 0, teacherLines: 0, interactions: 0, evidence: 0, dynamicUses: 0 },
    };
  }

  const scenario = parsed.data;
  const issues: QualityIssue[] = [];
  const dialogues = scenario.nodes.filter((n): n is Extract<AdventureNode, { kind: "dialogue" }> => n.kind === "dialogue");
  const linkLines = dialogues.filter((n) => n.line.who === "link");
  const teacherLines = dialogues.filter((n) => n.line.who === "teacher");
  const interactions = scenario.nodes.filter((n) => n.kind === "investigate" || n.kind === "deduction" || n.kind === "apply");
  const allText = JSON.stringify(scenario);
  const dynamicUses = (allText.match(/\{\{(?:theme|exception|exceptionScore|clue|resource)\}\}/g) ?? []).length;

  const push = (severity: QualityIssue["severity"], lens: QualityIssue["lens"], message: string) => issues.push({ severity, lens, message });

  if (scenario.question.length > 42) push("warning", "beginner", "冒頭の事件質問が長すぎます。初見で一息に読める長さにしてください。");
  if (interactions.length < 3) push("error", "game", "探索・推理・自己適用の三種類の操作が必要です。");
  if (!scenario.nodes.some((n) => n.kind === "investigate")) push("error", "game", "調べる対象がなく、プレイヤーが受け身です。");
  if (!scenario.nodes.some((n) => n.kind === "deduction")) push("error", "game", "証拠から結論を選ぶ推理がありません。");
  if (!scenario.nodes.some((n) => n.kind === "apply")) push("error", "beginner", "学びを自分のテーマへ適用する操作がありません。");
  if (!scenario.nodes.some((n) => n.kind === "reveal")) push("error", "story", "発見を回収するリビールがありません。");
  if (linkLines.length < 4) push("error", "story", "清瀬リンクの発言が少なく、掛け合いになっていません。");
  if (teacherLines.length < 4) push("error", "story", "エリクソンの返答が少なく、対話として成立しません。");
  if (dynamicUses < 7 || !allText.includes("{{theme}}") || !allText.includes("{{exception}}") || !allText.includes("{{exceptionScore}}") || !allText.includes("{{clue}}")) {
    push("error", "beginner", "本人の困難、100ではなかった瞬間、その点数、差を作った条件が後半へ十分反映されていません。");
  }

  dialogues.forEach((node) => {
    if (node.line.text.length > 92) push("error", "beginner", `${node.id}: 一つの台詞が長すぎます。説明を分けてください。`);
  });

  let consecutiveDialogue = 0;
  scenario.nodes.forEach((node) => {
    consecutiveDialogue = node.kind === "dialogue" ? consecutiveDialogue + 1 : 0;
    if (consecutiveDialogue > 4) push("error", "game", `${node.id}: 5台詞以上操作がなく、読むだけの時間が続きます。`);
    if (node.kind === "deduction" || node.kind === "apply") {
      const correct = node.options.filter((o) => o.correct);
      if (correct.length !== 1) push("error", "system", `${node.id}: 正解は必ず一つにしてください。`);
      if (node.options.some((o) => !o.feedback.trim())) push("error", "game", `${node.id}: 全選択肢に即時フィードバックが必要です。`);
    }
  });

  const evidenceIds = new Set(scenario.evidence.map((e) => e.id));
  if (evidenceIds.size !== scenario.evidence.length) push("error", "system", "証拠IDが重複しています。");
  scenario.nodes.forEach((node) => {
    if (node.kind === "investigate") node.spots.forEach((spot) => {
      if (!evidenceIds.has(spot.evidenceId)) push("error", "system", `${spot.id}: 存在しない証拠を参照しています。`);
    });
    if (node.kind === "reveal") node.evidenceIds?.forEach((id) => {
      if (!evidenceIds.has(id)) push("error", "system", `${node.id}: 存在しない証拠をリビールに使用しています。`);
    });
  });

  const nodeIds = scenario.nodes.map((n) => n.id);
  if (new Set(nodeIds).size !== nodeIds.length) push("error", "system", "ノードIDが重複しています。");

  return {
    ok: !issues.some((issue) => issue.severity === "error"),
    issues,
    metrics: {
      dialogue: dialogues.length,
      linkLines: linkLines.length,
      teacherLines: teacherLines.length,
      interactions: interactions.length,
      evidence: scenario.evidence.length,
      dynamicUses,
    },
  };
}

export function defineAdventureScenario(input: unknown): AdventureScenario {
  const parsed = adventureScenarioSchema.parse(input);
  const report = reviewAdventureScenario(parsed);
  if (!report.ok) {
    throw new Error(`Adventure scenario failed quality gate:\n${report.issues.filter((i) => i.severity === "error").map((i) => `- [${i.lens}] ${i.message}`).join("\n")}`);
  }
  return parsed;
}

export function interpolateAdventureText(text: string, values: Record<string, string>): string {
  const fallback: Record<string, string> = {
    theme: "今変えたいこと",
    exception: "100ではなかった瞬間",
    exceptionScore: "100未満",
    clue: "その瞬間にあった違い",
    resource: "100との差を作った条件を一つ再現する",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key]?.trim() || fallback[key] || key);
}

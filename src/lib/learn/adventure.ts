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
  image: z.string().min(1).optional(),
  imageAlt: z.string().min(1).optional(),
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
  question: z.string().min(1).optional(),
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
 * シナリオ投入時の最低品質審査。
 * 催眠の具体的な事件・プレイヤー操作・掛け合いが欠ければ失敗させる。
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
  const dynamicUses = (allText.match(/\{\{\w+\}\}/g) ?? []).length;

  const push = (severity: QualityIssue["severity"], lens: QualityIssue["lens"], message: string) => issues.push({ severity, lens, message });

  if (scenario.question && scenario.question.length > 42) push("warning", "beginner", "冒頭の事件質問が長すぎます。初見で一息に読める長さにしてください。");
  if (interactions.length === 0) push("error", "game", "プレイヤーが物語へ働きかける判断を一つ以上入れてください。");
  if (!scenario.nodes.some((n) => n.kind === "investigate")) push("warning", "game", "調べる操作がありません。この話で本当に不要か、物語上の理由を確認してください。");
  if (!scenario.nodes.some((n) => n.kind === "deduction")) push("warning", "game", "証拠から自分で結論を選ぶ場面がありません。この話で本当に不要か確認してください。");
  if (!scenario.nodes.some((n) => n.kind === "apply")) push("warning", "game", "学びを自分や目の前の相手へ使う判断がありません。この話で本当に不要か確認してください。");
  if (!scenario.nodes.some((n) => n.kind === "reveal")) push("error", "story", "発見を回収するリビールがありません。");
  if (linkLines.length === 0) push("warning", "story", "初学者の疑問を受け持つ登場人物がいません。この話で別の表現方法があるか確認してください。");
  if (teacherLines.length === 0) push("warning", "story", "先生の判断が会話として現れていません。この話で別の表現方法があるか確認してください。");

  dialogues.forEach((node) => {
    if (node.line.text.length > 92) push("warning", "beginner", `${node.id}: 一つの台詞が長めです。画面で読んだ時に意味の切れ目が一つか確認してください。`);
  });

  let consecutiveDialogue = 0;
  scenario.nodes.forEach((node, nodeIndex) => {
    consecutiveDialogue = node.kind === "dialogue" ? consecutiveDialogue + 1 : 0;
    if (consecutiveDialogue > 4) push("warning", "game", `${node.id}: 会話が続いています。ここで操作を入れるより、会話として続ける方が面白いか通しで確認してください。`);
    if (node.kind === "deduction" || node.kind === "apply") {
      const correct = node.options.filter((o) => o.correct);
      if (correct.length !== 1) push("error", "system", `${node.id}: 正解は必ず一つにしてください。`);
      if (node.options.some((o) => !o.feedback.trim())) push("error", "game", `${node.id}: 全選択肢に即時フィードバックが必要です。`);

      if (node.kind === "deduction" && correct.length === 1) {
        const normalize = (text: string) => text.replace(/[\s『』「」、。？?！!・→]/g, "");
        const answer = normalize(correct[0].label);
        const previousDialogue = scenario.nodes.slice(Math.max(0, nodeIndex - 2), nodeIndex)
          .filter((previous): previous is Extract<AdventureNode, { kind: "dialogue" }> => previous.kind === "dialogue")
          .map((previous) => normalize(previous.line.text));
        const leaked = answer.length >= 14 && Array.from({ length: answer.length - 13 }, (_, index) => answer.slice(index, index + 14))
          .some((fragment) => previousDialogue.some((line) => line.includes(fragment)));
        if (leaked) push("error", "game", `${node.id}: 推理の直前に正解を台詞で説明しています。仮説や問いで止め、判断はプレイヤーへ渡してください。`);
      }

    }
  });

  const evidenceIds = new Set(scenario.evidence.map((e) => e.id));
  if (evidenceIds.size !== scenario.evidence.length) push("error", "system", "証拠IDが重複しています。");
  if (scenario.evidence.some((e) => !e.image || !e.imageAlt)) {
    push("error", "game", "各証拠には、元の漫画場面と状況が分かる代替文を付けてください。文字だけの証拠は禁止です。");
  }
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
    userName: "あなた",
    theme: "この回の催眠",
    exception: "イメージできない相手へ、別の感覚から催眠を始めた場面",
    exceptionScore: "採点しない",
    clue: "できない方向から目を外した後に、本人が今分かる感覚",
    resource: "できない方向を頑張るのをやめ、今できる方向から次の暗示を作る",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key]?.trim() || fallback[key] || key);
}

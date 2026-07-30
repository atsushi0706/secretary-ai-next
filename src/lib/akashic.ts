/**
 * アカシック（人生の10年周期）の段階解放。
 *
 * 設計（淳くんの結論・2026-07）：
 * - 過去と「今の10年」は最初から見えている（過去は隠す意味がない）。
 * - 未来の10年は最初は見えない。使い始めからの"時間"が経つほど、外側へ少しずつ開く。
 *   ・今の次の10年 ＝ 使い始めから【1ヶ月後】に解放
 *   ・その先の10年 ＝ 使い始めから【3ヶ月後】に解放
 *   ・さらに先はもっと先に。
 * - 一度開いたら戻さない。画面には「あと約◯ヶ月で開く」を明記。
 * - マスター（淳くん）は全部見える。制御は MASTER_EMAILS で行う。
 *
 * offset = その10年が「今の10年」から何個ずれているか。過去= 負、今=0、未来= 正。
 */

/** 未来へ n 個先の10年を開くのに必要な「使い始めからの経過日数」。future=1 が一番近い未来（1ヶ月）。 */
export const UNLOCK_ELAPSED_DAYS = [0, 30, 90, 180, 365, 550, 730, 1095, 1460];

export function needDaysForFuture(future: number): number {
  const i = Math.max(0, Math.min(future, UNLOCK_ELAPSED_DAYS.length - 1));
  return UNLOCK_ELAPSED_DAYS[i];
}

export type DecadeUnlock = { unlocked: boolean; need: number; remaining: number };

/** その10年が今、開いているか。過去・今・マスターは常に開放。未来だけ「使い始めからの経過時間」でゲート。 */
export function decadeUnlock(offset: number, elapsedDays: number, master = false): DecadeUnlock {
  if (master || offset <= 0) return { unlocked: true, need: 0, remaining: 0 };
  const need = needDaysForFuture(offset);
  return { unlocked: elapsedDays >= need, need, remaining: Math.max(0, need - elapsedDays) };
}

/** 残り日数を、やさしい言葉に（あと約◯ヶ月／あと◯日）。 */
export function remainingLabel(days: number): string {
  if (days <= 0) return "まもなく";
  if (days >= 30) return `あと約${Math.round(days / 30)}ヶ月`;
  if (days >= 7) return `あと約${Math.round(days / 7)}週間`;
  return `あと${days}日`;
}

/** マスター判定。MASTER_EMAILS（カンマ区切り）に一致すれば全開放。 */
export function isMaster(email: string | null | undefined): boolean {
  const list = (process.env.MASTER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

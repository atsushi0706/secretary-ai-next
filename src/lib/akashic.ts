/**
 * アカシック（人生の10年周期）の段階解放。
 *
 * 設計（淳くんの結論）：
 * - 過去と「今の10年」は最初から見えている（過去は隠す意味がない）。
 * - これから（未来の10年）＝大局は、取り組み日数が増えるほど外側へ少しずつ開く。
 * - 一度開いたら戻さない（＝連続ストリークではなく累計日数で判定）。
 * - 画面には「あと◯日で解放」を明記する。
 * - マスター（淳くん）は全部見える。制御は MASTER_EMAILS で行う。
 *
 * offset = その10年が「今の10年」から何個ずれているか。過去= 負、今=0、未来= 正。
 */

/** 未来へ n 個先の10年を開くのに必要な「取り組み日数」。future=1 が一番近い未来。 */
export const UNLOCK_DAYS = [0, 3, 7, 14, 30, 50, 75, 100, 130, 165, 200];

export function needDaysForFuture(future: number): number {
  const i = Math.max(0, Math.min(future, UNLOCK_DAYS.length - 1));
  return UNLOCK_DAYS[i];
}

export type DecadeUnlock = { unlocked: boolean; need: number; remaining: number };

/** その10年が今、開いているか。過去・今・マスターは常に開放。未来だけ日数でゲート。 */
export function decadeUnlock(offset: number, activeDays: number, master = false): DecadeUnlock {
  if (master || offset <= 0) return { unlocked: true, need: 0, remaining: 0 };
  const need = needDaysForFuture(offset);
  return { unlocked: activeDays >= need, need, remaining: Math.max(0, need - activeDays) };
}

/** マスター判定。MASTER_EMAILS（カンマ区切り）に一致すれば全開放。 */
export function isMaster(email: string | null | undefined): boolean {
  const list = (process.env.MASTER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

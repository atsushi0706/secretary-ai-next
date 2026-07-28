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

/**
 * 未来へ n 個先の10年を開くのに必要な「歩いた回数」（パラレルウォーク＋トラベルの回数）。
 * 鍵を自分の手の中に置く＝日数の壁ではなく「◯回やると開く」意志のロックにする。
 */
export const UNLOCK_WALKS = [0, 3, 7, 12, 20, 30, 42, 56, 72, 90, 110];

export function needWalksForFuture(future: number): number {
  const i = Math.max(0, Math.min(future, UNLOCK_WALKS.length - 1));
  return UNLOCK_WALKS[i];
}

export type DecadeUnlock = { unlocked: boolean; need: number; remaining: number };

/** その10年が今、開いているか。過去・今・マスターは常に開放。未来だけ「歩いた回数」でゲート。 */
export function decadeUnlock(offset: number, walkCount: number, master = false): DecadeUnlock {
  if (master || offset <= 0) return { unlocked: true, need: 0, remaining: 0 };
  const need = needWalksForFuture(offset);
  return { unlocked: walkCount >= need, need, remaining: Math.max(0, need - walkCount) };
}

/** マスター判定。MASTER_EMAILS（カンマ区切り）に一致すれば全開放。 */
export function isMaster(email: string | null | undefined): boolean {
  const list = (process.env.MASTER_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

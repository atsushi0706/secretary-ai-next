/**
 * アカシック（人生の10年周期）の段階解放。
 *
 * 設計（淳くんの結論）：
 * - 最初は「今の10年」だけが見えている。
 * - 取り組み日数（この世界に触れた延べ日数）が増えるほど、前後の10年が外側へ少しずつ開く。
 * - 一度開いたら戻さない（＝連続ストリークではなく累計日数で判定）。
 * - 画面には「あと◯日で解放」を明記する。
 *
 * 距離 = その10年が「今の10年」から何個離れているか（過去/未来どちらも同じ扱い）。
 */

/** 距離ごとに必要な「取り組み日数」。distance=0（今の10年）は最初から開いている。 */
export const UNLOCK_DAYS = [0, 3, 7, 14, 30, 50, 75, 100, 130, 165, 200];

export function needDaysForDistance(distance: number): number {
  const i = Math.max(0, Math.min(distance, UNLOCK_DAYS.length - 1));
  return UNLOCK_DAYS[i];
}

export type DecadeUnlock = { unlocked: boolean; need: number; remaining: number };

/** その10年が今、開いているか。開いていなければ「あと何日」か。 */
export function decadeUnlock(distance: number, activeDays: number): DecadeUnlock {
  const need = needDaysForDistance(distance);
  const unlocked = activeDays >= need;
  return { unlocked, need, remaining: Math.max(0, need - activeDays) };
}

import { EP1 } from "./ep1";
import { EP2 } from "./ep2";
import { EP3 } from "./ep3";
import { EP4 } from "./ep4";
import { EP5 } from "./ep5";
import { EP6 } from "./ep6";
import { EP7 } from "./ep7";
import { EP8 } from "./ep8";
import { EP9 } from "./ep9";
import { EP10 } from "./ep10";
import { EP1_FOUNDATION } from "./ep1-foundation";
import { EP2_FOUNDATION } from "./ep2-foundation";
import { EP3_FOUNDATION } from "./ep3-foundation";
import { EP4_FOUNDATION } from "./ep4-foundation";
import { EP5_FOUNDATION } from "./ep5-foundation";
import { EP6_FOUNDATION } from "./ep6-foundation";
import { EP7_FOUNDATION } from "./ep7-foundation";
import { EP8_FOUNDATION } from "./ep8-foundation";
import { EP9_FOUNDATION } from "./ep9-foundation";
import { EP10_FOUNDATION } from "./ep10-foundation";
import { assertSeriesHumanArcs } from "./series-review";
import type { Episode } from "./types";

/** ある回の一覧。増えたらここに足す */
export const EPISODES: Record<string, Episode> = {
  ep1: EP1,
  ep2: EP2,
  ep3: EP3,
  ep4: EP4,
  ep5: EP5,
  ep6: EP6,
  ep7: EP7,
  ep8: EP8,
  ep9: EP9,
  ep10: EP10,
};

/** 禁止語ではなく、全話の人物欲求と変化の多様性を通しで検査する。 */
export const SERIES_HUMAN_ARC_QUALITY = assertSeriesHumanArcs([
  EP1_FOUNDATION,
  EP2_FOUNDATION,
  EP3_FOUNDATION,
  EP4_FOUNDATION,
  EP5_FOUNDATION,
  EP6_FOUNDATION,
  EP7_FOUNDATION,
  EP8_FOUNDATION,
  EP9_FOUNDATION,
  EP10_FOUNDATION,
]);

export function getEpisode(key: string): Episode | null {
  return EPISODES[key] ?? null;
}

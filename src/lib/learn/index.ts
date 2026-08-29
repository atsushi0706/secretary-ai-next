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

export function getEpisode(key: string): Episode | null {
  return EPISODES[key] ?? null;
}

import { EP1 } from "./ep1";
import { EP2 } from "./ep2";
import { EP3 } from "./ep3";
import { EP4 } from "./ep4";
import { EP5 } from "./ep5";
import type { Episode } from "./types";

/** ある回の一覧。増えたらここに足す */
export const EPISODES: Record<string, Episode> = { ep1: EP1, ep2: EP2, ep3: EP3, ep4: EP4, ep5: EP5 };

export function getEpisode(key: string): Episode | null {
  return EPISODES[key] ?? null;
}

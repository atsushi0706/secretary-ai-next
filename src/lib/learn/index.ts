import { EP1 } from "./ep1";
import { EP2 } from "./ep2";
import type { Episode } from "./types";

/** ある回の一覧。増えたらここに足す */
export const EPISODES: Record<string, Episode> = { ep1: EP1, ep2: EP2 };

export function getEpisode(key: string): Episode | null {
  return EPISODES[key] ?? null;
}

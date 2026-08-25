import { EP1 } from "./ep1";
import type { Episode } from "./types";

/** ある回の一覧。増えたらここに足す */
export const EPISODES: Record<string, Episode> = { ep1: EP1 };

export function getEpisode(key: string): Episode | null {
  return EPISODES[key] ?? null;
}

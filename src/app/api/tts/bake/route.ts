/**
 * 呼吸ガイドの音声を「1回だけ」作ってファイルに焼き込む。
 *
 * これをやっておくと、以後は何人が使っても ElevenLabs のクレジットを消費しない。
 * 焼かないままだと、ユーザーが呼吸ワークを開くたびに生成が走り、
 * 人が増えた瞬間にクレジットが枯れる。
 *
 * GET  : 焼き込み済みの音声の場所（誰でも。画面が再生に使う）
 * POST : 焼き込みを実行（管理者のみ・声を変えたときだけ押す）
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";
import { BREATH_LINES, BAKE_BUCKET, bakePath, totalChars } from "@/lib/breath-lines";
import { toYomi } from "@/lib/yomi";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const elKey = () => process.env.ELEVENLABS_API_KEY?.trim() || "";
const EL_MODEL = process.env.ELEVENLABS_MODEL?.trim() || "eleven_multilingual_v2";

/** いま使う声を1つ決める（TTS本体と同じ考え方：指定 → 無料で鳴る声） */
async function resolveVoice(): Promise<string | null> {
  const fixed = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fixed) return fixed;
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": elKey() } });
    if (!r.ok) return null;
    const d = await r.json();
    const list = (d?.voices ?? []) as any[];
    const free = list.filter((v) => v.category === "premade" || v.category === "default");
    const pool = free.length ? free : list;
    const pref = pool.find((v) => /sarah|bella|river|charlotte|alice|lily/i.test(String(v.name)));
    return String((pref ?? pool[0])?.voice_id ?? "") || null;
  } catch { return null; }
}

function publicUrl(path: string): string {
  const { data } = supabaseAdmin().storage.from(BAKE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function GET() {
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || (await resolveVoice());
  if (!voiceId) return NextResponse.json({ voiceId: null, baked: {} });
  try {
    const supa = supabaseAdmin();
    const { data } = await supa.storage.from(BAKE_BUCKET).list(`_voice/${voiceId}`, { limit: 50 });
    const have = new Set((data ?? []).map((f) => f.name));
    const baked: Record<string, string> = {};
    for (const l of BREATH_LINES) {
      if (have.has(`${l.key}.mp3`)) baked[l.key] = publicUrl(bakePath(voiceId, l.key));
    }
    return NextResponse.json({ voiceId, baked, total: BREATH_LINES.length });
  } catch {
    return NextResponse.json({ voiceId, baked: {} });
  }
}

export async function POST() {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdmin(userId)) return NextResponse.json({ error: "管理者だけが実行できます" }, { status: 403 });

  const key = elKey();
  if (!key) return NextResponse.json({ error: "ELEVENLABS_API_KEY が未設定" }, { status: 503 });
  const voiceId = await resolveVoice();
  if (!voiceId) return NextResponse.json({ error: "使う声を決められませんでした" }, { status: 503 });

  const supa = supabaseAdmin();
  const done: string[] = [];
  const failed: string[] = [];

  for (const line of BREATH_LINES) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
        body: JSON.stringify({
          // 読みなおしを通してから焼く。
          // 通していなかったので「吐ききって」が「つききって」と焼き込まれていた。
          text: toYomi(line.text),
          model_id: EL_MODEL,
          voice_settings: { stability: 0.42, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true },
        }),
      });
      if (!r.ok) {
        const b = (await r.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 120);
        failed.push(`${line.key}: ${r.status} ${b}`);
        continue;
      }
      const bytes = new Uint8Array(await r.arrayBuffer());
      const { error } = await supa.storage.from(BAKE_BUCKET)
        .upload(bakePath(voiceId, line.key), bytes, {
          contentType: "audio/mpeg", upsert: true, cacheControl: "31536000",
        });
      if (error) { failed.push(`${line.key}: 保存失敗 ${error.message}`); continue; }
      done.push(line.key);
    } catch (e: any) {
      failed.push(`${line.key}: ${String(e?.message ?? e).slice(0, 100)}`);
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    voiceId,
    baked: done.length,
    total: BREATH_LINES.length,
    usedChars: totalChars(),
    failed,
  });
}

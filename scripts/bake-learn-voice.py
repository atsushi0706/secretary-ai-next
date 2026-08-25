# -*- coding: utf-8 -*-
"""
AIラーニングの声を、PC内の VoiceForge JP（クローン音声・VoxCPM2）で焼き込む。

  先生（エリクソン）＝ 玄 gen   … 最も低く重厚（ref_gen_001）
  リンク           ＝ 翔 sho   … やや高め・速く淡々（ref_sho_001）

使い方:
  1. voiceforge-jp で `start_app.bat --models voxcpm2`（127.0.0.1:8700）
  2. node scripts/dump-learn-lines.mjs   … 台本 → public/learn/ep1/lines.json
  3. python scripts/bake-learn-voice.py  … 無いものだけ作る（何度でも再開できる）

1行＝1ジョブ。文ごとに ASR で読みを確かめ、崩れていたらその文だけ作り直す（最大2回）。
結果は public/learn/ep1/audio/<id>.mp3 と _report.json に残す。
"""
import json, os, sys, time, subprocess, urllib.request, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else "ep1"
BASE = "http://127.0.0.1:8700"
REF = {"teacher": "ref_gen_001", "link": "ref_sho_001"}
OUT = os.path.join(ROOT, "public", "learn", EP, "audio")
os.makedirs(OUT, exist_ok=True)
REPORT = os.path.join(OUT, "_report.json")
ASR_OK = 0.6          # これ未満は読みが崩れたとみなして作り直す
MAX_RETRY = 2

def post(p, d):
    r = urllib.request.Request(BASE + p, data=json.dumps(d).encode("utf-8"),
                               headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(r, timeout=120).read())

def get(p):
    return json.loads(urllib.request.urlopen(BASE + p, timeout=120).read())

def wait_job(jid, prev_updated=None, timeout=900):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = get(f"/api/jobs/{jid}")
        segs = s.get("segments", [])
        done = segs and all(x.get("status") in ("done", "failed") for x in segs)
        fresh = prev_updated is None or s.get("updated_at") != prev_updated
        if done and s.get("output_url") and fresh:
            return s
        if s.get("status") == "failed":
            return s
        time.sleep(2.5)
    raise TimeoutError(jid)

def chosen(seg):
    c = seg.get("candidates") or []
    i = seg.get("chosen") or 0
    return c[i] if i < len(c) else (c[0] if c else {})

def log(msg):
    print(msg, flush=True)

def main():
    lines = json.load(io.open(os.path.join(ROOT, "public", "learn", EP, "lines.json"), encoding="utf-8"))["lines"]
    report = {}
    if os.path.exists(REPORT):
        report = json.load(io.open(REPORT, encoding="utf-8"))
    todo = [l for l in lines if not os.path.exists(os.path.join(OUT, f"{l['id']}.mp3"))]
    log(f"[bake] {len(lines)} lines, {len(todo)} to make")
    t_all = time.time()
    for n, l in enumerate(todo, 1):
        t0 = time.time()
        try:
            j = post("/api/jobs", {"display_text": l["text"], "backend_id": "voxcpm2",
                                   "ref_id": REF[l["who"]], "candidates": 1})
            jid = j["job_id"]
            s = wait_job(jid)
            # 読みが崩れた文だけ作り直す
            for attempt in range(MAX_RETRY):
                bad = [seg for seg in s["segments"] if (chosen(seg).get("asr_match") or 0) < ASR_OK]
                if not bad:
                    break
                for seg in bad:
                    prev = s.get("updated_at")
                    post(f"/api/jobs/{jid}/segments/{seg['segment_id']}/regenerate",
                         {"seed": 20260825 + attempt * 7 + seg["index"]})
                    s = wait_job(jid, prev_updated=prev)
            wav = s["output_url"]
            data = urllib.request.urlopen(BASE + wav, timeout=120).read()
            wav_path = os.path.join(OUT, f"{l['id']}.wav")
            open(wav_path, "wb").write(data)
            mp3 = os.path.join(OUT, f"{l['id']}.mp3")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav_path,
                            "-ac", "1", "-ar", "44100", "-b:a", "80k", mp3], check=True)
            os.remove(wav_path)
            segs = [{"text": seg["display_text"], "asr": chosen(seg).get("asr_text"),
                     "match": chosen(seg).get("asr_match"), "sec": chosen(seg).get("audio_seconds")}
                    for seg in s["segments"]]
            worst = min((x["match"] or 0) for x in segs) if segs else 0
            report[l["id"]] = {"who": l["who"], "text": l["text"], "job": jid, "segments": segs, "worst": worst}
            json.dump(report, io.open(REPORT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            log(f"[bake] {n}/{len(todo)} {l['id']} ({l['who']}) worst={worst:.2f} {time.time()-t0:.0f}s  "
                f"elapsed {(time.time()-t_all)/60:.1f}min")
        except Exception as e:
            log(f"[bake] {n}/{len(todo)} {l['id']} FAILED: {e}")
            time.sleep(5)
    log("[bake] done")

if __name__ == "__main__":
    main()

# -*- coding: utf-8 -*-
"""
読みが崩れた行（_report.json の worst < 0.6）だけ、別の参照音声・別の種で作り直す。
候補を複数作り、機械の聞き取り（ASR一致）がいちばん良いものを採用する。
いまより良くならなければ、いまの音声を残す。

  python scripts/rebake-weak.py ep1
"""
import json, os, sys, time, subprocess, urllib.request, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EP = sys.argv[1] if len(sys.argv) > 1 else "ep1"
BASE = "http://127.0.0.1:8700"
OUT = os.path.join(ROOT, "public", "learn", EP, "audio")
REPORT = os.path.join(OUT, "_report.json")
# 話者ごとの「試す参照」の順（同じ声の別クリップ → 元のクリップの別の種）
TRIES = {
    "teacher": [("ref_gen_002", None), ("ref_gen_001", 7), ("ref_gen_002", 99), ("ref_gen_001", 2026)],
    "link": [("ref_sho_002", None), ("ref_sho_001", 7), ("ref_sho_002", 99)],
}
THRESH = 0.6

def post(p, d):
    r = urllib.request.Request(BASE + p, data=json.dumps(d).encode("utf-8"),
                               headers={"Content-Type": "application/json"}, method="POST")
    return json.loads(urllib.request.urlopen(r, timeout=120).read())

def get(p):
    return json.loads(urllib.request.urlopen(BASE + p, timeout=120).read())

def wait_job(jid, timeout=600):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = get(f"/api/jobs/{jid}")
        segs = s.get("segments", [])
        if segs and all(x.get("status") in ("done", "failed") for x in segs) and s.get("output_url"):
            return s
        if s.get("status") == "failed":
            return s
        time.sleep(2.5)
    raise TimeoutError(jid)

def chosen(seg):
    c = seg.get("candidates") or []
    i = seg.get("chosen") or 0
    return c[i] if i < len(c) else (c[0] if c else {})

def worst_of(s):
    return min((chosen(seg).get("asr_match") or 0) for seg in s["segments"]) if s.get("segments") else 0

def main():
    report = json.load(io.open(REPORT, encoding="utf-8"))
    weak = [(k, v) for k, v in report.items() if (v.get("worst") or 0) < THRESH]
    print(f"[rebake] {len(weak)} weak lines", flush=True)
    for n, (lid, v) in enumerate(weak, 1):
        best = (v.get("worst") or 0, None)
        for ref, seed in TRIES[v["who"]]:
            try:
                body = {"display_text": v["text"], "backend_id": "voxcpm2", "ref_id": ref, "candidates": 1}
                if seed is not None:
                    body["seed"] = seed
                j = post("/api/jobs", body)
                s = wait_job(j["job_id"])
                w = worst_of(s)
                print(f"[rebake] {n}/{len(weak)} {lid} {ref} seed={seed} -> {w:.2f}", flush=True)
                if w > best[0]:
                    best = (w, s)
                if w >= 0.99:
                    break
            except Exception as e:
                print(f"[rebake] {lid} {ref} error: {e}", flush=True)
        if best[1] is not None:
            s = best[1]
            data = urllib.request.urlopen(BASE + s["output_url"], timeout=120).read()
            wav = os.path.join(OUT, f"{lid}.wav")
            open(wav, "wb").write(data)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-ac", "1", "-ar", "44100", "-b:a", "80k",
                            os.path.join(OUT, f"{lid}.mp3")], check=True)
            os.remove(wav)
            report[lid]["worst"] = best[0]
            report[lid]["job"] = s["job_id"]
            report[lid]["segments"] = [{"text": seg["display_text"], "asr": chosen(seg).get("asr_text"),
                                        "match": chosen(seg).get("asr_match"), "sec": chosen(seg).get("audio_seconds")}
                                       for seg in s["segments"]]
            report[lid]["rebaked"] = True
            json.dump(report, io.open(REPORT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
            print(f"[rebake] {lid} replaced (worst {best[0]:.2f})", flush=True)
        else:
            print(f"[rebake] {lid} kept (no better)", flush=True)
    print("[rebake] done", flush=True)

if __name__ == "__main__":
    main()

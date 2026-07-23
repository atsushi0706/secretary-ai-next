"use client";

import { useCallback, useEffect, useState } from "react";
import { VoiceInput } from "./VoiceInput";
import { EmotionMeter, emoColor } from "./EmotionMeter";

type EmotionLog = {
  id: number;
  date: string;
  slot: string | null;
  level: number;
  energy: number | null;
  note: string;
};

// 感情の波：落ち着き(緑)→波あり(赤)
const levelColor = emoColor;

/**
 * 状態パラメーター。1日2回（朝の枠・夜の枠）まで。
 * 何度も入れられると「その瞬間の気分」になって、変化が読めなくなるため。
 */
export function StatePanel({ embedded }: { embedded?: boolean }) {
  const [logs, setLogs] = useState<EmotionLog[]>([]);
  const [slot, setSlot] = useState<"morning" | "evening">("morning");
  const [doneThisSlot, setDone] = useState(false);
  const [level, setLevel] = useState<number | null>(null);
  const [energy, setEnergy] = useState(5);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/emotions");
      const d = await r.json();
      if (!r.ok) { setMsg(d?.error ?? "読み込めませんでした"); return; }
      setLogs(d.emotions ?? []);
      setSlot(d.slot ?? "morning");
      setDone(!!d.doneThisSlot);
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch("/api/emotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level, energy, note }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d?.error ?? "保存できませんでした"); return; }
      setNote("");
      setMsg("記録しました");
      load();
    } catch (e: any) {
      setMsg(String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  const recent = [...logs].slice(0, 24).reverse();
  const slotLabel = slot === "morning" ? "朝の枠" : "夜の枠";

  const Wrap = embedded ? "div" : "div";
  return (
    <Wrap className={embedded ? "" : "singa-panel"}>
      {!embedded && <div className="singa-panel-title">いまの状態（{slotLabel}）</div>}

      {doneThisSlot ? (
        <p className="text-xs leading-relaxed opacity-80">
          この枠はもう記録済みです。<br />
          {slot === "morning" ? "次は夜に、また聞かせてください。" : "次は明日の朝に。"}
        </p>
      ) : (
        <>
          <EmotionMeter value={level} onChange={setLevel} />
          <div className="mt-2">
            <Scale label="体のエネルギー" value={energy} onChange={setEnergy} lowLabel="ない" highLabel="ある" />
          </div>

          <div className="flex items-start gap-1.5 mt-2">
            <VoiceInput mode="speech" compact onText={(t) => setNote((p) => (p ? p + " " + t : t))} />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="何かあった？（なくてもいい）"
              className="flex-1 singa-textarea"
            />
          </div>

          <button onClick={save} disabled={saving || level == null} className="singa-panel-btn">
            {saving ? "記録中…" : level == null ? "まず、いまの波を選ぶ" : "記録する"}
          </button>
        </>
      )}

      {msg && <div className="text-[11px] mt-2 opacity-80">{msg}</div>}

      {recent.length > 0 && (
        <>
          <div className="singa-panel-sub">これまでの流れ</div>
          <div className="flex items-end gap-[2px] h-14">
            {recent.map((e) => (
              <div
                key={e.id}
                className="flex-1 rounded-t min-w-[3px]"
                style={{ height: `${e.level * 10}%`, background: levelColor(e.level) }}
                title={`${e.date}（${e.slot === "evening" ? "夜" : "朝"}） 心:${e.level}${e.energy ? ` / 体:${e.energy}` : ""}${e.note ? ` / ${e.note}` : ""}`}
              />
            ))}
          </div>
        </>
      )}
    </Wrap>
  );
}

function Scale({
  label, value, onChange, lowLabel, highLabel,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="mt-2">
      <div className="text-[11px] font-bold mb-1">{label}</div>
      <div className="flex gap-[3px]">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`singa-scale ${value === n ? "is-on" : ""}`}
            style={value === n ? { background: levelColor(n) } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[9px] opacity-60 mt-0.5">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

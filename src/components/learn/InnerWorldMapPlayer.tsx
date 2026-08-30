"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { VoiceInput } from "@/components/shinga/VoiceInput";
import {
  INNER_WORLD_ANSWER_LABELS,
  INNER_WORLD_MODULES,
  INNER_WORLD_SESSIONS,
  type InnerWorldAnswerKey,
  type InnerWorldModule,
  type InnerWorldScreen,
} from "@/lib/inner-world-map/course";
import styles from "./InnerWorldMap.module.css";

const ANSWERS_KEY = "learn:inner-world-map:answers:v1";
const COMPLETED_KEY = "learn:inner-world-map:completed:v1";

type Answers = Partial<Record<InnerWorldAnswerKey, string>>;

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function MapValue({ value }: { value?: string }) {
  return <p>{value?.trim() || "まだ言葉になっていない"}</p>;
}

function GuideReply({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.guideReply}>
      <span className={styles.guideAvatar} aria-hidden="true">淳</span>
      <div><b>清瀬 淳</b><p>{children}</p></div>
    </div>
  );
}

function SourceLink({ module }: { module: InnerWorldModule }) {
  return (
    <a className={styles.sourceLink} href={module.sourceUrl} target="_blank" rel="noreferrer">
      元教材を見る <span>↗</span><small>{module.sourceTitle}</small>
    </a>
  );
}

function CourseMap({
  completed,
  onOpen,
}: {
  completed: number[];
  onOpen: (module: InnerWorldModule) => void;
}) {
  return (
    <div className={styles.mapBoard}>
      <div className={styles.mapPath} aria-hidden="true" />
      {INNER_WORLD_MODULES.map((module, index) => {
        const done = completed.includes(module.id);
        const unlocked = index === 0 || completed.includes(module.id - 1);
        return (
          <button
            type="button"
            key={module.id}
            className={`${styles.mapNode} ${done ? styles.done : ""}`}
            style={{ "--zone": module.color } as React.CSSProperties}
            disabled={!unlocked}
            onClick={() => onOpen(module)}
          >
            <span className={styles.nodeNo}>{done ? "✓" : String(module.id).padStart(2, "0")}</span>
            <span className={styles.nodeCopy}><small>{module.zone}</small><b>{module.shortTitle}</b></span>
            <span className={styles.nodeState}>{done ? "見返す" : unlocked ? "入る" : "未到達"}</span>
          </button>
        );
      })}
    </div>
  );
}

function FullMap({ answers, onClose }: { answers: Answers; onClose: () => void }) {
  const groups: { title: string; tone: string; refs: InnerWorldAnswerKey[] }[] = [
    { title: "現在の綱引き", tone: "mist", refs: ["currentProblem", "desiredState"] },
    { title: "繰り返す反応", tone: "pattern", refs: ["currentPattern", "shadowSelf1", "pastPattern"] },
    { title: "陽の自分", tone: "light", refs: ["lightSelf"] },
    { title: "陰の流れ", tone: "shadow", refs: ["turningPoint", "bornThought", "bornAction", "bornValue", "deepSelf"] },
    { title: "二つをつなぐ橋", tone: "bridge", refs: ["consciousPurpose", "deepPurpose", "sharedPurpose", "newRoute"] },
    { title: "未来への方角", tone: "compass", refs: ["higherCompass", "geniusKey", "firstMove"] },
  ];

  const copy = async () => {
    const text = groups.flatMap((group) => [
      `## ${group.title}`,
      ...group.refs.map((key) => `${INNER_WORLD_ANSWER_LABELS[key]}：${answers[key] || "まだ言葉になっていない"}`),
      "",
    ]).join("\n");
    await navigator.clipboard.writeText(`インナーワールドマップ\n\n${text}`);
  };

  return (
    <div className={styles.fullMap}>
      <header className={styles.fullMapHead}>
        <div><small>INNER WORLD MAP</small><h2>完成した心の地図</h2></div>
        <button type="button" onClick={onClose}>閉じる</button>
      </header>
      <p className={styles.fullMapIntro}>これは診断結果ではありません。いま見えている心の構造を、選び直せる形にした地図です。</p>
      <div className={styles.fullMapFlow}>
        {groups.map((group, index) => (
          <section className={`${styles.mapGroup} ${styles[group.tone]}`} key={group.title}>
            <span className={styles.mapGroupNo}>{String(index + 1).padStart(2, "0")}</span>
            <h3>{group.title}</h3>
            {group.refs.map((key) => (
              <div className={styles.mapAnswer} key={key}>
                <b>{INNER_WORLD_ANSWER_LABELS[key]}</b>
                <MapValue value={answers[key]} />
              </div>
            ))}
          </section>
        ))}
      </div>
      <button type="button" className={styles.copyButton} onClick={() => void copy()}>地図を文章でコピーする</button>
    </div>
  );
}

function SessionRoom({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.sessionRoom}>
      <header className={styles.fullMapHead}>
        <div><small>BONUS SESSION ROOM</small><h2>実演セッションを観察する</h2></div>
        <button type="button" onClick={onClose}>閉じる</button>
      </header>
      <p className={styles.fullMapIntro}>結論を覚える部屋ではありません。相談者の言葉が、どの問いで地図へ変わるかを観察します。</p>
      <div className={styles.sessionList}>
        {INNER_WORLD_SESSIONS.map((session) => (
          <article className={styles.sessionCard} key={session.id}>
            <div className={styles.sessionVideo}>
              <iframe
                src={`https://www.youtube.com/embed/${session.url.split("/").pop()}`}
                title={session.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className={styles.sessionBody}>
              <span>SESSION {session.id}｜{session.duration}</span>
              <h3>{session.title}</h3>
              <p>{session.caseSummary}</p>
              <h4>ここを見る</h4>
              <ol>{session.watchFor.map((item) => <li key={item}>{item}</li>)}</ol>
              <a href={session.url} target="_blank" rel="noreferrer">YouTubeで開く ↗</a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ModuleScreen({
  module,
  screen,
  screenIndex,
  answers,
  userName,
  onAnswer,
  onNext,
  onBack,
  onExit,
}: {
  module: InnerWorldModule;
  screen: InnerWorldScreen;
  screenIndex: number;
  answers: Answers;
  userName: string;
  onAnswer: (key: InnerWorldAnswerKey, value: string) => void;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
}) {
  const [draft, setDraft] = useState(screen.kind === "input" ? answers[screen.key] ?? "" : "");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const progress = ((screenIndex + 1) / module.screens.length) * 100;

  const submit = async (value: string, skipped = false) => {
    if (screen.kind !== "input") return;
    const clean = value.trim() || "まだ言葉になっていない";
    onAnswer(screen.key, clean);
    if (skipped) {
      setReply(screen.fallbackReply);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/learn/inner-world/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: module.id,
          question: screen.prompt,
          answer: clean,
          fallback: screen.fallbackReply,
          context: answers,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      setReply(response.ok && typeof payload.reply === "string" ? payload.reply : screen.fallbackReply);
    } catch {
      setReply(screen.fallbackReply);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={styles.lesson} style={{ "--zone": module.color } as React.CSSProperties}>
      <header className={styles.lessonHead}>
        <button type="button" onClick={onExit} aria-label="コースマップへ戻る">←</button>
        <div><small>ZONE {String(module.id).padStart(2, "0")}</small><b>{module.shortTitle}</b></div>
        <span>{screenIndex + 1}/{module.screens.length}</span>
      </header>
      <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div>

      <section className={styles.screen}>
        {screen.kind === "guide" && (
          <div className={`${styles.guideScreen} ${screen.tone ? styles[screen.tone] : ""}`}>
            <span className={styles.eyebrow}>{screen.eyebrow}</span>
            <h1>{screen.title}</h1>
            <div className={styles.guideParagraphs}>{screen.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            {screen.bullets && <ul>{screen.bullets.map((item) => <li key={item}>{item}</li>)}</ul>}
            <GuideReply>{userName}さん。分からない言葉を覚えるのではなく、自分の場面がどこへ入るかを確かめながら進みましょう。</GuideReply>
          </div>
        )}

        {screen.kind === "input" && (
          <div className={styles.inputScreen}>
            <span className={styles.eyebrow}>{screen.eyebrow}</span>
            <h1>{screen.title}</h1>
            <p className={styles.prompt}>{screen.prompt}</p>
            <div className={styles.answerBox}>
              <textarea
                rows={5}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={screen.placeholder}
                disabled={busy || Boolean(reply)}
                autoFocus
              />
              <div className={styles.answerTools}>
                <VoiceInput mode="speech" compact onText={(text) => setDraft((current) => current ? `${current}\n${text}` : text)} />
                <small>{screen.helper}</small>
              </div>
            </div>
            {!reply && (
              <div className={styles.inputActions}>
                {screen.skipLabel && <button type="button" className={styles.ghostButton} disabled={busy} onClick={() => void submit("", true)}>{screen.skipLabel}</button>}
                <button type="button" className={styles.primaryButton} disabled={busy || !draft.trim()} onClick={() => void submit(draft)}>{busy ? "言葉を受け取っています…" : "淳に話す →"}</button>
              </div>
            )}
            {reply && <GuideReply>{reply}</GuideReply>}
          </div>
        )}

        {screen.kind === "map" && (
          <div className={styles.chapterMap}>
            <span className={styles.eyebrow}>{screen.eyebrow}</span>
            <h1>{screen.title}</h1>
            <p className={styles.prompt}>{screen.lead}</p>
            <div className={styles.chapterMapGrid}>
              {screen.refs.map((ref) => (
                <div className={styles.mapAnswer} key={ref.key}><b>{ref.label}</b><MapValue value={answers[ref.key]} /></div>
              ))}
            </div>
            <GuideReply>{screen.insight}</GuideReply>
          </div>
        )}

        {screen.kind === "complete" && (
          <div className={styles.completeScreen}>
            <div className={styles.compassRose} aria-hidden="true"><i /><b>✦</b></div>
            <span className={styles.eyebrow}>{screen.eyebrow}</span>
            <h1>{screen.title}</h1>
            <p>{screen.lead}</p>
            <div className={styles.finalThree}>
              <div><small>HIGHER COMPASS</small><MapValue value={answers.higherCompass} /></div>
              <div><small>GENIUS KEY</small><MapValue value={answers.geniusKey} /></div>
              <div><small>FIRST MOVE</small><MapValue value={answers.firstMove} /></div>
            </div>
          </div>
        )}
      </section>

      <footer className={styles.lessonFoot}>
        <button type="button" className={styles.footBack} onClick={onBack} disabled={screenIndex === 0}>← 戻る</button>
        {screen.kind !== "input" && <button type="button" className={styles.footNext} onClick={onNext}>{screen.kind === "complete" ? "地図を完成する" : "次へ"} →</button>}
        {screen.kind === "input" && reply && <button type="button" className={styles.footNext} onClick={onNext}>次へ →</button>}
      </footer>
      <SourceLink module={module} />
    </main>
  );
}

export function InnerWorldMapPlayer({ userName }: { userName: string }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [completed, setCompleted] = useState<number[]>([]);
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);
  const [screenIndex, setScreenIndex] = useState(0);
  const [view, setView] = useState<"course" | "full-map" | "sessions">("course");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const loadId = window.setTimeout(() => {
      setAnswers(safeParse<Answers>(window.localStorage.getItem(ANSWERS_KEY), {}));
      setCompleted(safeParse<number[]>(window.localStorage.getItem(COMPLETED_KEY), []));
      setReady(true);
    }, 0);
    return () => window.clearTimeout(loadId);
  }, []);

  const activeModule = useMemo(() => INNER_WORLD_MODULES.find((module) => module.id === activeModuleId) ?? null, [activeModuleId]);

  const saveAnswers = (next: Answers) => {
    setAnswers(next);
    window.localStorage.setItem(ANSWERS_KEY, JSON.stringify(next));
  };

  const answer = (key: InnerWorldAnswerKey, value: string) => saveAnswers({ ...answers, [key]: value });

  const openModule = (module: InnerWorldModule) => {
    setActiveModuleId(module.id);
    setScreenIndex(0);
    setView("course");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const finishModule = () => {
    if (!activeModule) return;
    const nextCompleted = Array.from(new Set([...completed, activeModule.id])).sort((a, b) => a - b);
    setCompleted(nextCompleted);
    window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(nextCompleted));
    setActiveModuleId(null);
    setScreenIndex(0);
    if (activeModule.id === INNER_WORLD_MODULES.length) setView("full-map");
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  const reset = () => {
    if (!window.confirm("この端末に保存したインナーワールドマップを消して、最初から作り直しますか？")) return;
    window.localStorage.removeItem(ANSWERS_KEY);
    window.localStorage.removeItem(COMPLETED_KEY);
    setAnswers({});
    setCompleted([]);
    setActiveModuleId(null);
    setView("course");
  };

  if (!ready) return <div className={styles.loading}>地図を開いています…</div>;
  if (view === "full-map") return <FullMap answers={answers} onClose={() => setView("course")} />;
  if (view === "sessions") return <SessionRoom onClose={() => setView("course")} />;

  if (activeModule) {
    const screen = activeModule.screens[screenIndex];
    return (
      <ModuleScreen
        key={`${activeModule.id}-${screenIndex}`}
        module={activeModule}
        screen={screen}
        screenIndex={screenIndex}
        answers={answers}
        userName={userName}
        onAnswer={answer}
        onBack={() => setScreenIndex((index) => Math.max(0, index - 1))}
        onNext={() => screenIndex >= activeModule.screens.length - 1 ? finishModule() : setScreenIndex((index) => index + 1)}
        onExit={() => setActiveModuleId(null)}
      />
    );
  }

  const nextModule = INNER_WORLD_MODULES.find((module) => !completed.includes(module.id));
  return (
    <main className={styles.courseHome}>
      <div className={styles.starField} aria-hidden="true" />
      <header className={styles.courseHead}>
        <Link href="/learn">← AIラーニング</Link>
        <span>MENTAL MODEL COURSE</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.heroKicker}>清瀬 淳の心の構造学</p>
        <h1>INNER WORLD<br /><em>MAP</em></h1>
        <h2>繰り返す悩みの奥にいる自分を見つけ、<br />二つの目的が同じ未来へ進める地図を作る。</h2>
        <p>6つの領域へ入り、あなた自身の言葉で一枚の地図を完成させます。</p>
        <div className={styles.heroActions}>
          {nextModule ? <button type="button" onClick={() => openModule(nextModule)}>{completed.length ? `ZONE ${String(nextModule.id).padStart(2, "0")}から続ける` : "地図を作り始める"} →</button> : <button type="button" onClick={() => setView("full-map")}>完成した地図を見る →</button>}
          <button type="button" className={styles.secondaryButton} onClick={() => setView("sessions")}>実演セッションを見る</button>
        </div>
        <div className={styles.courseProgress}><span style={{ width: `${(completed.length / INNER_WORLD_MODULES.length) * 100}%` }} /><b>{completed.length}/6</b></div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.sectionTitle}><small>YOUR JOURNEY</small><h2>心の中を、順番に歩く</h2><p>前の領域を終えると、次の場所が開きます。終えた章は何度でも書き直せます。</p></div>
        <CourseMap completed={completed} onOpen={openModule} />
      </section>

      <section className={styles.modelNote}>
        <span>この教材の前提</span>
        <h2>「あなたが悪い」を証明する地図ではありません。</h2>
        <p>問題の外的要因を否定せず、自分で選び直せる心の構造を見つけるためのメンタルモデルです。医療上の診断や治療の代わりにはなりません。</p>
      </section>

      <div className={styles.homeTools}>
        {completed.length > 0 && <button type="button" onClick={() => setView("full-map")}>現在の地図を見る</button>}
        <button type="button" onClick={reset}>最初から作り直す</button>
      </div>
    </main>
  );
}

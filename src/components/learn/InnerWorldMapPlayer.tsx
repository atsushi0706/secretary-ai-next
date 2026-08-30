"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { VoiceInput } from "@/components/shinga/VoiceInput";
import {
  INNER_WORLD_ANSWER_LABELS,
  INNER_WORLD_MODULES,
  INNER_WORLD_PREMISE,
  INNER_WORLD_SESSIONS,
  type InnerWorldAnswerKey,
  type InnerWorldModule,
  type InnerWorldScreen,
} from "@/lib/inner-world-map/course";
import styles from "./InnerWorldMap.module.css";

const ANSWERS_KEY = "learn:inner-world-map:answers:v2";
const COMPLETED_KEY = "learn:inner-world-map:completed:v2";

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

function DialogueStage({
  screen,
  visibleText,
}: {
  screen: Extract<InnerWorldScreen, { kind: "dialogue" }>;
  visibleText: string;
}) {
  const linkImage = screen.mood === "smile"
    ? "/learn/chars/link-smile.webp"
    : screen.mood === "worry"
      ? "/learn/chars/link-worry.webp"
      : "/learn/chars/link-neutral.webp";
  const isJun = screen.speaker === "jun";

  return (
    <div className={`${styles.dialogueStage} ${isJun ? styles.junSpeaking : styles.linkSpeaking}`}>
      {screen.scene && <span className={styles.sceneLabel}>{screen.scene}</span>}
      <div className={styles.stageCharacters} aria-hidden="true">
        <Image
          className={styles.junPortrait}
          src="/learn/chars/jun-neutral-v1.png"
          alt=""
          width={948}
          height={1659}
          priority
        />
        <Image className={styles.linkPortrait} src={linkImage} alt="" width={520} height={1040} priority />
      </div>
      <div className={`${styles.dialogueBox} ${isJun ? styles.junBox : styles.linkBox}`}>
        <span>{isJun ? "清瀬 淳" : "清瀬リンク"}</span>
        <p aria-live="polite">{visibleText}<i aria-hidden="true" /></p>
      </div>
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
            <span className={styles.nodeCopy}><small>第{module.id}講｜{module.zone}</small><b>{module.shortTitle}</b></span>
            <span className={styles.nodeState}>{done ? "復習する" : unlocked ? "学ぶ" : "未到達"}</span>
          </button>
        );
      })}
    </div>
  );
}

function FullMap({ answers, onClose }: { answers: Answers; onClose: () => void }) {
  const groups: { title: string; tone: string; refs: InnerWorldAnswerKey[] }[] = [
    { title: "望みと実際の反応", tone: "mist", refs: ["currentConflict"] },
    { title: "自動再生される前提", tone: "pattern", refs: ["culturalVoice", "automaticPattern"] },
    { title: "深層自己の仮説", tone: "shadow", refs: ["deepSelfHypothesis"] },
    { title: "二つをつなぐ橋", tone: "bridge", refs: ["sharedPurpose", "newRoute"] },
    { title: "未来への方角", tone: "compass", refs: ["lightDirection", "firstMove"] },
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
        <div><small>YOUR LEARNING MAP</small><h2>学びを自分の一場面へつないだノート</h2></div>
        <button type="button" onClick={onClose}>閉じる</button>
      </header>
      <p className={styles.fullMapIntro}>これは診断結果でも、変わるための強制課題でもありません。講義で学んだ心の構造を、自分の一場面から見返すための仮説ノートです。</p>
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
      <button type="button" className={styles.copyButton} onClick={() => void copy()}>学習ノートを文章でコピーする</button>
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
  const savedDraft = screen.kind === "input" ? answers[screen.key]?.trim() ?? "" : "";
  const [draft, setDraft] = useState(savedDraft);
  const [reply, setReply] = useState(savedDraft ? "前に書いた答えを読み込みました。このまま続けることも、書き直すこともできます。" : "");
  const [busy, setBusy] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const dialogueText = screen.kind === "dialogue" ? screen.text.replaceAll("{name}", userName) : "";
  const [visibleCharacters, setVisibleCharacters] = useState(screen.kind === "dialogue" ? 0 : dialogueText.length);

  const progress = ((screenIndex + 1) / module.screens.length) * 100;

  useEffect(() => {
    if (screen.kind !== "dialogue") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const revealTimer = window.setTimeout(() => setVisibleCharacters(dialogueText.length), 0);
      return () => window.clearTimeout(revealTimer);
    }
    const timer = window.setInterval(() => {
      setVisibleCharacters((current) => {
        if (current >= dialogueText.length) {
          window.clearInterval(timer);
          return current;
        }
        return Math.min(dialogueText.length, current + 1);
      });
    }, 22);
    return () => window.clearInterval(timer);
  }, [dialogueText, screen.kind]);

  const dialogueComplete = screen.kind !== "dialogue" || visibleCharacters >= dialogueText.length;
  const selectedOption = screen.kind === "choice"
    ? screen.options.find((option) => option.id === selectedChoice) ?? null
    : null;

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
        <div><small>LESSON {String(module.id).padStart(2, "0")}</small><b>{module.shortTitle}</b></div>
        <span>{screenIndex + 1}/{module.screens.length}</span>
      </header>
      <div className={styles.progress}><span style={{ width: `${progress}%` }} /></div>

      <section className={styles.screen}>
        {screen.kind === "dialogue" && <DialogueStage screen={screen} visibleText={dialogueText.slice(0, visibleCharacters)} />}

        {screen.kind === "lesson" && (
          <div className={styles.lessonScreen}>
            <span className={styles.eyebrow}>{screen.eyebrow}</span>
            <h1>{screen.title}</h1>
            <div className={styles.guideParagraphs}>{screen.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
            {screen.diagram && (
              <div className={styles.conceptDiagram}>
                {screen.diagram.map((item, index) => (
                  <div className={`${styles.conceptNode} ${styles[item.tone]}`} key={item.label}>
                    <small>{String(index + 1).padStart(2, "0")}</small><b>{item.label}</b><p>{item.detail}</p>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.takeaway}><span>ここで覚えること</span><p>{screen.takeaway}</p></div>
          </div>
        )}

        {screen.kind === "choice" && (
          <div className={styles.choiceScreen}>
            <span className={styles.eyebrow}>{screen.eyebrow}</span>
            <h1>{screen.title}</h1>
            <p className={styles.choiceContext}>{screen.context}</p>
            <div className={styles.choiceList}>
              {screen.options.map((option, index) => (
                <button
                  type="button"
                  key={option.id}
                  className={`${selectedChoice === option.id ? styles.selected : ""} ${selectedChoice === option.id ? (option.correct ? styles.correct : styles.incorrect) : ""}`}
                  onClick={() => setSelectedChoice(option.id)}
                >
                  <small>{String(index + 1).padStart(2, "0")}</small><span>{option.label}</span><b>{selectedChoice === option.id ? (option.correct ? "✓" : "×") : "→"}</b>
                </button>
              ))}
            </div>
            {selectedOption && (
              <div className={`${styles.choiceFeedback} ${selectedOption.correct ? styles.feedbackCorrect : styles.feedbackIncorrect}`}>
                <b>{selectedOption.correct ? "正解" : "ここは違います"}</b><p>{selectedOption.feedback}</p>
              </div>
            )}
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
                <button type="button" className={styles.primaryButton} disabled={busy || !draft.trim()} onClick={() => void submit(draft)}>{busy ? "一文を整理しています…" : "学習ノートに残す →"}</button>
              </div>
            )}
            {reply && (
              <>
                <GuideReply>{reply}</GuideReply>
                <button type="button" className={styles.rewriteButton} onClick={() => setReply("")}>答えを書き直す</button>
              </>
            )}
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
              <div><small>CULTURAL HYPNOSIS</small><MapValue value={answers.culturalVoice} /></div>
              <div><small>NEW ROUTE</small><MapValue value={answers.newRoute} /></div>
              <div><small>FIRST MOVE</small><MapValue value={answers.firstMove} /></div>
            </div>
          </div>
        )}
      </section>

      <footer className={styles.lessonFoot}>
        <button type="button" className={styles.footBack} onClick={onBack} disabled={screenIndex === 0}>← 戻る</button>
        {screen.kind === "dialogue" && !dialogueComplete && <button type="button" className={styles.footNext} onClick={() => setVisibleCharacters(dialogueText.length)}>台詞を表示</button>}
        {screen.kind === "dialogue" && dialogueComplete && <button type="button" className={styles.footNext} onClick={onNext}>次へ →</button>}
        {screen.kind === "choice" && <button type="button" className={styles.footNext} disabled={!selectedOption} onClick={onNext}>解説を受け取って次へ →</button>}
        {(screen.kind === "lesson" || screen.kind === "map" || screen.kind === "complete") && <button type="button" className={styles.footNext} onClick={onNext}>{screen.kind === "complete" ? "学習ノートを見る" : "次へ"} →</button>}
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
    if (!window.confirm("この端末に保存した学習進捗とノートを消して、最初から学び直しますか？")) return;
    window.localStorage.removeItem(ANSWERS_KEY);
    window.localStorage.removeItem(COMPLETED_KEY);
    setAnswers({});
    setCompleted([]);
    setActiveModuleId(null);
    setView("course");
  };

  if (!ready) return <div className={styles.loading}>講義室を開いています…</div>;
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
        <span>MENTAL MODEL CLASS</span>
      </header>

      <section className={styles.hero}>
        <p className={styles.heroKicker}>清瀬 淳 × 清瀬リンクの心の構造学</p>
        <h1>INNER WORLD<br /><em>MAP</em></h1>
        <h2>なぜ、変わろうとしても<br />同じ問題へ戻ってしまうのか？</h2>
        <p>淳とリンクの掛け合いを追いながら、顕在意識、潜在意識、文化的催眠、深層自己を順番に学びます。自分のノートを書くのは、意味が分かった後だけです。</p>
        <div className={styles.heroActions}>
          {nextModule ? <button type="button" onClick={() => openModule(nextModule)}>{completed.length ? `第${nextModule.id}講から続ける` : "第1講をはじめる"} →</button> : <button type="button" onClick={() => setView("full-map")}>学習ノートを見る →</button>}
          <button type="button" className={styles.secondaryButton} onClick={() => setView("sessions")}>学んだ後に実演を見る</button>
        </div>
        <div className={styles.courseProgress}><span style={{ width: `${(completed.length / INNER_WORLD_MODULES.length) * 100}%` }} /><b>{completed.length}/6</b></div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.sectionTitle}><small>SIX LESSONS</small><h2>心の構造を、一段ずつ理解する</h2><p>掛け合い、図解、選択問題、自分への短い当てはめを一つ終えると、次の講義が開きます。</p></div>
        <CourseMap completed={completed} onOpen={openModule} />
      </section>

      <section className={styles.modelNote}>
        <span>この講義で学ぶこと</span>
        <h2>変わらないのは、意志が弱いからとは限らない。</h2>
        <p>言葉で望む方向とは別に、文化の中で覚えたルールや昔の守り方が、自動的な選択として残ることがあります。その構造を理解し、今の自分が使う方法を選び直します。</p>
        <a href={INNER_WORLD_PREMISE.url} target="_blank" rel="noreferrer">前提になった講義を見る ↗ <small>{INNER_WORLD_PREMISE.title}</small></a>
      </section>

      <div className={styles.homeTools}>
        {completed.length > 0 && <button type="button" onClick={() => setView("full-map")}>現在の学習ノートを見る</button>}
        <button type="button" onClick={reset}>最初から学び直す</button>
      </div>
    </main>
  );
}

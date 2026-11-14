"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  Dumbbell,
  Flame,
  Heart,
  ListMusic,
  LoaderCircle,
  Maximize2,
  Mic,
  Minus,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Repeat2,
  Save,
  Settings2,
  ShieldCheck,
  SkipForward,
  Smartphone,
  Square,
  Sun,
  Timer,
  Trash2,
  Volume2,
  X,
  Pencil,
  Vibrate,
} from "lucide-react";
import {
  begin,
  formatTime,
  interrupt,
  pause,
  position,
  reconcile,
  resume,
  skip,
  timeline,
  totalMs,
  type Execution,
  type Workout,
} from "@/lib/tabata/engine";
import { validWorkout, type Preferences } from "@/lib/tabata/storage";
import { createId } from "@/lib/tabata/id";
import { WorkoutAlerts } from "@/lib/tabata/alerts";
import { assetPath } from "@/lib/utils";
import { useTabata } from "./use-tabata";
import "./tabata.css";

type Tab = "configuration" | "saved";
type Dialog = {
  title: string;
  description?: string;
  initial?: string;
  confirm: string;
  action: (value: string) => void;
};
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

function NumberField({
  label,
  hint,
  value,
  min = 0,
  max = 3600,
  step = 5,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <label className="tt-number-field">
      <span className="tt-field-title">
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <span className="tt-stepper">
        <button
          type="button"
          aria-label={`Diminuir ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => {
            setEditing(null);
            onChange(Math.max(min, value - step));
          }}
        >
          <Minus size={14} />
        </button>
        <input
          aria-label={label}
          inputMode="numeric"
          type="number"
          min={min}
          max={max}
          value={editing ?? value}
          onFocus={() => setEditing(String(value))}
          onChange={(event) => {
            setEditing(event.target.value);
            const next = Number(event.target.value);
            if (
              event.target.value !== "" &&
              Number.isInteger(next) &&
              next >= min &&
              next <= max
            )
              onChange(next);
          }}
          onBlur={() => {
            if (editing !== null)
              onChange(
                Math.min(max, Math.max(min, Math.round(Number(editing) || 0))),
              );
            setEditing(null);
          }}
        />
        <button
          type="button"
          aria-label={`Aumentar ${label.toLowerCase()}`}
          disabled={value >= max}
          onClick={() => {
            setEditing(null);
            onChange(Math.min(max, value + step));
          }}
        >
          <Plus size={14} />
        </button>
      </span>
    </label>
  );
}
function Toggle({
  checked,
  onChange,
  title,
  description,
  icon,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description?: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      className="tt-toggle-row"
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
    >
      <span className="tt-toggle-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        {description && <small>{description}</small>}
      </span>
      <span className={`tt-switch ${checked ? "on" : ""}`}>
        <span />
      </span>
    </button>
  );
}
function ConfirmDialog({
  dialog,
  close,
}: {
  dialog: Dialog;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(dialog.initial ?? "");
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="tt-dialog"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          dialog.action(value.trim());
          close();
        }}
      >
        <button
          type="button"
          className="tt-icon-button tt-dialog-close"
          aria-label="Fechar"
          onClick={close}
        >
          <X size={20} />
        </button>
        <span className="tt-eyebrow">TABATA · DÉBORA EDUARDA</span>
        <h2>{dialog.title}</h2>
        {dialog.description && <p>{dialog.description}</p>}
        {dialog.initial !== undefined && (
          <label className="tt-text-field">
            Nome
            <input
              autoFocus
              required
              maxLength={80}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
        )}
        <div className="tt-dialog-actions">
          <button type="button" className="tt-button secondary" onClick={close}>
            Cancelar
          </button>
          <button
            type="submit"
            className="tt-button primary"
            disabled={dialog.initial !== undefined && !value.trim()}
          >
            {dialog.confirm}
          </button>
        </div>
      </form>
    </dialog>
  );
}
function PreferencesDialog({
  close,
  children,
}: {
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="tt-preferences"
      aria-labelledby="preferences-title"
      onCancel={close}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      {children}
    </dialog>
  );
}

export function TabataApp() {
  const {
    data,
    ready,
    notice,
    setNotice,
    now,
    mutate,
    updateExecution,
    active,
    audioOwner,
    wake,
  } = useTabata();
  const [tab, setTab] = useState<Tab>("configuration");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"timer" | "details">("timer");
  const [advanced, setAdvanced] = useState(false);
  const [exerciseNames, setExerciseNames] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [toast, setToast] = useState("");
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);
  const [online, setOnline] = useState(true);
  const alerts = useRef<WorkoutAlerts | null>(null);
  const audioControls = useRef<{ pause: () => void; resume: () => void }>({
    pause() {},
    resume() {},
  });
  const timerPanel = useRef<HTMLElement>(null);
  const lastSignal = useRef("");
  const lastPhase = useRef("");
  const wasHidden = useRef(false);
  const seenExecution = useRef<string | null>(null);
  const [completedId, setCompletedId] = useState<string | null>(null);
  const draft = data.draft;
  const finished = data.executions.find((e) => e.id === completedId);
  const display = active ?? finished;
  const phases = useMemo(
    () => timeline(display?.workout ?? draft),
    [display?.workout, draft],
  );
  const at = display ? position(display, now, phases) : null;
  const phase = at?.phase ?? null;
  const isFinished = display?.status === "completed";
  const isInterrupted = display?.status === "interrupted";
  const phaseKind = phase?.kind ?? "preparation";
  const phaseText = isFinished
    ? "Treino concluído"
    : isInterrupted
      ? "Treino encerrado"
      : active
        ? (phase?.label ?? "Concluindo")
        : "Tudo pronto";
  const remaining = at?.remaining ?? totalMs(draft);
  const total = at?.total ?? totalMs(draft);
  const countdown =
    isFinished || isInterrupted
      ? 0
      : (at?.phaseRemaining ?? (timeline(draft)[0]?.duration ?? 0) * 1000);
  const progress = at ? at.elapsed / at.total : 0;
  const phaseProgress =
    phase && at
      ? 1 - at.phaseRemaining / (phase.duration * 1000)
      : isFinished
        ? 1
        : 0;
  const exercise =
    phase?.kind === "exercise"
      ? phase.exerciseName
      : phase?.kind === "rest" || phase?.kind === "setRest"
        ? "Respire. Você está indo bem."
        : isFinished
          ? "Mais um treino por você."
          : isInterrupted
            ? "Seu progresso ficou salvo."
            : active
              ? "Encontre seu ritmo."
              : "Seu próximo passo começa aqui.";
  const shownWorkout = display?.workout ?? draft;
  const nextExercise = at?.phases
    .slice(at.index + 1)
    .find((p) => p.kind === "exercise");

  const flash = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    alerts.current = new WorkoutAlerts({
      mediaBase: assetPath("/timer/"),
      onError: setNotice,
      onPause: () => audioControls.current.pause(),
      onResume: () => audioControls.current.resume(),
    });
    return () => {
      alerts.current?.dispose();
      alerts.current = null;
    };
  }, []);
  useEffect(() => {
    if (active) {
      seenExecution.current = active.id;
      setCompletedId(null);
    } else if (seenExecution.current) {
      setCompletedId(seenExecution.current);
      seenExecution.current = null;
    }
  }, [active]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        wasHidden.current = true;
        alerts.current?.silence();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  useEffect(() => {
    if (!audioOwner) return;
    if (active?.status === "paused") {
      alerts.current?.deactivate(true);
      return;
    }
    if (active?.status === "running" && phase && at) {
      const key = `${active.id}:${at.index}`;
      const second = Math.ceil(at.phaseRemaining / 1000);
      if (wasHidden.current && document.visibilityState === "visible") {
        lastPhase.current = key;
        lastSignal.current = `${key}:${second}`;
        wasHidden.current = false;
        return;
      }
      if (lastPhase.current !== key) {
        lastPhase.current = key;
        if (alerts.current?.claim(key))
          alerts.current.transition(
            phase,
            phase.kind === "rest" || phase.kind === "setRest"
              ? nextExercise?.exerciseName
              : undefined,
            data.preferences,
          );
      }
      const signal = `${key}:${second}`;
      if (
        lastSignal.current !== signal &&
        second >= 1 &&
        second <= 3 &&
        alerts.current?.claim(signal)
      )
        alerts.current.countdown(data.preferences);
      lastSignal.current = signal;
    } else if (
      finished?.status === "completed" &&
      lastPhase.current !== `done:${finished.id}`
    ) {
      lastPhase.current = `done:${finished.id}`;
      // A recovered completion must not replay old alerts.
      if (
        finished.endedAt !== null &&
        now - finished.endedAt < 1500 &&
        !wasHidden.current &&
        alerts.current?.claim(`done:${finished.id}`)
      )
        alerts.current.complete(data.preferences);
      wasHidden.current = false;
    } else if (finished?.status === "interrupted") {
      alerts.current?.deactivate();
    }
  }, [
    active,
    phase,
    at,
    nextExercise,
    data.preferences,
    audioOwner,
    finished,
    now,
  ]);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const connected = () => setOnline(navigator.onLine);
    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("online", connected);
    window.addEventListener("offline", connected);
    connected();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker
        .register(assetPath("/timer/sw.js"), { scope: assetPath("/timer/") })
        .then(async (registration) => {
          const checkReady = () => {
            const worker = registration.active;
            if (!worker) return;
            const channel = new MessageChannel();
            channel.port1.onmessage = (event) => {
              if (event.data?.type === "OFFLINE_READY") setOfflineReady(true);
              channel.port1.close();
            };
            worker.postMessage({ type: "CHECK_OFFLINE" }, [channel.port2]);
          };
          checkReady();
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            checkReady,
          );
          if (registration.installing)
            registration.installing.addEventListener("statechange", checkReady);
        })
        .catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", connected);
    };
  }, []);
  const updateDraft = (change: Partial<Workout>) => {
    void mutate((latest) => ({
      ...latest,
      draft: { ...latest.draft, ...change },
    }));
  };
  const preference = (key: keyof Preferences) => {
    const next = { ...data.preferences, [key]: !data.preferences[key] };
    if ((key === "sound" || key === "voice") && active?.status === "running") {
      if (!next.sound && !next.voice) alerts.current?.deactivate();
      else {
        alerts.current?.prepareWorkout(next);
        const at = position(active, Date.now());
        alerts.current?.playWorkout(at.phases, at.elapsed, next, active.name);
      }
      if (!next.voice) alerts.current?.silence();
    } else if (!next.sound && !next.voice) alerts.current?.deactivate();
    void mutate((latest) => ({
      ...latest,
      preferences: { ...latest.preferences, [key]: next[key] },
    }));
  };
  const loadWorkout = (workout: Workout, presetId: string | null = null) => {
    setEditingPresetId(presetId);
    updateDraft({ ...workout, exercises: [...workout.exercises] });
    setTab("configuration");
    setMobilePanel("details");
    setCompletedId(null);
    flash("Treino carregado. Revise e toque em Iniciar.");
  };
  const start = (force = false, selected?: Workout) => {
    const workout = selected ?? draft;
    if (!validWorkout(workout)) {
      setNotice(
        "Revise os campos: exercício de 1 a 3600s, séries e repetições de 1 a 99 e nomes de até 80 caracteres.",
      );
      return;
    }
    if (active && !force) {
      setDialog({
        title: "Substituir o treino atual?",
        description:
          "A execução atual será registrada como interrompida e um novo treino começará.",
        confirm: "Começar novo treino",
        action: () => start(true, workout),
      });
      return;
    }
    alerts.current?.prepareWorkout(data.preferences);
    const id = createId();
    let conflict = false;
    let created: Execution | undefined;
    void mutate((latest) => {
      const executions = latest.executions.map((e) => reconcile(e, Date.now()));
      const existing = executions.find(
        (e) => e.status === "running" || e.status === "paused",
      );
      if (existing && !force) {
        conflict = true;
        return { ...latest, executions };
      }
      created = begin(workout, Date.now(), id);
      return {
        ...latest,
        executions: [
          created,
          ...executions.map((e) =>
            existing && e.id === existing.id ? interrupt(e, Date.now()) : e,
          ),
        ],
      };
    }).then(() => {
      if (conflict) {
        alerts.current?.deactivate();
        setDialog({
          title: "Substituir o treino atual?",
          description:
            "A execução atual será registrada como interrompida e um novo treino começará.",
          confirm: "Começar novo treino",
          action: () => start(true, workout),
        });
      } else {
        if (created) {
          const at = position(created, Date.now());
          alerts.current?.playWorkout(
            at.phases,
            at.elapsed,
            data.preferences,
            created.name,
          );
        }
        setCompletedId(null);
        setMobilePanel("timer");
      }
    });
  };
  const stop = () => {
    if (!active) return;
    const id = active.id;
    setDialog({
      title: "Encerrar este treino?",
      description:
        "O cronômetro será encerrado. Seus modelos de treino continuam salvos.",
      confirm: "Encerrar treino",
      action: () => {
        alerts.current?.deactivate();
        void updateExecution(id, (e) => interrupt(e, Date.now()));
      },
    });
  };
  const control = (action: "pause" | "resume" | "skip") => {
    if (!active) return;
    const changedAt = Date.now();
    if (action === "pause") alerts.current?.deactivate(true);
    else if (action === "resume" || active.status === "running")
      alerts.current?.prepareWorkout(data.preferences);
    let next: Execution | undefined;
    void updateExecution(active.id, (execution) => {
      next =
        action === "pause"
          ? pause(execution, changedAt)
          : action === "resume"
            ? resume(execution, changedAt)
            : skip(execution, changedAt);
      return next;
    }).then(() => {
      if (!next) return;
      if (next.status === "running") {
        const at = position(next, Date.now());
        alerts.current?.playWorkout(
          at.phases,
          at.elapsed,
          data.preferences,
          next.name,
        );
      } else if (next.status === "paused") alerts.current?.deactivate(true);
      else alerts.current?.stopWorkout();
    });
  };
  audioControls.current = {
    pause: () => control("pause"),
    resume: () => control("resume"),
  };
  const restart = () => {
    if (!active) return;
    const workout = active.workout;
    setDialog({
      title: "Começar de novo?",
      description:
        "A execução atual ficará como interrompida. Uma nova começará desde a preparação.",
      confirm: "Reiniciar treino",
      action: () => start(true, workout),
    });
  };
  const savePreset = () =>
    setDialog({
      title: editingPresetId ? "Atualizar seu treino" : "Salvar seu treino",
      initial: draft.name,
      confirm: editingPresetId ? "Atualizar modelo" : "Salvar modelo",
      action: (name) => {
        if (!validWorkout({ ...draft, name })) {
          setNotice("Revise a configuração antes de salvar.");
          return;
        }
        const id = createId();
        void mutate((latest) => ({
          ...latest,
          draft: { ...draft, name },
          presets: editingPresetId
            ? latest.presets.map((p) =>
                p.id === editingPresetId
                  ? {
                      ...p,
                      workout: {
                        ...draft,
                        name,
                        exercises: [...draft.exercises],
                      },
                    }
                  : p,
              )
            : [
                ...latest.presets,
                {
                  id,
                  workout: { ...draft, name, exercises: [...draft.exercises] },
                },
              ],
        }));
        setEditingPresetId(null);
        flash(
          editingPresetId
            ? "Modelo atualizado."
            : "Modelo salvo nos seus treinos.",
        );
      },
    });
  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (timerPanel.current?.requestFullscreen)
        await timerPanel.current.requestFullscreen();
      else
        flash(
          "Para uma tela maior, gire o celular ou adicione o app à tela inicial.",
        );
    } catch {
      flash("Gire o celular para aproveitar o modo paisagem.");
    }
  };
  const testAlerts = () => {
    alerts.current?.test(data.preferences);
    flash("Teste de alertas iniciado.");
    if (!active || active.status === "paused")
      alerts.current?.deactivateAfter(4000);
  };
  return (
    <main
      className={`tt-app ${data.preferences.contrast ? "tt-contrast" : ""}`}
      data-phase={active ? phaseKind : "idle"}
    >
      <div className="tt-shell">
        <header className="tt-header">
          <Link
            href="/"
            className="tt-icon-button"
            aria-label="Voltar aos links"
            title="Voltar aos links"
          >
            <ArrowLeft size={20} />
          </Link>
          <button
            className="tt-icon-button"
            aria-label="Preferências"
            title="Preferências"
            onClick={() => setPreferencesOpen(true)}
          >
            <Settings2 size={20} />
          </button>
        </header>
        {/* <div className="tt-intro">
          <div>
            <span className="tt-eyebrow">
              <span className="tt-live-dot" /> MOVIMENTO É AUTOCUIDADO
            </span>
            <h1>
              Seu tempo. <span>Seu ritmo.</span>
            </h1>
            <p>Um intervalo de cada vez. Um pouco melhor a cada treino.</p>
          </div>
          <span className="tt-local-pill">
            <ShieldCheck size={15} />
            Salvo só neste navegador
          </span>
        </div> */}
        {notice && (
          <div className="tt-notice" role="alert">
            <span>{notice}</span>
            <button
              className="tt-icon-button"
              aria-label="Dispensar aviso"
              onClick={() => setNotice("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className={`tt-workspace tt-show-${mobilePanel} mt-4`}>
          <section
            ref={timerPanel}
            className={`tt-timer-panel tt-phase-${phaseKind} ${active ? "tt-executing" : ""} ${isFinished ? "tt-complete" : ""}`}
            aria-label="Cronômetro do treino"
          >
            <div className="tt-panel-top">
              <span>
                <Timer size={16} />
                TABATA TIMER
              </span>
              <div className="tt-timer-tools">
                <button
                  className={`tt-icon-button ${data.preferences.sound ? "enabled" : ""}`}
                  aria-label={
                    data.preferences.sound ? "Desativar bipes" : "Ativar bipes"
                  }
                  aria-pressed={data.preferences.sound}
                  onClick={() => preference("sound")}
                >
                  <Volume2 size={18} />
                </button>
                <button
                  className={`tt-icon-button ${data.preferences.voice ? "enabled" : ""}`}
                  aria-label={
                    data.preferences.voice ? "Desativar voz" : "Ativar voz"
                  }
                  aria-pressed={data.preferences.voice}
                  onClick={() => preference("voice")}
                >
                  <Mic size={18} />
                </button>
                <button
                  className="tt-icon-button"
                  aria-label="Tela cheia"
                  onClick={() => void fullscreen()}
                >
                  <Maximize2 size={17} />
                </button>
              </div>
            </div>
            <div className="tt-timer-stage">
              <div className="tt-phase-tag">
                <span />
                {active?.status === "paused" ? "Pausado" : phaseText}
              </div>
              <div className="tt-dial">
                <svg
                  className="tt-dial-svg"
                  viewBox="0 0 340 340"
                  aria-hidden="true"
                >
                  <circle className="tt-dial-track" cx="170" cy="170" r="157" />
                  <circle
                    className="tt-dial-progress"
                    cx="170"
                    cy="170"
                    r="157"
                    pathLength="100"
                    strokeDasharray={`${Math.max(0, 100 - phaseProgress * 100)} 100`}
                  />
                  <circle className="tt-dial-inner" cx="170" cy="170" r="142" />
                </svg>
                <div className="tt-dial-content">
                  <span className="tt-clock-caption">
                    {isFinished
                      ? "VOCÊ CONSEGUIU"
                      : isInterrupted
                        ? "ATÉ A PRÓXIMA"
                        : active
                          ? "TEMPO DA FASE"
                          : (phases[0]?.label.toUpperCase() ??
                            "PREPARAÇÃO")}{" "}
                  </span>
                  <span
                    className="tt-clock"
                    role="timer"
                    aria-label={`${phaseText}: ${formatTime(countdown)}`}
                  >
                    {isFinished ? (
                      <Check className="tt-finish-check" />
                    ) : (
                      formatTime(countdown)
                    )}
                  </span>
                  <span className="tt-dial-bottom">
                    {isFinished
                      ? "Treino concluído"
                      : isInterrupted
                        ? "Treino interrompido"
                        : active?.status === "paused"
                          ? "Respire. Retome quando quiser."
                          : active
                            ? "Mantenha o foco."
                            : "Pronto para começar?"}
                  </span>
                </div>
              </div>
              <h2 className="tt-exercise-title">{exercise}</h2>
              <div className="tt-rounds">
                <span>
                  SÉRIE{" "}
                  <strong>
                    {phase?.set ?? (isFinished ? shownWorkout.sets : 1)}
                    <i> / {shownWorkout.sets}</i>
                  </strong>
                </span>
                <b />
                <span>
                  REPETIÇÃO{" "}
                  <strong>
                    {phase?.repetition ??
                      (isFinished ? shownWorkout.repetitions : 1)}
                    <i> / {shownWorkout.repetitions}</i>
                  </strong>
                </span>
              </div>
              <div className="tt-overall">
                <div>
                  <span>
                    <Clock3 size={14} />
                    Faltam <strong>{formatTime(remaining)}</strong>
                  </span>
                  <span>
                    Total <strong>{formatTime(total)}</strong>
                  </span>
                </div>
                <div
                  className="tt-progress"
                  role="progressbar"
                  aria-label="Progresso do treino"
                  aria-valuenow={Math.round(progress * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${progress * 100}%` }} />
                </div>
                {(display?.skippedPhases ?? 0) > 0 && (
                  <small>
                    {display?.skippedPhases} fase(s) pulada(s) · total planejado
                    preservado
                  </small>
                )}
              </div>
            </div>
            <div className="tt-timer-bottom">
              {active ? (
                <div className="tt-active-controls">
                  <button
                    className="tt-button secondary tt-square-control"
                    aria-label="Reiniciar treino"
                    onClick={restart}
                  >
                    <RotateCcw size={21} />
                  </button>
                  <button
                    className="tt-button primary tt-main-control"
                    onClick={() =>
                      control(active.status === "paused" ? "resume" : "pause")
                    }
                  >
                    {active.status === "paused" ? (
                      <Play size={23} fill="currentColor" />
                    ) : (
                      <Pause size={23} fill="currentColor" />
                    )}
                    {active.status === "paused" ? "Retomar" : "Pausar"}
                  </button>
                  <button
                    className="tt-button secondary tt-square-control"
                    aria-label="Pular fase"
                    onClick={() => control("skip")}
                  >
                    <SkipForward size={22} />
                  </button>
                </div>
              ) : (
                <button
                  className="tt-button primary tt-start"
                  disabled={!ready}
                  onClick={() => start()}
                >
                  {ready ? (
                    <Play size={22} fill="currentColor" />
                  ) : (
                    <LoaderCircle size={22} className="tt-spin" />
                  )}{" "}
                  {isFinished || isInterrupted
                    ? "Iniciar novo treino"
                    : "Iniciar treino"}
                  <span>{formatTime(totalMs(draft))}</span>
                </button>
              )}
              {active?.status === "running" &&
                (data.preferences.sound || data.preferences.voice) &&
                !alerts.current?.hasWorkoutTrack && (
                  <button
                    className="tt-button secondary tt-audio-recovery"
                    onClick={() => control("resume")}
                  >
                    <Volume2 size={16} />
                    Ativar som deste treino
                  </button>
                )}
              <div className="tt-under-controls">
                {active ? (
                  <>
                    <span className={wake === "active" ? "tt-wake-active" : ""}>
                      <Smartphone size={12} />
                      {wake === "active"
                        ? "Tela mantida acesa"
                        : wake === "unavailable"
                          ? "Tela ligada indisponível"
                          : active.status === "paused"
                            ? "Cronômetro pausado"
                            : audioOwner
                              ? "Tela ligada: aguardando"
                              : "Alertas em outra aba"}
                    </span>
                    <button onClick={stop}>
                      <Square size={10} />
                      Encerrar treino
                    </button>
                  </>
                ) : (
                  <span>
                    <Smartphone size={12} />A tela fica acesa durante o treino,
                    quando permitido.
                  </span>
                )}
              </div>
            </div>
            <div className="tt-up-next">
              <span className="tt-up-next-icon">
                <ArrowRight size={18} />
              </span>
              <div>
                <small>{active ? "A SEGUIR" : "SEU TREINO"}</small>
                <strong>
                  {active
                    ? at?.next
                      ? `${at.next.kind === "exercise" ? at.next.exerciseName : at.next.label} · ${formatTime(at.next.duration * 1000)}`
                      : "Treino concluído"
                    : draft.name}
                </strong>
              </div>
              <span className="tt-mini-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
          </section>
          <aside
            className="tt-details-panel"
            aria-label="Configuração e biblioteca de treinos"
          >
            <nav className="tt-tabs" aria-label="Gerenciar treinos">
              {(
                [
                  {
                    id: "configuration",
                    label: "Configurar",
                    icon: <Settings2 size={16} />,
                  },
                  {
                    id: "saved",
                    label: "Meus treinos",
                    icon: <Dumbbell size={16} />,
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  className={tab === item.id ? "selected" : ""}
                  onClick={() => setTab(item.id)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </nav>
            {tab === "configuration" && (
              <div className="tt-tab-content">
                <div className="tt-section-heading">
                  <div>
                    <span className="tt-eyebrow">DO SEU JEITO</span>
                    <h2>Monte seu treino</h2>
                  </div>
                  <span className="tt-count-pill">
                    <Clock3 size={13} />
                    {formatTime(totalMs(draft))}
                  </span>
                </div>
                {active && (
                  <p className="tt-info">
                    Os ajustes abaixo valem para o próximo treino.
                  </p>
                )}
                <label className="tt-text-field">
                  Nome do treino
                  <input
                    maxLength={80}
                    value={draft.name}
                    placeholder="Dê um nome ao seu treino"
                    onChange={(event) =>
                      updateDraft({ name: event.target.value })
                    }
                  />
                </label>
                <div className="tt-structure-grid">
                  <NumberField
                    label="Séries"
                    hint="grupos de repetições"
                    min={1}
                    max={99}
                    step={1}
                    value={draft.sets}
                    onChange={(sets) => updateDraft({ sets })}
                  />
                  <NumberField
                    label="Repetições"
                    hint="por série"
                    min={1}
                    max={99}
                    step={1}
                    value={draft.repetitions}
                    onChange={(repetitions) =>
                      updateDraft({
                        repetitions,
                        exercises: draft.exercises.slice(0, repetitions),
                      })
                    }
                  />
                </div>
                <div className="tt-interval-fields">
                  <div className="tt-interval-row prepare">
                    <span className="tt-phase-icon">
                      <Timer size={18} />
                    </span>
                    <NumberField
                      label="Preparação"
                      hint="antes de começar · segundos"
                      value={draft.preparation}
                      onChange={(preparation) => updateDraft({ preparation })}
                    />
                  </div>
                  <div className="tt-interval-row work">
                    <span className="tt-phase-icon">
                      <Flame size={18} />
                    </span>
                    <NumberField
                      label="Exercício"
                      hint="hora de se mover · segundos"
                      min={1}
                      value={draft.exercise}
                      onChange={(exercise) => updateDraft({ exercise })}
                    />
                  </div>
                  <div className="tt-interval-row rest">
                    <span className="tt-phase-icon">
                      <Heart size={18} />
                    </span>
                    <NumberField
                      label="Descanso"
                      hint="recupere o fôlego · segundos"
                      value={draft.rest}
                      onChange={(rest) => updateDraft({ rest })}
                    />
                  </div>
                </div>
                <button
                  className="tt-expand-row"
                  aria-expanded={advanced}
                  onClick={() => setAdvanced(!advanced)}
                >
                  <span>
                    <Settings2 size={16} />
                    Aquecimento e séries
                  </span>
                  {advanced ? (
                    <ChevronUp size={17} />
                  ) : (
                    <ChevronDown size={17} />
                  )}
                </button>
                {advanced && (
                  <div className="tt-expanded">
                    <NumberField
                      label="Pausa entre séries"
                      hint="substitui o descanso · segundos"
                      value={draft.setRest}
                      onChange={(setRest) => updateDraft({ setRest })}
                    />
                    <NumberField
                      label="Aquecimento"
                      hint="opcional · segundos"
                      value={draft.warmup}
                      onChange={(warmup) => updateDraft({ warmup })}
                    />
                    <NumberField
                      label="Desaquecimento"
                      hint="opcional · segundos"
                      value={draft.cooldown}
                      onChange={(cooldown) => updateDraft({ cooldown })}
                    />
                    <p>Use 0 para desativar uma fase opcional.</p>
                  </div>
                )}
                <button
                  className="tt-expand-row"
                  aria-expanded={exerciseNames}
                  onClick={() => setExerciseNames(!exerciseNames)}
                >
                  <span>
                    <ListMusic size={16} />
                    Nomear exercícios
                    <span className="tt-optional">opcional</span>
                  </span>
                  {exerciseNames ? (
                    <ChevronUp size={17} />
                  ) : (
                    <ChevronDown size={17} />
                  )}
                </button>
                {exerciseNames && (
                  <div className="tt-exercise-inputs">
                    <p>A sequência se repete em cada série.</p>
                    {Array.from({ length: draft.repetitions }, (_, index) => (
                      <label key={index}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <input
                          aria-label={`Nome do exercício ${index + 1}`}
                          maxLength={80}
                          placeholder={`Exercício ${index + 1}`}
                          value={draft.exercises[index] ?? ""}
                          onChange={(event) => {
                            const exercises = Array.from(
                              { length: draft.repetitions },
                              (_, i) => draft.exercises[i] ?? "",
                            );
                            exercises[index] = event.target.value;
                            updateDraft({ exercises });
                          }}
                        />
                      </label>
                    ))}
                  </div>
                )}
                <button
                  className="tt-button tt-save-button"
                  onClick={savePreset}
                >
                  <Save size={17} />
                  {editingPresetId
                    ? "Atualizar modelo"
                    : "Salvar nos meus treinos"}
                </button>
                {editingPresetId && (
                  <button
                    className="tt-expand-row"
                    onClick={() => setEditingPresetId(null)}
                  >
                    Salvar como outro modelo
                    <Plus size={15} />
                  </button>
                )}
                <p className="tt-auto-save">
                  <Check size={12} />
                  Seus ajustes são salvos automaticamente.
                </p>
                <button
                  className="tt-mobile-start tt-button primary"
                  disabled={!ready}
                  onClick={() => start()}
                >
                  <Play size={18} fill="currentColor" />
                  Iniciar treino · {formatTime(totalMs(draft))}
                </button>
              </div>
            )}
            {tab === "saved" && (
              <div className="tt-tab-content">
                <div className="tt-section-heading">
                  <div>
                    <h2>Seus treinos</h2>
                  </div>
                  <span className="tt-count-pill">{data.presets.length}</span>
                </div>
                {!data.presets.length && (
                  <div className="tt-empty">
                    <Save size={28} />
                    <h3>Um treino com a sua cara.</h3>
                    <p>Monte uma rotina e salve aqui para a próxima vez.</p>
                    <button
                      className="tt-button secondary"
                      onClick={() => setTab("configuration")}
                    >
                      Criar meu treino
                      <Plus size={16} />
                    </button>
                  </div>
                )}
                {data.presets.map((preset) => (
                  <article className="tt-saved-item" key={preset.id}>
                    <div className="tt-saved-top">
                      <span className="tt-item-icon">
                        <Dumbbell size={19} />
                      </span>
                      <div>
                        <h3>{preset.workout.name}</h3>
                        <p>
                          {preset.workout.sets} série(s) ·{" "}
                          {formatTime(totalMs(preset.workout))}
                        </p>
                        <span className="tt-saved-details">
                          <span title="Preparação">
                            <Timer size={13} aria-hidden="true" />
                            <span className="sr-only">Preparação: </span>
                            {preset.workout.preparation}s
                          </span>
                          <span
                            className="tt-detail-separator"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span title="Exercício">
                            <Flame size={13} aria-hidden="true" />
                            <span className="sr-only">Exercício: </span>
                            {preset.workout.exercise}s
                          </span>
                          <span
                            className="tt-detail-separator"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span title="Descanso">
                            <Heart size={13} aria-hidden="true" />
                            <span className="sr-only">Descanso: </span>
                            {preset.workout.rest}s
                          </span>
                          <span
                            className="tt-detail-separator"
                            aria-hidden="true"
                          >
                            ·
                          </span>
                          <span title="Repetições">
                            <Repeat2 size={13} aria-hidden="true" />
                            <span className="sr-only">Repetições: </span>
                            {preset.workout.repetitions}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="tt-item-actions">
                      <button onClick={() => loadWorkout(preset.workout)}>
                        <Play size={14} />
                        Carregar
                      </button>
                      <button
                        onClick={() => {
                          loadWorkout(preset.workout, preset.id);
                          flash(
                            "Ajuste o treino e use Atualizar modelo abaixo.",
                          );
                        }}
                      >
                        <Pencil size={14} />
                        Editar
                      </button>
                      <button
                        aria-label={`Renomear ${preset.workout.name}`}
                        onClick={() =>
                          setDialog({
                            title: "Renomear modelo",
                            initial: preset.workout.name,
                            confirm: "Renomear",
                            action: (name) => {
                              void mutate((latest) => ({
                                ...latest,
                                presets: latest.presets.map((p) =>
                                  p.id === preset.id
                                    ? { ...p, workout: { ...p.workout, name } }
                                    : p,
                                ),
                              }));
                            },
                          })
                        }
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      <button
                        aria-label={`Excluir modelo ${preset.workout.name}`}
                        onClick={() =>
                          setDialog({
                            title: "Excluir este modelo?",
                            description:
                              "Este treino será removido dos seus modelos salvos.",
                            confirm: "Excluir modelo",
                            action: () => {
                              void mutate((latest) => ({
                                ...latest,
                                presets: latest.presets.filter(
                                  (p) => p.id !== preset.id,
                                ),
                              }));
                            },
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>
        <nav className="tt-mobile-nav mt-4" aria-label="Visualização">
          <button
            className={mobilePanel === "timer" ? "selected" : ""}
            onClick={() => setMobilePanel("timer")}
          >
            <Timer size={16} />
            Cronômetro
          </button>
          <button
            className={mobilePanel === "details" ? "selected" : ""}
            onClick={() => setMobilePanel("details")}
          >
            <Settings2 size={16} />
            Meus treinos
          </button>
        </nav>
        <footer className="tt-footer">
          {/* <span>
            <span className="tt-footer-star">✦</span>Pequenos intervalos.
            Grandes mudanças.
          </span> */}
          <button
            onClick={() => {
              if (install) {
                void install
                  .prompt()
                  .then(() => install.userChoice)
                  .then(() => setInstall(null));
              } else
                setDialog({
                  title: "Seu timer, sempre por perto",
                  description:
                    "No iPhone, abra o menu Compartilhar e escolha “Adicionar à Tela de Início”. No Android, abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”. Depois do carregamento completo, você pode treinar offline.",
                  confirm: "Entendi",
                  action: () => {},
                });
            }}
          >
            <Download size={14} />
            {offlineReady
              ? "Disponível offline · Instalar app"
              : !online
                ? "Você está offline"
                : "Levar para a tela inicial"}
            <ArrowRight size={13} />
          </button>
        </footer>
        <p className="tt-background-note">
          Relógio, bipes e avisos de fase em segundo plano após iniciar o treino.
        </p>
      </div>
      {preferencesOpen && (
        <PreferencesDialog close={() => setPreferencesOpen(false)}>
          <button
            className="tt-icon-button tt-dialog-close"
            aria-label="Fechar preferências"
            onClick={() => setPreferencesOpen(false)}
          >
            <X size={21} />
          </button>
          <span className="tt-eyebrow">DO SEU JEITO</span>
          <h2 id="preferences-title">Som, tela e foco.</h2>
          <p>Ajustes que acompanham o seu ritmo.</p>
          <Toggle
            checked={data.preferences.sound}
            onChange={() => preference("sound")}
            title="Bipes e relógio"
            description="Relógio contínuo, contagem 3–2–1 e mudanças de fase"
            icon={<Volume2 size={18} />}
          />
          <Toggle
            checked={data.preferences.voice}
            onChange={() => preference("voice")}
            title="Comandos por voz"
            description="Avisos de fase também em segundo plano"
            icon={<Mic size={18} />}
          />
          <Toggle
            checked={data.preferences.vibration}
            onChange={() => preference("vibration")}
            title="Vibração"
            description="Quando disponível no aparelho"
            icon={<Vibrate size={18} />}
          />
          <Toggle
            checked={data.preferences.keepAwake}
            onChange={() => preference("keepAwake")}
            title="Manter a tela acesa"
            description="Durante o treino visível, quando permitido"
            icon={<Smartphone size={18} />}
          />
          <Toggle
            checked={data.preferences.contrast}
            onChange={() => preference("contrast")}
            title="Alto contraste"
            description="Mais definição para treinar a distância"
            icon={<Sun size={18} />}
          />
          <button className="tt-button secondary" onClick={testAlerts}>
            <Volume2 size={17} />
            Testar alertas
          </button>
          <small>
            Os avisos de fase funcionam offline. Nomes personalizados dos
            exercícios são anunciados com o app aberto.
          </small>
          <small>
            No iPhone, o som toca também no modo silencioso e pode pausar
            músicas de outros apps. Use o volume de mídia para ajustar os
            alertas.
          </small>
          <button
            className="tt-button primary"
            onClick={() => setPreferencesOpen(false)}
          >
            <Check size={18} />
            Tudo certo
          </button>
        </PreferencesDialog>
      )}
      {dialog && (
        <ConfirmDialog
          key={dialog.title}
          dialog={dialog}
          close={() => setDialog(null)}
        />
      )}
      <div className={`tt-toast ${toast ? "visible" : ""}`} role="status">
        <Check size={16} />
        {toast}
      </div>
    </main>
  );
}

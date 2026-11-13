/** Pure timeline: UI refresh frequency never determines elapsed workout time. */
export interface Workout {
  name: string;
  sets: number;
  repetitions: number;
  preparation: number;
  exercise: number;
  rest: number;
  setRest: number;
  warmup: number;
  cooldown: number;
  exercises: string[];
}
export type PhaseKind =
  "preparation" | "warmup" | "exercise" | "rest" | "setRest" | "cooldown";
export interface Phase {
  kind: PhaseKind;
  label: string;
  duration: number;
  start: number;
  end: number;
  set: number;
  repetition: number;
  exerciseName: string;
}
export interface Execution {
  id: string;
  name: string;
  workout: Workout;
  startedAt: number;
  endedAt: number | null;
  pausedAt: number | null;
  pausedMs: number;
  skippedMs: number;
  skippedPhases: number;
  status: "running" | "paused" | "completed" | "interrupted";
  favorite: boolean;
}
export const CLASSIC: Workout = {
  name: "Tabata clássico",
  sets: 1,
  repetitions: 8,
  preparation: 10,
  exercise: 20,
  rest: 10,
  setRest: 60,
  warmup: 0,
  cooldown: 0,
  exercises: [],
};
export const PHASE_LABELS: Record<PhaseKind, string> = {
  preparation: "Prepare-se",
  warmup: "Aquecimento",
  exercise: "Exercício",
  rest: "Descanse",
  setRest: "Pausa entre séries",
  cooldown: "Desaquecimento",
};
export function timeline(workout: Workout): Phase[] {
  const phases: Phase[] = [];
  let cursor = 0;
  const add = (kind: PhaseKind, duration: number, set = 1, repetition = 1) => {
    if (duration <= 0) return;
    phases.push({
      kind,
      label: PHASE_LABELS[kind],
      duration,
      start: cursor,
      end: cursor + duration * 1000,
      set,
      repetition,
      exerciseName:
        workout.exercises[repetition - 1]?.trim() || `Exercício ${repetition}`,
    });
    cursor += duration * 1000;
  };
  add("preparation", workout.preparation);
  add("warmup", workout.warmup);
  for (let set = 1; set <= workout.sets; set++) {
    for (let repetition = 1; repetition <= workout.repetitions; repetition++) {
      add("exercise", workout.exercise, set, repetition);
      if (repetition < workout.repetitions || set === workout.sets) {
        add("rest", workout.rest, set, repetition);
      }
    }
    if (set < workout.sets)
      add("setRest", workout.setRest, set, workout.repetitions);
  }
  add("cooldown", workout.cooldown, workout.sets, workout.repetitions);
  return phases;
}
export function totalMs(workout: Workout): number {
  return (
    (workout.preparation +
      workout.warmup +
      workout.cooldown +
      workout.sets * workout.repetitions * workout.exercise +
      (workout.sets * (workout.repetitions - 1) + 1) * workout.rest +
      (workout.sets - 1) * workout.setRest) *
    1000
  );
}
export function position(
  execution: Execution,
  now: number,
  phases = timeline(execution.workout),
) {
  const total = totalMs(execution.workout);
  const clock = execution.endedAt ?? execution.pausedAt ?? now;
  const elapsed = Math.min(
    total,
    Math.max(
      0,
      clock - execution.startedAt - execution.pausedMs + execution.skippedMs,
    ),
  );
  const index = phases.findIndex((phase) => elapsed < phase.end);
  const phase = index < 0 ? null : phases[index];
  return {
    phases,
    phase,
    index,
    total,
    elapsed,
    remaining: Math.max(0, total - elapsed),
    phaseRemaining: phase ? Math.max(0, phase.end - elapsed) : 0,
    next: phase ? (phases[index + 1] ?? null) : null,
  };
}
export function begin(workout: Workout, now: number, id: string): Execution {
  return {
    id,
    name: workout.name,
    workout: { ...workout, exercises: [...workout.exercises] },
    startedAt: now,
    endedAt: null,
    pausedAt: null,
    pausedMs: 0,
    skippedMs: 0,
    skippedPhases: 0,
    status: "running",
    favorite: false,
  };
}
export function reconcile(execution: Execution, now: number): Execution {
  if (execution.status !== "running") return execution;
  if (
    now - execution.startedAt - execution.pausedMs + execution.skippedMs <
    totalMs(execution.workout)
  )
    return execution;
  return {
    ...execution,
    status: "completed",
    endedAt:
      execution.startedAt +
      execution.pausedMs +
      totalMs(execution.workout) -
      execution.skippedMs,
  };
}
export function pause(execution: Execution, now: number): Execution {
  const current = reconcile(execution, now);
  return current.status === "running"
    ? { ...current, status: "paused", pausedAt: now }
    : current;
}
export function resume(execution: Execution, now: number): Execution {
  return execution.status === "paused" && execution.pausedAt !== null
    ? {
        ...execution,
        status: "running",
        pausedMs: execution.pausedMs + Math.max(0, now - execution.pausedAt),
        pausedAt: null,
      }
    : execution;
}
export function skip(execution: Execution, now: number): Execution {
  const current = reconcile(execution, now);
  if (current.status !== "running" && current.status !== "paused")
    return current;
  const at = position(current, now);
  if (!at.phase) return current;
  const next = {
    ...current,
    skippedMs: current.skippedMs + at.phaseRemaining,
    skippedPhases: current.skippedPhases + 1,
  };
  // A paused clock can also finish by explicitly skipping its final phase.
  return position(next, now).remaining === 0
    ? {
        ...next,
        status: "completed",
        endedAt: current.pausedAt ?? now,
        pausedAt: null,
      }
    : next;
}
export function interrupt(execution: Execution, now: number): Execution {
  const current = reconcile(execution, now);
  return current.status === "running" || current.status === "paused"
    ? {
        ...current,
        status: "interrupted",
        endedAt: current.pausedAt ?? now,
        pausedAt: null,
      }
    : current;
}
export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

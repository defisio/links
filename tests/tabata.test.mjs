import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Transpile the pure modules in memory, without adding a runtime dependency or build artifacts.
const asModule = (source) =>
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
const engineURL = asModule(compile("../lib/tabata/engine.ts"));
const engine = await import(engineURL);
const require = createRequire(import.meta.url);
const storage = await import(
  asModule(
    compile("../lib/tabata/storage.ts")
      .replace(/from ['"]\.\/engine['"]/, `from '${engineURL}'`)
      .replace(
        /from ['"]zod['"]/,
        `from '${pathToFileURL(require.resolve("zod")).href}'`,
      ),
  )
);
const {
  CLASSIC,
  timeline,
  totalMs,
  begin,
  position,
  pause,
  resume,
  skip,
  interrupt,
  reconcile,
  formatTime,
} = engine;
const origin = 1_000_000;
const workout = (overrides) => ({ ...CLASSIC, exercises: [], ...overrides });
const execution = (overrides) =>
  begin(workout(overrides), origin, "execution-1");

test("classic includes the final rest and totals 4:10 with preparation", () => {
  const phases = timeline(CLASSIC);
  assert.equal(totalMs(CLASSIC), 250_000);
  assert.equal(phases.length, 17);
  assert.equal(phases.at(-1).kind, "rest");
  assert.equal(phases.at(-1).end, 250_000);
  assert.equal(totalMs(workout({ preparation: 0 })), 240_000);
});
test("set rest replaces the ordinary boundary rest, instead of adding both", () => {
  const sample = workout({ sets: 2, repetitions: 2 });
  assert.deepEqual(
    timeline(sample).map((p) => [p.kind, p.duration]),
    [
      ["preparation", 10],
      ["exercise", 20],
      ["rest", 10],
      ["exercise", 20],
      ["setRest", 60],
      ["exercise", 20],
      ["rest", 10],
      ["exercise", 20],
      ["rest", 10],
    ],
  );
  assert.equal(totalMs(sample), 180_000);
});
test("zero optional phases are omitted, including zero rest at the set boundary", () => {
  const sample = workout({ sets: 2, repetitions: 2, setRest: 0 });
  assert.equal(totalMs(sample), 120_000);
  assert.equal(timeline(sample).filter((p) => p.kind === "rest").length, 3);
  const continuous = workout({
    preparation: 0,
    warmup: 0,
    cooldown: 0,
    rest: 0,
    setRest: 0,
    sets: 2,
    repetitions: 2,
  });
  assert.deepEqual(
    timeline(continuous).map((p) => p.kind),
    Array(4).fill("exercise"),
  );
});
test("warmup and cooldown surround all sets and names repeat in each set", () => {
  const phases = timeline(
    workout({
      preparation: 0,
      sets: 2,
      repetitions: 2,
      warmup: 15,
      cooldown: 25,
      exercises: ["Prancha", ""],
    }),
  );
  assert.equal(phases[0].kind, "warmup");
  assert.equal(phases.at(-1).kind, "cooldown");
  assert.deepEqual(
    phases.filter((p) => p.kind === "exercise").map((p) => p.exerciseName),
    ["Prancha", "Exercício 2", "Prancha", "Exercício 2"],
  );
});
test("positions follow wall time exactly, even without intermediate UI ticks", () => {
  const e = execution();
  assert.equal(position(e, origin + 9999).phase.kind, "preparation");
  assert.equal(position(e, origin + 10_000).phase.kind, "exercise");
  const at = position(e, origin + 84_000);
  assert.equal(at.phase.repetition, 3);
  assert.equal(at.phase.kind, "exercise");
  assert.equal(at.phaseRemaining, 6000);
  assert.equal(at.remaining, 166_000);
});
test("pause freezes both clocks; resume excludes all paused wall time", () => {
  const paused = pause(execution(), origin + 15_000);
  assert.equal(position(paused, origin + 800_000).elapsed, 15_000);
  const resumed = resume(paused, origin + 65_000);
  assert.equal(position(resumed, origin + 66_000).elapsed, 16_000);
  assert.equal(resumed.pausedMs, 50_000);
});
test("skip removes only the current phase remainder and preserves original total", () => {
  const skipped = skip(execution(), origin + 15_000);
  const at = position(skipped, origin + 15_000);
  assert.equal(at.phase.kind, "rest");
  assert.equal(at.phase.repetition, 1);
  assert.equal(at.total, 250_000);
  assert.equal(at.remaining, 220_000);
  assert.equal(skipped.skippedMs, 15_000);
  assert.equal(skipped.skippedPhases, 1);
});
test("skip while paused stays paused, including after reload", () => {
  const skipped = skip(pause(execution(), origin + 15_000), origin + 90_000);
  const recovered = JSON.parse(JSON.stringify(skipped));
  assert.equal(recovered.status, "paused");
  assert.equal(position(recovered, origin + 999_000).phase.kind, "rest");
  assert.equal(position(recovered, origin + 999_000).phaseRemaining, 10_000);
});
test("skipping the final paused phase completes and records the skip", () => {
  const sample = execution({ preparation: 0, repetitions: 1, rest: 0 });
  const ended = skip(pause(sample, origin + 4000), origin + 50_000);
  assert.equal(ended.status, "completed");
  assert.equal(ended.skippedPhases, 1);
  assert.equal(position(ended, origin + 200_000).remaining, 0);
});
test("late recovery completes once at the logical deadline; pause and skips affect deadline", () => {
  const e = resume(pause(execution(), origin + 5000), origin + 55_000);
  const skipped = skip(e, origin + 56_000);
  const ended = reconcile(skipped, origin + 600_000);
  assert.equal(ended.status, "completed");
  assert.equal(ended.endedAt, origin + 296_000);
  assert.deepEqual(reconcile(ended, origin + 900_000), ended);
});
test("interruption preserves elapsed exercise time and does not change a completed result", () => {
  const e = interrupt(pause(execution(), origin + 14_000), origin + 50_000);
  assert.equal(e.status, "interrupted");
  assert.equal(position(e, origin + 60_000).elapsed, 14_000);
  assert.equal(interrupt(execution(), origin + 400_000).status, "completed");
});
test("an execution is a snapshot independent from draft and model edits", () => {
  const model = workout({ exercises: ["Prancha"] });
  const e = begin(model, origin, "snapshot");
  model.exercise = 50;
  model.exercises[0] = "Agachamento";
  assert.equal(e.workout.exercise, 20);
  assert.equal(e.workout.exercises[0], "Prancha");
});
test("timeline durations remain contiguous and match total across varied valid configurations", () => {
  for (const sets of [1, 2, 5])
    for (const repetitions of [1, 3, 8])
      for (const rest of [0, 1, 10]) {
        const sample = workout({
          sets,
          repetitions,
          rest,
          preparation: 3,
          warmup: 7,
          cooldown: 4,
        });
        const phases = timeline(sample);
        assert.equal(phases[0].start, 0);
        assert.equal(phases.at(-1).end, totalMs(sample));
        for (let i = 1; i < phases.length; i++)
          assert.equal(phases[i].start, phases[i - 1].end);
      }
});
test("display rounds up fractional seconds and supports long workouts", () => {
  assert.equal(formatTime(1), "00:01");
  assert.equal(formatTime(60_001), "01:01");
  assert.equal(formatTime(3_600_000), "60:00");
  assert.equal(formatTime(-1), "00:00");
});
test("history keeps 100 nonfavorites plus all favorites and the active execution", () => {
  const records = Array.from({ length: 130 }, (_, index) => ({
    ...execution(),
    id: String(index),
    startedAt: origin + index,
    status: "completed",
    endedAt: origin + index + 1000,
    favorite: index < 5,
  }));
  records.push({ ...execution(), id: "active", startedAt: origin - 1 });
  const kept = storage.trimExecutions(records);
  assert.equal(kept.filter((e) => e.favorite).length, 5);
  assert.equal(
    kept.filter((e) => e.status === "completed" && !e.favorite).length,
    100,
  );
  assert.equal(kept.find((e) => e.id === "active").status, "running");
});
test("storage validates records and recovers without deleting invalid raw data", () => {
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });
  const data = storage.emptyData();
  data.executions.push(execution());
  storage.writeData(data);
  assert.equal(storage.readData().data.executions[0].id, "execution-1");
  const broken = "{not json";
  values.set(storage.STORAGE_KEY, broken);
  assert.ok(storage.readData().error);
  assert.equal(values.get(storage.STORAGE_KEY), broken);
  assert.equal(storage.validWorkout(workout({ exercise: 0 })), false);
  assert.equal(storage.validWorkout(workout({ repetitions: 1.5 })), false);
  assert.equal(storage.validWorkout(workout({ rest: 0 })), true);
});

test("clearing a draft name while editing does not invalidate saved history", () => {
  const data = storage.emptyData();
  data.draft.name = "";
  data.executions = [execution()];
  storage.writeData(data);
  const recovered = storage.readData();
  assert.equal(recovered.error, undefined);
  assert.equal(recovered.data.draft.name, "");
  assert.equal(recovered.data.executions.length, 1);
  assert.equal(storage.validWorkout(data.draft), false);
});

test("voice, beeps and vibration start enabled", () => {
  assert.equal(storage.DEFAULT_PREFERENCES.voice, true);
  assert.equal(storage.DEFAULT_PREFERENCES.sound, true);
  assert.equal(storage.DEFAULT_PREFERENCES.vibration, true);
});

test("alert ownership transfers without repeating already emitted phase signals", async () => {
  const { WorkoutAlerts } = await import(
    asModule(compile("../lib/tabata/alerts.ts"))
  );
  const first = new WorkoutAlerts();
  const second = new WorkoutAlerts();
  assert.equal(first.claim("shared-execution:1"), true);
  assert.equal(first.claim("shared-execution:1"), false);
  assert.equal(second.claim("shared-execution:1"), false);
  assert.equal(second.claim("shared-execution:1:3"), true);
  assert.equal(first.claim("shared-execution:1:3"), false);
  assert.equal(second.claim("shared-execution:2"), true);
});

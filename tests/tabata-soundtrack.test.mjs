import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const source = ts.transpileModule(
  readFileSync(
    new URL("../lib/tabata/audio-track.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { renderWorkoutTrack, TRACK_SAMPLE_RATE } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const phases = [
  { kind: "preparation", start: 0, end: 5000, duration: 5 },
  { kind: "exercise", start: 5000, end: 15000, duration: 10 },
  { kind: "rest", start: 15000, end: 20000, duration: 5 },
];
function hasTone(buffer, atMs, durationMs = 100) {
  const bytes = new Uint8Array(buffer, 44);
  const start = Math.round((atMs * TRACK_SAMPLE_RATE) / 1000);
  return bytes
    .slice(start, start + (durationMs * TRACK_SAMPLE_RATE) / 1000)
    .some((value) => value !== 128);
}
test("background track is valid PCM WAV containing future alerts without running JS timers", () => {
  const { buffer, durationMs } = renderWorkoutTrack(phases);
  const header = new DataView(buffer);
  assert.equal(new TextDecoder().decode(new Uint8Array(buffer, 0, 4)), "RIFF");
  assert.equal(header.getUint32(24, true), TRACK_SAMPLE_RATE);
  assert.equal(header.getUint16(34, true), 8);
  assert.equal(durationMs, 23000);
  for (const at of [
    0, 2000, 3000, 4000, 5000, 12000, 13000, 14000, 15000, 17000, 18000, 19000,
    20000,
  ])
    assert.ok(hasTone(buffer, at), `Missing alert at ${at}ms`);
  assert.equal(hasTone(buffer, 8000), false);
});
test("resume and skip render only future cues at the correct remaining offsets", () => {
  const { buffer, durationMs } = renderWorkoutTrack(phases, 7000);
  assert.equal(durationMs, 16000);
  assert.equal(
    hasTone(buffer, 0),
    false,
    "Do not replay the exercise start from 2 seconds ago",
  );
  assert.ok(hasTone(buffer, 5000), "Exercise countdown at absolute 12 seconds");
  assert.ok(hasTone(buffer, 8000), "Rest starts at absolute 15 seconds");
  assert.ok(hasTone(buffer, 13000), "Completion remains at the logical finish");
});
test("track allocation is bounded for unusually long routines", () => {
  assert.throws(
    () =>
      renderWorkoutTrack([
        { kind: "exercise", start: 0, end: 3 * 3600000, duration: 10800 },
      ]),
    /2 horas/,
  );
});

test("a phase just started by skip still has an immediate transition cue despite a few milliseconds of state commit delay", () => {
  const { buffer } = renderWorkoutTrack(phases, 5010);
  assert.ok(
    hasTone(buffer, 0),
    "Do not lose the current transition while committing the new timer position",
  );
});

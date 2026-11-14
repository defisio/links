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
  assert.equal(TRACK_SAMPLE_RATE, 16000);
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

test('phase voices are inside the media track even with beeps disabled and no SpeechSynthesis running', () => {
  const clip=new Uint8Array(800).fill(200);
  const {buffer}=renderWorkoutTrack(phases,0,{sound:false,voice:true,voices:{preparation:clip,exercise:clip,rest:clip,complete:clip}});
  const bytes=new Uint8Array(buffer,44);
  for (const at of [0,5000,15000,20000]) {
    const start=Math.round(at*TRACK_SAMPLE_RATE/1000);
    assert.ok(bytes.slice(start,start+1600).some(value=>value===200),`Missing recorded voice at ${at}`);
  }
  assert.equal(hasTone(buffer,12000),false,'Voice-only playback must not emit the countdown beeps');
});

test('disabling both voice and beeps renders no audible samples',()=>{
  const clip=new Uint8Array(800).fill(200);
  const {buffer}=renderWorkoutTrack(phases,0,{sound:false,voice:false,voices:{preparation:clip,exercise:clip,rest:clip,complete:clip}});
  assert.equal(new Uint8Array(buffer,44).some(value=>value!==128),false);
});

const voiceSource = ts.transpileModule(
  readFileSync(new URL("../lib/tabata/phase-voices.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
).outputText;
const { getPhaseVoices, getWorkoutEffects, AUDIO_ASSET_SAMPLE_RATE, PHASE_VOICE_TEXT } = await import(
  `data:text/javascript;base64,${Buffer.from(voiceSource).toString("base64")}`
);
test("all packaged Portuguese phase voices are non-silent and present in the resulting media samples", () => {
  const voices = getPhaseVoices();
  assert.equal(Object.keys(voices).length, 8);
  for (const [kind, clip] of Object.entries(voices)) {
    assert.ok(PHASE_VOICE_TEXT[kind]);
    assert.ok(clip.length > TRACK_SAMPLE_RATE / 2 && clip.length < TRACK_SAMPLE_RATE * 2);
    assert.ok(clip.some(value => Math.abs(value - 128) > 20));
    if (kind === "test") continue;
    const { buffer } = renderWorkoutTrack([
      { kind: kind === "complete" ? "rest" : kind, start: 0, end: 5000, duration: 5 },
    ], 0, { sound: false, voice: true, voices });
    const start = 44 + (kind === "complete" ? 5060 : 60) * TRACK_SAMPLE_RATE / 1000;
    assert.deepEqual(new Uint8Array(buffer, start, clip.length), clip, kind);
  }
  const preview = readFileSync(new URL("../public/timer/voice-test.wav", import.meta.url));
  assert.deepEqual(new Uint8Array(preview.subarray(44)), voices.test);
});
test("voice-only recovery skips past announcements and keeps the next phase at its original deadline", () => {
  const { buffer } = renderWorkoutTrack(phases, 7000, {
    sound: false, voice: true, voices: getPhaseVoices(),
  });
  assert.equal(hasTone(buffer, 0, 3000), false);
  assert.ok(hasTone(buffer, 8060, 1500));
  assert.ok(hasTone(buffer, 13060, 1500));
});

test("packaged effects match offline previews and the media-track sample rate", () => {
  assert.equal(AUDIO_ASSET_SAMPLE_RATE, TRACK_SAMPLE_RATE);
  const effects = getWorkoutEffects();
  assert.deepEqual(Object.keys(effects).sort(), ["complete","countdown","transition"]);
  for (const key of ["complete","countdown","transition"]) {
    const file=readFileSync(new URL(`../public/timer/${key}.wav`,import.meta.url));
    assert.equal(file.readUInt32LE(24),TRACK_SAMPLE_RATE);
    assert.deepEqual(new Uint8Array(file.subarray(44)),effects[key]);
  }
  const {buffer}=renderWorkoutTrack(phases,0,{sound:true,voice:true,voices:getPhaseVoices(),effects});
  assert.equal(hasTone(buffer,8000,300),false,"Keep silence between scheduled announcements and alerts");
  const resumed=renderWorkoutTrack(phases,7000,{sound:true,voice:true,voices:getPhaseVoices(),effects}).buffer;
  assert.equal(hasTone(resumed,0,500),false,"Resuming must not introduce a continuous clock");
  assert.equal(new Uint8Array(buffer,44).some(value=>value===0||value===255),false,"Keep headroom when all recorded clips are mixed");
});

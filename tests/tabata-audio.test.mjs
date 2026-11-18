import * as siteConfigModule from "../lib/site-config.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import ts from "typescript";

const trackExports = {};
const trackSource = ts.transpileModule(
  readFileSync(
    new URL("../lib/tabata/audio-track.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
new Script(trackSource).runInNewContext({
  exports: trackExports,
  module: { exports: trackExports },
  ArrayBuffer,
  Uint8Array,
  DataView,
});
const voiceExports = {};
new Script(ts.transpileModule(
  readFileSync(new URL("../lib/tabata/phase-voices.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText).runInNewContext({ exports: voiceExports, atob });
const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/tabata/alerts.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const preferences = { sound: true, voice: false, vibration: false };
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function audioEnvironment({
  session = true,
  deferred = false,
  apple = true,
} = {}) {
  const logs = { contexts: [], tones: [], media: [], errors: [] };
  const audioSession = { type: "ambient" };
  let releaseResume;
  let gesture = true;
  class Context {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
      logs.contexts.push({ context: this, category: audioSession.type });
    }
    resume() {
      if (deferred)
        return new Promise((resolve) => {
          releaseResume = () => {
            this.state = "running";
            resolve();
          };
        });
      this.state = "running";
      return Promise.resolve();
    }
    suspend() {
      this.state = "suspended";
      return Promise.resolve();
    }
    close() {
      this.state = "closed";
      return Promise.resolve();
    }
    createOscillator() {
      return {
        frequency: {},
        connect() {},
        disconnect() {},
        start: () =>
          logs.tones.push({
            audible: audioSession.type === "playback",
            state: this.state,
          }),
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  class Media {
    constructor() {
      this.paused = true;
      this.ended = false;
      this.src = "";
      this.currentTime = 0;
      this.volume = 1;
    }
    play() {
      if (gesture) this.unlocked = true;
      if (!this.unlocked)
        return Promise.reject(new Error("User gesture required"));
      this.paused = false;
      logs.media.push(this.src);
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  const exports = {};
  const navigator = {
    userAgent: apple ? "iPhone" : "Chrome",
    platform: apple ? "iPhone" : "Linux",
    maxTouchPoints: apple ? 5 : 0,
  };
  if (session) navigator.audioSession = audioSession;
  new Script(compiled).runInNewContext({
    exports,
    module: { exports },
    navigator,
    require: name => name.endsWith("site-config.mjs") ? siteConfigModule : name === "./phase-voices" ? voiceExports : trackExports,
    URL,
    Blob,
    window: { AudioContext: Context },
    AudioContext: Context,
    Audio: Media,
    setTimeout,
    clearTimeout,
    localStorage: { getItem: () => null, setItem() {} },
  });
  const alerts = new exports.WorkoutAlerts({
    mediaBase: "/links/timer/",
    onError: (message) => logs.errors.push(message),
  });
  return {
    alerts,
    logs,
    audioSession,
    finishResume: () => releaseResume(),
    setGesture: (value) => {
      gesture = value;
    },
  };
}

test("iPhone silent-mode policy: playback is selected before activating Web Audio", async () => {
  const { alerts, logs, audioSession } = audioEnvironment();
  await alerts.enable(preferences);
  alerts.countdown(preferences);
  await flush();
  assert.equal(audioSession.type, "playback");
  assert.equal(logs.contexts[0].category, "playback");
  assert.ok(
    logs.tones.some((tone) => tone.audible),
    "The alert must use the media category instead of the muted ringer category",
  );
  alerts.dispose();
});
test("an alert waits for async AudioContext resume instead of being silently dropped", async () => {
  const { alerts, logs, finishResume } = audioEnvironment({ deferred: true });
  const ready = alerts.enable(preferences);
  alerts.countdown(preferences);
  assert.equal(logs.tones.length, 0);
  finishResume();
  await ready;
  await flush();
  assert.equal(logs.tones.length, 1);
  alerts.dispose();
});
test("deactivation releases the playback session and blocks queued alerts", async () => {
  const { alerts, logs, audioSession, finishResume } = audioEnvironment({
    deferred: true,
  });
  const ready = alerts.enable(preferences);
  alerts.countdown(preferences);
  alerts.deactivate();
  finishResume();
  await ready;
  await flush();
  assert.equal(audioSession.type, "ambient");
  assert.equal(logs.tones.length, 0);
  alerts.dispose();
});
test("older iPhones use an unlocked media element when Audio Session is unavailable", async () => {
  const { alerts, logs } = audioEnvironment({ session: false });
  await alerts.enable(preferences);
  alerts.countdown(preferences);
  await flush();
  assert.ok(logs.media.some((url) => url.endsWith("/ready.wav")));
  assert.ok(logs.media.some((url) => url.endsWith("/countdown.wav")));
  assert.equal(logs.contexts.length, 0);
  alerts.dispose();
});
test("fully muted preferences do not take over the music session", async () => {
  const { alerts, logs, audioSession } = audioEnvironment();
  await alerts.enable({ ...preferences, sound: false });
  assert.equal(audioSession.type, "ambient");
  assert.equal(logs.contexts.length, 0);
  assert.equal(logs.media.length, 0);
  alerts.dispose();
});

test("the soundtrack reuses the media element unlocked by the tap after async workout persistence", async () => {
  const { alerts, logs, setGesture } = audioEnvironment();
  const ready = alerts.prepareWorkout(preferences);
  setGesture(false);
  await ready;
  alerts.playWorkout(
    [{ kind: "exercise", start: 0, end: 20000, duration: 20 }],
    0,
    preferences,
    "Teste",
  );
  await flush();
  assert.ok(logs.media.some((src) => src.startsWith("blob:")));
  assert.equal(alerts.hasWorkoutTrack, true);
  alerts.countdown(preferences);
  await flush();
  assert.equal(
    logs.tones.length,
    0,
    "Do not duplicate the prerecorded cues with JS-timed oscillators",
  );
  assert.deepEqual(logs.errors, []);
  alerts.dispose();
});

test("voice-only workouts unlock and play prerecorded phase announcements without SpeechSynthesis", async () => {
  const { alerts, logs, setGesture } = audioEnvironment();
  const voiceOnly = { ...preferences, sound: false, voice: true };
  const ready = alerts.prepareWorkout(voiceOnly);
  setGesture(false);
  await ready;
  alerts.playWorkout([{ kind: "exercise", start: 0, end: 20000, duration: 20 }], 0, voiceOnly, "Voz");
  await flush();
  assert.ok(logs.media.some(src => src.endsWith("/unlock.wav")));
  assert.ok(logs.media.some(src => src.startsWith("blob:")));
  assert.equal(alerts.hasWorkoutTrack, true);
  alerts.transition({kind: "exercise", exerciseName: "Exercício 1"}, undefined, voiceOnly);
  alerts.complete(voiceOnly);
  assert.equal(logs.tones.length, 0);
  assert.deepEqual(logs.errors, []);
  alerts.dispose();
});

test("Test alerts uses the user recordings for both sound and voice", async () => {
  const {alerts,logs}=audioEnvironment();
  alerts.test({...preferences,voice:true});
  await flush();
  assert.ok(logs.media.some(src=>src.endsWith("/transition.wav")));
  assert.ok(logs.media.some(src=>src.endsWith("/voice-test.wav")));
  assert.equal(logs.tones.length,0);
  assert.deepEqual(logs.errors,[]);
  alerts.dispose();
});

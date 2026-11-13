import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import ts from "typescript";

const require = createRequire(import.meta.url);
const project = resolve(new URL("..", import.meta.url).pathname);
function loadApp() {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const localRequire = (name) => {
      if (name.endsWith(".css")) return {};
      if (name === "next/link")
        return {
          __esModule: true,
          default: ({ children, ...props }) =>
            createElement("a", props, children),
        };
      if (name === "@/lib/utils")
        return { assetPath: (path) => "/links" + path };
      if (name.startsWith("@/") || name.startsWith("./")) {
        const base = name.startsWith("@/")
          ? resolve(project, name.slice(2))
          : resolve(dirname(file), name);
        return load(base + (base.endsWith("tabata-app") ? ".tsx" : ".ts"));
      }
      return require(name);
    };
    new Script(`(function(require,module,exports){${code}\n})`, {
      filename: file,
    }).runInThisContext()(localRequire, module, module.exports);
    return module.exports;
  }
  return load(resolve(project, "components/tabata/tabata-app.tsx")).TabataApp;
}

test("real timer controls keep the background track aligned across hide, pause, skip, resume, mute and lock-screen actions", async () => {
  const dom = new JSDOM('<div id="root"></div>', {
    url: "https://example.com/links/timer/",
    pretendToBeVisual: true,
  });
  const players = [];
  const actions = new Map();
  const descriptors = new Map();
  let visible = true;
  Object.defineProperty(dom.window.document, "visibilityState", {
    configurable: true,
    get: () => (visible ? "visible" : "hidden"),
  });
  Object.defineProperty(dom.window.navigator, "audioSession", {
    value: { type: "ambient" },
    configurable: true,
  });
  Object.defineProperty(dom.window.navigator, "mediaSession", {
    value: { setActionHandler: (name, handler) => actions.set(name, handler) },
    configurable: true,
  });
  Object.defineProperty(dom.window.navigator, "locks", {
    value: {
      request: async (name, options, callback) =>
        typeof options === "function" ? options() : callback({ name }),
    },
    configurable: true,
  });
  class Context {
    constructor() {
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
    }
    resume() {
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
        start() {},
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
      this.src = "";
      this.paused = true;
      this.ended = false;
      this.currentTime = 0;
      players.push(this);
    }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      const changed = !this.paused;
      this.paused = true;
      if (changed) queueMicrotask(() => this.onpause?.());
    }
  }
  class Channel {
    postMessage() {}
    close() {}
  }
  dom.window.AudioContext = Context;
  const speech = { cancel() {}, getVoices: () => [], speak() {} };
  dom.window.speechSynthesis = speech;
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    localStorage: dom.window.localStorage,
    Audio: Media,
    AudioContext: Context,
    SpeechSynthesisUtterance: Utterance,
    BroadcastChannel: Channel,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    descriptors.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  let root;
  try {
    const App = loadApp();
    root = createRoot(document.getElementById("root"));
    await act(async () => root.render(createElement(App)));
    const click = async (selector) => {
      const button = document.querySelector(selector);
      assert.ok(button, selector);
      await act(async () =>
        button.dispatchEvent(
          new dom.window.MouseEvent("click", { bubbles: true }),
        ),
      );
    };
    const data = () => JSON.parse(localStorage.getItem("de-fisio.tabata.v1"));
    await click(".tt-start");
    assert.equal(data().executions[0].status, "running");
    const player = players.find((p) => p.src.startsWith("blob:"));
    assert.ok(
      player,
      "A full workout must be delegated to a real media element",
    );
    assert.equal(player.paused, false);
    assert.equal(navigator.mediaSession.playbackState, "playing");
    const firstURL = player.src;
    visible = false;
    await act(async () =>
      document.dispatchEvent(new dom.window.Event("visibilitychange")),
    );
    assert.equal(
      player.paused,
      false,
      "Hiding the page must not stop the soundtrack",
    );
    visible = true;
    await act(async () =>
      document.dispatchEvent(new dom.window.Event("visibilitychange")),
    );
    await click(".tt-main-control");
    assert.equal(data().executions[0].status, "paused");
    assert.equal(player.paused, true);
    await click('[aria-label="Pular fase"]');
    assert.equal(data().executions[0].status, "paused");
    assert.equal(data().executions[0].skippedPhases, 1);
    await click(".tt-main-control");
    assert.equal(data().executions[0].status, "running");
    assert.equal(player.paused, false);
    assert.notEqual(player.src, firstURL);
    await click('[aria-label="Desativar bipes"]');
    assert.equal(data().preferences.sound, false);
    assert.equal(
      player.paused,
      true,
      "Muting must stop the pre-rendered audio too",
    );
    await click('[aria-label="Ativar bipes"]');
    assert.equal(player.paused, false);
    await act(async () => actions.get("pause")());
    assert.equal(data().executions[0].status, "paused");
    assert.equal(typeof actions.get("play"), "function");
    assert.equal(navigator.mediaSession.playbackState, "paused");
    await act(async () => actions.get("play")());
    assert.equal(data().executions[0].status, "running");
    assert.equal(player.paused, false);
    assert.equal(
      data().executions.length,
      1,
      "Controls must not create duplicate executions",
    );
    await act(async () => root.unmount());
    root = createRoot(document.getElementById("root"));
    await act(async () => root.render(createElement(App)));
    assert.ok(
      document.querySelector(".tt-audio-recovery"),
      "A restored running workout needs a user gesture to restore media playback",
    );
    await click(".tt-audio-recovery");
    assert.equal(data().executions[0].status, "running");
    assert.equal(players.at(-1).paused, false);
    assert.equal(
      data().executions.length,
      1,
      "Restoring audio must not restart the workout",
    );
  } finally {
    if (root) await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

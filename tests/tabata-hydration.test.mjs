import * as siteConfigModule from "../lib/site-config.mjs";
import * as sitePresentationModule from "../lib/site-presentation.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import React, { act, createElement, useState } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import ts from "typescript";

// Exercise the real layout, stubbing only Next's font/build-time imports.
const require = createRequire(import.meta.url);
const module = { exports: {} };
const source = readFileSync(
  new URL("../app/layout.tsx", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
new Script(compiled).runInNewContext({
  module,
  exports: module.exports,
  require: (name) =>
    name === "@/lib/site-config.mjs" ? siteConfigModule
      : name === "@/lib/site-presentation.mjs" ? sitePresentationModule
      : name === "next/font/local"
      ? { __esModule: true, default: () => ({ variable: "test-font" }) }
      : name === "@/lib/utils"
        ? { assetPath: (path) => path }
        : name.endsWith(".css")
          ? {}
          : require(name),
});
const RootLayout = module.exports.default;
function Controls({ phase }) {
  const [running, setRunning] = useState(false);
  return createElement(
    "main",
    { "data-timer-phase": phase },
    createElement(
      "button",
      { onClick: () => setRunning((value) => !value) },
      running ? "Pausar" : "Iniciar",
    ),
  );
}
async function hydrate({ extensions = false, mismatch = false } = {}) {
  const tree = (phase) =>
    createElement(RootLayout, null, createElement(Controls, { phase }));
  const dom = new JSDOM(
    "<!DOCTYPE html>" + renderToString(tree("preparation")),
    { url: "https://example.com/timer/" },
  );
  const document = dom.window.document;
  if (extensions) {
    document.documentElement.setAttribute("webcrx", "");
    document.documentElement.setAttribute("webcrx-bridged", "");
    document.head.setAttribute(
      "data-locator-hook-status-message",
      "loading: No valid renderers found.",
    );
    document.body.setAttribute("cz-shortcut-listen", "true");
  }
  const originals = new Map();
  const globals = {
    window: dom.window,
    document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const errors = [];
  const error = console.error;
  console.error = (...args) => errors.push(args.map(String).join(" "));
  let root;
  try {
    await act(async () => {
      root = hydrateRoot(
        document,
        tree(mismatch ? "exercise" : "preparation"),
        { onRecoverableError: (error) => errors.push(error.message) },
      );
    });
    await act(async () =>
      document
        .querySelector("button")
        .dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })),
    );
    assert.equal(
      document.querySelector("button").textContent,
      "Pausar",
      "Hydration must attach working event handlers",
    );
    return errors;
  } finally {
    if (root) await act(async () => root.unmount());
    console.error = error;
    dom.window.close();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

test("root layout hydrates without warnings and controls work without extensions", async () => {
  assert.deepEqual(await hydrate(), []);
});
test("extension attributes on html, head and body do not trigger hydration errors", async () => {
  assert.deepEqual(await hydrate({ extensions: true }), []);
});
test("real mismatches inside app components still produce hydration warnings", async () => {
  const errors = await hydrate({ mismatch: true });
  assert.ok(
    errors.some((error) => /hydrated|hydration/i.test(error)),
    errors.join("\n"),
  );
});

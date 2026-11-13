import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { Script, createContext } from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

function environment(cryptography, overrides = {}) {
  const exports = {};
  const context = createContext({
    crypto: cryptography,
    Uint8Array,
    module: { exports },
    exports,
    ...overrides,
  });
  const file = new URL("../lib/tabata/id.ts", import.meta.url);
  if (existsSync(file)) {
    const code = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    new Script(code).runInContext(context);
    context.createId = exports.createId;
  }
  return context;
}
const app = readFileSync(
  new URL("../components/tabata/tabata-app.tsx", import.meta.url),
  "utf8",
);
const callsites = [...app.matchAll(/const id = ([\w.]+\(\));/g)].map(
  (match) => match[1],
);

test("starting workouts and saving models both work when crypto.randomUUID is absent", () => {
  const context = environment({
    getRandomValues: (array) => webcrypto.getRandomValues(array),
  });
  assert.equal(callsites.length, 2, "Exercise the two real UI ID callsites");
  const ids = callsites.map((call) => new Script(call).runInContext(context));
  assert.equal(new Set(ids).size, 2);
  for (const id of ids)
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
});

test("ID creation uses native UUID when available, retaining its crypto receiver", () => {
  const crypto = {
    randomUUID() {
      assert.equal(this, crypto);
      return "native-id";
    },
  };
  const context = environment(crypto);
  assert.equal(new Script(callsites[0]).runInContext(context), "native-id");
});

test("local record IDs still work without any Web Crypto API", () => {
  class FixedDate extends Date {
    static now() {
      return 1000;
    }
  }
  const context = environment(undefined, {
    Date: FixedDate,
    Math: { ...Math, random: () => 0.5 },
  });
  const ids = new Set(
    Array.from({ length: 1000 }, () =>
      new Script(callsites[0]).runInContext(context),
    ),
  );
  assert.equal(ids.size, 1000);
});

test("a rejected native UUID falls back to getRandomValues", () => {
  const context = environment({
    randomUUID: () => {
      throw new Error("API blocked");
    },
    getRandomValues: (array) => webcrypto.getRandomValues(array),
  });
  assert.match(
    new Script(callsites[0]).runInContext(context),
    /^[0-9a-f-]{36}$/,
  );
});

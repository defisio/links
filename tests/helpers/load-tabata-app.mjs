import * as siteConfigModule from "../../lib/site-config.mjs";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import { createElement } from "react";
import ts from "typescript";

const require = createRequire(import.meta.url);
const project = resolve(new URL("../..", import.meta.url).pathname);
export function loadApp() {
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
      if (name.endsWith("site-config.mjs")) return siteConfigModule;
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


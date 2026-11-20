import { readFile, mkdir, access } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const command = args[0] || "dev";
const allowed = new Set(["dev", "build", "start", "test", "typecheck", "check:config", "check:site-export", "sync"]);
if (!allowed.has(command)) throw new Error(`Comando desconhecido: ${command}`);
function run(program, values, cwd) {
  const result = spawnSync(program, values, { cwd, stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
const output = resolve(root, ".site");
if (command === "start") {
  await access(resolve(output, "out/index.html")).catch(() => { throw new Error("Execute npm run build antes de iniciar o site exportado."); });
  run("yarn", ["start"], output);
} else {
  const config = JSON.parse(await readFile(resolve(root, "central.config.json"), "utf8"));
  if (config.schemaVersion !== 1 || !/^[\w-]+\/[\w.-]+$/.test(config.repository) || !/^[a-f0-9]{40}$/.test(config.revision))
    throw new Error("central.config.json deve indicar o repositório e o SHA completo da versão aprovada.");
  const localSource = args.includes("--source") ? args[args.indexOf("--source") + 1] : process.env.CENTRAL_LINKS_SOURCE;
  let source;
  if (localSource) {
    source = resolve(root, localSource);
    console.log(`Usando central local: ${source}`);
  } else {
    source = resolve(root, ".central-links/core");
    await mkdir(source, { recursive: true });
    const exists = await access(resolve(source, ".git")).then(() => true, () => false);
    if (!exists) run("git", ["init", "--quiet"], source);
    // This checkout is a disposable cache; the professional's repository is never reset.
    run("git", ["fetch", "--quiet", "--depth=1", `https://github.com/${config.repository}.git`, config.revision], source);
    run("git", ["checkout", "--quiet", "--detach", "FETCH_HEAD"], source);
  }
  run(process.execPath, [resolve(source, "scripts/compose-site.mjs"), "--site", root, "--output", output], root);
  if (command !== "sync") {
    run("yarn", ["install", "--immutable"], output);
    run("yarn", [command], output);
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { siteConfig, assetPath, siteURL, getSiteLinks, getTabataKeys } from "../lib/site-config.mjs";
import { parseSiteConfig } from "../lib/site-schema.mjs";
import { getSiteMetadata, getTimerMetadata, getStructuredData, serializeStructuredData, getTimerManifest } from "../lib/site-presentation.mjs";
import { validateSiteAssets } from "../scripts/validate-site-config.mjs";
import { prepareSiteExport } from "../scripts/prepare-site-export.mjs";

function otherSite() {
  return parseSiteConfig({
    ...structuredClone(siteConfig),
    id: "perfil-teste",
    site: { origin: "https://perfil.example", basePath: "/consultorio", language: "pt-BR", locale: "pt_BR" },
    profile: { name: "Profissional de teste", jobTitle: "Fisioterapeuta", bio: "Apresentação de teste" },
    assets: {
      avatar: { src: "/placeholder.svg", alt: "Foto de teste", width: 120, height: 120 },
      socialImage: { src: "/placeholder.svg", alt: "Imagem de teste", width: 120, height: 120 },
      favicon: "/placeholder.svg",
    },
    links: [
      { id: "contato", icon: "email", href: "mailto:contato@perfil.example", label: "Contato", showInFooter: true },
      { id: "timer", icon: "timer", href: "/timer/", label: "Cronômetro", feature: "tabata" },
    ],
    seo: { title: "Site de teste", description: "Descrição de teste" },
    timer: {
      name: "Timer de teste", shortName: "Timer teste", description: "Treinos de teste",
      installDescription: "Instalação de teste", icons: structuredClone(siteConfig.timer.icons),
    },
  });
}

test("a second profile controls canonical URLs, sharing, structured data and installed identity without Debora data", () => {
  const config = otherSite();
  const home = getSiteMetadata(config);
  const timer = getTimerMetadata(config);
  const manifest = getTimerManifest(config);
  assert.equal(home.alternates.canonical, "https://perfil.example/consultorio/");
  assert.equal(home.icons.icon, "/consultorio/placeholder.svg");
  assert.equal(home.verification, undefined);
  assert.equal(timer.alternates.canonical, "https://perfil.example/consultorio/timer/");
  assert.equal(timer.title, "Timer de teste");
  assert.equal(manifest.short_name, "Timer teste");
  assert.equal(manifest.start_url, "/consultorio/timer/");
  const data = getStructuredData(config);
  assert.equal(data.length, 2, "Optional business data must not be inherited from the original profile");
  assert.equal(data[1].name, config.profile.name);
  assert.doesNotMatch(JSON.stringify({ home, timer, manifest, data }), /Débora|deborae|defisio|559899|de-fisio|\/links/);
});

test("deployment paths support project Pages and root/custom domains, without modifying external links", () => {
  const config = otherSite();
  assert.equal(assetPath("/foto.png", config), "/consultorio/foto.png");
  assert.equal(assetPath("foto.png", config), "/consultorio/foto.png");
  for (const link of ["https://example.com/a", "http://example.com", "mailto:teste@example.com", "tel:+5599999999999"])
    assert.equal(assetPath(link, config), link);
  config.site.basePath = "";
  assert.equal(siteURL("/", config), "https://perfil.example/");
  assert.equal(getTimerManifest(config).scope, "/timer/");
  assert.equal(getSiteMetadata(config).icons.icon, "/placeholder.svg");
});

test("Debora retains every persisted key and lock; other profile ids have independent storage", () => {
  assert.deepEqual(getTabataKeys(), {
    storage: "de-fisio.tabata.v1", dataLock: "de-fisio.tabata-data", audioLock: "de-fisio.tabata-audio",
    soundtrack: "de-fisio.tabata-soundtrack", alerts: "de-fisio.tabata.alerts",
  });
  const other = getTabataKeys(otherSite());
  for (const [key, value] of Object.entries(getTabataKeys())) assert.notEqual(other[key], value);
});

test("disabling Tabata removes links, including a local timer link without its feature flag", () => {
  const config = otherSite();
  config.features.tabata = false;
  config.links.push({ ...config.links[1], id: "timer-sem-flag", feature: undefined });
  assert.deepEqual(getSiteLinks(config).map((link) => link.id), ["contato"]);
});

test("configuration fails clearly for unsafe links, deployment mistakes, invalid colors, duplicate links and typos", () => {
  const cases = [
    [(c) => { c.links[0].href = "javascript:alert(1)"; }, "links.0.href"],
    [(c) => { c.assets.avatar.src = "/../secret.png"; }, "assets.avatar.src"],
    [(c) => { c.site.basePath = "/links/"; }, "site.basePath"],
    [(c) => { c.site.origin = "https://example.com/links"; }, "site.origin"],
    [(c) => { c.theme.home.primary = "300 150% 50%"; }, "theme.home.primary"],
    [(c) => { c.theme.timer.accent = "red; color: blue"; }, "theme.timer.accent"],
    [(c) => { c.links.push(c.links[0]); }, "links"],
    [(c) => { c.schemaVersion = 2; }, "schemaVersion"],
    [(c) => { c.profile.naem = "typo"; }, "profile"],
  ];
  for (const [change, field] of cases) {
    const config = structuredClone(siteConfig);
    change(config);
    assert.throws(() => parseSiteConfig(config), (error) => error.message.includes(field), field);
  }
});

test("configured text cannot terminate a JSON-LD script element", () => {
  const value = { name: '</script><script>alert("x")</script>' };
  const text = serializeStructuredData(value);
  assert.ok(!text.includes("<"));
  assert.deepEqual(JSON.parse(text), value);
});

test("missing configured assets are reported before building", async () => {
  await validateSiteAssets();
  const config = otherSite();
  config.assets.avatar.src = "/arquivo-inexistente.png";
  await assert.rejects(validateSiteAssets(config), /Arquivo configurado não encontrado: public\/arquivo-inexistente.png/);
});

test("post-export stamps the actual worker and removes the entire timer when disabled", async () => {
  const directory = await mkdtemp(join(tmpdir(), "site-export-test-"));
  try {
    await mkdir(join(directory, "timer"));
    const worker = await readFile(new URL("../public/timer/sw.js", import.meta.url), "utf8");
    await writeFile(join(directory, "timer/sw.js"), worker);
    await prepareSiteExport(directory, "build-teste");
    assert.ok(!(await readFile(join(directory, "timer/sw.js"), "utf8")).includes("__BUILD_ID__"));
    const config = otherSite();
    config.features.tabata = false;
    await writeFile(join(directory, "timer.html"), "timer");
    await writeFile(join(directory, "timer.txt"), "timer payload");
    await prepareSiteExport(directory, "sem-timer", config);
    for (const name of ["timer", "timer.html", "timer.txt"])
      await assert.rejects(access(join(directory, name)));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

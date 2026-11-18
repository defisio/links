import { access, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { siteConfig } from "../lib/site-config.mjs";

/** @param {typeof siteConfig} config @param {string} publicDirectory */
export async function validateSiteAssets(config = siteConfig, publicDirectory = "public") {
  const { assets } = config;
  const paths = new Set([
    assets.avatar.src, assets.favicon, assets.socialImage.src,
    ...(assets.logo ? [assets.logo.src] : []),
    ...(config.features.tabata ? Object.values(config.timer.icons) : []),
  ]);
  for (const path of paths) {
    const file = resolve(publicDirectory, `.${path}`);
    const info = await stat(file).catch(() => {
      throw new Error(`Arquivo configurado não encontrado: ${publicDirectory}${path}`);
    });
    if (!info.isFile()) throw new Error(`O caminho configurado não é um arquivo: ${publicDirectory}${path}`);
    await access(file);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await validateSiteAssets();
  console.log(`Configuração e arquivos de ${siteConfig.profile.name} validados.`);
}

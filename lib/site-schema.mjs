// @ts-check
import { z } from "zod";

const text = z.string().trim().min(1);
const slug = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const httpURL = text.url().refine((value) => /^https?:\/\//.test(value), "Use http:// ou https://.");
const localPath = text.regex(/^\/(?!\/)[a-zA-Z0-9_./-]*$/, "Use um caminho local iniciado por /.")
  .refine((value) => !value.split("/").some((part) => part === "." || part === ".."), "O caminho não pode conter . ou ...");
const hex = text.regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/, "Use uma cor hexadecimal #RRGGBB ou #RRGGBBAA.");
const hsl = text.refine((value) => {
  const match = /^(\d+(?:\.\d+)?) (\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/.exec(value);
  return !!match && Number(match[1]) <= 360 && Number(match[2]) <= 100 && Number(match[3]) <= 100;
}, "Use H S% L%, com H de 0 a 360 e S/L de 0 a 100.");
const image = z.object({
  src: localPath, alt: text, width: z.number().int().positive(), height: z.number().int().positive(),
}).strict();

export const siteSchema = z.object({
  schemaVersion: z.literal(1),
  id: slug,
  site: z.object({
    origin: httpURL.refine((value) => new URL(value).origin === value, "Informe apenas a origem, sem caminho ou barra final."),
    basePath: z.union([z.literal(""), localPath.refine((value) => value !== "/" && !value.endsWith("/"), "Use vazio para a raiz ou /caminho sem barra final.")]),
    language: text.default("pt-BR"), locale: text.default("pt_BR"),
  }).strict(),
  profile: z.object({
    name: text, jobTitle: text, handle: text.optional(), bio: text,
    phone: text.optional(), email: text.email().optional(),
    address: z.object({ city: text, region: text, country: text, postalCode: text.optional() }).strict().optional(),
    geo: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).strict().optional(),
    socialProfiles: z.array(httpURL).default([]), knowsAbout: z.array(text).default([]),
  }).strict(),
  assets: z.object({ avatar: image, logo: image.optional(), favicon: localPath, socialImage: image }).strict(),
  theme: z.object({
    home: z.object({
      background: hsl, foreground: hsl, card: hsl, primary: hsl, primaryForeground: hsl,
      secondary: hsl, secondaryForeground: hsl, mutedForeground: hsl, border: hsl,
    }).strict(),
    timer: z.object({
      background: hex, card: hex, surface: hex, border: hex, text: hex, muted: hex,
      accent: hex, onAccent: hex, accentHover: hex, glow: hex,
    }).strict(),
  }).strict(),
  links: z.array(z.object({
    id: slug,
    icon: z.enum(["whatsapp", "instagram", "email", "youtube", "tiktok", "linkedin", "twitter", "spotify", "globe", "timer"]),
    href: z.union([httpURL, localPath, text.regex(/^mailto:[^\s@]+@[^\s@]+$/), text.regex(/^tel:\+?[\d()-]+$/)]),
    label: text, description: text.optional(), showInFooter: z.boolean().default(false),
    feature: z.literal("tabata").optional(),
  }).strict()).refine((links) => new Set(links.map((link) => link.id)).size === links.length, "Os ids dos links devem ser únicos."),
  features: z.object({ tabata: z.boolean() }).strict(),
  seo: z.object({
    title: text, description: text, socialDescription: text.optional(), twitterTitle: text.optional(),
    twitterDescription: text.optional(), websiteDescription: text.optional(), personDescription: text.optional(),
    googleSiteVerification: text.optional(),
    business: z.object({
      name: text, alternateName: text.optional(), description: text, priceRange: text.optional(),
      specialties: z.array(text).default([]), sameAs: z.array(httpURL).default([]),
      areaServed: z.array(z.object({ type: z.enum(["City", "State", "Country"]), name: text, url: httpURL.optional() }).strict()).default([]),
      services: z.array(z.object({ name: text, description: text }).strict()).default([]),
    }).strict().optional(),
  }).strict(),
  timer: z.object({
    name: text, shortName: text, description: text, installDescription: text,
    socialDescription: text.optional(), twitterDescription: text.optional(),
    icons: z.object({
      svg: localPath.refine((value) => /\.svg$/i.test(value), "Use um ícone SVG."),
      small: localPath.refine((value) => /\.png$/i.test(value), "Use um ícone PNG."),
      large: localPath.refine((value) => /\.png$/i.test(value), "Use um ícone PNG."),
      maskable: localPath.refine((value) => /\.png$/i.test(value), "Use um ícone PNG."),
    }).strict(),
  }).strict(),
}).strict();

/** @param {unknown} value */
export function parseSiteConfig(value) {
  const result = siteSchema.safeParse(value);
  if (!result.success) {
    throw new Error("Configuração do site inválida:\n" + result.error.issues
      .map((issue) => `- ${issue.path.join(".") || "config"}: ${issue.message}`).join("\n"));
  }
  return result.data;
}

import { notFound } from "next/navigation";
import { siteConfig } from "@/lib/site-config.mjs";
import { getTimerManifest } from "@/lib/site-presentation.mjs";

export const dynamic = "force-static";

export function GET() {
  if (!siteConfig.features.tabata) notFound();
  return new Response(JSON.stringify(getTimerManifest(), null, 2), {
    headers: { "Content-Type": "application/manifest+json" },
  });
}

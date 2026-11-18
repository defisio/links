import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { TabataApp } from "@/components/tabata/tabata-app";
import { siteConfig } from "@/lib/site-config.mjs";
import { getTimerMetadata } from "@/lib/site-presentation.mjs";

export const metadata = getTimerMetadata();
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteConfig.theme.timer.background,
  viewportFit: "cover",
};
export default function TabataPage() {
  if (!siteConfig.features.tabata) notFound();
  return <TabataApp />;
}

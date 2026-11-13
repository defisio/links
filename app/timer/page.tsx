import type { Metadata, Viewport } from "next";
import { TabataApp } from "@/components/tabata/tabata-app";
import { assetPath } from "@/lib/utils";

const timerURL = `https://defisio.github.io${assetPath("/timer/")}`;

export const metadata: Metadata = {
  title: "Tabata Timer · Débora Eduarda",
  description:
    "Seu tempo, seu ritmo. Monte treinos intervalados, acompanhe cada fase e salve suas rotinas neste navegador. Timer com voz, séries e uso offline.",
  alternates: { canonical: timerURL },
  manifest: assetPath("/timer/manifest.webmanifest"),
  appleWebApp: {
    capable: true,
    title: "Tabata · DE",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: assetPath("/timer/icon.svg"),
    apple: assetPath("/timer/icon-192.png"),
  },
  openGraph: {
    title: "Tabata Timer · Débora Eduarda",
    description:
      "Um intervalo de cada vez. Seu timer de treino, com a sua rotina.",
    url: timerURL,
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: `${timerURL}icon-512.png`,
        width: 512,
        height: 512,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Tabata Timer · Débora Eduarda",
    description: "Seu tempo, seu ritmo. Um timer de treino que acompanha você.",
    images: [`${timerURL}icon-512.png`],
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090e0d",
  viewportFit: "cover",
};
export default function TabataPage() {
  return <TabataApp />;
}

import React from "react";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";
import { assetPath } from "@/lib/utils";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Débora Eduarda - Fisioterapeuta",
  description: "Todos os meus links em um só lugar.",
  icons: {
    icon: assetPath("/DE-Reduzida.svg"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Google Site Verification */}
        <meta
          name="google-site-verification"
          content="TlZ4Y09nkyMSakKU7FCUMyLwufE3v8tM6siD7ADIOR0"
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="Fisioterapia em São Luís do Maranhão, especialista em reabilitação de joelho, traumato-ortopédica esportiva. Fisioterapeuta Débora Eduarda. Todos os meus links em um só lugar. Fisioterapia Joelho, Fisioterapia São Luís, Fisioterapeuta São Luís Maranhão."
        />
        <meta
          name="keywords"
          content="Débora Eduarda, Fisioterapeuta, Fisioterapia Joelho, Fisioterapia São Luís, Fisioterapeuta São Luís Maranhão, Fisioterapia Esportiva, Reabilitação de Joelho, Saúde, Instagram, Contato, Fisioterapia Traumato-Ortopédica, Fisioterapia em São Luís, Fisioterapia Ortopédica, Fisioterapia Especializada, Fisioterapeuta Maranhão"
        />
        <meta name="author" content="Débora Eduarda" />
        <link rel="icon" href={assetPath("/DE-Reduzida.svg")} />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://defisio.github.io/links/" />
        <meta property="og:title" content="Débora Eduarda - Fisioterapeuta" />
        <meta
          property="og:description"
          content="Todos os meus links em um só lugar."
        />
        <meta
          property="og:image"
          content="https://defisio.github.io/links/og-image.png"
        />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://defisio.github.io/links/" />
        <meta name="twitter:title" content="Débora Eduarda - Fisioterapeuta" />
        <meta
          name="twitter:description"
          content="Todos os meus links em um só lugar."
        />
        <meta
          name="twitter:image"
          content="https://defisio.github.io/links/og-image.png"
        />
        {/* Canonical */}
        <link rel="canonical" href="https://defisio.github.io/links/" />
        {/* Structured Data JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Débora Eduarda",
              url: "https://defisio.github.io/links/",
              image: "https://defisio.github.io/links/avatar.png",
              jobTitle: "Fisioterapeuta",
              sameAs: ["https://www.instagram.com/deborae.fisio"],
              description:
                "Fisioterapia em São Luís do Maranhão, especialista em reabilitação de joelho, traumato-ortopédica esportiva. Fisioterapeuta Débora Eduarda. Fisioterapia Joelho, Fisioterapia São Luís, Fisioterapeuta São Luís Maranhão.",
            }),
          }}
        />
      </head>
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

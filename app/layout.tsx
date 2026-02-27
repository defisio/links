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
  title:
    "Débora Eduarda - Fisioterapeuta em São Luís do Maranhão | Especialista em Joelho",
  description:
    "Fisioterapeuta Débora Eduarda em São Luís - MA. Especialista em fisioterapia traumato-ortopédica esportiva e reabilitação de joelho. Agende sua consulta.",
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
          content="Fisioterapeuta Débora Eduarda em São Luís - MA. Especialista em fisioterapia traumato-ortopédica esportiva e reabilitação de joelho. Atendimento personalizado em fisioterapia ortopédica, esportiva e pós-operatório de joelho. Agende sua consulta."
        />
        <meta
          name="keywords"
          content="Débora Eduarda, Fisioterapeuta, Fisioterapia Joelho, Fisioterapia São Luís, Fisioterapeuta São Luís Maranhão, Fisioterapia Esportiva, Reabilitação de Joelho, Fisioterapia Traumato-Ortopédica, Fisioterapia em São Luís, Fisioterapia Ortopédica, Fisioterapia Especializada, Fisioterapeuta Maranhão, Reabilitação Pós-Operatório Joelho, LCA, Ligamento Cruzado Anterior, Menisco, Condromalácia Patelar, Fisioterapia Esportiva São Luís, Dor no Joelho, Tratamento Joelho São Luís, Fisioterapeuta Ortopédica São Luís, Fisioterapeuta Esportiva Maranhão, Reabilitação Esportiva, Fisioterapia MA, Clínica de Fisioterapia São Luís, Ortopedia Joelho, Lesão Joelho, Fisioterapia Domiciliar São Luís"
        />
        <meta name="author" content="Débora Eduarda" />
        <meta
          name="robots"
          content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1"
        />
        <meta name="geo.region" content="BR-MA" />
        <meta name="geo.placename" content="São Luís" />
        <link rel="icon" href={assetPath("/DE-Reduzida.svg")} />
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta
          property="og:site_name"
          content="Débora Eduarda - Fisioterapeuta"
        />
        <meta property="og:url" content="https://defisio.github.io/links/" />
        <meta
          property="og:title"
          content="Débora Eduarda - Fisioterapeuta em São Luís do Maranhão | Especialista em Joelho"
        />
        <meta
          property="og:description"
          content="Fisioterapeuta em São Luís - MA. Especialista em reabilitação de joelho, fisioterapia traumato-ortopédica esportiva. Agende sua consulta."
        />
        <meta
          property="og:image"
          content="https://defisio.github.io/links/DE3-Logo-Branco.png"
        />
        <meta property="og:image:width" content="120" />
        <meta property="og:image:height" content="120" />
        <meta property="og:image:alt" content="Fisioterapeuta Débora Eduarda" />
        <meta property="og:locale" content="pt_BR" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:url" content="https://defisio.github.io/links/" />
        <meta
          name="twitter:title"
          content="Débora Eduarda - Fisioterapeuta em São Luís do Maranhão"
        />
        <meta
          name="twitter:description"
          content="Fisioterapeuta em São Luís - MA. Especialista em reabilitação de joelho, fisioterapia traumato-ortopédica esportiva."
        />
        <meta
          name="twitter:image"
          content="https://defisio.github.io/links/DE3-Logo-Branco.png"
        />
        {/* Canonical */}
        <link rel="canonical" href="https://defisio.github.io/links/" />
        {/* Structured Data JSON-LD - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Débora Eduarda - Fisioterapeuta",
              url: "https://defisio.github.io/links/",
              description:
                "Fisioterapeuta Débora Eduarda em São Luís do Maranhão. Especialista em fisioterapia traumato-ortopédica esportiva e reabilitação de joelho.",
            }),
          }}
        />
        {/* Structured Data JSON-LD - Person */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "Débora Eduarda",
              url: "https://defisio.github.io/links/",
              image: "https://defisio.github.io/links/DE3-Logo-Branco.png",
              jobTitle: "Fisioterapeuta",
              sameAs: [
                "https://www.instagram.com/deborae.fisio",
                "https://wa.me/5598991328659",
              ],
              description:
                "Fisioterapeuta especialista em reabilitação de joelho, fisioterapia traumato-ortopédica esportiva em São Luís do Maranhão.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "São Luís",
                addressRegion: "MA",
                addressCountry: "BR",
              },
              knowsAbout: [
                "Fisioterapia Traumato-Ortopédica",
                "Fisioterapia Esportiva",
                "Reabilitação de Joelho",
                "LCA - Ligamento Cruzado Anterior",
                "Menisco",
                "Condromalácia Patelar",
                "Reabilitação Pós-Operatório",
              ],
            }),
          }}
        />
        {/* Structured Data JSON-LD - HealthBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "HealthAndBeautyBusiness",
              name: "Fisioterapeuta Débora Eduarda",
              url: "https://defisio.github.io/links/",
              image: "https://defisio.github.io/links/DE3-Logo-Branco.png",
              telephone: "+5598991328659",
              email: "deboraeduardafisio@gmail.com",
              description:
                "Fisioterapia especializada em joelho, traumato-ortopédica esportiva e reabilitação em São Luís do Maranhão.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "São Luís",
                addressRegion: "MA",
                addressCountry: "BR",
              },
              areaServed: {
                "@type": "City",
                name: "São Luís",
              },
              priceRange: "$$",
              medicalSpecialty: "Fisioterapia",
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

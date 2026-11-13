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
  alternates: { canonical: "https://defisio.github.io/links/" },
  openGraph: {
    title:
      "Débora Eduarda - Fisioterapeuta em São Luís do Maranhão | Especialista em Joelho",
    description:
      "Especialista em reabilitação de joelho e fisioterapia traumato-ortopédica esportiva. Agende sua consulta.",
    url: "https://defisio.github.io/links/",
    siteName: "Débora Eduarda - Fisioterapeuta",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "https://defisio.github.io/links/DE3-Logo-Branco.png",
        width: 120,
        height: 120,
        alt: "Fisioterapeuta Débora Eduarda",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Débora Eduarda - Fisioterapeuta em São Luís do Maranhão",
    description:
      "Especialista em reabilitação de joelho e fisioterapia traumato-ortopédica esportiva.",
    images: ["https://defisio.github.io/links/DE3-Logo-Branco.png"],
  },
  icons: {
    icon: assetPath("/DE-Reduzida.svg"),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Extensions can add attributes before hydration. Limit suppression to the
  // document shell; mismatches inside application components remain visible.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head suppressHydrationWarning>
        {/* Google Site Verification */}
        <meta
          name="google-site-verification"
          content="TlZ4Y09nkyMSakKU7FCUMyLwufE3v8tM6siD7ADIOR0"
        />
        <meta charSet="utf-8" />
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
        {/* Structured Data JSON-LD - Physiotherapy (LocalBusiness) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": [
                "MedicalBusiness",
                "HealthAndBeautyBusiness",
                "LocalBusiness",
              ],
              "@id": "https://defisio.github.io/links/#business",
              name: "Débora Eduarda - Fisioterapeuta Especialista em Joelho",
              alternateName: "Fisioterapia Joelho São Luís",
              url: "https://defisio.github.io/links/",
              image: "https://defisio.github.io/links/DE3-Logo-Branco.png",
              telephone: "+5598991328659",
              email: "deboraeduardafisio@gmail.com",
              description:
                "Fisioterapeuta especialista em joelho em São Luís do Maranhão. Tratamento de LCA, menisco, condromalácia patelar, fisioterapia traumato-ortopédica e esportiva. Reabilitação pós-operatório de joelho.",
              address: {
                "@type": "PostalAddress",
                addressLocality: "São Luís",
                addressRegion: "MA",
                postalCode: "65000-000",
                addressCountry: "BR",
              },
              geo: {
                "@type": "GeoCoordinates",
                latitude: -2.5297,
                longitude: -44.2963,
              },
              areaServed: [
                {
                  "@type": "City",
                  name: "São Luís",
                  "@id": "https://www.wikidata.org/wiki/Q28441",
                },
                {
                  "@type": "State",
                  name: "Maranhão",
                  "@id": "https://www.wikidata.org/wiki/Q42362",
                },
              ],
              priceRange: "$$",
              medicalSpecialty: [
                "Fisioterapia Ortopédica",
                "Fisioterapia Esportiva",
                "Reabilitação de Joelho",
              ],
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Serviços de Fisioterapia",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Reabilitação de Joelho",
                      description:
                        "Tratamento especializado para lesões de joelho incluindo LCA, menisco e condromalácia",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Fisioterapia Pós-Operatório",
                      description: "Reabilitação após cirurgias de joelho",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Fisioterapia Esportiva",
                      description:
                        "Tratamento e prevenção de lesões esportivas",
                    },
                  },
                ],
              },
              sameAs: ["https://www.instagram.com/deborae.fisio"],
            }),
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${plusJakartaSans.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}

import React from "react";
import localFont from "next/font/local";

import "./globals.css";
import { siteConfig } from "@/lib/site-config.mjs";
import { getSiteMetadata, getStructuredData, getThemeStyle, serializeStructuredData } from "@/lib/site-presentation.mjs";

const plusJakartaSans = localFont({
  src: "../assets/fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-plus-jakarta-sans",
  weight: "300 700",
  style: "normal",
  display: "swap",
});

export const metadata = getSiteMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Extensions can add attributes before hydration. Limit suppression to the
  // document shell; mismatches inside application components remain visible.
  return (
    <html lang={siteConfig.site.language} style={getThemeStyle()} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        {getStructuredData().map((data, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
          />
        ))}
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

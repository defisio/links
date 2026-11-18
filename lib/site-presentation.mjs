// @ts-check
import { assetPath, siteConfig, siteURL } from "./site-config.mjs";

/** @param {typeof siteConfig} config @returns {import('next').Metadata} */
export function getSiteMetadata(config = siteConfig) {
  const { seo, profile, assets, site } = config;
  const url = siteURL("/", config);
  const image = { ...assets.socialImage, url: siteURL(assets.socialImage.src, config) };
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url },
    openGraph: {
      title: seo.title, description: seo.socialDescription ?? seo.description,
      url, siteName: `${profile.name} - ${profile.jobTitle}`, locale: site.locale,
      type: "website", images: [image],
    },
    twitter: {
      card: "summary", title: seo.twitterTitle ?? seo.title,
      description: seo.twitterDescription ?? seo.description,
      images: [image.url],
    },
    icons: { icon: assetPath(assets.favicon, config) },
    verification: seo.googleSiteVerification ? { google: seo.googleSiteVerification } : undefined,
  };
}

/** @param {typeof siteConfig} config @returns {import('next').Metadata} */
export function getTimerMetadata(config = siteConfig) {
  const { timer, site } = config;
  const url = siteURL("/timer/", config);
  const image = siteURL(timer.icons.large, config);
  return {
    title: timer.name, description: timer.description,
    alternates: { canonical: url }, manifest: assetPath("/timer/manifest.webmanifest", config),
    appleWebApp: { capable: true, title: timer.shortName, statusBarStyle: "black-translucent" },
    icons: { icon: assetPath(timer.icons.svg, config), apple: assetPath(timer.icons.small, config) },
    openGraph: {
      title: timer.name, description: timer.socialDescription ?? timer.description,
      url, type: "website", locale: site.locale, images: [{ url: image, width: 512, height: 512 }],
    },
    twitter: {
      card: "summary", title: timer.name, description: timer.twitterDescription ?? timer.description,
      images: [image],
    },
  };
}

/** @param {typeof siteConfig} config */
export function getStructuredData(config = siteConfig) {
  const { profile, seo, assets } = config;
  const url = siteURL("/", config);
  const image = siteURL(assets.socialImage.src, config);
  const address = profile.address && {
    "@type": "PostalAddress", addressLocality: profile.address.city,
    addressRegion: profile.address.region, addressCountry: profile.address.country,
  };
  const data = [
    {
      "@context": "https://schema.org", "@type": "WebSite",
      name: `${profile.name} - ${profile.jobTitle}`, url,
      description: seo.websiteDescription ?? seo.description,
    },
    {
      "@context": "https://schema.org", "@type": "Person",
      name: profile.name, url, image, jobTitle: profile.jobTitle,
      sameAs: profile.socialProfiles, description: seo.personDescription ?? profile.bio,
      address, knowsAbout: profile.knowsAbout,
    },
  ];
  if (!seo.business) return data;
  const business = seo.business;
  return [...data, {
    "@context": "https://schema.org",
    "@type": ["MedicalBusiness", "HealthAndBeautyBusiness", "LocalBusiness"],
    "@id": `${url}#business`, name: business.name, alternateName: business.alternateName,
    url, image, telephone: profile.phone, email: profile.email, description: business.description,
    address: address && { ...address, postalCode: profile.address?.postalCode },
    geo: profile.geo && { "@type": "GeoCoordinates", ...profile.geo },
    areaServed: business.areaServed.map((area) => ({ "@type": area.type, name: area.name, "@id": area.url })),
    priceRange: business.priceRange, medicalSpecialty: business.specialties,
    hasOfferCatalog: {
      "@type": "OfferCatalog", name: "Serviços de Fisioterapia",
      itemListElement: business.services.map((service) => ({
        "@type": "Offer", itemOffered: { "@type": "Service", ...service },
      })),
    },
    sameAs: business.sameAs,
  }];
}

/** JSON-LD must not allow text in configuration to close the script element.
 * @param {unknown} value
 */
export function serializeStructuredData(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** @param {typeof siteConfig} config @returns {import('react').CSSProperties} */
export function getThemeStyle(config = siteConfig) {
  const home = config.theme.home;
  const values = {
    background: home.background, foreground: home.foreground,
    card: home.card, "card-foreground": home.foreground,
    popover: home.card, "popover-foreground": home.foreground,
    primary: home.primary, "primary-foreground": home.primaryForeground,
    secondary: home.secondary, "secondary-foreground": home.secondaryForeground,
    muted: home.secondary, "muted-foreground": home.mutedForeground,
    accent: home.primary, "accent-foreground": home.primaryForeground,
    border: home.border, input: home.border, ring: home.primary,
  };
  return Object.fromEntries([
    ...Object.entries(values).map(([key, value]) => [`--${key}`, value]),
    ...Object.entries(config.theme.timer).map(([key, value]) => [`--brand-timer-${key}`, value]),
  ]);
}

/** @param {typeof siteConfig} config */
export function getTimerManifest(config = siteConfig) {
  const path = assetPath("/timer/", config);
  const { timer, theme } = config;
  return {
    id: path, name: timer.name, short_name: timer.shortName,
    description: timer.installDescription, lang: config.site.language,
    start_url: path, scope: path, display: "standalone",
    background_color: theme.timer.background, theme_color: theme.timer.background,
    icons: [
      { src: assetPath(timer.icons.small, config), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: assetPath(timer.icons.large, config), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: assetPath(timer.icons.maskable, config), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: assetPath(timer.icons.svg, config), sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

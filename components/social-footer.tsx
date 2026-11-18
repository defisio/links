import Image from "next/image";
import { assetPath, getSiteLinks, siteConfig } from "@/lib/site-config.mjs";
import { SiteLinkIcon } from "@/components/site-link-icon";

export function SocialFooter() {
  const socialLinks = getSiteLinks().filter((link) => link.showInFooter);
  const { logo } = siteConfig.assets;
  return (
    <footer
      className="flex flex-col items-center gap-6 opacity-0 animate-fade-in-up"
      style={{ animationDelay: "800ms" }}
    >
      {socialLinks.length > 0 && <div className="flex items-center gap-3">
        {socialLinks.map((link) => (
          <a
            key={link.id}
            href={assetPath(link.href)}
            target={link.href.startsWith("/") ? undefined : "_blank"}
            rel={link.href.startsWith("/") ? undefined : "noopener noreferrer"}
            aria-label={link.label}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 hover:border-primary/40 hover:text-primary hover:bg-secondary hover:scale-110"
          >
            <SiteLinkIcon name={link.icon} className="h-4 w-4" />
          </a>
        ))}
      </div>}
      {logo && <Image
        src={assetPath(logo.src)}
        alt={logo.alt}
        width={logo.width}
        height={logo.height}
        priority
      />}
    </footer>
  );
}

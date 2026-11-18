import { ProfileHeader } from "@/components/profile-header";
import { LinkCard } from "@/components/link-card";
import { SocialFooter } from "@/components/social-footer";
import { SiteLinkIcon } from "@/components/site-link-icon";
import { assetPath, getSiteLinks } from "@/lib/site-config.mjs";

export default function Page() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start px-4 py-12 sm:py-16">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] max-w-[90vw] rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col gap-8">
        <ProfileHeader />

        <nav
          className="flex flex-col gap-3"
          aria-label="Links de contato e redes sociais"
        >
          {getSiteLinks().map((link, index) => (
            <LinkCard
              key={link.id}
              href={assetPath(link.href)}
              icon={<SiteLinkIcon name={link.icon} className="h-5 w-5" />}
              label={link.label}
              description={link.description}
              delay={200 + index * 80}
            />
          ))}
        </nav>

        <SocialFooter />
      </div>
    </main>
  );
}

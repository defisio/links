import { Timer } from "lucide-react";
import {
  WhatsAppIcon, InstagramIcon, EmailIcon, YouTubeIcon, TikTokIcon,
  LinkedInIcon, TwitterIcon, SpotifyIcon, GlobeIcon,
} from "@/components/social-icons";
import { siteConfig } from "@/lib/site-config.mjs";

const icons = {
  whatsapp: WhatsAppIcon, instagram: InstagramIcon, email: EmailIcon,
  youtube: YouTubeIcon, tiktok: TikTokIcon, linkedin: LinkedInIcon,
  twitter: TwitterIcon, spotify: SpotifyIcon, globe: GlobeIcon, timer: Timer,
};

export function SiteLinkIcon({ name, className }: {
  name: typeof siteConfig.links[number]["icon"];
  className?: string;
}) {
  const Icon = icons[name];
  return <Icon className={className} />;
}

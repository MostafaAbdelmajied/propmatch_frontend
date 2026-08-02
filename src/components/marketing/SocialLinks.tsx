import { Facebook, Instagram, Linkedin } from "lucide-react";
import { socialLinks } from "./marketingLinks";

const icons = {
  فيسبوك: Facebook,
  إنستجرام: Instagram,
  لينكدإن: Linkedin,
} as const;

interface SocialLinksProps {
  inverted?: boolean;
}

export function SocialLinks({ inverted = false }: SocialLinksProps) {
  return (
    <div className="flex items-center gap-2" aria-label="حساباتنا على منصات التواصل">
      {socialLinks.map(({ label, href }) => {
        const Icon = icons[label];

        return (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className={
              inverted
                ? "flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:-translate-y-1 hover:bg-white/20"
                : "flex size-11 items-center justify-center rounded-full border border-hero-ink/10 bg-white text-landing-mid transition-all hover:-translate-y-1 hover:border-landing-teal/30 hover:bg-mist hover:text-landing-teal"
            }
          >
            <Icon className="size-5" aria-hidden />
          </a>
        );
      })}
    </div>
  );
}

import { Mail, Phone, Link2, Instagram, Linkedin, Github, Youtube, Globe } from "lucide-react";
import type { SocialLink, SocialPlatform } from "@/types";
import { SOCIAL_PLATFORM_LABELS } from "@/types";

interface Props {
  email?: string;
  contactEmail?: string;
  phone?: string;
  socials?: SocialLink[];
  showEmail: boolean;
  showPhone: boolean;
  showSocials: boolean;
}

const PLATFORM_ICON: Record<SocialPlatform, React.ComponentType<{ size?: number; className?: string }>> = {
  instagram: Instagram,
  linkedin: Linkedin,
  github: Github,
  x: Link2,
  threads: Link2,
  youtube: Youtube,
  website: Globe,
  other: Link2,
};

function socialLabel(s: SocialLink): string {
  if (s.platform === "other") return s.label?.trim() || "외부 링크";
  return SOCIAL_PLATFORM_LABELS[s.platform];
}

export default function ProfileContactInfo({
  email,
  contactEmail,
  phone,
  socials,
  showEmail,
  showPhone,
  showSocials,
}: Props) {
  const hasEmail = showEmail && (contactEmail || email);
  const hasPhone = showPhone && !!phone;
  const hasSocials = showSocials && socials && socials.length > 0;
  if (!hasEmail && !hasPhone && !hasSocials) return null;

  return (
    <section className="space-y-2 rounded-2xl border bg-white p-5 shadow-sm">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">개인정보</h2>
      <ul className="divide-y divide-muted/40">
        {hasEmail && (
          <li className="flex items-center gap-2 py-2 text-sm">
            <Mail size={14} className="shrink-0 text-muted-foreground" />
            <a
              href={`mailto:${contactEmail ?? email}`}
              className="truncate text-slate-700 hover:text-primary"
            >
              {contactEmail ?? email}
            </a>
          </li>
        )}
        {hasPhone && (
          <li className="flex items-center gap-2 py-2 text-sm">
            <Phone size={14} className="shrink-0 text-muted-foreground" />
            <a href={`tel:${phone}`} className="text-slate-700 hover:text-primary">
              {phone}
            </a>
          </li>
        )}
        {hasSocials &&
          socials!.map((s, i) => {
            const Icon = PLATFORM_ICON[s.platform] ?? Link2;
            return (
              <li key={`${s.platform}-${i}`} className="flex items-center gap-2 py-2 text-sm">
                <Icon size={14} className="shrink-0 text-muted-foreground" />
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-slate-700 hover:text-primary"
                >
                  <span className="text-xs text-muted-foreground">{socialLabel(s)} · </span>
                  {s.url}
                </a>
              </li>
            );
          })}
      </ul>
    </section>
  );
}

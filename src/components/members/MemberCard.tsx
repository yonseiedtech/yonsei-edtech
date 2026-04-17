import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types";
import type { User } from "@/types";

interface Props {
  member: User;
}

export default function MemberCard({ member }: Props) {
  const affiliationLine = [member.affiliation, member.position]
    .filter(Boolean)
    .join(" · ");

  const showRoleBadge = member.role !== "member" && member.role !== "alumni";

  return (
    <Link
      href={`/profile/${member.id}?from=members`}
      className="block rounded-2xl border bg-white p-6 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      {/* Avatar */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
        {member.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={member.profileImage} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <UserIcon size={28} />
        )}
      </div>

      <h3 className="mt-4 font-semibold">{member.name}</h3>

      {affiliationLine && (
        <p className="mt-1 text-xs text-muted-foreground">{affiliationLine}</p>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-1">
        {member.field &&
          member.field
            .split(/[,，]/)
            .map((f) => f.trim())
            .filter(Boolean)
            .map((f) => (
              <Badge key={f} variant="secondary" className="text-xs">
                {f}
              </Badge>
            ))}
        {showRoleBadge && (
          <Badge className="bg-primary/10 text-xs text-primary hover:bg-primary/20">
            {ROLE_LABELS[member.role]}
          </Badge>
        )}
      </div>

      {(() => {
        const tags = (member.researchInterests ?? [])
          .flatMap((s) => s.split(/[,，]/))
          .map((s) => s.trim())
          .filter(Boolean);
        if (tags.length === 0) return null;
        const MAX_VISIBLE = 3;
        const visible = tags.slice(0, MAX_VISIBLE);
        const overflow = tags.length - MAX_VISIBLE;
        return (
          <div className="mt-2 flex h-6 flex-wrap justify-center gap-1 overflow-hidden">
            {visible.map((t) => (
              <span key={t} className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                {t}
              </span>
            ))}
            {overflow > 0 && (
              <span className="inline-flex items-center text-[10px] text-muted-foreground">+{overflow}</span>
            )}
          </div>
        );
      })()}

      {member.bio && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {member.bio}
        </p>
      )}
    </Link>
  );
}

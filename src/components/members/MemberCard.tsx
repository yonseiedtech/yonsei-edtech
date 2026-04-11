import { User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types";
import type { User } from "@/types";
import { formatGeneration } from "@/lib/utils";

interface Props {
  member: User;
}

export default function MemberCard({ member }: Props) {
  const affiliationLine = [member.affiliation, member.position]
    .filter(Boolean)
    .join(" · ");

  const showRoleBadge = member.role !== "member" && member.role !== "alumni";

  return (
    <div className="rounded-2xl border bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      {/* Avatar placeholder */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserIcon size={28} />
      </div>

      <h3 className="mt-4 font-semibold">
        {member.name}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          ({formatGeneration(member.generation, member.enrollmentYear, member.enrollmentHalf)})
        </span>
      </h3>

      {affiliationLine && (
        <p className="mt-1 text-xs text-muted-foreground">{affiliationLine}</p>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {member.field}
        </Badge>
        {showRoleBadge && (
          <Badge className="bg-primary/10 text-xs text-primary hover:bg-primary/20">
            {ROLE_LABELS[member.role]}
          </Badge>
        )}
      </div>

      {member.bio && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {member.bio}
        </p>
      )}
    </div>
  );
}

import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MemberData } from "@/app/members/page";

interface Props {
  member: MemberData;
}

export default function MemberCard({ member }: Props) {
  const affiliationLine = [member.affiliation, member.position]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-2xl border bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-md">
      {/* Avatar placeholder */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <User size={28} />
      </div>

      <h3 className="mt-4 font-semibold">
        {member.name}
        {member.generation && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ({member.generation}기)
          </span>
        )}
      </h3>

      {affiliationLine && (
        <p className="mt-1 text-xs text-muted-foreground">{affiliationLine}</p>
      )}

      <div className="mt-2 flex flex-wrap justify-center gap-1">
        <Badge variant="secondary" className="text-xs">
          {member.field}
        </Badge>
        {member.role && (
          <Badge className="bg-primary/10 text-xs text-primary hover:bg-primary/20">
            {member.role}
          </Badge>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {member.bio}
      </p>
    </div>
  );
}

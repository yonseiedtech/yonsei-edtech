import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/types";
import { formatEnrollment } from "@/lib/utils";
import type { User } from "@/types";

interface Props {
  member: User;
}

export default function MemberCard({ member }: Props) {
  const affiliationLine = [member.affiliation, member.position]
    .filter(Boolean)
    .join(" · ");

  const enrollmentLabel = formatEnrollment(member.enrollmentYear, member.enrollmentHalf);

  const showRoleBadge = member.role !== "member" && member.role !== "alumni";

  const researchTags = (member.researchInterests ?? [])
    .flatMap((s) => s.split(/[,，]/))
    .map((s) => s.trim())
    .filter(Boolean);
  const MAX_TAGS = 3;
  const visibleTags = researchTags.slice(0, MAX_TAGS);
  const overflowCount = researchTags.length - MAX_TAGS;

  return (
    <Link
      href={`/profile/${member.id}?from=members`}
      role="listitem"
      aria-label={`${member.name} 프로필 보기`}
      className="group block rounded-2xl border bg-card p-6 text-center shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
    >
      {/* ── 아바타 ── */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary ring-2 ring-transparent transition-all duration-150 group-hover:ring-primary/30 group-focus-visible:ring-primary/40">
        {member.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.profileImage}
            alt={`${member.name} 프로필 사진`}
            className="h-full w-full object-cover"
          />
        ) : (
          <UserIcon size={28} aria-hidden />
        )}
      </div>

      {/* ── 이름 ── */}
      <h3 className="mt-4 font-semibold leading-snug transition-colors duration-150 group-hover:text-primary">
        {member.name}
      </h3>

      {/* ── 입학 ── */}
      {enrollmentLabel && (
        <p className="mt-0.5 text-[11px] font-medium text-primary/80">
          입학 {enrollmentLabel}
        </p>
      )}

      {/* ── 소속·직위 ── */}
      {affiliationLine && (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {affiliationLine}
        </p>
      )}

      {/* ── 분야 배지 + 역할 배지 ── */}
      {(member.field || showRoleBadge) && (
        <div className="mt-2.5 flex flex-wrap justify-center gap-1">
          {member.field &&
            member.field
              .split(/[,，]/)
              .map((f) => f.trim())
              .filter(Boolean)
              .map((f) => (
                <Badge key={f} variant="secondary" className="text-[11px]">
                  {f}
                </Badge>
              ))}
          {showRoleBadge && (
            <Badge className="bg-primary/10 text-[11px] text-primary hover:bg-primary/20">
              {ROLE_LABELS[member.role]}
            </Badge>
          )}
        </div>
      )}

      {/* ── 연구 관심 키워드 ── */}
      {visibleTags.length > 0 && (
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {visibleTags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
          {overflowCount > 0 && (
            <span className="inline-flex items-center text-[10px] text-muted-foreground">
              +{overflowCount}
            </span>
          )}
        </div>
      )}

      {/* ── 한 줄 소개 ── */}
      {member.bio && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {member.bio}
        </p>
      )}
    </Link>
  );
}

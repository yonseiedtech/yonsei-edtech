import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { ROLE_LABELS } from "@/types";
import { formatGeneration } from "@/lib/utils";
import ProfileLikeButton from "./ProfileLikeButton";
import ProfileShareMenu from "./ProfileShareMenu";

interface Props {
  owner: User;
  isOwner: boolean;
  viewer?: User | null;
}

export default function ProfileHeader({ owner, isOwner, viewer }: Props) {
  const gen = formatGeneration(owner.generation, owner.enrollmentYear, owner.enrollmentHalf);
  const showRoleBadge = owner.role !== "member" && owner.role !== "alumni";

  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        {/* 프로필 이미지 */}
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-4 ring-white">
          {owner.profileImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={owner.profileImage} alt={owner.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
              {owner.name?.[0] ?? "?"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-bold leading-tight">{owner.name}</h1>
            {showRoleBadge && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                {ROLE_LABELS[owner.role]}
              </Badge>
            )}
          </div>
          {gen && <p className="mt-1 text-sm font-semibold text-primary">{gen}</p>}
          {owner.position && (
            <p className="mt-1 text-sm text-slate-700">{owner.position}</p>
          )}
          {(owner.affiliation || owner.department) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[owner.affiliation, owner.department].filter(Boolean).join(" · ")}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <ProfileLikeButton profileId={owner.id} isOwner={isOwner} />
            {(isOwner || (viewer && ["sysadmin", "admin", "president", "staff"].includes(viewer.role))) && (
              <ProfileShareMenu profileId={owner.id} name={owner.name} bio={owner.bio} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

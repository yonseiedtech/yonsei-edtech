import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { ROLE_LABELS } from "@/types";
import ProfileLikeButton from "./ProfileLikeButton";
import ProfileShareMenu from "./ProfileShareMenu";
import ProfileCertificateDownloadButton from "./ProfileCertificateDownloadButton";

interface Props {
  owner: User;
  isOwner: boolean;
  viewer?: User | null;
}

export default function ProfileHeader({ owner, isOwner, viewer }: Props) {
  const showRoleBadge = owner.role !== "member" && owner.role !== "alumni";
  const isStaff =
    !!viewer && ["sysadmin", "admin", "president", "staff"].includes(viewer.role);

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
          {owner.position && (
            <p className="mt-1 text-sm text-slate-700">{owner.position}</p>
          )}
          {(owner.affiliation || owner.department) && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {[owner.affiliation, owner.department].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary">
            학술 포트폴리오
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <ProfileLikeButton profileId={owner.id} isOwner={isOwner} />
            {(isOwner || isStaff) && (
              <ProfileShareMenu profileId={owner.id} name={owner.name} bio={owner.bio} />
            )}
            {/* 증명서 PDF: 본인+운영진은 본인판(미검증 포함), 그 외에는 공개판 */}
            {(isOwner || isStaff) ? (
              <ProfileCertificateDownloadButton
                ownerId={owner.id}
                ownerName={owner.name}
                full
              />
            ) : (
              <ProfileCertificateDownloadButton
                ownerId={owner.id}
                ownerName={owner.name}
                full={false}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

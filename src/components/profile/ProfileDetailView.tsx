"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { profilesApi } from "@/lib/bkend";
import {
  canAccessProfilePage,
  canViewSection,
  withGraduateDefaults,
  type ViaParam,
} from "@/lib/profile-visibility";
import { useProfileViews } from "@/features/profile/useProfileViews";
import type { User } from "@/types";
import { Lock } from "lucide-react";
import Image from "next/image";
import ProfileHeader from "./ProfileHeader";
import ProfileBio from "./ProfileBio";
import ProfileContactInfo from "./ProfileContactInfo";
import ProfileResearchInterests from "./ProfileResearchInterests";
import ProfileAcademicActivities from "./ProfileAcademicActivities";
import ProfileResearchActivities from "./ProfileResearchActivities";
import ProfileAwards from "./ProfileAwards";
import ProfileExternalActivities from "./ProfileExternalActivities";
import ProfileContentCreations from "./ProfileContentCreations";
import ProfileOutputs from "./ProfileOutputs";
import ProfileCourses from "./ProfileCourses";
import OwnerVisibilitySection from "./OwnerVisibilitySection";

interface Props {
  ownerId: string;
  /** SSR에서 생성한 owner 초기값 — generateMetadata에서 수집된 데이터 hydration */
  initialOwner?: User | null;
}

function parseVia(raw: string | null): ViaParam {
  if (raw === "qr" || raw === "link") return raw;
  return null;
}

export default function ProfileDetailView({ ownerId, initialOwner }: Props) {
  const search = useSearchParams();
  const via = parseVia(search.get("via"));
  const viewer = useAuthStore((s) => s.user);

  const { data: ownerRaw, isLoading, error } = useQuery({
    queryKey: ["profile-owner", ownerId],
    queryFn: async () => (await profilesApi.get(ownerId)) as unknown as User,
    enabled: !!ownerId,
    initialData: initialOwner ?? undefined,
    staleTime: 30_000,
  });

  const owner = useMemo(() => (ownerRaw ? withGraduateDefaults(ownerRaw) : null), [ownerRaw]);

  const isOwner = !!viewer?.id && !!owner && viewer.id === owner.id;
  const isStaff =
    !!viewer && ["sysadmin", "admin", "president", "staff"].includes(viewer.role);
  const channel = via ?? (search.get("from") === "members" ? "members" : "direct");

  // view 로깅 (본인 제외)
  useProfileViews({
    profileId: owner?.id,
    viewerId: viewer?.id,
    channel,
    isSelf: isOwner,
  });

  if (isLoading && !owner) {
    return <div className="py-20 text-center text-sm text-muted-foreground">프로필을 불러오는 중…</div>;
  }
  if (error || !owner) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-muted-foreground">프로필을 찾을 수 없습니다.</p>
        <Link href="/" className="mt-4 inline-block text-sm text-primary underline">
          홈으로
        </Link>
      </div>
    );
  }

  const access = canAccessProfilePage(viewer, owner, via);

  // 비로그인 차단: 일반 회원 페이지
  if (access === "blocked") {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Lock size={22} className="text-muted-foreground" />
            </div>
            <h1 className="text-lg font-bold">{owner.name}</h1>
            <p className="mt-4 text-sm text-slate-700">
              회원 전용 프로필입니다. 자세한 정보를 보려면 로그인하세요.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/profile/${owner.id}`)}`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90"
            >
              로그인
            </Link>
            <Link
              href="/"
              className="mt-3 inline-block text-xs text-muted-foreground hover:text-foreground"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 가시성 체크 (운영진 페이지 비로그인은 staff-public-only로 들어옴 → canViewSection이 처리)
  const showEmail = canViewSection("email", viewer, owner, via);
  const showPhone = canViewSection("phone", viewer, owner, via);
  const showSocials = canViewSection("socials", viewer, owner, via);
  const showBio = canViewSection("bio", viewer, owner, via);
  const showResearchInterests = canViewSection("researchInterests", viewer, owner, via);
  const showAcademic = canViewSection("academicActivities", viewer, owner, via);
  const showResearch = canViewSection("researchActivities", viewer, owner, via);
  const showCourses = canViewSection("courses", viewer, owner, via);
  // 운영진 페이지 비로그인 케이스: 일부 항상 노출 + 운영진 공식 이메일 표시 보강
  const isStaffPublic = access === "staff-public-only";
  const showOfficialEmail = isStaffPublic; // 항상 노출되는 공식 이메일
  const showStaffPublicBase = isStaffPublic; // 이름/직책/대학원/소개

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl space-y-4 px-4">
        <div className="flex items-center gap-2.5 pb-2">
          <Image src="/yonsei-emblem.svg" alt="연세대학교" width={28} height={28} className="h-7 w-7" />
          <h1 className="text-lg font-bold text-foreground">개인 프로필</h1>
        </div>
        <ProfileHeader owner={owner} isOwner={isOwner} viewer={viewer} />

        {isOwner && <OwnerVisibilitySection owner={owner} />}

        {(showBio || showStaffPublicBase) && <ProfileBio bio={owner.bio} />}

        <ProfileContactInfo
          email={owner.email}
          contactEmail={owner.contactEmail}
          phone={owner.phone}
          socials={owner.socials}
          showEmail={showEmail || showOfficialEmail}
          showPhone={showPhone}
          showSocials={showSocials}
        />

        {showResearchInterests && (
          <ProfileResearchInterests interests={owner.researchInterests} field={owner.field} />
        )}

        {showAcademic && <ProfileAcademicActivities owner={owner} />}

        {showAcademic && <ProfileOutputs owner={owner} />}

        {showResearch && <ProfileResearchActivities papers={owner.recentPapers} />}

        {/* 학술 포트폴리오 (수상·대외활동·콘텐츠) — 승인여부·가시성 정책 무관, 수강 내역 바로 상단 항상 노출 */}
        <div className="rounded-2xl border border-dashed border-primary/20 bg-primary/[0.02] p-3 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">학술 포트폴리오</h3>
            <span className="text-[10px] text-muted-foreground">승인 여부 무관 · 수강 내역 상단</span>
          </div>
          <ProfileAwards owner={owner} />
          <ProfileExternalActivities owner={owner} />
          <ProfileContentCreations owner={owner} />
        </div>

        {showCourses && (
          <ProfileCourses ownerId={owner.id} canSeeSensitive={isOwner || isStaff} />
        )}

        {isStaffPublic && (
          <p className="rounded-xl border border-dashed bg-white p-3 text-center text-xs text-muted-foreground">
            연세교육공학회 회원이신가요?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(`/profile/${owner.id}`)}`}
              className="text-primary underline"
            >
              로그인
            </Link>
            하면 더 많은 정보를 볼 수 있습니다.
          </p>
        )}
      </div>
    </div>
  );
}

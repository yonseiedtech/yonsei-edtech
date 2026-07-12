"use client";

/**
 * 대시보드 프로필 요약 카드 (사이클 85, 2026-06-13)
 *
 * 사용자 요청 — "대시보드에 이름·입학시점·누적학기 등 프로필 정보 영역을 함께 표시해
 * 주기적으로 본인 정보를 업데이트하는 기회를 마련. 마지막 접속/활동도 노출".
 *
 * 평가 반영:
 * - 학적 정보(입학·누적학기·기수·재학상태)는 user 필드 + getEffectiveSemesterCount 로 즉시 표시.
 * - "프로필 완성도" 게이지 + 빈 항목 채우기 CTA 가 핵심 — 주기적 업데이트 동기를 만든다.
 * - "마지막 접속(lastLoginAt)" 은 본인 대시보드에선 항상 "지금"에 가깝고, 운영진도
 *   부정확/누락 다수로 평가 지표에서 제외(computeMemberMetrics)했으므로 전면 노출하지 않는다.
 *   대신 "최근 활동(user_activity_logs)" = 의미 있는 마지막 행동(영역·시점)을 노출한다.
 *
 * JourneyGreetingHeader 가 인사+여정 단계를 담당하므로, 본 카드는 인사를 생략하고
 * "나는 누구/어디쯤(학적) + 프로필 완성도 + 최근 활동" 에 집중한다.
 */

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  Clock,
  ArrowRight,
  PencilLine,
  CircleUserRound,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CHIP } from "@/lib/design-tokens";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import { userActivityLogsApi } from "@/lib/bkend";
import { ENROLLMENT_STATUS_LABELS } from "@/types";
import type { User } from "@/types";

interface RecentActivity {
  pathLabel?: string;
  pathGroup?: string;
  createdAt?: string;
}

/** ISO 시각 → "방금 전" / "N분 전" / "N시간 전" / "N일 전" / "N주 전" */
function relativeTime(iso?: string): { text: string; staleDays: number } | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return { text: "방금 전", staleDays: 0 };
  const min = Math.floor(diffMs / 60_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (min < 1) return { text: "방금 전", staleDays: 0 };
  if (min < 60) return { text: `${min}분 전`, staleDays: 0 };
  const hr = Math.floor(min / 60);
  if (hr < 24) return { text: `${hr}시간 전`, staleDays: 0 };
  if (days < 7) return { text: `${days}일 전`, staleDays: days };
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return { text: `${weeks}주 전`, staleDays: days };
  const months = Math.floor(days / 30);
  return { text: `${months}개월 전`, staleDays: days };
}

/** 입학 시점 라벨 — "2024년 후반기 입학" */
function admissionLabel(user: User): string | null {
  if (!user.enrollmentYear) return null;
  const half =
    user.enrollmentHalf === 2 ? " 후반기" : user.enrollmentHalf === 1 ? " 전반기" : "";
  return `${user.enrollmentYear}년${half} 입학`;
}

/** 프로필 완성도 — 채운 항목/전체 + 비어 있는 항목 라벨 */
function computeCompletion(user: User): {
  percent: number;
  filled: number;
  total: number;
  missing: string[];
} {
  const checks: { label: string; ok: boolean }[] = [
    { label: "프로필 사진", ok: !!user.profileImage },
    { label: "한 줄 소개", ok: !!user.bio && user.bio.trim().length > 0 },
    { label: "관심 분야", ok: !!user.field && user.field.trim().length > 0 },
    { label: "입학 정보", ok: !!user.enrollmentYear },
    { label: "재학 상태", ok: !!user.enrollmentStatus },
  ];
  const filled = checks.filter((c) => c.ok).length;
  const total = checks.length;
  return {
    percent: Math.round((filled / total) * 100),
    filled,
    total,
    missing: checks.filter((c) => !c.ok).map((c) => c.label),
  };
}

export default function ProfileSummaryCard({ user }: { user: User }) {
  const semesters = useMemo(() => getEffectiveSemesterCount(user), [user]);
  const admission = useMemo(() => admissionLabel(user), [user]);
  const completion = useMemo(() => computeCompletion(user), [user]);
  const statusLabel = user.enrollmentStatus
    ? ENROLLMENT_STATUS_LABELS[user.enrollmentStatus]
    : null;

  // 최근 활동 1건 (user_activity_logs, createdAt:desc) — 접속이 아닌 "의미 있는 행동"
  const { data: recent } = useQuery({
    queryKey: ["my-recent-activity", user.id],
    queryFn: async () => {
      const res = await userActivityLogsApi.listByUser(user.id, 1);
      return ((res.data as RecentActivity[]) ?? [])[0] ?? null;
    },
    enabled: !!user.id,
    staleTime: 5 * 60_000,
  });
  const recentRel = recent ? relativeTime(recent.createdAt) : null;

  const initial = user.name?.trim()?.[0] ?? "?";

  return (
    <section
      aria-label="내 프로필 요약"
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start gap-3 sm:gap-4">
        {/* 아바타 */}
        <div className="shrink-0">
          {user.profileImage ? (
            <Image
              src={user.profileImage}
              alt={user.name}
              width={56}
              height={56}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/15 sm:h-14 sm:w-14"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-sky-500/10 text-lg font-bold text-primary ring-2 ring-primary/15 sm:h-14 sm:w-14">
              {initial}
            </div>
          )}
        </div>

        {/* 이름 + 학적 메타 */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-base font-bold tracking-tight sm:text-lg">
              {user.name}
            </span>
            {statusLabel && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS_CHIP.success)}>
                {statusLabel}
              </span>
            )}
            {user.generation > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {user.generation}기
              </span>
            )}
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <GraduationCap size={13} className="text-primary/70" />
              {admission ?? "입학 정보 미설정"}
            </span>
            {typeof semesters === "number" && semesters > 0 && (
              <>
                <span aria-hidden className="text-muted-foreground/40">·</span>
                <span className="font-medium text-foreground/80">누적 {semesters}학기</span>
              </>
            )}
            {user.field && user.field.trim().length > 0 && (
              <>
                <span aria-hidden className="text-muted-foreground/40">·</span>
                <span className="inline-flex max-w-[12rem] items-center truncate rounded-full bg-primary/5 px-2 py-0.5 text-[11px] text-primary/80">
                  {user.field}
                </span>
              </>
            )}
          </p>

          {/* 최근 활동 — 접속이 아닌 의미 있는 마지막 행동 */}
          {recentRel && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock size={11} className="text-muted-foreground/70" />
              {recentRel.staleDays >= 14 ? (
                <span>오랜만이에요 👋 마지막 활동 {recentRel.text}</span>
              ) : (
                <span>
                  최근 활동{recent?.pathLabel ? ` · ${recent.pathLabel}` : ""} · {recentRel.text}
                </span>
              )}
            </p>
          )}
        </div>

        {/* 프로필 수정 링크 */}
        <Link
          href="/mypage?tab=settings"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <PencilLine size={12} />
          프로필 수정
        </Link>
      </div>

      {/* 프로필 완성도 게이지 + 빈 항목 채우기 CTA */}
      <div className="mt-3 border-t pt-3">
        {completion.percent < 100 ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CircleUserRound size={12} className="text-primary/70" />
                프로필 완성도
                <span className="font-semibold tabular-nums text-foreground">
                  {completion.percent}%
                </span>
                <span className="text-muted-foreground/60">
                  ({completion.filled}/{completion.total})
                </span>
              </div>
              <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-sky-500 transition-all"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
              {completion.missing.length > 0 && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground/70">
                    {completion.missing.slice(0, 2).join(" · ")}
                  </span>
                  {completion.missing.length > 2 && ` 외 ${completion.missing.length - 2}건`}
                  {" "}을(를) 채워보세요.
                </p>
              )}
            </div>
            <Link
              href="/mypage"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              프로필 업데이트
              <ArrowRight size={12} />
            </Link>
          </div>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles size={12} className="text-amber-500" />
            프로필이 모두 채워져 있어요. 변동이 생기면{" "}
            <Link href="/mypage" className="font-medium text-primary hover:underline">
              마이페이지
            </Link>
            에서 업데이트하세요.
          </p>
        )}
      </div>
    </section>
  );
}

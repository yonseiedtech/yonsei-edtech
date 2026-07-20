"use client";

/**
 * 대시보드 프로필 요약 카드 (사이클 85, 2026-06-13 / UI 개선 2026-07-20)
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
 *
 * UI 개선 (2026-07-20):
 * - 입학 표기: semesterLabelFromKey + cohortKeyOf → "2023년 후기 입학" (서비스 표준 일치)
 * - 정보 위계: 이름+뱃지 1행 / 학적 스탯 2행(아이콘+텍스트 독립 유닛)으로 분리
 * - 완성도 블록: 퍼센트 강조, 미완 항목 칩, "을(를)" 조사 문구 제거
 * - 시맨틱 토큰: 재학/기수 뱃지 border 추가(chip 토큰 테두리 표현)
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
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CHIP } from "@/lib/design-tokens";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import { semesterLabelFromKey, cohortKeyOf } from "@/lib/semester";
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
  const admission = useMemo(() => {
    const key = cohortKeyOf(user);
    const label = semesterLabelFromKey(key);
    return label ? `${label} 입학` : null;
  }, [user]);
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
      {/* ── 상단: 아바타 + 이름/뱃지 + 수정 버튼 ── */}
      <div className="flex items-start gap-3">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-info/10 text-lg font-bold text-primary ring-2 ring-primary/15 sm:h-14 sm:w-14">
              {initial}
            </div>
          )}
        </div>

        {/* 이름 + 학적 메타 */}
        <div className="min-w-0 flex-1">
          {/* 행 1: 이름 + 상태 뱃지 + 기수 */}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="truncate text-base font-bold tracking-tight sm:text-lg">
              {user.name}
            </span>
            {statusLabel && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                  STATUS_CHIP.success
                )}
              >
                {statusLabel}
              </span>
            )}
            {user.generation > 0 && (
              <span className="rounded-full border border-muted-foreground/20 bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {user.generation}기
              </span>
            )}
          </div>

          {/* 행 2: 학적 스탯 — 아이콘+텍스트 독립 유닛, 점 구분자 없음 */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {admission ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <GraduationCap size={13} className="shrink-0 text-primary/60" />
                {admission}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/50">
                <GraduationCap size={13} className="shrink-0" />
                입학 정보 미설정
              </span>
            )}
            {typeof semesters === "number" && semesters > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground/75">
                <CalendarDays size={13} className="shrink-0 text-primary/60" />
                {semesters}학기째
              </span>
            )}
            {user.field && user.field.trim().length > 0 && (
              <span className="inline-flex max-w-[14rem] items-center gap-1 truncate text-xs text-muted-foreground">
                <BookOpen size={13} className="shrink-0 text-primary/60" />
                {user.field}
              </span>
            )}
          </div>

          {/* 행 3: 최근 활동 — 의미 있는 마지막 행동 */}
          {recentRel && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock size={11} className="shrink-0 text-muted-foreground/70" />
              {recentRel.staleDays >= 14 ? (
                <span>오랜만이에요 — 마지막 활동 {recentRel.text}</span>
              ) : (
                <span>
                  최근 활동{recent?.pathLabel ? ` · ${recent.pathLabel}` : ""} · {recentRel.text}
                </span>
              )}
            </p>
          )}
        </div>

        {/* 프로필 수정 링크 — 우측 상단 */}
        <Link
          href="/mypage?tab=settings"
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <PencilLine size={12} />
          프로필 수정
        </Link>
      </div>

      {/* ── 하단: 프로필 완성도 게이지 ── */}
      <div className="mt-3 border-t pt-3">
        {completion.percent < 100 ? (
          <div className="space-y-1.5">
            {/* 게이지 행: 라벨 + 퍼센트 강조 + 바 + 분수 + 업데이트 버튼 */}
            <div className="flex items-center gap-2">
              <CircleUserRound size={12} className="shrink-0 text-primary/70" />
              <span className="text-[11px] text-muted-foreground">프로필 완성도</span>
              <span className="text-[13px] font-bold tabular-nums text-foreground">
                {completion.percent}%
              </span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-info transition-all"
                  style={{ width: `${completion.percent}%` }}
                />
              </div>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/50">
                {completion.filled}/{completion.total}
              </span>
              <Link
                href="/mypage"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
              >
                업데이트
                <ArrowRight size={11} />
              </Link>
            </div>
            {/* 미완 항목 — 개별 칩으로 표시 ("을(를)" 조사 문구 제거) */}
            {completion.missing.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-[20px]">
                <span className="text-[10px] text-muted-foreground/60">미완성</span>
                {completion.missing.slice(0, 3).map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-dashed border-muted-foreground/25 px-2 py-0.5 text-[10px] text-muted-foreground/70"
                  >
                    {label}
                  </span>
                ))}
                {completion.missing.length > 3 && (
                  <span className="text-[10px] text-muted-foreground/50">
                    외 {completion.missing.length - 3}건
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles size={12} className="text-warning" />
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

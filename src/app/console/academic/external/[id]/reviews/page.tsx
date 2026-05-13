"use client";

/**
 * 운영 콘솔 — 대외 학술대회 참석자 후기 모니터링 (Sprint 70).
 *
 * 사용자 서비스에서 회원이 작성한 후기(generalImpression, recommendTo,
 * willAttendAgain, researchTakeaway, finalWords, 별점)를 운영진이 한곳에서
 * 조회·통계로 확인. regrets(아쉬운점)는 별도 collection (read 권한 본인+운영진) —
 * v2 에서 통합 예정.
 *
 * 매칭 분석 GAP #1: 운영 콘솔에 후기 조회 페이지 부재 → 운영진이 회원 피드백을
 * 추적하지 못해 콘텐츠 개선·개최 의사결정에 활용 불가.
 */

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Star,
  MessageSquareQuote,
  Award,
  RefreshCcw,
  Users,
} from "lucide-react";
import { activitiesApi, attendeeReviewsApi } from "@/lib/bkend";
import { WILL_ATTEND_AGAIN_LABELS, type ConferenceAttendeeReview, type Activity } from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";

export default function ExternalActivityReviewsConsole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: activityId } = use(params);

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => activitiesApi.get(activityId) as Promise<Activity>,
    retry: false,
  });

  const { data: reviewsRes, isLoading } = useQuery({
    queryKey: ["console", "attendee-reviews", activityId],
    queryFn: () => attendeeReviewsApi.listByActivity(activityId),
    retry: false,
  });

  const reviews = (reviewsRes?.data ?? []) as ConferenceAttendeeReview[];

  const stats = useMemo(() => {
    const total = reviews.length;
    const ratings = reviews
      .map((r) => r.overallRating)
      .filter((x): x is number => typeof x === "number" && x > 0);
    const avgRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;
    const attendAgain = {
      yes: reviews.filter((r) => r.willAttendAgain === "yes").length,
      maybe: reviews.filter((r) => r.willAttendAgain === "maybe").length,
      no: reviews.filter((r) => r.willAttendAgain === "no").length,
    };
    const withTakeaway = reviews.filter((r) => (r.researchTakeaway ?? "").trim().length > 0).length;
    return { total, avgRating, attendAgain, withTakeaway };
  }, [reviews]);

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={MessageSquareQuote}
        title={`참석자 후기 — ${activity?.title ?? "대외 학술대회"}`}
        description="회원이 작성한 종합 후기·재참석 의사·연구 시사점을 한곳에서 모니터링합니다."
      />

      <div className="flex items-center justify-between">
        <Link
          href={`/console/academic/external/${activityId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> 활동 상세로
        </Link>
        <Link
          href={`/activities/external/${activityId}/review`}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          target="_blank"
        >
          사용자 후기 작성 페이지 열기 ↗
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="총 후기" value={String(stats.total)} color="text-primary bg-primary/10" />
        <StatCard
          icon={Star}
          label="평균 별점"
          value={stats.avgRating != null ? stats.avgRating.toFixed(2) : "—"}
          color="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
        />
        <StatCard
          icon={RefreshCcw}
          label="재참석 의사 (yes/maybe/no)"
          value={`${stats.attendAgain.yes} / ${stats.attendAgain.maybe} / ${stats.attendAgain.no}`}
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
        />
        <StatCard
          icon={Award}
          label="연구 시사점 기재"
          value={`${stats.withTakeaway} / ${stats.total}`}
          color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
        />
      </div>

      {/* 후기 목록 */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">후기 상세 ({reviews.length}건)</h2>
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground">불러오는 중…</div>
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={MessageSquareQuote}
            title="아직 작성된 후기가 없습니다"
            description="회원이 학술대회 종료 후 후기를 작성하면 본 목록에 표시됩니다."
          />
        ) : (
          <ul className="space-y-3">
            {reviews
              .slice()
              .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
              .map((r) => (
                <li key={r.id} className="rounded-xl border bg-background p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{r.userName ?? "(이름 미상)"}</span>
                      {r.userAffiliation && (
                        <span className="text-[11px] text-muted-foreground">· {r.userAffiliation}</span>
                      )}
                      {r.userPosition && (
                        <span className="text-[11px] text-muted-foreground">· {r.userPosition}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      {r.overallRating != null && r.overallRating > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <Star size={11} className="fill-current" />
                          {r.overallRating.toFixed(1)}
                        </span>
                      )}
                      {r.willAttendAgain && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                          {WILL_ATTEND_AGAIN_LABELS[r.willAttendAgain]}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString("ko-KR") : "—"}
                      </span>
                    </div>
                  </div>

                  <p className="mb-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {r.generalImpression}
                  </p>

                  <dl className="grid gap-2 text-xs sm:grid-cols-2">
                    {r.recommendTo && (
                      <ReviewRow label="추천 대상" value={r.recommendTo} />
                    )}
                    {r.mostImpressivePaperTitle && (
                      <ReviewRow
                        label="인상 깊은 논문"
                        value={`${r.mostImpressivePaperTitle}${r.mostImpressivePaperReason ? ` — ${r.mostImpressivePaperReason}` : ""}`}
                      />
                    )}
                    {r.mostImpressivePosterTitle && (
                      <ReviewRow
                        label="인상 깊은 포스터"
                        value={`${r.mostImpressivePosterTitle}${r.mostImpressivePosterReason ? ` — ${r.mostImpressivePosterReason}` : ""}`}
                      />
                    )}
                    {r.researchTakeaway && (
                      <ReviewRow label="내 연구에 참고할 내용" value={r.researchTakeaway} />
                    )}
                    {r.finalWords && (
                      <ReviewRow label="마지막 한마디" value={r.finalWords} />
                    )}
                  </dl>
                </li>
              ))}
          </ul>
        )}
      </div>

      <p className="rounded-lg border border-dashed bg-muted/10 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">참고:</strong> 회원이 작성한 <em>아쉬운 점</em>(regrets) 은 별도 collection
        (read 권한: 본인+운영진) 으로 분리 저장되어 본 페이지에는 표시되지 않습니다. v2 에서 회원 동의 항목별로 통합 표시 예정.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-2.5">
      <dt className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">{value}</dd>
    </div>
  );
}

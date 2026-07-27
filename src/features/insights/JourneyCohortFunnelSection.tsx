"use client";

/**
 * 회원 여정 완주율 코호트 퍼널 — v18-M3.
 *
 * v17 `JourneyStepperWidget` 은 **개인**의 여정 단계(가입/프로필→진단→가이드→활동)만 판정한다.
 * 운영진이 "코호트가 어느 단계에서 이탈하는가"를 보는 집계 표면이 없어, 다음 콘텐츠·넛지 기획이
 * 감에 의존했다. 이 패널은 승인 회원 코호트를 대상으로 4단계 각 도달 수·전 단계 대비 전환율·
 * 최대 이탈 단계를 한 장에서 보여준다.
 *
 * 단계 정의는 `journey-stages`(개인 스텝퍼와 공용)를 따른다 — 개인·집계 기준 불일치 방지.
 *  1) 가입·프로필 완성  : isProfileComplete (bio + 관심 키워드 1건+)
 *  2) 진단 완료         : diagnostic_results 1건+ 보유 회원
 *  3) 가이드 학습 시작   : guide_progress completedItems 1건+ (hasGuideStarted)
 *  4) 활동 참여         : activities.participants 포함 또는 comm_likes 1건+ (plan M3: participants/likes)
 *
 * 제약: DB/rules 무변경(순수 읽기 집계). 운영진 전용(isAtLeast staff 가드). 시맨틱 토큰만.
 * 표본(승인 회원) 0 시 "데이터 부족" 안전 표시 — H2 Weave 패턴 준수.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Route, TrendingDown, ShieldAlert, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { profilesApi, diagnosticResultsApi, activitiesApi, dataApi } from "@/lib/bkend";
import {
  JOURNEY_STAGE_META,
  hasGuideStarted,
  isProfileComplete,
} from "@/features/dashboard/journey-stages";
import type { User, Activity, GuideProgress, DiagnosticResult } from "@/types";
import type { CommLike } from "@/types/comm-board";

const STALE_TIME = 5 * 60_000;

interface StageNode {
  key: string;
  label: string;
  count: number;
  /** 전 단계(또는 코호트) 대비 전환율 %; 분모 0 이면 null */
  convRate: number | null;
  /** 전 단계 대비 이탈 인원 */
  drop: number;
  isMaxDrop: boolean;
}

export default function JourneyCohortFunnelSection() {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");

  // (1) 승인 회원 — 코호트 분모 ─────────────────────────────────────────────
  const { data: members, isLoading: membersLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["journey-cohort-members"],
    queryFn: async (): Promise<User[]> => {
      const res = await profilesApi.list({ "filter[approved]": true, limit: 2000 });
      return (res.data ?? []) as User[];
    },
  });

  // (2) 진단 완료 회원 ───────────────────────────────────────────────────────
  const { data: diagnostics, isLoading: diagLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["journey-cohort-diagnostics"],
    queryFn: async (): Promise<DiagnosticResult[]> => {
      const res = await diagnosticResultsApi.listAll(2000);
      return (res.data ?? []) as DiagnosticResult[];
    },
  });

  // (3) 가이드 진행 — staff 는 guide_progress 전체 list 허용(rules: isStaffOrAbove) ──
  const { data: guideProgress, isLoading: guideLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["journey-cohort-guide-progress"],
    queryFn: async (): Promise<GuideProgress[]> => {
      const res = await dataApi.list<GuideProgress>("guide_progress", { limit: 2000 });
      return (res.data ?? []) as GuideProgress[];
    },
  });

  // (4-a) 활동 참여 — activities.participants ─────────────────────────────────
  const { data: activities, isLoading: actLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["journey-cohort-activities"],
    queryFn: async (): Promise<Activity[]> => {
      const res = await activitiesApi.list();
      return (res.data ?? []) as Activity[];
    },
  });

  // (4-b) 활동 참여 — comm_likes(좋아요·demand-join) ──────────────────────────
  const { data: commLikes, isLoading: likesLoading } = useQuery({
    enabled: isStaff,
    staleTime: STALE_TIME,
    queryKey: ["journey-cohort-comm-likes"],
    queryFn: async (): Promise<CommLike[]> => {
      const res = await dataApi.list<CommLike>("comm_likes", { limit: 5000 });
      return (res.data ?? []) as CommLike[];
    },
  });

  const funnel = useMemo(() => {
    const memberList = members ?? [];
    const memberIds = new Set(memberList.map((m) => m.id));
    const base = memberList.length;

    // 단계별 도달 회원 id 집합 — 전부 승인 회원 코호트로 교집합(게스트·비회원 제외)
    const profileIds = new Set(
      memberList.filter((m) => isProfileComplete(m)).map((m) => m.id),
    );

    const diagIds = new Set<string>();
    for (const r of diagnostics ?? []) {
      if (r.userId && memberIds.has(r.userId)) diagIds.add(r.userId);
    }

    const guideIds = new Set<string>();
    for (const g of guideProgress ?? []) {
      if (g.userId && memberIds.has(g.userId) && hasGuideStarted(g)) guideIds.add(g.userId);
    }

    const activityIds = new Set<string>();
    for (const a of activities ?? []) {
      for (const pid of a.participants ?? []) {
        if (memberIds.has(pid)) activityIds.add(pid);
      }
    }
    for (const l of commLikes ?? []) {
      if (l.userId && memberIds.has(l.userId)) activityIds.add(l.userId);
    }

    const rawCounts: Record<string, number> = {
      profile: profileIds.size,
      diagnosis: diagIds.size,
      guide: guideIds.size,
      activity: activityIds.size,
    };

    // 전환율·이탈: 코호트(base) → 프로필 → 진단 → 가이드 → 활동
    const prevOf = [base, rawCounts.profile, rawCounts.diagnosis, rawCounts.guide];
    const nodes: StageNode[] = JOURNEY_STAGE_META.map((meta, i) => {
      const count = rawCounts[meta.key] ?? 0;
      const prev = prevOf[i];
      return {
        key: meta.key,
        label: meta.label,
        count,
        convRate: prev > 0 ? Math.round((count / prev) * 100) : null,
        drop: Math.max(0, prev - count),
        isMaxDrop: false,
      };
    });

    // 최대 이탈 단계 하이라이트 (전 단계 대비 인원 감소폭 최대)
    let maxDrop = 0;
    let maxIdx = -1;
    nodes.forEach((n, i) => {
      if (n.drop > maxDrop) {
        maxDrop = n.drop;
        maxIdx = i;
      }
    });
    if (maxIdx >= 0) nodes[maxIdx].isMaxDrop = true;

    const completionRate = base > 0 ? Math.round((rawCounts.activity / base) * 100) : null;

    return { base, nodes, completionRate, maxIdx };
  }, [members, diagnostics, guideProgress, activities, commLikes]);

  if (!isStaff) {
    return (
      <div className="rounded-2xl border border-warning/20 bg-warning/5 p-6 text-center text-sm text-warning">
        <ShieldAlert className="mx-auto mb-2" size={24} aria-hidden />
        운영진 전용 지표입니다.
      </div>
    );
  }

  const anyLoading =
    membersLoading || diagLoading || guideLoading || actLoading || likesLoading;

  const goodCompletion = funnel.completionRate !== null && funnel.completionRate >= 25;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex flex-wrap items-center gap-2 text-sm font-bold">
        <Route size={15} className="text-primary" aria-hidden />
        회원 여정 완주 퍼널
        <span className="text-[11px] font-normal text-muted-foreground">
          · 승인 회원 코호트 · 개인 스텝퍼와 동일 단계 기준
        </span>
        <span className="ml-auto">
          {funnel.completionRate === null ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              데이터 부족
            </span>
          ) : (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                goodCompletion ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
              )}
            >
              완주율 {funnel.completionRate}% · {goodCompletion ? "양호" : "주의"}
            </span>
          )}
        </span>
      </h2>

      {anyLoading ? (
        <div className="flex justify-center py-8">
          <Loader2
            className="animate-spin text-muted-foreground"
            size={18}
            role="img"
            aria-label="집계 불러오는 중"
          />
        </div>
      ) : funnel.base === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          데이터 부족 — 집계 가능한 승인 회원이 아직 없습니다.
        </p>
      ) : (
        <>
          <p className="mt-1 text-[11px] text-muted-foreground">
            전체 승인 회원 <span className="font-semibold tabular-nums text-foreground">{funnel.base}</span>명
            기준 · 각 단계 도달 회원 수 · 전 단계 대비 전환율 · 최대 이탈 단계 강조
          </p>

          {/* 가로 퍼널 — 각 단계 도달 수 + 단계 사이 전환율 */}
          <div className="mt-4 flex items-stretch gap-1.5 overflow-x-auto pb-1">
            {funnel.nodes.map((n, i) => (
              <div key={n.key} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "flex min-w-[92px] flex-col items-center rounded-xl border px-3 py-2.5",
                    n.isMaxDrop
                      ? "border-warning/40 bg-warning/5"
                      : i === funnel.nodes.length - 1
                        ? "border-success/30 bg-success/5"
                        : "bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "text-xl font-bold tabular-nums",
                      n.isMaxDrop
                        ? "text-warning"
                        : i === funnel.nodes.length - 1
                          ? "text-success"
                          : "text-foreground",
                    )}
                  >
                    {n.count}
                  </span>
                  <span className="mt-0.5 text-center text-[10px] leading-tight text-muted-foreground">
                    {n.label}
                  </span>
                  {n.isMaxDrop && (
                    <span className="mt-1 inline-flex items-center gap-0.5 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-semibold text-warning">
                      <TrendingDown size={9} aria-hidden />
                      최대 이탈
                    </span>
                  )}
                </div>
                {i < funnel.nodes.length - 1 && (
                  <div className="flex shrink-0 flex-col items-center px-0.5 text-muted-foreground">
                    <span className="text-[9px] leading-none text-muted-foreground/60" aria-hidden>
                      ›
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium tabular-nums">
                      {funnel.nodes[i + 1].convRate === null
                        ? "—"
                        : `${funnel.nodes[i + 1].convRate}%`}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 단계별 전환·이탈 상세 */}
          <ul className="mt-4 space-y-1.5">
            {funnel.nodes.map((n, i) => (
              <li
                key={n.key}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs",
                  n.isMaxDrop ? "border-warning/30 bg-warning/5" : "bg-card",
                )}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  {n.isMaxDrop && (
                    <TrendingDown size={12} className="shrink-0 text-warning" aria-hidden />
                  )}
                  <span>{i + 1}. {n.label}</span>
                </span>
                <span className="flex items-center gap-3 tabular-nums text-muted-foreground">
                  <span>
                    <span className="font-semibold text-foreground">{n.count}</span>명
                  </span>
                  <span>
                    전환 {n.convRate === null ? "—" : `${n.convRate}%`}
                    {n.drop > 0 && (
                      <span className={cn("ml-1", n.isMaxDrop ? "text-warning" : "text-muted-foreground")}>
                        (−{n.drop}명)
                      </span>
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3 text-[11px] text-muted-foreground">
            완주율 = 활동 참여 {funnel.nodes[3]?.count ?? 0}명 / 전체 승인 회원 {funnel.base}명. 최대
            이탈 단계는 다음 콘텐츠·넛지 기획의 우선 대상입니다.
          </p>
        </>
      )}
    </section>
  );
}

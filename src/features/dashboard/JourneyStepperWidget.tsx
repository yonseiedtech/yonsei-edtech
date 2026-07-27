"use client";

/**
 * JourneyStepperWidget — 회원 여정 완주 넛지 통합 스텝퍼 (v17 H3).
 *
 * 온보딩·진단·학습·활동이 각 위젯으로 흩어져 회원이 "여정 어디에 있고 다음이 무엇인지"를
 * 한눈에 못 보던 문제를, 4단계 통합 스텝퍼 하나로 오케스트레이션한다.
 *  1) 가입·프로필 완성   → profiles(자기소개+관심 키워드) 완성 여부(isProfileComplete)
 *  2) 연구 준비도 진단     → 진단 결과 1건+ (useUserDiagnostics — 대시보드 공통 훅 재사용)
 *  3) 가이드 학습 시작     → guide_progress completedItems 1건+ (NewcomerProgressWidget 판정 재사용)
 *  4) 활동(스터디·세미나·수요) 참여 → comm_likes(좋아요·demand-join) · 세미나 참석 · 대학원 활동 이력 중 1개+
 *
 * 판정은 전부 기존 데이터 읽기 재사용(DB/rules 무변경). 미완 단계에 단일 다음행동 CTA,
 * 완주자에겐 멘토/수요 등 활동 심화 CTA로 리텐션을 끌어올린다.
 *
 * 오케스트레이션(중복 회피):
 *  - 신입 창(가입 14일 이내)에는 NewcomerProgressWidget(첫 2주 여정)이 담당하므로 null 렌더.
 *  - 졸업생(alumni)은 진단·가이드 대신 프로필→커뮤니티 활동의 축약 여정으로 분기.
 *  - 재사용 쿼리 키(seminars·gradlife)는 DashboardCommandCenter 와 캐시를 공유해 추가 read 를 만들지 않는다.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Circle, Compass, ArrowRight, Trophy } from "lucide-react";
import WidgetCard from "@/components/ui/widget-card";
import { useAuthStore } from "@/features/auth/auth-store";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { hasGuideStarted } from "@/features/dashboard/journey-stages";
import { getUserPersona } from "@/features/dashboard/widget-visibility";
import { isNewcomerWindow, isProfileComplete } from "@/lib/newcomer-sequence";
import { cohortKeyOf, currentSemesterKey } from "@/lib/semester";
import {
  guideProgressApi,
  gradLifePositionsApi,
  commLikesApi,
  seminarsApi,
} from "@/lib/bkend";
import type { Seminar, GradLifePosition } from "@/types";

interface JourneyStep {
  key: string;
  label: string;
  done: boolean;
  href: string;
  /** 미완일 때 노출할 단일 다음행동 문구 */
  cta: string;
  desc: string;
}

interface DeepeningCta {
  key: string;
  label: string;
  href: string;
}

export default function JourneyStepperWidget() {
  const { user } = useAuthStore();
  const userId = user?.id;

  // 신입 창(현재 학기 코호트 + 14일 이내)이면 NewcomerProgressWidget 이 담당 → 이 위젯은 양보
  const windowOpen = useMemo(() => {
    if (!user) return false;
    return isNewcomerWindow(
      cohortKeyOf(user),
      currentSemesterKey(),
      (user as { createdAt?: string | null }).createdAt ?? null,
    );
  }, [user]);

  const persona = getUserPersona(user);
  const isAlum = persona === "alumni";
  // 위젯 활성(신입 창 밖 + 로그인) 시에만 read. 진단·가이드는 재학/운영 대상만.
  const active = !!userId && !windowOpen;
  const researchActive = active && !isAlum;

  // (1) 프로필 완성 — 동기 판정(추가 read 없음)
  const profileDone = user ? isProfileComplete(user) : false;

  // (2) 진단 완료 — 대시보드 공통 훅 재사용(캐시 공유, 추가 read 0)
  const { data: diagnosisDone = false } = useUserDiagnostics(
    researchActive ? userId : undefined,
    (list) => list.length > 0,
  );

  // (3) 가이드 학습 시작 — completedItems 1건+ (NewcomerProgressWidget 과 동일 판정)
  const { data: guideStarted = false } = useQuery({
    queryKey: ["journey-guide-started", userId],
    queryFn: async () => {
      const docs = await guideProgressApi.listByUser(userId as string);
      return docs.some((d) => hasGuideStarted(d));
    },
    enabled: researchActive,
    staleTime: 5 * 60_000,
    retry: false,
  });

  // (4) 활동 참여 — comm_likes(좋아요·demand-join 참여 의사)
  const { data: activityReactions = 0 } = useQuery({
    queryKey: ["journey-comm-likes", userId],
    queryFn: async () => (await commLikesApi.listMineSet(userId as string)).size,
    enabled: active,
    staleTime: 5 * 60_000,
    retry: false,
  });
  // (4) 세미나 참석 — DashboardCommandCenter 와 동일 키로 캐시 공유(추가 read 0)
  const { data: seminars = [] } = useQuery({
    queryKey: ["dashboard-upcoming-seminars"],
    queryFn: async () => (await seminarsApi.list({ limit: 100 })).data as Seminar[],
    enabled: active,
    staleTime: 3 * 60_000,
  });
  // (4) 대학원 활동 이력 — DashboardCommandCenter 와 동일 키로 캐시 공유(추가 read 0)
  const { data: positions = [] } = useQuery({
    queryKey: ["dashboard-gradlife", userId],
    queryFn: async () => (await gradLifePositionsApi.listByUser(userId as string)).data as GradLifePosition[],
    enabled: active,
    staleTime: 5 * 60_000,
  });

  const activityDone = useMemo(() => {
    if (activityReactions > 0) return true;
    if (positions.length > 0) return true;
    return userId ? seminars.some((s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(userId)) : false;
  }, [activityReactions, positions, seminars, userId]);

  const steps = useMemo<JourneyStep[]>(() => {
    if (isAlum) {
      return [
        {
          key: "profile",
          label: "프로필 최신화",
          done: profileDone,
          href: "/mypage?tab=settings",
          cta: "프로필 완성하기",
          desc: "졸업 후 이력·관심 분야를 최신으로 유지해요.",
        },
        {
          key: "activity",
          label: "커뮤니티 활동 참여",
          done: activityDone,
          href: "/mentoring",
          cta: "멘토링·세미나 참여",
          desc: "세미나·멘토링·수요조사로 후배와 이어져요.",
        },
      ];
    }
    return [
      {
        key: "profile",
        label: "가입·프로필 완성",
        done: profileDone,
        href: "/mypage?tab=settings",
        cta: "프로필 완성하기",
        desc: "관심 분야·자기소개를 채우면 맞춤 추천이 시작돼요.",
      },
      {
        key: "diagnosis",
        label: "연구 준비도 진단",
        done: diagnosisDone,
        href: "/diagnosis",
        cta: "3분 진단하기",
        desc: "통계·연구방법·핵심개념 준비도를 확인해요.",
      },
      {
        key: "guide",
        label: "가이드 학습 시작",
        done: guideStarted,
        href: "/learning-guides",
        cta: diagnosisDone ? "약점 가이드 보기" : "가이드 서재 열기",
        desc: "러닝 가이드로 부족한 개념을 채워요.",
      },
      {
        key: "activity",
        label: "활동 참여 (스터디·세미나·수요)",
        done: activityDone,
        href: "/activities/studies?tab=demand",
        cta: "스터디·수요 둘러보기",
        desc: "관심 스터디·세미나·수요조사에 참여해요.",
      },
    ];
  }, [isAlum, profileDone, diagnosisDone, guideStarted, activityDone]);

  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = doneCount >= total;
  const nextStep = steps.find((s) => !s.done);

  const deepeningCtas: DeepeningCta[] = isAlum
    ? [
        { key: "mentor", label: "후배 멘토 되기", href: "/mentoring" },
        { key: "seminar", label: "세미나 발표 제안", href: "/seminars" },
      ]
    : [
        { key: "mentor", label: "멘토 되기", href: "/mentoring" },
        { key: "demand", label: "스터디 수요 남기기", href: "/activities/studies?tab=demand" },
      ];

  // 미로그인·신입 창(NewcomerProgressWidget 담당)에서는 미노출
  if (!user || windowOpen) return null;

  // ── 완주자: 활동 심화 CTA(리텐션 상향) ──
  if (allDone) {
    return (
      <WidgetCard
        title="여정 완주 🎉"
        icon={Trophy}
        semantic="success"
        actions={
          <span className="text-xs font-semibold tabular-nums text-success">
            {doneCount}/{total}
          </span>
        }
      >
        <p className="mt-2 text-sm text-muted-foreground">
          프로필·진단·학습·활동까지 여정을 완주했어요. 이제 학회에 기여하며 한 걸음 더 나아가 보세요.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {deepeningCtas.map((c) => (
            <Link
              key={c.key}
              href={c.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/15"
            >
              {c.label}
              <ArrowRight size={12} aria-hidden />
            </Link>
          ))}
        </div>
      </WidgetCard>
    );
  }

  const pct = Math.round((doneCount / total) * 100);

  return (
    <WidgetCard
      title="나의 여정"
      icon={Compass}
      semantic="info"
      actions={
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {doneCount}/{total}
        </span>
      }
    >
      <div
        className="mt-3"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`여정 진행률 ${pct}%`}
      >
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted/40">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          가입부터 활동까지, 다음 한 걸음을 따라가면 학회를 200% 활용할 수 있어요.
        </p>
      </div>

      <ul className="mt-4 grid gap-1">
        {steps.map((s) => {
          const StatusIcon = s.done ? CheckCircle2 : Circle;
          return (
            <li key={s.key}>
              {s.done ? (
                <div
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground"
                  aria-label={`${s.label} 완료`}
                >
                  <StatusIcon size={16} className="shrink-0 text-success" aria-hidden />
                  <span className="truncate line-through">{s.label}</span>
                </div>
              ) : (
                <Link
                  href={s.href}
                  className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-muted/40"
                  aria-label={`${s.label} — ${s.cta}`}
                >
                  <StatusIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{s.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{s.desc}</span>
                  </span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {nextStep && (
        <Link
          href={nextStep.href}
          className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <span className="min-w-0 truncate">다음: {nextStep.cta}</span>
          <ArrowRight size={15} className="shrink-0" aria-hidden />
        </Link>
      )}
    </WidgetCard>
  );
}

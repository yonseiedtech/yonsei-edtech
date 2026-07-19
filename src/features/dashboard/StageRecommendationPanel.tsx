"use client";

/**
 * 이번 학기 추천 한 걸음 패널 (사이클 85, 2026-06-13)
 *
 * 여정 시나리오 문서(docs/dashboard-user-journeys.md)의 최우선 High 항목.
 * 대시보드 커맨드 센터 아래에서 "지금 학기에 무엇을 하면 되는지"를 추천 행동(링크)으로 제시한다.
 *
 * 설계: ThesisJourney 풀 카드(연구 페이지·마이페이지)를 복제하지 않고 JOURNEY_STAGES 를
 * 단일 출처로 재사용 — 대시보드에는 현재 학기 목표 + 추천 도구 칩(경량)만 노출하고,
 * 전체 팁·진행률은 "전체 여정 보기"(마이페이지)로 위임한다.
 *
 * 학기 미설정자는 JourneyGreetingHeader 가 이미 "여정 설정" 을 유도하므로 본 패널은 비노출(null).
 */

import { useMemo } from "react";
import Link from "next/link";
import { useUserDiagnostics } from "@/features/dashboard/useUserDiagnostics";
import { ArrowRight, Footprints, Target } from "lucide-react";
import { JOURNEY_STAGES } from "@/features/research/ThesisJourney";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import type { User } from "@/types";

export default function StageRecommendationPanel({ user }: { user: User }) {
  // Phase 3: 진단 결과 배선 — 최신 진단의 약점 개념을 학기 추천에 반영
  const { data: diagResults = [] } = useUserDiagnostics(user.id);
  const weakConcepts = useMemo(() => {
    const latest = [...diagResults].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    )[0];
    if (!latest?.weakConceptIds?.length) return [];
    return latest.weakConceptIds
      .map((id, i) => ({ id, name: latest.weakConceptNames?.[i] ?? "" }))
      .filter((c) => c.name)
      .slice(0, 3);
  }, [diagResults]);
  const stage = useMemo(() => {
    const override = user.thesisJourneyStage;
    if (typeof override === "number" && override >= 1 && override <= 5) {
      return JOURNEY_STAGES[override - 1];
    }
    const sem = getEffectiveSemesterCount(user);
    if (sem == null) return null;
    return JOURNEY_STAGES[Math.min(Math.max(sem, 1), 5) - 1];
  }, [user]);

  // 학기 정보가 없으면 비노출 — 여정 설정 유도는 JourneyGreetingHeader 가 담당 (중복 방지)
  if (!stage) return null;

  const StageIcon = stage.icon;
  const tools = stage.tools.slice(0, 4);
  const archiveTopics = (stage.archiveTopics ?? []).slice(0, 3);

  return (
    <section
      aria-label="이번 학기 추천 한 걸음"
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Footprints size={16} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold tracking-tight">이번 학기 추천 한 걸음</h2>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <StageIcon size={11} className="text-primary/70" />
              {stage.semesterLabel} · {stage.title}
            </p>
          </div>
        </div>
        <Link
          href="/mypage/research"
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-primary transition-colors hover:underline"
        >
          전체 여정 보기
          <ArrowRight size={11} />
        </Link>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
        {stage.goal}
      </p>

      {/* 추천 행동 — 현재 학기 tools 를 링크 칩으로 */}
      <div className="mt-3 flex flex-wrap gap-2">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.04] px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
          >
            {tool.label}
            <ArrowRight
              size={12}
              className="text-primary/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            />
          </Link>
        ))}
      </div>

      {/* Phase 3: 진단 약점 개념 보완 추천 (최신 진단 기반, 있을 때만) */}
      {weakConcepts.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-warning">
            <Target size={11} />
            진단 기반 보완
          </span>
          {weakConcepts.map((c) => (
            <Link
              key={c.id}
              href={`/archive/concept/${c.id}`}
              className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-warning transition-colors hover:bg-warning/15"
            >
              {c.name}
            </Link>
          ))}
          <Link href="/diagnosis" className="text-muted-foreground hover:text-primary hover:underline">
            재진단 →
          </Link>
        </div>
      )}

      {/* 관련 아카이브 딥링크 (있을 때만) */}
      {archiveTopics.length > 0 && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="shrink-0">관련 아카이브</span>
          {archiveTopics.map((topic) => (
            <Link
              key={topic.href}
              href={topic.href}
              className="rounded-full bg-muted px-2 py-0.5 text-foreground/70 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              {topic.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

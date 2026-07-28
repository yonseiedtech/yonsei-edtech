"use client";

/**
 * 학기별 온보딩 가이드북 리더 (`/steppingstone/semester/[semester]`)
 *
 * `roadmap_stages` 의 published stage 중 matchSemester(또는 slug) 가 일치하는
 * 학기를 러닝가이드 감성의 가이드북 페이지로 렌더한다.
 * - Firestore 가 비어있으면 SemesterRoadmap 의 STATIC_FALLBACK 을 재사용.
 * - 리치 필드(overview/sections/resources)가 없으면 체크리스트만 + "준비 중" 안내.
 *
 * Mastery Learning(Bloom, 1968) 진행 저장은 `mastery-progress.ts`(stage.order 키)
 * 를 그대로 재사용해 SemesterRoadmap 카드와 진행률이 동기화된다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Book,
  BookOpen,
  Brain,
  Download,
  ExternalLink,
  GraduationCap,
  Library,
  ListChecks,
  Presentation,
  Star,
  Trophy,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import BackButton from "@/components/ui/back-button";
import { Checkbox } from "@/components/ui/checkbox";
import SimpleMarkdown from "@/features/learning-guides/SimpleMarkdown";
import { useAuthStore } from "@/features/auth/auth-store";
import { getEffectiveSemesterCount } from "@/lib/interview-target";
import { roadmapStagesApi } from "@/lib/bkend";
import {
  BLOOM_STAGE_LABELS,
  type BloomStage,
  type RoadmapStage,
} from "@/types/steppingstone";
import {
  STATIC_FALLBACK,
  type RoadmapItem,
} from "@/features/steppingstone/SemesterRoadmap";
import {
  getItemChecked,
  setItemChecked,
} from "@/features/steppingstone/mastery-progress";
import { getGuidebookFallback } from "@/features/steppingstone/semester-guidebook-content";
import { cn } from "@/lib/utils";

// ── 정규화 (RoadmapStage · RoadmapItem → GuidebookStage) ─────────────────────
interface GuidebookStage {
  semester: number; // matchSemester
  order: number;
  title: string;
  shortTag: string;
  items: string[];
  bloomStage?: BloomStage;
  isAlumni?: boolean;
  slug?: string;
  overview?: string;
  sections?: { heading: string; body: string }[];
  resources?: { label: string; href: string; kind?: "internal" | "external" | "download" }[];
}

function stageFromRoadmap(s: RoadmapStage): GuidebookStage {
  return {
    semester: s.matchSemester,
    order: s.order,
    title: s.title,
    shortTag: s.shortTag,
    items: s.items ?? [],
    bloomStage: s.bloomStage,
    isAlumni: s.isAlumni,
    slug: s.slug,
    overview: s.overview,
    sections: s.sections,
    resources: s.resources,
  };
}

function stageFromFallback(s: RoadmapItem): GuidebookStage {
  return {
    semester: s.semester,
    order: s.order,
    title: s.title,
    shortTag: s.shortTag,
    items: s.items ?? [],
    bloomStage: s.bloomStage,
    isAlumni: s.isAlumni,
  };
}

const FALLBACK_STAGES: GuidebookStage[] = STATIC_FALLBACK.map(stageFromFallback);

/** 본인 학기 매칭 — SemesterRoadmap 과 동일 로직 */
function matchMySemester(
  stages: GuidebookStage[],
  cumulative: number | null,
  isAlumni: boolean,
): number | null {
  if (cumulative == null && !isAlumni) return null;
  if (isAlumni) {
    return stages.find((s) => s.isAlumni)?.semester ?? null;
  }
  if (cumulative == null) return null;
  const exact = stages.find((s) => s.semester === cumulative);
  if (exact) return exact.semester;
  const eligible = stages
    .filter((s) => !s.isAlumni && s.semester <= cumulative)
    .sort((a, b) => b.semester - a.semester);
  return eligible[0]?.semester ?? null;
}

/** 학기 맥락 교차링크 매핑 */
function crossLinks(stage: GuidebookStage): { label: string; href: string; icon: typeof Book }[] {
  const links: { label: string; href: string; icon: typeof Book }[] = [];
  if (stage.semester === 1) {
    links.push({ label: "신입생 온보딩", href: "/steppingstone/onboarding", icon: GraduationCap });
  }
  if (stage.semester === 2 || stage.semester === 3) {
    links.push({ label: "학술대회 준비", href: "/steppingstone/conference", icon: Presentation });
  }
  if (stage.semester >= 4 || stage.isAlumni) {
    links.push({ label: "졸업·디펜스 준비", href: "/steppingstone/thesis-defense", icon: GraduationCap });
  }
  links.push({ label: "에듀테크 아카이브", href: "/archive", icon: Library });
  return links;
}

/** 섹션 앵커 id — 안정성 위해 index 기반 */
function sectionId(idx: number): string {
  return `guide-sec-${idx}`;
}

// ── 완전 학습 체크리스트 (Mastery Learning) ──────────────────────────────────
function GuidebookChecklist({
  stage,
  isLoggedIn,
}: {
  stage: GuidebookStage;
  isLoggedIn: boolean;
}) {
  // SSR-safe 초기값 false → useEffect 에서 localStorage 로드
  const [checked, setChecked] = useState<boolean[]>(() =>
    (stage.items ?? []).map(() => false),
  );

  useEffect(() => {
    // SSR-safe 하이드레이션: 서버는 항상 false, 마운트 후 localStorage 를 1회 반영
    // (하이드레이션 불일치 회피 목적의 의도된 setState — 캐스케이드 아님).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked((stage.items ?? []).map((_, i) => getItemChecked(stage.order, i)));
  }, [stage.order, stage.items]);

  const total = (stage.items ?? []).length;
  const done = checked.filter(Boolean).length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const mastered = total > 0 && done === total;

  const handleCheck = useCallback(
    (idx: number, value: boolean) => {
      setChecked((prev) => {
        const next = [...prev];
        next[idx] = value;
        return next;
      });
      setItemChecked(stage.order, idx, value);
    },
    [stage.order],
  );

  if (total === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks size={20} className="text-primary" />
        <h2 className="text-lg font-bold">완전 학습 체크리스트</h2>
      </div>

      {/* 진행률 헤더 */}
      <div className="mb-4 space-y-1.5 rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {mastered ? (
              <Trophy size={14} className="text-success" />
            ) : (
              <Brain size={14} className="text-primary" />
            )}
            {mastered ? "이 학기 완전 학습 달성!" : "완전 학습 진행"}
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              mastered ? "text-success" : "text-muted-foreground",
            )}
          >
            {done}/{total}
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`진행률 ${Math.round(pct)}%`}
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              mastered ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">Mastery Learning · Bloom (1968)</p>
      </div>

      <ul className="space-y-2">
        {(stage.items ?? []).map((item, i) => {
          const itemId = `guidebook-item-${stage.order}-${i}`;
          const isChecked = checked[i] ?? false;
          return (
            <li
              key={i}
              className="flex items-start gap-2.5 rounded-2xl border bg-card p-3.5"
            >
              <Checkbox
                id={itemId}
                checked={isLoggedIn ? isChecked : false}
                disabled={!isLoggedIn}
                onCheckedChange={
                  isLoggedIn ? (val) => handleCheck(i, val === true) : undefined
                }
                aria-label={
                  isLoggedIn
                    ? `${stage.title} — ${item} 완료 체크`
                    : `${item} (로그인 후 체크 가능)`
                }
                className="mt-0.5 shrink-0"
              />
              <label
                htmlFor={itemId}
                className={cn(
                  "text-sm leading-relaxed transition-colors",
                  isLoggedIn && isChecked
                    ? "cursor-pointer text-muted-foreground line-through"
                    : isLoggedIn
                      ? "cursor-pointer text-foreground/80"
                      : "cursor-default text-foreground/80",
                )}
              >
                {item}
              </label>
            </li>
          );
        })}
      </ul>

      {!isLoggedIn && (
        <p className="mt-3 text-xs text-muted-foreground">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
          하면 항목별 진행률이 저장됩니다.
        </p>
      )}
    </section>
  );
}

// ── 페이지 ────────────────────────────────────────────────────────────────────
export default function SemesterGuidebookPage() {
  const params = useParams<{ semester: string }>();
  const semesterParam = Array.isArray(params.semester)
    ? params.semester[0]
    : params.semester;
  const semesterNum = Number(semesterParam);

  const { user } = useAuthStore();
  const isLoggedIn = !!user;
  const isAlumni = !!(user as { isAlumni?: boolean } | null)?.isAlumni;

  const [stages, setStages] = useState<GuidebookStage[]>(FALLBACK_STAGES);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    roadmapStagesApi
      .listPublished()
      .then((res) => {
        const data = (res.data ?? []) as RoadmapStage[];
        if (data.length > 0) {
          const sorted = [...data].sort((a, b) => a.order - b.order);
          setStages(sorted.map(stageFromRoadmap));
        }
      })
      .catch(() => {
        // keep fallback
      })
      .finally(() => setLoaded(true));
  }, []);

  // 매칭 stage 선택 — matchSemester 우선, 없으면 slug
  const stage = useMemo(() => {
    if (Number.isFinite(semesterNum)) {
      const bySemester = stages.find((s) => s.semester === semesterNum);
      if (bySemester) return bySemester;
    }
    const bySlug = stages.find((s) => s.slug && s.slug === semesterParam);
    return bySlug ?? null;
  }, [stages, semesterNum, semesterParam]);

  // 본인 학기 매칭 (Date 순수성 — getEffectiveSemesterCount 를 useMemo 로 고정)
  const myMatched = useMemo(() => {
    if (!user) return null;
    const cumulative = getEffectiveSemesterCount(user) ?? 1;
    return matchMySemester(stages, cumulative, isAlumni);
  }, [stages, user, isAlumni]);

  const isMine = stage != null && myMatched === stage.semester;

  // 이전/다음 학기 (order 정렬)
  const { prev, next } = useMemo(() => {
    if (!stage) return { prev: null as GuidebookStage | null, next: null as GuidebookStage | null };
    const sorted = [...stages].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((s) => s.order === stage.order && s.semester === stage.semester);
    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [stages, stage]);

  // 매칭 stage 없음 (로딩 후)
  if (!stage) {
    return (
      <PageContainer width="narrow">
        <BackButton href="/steppingstone" label="인지디딤판" className="mb-4" />
        <div className="rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-8 text-center">
          <Book size={28} className="mx-auto mb-3 text-muted-foreground" />
          <h1 className="text-lg font-bold">
            {loaded ? "해당 학기 가이드북이 아직 없습니다" : "가이드북을 불러오는 중…"}
          </h1>
          {loaded && (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                요청한 학기의 온보딩 가이드북이 준비되지 않았습니다. 학기별 로드맵에서 다른 학기를 살펴보세요.
              </p>
              <Link
                href="/steppingstone"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                <ArrowLeft size={14} />
                학기별 로드맵으로 돌아가기
              </Link>
            </>
          )}
        </div>
      </PageContainer>
    );
  }

  const links = crossLinks(stage);
  // Firestore 리치필드 우선, 비어있으면 코드 번들 콘텐츠로 폴백(운영진 조치 없이 노출)
  const fallback = getGuidebookFallback(stage.semester);
  const overview = stage.overview ?? fallback?.overview;
  const sections =
    stage.sections && stage.sections.length > 0 ? stage.sections : fallback?.sections ?? [];
  const resources =
    stage.resources && stage.resources.length > 0 ? stage.resources : fallback?.resources ?? [];
  const hasSections = sections.length > 0;

  return (
    <PageContainer width="narrow">
      <BackButton href="/steppingstone" label="인지디딤판" className="mb-4" />

      {/* ── Hero ── */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          {stage.shortTag && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
              {stage.shortTag}
            </span>
          )}
          {stage.bloomStage && (
            <span
              className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
              title="Bloom's Taxonomy (Anderson & Krathwohl, 2001) — 본 학기 주된 인지 활동 단계"
            >
              <Brain size={9} aria-hidden />
              인지 단계 · {BLOOM_STAGE_LABELS[stage.bloomStage]}
            </span>
          )}
          {isMine && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-primary-foreground shadow-sm">
              <Star size={10} className="fill-current" />
              내 학기
            </span>
          )}
        </div>
        <h1 className="mt-3 flex items-start gap-3 text-3xl font-bold tracking-tight">
          <BookOpen size={28} className="mt-1 shrink-0 text-primary" aria-hidden />
          {stage.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          학기별 온보딩 가이드북 — 이 학기에 꼭 챙겨야 할 것을 깊이 있게 안내합니다.
        </p>
      </header>

      {/* ── 개요 ── */}
      {overview && (
        <section className="mb-8 rounded-2xl border bg-card p-5">
          <SimpleMarkdown body={overview} />
        </section>
      )}

      {/* ── 가이드북 챕터 ── */}
      {hasSections ? (
        <section>
          {/* 목차 */}
          {sections.length > 1 && (
            <nav
              aria-label="가이드북 목차"
              className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4"
            >
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                <ListChecks size={13} />
                목차
              </p>
              <ul className="space-y-1">
                {sections.map((sec, i) => (
                  <li key={i}>
                    <a
                      href={`#${sectionId(i)}`}
                      className="text-sm text-foreground/80 hover:text-primary hover:underline"
                    >
                      {i + 1}. {sec.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="space-y-8">
            {sections.map((sec, i) => (
              <article key={i} id={sectionId(i)} className="scroll-mt-20">
                <h2 className="mb-2 border-b pb-2 text-xl font-bold text-foreground">
                  {sec.heading}
                </h2>
                <SimpleMarkdown body={sec.body} />
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
          가이드북 본문 준비 중 — 아래 체크리스트로 이 학기 핵심 과제를 먼저 챙겨 보세요.
        </section>
      )}

      {/* ── 완전 학습 체크리스트 ── */}
      <GuidebookChecklist stage={stage} isLoggedIn={isLoggedIn} />

      {/* ── 자료·바로가기 ── */}
      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <Library size={20} className="text-primary" />
          <h2 className="text-lg font-bold">자료·바로가기</h2>
        </div>

        {resources.length > 0 && (
          <div className="mb-4 grid gap-2 sm:grid-cols-2">
            {resources.map((r, i) => {
              const isExternal = r.kind === "external" || /^https?:\/\//.test(r.href);
              const Icon =
                r.kind === "download" ? Download : isExternal ? ExternalLink : ArrowRight;
              const inner = (
                <>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={15} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-semibold">{r.label}</span>
                </>
              );
              const cls =
                "flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5";
              return isExternal ? (
                <a
                  key={i}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                >
                  {inner}
                </a>
              ) : (
                <Link key={i} href={r.href} className={cls}>
                  {inner}
                </Link>
              );
            })}
          </div>
        )}

        {/* 학기 맥락 교차링크 */}
        <div className="flex flex-wrap gap-2">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon size={13} aria-hidden />
                {l.label}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 이전/다음 학기 내비 ── */}
      <nav className="mt-12 flex items-stretch gap-3 border-t pt-6" aria-label="학기 이동">
        {prev ? (
          <Link
            href={`/steppingstone/semester/${prev.semester}`}
            className="group flex flex-1 items-center gap-2 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <ArrowLeft size={16} className="shrink-0 text-muted-foreground group-hover:text-primary" />
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">이전 학기</span>
              <span className="block truncate text-sm font-semibold">{prev.title}</span>
            </span>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {next ? (
          <Link
            href={`/steppingstone/semester/${next.semester}`}
            className="group flex flex-1 items-center justify-end gap-2 rounded-2xl border bg-card p-4 text-right transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="min-w-0">
              <span className="block text-[11px] text-muted-foreground">다음 학기</span>
              <span className="block truncate text-sm font-semibold">{next.title}</span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </nav>
    </PageContainer>
  );
}

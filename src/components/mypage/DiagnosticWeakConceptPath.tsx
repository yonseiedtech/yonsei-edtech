"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  alumniThesesApi,
} from "@/lib/bkend";
import type { ArchiveMeasurementTool } from "@/types/edutech-archive";
import type { AlumniThesis } from "@/types/alumni";
import { useStudyTimerStore } from "@/features/research/study-timer/study-timer-store";
import { useCreateSession } from "@/features/research/study-timer/useStudySessions";
import {
  Lightbulb,
  ArrowRight,
  ChevronDown,
  Ruler,
  GraduationCap,
  BookOpen,
} from "lucide-react";

const MAX_THESES = 4;

/** 약점 개념별로 큐레이션된 학습 경로 (측정도구 + 졸업생 논문) */
interface ConceptPath {
  conceptId: string;
  name: string;
  measurements: ArchiveMeasurementTool[];
  theses: AlumniThesis[];
}

interface DiagnosticWeakConceptPathProps {
  weakConceptIds: string[];
  weakConceptNames?: string[];
}

export default function DiagnosticWeakConceptPath({
  weakConceptIds,
  weakConceptNames,
}: DiagnosticWeakConceptPathProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { active, start: startTimer } = useStudyTimerStore();
  const { mutateAsync: createSession, isPending: isStarting } = useCreateSession();

  /**
   * 약점 개념을 주제로 일반 reading 세션 시작 (논문 전용 아님 → source="external").
   * 종료 흐름: ChatWidget onStop 이 endSession 으로 잔디 반영 + FloatingReadingTimer
   * handleStop 이 source="external" 로 ReadingLogModal 을 열어 안전하게 처리됨.
   * 신규 컬렉션·잔디 가중치 추가 없음 (기존 reading 경로 재사용).
   */
  async function handleReadConcept(name: string) {
    if (active) {
      toast.error("이미 진행 중인 세션이 있습니다");
      return;
    }
    const title = `${name} 집중 읽기`;
    try {
      const session = await createSession({ type: "reading", targetTitle: title });
      startTimer({
        id: session.id,
        type: "reading",
        targetTitle: title,
        startTime: Date.now(),
        readingSource: "external",
      });
      toast.success("30분 집중 읽기 시작 📖 — 우측 하단 부엉이가 함께해요");
    } catch {
      toast.error("타이머 시작에 실패했습니다");
    }
  }

  // 전체 list 호출은 컬렉션당 1회씩만 (변인/측정도구/논문) + 개념별 get 묶음. staleTime 5분.
  const { data: paths = [], isLoading } = useQuery({
    queryKey: ["weak-concept-path", weakConceptIds],
    queryFn: async (): Promise<ConceptPath[]> => {
      const [concepts, variablesRes, measurementsRes, thesesRes] = await Promise.all([
        Promise.all(weakConceptIds.map((cid) => archiveConceptsApi.get(cid).catch(() => null))),
        archiveVariablesApi.list(),
        archiveMeasurementsApi.list(),
        alumniThesesApi.list(),
      ]);

      const allVariables = variablesRes.data;
      const allMeasurements = measurementsRes.data;
      const allTheses = thesesRes.data;

      return weakConceptIds.map((cid, i) => {
        const concept = concepts[i];
        const name = concept?.name ?? weakConceptNames?.[i] ?? "개념";

        // 개념 → 변인 → 측정도구
        const measurementIds = new Set<string>();
        (concept?.variableIds ?? []).forEach((vid) => {
          const variable = allVariables.find((v) => v.id === vid);
          variable?.measurementIds?.forEach((mid) => measurementIds.add(mid));
        });
        const measurements = allMeasurements.filter((m) => measurementIds.has(m.id));

        // 개념 → 졸업생 논문 (최신 학위수여년월 순)
        const theses = allTheses
          .filter((t) => t.conceptIds?.includes(cid))
          .sort((a, b) =>
            (b.awardedYearMonth || "").localeCompare(a.awardedYearMonth || ""),
          );

        return { conceptId: cid, name, measurements, theses };
      });
    },
    enabled: weakConceptIds.length > 0,
    staleTime: 5 * 60_000,
  });

  // 방어: 약점 개념이 없으면 렌더하지 않음 (부모도 조건 렌더하지만 이중 방어)
  if (weakConceptIds.length === 0) return null;

  return (
    <div className="mt-4 border-t border-violet-200/60 pt-3 dark:border-violet-800/40">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-violet-900 dark:text-violet-200">
        <Lightbulb size={14} className="text-amber-500" />
        추천 학습 경로
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        틀린 문항과 연결된 개념입니다. 펼치면 관련 측정도구와 졸업생 논문을 큐레이션해 드립니다.
      </p>

      <div className="mt-2 space-y-1.5">
        {weakConceptIds.map((cid, i) => {
          const path = paths.find((p) => p.conceptId === cid);
          const name = path?.name ?? weakConceptNames?.[i] ?? "개념 보기";
          const isOpen = expandedId === cid;
          const measurementCount = path?.measurements.length ?? 0;
          const thesisCount = path?.theses.length ?? 0;

          return (
            <div
              key={cid}
              className="overflow-hidden rounded-xl border border-violet-200 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/30"
            >
              {/* 개념 헤더 — 펼침 토글 + 아카이브 링크 */}
              <div className="flex items-center gap-1.5 px-3 py-2">
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : cid)}
                  aria-expanded={isOpen}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                >
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-violet-500 transition-transform dark:text-violet-400 ${isOpen ? "rotate-180" : ""}`}
                  />
                  <span className="truncate text-[13px] font-semibold text-violet-900 dark:text-violet-200">
                    {name}
                  </span>
                  {!isLoading && (measurementCount > 0 || thesisCount > 0) && (
                    <span className="shrink-0 text-[10px] text-violet-600/70 dark:text-violet-300/60">
                      측정도구 {measurementCount} · 논문 {thesisCount}
                    </span>
                  )}
                </button>
                <Link
                  href={`/archive/concept/${cid}`}
                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-900/40"
                >
                  정의 보기
                  <ArrowRight size={11} />
                </Link>
              </div>

              {/* 펼침 패널 — 측정도구 + 졸업생 논문 */}
              {isOpen && (
                <div className="border-t border-violet-200/60 bg-card/60 px-3 py-2.5 dark:border-violet-800/40 dark:bg-black/20">
                  {/* 이 개념으로 30분 집중 읽기 — 일반 reading 세션(잔디 반영) */}
                  <button
                    type="button"
                    onClick={() => handleReadConcept(name)}
                    disabled={isStarting || !!active}
                    className="mb-2.5 inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-violet-500 dark:hover:bg-violet-600"
                  >
                    <BookOpen size={13} />
                    {active ? "진행 중인 세션 있음" : "이 개념으로 30분 집중 읽기"}
                  </button>
                  {isLoading ? (
                    <div
                      className="h-12 animate-pulse rounded-lg bg-violet-100/60 dark:bg-violet-900/20"
                      aria-busy="true"
                      aria-label="추천 학습 경로 불러오는 중"
                    />
                  ) : measurementCount === 0 && thesisCount === 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      아직 연결된 측정도구·논문이 없습니다.{" "}
                      <Link
                        href={`/archive/concept/${cid}`}
                        className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-300"
                      >
                        아카이브에서 개념 정의 보기
                      </Link>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* 측정도구 */}
                      {measurementCount > 0 && (
                        <div>
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <Ruler size={11} />
                            측정도구
                          </p>
                          <ul className="space-y-1">
                            {path!.measurements.map((m) => (
                              <li key={m.id}>
                                <Link
                                  href={`/archive/measurement/${m.id}`}
                                  className="group flex items-start gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="text-[12px] font-medium text-foreground group-hover:underline">
                                      {m.name}
                                    </span>
                                    {m.originalName && (
                                      <span className="ml-1 text-[10px] text-muted-foreground">
                                        {m.originalName}
                                      </span>
                                    )}
                                    {m.author && (
                                      <span className="block text-[10px] text-muted-foreground">
                                        {m.author}
                                      </span>
                                    )}
                                  </span>
                                  <ArrowRight
                                    size={11}
                                    className="mt-0.5 shrink-0 text-emerald-500 opacity-0 transition-opacity group-hover:opacity-100"
                                  />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 졸업생 논문 */}
                      {thesisCount > 0 && (
                        <div>
                          <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                            <GraduationCap size={11} />
                            졸업생 논문
                          </p>
                          <ul className="space-y-1">
                            {path!.theses.slice(0, MAX_THESES).map((t) => (
                              <li key={t.id}>
                                <Link
                                  href={`/alumni/thesis/${t.id}`}
                                  className="group block rounded-md px-1.5 py-1 transition-colors hover:bg-violet-100/60 dark:hover:bg-violet-900/30"
                                >
                                  <span className="line-clamp-2 text-[12px] font-medium text-foreground group-hover:underline">
                                    {t.title}
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                    {[t.authorName, t.awardedYearMonth]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                          {thesisCount > MAX_THESES && (
                            <Link
                              href={`/archive/concept/${cid}`}
                              className="mt-1 inline-block text-[10px] font-medium text-violet-600 hover:underline dark:text-violet-400"
                            >
                              외 {thesisCount - MAX_THESES}편 더 보기
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

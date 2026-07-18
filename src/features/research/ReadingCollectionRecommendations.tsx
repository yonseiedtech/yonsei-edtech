"use client";

/**
 * ReadingCollectionRecommendations — 내 읽기 컬렉션 기반 반복 탐색 추천 (벤치마크 M1)
 *
 * 읽은 논문(paper_reading_logs) + 읽기 리스트(user.thesisReadingList)를 컬렉션으로 보고,
 * 그 방법·변인·개념 프로필로 아직 안 읽은 졸업논문 상위 N편 + 관련 아카이브 개념을 추천.
 * 컬렉션이 커질수록 프로필이 진화(순수 함수 recommendFromReadingCollection).
 *
 * 콜드스타트(컬렉션 3편 미만)이거나 추천이 없으면 조용히 미노출.
 * 데이터: usePaperReadingLogs + user.thesisReadingList + alumni_theses(캐시 공유) + archive_concepts.
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Compass, GraduationCap, Lightbulb, ArrowRight } from "lucide-react";
import { alumniThesesApi, archiveConceptsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { usePaperReadingLogs } from "@/features/research/usePaperReadingLogs";
import {
  recommendFromReadingCollection,
  MIN_COLLECTION_SIZE,
} from "@/lib/reading-collection-recommend";
import type { AlumniThesis } from "@/types/alumni";
import type { ArchiveConcept } from "@/types/edutech-archive";

function yearMonthLabel(yearMonth?: string): string | null {
  if (!yearMonth) return null;
  const m = yearMonth.match(/^(\d{4})-(\d{2})$/);
  if (!m) return yearMonth;
  return `${m[1]}년 ${Number(m[2])}월`;
}

export default function ReadingCollectionRecommendations() {
  const { user } = useAuthStore();
  const { logs } = usePaperReadingLogs();
  const readingListIds = useMemo(
    () => user?.thesisReadingList ?? [],
    [user?.thesisReadingList],
  );

  // 콜드스타트 게이트를 위해 컬렉션 편수를 먼저 값싸게 계산(읽기 기록 + 읽기 리스트).
  const collectionSize = useMemo(() => {
    const keys = new Set<string>();
    for (const l of logs) {
      if (l.source === "alumni_thesis" && l.refId) keys.add(`t:${l.refId}`);
      else keys.add(`x:${(l.title ?? "").trim().toLowerCase() || l.id}`);
    }
    for (const id of readingListIds) if (id) keys.add(`t:${id}`);
    return keys.size;
  }, [logs, readingListIds]);

  const enabled = collectionSize >= MIN_COLLECTION_SIZE;

  // 졸업논문 — ResearchPaperList 추천과 동일 캐시 키로 공유(중복 요청 방지).
  const { data: theses = [] } = useQuery({
    queryKey: ["alumni-theses-for-reco"],
    queryFn: async () => {
      const res = await alumniThesesApi.list({ limit: 500 });
      return res.data as unknown as AlumniThesis[];
    },
    staleTime: 10 * 60_000,
    enabled,
  });

  // 씨앗 논문에 개념 id가 하나라도 있을 때만 개념 사전 로드(불필요한 요청 회피).
  const seedHasConcepts = useMemo(() => {
    if (theses.length === 0) return false;
    const byId = new Map(theses.map((t) => [t.id, t]));
    const seedIds = new Set<string>();
    for (const l of logs) if (l.source === "alumni_thesis" && l.refId) seedIds.add(l.refId);
    for (const id of readingListIds) if (id) seedIds.add(id);
    for (const id of seedIds) {
      if ((byId.get(id)?.conceptIds?.length ?? 0) > 0) return true;
    }
    return false;
  }, [theses, logs, readingListIds]);

  const { data: concepts = [] } = useQuery({
    queryKey: ["archive-concepts-all"],
    queryFn: async () => {
      const res = await archiveConceptsApi.list();
      return res.data as unknown as ArchiveConcept[];
    },
    staleTime: 30 * 60_000,
    enabled: enabled && seedHasConcepts,
  });

  const conceptNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of concepts) map[c.id] = c.purifiedName || c.name;
    return map;
  }, [concepts]);

  const reco = useMemo(
    () =>
      recommendFromReadingCollection({
        readingLogs: logs,
        readingListIds,
        theses,
        conceptNameById,
      }),
    [logs, readingListIds, theses, conceptNameById],
  );

  if (!enabled || reco.status !== "ok" || reco.items.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-1 flex items-center gap-2">
        <Compass className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">내 컬렉션 기반 추천</h3>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
        읽은 논문 {reco.collectionSize}편의 방법·변인·개념을 모아 비슷한 졸업생 학위논문을
        추천해요. 더 많이 읽고 저장할수록 추천이 정교해집니다.
      </p>

      {reco.relatedConcepts.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Lightbulb className="h-3 w-3" />
            관련 개념
          </span>
          {reco.relatedConcepts.map((c) => (
            <Link
              key={c.id}
              href={`/archive/concept/${c.id}`}
              className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <ul className="space-y-2">
        {reco.items.map((it) => {
          const ym = yearMonthLabel(it.thesis.awardedYearMonth);
          return (
            <li key={it.thesis.id}>
              <Link
                href={`/alumni/thesis/${it.thesis.id}`}
                className="group block rounded-xl border bg-background p-3 transition-colors hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{it.thesis.title}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {it.thesis.authorName}
                      {ym ? ` · ${ym}` : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                </div>
                {it.overlapLabels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {it.overlapLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

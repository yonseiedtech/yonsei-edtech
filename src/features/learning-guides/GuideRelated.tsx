"use client";

// M6: 러닝 가이드 ↔ 관련 스터디/개념 상호참조 (2026-07-27)
// 가이드 tags/category 기반으로 아카이브 개념 + 개설 스터디를 태그 교집합 매칭해 칩 링크로 노출.
// 매칭 0건이면 섹션 전체 숨김. 읽기 전용 — DB/rules/api.ts 무변경.

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Users } from "lucide-react";
import { archiveConceptsApi, activitiesApi } from "@/lib/bkend";
import type { ArchiveConcept } from "@/types/edutech-archive";
import type { Activity } from "@/types/academic";

// ── 정규화 헬퍼 ────────────────────────────────────────────────────────────────
function norm(s: string): string {
  return s.toLowerCase().trim();
}

function hasIntersection(a: string[], b: string[]): boolean {
  const setB = new Set(b.map(norm));
  return a.some((v) => setB.has(norm(v)));
}

// ── 매칭 로직 ─────────────────────────────────────────────────────────────────
function matchConcepts(
  concepts: ArchiveConcept[],
  guideTags: string[],
  limit: number,
): ArchiveConcept[] {
  if (guideTags.length === 0) return [];
  const normGuideTags = guideTags.map(norm);

  return concepts
    .filter((c) => {
      // name 이 guide tags 에 포함
      if (normGuideTags.includes(norm(c.name))) return true;
      // altNames 교집합
      if (c.altNames && c.altNames.some((a) => normGuideTags.includes(norm(a)))) return true;
      // concept.tags 와 guide.tags 교집합
      if (c.tags && c.tags.length > 0 && hasIntersection(c.tags, guideTags)) return true;
      return false;
    })
    .slice(0, limit);
}

function matchStudies(
  activities: Activity[],
  guideTags: string[],
  limit: number,
): Activity[] {
  if (guideTags.length === 0) return [];
  const normGuideTags = guideTags.map(norm);

  return activities
    .filter((a) => {
      // activity.tags 와 guide.tags 교집합
      const aTags = (a.tags ?? []) as string[];
      if (aTags.length > 0 && hasIntersection(aTags, guideTags)) return true;
      // 제목에 guide tag 키워드 포함
      const titleNorm = norm(a.title);
      if (normGuideTags.some((t) => t.length >= 2 && titleNorm.includes(t))) return true;
      return false;
    })
    .slice(0, limit);
}

// ── 칩 컴포넌트 ───────────────────────────────────────────────────────────────
function Chip({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "concept" | "study";
}) {
  const base =
    "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted";
  const colors =
    variant === "concept"
      ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
      : "border-secondary/30 bg-secondary/5 text-secondary-foreground hover:bg-secondary/10";

  return (
    <Link href={href} className={`${base} ${colors}`}>
      {variant === "concept" ? (
        <BookOpen size={11} className="shrink-0 text-primary/70" aria-hidden />
      ) : (
        <Users size={11} className="shrink-0 text-muted-foreground" aria-hidden />
      )}
      <span className="max-w-[12rem] truncate">{label}</span>
    </Link>
  );
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
interface GuideRelatedProps {
  tags: string[];
  category: string;
}

export default function GuideRelated({ tags, category }: GuideRelatedProps) {
  const [concepts, setConcepts] = useState<ArchiveConcept[]>([]);
  const [studies, setStudies] = useState<Activity[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [conceptsRes, studiesRes] = await Promise.all([
          archiveConceptsApi.list(),
          activitiesApi.list("study"),
        ]);

        if (cancelled) return;

        const matched = matchConcepts(conceptsRes.data, tags, 4);
        const matchedStudies = matchStudies(studiesRes.data, tags, 3);

        setConcepts(matched);
        setStudies(matchedStudies);
      } catch {
        // 조회 실패 시 섹션 미노출 (빈 상태 안전)
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [tags, category]);

  // 준비 전 또는 둘 다 0건이면 섹션 숨김
  if (!ready || (concepts.length === 0 && studies.length === 0)) return null;

  return (
    <section className="mt-8 rounded-xl border bg-card p-5">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        관련 학습
      </p>

      {concepts.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-foreground/70">아카이브 개념</p>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => (
              <Chip
                key={c.id}
                href={`/archive/concept/${c.id}`}
                label={c.name}
                variant="concept"
              />
            ))}
          </div>
        </div>
      )}

      {studies.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-foreground/70">개설된 스터디</p>
          <div className="flex flex-wrap gap-2">
            {studies.map((s) => (
              <Chip
                key={s.id}
                href={`/activities/studies/${s.id}`}
                label={s.title}
                variant="study"
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

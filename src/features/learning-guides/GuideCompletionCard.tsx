"use client";

// v17 M4: 러닝 가이드 "완독 축하 + 다음 행동" 카드 (2026-07-27)
// 가이드 뷰어에서 완독(readPageIds >= 전체 페이지 수) 도달 시에만 조건부 렌더된다.
// 완독=리텐션 정점에서 다음 행동(스터디 수요 남기기·관련 세미나·다음 가이드)으로 전환한다.
//
// 제약: DB/rules 무변경(읽기 전용 조회). 브랜드 시맨틱 토큰만.
// 완독 판정은 호출부(뷰어)가 기존 guide_progress 읽기로 수행 — 이 컴포넌트는 조건부 렌더 대상.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PartyPopper, CheckCircle2, BookOpen, ClipboardList, CalendarDays, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { seminarsApi } from "@/lib/bkend";
import { guidesApi } from "@/features/learning-guides/api";
import type { LearningGuide } from "@/types/learning-guide";
import type { Seminar } from "@/types/seminar";

// ── 정규화 헬퍼 ────────────────────────────────────────────────────────────────
function norm(s: string | undefined | null): string {
  return (s ?? "").toLowerCase().trim();
}

// ── 다음 추천 가이드 (카테고리 인접 + 태그 교집합 우선) ─────────────────────────
function pickNextGuides(all: LearningGuide[], current: LearningGuide, limit: number): LearningGuide[] {
  const normTags = new Set(current.tags.map(norm));
  return all
    .filter((g) => g.id !== current.id && g.category === current.category)
    .map((g) => ({
      guide: g,
      overlap: g.tags.reduce((n, t) => (normTags.has(norm(t)) ? n + 1 : n), 0),
    }))
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map((x) => x.guide);
}

// ── 관련 세미나 (예정·진행 중 + 가이드 태그가 제목/설명에 걸림) ──────────────────
function pickSeminars(all: Seminar[], guideTags: string[], limit: number): Seminar[] {
  const keys = guideTags.map(norm).filter((t) => t.length >= 2);
  if (keys.length === 0) return [];
  return all
    .filter((s) => s.status === "upcoming" || s.status === "ongoing")
    .filter((s) => {
      const hay = `${norm(s.title)} ${norm(s.description)}`;
      return keys.some((k) => hay.includes(k));
    })
    .slice(0, limit);
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
interface Props {
  guide: LearningGuide;
}

export default function GuideCompletionCard({ guide }: Props) {
  const [nextGuides, setNextGuides] = useState<LearningGuide[]>([]);
  const [seminars, setSeminars] = useState<Seminar[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [guidesRes, seminarsRes] = await Promise.all([
          guidesApi.list({ category: guide.category }),
          seminarsApi.list(),
        ]);
        if (cancelled) return;
        setNextGuides(pickNextGuides(guidesRes.data ?? [], guide, 2));
        setSeminars(pickSeminars(seminarsRes.data ?? [], guide.tags, 2));
      } catch {
        // 조회 실패 시 축하 + 수요 CTA만 노출 (안전한 빈 상태)
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [guide]);

  // 스터디 수요 폼 prefill 딥링크 (주제=대표 태그 또는 제목)
  const demandTopic = guide.tags.length > 0 ? guide.tags[0] : guide.title;
  const demandHref = `/activities/studies?tab=demand&demandTopic=${encodeURIComponent(demandTopic)}`;

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-success/30 bg-success/5">
      {/* 축하 헤더 (이어읽기 뱃지와 동일한 success 톤) */}
      <div className="flex items-start gap-3 border-b border-success/20 bg-success/10 px-5 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <PartyPopper size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="shrink-0 text-success" aria-hidden />
            <p className="text-sm font-semibold text-success">완독을 축하합니다!</p>
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            «{guide.title}»의 모든 페이지를 읽었어요. 배운 내용을 다음 행동으로 이어가 보세요.
          </p>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        {/* 스터디 수요 남기기 */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/70">
            <ClipboardList size={13} className="text-primary" aria-hidden /> 관련 스터디를 함께 하고 싶다면
          </p>
          <Link href={demandHref}>
            <Button size="sm" className="gap-1">
              스터디 수요 남기기 <ArrowRight size={13} aria-hidden />
            </Button>
          </Link>
        </div>

        {/* 관련 세미나 */}
        {seminars.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/70">
              <CalendarDays size={13} className="text-primary" aria-hidden /> 관련 세미나
            </p>
            <div className="flex flex-col gap-1.5">
              {seminars.map((s) => (
                <Link
                  key={s.id}
                  href={`/seminars/${s.id}`}
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
                >
                  <CalendarDays size={14} className="shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{s.title}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{norm(s.date).slice(0, 10)}</span>
                  <ArrowRight size={13} className="shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 다음 추천 가이드 */}
        {nextGuides.length > 0 && (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-foreground/70">
              <BookOpen size={13} className="text-primary" aria-hidden /> 이어서 읽어볼 가이드
            </p>
            <div className="flex flex-col gap-1.5">
              {nextGuides.map((g) => (
                <Link
                  key={g.id}
                  href={`/learning-guides/${g.slug}`}
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 transition-colors hover:bg-muted/40"
                >
                  <span className="text-base" aria-hidden>{g.coverEmoji ?? "📖"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{g.title}</span>
                  <ArrowRight size={13} className="shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 서재로 돌아가기 */}
        <div className="border-t border-success/20 pt-4">
          <Link href="/learning-guides">
            <Button variant="outline" size="sm" className="gap-1">
              <BookOpen size={13} aria-hidden /> 서재로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

"use client";

/**
 * 진단 약점 → 러닝 가이드/스터디 후속 학습 브릿지 (H2)
 *
 * 약점으로 진단된 영역(점수 < 60%)에 대해:
 *  (1) 관련 러닝 가이드 0~3개 칩 링크로 노출 (tags/category 클라이언트 교집합)
 *  (2) 매칭 가이드가 없으면 해당 주제로 스터디 수요 남기기 CTA
 *
 * 제약:
 *  - DB/rules 무변경. guidesApi.list() 읽기만 사용.
 *  - 브랜드 시맨틱 토큰만 사용 (raw 팔레트 금지).
 *  - 실패 시 빈 배열 fallback — 절대 크래시 없음.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Map, Users, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { guidesApi } from "@/features/learning-guides/api";
import type { LearningGuide } from "@/types/learning-guide";
import {
  DIAGNOSTIC_AREA_LABELS,
  DIAGNOSTIC_AREA_ORDER,
  areaScorePercent,
  type DiagnosticArea,
  type AreaScore,
} from "@/types";

// ── 영역 → 가이드 태그/카테고리 매칭 키워드 ────────────────────────────────
// LearningGuide.tags 또는 category 에 이 키워드가 포함되면 해당 영역과 매칭.
const AREA_KEYWORDS: Record<DiagnosticArea, string[]> = {
  statistics: ["통계", "statistics"],
  method: ["연구방법", "방법론", "method", "methodology"],
  concept: ["교육공학", "핵심개념", "concept", "이론", "theory"],
};

/** guide.tags + guide.category 중 area 키워드가 하나라도 포함되면 매칭. */
function guideMatchesArea(guide: LearningGuide, area: DiagnosticArea): boolean {
  const keywords = AREA_KEYWORDS[area];
  const fields = [guide.category, ...(guide.tags ?? [])].map((f) =>
    f.toLowerCase(),
  );
  return keywords.some((k) => {
    const lk = k.toLowerCase();
    return fields.some((f) => f.includes(lk));
  });
}

interface Props {
  areaScores: Partial<Record<DiagnosticArea, AreaScore>>;
}

export default function DiagnosisGuideBridge({ areaScores }: Props) {
  const [guides, setGuides] = useState<LearningGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    guidesApi
      .list()
      .then((r) => {
        if (!cancelled) setGuides(r.data ?? []);
      })
      .catch(() => {
        // 실패해도 빈 배열 — CTA fallback 이 자동 노출됨
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 약점 영역: 점수가 60% 미만이고 문항이 1개 이상인 영역만
  const weakAreas = DIAGNOSTIC_AREA_ORDER.filter((area) => {
    const score = areaScores[area];
    if (!score || score.total === 0) return false;
    return areaScorePercent(score) < 60;
  });

  // 약점 영역이 없으면 섹션 자체를 숨김
  if (weakAreas.length === 0) return null;

  return (
    <Card className="mt-6 rounded-2xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="h-4 w-4 text-primary" aria-hidden />
          약점 영역 추천 학습
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          약점으로 진단된 영역의 러닝 가이드로 학습을 이어가세요. 아직 가이드가
          없는 주제는 스터디 수요를 남기면 운영진이 개설을 검토합니다.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            추천 가이드 불러오는 중…
          </div>
        ) : (
          <ul className="space-y-5">
            {weakAreas.map((area) => {
              const matched = guides
                .filter((g) => guideMatchesArea(g, area))
                .slice(0, 3);
              const areaLabel = DIAGNOSTIC_AREA_LABELS[area];
              const demandHref = `/activities/studies?tab=demand&prefill=${encodeURIComponent(areaLabel)}`;

              return (
                <li key={area}>
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {areaLabel}
                  </p>

                  {matched.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matched.map((guide) => (
                        <Link
                          key={guide.id}
                          href={`/learning-guides/${guide.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                        >
                          {guide.coverEmoji && (
                            <span aria-hidden>{guide.coverEmoji}</span>
                          )}
                          {guide.title}
                          <ArrowRight
                            className="h-3 w-3 text-muted-foreground"
                            aria-hidden
                          />
                        </Link>
                      ))}
                    </div>
                  ) : (
                    /* 매칭 가이드 없음 → 스터디 수요 남기기 CTA */
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
                      <Users
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                        아직 이 주제의 러닝 가이드가 없습니다.
                      </p>
                      <Link
                        href={demandHref}
                        className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                      >
                        스터디 수요 남기기
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

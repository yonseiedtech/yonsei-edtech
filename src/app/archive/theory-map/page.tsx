"use client";

/**
 * 학습이론 가계도(Theory Map) — 공개 뷰.
 *
 * 3대 사조(행동주의계·인지주의계·구성주의계)와 세부 계열/이론 노드를 3열로
 * 배치한다. 각 노드는 아카이브 개념과 이름으로 매칭되면 상세로 링크되고,
 * 아직 없는 이론은 비활성(회색)으로 표시되어 개념이 추가되면 자동 활성화된다.
 *
 * 매칭 규칙은 /archive/terminology 의 AectTerminologyBrowser 패턴을 따른다.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, GitFork, Users, Link2, Sparkles } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import InlineNotification from "@/components/ui/inline-notification";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveConceptsApi } from "@/lib/bkend";
import {
  THEORY_FAMILIES,
  THEORY_NODES,
  THEORY_MAP_SOURCE,
  normalizeTheoryName,
  theoryNodesByFamily,
  type TheoryNode,
} from "@/lib/theory-family";
import { cn } from "@/lib/utils";

export default function TheoryMapPage() {
  // 개념 매칭 인덱스: normalize(name/aectTerm/altName) → conceptId
  const [conceptIndex, setConceptIndex] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await archiveConceptsApi.list();
        if (cancelled) return;
        const idx = new Map<string, string>();
        for (const c of res.data) {
          const keys = [c.name, c.aectTerm, ...(c.altNames ?? [])].filter(
            (x): x is string => !!x && x.trim().length > 0,
          );
          for (const k of keys) {
            const nk = normalizeTheoryName(k);
            if (nk && !idx.has(nk)) idx.set(nk, c.id);
          }
        }
        setConceptIndex(idx);
      } catch (err) {
        console.error("[theory-map] concept load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 이 노드와 일치하는 아카이브 개념 id (없으면 undefined) */
  function matchedConceptId(node: TheoryNode): string | undefined {
    for (const cand of node.conceptNameCandidates) {
      const id = conceptIndex.get(normalizeTheoryName(cand));
      if (id) return id;
    }
    return undefined;
  }

  const activeCount = useMemo(() => {
    if (loading) return 0;
    return THEORY_NODES.filter((n) => matchedConceptId(n)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptIndex, loading]);

  return (
    <PageContainer width="default">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <Link
          href="/archive"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          교육공학 아카이브로
        </Link>

        <PageHeader
          icon={GitFork}
          title="학습이론 가계도"
          description="행동주의계 · 인지주의계 · 구성주의계 — 학습이론의 계보와 대표 학자를 한 지도에서 살펴봅니다."
        />

        <Separator className="mt-6" />

        {/* ── 출처·저작권 고지 ── */}
        <div className="mt-6">
          <InlineNotification
            kind="info"
            title="이 지도에 대하여"
            description={
              <span>
                이 가계도는{" "}
                <em className="font-serif">{THEORY_MAP_SOURCE.book}</em>(
                {THEORY_MAP_SOURCE.author}, {THEORY_MAP_SOURCE.publisher},{" "}
                {THEORY_MAP_SOURCE.year})의 학습이론 계열 구분과 {THEORY_MAP_SOURCE.aect}{" "}
                용어 체계를 <strong>참고해 자체 재구성한 지도</strong>입니다. 원저작물의
                본문·그림은 전재하지 않으며, 각 이론 노드는 아카이브 개념과 이름으로
                연결됩니다. 사조·계열 분류는 학습을 돕기 위한 편의적 재구성이며 절대적
                경계는 아닙니다.
              </span>
            }
          />
        </div>

        {/* ── 안내 (연결·비활성 규칙) ── */}
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
            아카이브에 있는 이론 — 클릭하면 개념 상세로 이동
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full border border-dashed border-muted-foreground/60" aria-hidden />
            아직 없는 이론 — 곧 추가될 예정 (추가되면 자동 연결)
          </span>
          {!loading && (
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" aria-hidden />
              {THEORY_NODES.length}개 이론 중 {activeCount}개 연결됨
            </span>
          )}
        </p>

        {/* ── 3열 사조 레이아웃 ── */}
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          {THEORY_FAMILIES.map((family) => {
            const nodes = theoryNodesByFamily(family.key);
            return (
              <section
                key={family.key}
                aria-labelledby={`theory-family-${family.key}`}
                className="rounded-2xl border bg-muted/30 p-4 dark:bg-muted/10"
              >
                {/* 컬럼 헤더 */}
                <div className="mb-4 border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary tabular-nums">
                      {family.order}
                    </span>
                    <h2
                      id={`theory-family-${family.key}`}
                      className="text-base font-semibold tracking-tight"
                    >
                      {family.label}
                    </h2>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {family.tagline}
                  </p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                    {family.era}
                  </p>
                </div>

                {/* 노드 카드 목록 */}
                <div className="space-y-3">
                  {nodes.map((node) => {
                    const conceptId = loading ? undefined : matchedConceptId(node);
                    return (
                      <TheoryNodeCard
                        key={node.name}
                        node={node}
                        conceptId={conceptId}
                        loading={loading}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* ── 하단 안내 ── */}
        <p className="mt-6 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          &ldquo;→ 연결&rdquo; 칩은 이론 사이의 파생·영향·대조 관계를 나타냅니다. 사조를
          넘나드는 관계(예: 관찰학습의 행동↔인지 가교)도 함께 표시됩니다.
        </p>
      </div>
    </PageContainer>
  );
}

/** 개별 이론 노드 카드 */
function TheoryNodeCard({
  node,
  conceptId,
  loading,
}: {
  node: TheoryNode;
  conceptId: string | undefined;
  loading: boolean;
}) {
  const active = !!conceptId;

  const body = (
    <article
      className={cn(
        "h-full rounded-xl border p-3.5 transition-all",
        active
          ? "border-border bg-card shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          : "border-dashed border-muted-foreground/30 bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={cn(
            "text-sm font-semibold leading-snug tracking-tight",
            !active && "text-muted-foreground",
          )}
        >
          {node.name}
        </h3>
        {node.isOverview && (
          <Badge variant="outline" className="shrink-0 text-[9px] font-medium">
            총론
          </Badge>
        )}
      </div>

      {/* 대표 학자 */}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <Users className="h-3 w-3 text-muted-foreground" aria-hidden />
        {node.scholars.map((s) => (
          <Badge
            key={s}
            variant="outline"
            className="text-[10px] font-normal text-muted-foreground"
          >
            {s}
          </Badge>
        ))}
        {node.era && (
          <span className="ml-0.5 text-[10px] text-muted-foreground/70">{node.era}</span>
        )}
      </div>

      {/* 메모 */}
      {node.note && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{node.note}</p>
      )}

      {/* 간선(연결) 칩 */}
      {node.links && node.links.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {node.links.map((l) => (
            <span
              key={`${node.name}->${l.to}`}
              className="inline-flex items-center gap-0.5 rounded-full border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              <ArrowRight className="h-2.5 w-2.5" aria-hidden />
              {l.to}
              <span className="text-muted-foreground/60">· {l.relation}</span>
            </span>
          ))}
        </div>
      )}

      {/* CTA / 상태 */}
      <div className="mt-2.5">
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : active ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
            아카이브에서 보기
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground/70">
            곧 추가 예정
          </span>
        )}
      </div>
    </article>
  );

  if (active && conceptId) {
    return (
      <Link
        href={`/archive/concept/${conceptId}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
        aria-label={`${node.name} 아카이브 개념 보기`}
      >
        {body}
      </Link>
    );
  }
  return body;
}

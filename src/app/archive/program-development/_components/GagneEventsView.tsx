"use client";

import Link from "next/link";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { GAGNE_NINE_EVENTS } from "@/lib/program-development-guide";

interface GagneEventsViewProps {
  matchConceptId: (name: string) => string | undefined;
  conceptLoading: boolean;
}

export default function GagneEventsView({
  matchConceptId,
  conceptLoading,
}: GagneEventsViewProps) {
  return (
    <div>
      {/* 절차 네비게이터 */}
      <nav aria-label="가네 9절차 이동" className="mb-8">
        <ol className="flex flex-wrap items-center gap-2">
          {GAGNE_NINE_EVENTS.map((ev) => (
            <li key={ev.key}>
              <a
                href={`#gagne-${ev.key}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {ev.order}
                </span>
                {ev.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* 절차 카드 */}
      <div className="space-y-6">
        {GAGNE_NINE_EVENTS.map((ev) => (
          <section
            key={ev.key}
            id={`gagne-${ev.key}`}
            className="scroll-mt-24 rounded-2xl border bg-card p-5 sm:p-6"
          >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {ev.order}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight">{ev.title}</h2>
                  {ev.purifiedTitle && (
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {ev.purifiedTitle}
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{ev.summary}</p>
              </div>
            </div>

            {/* 활동 예시 */}
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <h3 className="text-sm font-semibold">교사가 할 수 있는 활동</h3>
              </div>
              <ul className="space-y-1.5">
                {ev.activities.map((a, ai) => (
                  <li key={ai} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 설계 팁 */}
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-dashed bg-muted/20 p-4">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">설계 팁 · </span>
                {ev.designTip}
              </p>
            </div>

            {/* 참고할 아카이브 개념 */}
            {ev.theoryLinks && ev.theoryLinks.length > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold">참고할 교육공학 개념</h3>
                </div>
                <div className="space-y-2">
                  {ev.theoryLinks.map((link) => {
                    const conceptId = conceptLoading ? undefined : matchConceptId(link.conceptName);
                    return (
                      <div key={link.conceptName} className="rounded-xl border bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{link.conceptName}</span>
                          {conceptId ? (
                            <Link
                              href={`/archive/concept/${conceptId}`}
                              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              아카이브에서 보기
                              <ArrowRight className="h-3 w-3" aria-hidden />
                            </Link>
                          ) : conceptLoading ? (
                            <Skeleton className="h-4 w-20" />
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{link.tip}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

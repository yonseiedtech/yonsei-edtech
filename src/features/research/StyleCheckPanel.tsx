"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SpellCheck, AlertTriangle, CheckCircle2, Languages, Clock, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InlineNotification from "@/components/ui/inline-notification";
import { cn } from "@/lib/utils";
import { writingTipsApi } from "@/lib/bkend";
import {
  styleIssues,
  styleCategoryOf,
  STYLE_CATEGORY_LABELS,
  STYLE_RULE_TIP_HINTS,
  LINT_CHAPTER_LABELS,
  type LintIssue,
  type LintSections,
  type StyleCategory,
} from "./writing-lint";
import type { WritingPaperChapterKey, WritingTip } from "@/types";

const CHAPTER_ORDER: WritingPaperChapterKey[] = [
  "intro",
  "background",
  "method",
  "results",
  "conclusion",
];

const CATEGORY_META: Record<StyleCategory, { icon: typeof Languages; accent: string }> = {
  translationese: { icon: Languages, accent: "text-destructive" },
  "tense-voice": { icon: Clock, accent: "text-cat-1" },
};

/** message("문체 점검 — 라벨: "예문". 힌트") 에서 라벨만 뽑기 */
function labelOf(message: string): string {
  const m = message.match(/문체 점검 — (.+?):/);
  return m ? m[1] : message;
}
function hintOf(message: string): string {
  const idx = message.indexOf(". ");
  return idx >= 0 ? message.slice(idx + 2) : "";
}

export default function StyleCheckPanel({ sections }: { sections: LintSections }) {
  // Phase 4-A: 규칙 ↔ 아카이브 글쓰기 팁 카드 딥링크 (카드 = 설명·예문의 정본)
  const { data: tipsRes } = useQuery({
    queryKey: ["writing-tips-published"],
    queryFn: () => writingTipsApi.listPublished(),
    staleTime: 10 * 60_000,
  });
  const tipHrefOfRule = useMemo(() => {
    const tips = (tipsRes?.data ?? []) as WritingTip[];
    return (ruleId: string): string | null => {
      const hint = STYLE_RULE_TIP_HINTS[ruleId];
      if (!hint || tips.length === 0) return null;
      const tip = tips.find((t) => (t.title ?? "").includes(hint));
      return tip ? `/archive/writing-tips/${tip.id}` : null;
    };
  }, [tipsRes]);

  const { byCat, total, counts, hasText } = useMemo(() => {
    const hasText = CHAPTER_ORDER.some((ch) =>
      (sections[ch] ?? []).some((s) => (s.paragraphs ?? []).some((p) => (p.text ?? "").trim())),
    );
    const issues = styleIssues(sections);
    const byCat: Record<StyleCategory, LintIssue[]> = { translationese: [], "tense-voice": [] };
    for (const i of issues) {
      const c = styleCategoryOf(i.rule);
      if (c) byCat[c].push(i);
    }
    const counts: Record<StyleCategory, number> = {
      translationese: byCat.translationese.length,
      "tense-voice": byCat["tense-voice"].length,
    };
    return { byCat, total: issues.length, counts, hasText };
  }, [sections]);

  const cats = Object.keys(byCat) as StyleCategory[];

  return (
    <div className="space-y-4">
      <InlineNotification
        kind="info"
        title="문체 점검 — 번역투·시제/태 (탐지 전용)"
        description={
          <span>
            전체 원고를 스캔해 <strong>어디에 어떤 패턴이 몇 번</strong> 나오는지 표시합니다. 수정문을
            대신 써 주지는 않습니다 — <strong>고칠지 여부는 작성자가 판단</strong>합니다.{" "}
            <span className="text-muted-foreground">
              패턴이라도 다 고치면 오히려 어색할 수 있으니, 반복·밀도만 손보고 정당한 용법은 유지하세요.
            </span>
          </span>
        }
      />

      {/* 요약 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm font-semibold">
          <SpellCheck size={15} />
          총 {total}건
        </span>
        {cats.map((c) => {
          const Icon = CATEGORY_META[c].icon;
          return (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs font-medium"
            >
              <Icon size={13} className={CATEGORY_META[c].accent} />
              {STYLE_CATEGORY_LABELS[c]} {counts[c]}건
            </span>
          );
        })}
      </div>

      {total === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-sm text-muted-foreground">
              {hasText
                ? "번역투·시제/태 패턴이 발견되지 않았습니다."
                : "원고를 작성하면 이 탭에서 번역투·시제/태를 점검합니다."}
            </p>
          </CardContent>
        </Card>
      ) : (
        cats
          .filter((c) => byCat[c].length > 0)
          .map((c) => {
            const Icon = CATEGORY_META[c].icon;
            const grouped = CHAPTER_ORDER.map((ch) => ({
              ch,
              items: byCat[c].filter((i) => i.chapter === ch),
            })).filter((g) => g.items.length > 0);
            return (
              <Card key={c} className="rounded-2xl">
                <CardContent className="p-5">
                  <h3 className={cn("flex items-center gap-1.5 text-sm font-semibold", CATEGORY_META[c].accent)}>
                    <Icon size={16} />
                    {STYLE_CATEGORY_LABELS[c]}
                    <span className="font-normal text-muted-foreground">({byCat[c].length})</span>
                  </h3>
                  <div className="mt-3 space-y-4">
                    {grouped.map((g) => (
                      <div key={g.ch}>
                        <p className="text-[11px] font-bold text-muted-foreground">
                          {LINT_CHAPTER_LABELS[g.ch]} ({g.items.length})
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                          {g.items.map((i, idx) => (
                            <li
                              key={`${i.rule}-${idx}`}
                              className="rounded-xl border bg-card p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    i.severity === "warn"
                                      ? "border-warning/30 bg-warning/5 text-warning"
                                      : "border-muted bg-muted/30 text-muted-foreground",
                                  )}
                                >
                                  {i.severity === "warn" ? "점검" : "참고"}
                                </Badge>
                                <span className="text-sm font-medium">{labelOf(i.message)}</span>
                              </div>
                              {i.excerpt && (
                                <p className="mt-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
                                  {i.excerpt}
                                </p>
                              )}
                              {hintOf(i.message) && (
                                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                  {hintOf(i.message)}
                                </p>
                              )}
                              {tipHrefOfRule(i.rule) && (
                                <Link
                                  href={tipHrefOfRule(i.rule)!}
                                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                >
                                  <BookOpen size={11} />
                                  설명·예문 카드 보기
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
      )}

      <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 p-3 text-xs text-warning">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <p>
          이 점검은 규칙 기반(정규식)이라 맥락을 완전히 이해하지 못합니다. 정당한 용법까지 표시될 수
          있으니, 표시된 위치를 직접 보고 고칠지 판단하세요.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InterviewMeta, InterviewResponse } from "@/types";
import { useInterviewResponses } from "./interview-store";
import { formatDate } from "@/lib/utils";

interface Props {
  postId: string;
  meta: InterviewMeta;
  canViewRestricted: boolean;
}

export default function InterviewResponses({ postId, meta, canViewRestricted }: Props) {
  const { responses, isLoading } = useInterviewResponses(postId);
  const submitted = useMemo(
    () => responses.filter((r) => r.status === "submitted"),
    [responses]
  );
  const questionById = useMemo(() => {
    const m = new Map<string, { order: number; prompt: string }>();
    meta.questions.forEach((q) => m.set(q.id, { order: q.order, prompt: q.prompt }));
    return m;
  }, [meta.questions]);

  const visibilityBlocked = meta.responseVisibility === "staff_only" && !canViewRestricted;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">응답 ({submitted.length})</h2>
        {meta.responseVisibility === "staff_only" && (
          <Badge variant="outline" className="text-xs">
            <Lock size={12} className="mr-1" />
            운영진 전용 공개
          </Badge>
        )}
      </div>

      {visibilityBlocked ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          이 인터뷰의 응답은 운영진만 열람할 수 있어요.
        </div>
      ) : isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">응답을 불러오는 중...</p>
      ) : submitted.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed bg-muted/40 p-8 text-center text-sm text-muted-foreground">
          아직 제출된 응답이 없어요. 가장 먼저 참여해 보세요!
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {submitted.map((r: InterviewResponse) => (
            <article key={r.id} className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{r.respondentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.submittedAt ? formatDate(r.submittedAt) : ""}
                  </p>
                </div>
                {r.respondentRole && (
                  <Badge variant="secondary" className="text-[10px]">
                    {r.respondentRole}
                  </Badge>
                )}
              </div>
              <div className="mt-4 space-y-4">
                {r.answers
                  .filter((a) => questionById.has(a.questionId))
                  .sort((a, b) => (questionById.get(a.questionId)!.order ?? 0) - (questionById.get(b.questionId)!.order ?? 0))
                  .map((a) => {
                    const q = questionById.get(a.questionId)!;
                    return (
                      <div key={a.questionId} className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold text-violet-700">Q{q.order}. {q.prompt}</p>
                        {a.text && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{a.text}</p>
                        )}
                        {a.imageUrls && a.imageUrls.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {a.imageUrls.map((u) => (
                              <a key={u} href={u} target="_blank" rel="noreferrer">
                                <img src={u} alt="" className="h-24 w-24 rounded-lg border object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

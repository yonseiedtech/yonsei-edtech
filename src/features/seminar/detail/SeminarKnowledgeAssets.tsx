"use client";

/**
 * 세미나 → 아카이브 자산화 "지식 아카이브" 섹션 (v6-H5)
 *
 * 세미나가 끝나면 Q&A·후기·다룬 개념이 사장되던 문제를 해결한다.
 * 종료된 세미나 상세에서만 렌더되며, 이미 공개 정책상 노출되는 데이터
 * (공개 후기 API·소통 보드 Q&A)만 재사용해 학술 자산으로 되살린다.
 *
 *  ① 채택/좋아요 상위 Q&A 하이라이트 (질문 + 답변 요지)
 *  ② 이 세미나에서 다뤄진 아카이브 개념 (제목·설명·Q&A 텍스트 concept-matching → 개념 칩)
 *  ③ 후기 하이라이트 1~2건
 *
 * 하나라도 내용이 있을 때만 섹션을 렌더한다(빈 섹션 방지).
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Library, MessageCircleQuestion, Tag, Quote, CheckCircle2, Heart, Star } from "lucide-react";
import { commBoardsApi, commQuestionsApi, commAnswersApi } from "@/lib/bkend";
import { useConceptIndex, splitTextByConcepts } from "@/features/archive/useConceptIndex";
import type { CommQuestion, CommAnswer } from "@/types";
import type { Seminar, SeminarReview } from "@/types";

interface Props {
  seminarId: string;
  seminar: Pick<Seminar, "title" | "description">;
}

interface QaHighlight {
  questionId: string;
  boardId: string;
  question: string;
  answer?: string;
  resolved: boolean;
  likeCount: number;
  answerCount: number;
}

function clamp(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export default function SeminarKnowledgeAssets({ seminarId, seminar }: Props) {
  // ── ① Q&A: 세미나 소통 보드의 질문/답변 (공개 read) ──
  const { data: qa } = useQuery({
    queryKey: ["seminar-knowledge-qa", seminarId],
    queryFn: async (): Promise<{ highlights: QaHighlight[]; texts: string[] }> => {
      const boardsRes = await commBoardsApi
        .listByContext("seminar", seminarId)
        .catch(() => ({ data: [] as { id: string }[] }));
      const boards = (boardsRes.data ?? []) as { id: string }[];
      if (boards.length === 0) return { highlights: [], texts: [] };

      const perBoard = await Promise.all(
        boards.map(async (b) => {
          const [qRes, aRes] = await Promise.all([
            commQuestionsApi.listByBoard(b.id).catch(() => ({ data: [] as CommQuestion[] })),
            commAnswersApi.listByBoard(b.id).catch(() => ({ data: [] as CommAnswer[] })),
          ]);
          return {
            questions: (qRes.data ?? []) as CommQuestion[],
            answers: (aRes.data ?? []) as CommAnswer[],
          };
        }),
      );

      const questions = perBoard.flatMap((p) => p.questions);
      const answers = perBoard.flatMap((p) => p.answers);

      // 답변 조회용 인덱스
      const answersByQuestion = new Map<string, CommAnswer[]>();
      for (const a of answers) {
        const list = answersByQuestion.get(a.questionId) ?? [];
        list.push(a);
        answersByQuestion.set(a.questionId, list);
      }

      const pickAnswer = (q: CommQuestion): CommAnswer | undefined => {
        const list = answersByQuestion.get(q.id) ?? [];
        if (list.length === 0) return undefined;
        if (q.resolvedAnswerId) {
          const adopted = list.find((a) => a.id === q.resolvedAnswerId);
          if (adopted) return adopted;
        }
        return [...list].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0))[0];
      };

      // 채택 우선 → 좋아요 → 답변 수 순으로 상위 3
      const ranked = [...questions].sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? -1 : 1;
        if ((b.likeCount ?? 0) !== (a.likeCount ?? 0)) return (b.likeCount ?? 0) - (a.likeCount ?? 0);
        return (b.answerCount ?? 0) - (a.answerCount ?? 0);
      });

      const highlights: QaHighlight[] = ranked.slice(0, 3).map((q) => {
        const ans = pickAnswer(q);
        return {
          questionId: q.id,
          boardId: q.boardId,
          question: q.body,
          answer: ans?.body,
          resolved: q.resolved,
          likeCount: q.likeCount ?? 0,
          answerCount: q.answerCount ?? 0,
        };
      });

      // 개념 매칭용 전체 텍스트(질문 + 답변 본문)
      const texts = [
        ...questions.map((q) => q.body),
        ...answers.map((a) => a.body),
      ].filter(Boolean);

      return { highlights, texts };
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── ③ 공개 후기 (기존 공개 정책과 동일한 엔드포인트) ──
  const { data: reviews } = useQuery({
    queryKey: ["seminar-knowledge-reviews", seminarId],
    queryFn: async (): Promise<SeminarReview[]> => {
      const res = await fetch(`/api/reviews?seminarId=${seminarId}&mode=list`);
      if (!res.ok) return [];
      const json = await res.json();
      return (json.data ?? []) as SeminarReview[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const reviewHighlights = useMemo(() => {
    const list = (reviews ?? []).filter(
      (r) => (r.type === "attendee" || !r.type) && r.content?.trim().length >= 10,
    );
    return [...list]
      .sort((a, b) => {
        if ((b.rating ?? 0) !== (a.rating ?? 0)) return (b.rating ?? 0) - (a.rating ?? 0);
        return (b.content?.length ?? 0) - (a.content?.length ?? 0);
      })
      .slice(0, 2);
  }, [reviews]);

  // ── ② 다뤄진 아카이브 개념 (concept-matching) ──
  const { data: conceptIndex } = useConceptIndex();

  const concepts = useMemo(() => {
    if (!conceptIndex || conceptIndex.length === 0) return [];
    const parts = [seminar.title, seminar.description ?? "", ...(qa?.texts ?? [])]
      .filter(Boolean)
      .join(" \n ");
    if (!parts.trim()) return [];
    const linked = splitTextByConcepts(parts, conceptIndex);
    const seen = new Map<string, string>();
    for (const p of linked) {
      if (p.conceptId && !seen.has(p.conceptId)) seen.set(p.conceptId, p.text);
    }
    return [...seen.entries()].slice(0, 10).map(([id, name]) => ({ id, name }));
  }, [conceptIndex, seminar.title, seminar.description, qa?.texts]);

  const qaHighlights = qa?.highlights ?? [];

  const hasContent =
    qaHighlights.length > 0 || concepts.length > 0 || reviewHighlights.length > 0;

  if (!hasContent) return null;

  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        <Library size={16} />
        지식 아카이브
      </h2>
      <p className="text-xs text-muted-foreground mb-5">
        이 세미나에서 오간 질문·개념·후기를 학회 지식 자산으로 남겼습니다.
      </p>

      <div className="space-y-6">
        {/* ② 다뤄진 개념 */}
        {concepts.length > 0 && (
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2.5">
              <Tag size={13} className="text-muted-foreground" />
              이 세미나에서 다뤄진 개념
            </h3>
            <ul className="flex flex-wrap gap-2">
              {concepts.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/archive/concept/${c.id}`}
                    className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                    title={`아카이브에서 '${c.name}' 개념 보기`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ① 우수 Q&A */}
        {qaHighlights.length > 0 && (
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2.5">
              <MessageCircleQuestion size={13} className="text-muted-foreground" />
              우수 Q&amp;A
            </h3>
            <ul className="space-y-2.5">
              {qaHighlights.map((h) => (
                <li key={h.questionId}>
                  <Link
                    href={`/boards/${h.boardId}`}
                    className="block rounded-lg border bg-muted/10 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 text-xs font-bold text-primary">Q</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground line-clamp-2">
                          {clamp(h.question, 140)}
                        </p>
                        <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted-foreground">
                          {h.resolved && (
                            <span className="inline-flex items-center gap-0.5 font-medium text-primary">
                              <CheckCircle2 size={11} /> 채택됨
                            </span>
                          )}
                          {h.likeCount > 0 && (
                            <span className="inline-flex items-center gap-0.5">
                              <Heart size={11} /> {h.likeCount}
                            </span>
                          )}
                          <span>답변 {h.answerCount}</span>
                        </div>
                      </div>
                    </div>
                    {h.answer && (
                      <div className="mt-2 flex items-start gap-2 border-t pt-2">
                        <span className="mt-0.5 shrink-0 text-xs font-bold text-muted-foreground">A</span>
                        <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                          {clamp(h.answer, 160)}
                        </p>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ③ 후기 하이라이트 */}
        {reviewHighlights.length > 0 && (
          <section>
            <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground mb-2.5">
              <Quote size={13} className="text-muted-foreground" />
              참석자 후기
            </h3>
            <ul className="space-y-2.5">
              {reviewHighlights.map((r) => (
                <li
                  key={r.id}
                  className="rounded-lg border bg-muted/10 px-4 py-3"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-foreground">{r.authorName}</span>
                    {typeof r.rating === "number" && (
                      <span className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <Star
                            key={v}
                            size={11}
                            className={
                              v <= (r.rating ?? 0)
                                ? "fill-primary text-primary"
                                : "text-muted-foreground/20"
                            }
                          />
                        ))}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {r.content}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

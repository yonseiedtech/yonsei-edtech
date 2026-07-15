"use client";

/**
 * useLivePollResults — poll_responses onSnapshot 구독 훅 + aggregateResults 집계 헬퍼
 *
 * Firestore Timestamp 크래시 방지: answers/id 만 사용하고 createdAt 은 방어적으로 정규화.
 * pollId 가 undefined 이면 구독하지 않고 빈 상태를 반환한다.
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Poll, PollResponse } from "@/types/academic";

// ── aggregateResults 반환 타입 (question.type 기반 discriminated union) ──

export interface SingleAgg {
  type: "single";
  tally: { optionId: string; optionText: string; count: number }[];
}
export interface MultipleAgg {
  type: "multiple";
  tally: { optionId: string; optionText: string; count: number }[];
}
export interface RatingAgg {
  type: "rating";
  average: number;
  distribution: Record<number, number>;
}
export interface TextAgg {
  type: "text";
  answers: string[];
}
export type QuestionAggregation = SingleAgg | MultipleAgg | RatingAgg | TextAgg;
export type AggregateResultsMap = Record<string, QuestionAggregation>;

/** Firestore Timestamp → ISO 문자열 방어 변환 */
function safeStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v && typeof v === "object" && "seconds" in (v as Record<string, unknown>)) {
    return new Date(((v as { seconds: number }).seconds) * 1000).toISOString();
  }
  return "";
}

/**
 * 설문 응답을 문항별로 집계한다 (pure, no side-effects).
 * - single/multiple → 선택지별 count tally
 * - rating → average + distribution
 * - text → 텍스트 답변 목록
 * 잘못된 answer 값은 조용히 무시한다 (unit-safe).
 */
export function aggregateResults(poll: Poll, responses: PollResponse[]): AggregateResultsMap {
  const map: AggregateResultsMap = {};

  for (const q of poll.questions) {
    if (q.type === "single" || q.type === "multiple") {
      // 선택지 id → { text, count } 맵
      const optionMap = new Map<string, { optionText: string; count: number }>();
      for (const opt of q.options ?? []) {
        optionMap.set(opt.id, { optionText: opt.text, count: 0 });
      }
      for (const resp of responses) {
        const answer = resp.answers[q.id];
        if (q.type === "single") {
          if (typeof answer === "string") {
            const entry = optionMap.get(answer);
            if (entry) entry.count += 1;
          }
        } else {
          if (Array.isArray(answer)) {
            for (const a of answer) {
              if (typeof a === "string") {
                const entry = optionMap.get(a);
                if (entry) entry.count += 1;
              }
            }
          }
        }
      }
      const tally = Array.from(optionMap.entries()).map(([optionId, { optionText, count }]) => ({
        optionId,
        optionText,
        count,
      }));
      if (q.type === "single") {
        map[q.id] = { type: "single", tally };
      } else {
        map[q.id] = { type: "multiple", tally };
      }
    } else if (q.type === "rating") {
      const distribution: Record<number, number> = {};
      let total = 0;
      let count = 0;
      for (const resp of responses) {
        const answer = resp.answers[q.id];
        if (typeof answer === "number") {
          distribution[answer] = (distribution[answer] ?? 0) + 1;
          total += answer;
          count += 1;
        }
      }
      map[q.id] = {
        type: "rating",
        average: count > 0 ? total / count : 0,
        distribution,
      };
    } else if (q.type === "text") {
      const answers: string[] = [];
      for (const resp of responses) {
        const answer = resp.answers[q.id];
        if (typeof answer === "string" && answer.trim()) {
          answers.push(answer.trim());
        }
      }
      map[q.id] = { type: "text", answers };
    }
  }

  return map;
}

// ── 훅 ──

export interface UseLivePollResultsReturn {
  responses: PollResponse[];
  count: number;
  loading: boolean;
}

/**
 * poll_responses 컬렉션을 pollId 기준으로 실시간 구독한다.
 * pollId 가 undefined 이면 구독하지 않고 idle 상태를 반환.
 * unmount 또는 pollId 변경 시 구독을 정리한다.
 */
export function useLivePollResults(pollId: string | undefined): UseLivePollResultsReturn {
  const [responses, setResponses] = useState<PollResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pollId) {
      setResponses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "poll_responses"), where("pollId", "==", pollId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: PollResponse[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            pollId: typeof data.pollId === "string" ? data.pollId : "",
            userId: typeof data.userId === "string" ? data.userId : undefined,
            userName: typeof data.userName === "string" ? data.userName : undefined,
            answers:
              data.answers !== null && typeof data.answers === "object"
                ? (data.answers as Record<string, string | string[] | number>)
                : {},
            createdAt: safeStr(data.createdAt),
          };
        });
        setResponses(rows);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [pollId]);

  return { responses, count: responses.length, loading };
}

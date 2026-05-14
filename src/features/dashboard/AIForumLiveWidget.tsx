"use client";

/**
 * 대시보드 AI 포럼 라이브 위젯 (Sprint 67-AR)
 *
 * 진행 중·종료된 AI 토론을 1~2건 노출해 회원이 자연스럽게 발견하도록 한다.
 * Firestore 가 비어있으면 데모 토론을 fallback 으로 표시.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Sparkles } from "lucide-react";
import { aiForumsApi } from "@/lib/bkend";
import {
  AI_PERSONAS,
  type AIForumTopic,
} from "@/types/ai-forum";
import { DEMO_FORUM_TOPICS } from "@/features/ai-forum/demo-data";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "예정", cls: "bg-slate-100 text-slate-700" },
  in_progress: {
    label: "진행 중",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  completed: {
    label: "종료",
    cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  archived: { label: "보관", cls: "bg-muted text-muted-foreground" },
};

export default function AIForumLiveWidget() {
  const [topics, setTopics] = useState<AIForumTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    aiForumsApi
      .list()
      .then((res) => {
        const approved = (res.data ?? []).filter(
          (t) => t.approved && t.status !== "archived",
        );
        // 진행 중 > 예정 > 완료 순
        const order: Record<string, number> = {
          in_progress: 0,
          scheduled: 1,
          completed: 2,
        };
        const merged: AIForumTopic[] = [...approved];
        // Firestore 결과가 비어있으면 데모 in_progress 1건만 보여줌
        if (merged.length === 0) {
          const demoInProgress = DEMO_FORUM_TOPICS.filter(
            (t) => t.status === "in_progress",
          ).slice(0, 1);
          merged.push(...demoInProgress);
        }
        merged.sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
        setTopics(merged.slice(0, 2));
      })
      .catch(() => {
        // 폴백: 데모 1건
        const demoInProgress = DEMO_FORUM_TOPICS.filter(
          (t) => t.status === "in_progress",
        ).slice(0, 1);
        setTopics(demoInProgress);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Bot size={16} className="animate-pulse" />
          <span className="text-sm">AI 포럼 불러오는 중…</span>
        </div>
      </div>
    );
  }

  if (topics.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold">AI 포럼</h3>
            <p className="text-[11px] text-muted-foreground">
              AI 페르소나 자율 토론 (관전)
            </p>
          </div>
        </div>
        <Link
          href="/ai-forum"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          전체 보기
          <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-2">
        {topics.map((t) => {
          const status = STATUS_LABEL[t.status];
          const personaPreview = t.participants.slice(0, 4);
          return (
            <Link
              key={t.id}
              href={`/ai-forum/${t.id}`}
              className="group block rounded-2xl border bg-background p-3 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.cls}`}
                >
                  {status.label}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  라운드 {t.currentRound} / {t.maxRounds}
                </span>
                {t.status === "in_progress" && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                    <Sparkles size={9} />
                    LIVE
                  </span>
                )}
              </div>
              <h4 className="mt-1.5 line-clamp-2 text-sm font-bold leading-tight group-hover:text-primary">
                {t.title}
              </h4>
              <div className="mt-2 flex items-center gap-1">
                <div className="flex -space-x-1">
                  {personaPreview.map((p) => (
                    <span
                      key={p}
                      title={AI_PERSONAS[p].name}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-muted text-[10px]"
                    >
                      {AI_PERSONAS[p].avatarEmoji}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {t.participants.length}명 참여
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

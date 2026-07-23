"use client";

/**
 * 인라인 수요 조사 섹션 (2026-07-23)
 * 스터디·세미나 페이지에서 각각 인라인으로 수요를 등록·공감할 수 있는 재사용 컴포넌트.
 *
 * - kind="study"  → "스터디 희망" 유형 고정, 스터디 주제 안내 문구
 * - kind="seminar" → "세미나 희망" 유형 고정, 세미나 주제 안내 문구
 * - 동일한 demand 보드(contextId="demand-2026-2")에 저장 — 콘솔 통합 집계 유지
 * - 로그인 비회원 → 간결한 로그인 CTA 표시 (페이지 전체 대체 없음)
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Trash2,
  Plus,
  Inbox,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { commQuestionsApi, commLikesApi } from "@/lib/bkend";
import { ensureDemandBoard } from "./ensure-demand-board";
import type { CommQuestion } from "@/types";

type FormatPref = "온라인" | "오프라인" | "무관";
const FORMAT_OPTIONS: FormatPref[] = ["온라인", "오프라인", "무관"];

const KIND_META = {
  study: {
    demandType: "스터디 희망" as const,
    sectionTitle: "이런 스터디가 있었으면 해요",
    placeholder: "예: 논문 읽기 방법론, AI 교육 활용 스터디",
    hint: "열렸으면 하는 스터디 주제를 남겨주세요.",
    emptyTitle: "등록된 스터디 수요가 없습니다",
    emptyDesc: "첫 번째로 원하는 스터디 주제를 등록해보세요.",
  },
  seminar: {
    demandType: "세미나 희망" as const,
    sectionTitle: "이런 세미나를 듣고 싶어요",
    placeholder: "예: 생성형 AI 교육 활용, 교수설계 최신 동향",
    hint: "듣고 싶은 세미나 주제를 남겨주세요.",
    emptyTitle: "등록된 세미나 수요가 없습니다",
    emptyDesc: "첫 번째로 원하는 세미나 주제를 등록해보세요.",
  },
} as const;

interface Props {
  kind: "study" | "seminar";
}

export default function DemandSurveySection({ kind }: Props) {
  const meta = KIND_META[kind];
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // ── 보드 프로비저닝 ────────────────────────────────────────────────────────
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["demand-board"],
    queryFn: () => ensureDemandBoard(user!.id, user!.name ?? ""),
    enabled: !!user,
  });

  // ── 수요 항목 목록 (전체 보드에서 kind 유형만 필터) ──────────────────────
  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ["demand-questions", board?.id],
    queryFn: () =>
      commQuestionsApi.listByBoard(board!.id).then((r) => r.data as CommQuestion[]),
    enabled: !!board,
  });

  // ── 공감 상태 ─────────────────────────────────────────────────────────────
  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["demand-liked", user?.id],
    queryFn: () => commLikesApi.listMineSet(user!.id),
    enabled: !!user,
  });

  // ── 폼 상태 ───────────────────────────────────────────────────────────────
  const [body, setBody] = useState("");
  const [formatPref, setFormatPref] = useState<FormatPref>("무관");
  const [note, setNote] = useState("");

  // ── kind 유형만 필터 + 공감순 정렬 ────────────────────────────────────────
  const filtered = useMemo(
    () =>
      [...questions]
        .filter((q) => q.presenter === meta.demandType)
        .sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)),
    [questions, meta.demandType],
  );

  // ── 등록 ──────────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!board || !user) throw new Error("로그인이 필요합니다.");
      await commQuestionsApi.create({
        boardId: board.id,
        contextId: board.contextId,
        authorId: user.id,
        authorName: user.name ?? "",
        anonymous: false,
        body: body.trim(),
        presenter: meta.demandType,
        demandPref: {
          format: formatPref,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("수요가 등록되었습니다.");
      setBody("");
      setNote("");
      setFormatPref("무관");
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) =>
      toast.error(`등록 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  // ── 공감 토글 ─────────────────────────────────────────────────────────────
  const likeMutation = useMutation({
    mutationFn: (questionId: string) =>
      commLikesApi.toggle(user!.id, "question", questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
      qc.invalidateQueries({ queryKey: ["demand-liked"] });
    },
    onError: (e) =>
      toast.error(`공감 오류: ${e instanceof Error ? e.message : "오류"}`),
  });

  // ── 삭제 (본인 글만) ──────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => commQuestionsApi.delete(questionId),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) =>
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  const isLoading = boardLoading || qLoading;

  return (
    <section className="mt-10 border-t pt-8 pb-8">
      <h2 className="mb-1 text-base font-semibold text-foreground">
        {meta.sectionTitle}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        {meta.hint} 공감이 많은 주제부터 운영진이 개설을 검토합니다.
      </p>

      {/* ── 비로그인 CTA ──────────────────────────────────────────────────── */}
      {!user ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed bg-card px-5 py-4 text-sm">
          <p className="text-muted-foreground">
            로그인하면 수요를 등록하고 공감할 수 있습니다.
          </p>
          <Link href="/login">
            <Button size="sm" variant="outline">
              로그인
              <ArrowRight size={13} className="ml-1" />
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── 등록 폼 ─────────────────────────────────────────────────── */}
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor={`demand-body-${kind}`}
              >
                주제 한 줄{" "}
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </label>
              <Input
                id={`demand-body-${kind}`}
                placeholder={meta.placeholder}
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 140))}
                maxLength={140}
              />
              <p className="text-right text-[11px] text-muted-foreground">
                {body.length}/140
              </p>
            </div>

            {/* 선호 형태 */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">선호 형태</p>
              <div className="flex gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormatPref(f)}
                    aria-pressed={formatPref === f}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      formatPref === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* 메모 (선택) */}
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor={`demand-note-${kind}`}
              >
                메모{" "}
                <span className="text-muted-foreground/60">
                  (선택 — 희망 주기·수준 등)
                </span>
              </label>
              <Input
                id={`demand-note-${kind}`}
                placeholder="예: 주 1회 온라인, 논문 초급자 대상"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 100))}
                maxLength={100}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={!body.trim() || submitMutation.isPending}
              >
                {submitMutation.isPending ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <Plus size={14} className="mr-1" />
                )}
                등록
              </Button>
            </div>
          </div>

          {/* ── 보드 목록 ─────────────────────────────────────────────────── */}
          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-muted-foreground" size={22} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={meta.emptyTitle}
                description={meta.emptyDesc}
              />
            ) : (
              filtered.map((q) => {
                const isLiked = likedSet.has(`question__${q.id}`);
                const isOwner = q.authorId === user.id;
                const pref = q.demandPref;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border bg-card p-4 transition-all duration-150 hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      {/* 공감 버튼 */}
                      <button
                        type="button"
                        onClick={() => likeMutation.mutate(q.id)}
                        disabled={likeMutation.isPending}
                        aria-label={isLiked ? "공감 취소" : "저도 원해요"}
                        className={cn(
                          "flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                          isLiked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
                        )}
                      >
                        <Heart
                          size={15}
                          className={isLiked ? "fill-primary" : ""}
                        />
                        <span className="tabular-nums">{q.likeCount ?? 0}</span>
                      </button>

                      {/* 내용 */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          {pref?.format && pref.format !== "무관" && (
                            <Badge variant="outline" className="text-[10px]">
                              {pref.format}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-foreground">
                          {q.body}
                        </p>
                        {pref?.note && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {pref.note}
                          </p>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {q.authorName} · {(q.createdAt ?? "").slice(0, 10)}
                        </p>
                      </div>

                      {/* 본인 삭제 */}
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm("삭제하시겠습니까?")) return;
                            deleteMutation.mutate(q.id);
                          }}
                          disabled={deleteMutation.isPending}
                          aria-label="삭제"
                          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

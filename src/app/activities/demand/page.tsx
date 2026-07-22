"use client";

/**
 * 스터디·세미나 수요 조사 보드 (2026-07-23)
 * 회원이 열렸으면 하는 스터디/세미나 주제를 등록하고,
 * "저도 원해요" 공감으로 수요를 표현한다.
 * 공감 많은 주제부터 운영진이 개설을 검토한다.
 *
 * - 로그인 회원 전용 (비로그인 → 로그인 CTA)
 * - comm_boards/comm_questions/comm_likes 재사용 (신규 컬렉션 없음)
 * - 1인 다건 등록 허용 (여러 주제 희망 가능)
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Trash2,
  Plus,
  Inbox,
  Loader2,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { commQuestionsApi, commLikesApi } from "@/lib/bkend";
import { ensureDemandBoard } from "@/features/demand/ensure-demand-board";
import type { CommQuestion } from "@/types";

type DemandType = "스터디 희망" | "세미나 희망";
type FormatPref = "온라인" | "오프라인" | "무관";
type FilterTab = "all" | "스터디 희망" | "세미나 희망";

const TYPE_OPTIONS: DemandType[] = ["스터디 희망", "세미나 희망"];
const FORMAT_OPTIONS: FormatPref[] = ["온라인", "오프라인", "무관"];
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "스터디 희망", label: "스터디" },
  { key: "세미나 희망", label: "세미나" },
];

export default function DemandPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // ── 보드 프로비저닝 ──────────────────────────────────────────────────────
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["demand-board"],
    queryFn: () => ensureDemandBoard(user!.id, user!.name ?? ""),
    enabled: !!user,
  });

  // ── 수요 항목 목록 ───────────────────────────────────────────────────────
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

  // ── 폼 상태 ──────────────────────────────────────────────────────────────
  const [body, setBody] = useState("");
  const [demandType, setDemandType] = useState<DemandType>("스터디 희망");
  const [formatPref, setFormatPref] = useState<FormatPref>("무관");
  const [note, setNote] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // ── 등록 ────────────────────────────────────────────────────────────────
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
        presenter: demandType,
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

  // ── 삭제 (본인 글만) ─────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => commQuestionsApi.delete(questionId),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) =>
      toast.error(`삭제 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  // ── 필터 + 정렬 (공감순 기본) ────────────────────────────────────────────
  const filtered = useMemo(() => {
    const base =
      filterTab === "all"
        ? questions
        : questions.filter((q) => q.presenter === filterTab);
    return [...base].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0));
  }, [questions, filterTab]);

  // ── 비로그인 CTA ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <ClipboardList size={40} className="text-muted-foreground" />
          <h2 className="text-lg font-bold">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground">
            수요 조사 보드는 로그인한 회원만 이용할 수 있습니다.
          </p>
          <Link href="/login">
            <Button>
              로그인하러 가기 <ArrowRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  const isLoading = boardLoading || qLoading;

  return (
    <PageContainer width="wide">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="mx-auto max-w-3xl px-4">
          <PageHeader
            icon={ClipboardList}
            title="수요 조사 · 개설 희망 보드"
            description="열렸으면 하는 스터디나 세미나 주제를 등록해주세요. 여러 주제를 자유롭게 등록할 수 있습니다."
          />

          <Separator className="mt-6" />

          {/* ── 등록 폼 ─────────────────────────────────────────────────── */}
          <section className="mt-8">
            <h2 className="mb-4 text-sm font-semibold text-foreground">개설 희망 등록</h2>
            <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
              {/* 주제 입력 */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="demand-body"
                >
                  주제 한 줄{" "}
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </label>
                <Input
                  id="demand-body"
                  placeholder="예: 논문 읽기 방법론 스터디, 생성형 AI 교육 활용 세미나"
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, 140))}
                  maxLength={140}
                />
                <p className="text-right text-[11px] text-muted-foreground">
                  {body.length}/140
                </p>
              </div>

              {/* 유형 + 형태 칩 */}
              <div className="flex flex-wrap gap-6">
                {/* 유형 */}
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">유형</p>
                  <div className="flex gap-2">
                    {TYPE_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDemandType(t)}
                        aria-pressed={demandType === t}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          demandType === t
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
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
              </div>

              {/* 메모 (선택) */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="demand-note"
                >
                  메모{" "}
                  <span className="text-muted-foreground/60">
                    (선택 — 희망 주기·수준 등)
                  </span>
                </label>
                <Input
                  id="demand-note"
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
          </section>

          {/* ── 안내 문구 ─────────────────────────────────────────────────── */}
          <div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
            공감이 많은 주제부터 개설을 검토해요. 운영진이 수요를 보고 스터디·세미나 개설을 결정합니다.
          </div>

          {/* ── 필터 탭 ───────────────────────────────────────────────────── */}
          <div className="mt-6 flex gap-0 border-b">
            {FILTER_TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilterTab(key)}
                className={cn(
                  "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                  filterTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
                {!isLoading && (
                  <span
                    className={cn(
                      "ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums",
                      filterTab === key
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {key === "all"
                      ? questions.length
                      : questions.filter((q) => q.presenter === key).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── 보드 목록 ─────────────────────────────────────────────────── */}
          <section className="mt-4 space-y-3 pb-16">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-muted-foreground" size={24} />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="등록된 수요가 없습니다"
                description="첫 번째로 원하는 스터디·세미나 주제를 등록해보세요."
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
                          <Badge variant="secondary" className="text-[10px]">
                            {q.presenter ?? "기타"}
                          </Badge>
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
                          <p className="mt-1 text-xs text-muted-foreground">{pref.note}</p>
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
          </section>
        </div>
      </div>
    </PageContainer>
  );
}

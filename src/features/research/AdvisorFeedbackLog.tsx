"use client";

/**
 * 지도 노트 — 교수 피드백 기록·반영 추적 (2026-06-11)
 *
 * 지도교수·심사위원에게 받은 지도 내용을 미팅 단위로 기록하고,
 * 액션 아이템 체크리스트로 분해해 "반영 완료"까지 추적한다.
 * 데이터는 advisor_feedback_notes (본인 전용 — 운영진도 열람 불가).
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Check,
  CheckCircle2,
  CircleDashed,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/empty-state";
import { advisorFeedbackApi } from "@/lib/bkend";
import { todayYmdLocal } from "@/lib/dday";
import {
  FEEDBACK_SOURCE_LABELS,
  FEEDBACK_CHAPTER_LABELS,
  type AdvisorFeedbackNote,
  type FeedbackSource,
  type FeedbackChapter,
  type FeedbackActionItem,
} from "@/types";

const SOURCE_COLORS: Record<FeedbackSource, string> = {
  advisor: "bg-cat-1/5 text-cat-1",
  committee: "bg-cat-5/5 text-cat-5",
  peer: "bg-success/5 text-success",
  self: "bg-muted text-muted-foreground",
};

// QA P2: toISOString()은 UTC 기준 — KST 00:00~08:59 에 전날 날짜가 찍히는 Sprint 47 회귀 방지
function todayYmd(): string {
  return todayYmdLocal();
}

interface FormState {
  meetingDate: string;
  source: FeedbackSource;
  chapter: FeedbackChapter;
  content: string;
  /** 줄바꿈으로 구분된 액션 아이템 입력 */
  actionsText: string;
}

// QA P2: 모듈 상수에 날짜를 박으면 로드 시점 1회 고정 — 자정 넘긴 세션에서 어제 날짜 오염.
// 함수로 바꿔 폼을 열 때마다 오늘(KST) 기준으로 생성.
const emptyForm = (): FormState => ({
  meetingDate: todayYmd(),
  source: "advisor",
  chapter: "general",
  content: "",
  actionsText: "",
});

interface Props {
  userId: string;
  readOnly?: boolean;
}

export default function AdvisorFeedbackLog({ userId, readOnly = false }: Props) {
  const queryClient = useQueryClient();
  // QA P2: 같은 queryKey 를 쓰는 코크핏·에디터 옵저버와 queryFn 형태 통일(raw 반환)
  // — 정렬은 컴포넌트에서 수행해, 어느 옵저버의 refetch 가 캐시를 채워도 정렬 유지
  const { data: rawNotes = [], isLoading } = useQuery({
    queryKey: ["advisor-feedback", userId],
    queryFn: async () =>
      (await advisorFeedbackApi.listByUser(userId)).data as AdvisorFeedbackNote[],
  });
  const notes = useMemo(
    () =>
      [...rawNotes].sort(
        (a, b) =>
          b.meetingDate.localeCompare(a.meetingDate) ||
          (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      ),
    [rawNotes],
  );

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "applied">("all");
  const [chapterFilter, setChapterFilter] = useState<FeedbackChapter | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<AdvisorFeedbackNote | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const pendingCount = notes.filter((n) => n.status === "pending").length;

  const filtered = useMemo(
    () =>
      notes.filter(
        (n) =>
          (statusFilter === "all" || n.status === statusFilter) &&
          (chapterFilter === "all" || n.chapter === chapterFilter),
      ),
    [notes, statusFilter, chapterFilter],
  );

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["advisor-feedback", userId] });
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(n: AdvisorFeedbackNote) {
    setEditingId(n.id);
    setForm({
      meetingDate: n.meetingDate,
      source: n.source,
      chapter: n.chapter,
      content: n.content,
      actionsText: (n.actionItems ?? []).map((a) => a.text).join("\n"),
    });
    setFormOpen(true);
  }

  async function handleSave() {
    if (!form.content.trim()) {
      toast.error("지도 내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const prevItems = editingId
        ? (notes.find((n) => n.id === editingId)?.actionItems ?? [])
        : [];
      // 기존 done 상태 보존: 같은 텍스트면 유지
      const doneMap = new Map(prevItems.map((a) => [a.text, a.done]));
      const actionItems: FeedbackActionItem[] = form.actionsText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean)
        .map((text) => ({ text, done: doneMap.get(text) ?? false }));

      const payload = {
        userId,
        meetingDate: form.meetingDate || todayYmd(),
        source: form.source,
        chapter: form.chapter,
        content: form.content.trim(),
        actionItems,
        updatedAt: new Date().toISOString(),
      };
      if (editingId) {
        await advisorFeedbackApi.update(editingId, payload);
        toast.success("지도 노트가 수정되었습니다.");
      } else {
        await advisorFeedbackApi.create({
          ...payload,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
        toast.success("지도 노트가 기록되었습니다.");
      }
      setFormOpen(false);
      invalidate();
    } catch {
      toast.error("저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(n: AdvisorFeedbackNote) {
    if (!confirm("이 지도 노트를 삭제하시겠습니까? 되돌릴 수 없습니다.")) return;
    try {
      await advisorFeedbackApi.delete(n.id);
      toast.success("삭제되었습니다.");
      invalidate();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  async function toggleActionItem(n: AdvisorFeedbackNote, idx: number) {
    if (readOnly) return;
    // QA P1: 연속 체크 경합(lost update) — 렌더 스냅샷 대신 캐시 최신본에서 파생하고
    // 낙관적으로 캐시를 먼저 갱신해 다음 클릭이 항상 최신 배열을 기준으로 동작하게 함
    const key = ["advisor-feedback", userId];
    const cachedList = queryClient.getQueryData<AdvisorFeedbackNote[]>(key);
    const base = cachedList?.find((x) => x.id === n.id) ?? n;
    const items = [...(base.actionItems ?? [])];
    if (!items[idx]) return;
    items[idx] = { ...items[idx], done: !items[idx].done };
    queryClient.setQueryData<AdvisorFeedbackNote[]>(key, (old) =>
      old?.map((x) => (x.id === n.id ? { ...x, actionItems: items } : x)),
    );
    try {
      await advisorFeedbackApi.update(n.id, { actionItems: items, updatedAt: new Date().toISOString() });
      // 사용성 평가 반영: 모든 액션 아이템 체크 완료 시 반영 완료 처리를 바로 제안
      if (n.status === "pending" && items.length > 0 && items.every((a) => a.done)) {
        toast.info("모든 할 일을 체크했어요! 이 지도를 반영 완료로 표시할까요?", {
          action: {
            label: "반영 완료",
            onClick: () => {
              setResolveTarget({ ...n, actionItems: items });
              setResolutionNote("");
            },
          },
        });
      }
    } catch {
      // 낙관적 캐시 롤백 — 서버 기준으로 재동기화
      invalidate();
      toast.error("체크 저장에 실패했습니다.");
    }
  }

  async function handleResolve() {
    if (!resolveTarget) return;
    setSaving(true);
    try {
      await advisorFeedbackApi.update(resolveTarget.id, {
        status: "applied",
        resolutionNote: resolutionNote.trim() || undefined,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success("반영 완료로 표시했습니다.");
      setResolveTarget(null);
      setResolutionNote("");
      invalidate();
    } catch {
      toast.error("처리에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReopen(n: AdvisorFeedbackNote) {
    try {
      await advisorFeedbackApi.update(n.id, { status: "pending", updatedAt: new Date().toISOString() });
      invalidate();
    } catch {
      toast.error("처리에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      {/* ── 헤더 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold">
            <GraduationCap size={18} className="text-primary" />
            지도 노트
            {pendingCount > 0 && (
              <Badge className="bg-warning/5 text-warning text-[10px]">
                미반영 {pendingCount}건
              </Badge>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            교수님께 받은 지도를 기록하고, 액션 아이템으로 분해해 반영까지 추적하세요. 본인만 볼 수 있습니다.
          </p>
        </div>
        {!readOnly && (
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <Plus size={14} />
            지도 기록
          </Button>
        )}
      </div>

      {/* ── 필터 ── */}
      {notes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "pending", "applied"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                statusFilter === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "all" ? `전체 ${notes.length}` : s === "pending" ? `미반영 ${pendingCount}` : `반영 완료 ${notes.length - pendingCount}`}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {(["all", ...Object.keys(FEEDBACK_CHAPTER_LABELS)] as (FeedbackChapter | "all")[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChapterFilter(c)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                chapterFilter === c ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {c === "all" ? "모든 장" : FEEDBACK_CHAPTER_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {/* ── 작성/수정 폼 ── */}
      {formOpen && !readOnly && (
        <div className="rounded-2xl border-2 border-primary/20 bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{editingId ? "지도 노트 수정" : "새 지도 기록"}</p>
            <button type="button" onClick={() => setFormOpen(false)} aria-label="닫기" className="rounded p-1 text-muted-foreground hover:bg-muted">
              <X size={14} />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">지도 날짜</label>
              <Input type="date" value={form.meetingDate} onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">출처</label>
              <select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value as FeedbackSource }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(FEEDBACK_SOURCE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">관련 장</label>
              <select
                value={form.chapter}
                onChange={(e) => setForm((f) => ({ ...f, chapter: e.target.value as FeedbackChapter }))}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(FEEDBACK_CHAPTER_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">지도 내용</label>
            <Textarea
              rows={4}
              placeholder="예: 연구 문제 2번이 측정 가능한 형태가 아님 — 변인 수준으로 다시 진술할 것. 이론적 배경에 ○○ 선행연구 보강."
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              액션 아이템 (선택 — 한 줄에 하나씩)
            </label>
            <Textarea
              rows={3}
              placeholder={"연구 문제 2번 변인 수준으로 재진술\n이론적 배경에 ○○(2020) 추가"}
              value={form.actionsText}
              onChange={(e) => setForm((f) => ({ ...f, actionsText: e.target.value }))}
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>취소</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 size={13} className="mr-1 animate-spin" />}
              {editingId ? "수정 저장" : "기록하기"}
            </Button>
          </div>
        </div>
      )}

      {/* ── 반영 완료 다이얼로그 (인라인) ── */}
      {resolveTarget && (
        <div className="rounded-2xl border-2 border-success/30 bg-success/5 p-4">
          <p className="text-sm font-bold">반영 완료 처리</p>
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{resolveTarget.content}</p>
          <Textarea
            rows={2}
            className="mt-2"
            placeholder="어떻게 반영했는지 간단히 메모 (선택) — 예: Ⅱ장 2절에 선행연구 3편 추가, 연구문제 재진술"
            value={resolutionNote}
            onChange={(e) => setResolutionNote(e.target.value)}
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => { setResolveTarget(null); setResolutionNote(""); }}>취소</Button>
            <Button size="sm" className="bg-success hover:bg-success/90" onClick={handleResolve} disabled={saving}>
              {saving && <Loader2 size={13} className="mr-1 animate-spin" />}
              반영 완료
            </Button>
          </div>
        </div>
      )}

      {/* ── 목록 ── */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title={notes.length === 0 ? "아직 기록된 지도 노트가 없습니다" : "조건에 맞는 노트가 없습니다"}
          description={
            notes.length === 0
              ? "교수님 미팅 직후 바로 기록해 두면, 다음 미팅 전 무엇을 반영했는지 한눈에 확인할 수 있어요."
              : "필터를 바꿔보세요."
          }
          actionLabel={!readOnly && notes.length === 0 ? "첫 지도 기록하기" : undefined}
          onAction={!readOnly && notes.length === 0 ? openCreate : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((n) => {
            const applied = n.status === "applied";
            const items = n.actionItems ?? [];
            const doneCount = items.filter((a) => a.done).length;
            return (
              <li
                key={n.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 transition-shadow hover:shadow-sm",
                  applied && "opacity-80",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {applied ? (
                    <CheckCircle2 size={15} className="shrink-0 text-success" />
                  ) : (
                    <CircleDashed size={15} className="shrink-0 text-warning" />
                  )}
                  <span className="text-xs font-semibold tabular-nums">{n.meetingDate}</span>
                  <Badge variant="secondary" className={cn("text-[10px]", SOURCE_COLORS[n.source] ?? "")}>
                    {FEEDBACK_SOURCE_LABELS[n.source] ?? n.source}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {FEEDBACK_CHAPTER_LABELS[n.chapter] ?? "전반"}
                  </Badge>
                  {items.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      할 일 {doneCount}/{items.length}
                    </span>
                  )}
                  {!readOnly && (
                    <span className="ml-auto flex items-center gap-1">
                      {!applied && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs text-success"
                          onClick={() => { setResolveTarget(n); setResolutionNote(""); }}
                        >
                          <Check size={12} />반영 완료
                        </Button>
                      )}
                      {applied && (
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => handleReopen(n)}>
                          다시 열기
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label="수정" onClick={() => openEdit(n)}>
                        <Pencil size={12} />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive" aria-label="삭제" onClick={() => handleDelete(n)}>
                        <Trash2 size={12} />
                      </Button>
                    </span>
                  )}
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{n.content}</p>

                {items.length > 0 && (
                  <ul className="mt-2.5 space-y-1 rounded-lg bg-muted/40 p-2.5">
                    {items.map((a, idx) => (
                      <li key={idx}>
                        <label className={cn("flex cursor-pointer items-start gap-2 text-xs", readOnly && "cursor-default")}>
                          <input
                            type="checkbox"
                            className="mt-0.5 h-3.5 w-3.5 accent-primary"
                            checked={a.done}
                            disabled={readOnly}
                            onChange={() => toggleActionItem(n, idx)}
                          />
                          <span className={cn(a.done && "text-muted-foreground line-through")}>{a.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}

                {applied && n.resolutionNote && (
                  <p className="mt-2 rounded-lg bg-success/5 p-2 text-xs text-success">
                    <span className="font-semibold">반영 메모:</span> {n.resolutionNote}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

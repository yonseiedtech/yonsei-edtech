"use client";

/**
 * StaffMeetingPollTab — 운영진 내부 일정조율 투표 탭 (v17 H1)
 *
 * NetworkingPoll / networkingEventsApi 재사용.
 * internal:true + schedulingMode:"poll" 이벤트만 관리.
 * 공개 gatherings 목록에는 노출되지 않음(internal 클라이언트 필터).
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Plus, X, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { networkingEventsApi } from "@/lib/bkend";
import type { NetworkingEvent } from "@/types";
import { currentSemesterKey } from "@/lib/semester";
import NetworkingPoll from "@/features/networking/NetworkingPoll";
import EmptyState from "@/components/ui/empty-state";

/** 기본 선택 시간대 (EventEditorForm DEFAULT_SLOT_SELECTION 참고) */
const DEFAULT_SLOTS = ["12:00", "15:00", "18:00", "19:00", "20:00"];

/** 칩으로 선택할 수 있는 시간대 프리셋 (11:00~22:00, 1시간 간격) */
const SLOT_PRESETS: string[] = [];
for (let h = 11; h <= 22; h++) {
  SLOT_PRESETS.push(`${String(h).padStart(2, "0")}:00`);
}

function localToIso(local: string): string {
  return local ? new Date(local).toISOString() : "";
}

function formatPeriod(ev: NetworkingEvent): string {
  if (!ev.pollPeriodStart && !ev.pollPeriodEnd) return "기간 미설정";
  return `${ev.pollPeriodStart ?? "?"} ~ ${ev.pollPeriodEnd ?? "?"}`;
}

export default function StaffMeetingPollTab() {
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const canEdit = isAtLeast(user, "staff");

  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 폼 상태
  const [title, setTitle] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [slots, setSlots] = useState<string[]>([...DEFAULT_SLOTS]);
  const [deadline, setDeadline] = useState("");
  const [decisionMode, setDecisionMode] = useState<"manual" | "auto">("auto");

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["staff-meeting-polls"],
    queryFn: async () => (await networkingEventsApi.list()).data as NetworkingEvent[],
    staleTime: 30_000,
  });

  // internal poll 만 필터, 최신순
  const polls = allEvents
    .filter((e) => e.internal === true && e.schedulingMode === "poll")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("로그인이 필요합니다.");
      const now = new Date().toISOString();
      await networkingEventsApi.create({
        type: "regular",
        title: title.trim(),
        description: "",
        schedulingMode: "poll",
        internal: true,
        visibility: "private",
        startAt: "",
        pollPeriodStart: periodStart,
        pollPeriodEnd: periodEnd,
        pollTimeSlotsWeekday: [...slots],
        pollTimeSlotsWeekend: [...slots],
        pollDeadline: localToIso(deadline),
        pollDecisionMode: decisionMode,
        location: "",
        feeAmount: 0,
        autoDues: false,
        status: "upcoming",
        published: false,
        semester: currentSemesterKey(),
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      });
    },
    onSuccess: () => {
      toast.success("일정조율이 생성되었습니다.");
      void qc.invalidateQueries({ queryKey: ["staff-meeting-polls"] });
      setShowForm(false);
      setTitle("");
      setPeriodStart("");
      setPeriodEnd("");
      setSlots([...DEFAULT_SLOTS]);
      setDeadline("");
      setDecisionMode("auto");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "생성에 실패했습니다."),
  });

  function toggleSlot(slot: string) {
    setSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot].sort(),
    );
  }

  function handleSubmit() {
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!periodStart || !periodEnd) {
      toast.error("후보 기간을 입력해주세요.");
      return;
    }
    if (periodStart > periodEnd) {
      toast.error("후보 시작일이 종료일보다 늦습니다.");
      return;
    }
    if (slots.length === 0) {
      toast.error("시간대를 하나 이상 선택해주세요.");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-base font-bold">
            <CalendarClock size={16} className="text-primary" />
            운영진 회의·모임 일정 조율
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            운영진끼리 다음 회의·모임의 가능 일정을 캘린더 투표로 조율합니다. 회원에게는 공개되지 않습니다.
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "취소" : "새 일정조율"}
          </Button>
        )}
      </div>

      {/* 생성 폼 */}
      {showForm && canEdit && (
        <div className="rounded-2xl border bg-card p-4 space-y-4">
          <h3 className="text-sm font-semibold">새 일정조율 만들기</h3>

          {/* 제목 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">제목</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예) 운영진 2학기 정기회의 날짜 조율"
              className="h-8 text-sm"
              maxLength={60}
            />
          </div>

          {/* 후보 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">후보 시작일</label>
              <Input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">후보 종료일</label>
              <Input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* 시간대 칩 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              시간대 선택{" "}
              <span className="font-normal text-muted-foreground">
                — 선택한 시간대가 평일·주말 공통 후보로 사용됩니다
              </span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SLOT_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSlot(s)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    slots.includes(s)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/60",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {slots.length === 0 && (
              <p className="text-[10px] text-destructive">시간대를 하나 이상 선택해주세요.</p>
            )}
          </div>

          {/* 투표 마감 */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              투표 마감{" "}
              <span className="font-normal text-muted-foreground">(선택)</span>
            </label>
            <Input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* 확정 방식 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">확정 방식</label>
            <div className="flex gap-2">
              {(["auto", "manual"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDecisionMode(mode)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    decisionMode === mode
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/60",
                  )}
                >
                  {mode === "auto" ? "응답 종합 후 자동" : "운영진이 직접 지정"}
                </button>
              ))}
            </div>
          </div>

          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full"
          >
            일정조율 만들기
          </Button>
        </div>
      )}

      {/* 목록 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : polls.length === 0 ? (
        <EmptyState
          title="아직 일정조율이 없습니다"
          description="'새 일정조율' 버튼으로 운영진 회의·모임 일정 조율을 시작해보세요."
        />
      ) : (
        <div className="space-y-3">
          {polls.map((ev) => {
            const isSelected = selectedId === ev.id;
            const isConfirmed = !!ev.startAt;
            return (
              <div key={ev.id} className="rounded-2xl border bg-card">
                {/* 카드 헤더 — 클릭해서 펼치기 */}
                <button
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : ev.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{ev.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatPeriod(ev)}
                      {ev.pollDeadline &&
                        ` · 마감 ${new Date(ev.pollDeadline).toLocaleDateString("ko-KR")}`}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        isConfirmed
                          ? "bg-cat-1/10 text-cat-1"
                          : "bg-primary/10 text-primary",
                      )}
                    >
                      {isConfirmed ? "확정됨" : "투표 중"}
                    </span>
                    {isSelected ? (
                      <ChevronUp size={14} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={14} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* 펼쳐진 상세 */}
                {isSelected && (
                  <div className="space-y-3 border-t px-4 pb-4 pt-3">
                    {/* 운영진 전용 안내 — 공개 공유 없음. 다른 운영진은 이 콘솔에서 직접 투표한다. */}
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                      <Lock size={13} className="shrink-0 text-primary" />
                      <span className="text-[11px] text-primary">
                        운영진 전용 조율입니다. 다른 운영진은 <b>운영진 페이지 → 모임 일정</b> 탭에서 직접 투표합니다.
                      </span>
                    </div>

                    {/* 투표 UI 임베드 */}
                    <NetworkingPoll event={ev} canEdit={canEdit} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

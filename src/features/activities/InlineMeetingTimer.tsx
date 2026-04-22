"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { progressMeetingsApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Play, Pause, SkipForward, Square, Plus, Trash2, Clock,
  AlertTriangle, CheckCircle2, RotateCcw, ExternalLink, Timer,
} from "lucide-react";
import type { ProgressMeeting, ProgressMeetingSection } from "@/types";

interface Props {
  activityId: string;
  activityProgressId: string;
  weekLabel: string;
  canControl: boolean;
  /** 미팅이 없을 때 새로 만들 수 있는 권한 (보통 canControl 과 동일) */
  canStart: boolean;
  createdBy: string | undefined;
}

function uuid(): string {
  return `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function fmtMMSS(totalSec: number): string {
  const sign = totalSec < 0 ? "-" : "";
  const s = Math.abs(Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${sign}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function liveSeconds(
  section: ProgressMeetingSection,
  isActive: boolean,
  status: ProgressMeeting["status"],
): number {
  if (!isActive || status !== "running" || !section.startedAt) return section.actualSeconds;
  const startMs = new Date(section.startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  return section.actualSeconds + elapsed;
}

export default function InlineMeetingTimer({
  activityProgressId,
  weekLabel,
  canControl,
  canStart,
  createdBy,
  activityId,
}: Props) {
  const qc = useQueryClient();

  // 1초 라이브 갱신
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: meeting, isLoading } = useQuery({
    queryKey: ["progress-meeting-by-progress", activityProgressId],
    queryFn: () => progressMeetingsApi.getByProgress(activityProgressId),
    refetchInterval: 3000,
    enabled: !!activityProgressId,
  });

  const [creating, setCreating] = useState(false);

  async function handleCreateMeeting() {
    if (!canStart || !createdBy) return;
    setCreating(true);
    try {
      await progressMeetingsApi.create({
        activityId,
        activityProgressId,
        status: "planning",
        currentSectionIndex: 0,
        sections: [],
        createdBy,
        createdAt: new Date().toISOString(),
      });
      await qc.invalidateQueries({ queryKey: ["progress-meeting-by-progress", activityProgressId] });
    } catch (e) {
      console.error("[inline-timer/create]", e);
      toast.error(e instanceof Error ? `타이머 시작 실패: ${e.message}` : "타이머를 시작하지 못했습니다.");
    } finally {
      setCreating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        타이머 정보 불러오는 중…
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            아직 이 주차에 등록된 미팅 타이머가 없습니다.
          </p>
          {canStart ? (
            <Button size="sm" onClick={handleCreateMeeting} disabled={creating}>
              <Timer size={13} className="mr-1" />
              {creating ? "만드는 중..." : "타이머 만들기"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">운영진/모임장만 시작할 수 있어요.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <MeetingPanel
      meeting={meeting}
      canControl={canControl}
      weekLabel={weekLabel}
      onMutated={() => qc.invalidateQueries({ queryKey: ["progress-meeting-by-progress", activityProgressId] })}
    />
  );
}

interface PanelProps {
  meeting: ProgressMeeting;
  canControl: boolean;
  weekLabel: string;
  onMutated: () => void;
}

function MeetingPanel({ meeting, canControl, weekLabel, onMutated }: PanelProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState(10);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProgressMeeting>) =>
      progressMeetingsApi.update(meeting.id, {
        ...data,
        updatedAt: new Date().toISOString(),
      } as Record<string, unknown>),
    onSuccess: onMutated,
    onError: (e: Error) => toast.error(`저장 실패: ${e.message}`),
  });

  const sections = meeting.sections ?? [];
  const status = meeting.status;
  const currentIdx = meeting.currentSectionIndex;
  const activeSection = sections[currentIdx];

  function flushActiveSeconds(s: ProgressMeetingSection): ProgressMeetingSection {
    if (!s.startedAt) return s;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
    return { ...s, actualSeconds: s.actualSeconds + elapsed, startedAt: undefined };
  }

  function handleStart() {
    if (sections.length === 0) return toast.error("먼저 섹션을 추가하세요.");
    const now = new Date().toISOString();
    const updated = sections.map((s, i) => (i === 0 ? { ...s, startedAt: now } : s));
    updateMutation.mutate({
      status: "running",
      currentSectionIndex: 0,
      sections: updated,
      startedAt: now,
    });
  }

  function handlePause() {
    if (!activeSection) return;
    const flushed = flushActiveSeconds(activeSection);
    const updated = sections.map((s, i) => (i === currentIdx ? flushed : s));
    updateMutation.mutate({ status: "paused", sections: updated });
  }

  function handleResume() {
    if (!activeSection) return;
    const now = new Date().toISOString();
    const updated = sections.map((s, i) =>
      i === currentIdx ? { ...s, startedAt: now } : s,
    );
    updateMutation.mutate({ status: "running", sections: updated });
  }

  function handleNextSection() {
    if (!activeSection) return;
    const flushed = { ...flushActiveSeconds(activeSection), endedAt: new Date().toISOString() };
    const nextIdx = currentIdx + 1;
    if (nextIdx >= sections.length) {
      const updated = sections.map((s, i) => (i === currentIdx ? flushed : s));
      updateMutation.mutate({
        status: "completed",
        currentSectionIndex: nextIdx,
        sections: updated,
        endedAt: new Date().toISOString(),
      });
      return;
    }
    const now = new Date().toISOString();
    const updated = sections.map((s, i) => {
      if (i === currentIdx) return flushed;
      if (i === nextIdx) return { ...s, startedAt: now };
      return s;
    });
    updateMutation.mutate({ currentSectionIndex: nextIdx, sections: updated });
  }

  function handleEnd() {
    if (!confirm("미팅을 종료하시겠습니까?")) return;
    let updated = sections;
    if (activeSection?.startedAt) {
      const flushed = { ...flushActiveSeconds(activeSection), endedAt: new Date().toISOString() };
      updated = sections.map((s, i) => (i === currentIdx ? flushed : s));
    }
    updateMutation.mutate({
      status: "completed",
      sections: updated,
      endedAt: new Date().toISOString(),
    });
  }

  /** 종료된 미팅을 다시 열어 재개 가능한 상태로 복원 */
  function handleReopen() {
    if (!confirm("종료된 미팅을 다시 열까요? 마지막 섹션을 일시정지 상태로 되돌립니다.")) return;
    const lastIdx = Math.min(Math.max(0, currentIdx - 1), Math.max(0, sections.length - 1));
    // 마지막 섹션의 endedAt 정리 (재개 가능하도록)
    const updated = sections.map((s, i) =>
      i === lastIdx ? { ...s, endedAt: undefined, startedAt: undefined } : s,
    );
    updateMutation.mutate({
      status: sections.length === 0 ? "planning" : "paused",
      currentSectionIndex: lastIdx,
      sections: updated,
      endedAt: undefined,
    });
  }

  function handleAddSection() {
    if (!newTitle.trim() || newMinutes < 1) return;
    const next: ProgressMeetingSection = {
      id: uuid(),
      title: newTitle.trim(),
      estimatedMinutes: newMinutes,
      actualSeconds: 0,
    };
    updateMutation.mutate({ sections: [...sections, next] });
    setNewTitle("");
    setNewMinutes(10);
  }

  function handleRemoveSection(id: string) {
    if (status === "running") return toast.error("진행 중에는 섹션을 삭제할 수 없습니다.");
    updateMutation.mutate({ sections: sections.filter((s) => s.id !== id) });
  }

  const totalEstimatedSec = useMemo(
    () => sections.reduce((s, x) => s + x.estimatedMinutes * 60, 0),
    [sections],
  );
  const totalActualSec = useMemo(
    () => sections.reduce((sum, s, i) => sum + liveSeconds(s, i === currentIdx, status), 0),
    [sections, currentIdx, status],
  );
  const overallDelta = totalActualSec - totalEstimatedSec;

  const statusMap: Record<ProgressMeeting["status"], { label: string; cls: string }> = {
    planning: { label: "준비 중", cls: "bg-slate-100 text-slate-700" },
    running: { label: "진행 중", cls: "bg-emerald-50 text-emerald-700 animate-pulse" },
    paused: { label: "일시정지", cls: "bg-amber-50 text-amber-700" },
    completed: { label: "종료됨", cls: "bg-blue-50 text-blue-700" },
  };
  const sm = statusMap[status];

  return (
    <div className="space-y-3 rounded-xl border bg-gradient-to-b from-primary/[0.04] to-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Timer size={14} className="text-primary" />
          <span className="text-xs font-semibold">{weekLabel} 실시간 미팅 타이머</span>
          <Badge variant="secondary" className={cn("text-[10px]", sm.cls)}>{sm.label}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">
            예상 {fmtMMSS(totalEstimatedSec)} · 실제 {fmtMMSS(totalActualSec)}
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px]",
              overallDelta > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
            )}
          >
            {overallDelta > 0 ? "초과" : "여유"} {fmtMMSS(Math.abs(overallDelta))}
          </Badge>
          <Link
            href={`/progress-meetings/${meeting.id}`}
            className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-primary"
            title="전체 화면으로 열기"
          >
            <ExternalLink size={10} />
            전체화면
          </Link>
        </div>
      </div>

      {/* 컨트롤 */}
      {canControl ? (
        <div className="flex flex-wrap gap-1.5">
          {status === "planning" && (
            <Button size="sm" onClick={handleStart} disabled={sections.length === 0}>
              <Play size={13} className="mr-1" /> 미팅 시작
            </Button>
          )}
          {status === "running" && (
            <>
              <Button size="sm" variant="outline" onClick={handlePause}>
                <Pause size={13} className="mr-1" /> 일시정지
              </Button>
              <Button size="sm" onClick={handleNextSection}>
                <SkipForward size={13} className="mr-1" />
                {currentIdx + 1 >= sections.length ? "마지막 종료" : "다음 섹션"}
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={handleEnd}>
                <Square size={13} className="mr-1" /> 미팅 종료
              </Button>
            </>
          )}
          {status === "paused" && (
            <>
              <Button size="sm" onClick={handleResume}>
                <Play size={13} className="mr-1" /> 재개
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={handleEnd}>
                <Square size={13} className="mr-1" /> 미팅 종료
              </Button>
            </>
          )}
          {status === "completed" && (
            <Button size="sm" variant="outline" onClick={handleReopen}>
              <RotateCcw size={13} className="mr-1" /> 다시 열기
            </Button>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">관전 모드 — 운영진/모임장만 조작할 수 있어요.</p>
      )}

      {/* 섹션 목록 (compact) */}
      {sections.length === 0 ? (
        <div className="rounded-md border border-dashed bg-muted/30 p-3 text-center text-[11px] text-muted-foreground">
          아직 등록된 아젠다(섹션)가 없습니다.
          {canControl && " 아래에서 추가하세요."}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {sections.map((s, i) => {
            const isActive = i === currentIdx && status !== "planning" && status !== "completed";
            const isDone = i < currentIdx || (i === currentIdx && status === "completed");
            const live = liveSeconds(s, i === currentIdx, status);
            const estSec = s.estimatedMinutes * 60;
            const delta = live - estSec;
            const overTime = delta > 0;
            const pct = Math.min(100, (live / Math.max(1, estSec)) * 100);
            return (
              <li
                key={s.id}
                className={cn(
                  "rounded-md border bg-white px-3 py-2 text-xs transition-shadow",
                  isActive && "border-primary shadow-sm",
                  isDone && "opacity-70",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">#{i + 1}</Badge>
                  {isActive && <Badge className="bg-primary text-[10px] text-white">진행 중</Badge>}
                  {isDone && (
                    <Badge className="bg-emerald-50 text-[10px] text-emerald-700">
                      <CheckCircle2 size={10} className="mr-0.5" />완료
                    </Badge>
                  )}
                  <span className="font-medium">{s.title}</span>
                  <span className="ml-auto flex items-center gap-2 text-[10px] tabular-nums text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Clock size={10} /> 예상 {s.estimatedMinutes}분</span>
                    <span>실제 {fmtMMSS(live)}</span>
                    {(isActive || isDone) && (
                      <span className={cn(overTime ? "text-rose-600" : "text-emerald-600")}>
                        {overTime && <AlertTriangle size={10} className="-mt-0.5 mr-0.5 inline" />}
                        {overTime ? "초과" : "여유"} {fmtMMSS(Math.abs(delta))}
                      </span>
                    )}
                    {canControl && status === "planning" && (
                      <button
                        onClick={() => handleRemoveSection(s.id)}
                        className="rounded p-0.5 text-muted-foreground hover:text-rose-500"
                        aria-label="섹션 삭제"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </span>
                </div>
                {(isActive || isDone) && (
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full transition-all duration-300", overTime ? "bg-rose-500" : "bg-primary")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* 아젠다 추가 (planning 단계에서만) */}
      {canControl && status === "planning" && (
        <div className="rounded-md border border-dashed bg-white p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_110px_auto]">
            <Input
              placeholder="아젠다 (예: 논문 검토, Q&A)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddSection(); }}
            />
            <Input
              type="number"
              min={1}
              value={newMinutes}
              onChange={(e) => setNewMinutes(Number(e.target.value))}
              placeholder="예상 분"
            />
            <Button size="sm" onClick={handleAddSection} disabled={!newTitle.trim() || newMinutes < 1}>
              <Plus size={13} className="mr-1" />추가
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

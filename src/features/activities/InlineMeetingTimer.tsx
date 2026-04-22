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
  AlertTriangle, CheckCircle2, RotateCcw, ExternalLink, Timer, Pencil,
  Copy, GripVertical,
} from "lucide-react";
import type { ProgressMeeting, ProgressMeetingSection } from "@/types";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMinutes, setEditMinutes] = useState(10);

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
    // 미팅 시작 시 전체화면 페이지 자동 새탭 오픈 (참여자 공유용)
    if (typeof window !== "undefined") {
      window.open(`/progress-meetings/${meeting.id}`, "_blank", "noopener,noreferrer");
    }
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
    // 진행 중에 추가하면 그냥 마지막에 append (현재 섹션 인덱스/상태 유지)
    updateMutation.mutate({ sections: [...sections, next] });
    setNewTitle("");
    setNewMinutes(10);
  }

  /** 섹션 복제 — 시간 기록 0으로 초기화, 원본 바로 다음에 삽입 ("다시 논의" 시나리오 지원) */
  function handleDuplicateSection(idx: number) {
    const s = sections[idx];
    if (!s) return;
    const dup: ProgressMeetingSection = {
      id: uuid(),
      title: `${s.title} (재논의)`,
      estimatedMinutes: s.estimatedMinutes,
      actualSeconds: 0,
    };
    const updated = [...sections.slice(0, idx + 1), dup, ...sections.slice(idx + 1)];
    // 복제는 idx 다음에 삽입 — 활성 섹션의 인덱스 유지 (idx < currentIdx면 +1)
    let nextIdx = currentIdx;
    if (idx < currentIdx) nextIdx = currentIdx + 1;
    updateMutation.mutate({ sections: updated, currentSectionIndex: nextIdx });
    toast.success("섹션을 복제했습니다.");
  }

  /** 드래그 정렬 — 활성 섹션 ID 기준으로 currentIdx 재매핑 */
  function handleMoveSections(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const activeId = sections[currentIdx]?.id;
    const moved = arrayMove(sections, fromIdx, toIdx);
    let nextIdx = currentIdx;
    if (activeId) {
      const newActiveIdx = moved.findIndex((s) => s.id === activeId);
      if (newActiveIdx >= 0) nextIdx = newActiveIdx;
    }
    updateMutation.mutate({ sections: moved, currentSectionIndex: nextIdx });
  }

  /** 이미 진행된 섹션 판정: 시간이 측정됐거나, 현재 인덱스 이전이거나, 현재 활성 섹션이거나 */
  function isProgressedSection(s: ProgressMeetingSection, idx: number): boolean {
    if (s.actualSeconds > 0) return true;
    if (s.startedAt || s.endedAt) return true;
    if (idx < currentIdx) return true;
    if (idx === currentIdx && (status === "running" || status === "paused")) return true;
    return false;
  }

  function handleRemoveSection(idx: number) {
    const s = sections[idx];
    if (!s) return;
    if (status === "running" && idx === currentIdx) {
      return toast.error("현재 진행 중인 섹션은 삭제할 수 없습니다. 일시정지 후 시도하세요.");
    }
    const progressed = isProgressedSection(s, idx);
    const baseMsg = `'${s.title}' 섹션을 삭제하시겠습니까?`;
    const extraMsg = progressed
      ? `\n\n⚠️ 이미 진행된 섹션입니다 (실제 ${fmtMMSS(s.actualSeconds)}). 정말 삭제하시겠습니까?`
      : "";
    if (!confirm(baseMsg + extraMsg)) return;
    if (progressed && !confirm("정말로 삭제하시겠습니까? 진행 기록이 사라집니다.")) return;

    const updated = sections.filter((_, i) => i !== idx);
    let nextIdx = currentIdx;
    if (idx < currentIdx) nextIdx = Math.max(0, currentIdx - 1);
    else if (idx === currentIdx) nextIdx = Math.min(currentIdx, Math.max(0, updated.length - 1));
    updateMutation.mutate({ sections: updated, currentSectionIndex: nextIdx });
  }

  function startEditSection(s: ProgressMeetingSection) {
    setEditingId(s.id);
    setEditTitle(s.title);
    setEditMinutes(s.estimatedMinutes);
  }

  function commitEditSection() {
    if (!editingId) return;
    const title = editTitle.trim();
    if (!title) return toast.error("섹션 제목을 입력하세요.");
    if (editMinutes < 1) return toast.error("예상 시간은 1분 이상이어야 합니다.");
    const editingIdx = sections.findIndex((s) => s.id === editingId);
    const isEditingActiveRunning =
      editingIdx >= 0 && editingIdx === currentIdx && status === "running";
    const updated = sections.map((s) => {
      if (s.id !== editingId) return s;
      if (isEditingActiveRunning) {
        // 활성 섹션 편집 시 진행 시간 보존 — 흐른 시간을 actualSeconds에 누적하고 새 startedAt 부여 (= 즉시 재개)
        const flushed = flushActiveSeconds(s);
        return {
          ...flushed,
          title,
          estimatedMinutes: editMinutes,
          startedAt: new Date().toISOString(),
        };
      }
      return { ...s, title, estimatedMinutes: editMinutes };
    });
    updateMutation.mutate({ sections: updated });
    setEditingId(null);
  }

  /** 한 섹션의 시간 기록만 0으로 (섹션 자체는 유지) */
  function handleResetSection(idx: number) {
    const s = sections[idx];
    if (!s) return;
    if (s.actualSeconds === 0 && !s.startedAt && !s.endedAt) {
      return toast.message("이미 초기화된 섹션입니다.");
    }
    if (!confirm(`'${s.title}' 섹션의 시간 기록을 초기화하시겠습니까? (실제 ${fmtMMSS(s.actualSeconds)} → 0:00)`)) return;

    const isActiveRunning = idx === currentIdx && status === "running";
    const updated = sections.map((sec, i) => {
      if (i !== idx) return sec;
      return {
        ...sec,
        actualSeconds: 0,
        startedAt: isActiveRunning ? new Date().toISOString() : undefined,
        endedAt: undefined,
      };
    });
    updateMutation.mutate({ sections: updated });
  }

  /** 미팅 전체 초기화 — 섹션 목록은 유지, 모든 시간 기록만 0으로 + status: planning */
  function handleResetAll() {
    if (sections.length === 0) {
      return toast.message("초기화할 섹션이 없습니다.");
    }
    if (!confirm("⚠️ 미팅 전체를 초기화합니다.\n\n모든 섹션의 진행 시간이 0으로 되돌아가고, 상태가 '준비 중'으로 변경됩니다.\n섹션 목록은 그대로 유지됩니다.\n\n계속하시겠습니까?")) return;
    if (!confirm("정말로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    const cleared = sections.map((s) => ({
      ...s,
      actualSeconds: 0,
      startedAt: undefined,
      endedAt: undefined,
    }));
    updateMutation.mutate({
      status: "planning",
      currentSectionIndex: 0,
      sections: cleared,
      startedAt: undefined,
      endedAt: undefined,
    });
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
          {sections.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={handleResetAll}
              title="모든 섹션의 시간 기록을 0으로 되돌리고 준비 중 상태로 전환"
            >
              <RotateCcw size={13} className="mr-1" /> 전체 초기화
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
        <SectionListDnd
          sections={sections}
          canControl={canControl}
          status={status}
          currentIdx={currentIdx}
          editingId={editingId}
          editTitle={editTitle}
          editMinutes={editMinutes}
          setEditTitle={setEditTitle}
          setEditMinutes={setEditMinutes}
          setEditingId={setEditingId}
          startEditSection={startEditSection}
          commitEditSection={commitEditSection}
          handleRemoveSection={handleRemoveSection}
          handleResetSection={handleResetSection}
          handleDuplicateSection={handleDuplicateSection}
          handleMoveSections={handleMoveSections}
          isProgressedSection={isProgressedSection}
        />
      )}

      {/* 아젠다 추가 — 진행 중에도 추가 가능 (status: completed 만 제외, 단 reopen 후엔 paused 가 되어 표시됨) */}
      {canControl && status !== "completed" && (
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

interface SectionListDndProps {
  sections: ProgressMeetingSection[];
  canControl: boolean;
  status: ProgressMeeting["status"];
  currentIdx: number;
  editingId: string | null;
  editTitle: string;
  editMinutes: number;
  setEditTitle: (v: string) => void;
  setEditMinutes: (v: number) => void;
  setEditingId: (v: string | null) => void;
  startEditSection: (s: ProgressMeetingSection) => void;
  commitEditSection: () => void;
  handleRemoveSection: (idx: number) => void;
  handleResetSection: (idx: number) => void;
  handleDuplicateSection: (idx: number) => void;
  handleMoveSections: (from: number, to: number) => void;
  isProgressedSection: (s: ProgressMeetingSection, idx: number) => boolean;
}

function SectionListDnd(props: SectionListDndProps) {
  const { sections, canControl, handleMoveSections } = props;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // 모바일: 250ms 길게 눌러야 드래그 시작 → 페이지 스크롤과 충돌 방지
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const fromIdx = sections.findIndex((s) => s.id === active.id);
    const toIdx = sections.findIndex((s) => s.id === over.id);
    if (fromIdx < 0 || toIdx < 0) return;
    handleMoveSections(fromIdx, toIdx);
  }

  // 운영자 권한 없으면 dnd 비활성화 — 단순 렌더만
  if (!canControl) {
    return (
      <ul className="space-y-1.5">
        {sections.map((s, i) => (
          <SortableSection key={s.id} idx={i} section={s} {...props} disableDrag />
        ))}
      </ul>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5">
          {sections.map((s, i) => (
            <SortableSection key={s.id} idx={i} section={s} {...props} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface SortableSectionProps extends SectionListDndProps {
  idx: number;
  section: ProgressMeetingSection;
  disableDrag?: boolean;
}

function SortableSection(props: SortableSectionProps) {
  const {
    idx: i, section: s, canControl, status, currentIdx,
    editingId, editTitle, editMinutes,
    setEditTitle, setEditMinutes, setEditingId,
    startEditSection, commitEditSection,
    handleRemoveSection, handleResetSection, handleDuplicateSection,
    isProgressedSection, disableDrag,
  } = props;

  const sortable = useSortable({ id: s.id, disabled: disableDrag });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = i === currentIdx && status !== "planning" && status !== "completed";
  const isDone = i < currentIdx || (i === currentIdx && status === "completed");
  const live = liveSeconds(s, i === currentIdx, status);
  const estSec = s.estimatedMinutes * 60;
  const delta = live - estSec;
  const overTime = delta > 0;
  const pct = Math.min(100, (live / Math.max(1, estSec)) * 100);
  const isEditing = editingId === s.id;
  const progressed = isProgressedSection(s, i);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border bg-white px-3 py-2 text-xs transition-shadow",
        isActive && "border-primary shadow-sm",
        isDone && "opacity-70",
        isDragging && "z-10 opacity-90 shadow-lg ring-2 ring-primary/30",
      )}
    >
      {isEditing ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">#{i + 1}</Badge>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEditSection();
              if (e.key === "Escape") setEditingId(null);
            }}
            autoFocus
            className="h-7 flex-1 min-w-[140px] text-xs"
            placeholder="섹션 제목"
          />
          <Input
            type="number"
            min={1}
            value={editMinutes}
            onChange={(e) => setEditMinutes(Number(e.target.value))}
            className="h-7 w-16 text-xs"
          />
          <span className="text-[10px] text-muted-foreground">분</span>
          <Button size="sm" className="h-7 px-2 text-[11px]" onClick={commitEditSection}>저장</Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={() => setEditingId(null)}
          >
            취소
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {canControl && !disableDrag && (
              <button
                type="button"
                {...attributes}
                {...listeners}
                aria-label="섹션 순서 드래그"
                title="드래그로 순서 변경 (모바일은 길게 눌러 드래그)"
                className="-ml-1 flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-slate-100 hover:text-slate-700 active:cursor-grabbing"
              >
                <GripVertical size={14} />
              </button>
            )}
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
              {/* PC 인라인 액션 (md+) */}
              {canControl && (
                <span className="hidden items-center gap-0.5 border-l pl-1.5 md:flex">
                  <button
                    onClick={() => startEditSection(s)}
                    className="rounded p-0.5 text-muted-foreground hover:text-primary"
                    aria-label="섹션 편집"
                    title="섹션 편집"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => handleDuplicateSection(i)}
                    className="rounded p-0.5 text-muted-foreground hover:text-blue-600"
                    aria-label="섹션 복제"
                    title="섹션 복제 (재논의용 — 시간 0으로 초기화하여 다음 줄에 추가)"
                  >
                    <Copy size={11} />
                  </button>
                  <button
                    onClick={() => handleResetSection(i)}
                    className="rounded p-0.5 text-muted-foreground hover:text-amber-600"
                    aria-label="섹션 시간 초기화"
                    title="이 섹션의 시간 기록만 초기화"
                  >
                    <RotateCcw size={11} />
                  </button>
                  <button
                    onClick={() => handleRemoveSection(i)}
                    className={cn(
                      "rounded p-0.5",
                      progressed
                        ? "text-rose-400 hover:text-rose-600"
                        : "text-muted-foreground hover:text-rose-500",
                    )}
                    aria-label="섹션 삭제"
                    title={progressed ? "이미 진행된 섹션 — 삭제 시 추가 확인" : "섹션 삭제"}
                  >
                    <Trash2 size={11} />
                  </button>
                </span>
              )}
            </span>
          </div>

          {/* 모바일 액션바 — 큰 터치 타겟 + 라벨 */}
          {canControl && (
            <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2 md:hidden">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 flex-1 min-w-[64px] px-2 text-[11px] text-muted-foreground hover:text-primary"
                onClick={() => startEditSection(s)}
              >
                <Pencil size={14} className="mr-1" />편집
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 flex-1 min-w-[64px] px-2 text-[11px] text-muted-foreground hover:text-blue-600"
                onClick={() => handleDuplicateSection(i)}
              >
                <Copy size={14} className="mr-1" />복제
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 flex-1 min-w-[64px] px-2 text-[11px] text-muted-foreground hover:text-amber-600"
                onClick={() => handleResetSection(i)}
              >
                <RotateCcw size={14} className="mr-1" />초기화
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-9 flex-1 min-w-[64px] px-2 text-[11px]",
                  progressed
                    ? "text-rose-500 hover:text-rose-700"
                    : "text-muted-foreground hover:text-rose-600",
                )}
                onClick={() => handleRemoveSection(i)}
              >
                <Trash2 size={14} className="mr-1" />삭제
              </Button>
            </div>
          )}
        </>
      )}
      {(isActive || isDone) && !isEditing && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all duration-300", overTime ? "bg-rose-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </li>
  );
}

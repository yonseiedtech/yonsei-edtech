"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  Pause,
  SkipForward,
  Square,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadToStorage } from "@/lib/storage";
import { useAuthStore } from "@/features/auth/auth-store";
import { progressMeetingsApi, activitiesApi, activityProgressApi } from "@/lib/bkend";
import { isAtLeast } from "@/lib/permissions";
import type {
  ProgressMeeting,
  ProgressMeetingSection,
  Activity,
  ActivityProgress,
} from "@/types";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
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

function liveSeconds(section: ProgressMeetingSection, isActive: boolean, status: ProgressMeeting["status"]): number {
  // 누적 + (라이브 보정)
  if (!isActive || status !== "running" || !section.startedAt) return section.actualSeconds;
  const startMs = new Date(section.startedAt).getTime();
  const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  return section.actualSeconds + elapsed;
}

export default function ProgressMeetingPage({ params }: PageProps) {
  const { id: meetingId } = use(params);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  // 1초마다 실시간 표시 갱신
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // 미팅 + 연결 활동 가져오기 (3초마다 폴링하여 다른 사용자 동기화)
  const { data: meeting, isLoading } = useQuery({
    queryKey: ["progress-meeting", meetingId],
    queryFn: () => progressMeetingsApi.get(meetingId),
    refetchInterval: 3000,
  });
  const { data: activity } = useQuery({
    queryKey: ["activity", meeting?.activityId],
    queryFn: () => activitiesApi.get(meeting!.activityId),
    enabled: !!meeting?.activityId,
  });
  const { data: progressEntry } = useQuery({
    queryKey: ["progress-entry", meeting?.activityProgressId],
    queryFn: async () => {
      const res = await activityProgressApi.list(meeting!.activityId);
      return (res.data as ActivityProgress[]).find((p) => p.id === meeting!.activityProgressId) ?? null;
    },
    enabled: !!meeting?.activityProgressId && !!meeting?.activityId,
  });

  // 권한: 운영진 or 활동 모임장
  const isLeader = !!activity && !!user && (activity as Activity).leaderId === user.id;
  const canControl = isAtLeast(user, "staff") || isLeader;

  const updateMutation = useMutation({
    mutationFn: (data: Partial<ProgressMeeting>) => progressMeetingsApi.update(meetingId, { ...data, updatedAt: new Date().toISOString() } as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress-meeting", meetingId] }),
    onError: (e: Error) => toast.error(`저장 실패: ${e.message}`),
  });

  // 새 섹션 추가 입력 상태
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState(10);

  // 슬라이드 업로드 상태
  const [uploadingSlides, setUploadingSlides] = useState(false);

  async function handleSlidesUpload(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("PDF 파일만 업로드 가능합니다.");
      return;
    }
    setUploadingSlides(true);
    try {
      const u = await uploadToStorage(file, `progress-meetings/${meetingId}/slides`);
      updateMutation.mutate({ slidesUrl: u.url, slidesName: u.name });
      toast.success("슬라이드를 업로드했습니다.");
    } catch (e) {
      console.error("[slides/upload]", e);
      toast.error(e instanceof Error ? `업로드 실패: ${e.message}` : "업로드 실패");
    } finally {
      setUploadingSlides(false);
    }
  }

  function handleRemoveSlides() {
    if (!confirm("슬라이드를 삭제하시겠습니까?")) return;
    updateMutation.mutate({ slidesUrl: undefined, slidesName: undefined } as Partial<ProgressMeeting>);
  }

  if (isLoading || !meeting) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  const sections = meeting.sections ?? [];
  const status = meeting.status;
  const currentIdx = meeting.currentSectionIndex;
  const activeSection = sections[currentIdx];

  // 누적: 컨트롤 핸들러용
  function flushActiveSeconds(s: ProgressMeetingSection): ProgressMeetingSection {
    if (!s.startedAt) return s;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000));
    return { ...s, actualSeconds: s.actualSeconds + elapsed, startedAt: undefined };
  }

  function handleAddSection() {
    if (!newTitle.trim()) return;
    if (newMinutes < 1) return;
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

  function handleEditTitle(id: string, title: string) {
    updateMutation.mutate({ sections: sections.map((s) => (s.id === id ? { ...s, title } : s)) });
  }

  function handleEditMinutes(id: string, minutes: number) {
    updateMutation.mutate({ sections: sections.map((s) => (s.id === id ? { ...s, estimatedMinutes: minutes } : s)) });
  }

  function handleStart() {
    if (sections.length === 0) return toast.error("먼저 섹션을 추가하세요.");
    const now = new Date().toISOString();
    const updated = sections.map((s, i) =>
      i === 0 ? { ...s, startedAt: now } : s,
    );
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
      // 마지막 → 종료
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
    updateMutation.mutate({
      currentSectionIndex: nextIdx,
      sections: updated,
    });
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

  // 통계
  const totalEstimatedSec = sections.reduce((s, x) => s + x.estimatedMinutes * 60, 0);
  const totalActualSec = sections.reduce((sum, s, i) => sum + liveSeconds(s, i === currentIdx, status), 0);
  const overallDelta = totalActualSec - totalEstimatedSec; // + 면 초과

  const backHref = activity ? `/activities/${(activity as Activity).type === "external" ? "external" : (activity as Activity).type === "project" ? "projects" : "studies"}/${meeting.activityId}` : "/dashboard";

  return (
    <div className="py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> 활동으로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">실시간 미팅 타이머</p>
              <h1 className="mt-1 text-xl font-bold">
                {activity ? (activity as Activity).title : "—"}
                {progressEntry && <span className="ml-2 text-sm font-normal text-muted-foreground">· Week {progressEntry.week} {progressEntry.title}</span>}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <Badge variant="secondary" className="text-xs">
                예상 {fmtMMSS(totalEstimatedSec)} · 실제 {fmtMMSS(totalActualSec)}
              </Badge>
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs",
                  overallDelta > 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700",
                )}
              >
                {overallDelta > 0 ? "초과" : "여유"} {fmtMMSS(Math.abs(overallDelta))}
              </Badge>
            </div>
          </div>

          {/* 컨트롤 (운영진/모임장) */}
          {canControl && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {status === "planning" && (
                <Button size="sm" onClick={handleStart} disabled={sections.length === 0}>
                  <Play size={14} className="mr-1" /> 미팅 시작
                </Button>
              )}
              {status === "running" && (
                <>
                  <Button size="sm" variant="outline" onClick={handlePause}>
                    <Pause size={14} className="mr-1" /> 일시정지
                  </Button>
                  <Button size="sm" onClick={handleNextSection}>
                    <SkipForward size={14} className="mr-1" />
                    {currentIdx + 1 >= sections.length ? "마지막 종료" : "다음 섹션"}
                  </Button>
                  <Button size="sm" variant="outline" className="ml-auto text-destructive" onClick={handleEnd}>
                    <Square size={14} className="mr-1" /> 미팅 종료
                  </Button>
                </>
              )}
              {status === "paused" && (
                <>
                  <Button size="sm" onClick={handleResume}>
                    <Play size={14} className="mr-1" /> 재개
                  </Button>
                  <Button size="sm" variant="outline" className="ml-auto text-destructive" onClick={handleEnd}>
                    <Square size={14} className="mr-1" /> 미팅 종료
                  </Button>
                </>
              )}
              {status === "completed" && (
                <p className="text-xs text-muted-foreground">미팅이 종료되었습니다.</p>
              )}
            </div>
          )}
          {!canControl && (
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              관전 모드입니다. 운영진/모임장만 미팅을 조작할 수 있습니다.
            </p>
          )}
        </div>

        {/* 슬라이드 (PDF) — 발표 자료 공유 */}
        <div className="mt-4 rounded-2xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <FileText size={14} />발표 슬라이드
              {meeting.slidesName && (
                <span className="text-xs font-normal text-muted-foreground">· {meeting.slidesName}</span>
              )}
            </h2>
            {canControl && (
              <div className="flex items-center gap-1.5">
                <label className="relative inline-flex cursor-pointer items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary">
                  {uploadingSlides ? (
                    <span>업로드 중…</span>
                  ) : (
                    <>
                      <Upload size={12} />
                      {meeting.slidesUrl ? "교체" : "PDF 업로드"}
                    </>
                  )}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    disabled={uploadingSlides}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleSlidesUpload(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                {meeting.slidesUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveSlides}
                    className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    aria-label="슬라이드 삭제"
                    title="슬라이드 삭제"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
          </div>
          {meeting.slidesUrl ? (
            <div className="overflow-hidden rounded-lg border">
              <iframe
                src={`${meeting.slidesUrl}#toolbar=1&navpanes=0`}
                className="h-[640px] w-full"
                title={meeting.slidesName ?? "발표 슬라이드"}
              />
              <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-3 py-2">
                <a
                  href={meeting.slidesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  새 창에서 열기
                </a>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              {canControl
                ? "PDF 슬라이드를 업로드하면 참여자들이 함께 볼 수 있습니다."
                : "아직 업로드된 슬라이드가 없습니다."}
            </p>
          )}
        </div>

        {/* 섹션 목록 */}
        <div className="mt-4 space-y-2">
          {sections.length === 0 && (
            <div className="rounded-2xl border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              아직 등록된 아젠다(섹션)가 없습니다.
              {canControl && " 아래에서 추가하세요."}
            </div>
          )}
          {sections.map((s, i) => {
            const isActive = i === currentIdx && status !== "planning" && status !== "completed";
            const isDone = i < currentIdx || (i === currentIdx && status === "completed");
            const live = liveSeconds(s, i === currentIdx, status);
            const estSec = s.estimatedMinutes * 60;
            const delta = live - estSec;
            const overTime = delta > 0;
            const pct = Math.min(100, (live / Math.max(1, estSec)) * 100);
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-2xl border bg-card p-4 transition-shadow",
                  isActive && "border-primary shadow-md",
                  isDone && "opacity-70",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">#{i + 1}</Badge>
                      {isActive && <Badge className="bg-primary text-[10px] text-white">진행 중</Badge>}
                      {isDone && <Badge className="bg-emerald-50 text-[10px] text-emerald-700"><CheckCircle2 size={10} className="mr-0.5" />완료</Badge>}
                    </div>
                    {canControl && status === "planning" ? (
                      <Input
                        className="mt-2 text-sm font-medium"
                        defaultValue={s.title}
                        onBlur={(e) => {
                          if (e.target.value.trim() !== s.title) handleEditTitle(s.id, e.target.value.trim());
                        }}
                      />
                    ) : (
                      <p className="mt-1 text-base font-semibold">{s.title}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        예상 {s.estimatedMinutes}분
                        {canControl && status === "planning" && (
                          <Input
                            type="number"
                            min={1}
                            defaultValue={s.estimatedMinutes}
                            className="ml-2 inline-block h-7 w-16 text-xs"
                            onBlur={(e) => {
                              const v = Number(e.target.value);
                              if (v > 0 && v !== s.estimatedMinutes) handleEditMinutes(s.id, v);
                            }}
                          />
                        )}
                      </span>
                      <span className="tabular-nums">실제 {fmtMMSS(live)}</span>
                      {(isActive || isDone) && (
                        <span
                          className={cn(
                            "tabular-nums",
                            overTime ? "text-rose-600" : "text-emerald-600",
                          )}
                        >
                          {overTime ? <AlertTriangle size={12} className="-mt-0.5 mr-0.5 inline" /> : null}
                          {overTime ? "초과" : "여유"} {fmtMMSS(Math.abs(delta))}
                        </span>
                      )}
                    </div>
                    {(isActive || isDone) && (
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full transition-all duration-300",
                            overTime ? "bg-rose-500" : "bg-primary",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {canControl && status === "planning" && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSection(s.id)}
                      className="rounded p-1 text-muted-foreground hover:text-rose-500"
                      aria-label="섹션 삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* 섹션 추가 (planning 단계에서만, 컨트롤 권한자만) */}
          {canControl && status === "planning" && (
            <div className="rounded-2xl border border-dashed bg-card p-4">
              <p className="text-sm font-semibold">아젠다 추가</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_120px_auto]">
                <Input
                  placeholder="예: 논문 검토, Q&A, 다음 주 계획"
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
                  <Plus size={14} className="mr-1" />추가
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          이 페이지는 자동으로 3초마다 동기화됩니다. 링크를 공유하면 모두 같이 볼 수 있어요.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ProgressMeeting["status"] }) {
  const map: Record<ProgressMeeting["status"], { label: string; cls: string }> = {
    planning: { label: "준비 중", cls: "bg-slate-100 text-slate-700" },
    running: { label: "진행 중", cls: "bg-emerald-50 text-emerald-700 animate-pulse" },
    paused: { label: "일시정지", cls: "bg-amber-50 text-amber-700" },
    completed: { label: "종료됨", cls: "bg-blue-50 text-blue-700" },
  };
  const m = map[status];
  return <Badge variant="secondary" className={cn("text-xs", m.cls)}>{m.label}</Badge>;
}

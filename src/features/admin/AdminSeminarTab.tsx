"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  useSeminars,
  useUpdateSeminar,
  useDeleteSeminar,
} from "@/features/seminar/useSeminar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { Seminar, SeminarStatus, TimelinePhase } from "@/types";
import { SEMINAR_STATUS_LABELS } from "@/types";
import { getComputedStatus } from "@/lib/seminar-utils";
import { toast } from "sonner";
import Link from "next/link";
import { Pencil, BookOpen, Image as ImageIcon, Video, AlertTriangle, Trash2, Copy, Send, CalendarDays, Users, TrendingUp, FileEdit } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useCreateSeminar } from "@/features/seminar/useSeminar";
import { createTimeline } from "@/features/seminar-admin/timeline-template";
import { useSeminarAdminContext } from "@/features/seminar-admin/seminar-admin-store";

const STATUS_COLORS: Record<SeminarStatus, string> = {
  draft: "bg-gray-50 text-gray-500",
  upcoming: "bg-blue-50 text-blue-700",
  ongoing: "bg-amber-50 text-amber-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

type EditSeminar = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  isOnline: boolean;
  onlineUrl: string;
  speaker: string;
  speakerBio: string;
  posterUrl: string;
  maxAttendees: string;
};

export default function AdminSeminarTab() {
  const { seminars } = useSeminars();
  const { updateSeminar } = useUpdateSeminar();
  const { deleteSeminar } = useDeleteSeminar();
  const { createSeminar } = useCreateSeminar();
  const setActiveSeminarId = useSeminarAdminContext((s) => s.setActiveSeminarId);

  async function handleCloneSeminar(s: Seminar) {
    if (!confirm(`"${s.title}" 세미나를 복제하시겠습니까?`)) return;
    try {
      const cloneData: Record<string, unknown> = {
        title: `${s.title} (복사본)`,
        description: s.description,
        date: "",
        time: s.time,
        location: s.location,
        speaker: "",
        speakerBio: "",
        speakerType: s.speakerType,
        isOnline: s.isOnline,
        onlineUrl: s.isOnline ? s.onlineUrl : undefined,
        maxAttendees: s.maxAttendees,
        attendeeIds: [],
        status: "upcoming" as const,
        registrationFields: s.registrationFields,
        reviewQuestions: s.reviewQuestions,
        timeline: (s.timeline ?? []).map((t) => ({ ...t, done: false, doneAt: undefined })),
        createdBy: s.createdBy,
      };
      await createSeminar(cloneData as Omit<Seminar, "id" | "attendeeIds" | "createdAt" | "updatedAt">);
      toast.success("세미나가 복제되었습니다. 날짜와 연사를 수정해주세요.");
    } catch {
      toast.error("세미나 복제에 실패했습니다.");
    }
  }

  async function handlePublishDraft(s: Seminar) {
    if (!s.date || !s.title) {
      toast.error("등록하려면 제목과 날짜를 먼저 입력해주세요.");
      return;
    }
    if (!confirm(`"${s.title}" 세미나를 등록(공개)하시겠습니까?`)) return;
    try {
      const timeline = s.timeline?.length ? s.timeline : createTimeline(s.isOnline);
      await updateSeminar({ id: s.id, data: { status: "upcoming", timeline } });
      toast.success("세미나가 등록되었습니다. 타임라인이 자동 적용되었습니다.");
    } catch {
      toast.error("등록에 실패했습니다.");
    }
  }

  async function handleDeleteSeminar(id: string, title: string) {
    if (!confirm(`"${title}" 세미나를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await deleteSeminar(id);
      toast.success("세미나가 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }
  const [editSeminar, setEditSeminar] = useState<EditSeminar | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelInput, setShowCancelInput] = useState(false);

  function handleCancelSeminar() {
    if (!editSeminar || !cancelReason.trim()) return;
    const sem = seminars.find((s) => s.id === editSeminar.id);
    const cancelItem: TimelinePhase = {
      id: "cancelled",
      label: `세미나 취소: ${cancelReason.trim()}`,
      dDay: 0,
      done: true,
      doneAt: new Date().toISOString(),
    };
    const timeline = [...(sem?.timeline ?? []), cancelItem];
    updateSeminar({
      id: editSeminar.id,
      data: { status: "cancelled", cancelReason: cancelReason.trim(), timeline },
    });
    toast.success("세미나가 취소되었습니다.");
    setCancelReason("");
    setShowCancelInput(false);
    setEditSeminar(null);
  }

  function handleUncancelSeminar() {
    if (!editSeminar) return;
    const sem = seminars.find((s) => s.id === editSeminar.id);
    const timeline = (sem?.timeline ?? []).filter((t) => t.id !== "cancelled");
    updateSeminar({
      id: editSeminar.id,
      data: { status: "upcoming", cancelReason: "", timeline },
    });
    toast.success("세미나 취소가 해제되었습니다.");
    setEditSeminar(null);
  }

  function openEditSeminar(s: Seminar) {
    setActiveSeminarId(s.id);
    setEditSeminar({
      id: s.id,
      title: s.title,
      description: s.description,
      date: s.date,
      time: s.time,
      location: s.location,
      isOnline: s.isOnline ?? false,
      onlineUrl: s.onlineUrl ?? "",
      speaker: s.speaker,
      speakerBio: s.speakerBio ?? "",
      posterUrl: s.posterUrl ?? "",
      maxAttendees: s.maxAttendees?.toString() ?? "",
    });
  }

  function handleSaveSeminar() {
    if (!editSeminar) return;
    updateSeminar({
      id: editSeminar.id,
      data: {
        title: editSeminar.title,
        description: editSeminar.description,
        date: editSeminar.date,
        time: editSeminar.time,
        location: editSeminar.location,
        speaker: editSeminar.speaker,
        speakerBio: editSeminar.speakerBio || undefined,
        isOnline: editSeminar.isOnline,
        onlineUrl: editSeminar.isOnline ? (editSeminar.onlineUrl || undefined) : undefined,
        posterUrl: editSeminar.posterUrl || undefined,
        maxAttendees: editSeminar.maxAttendees
          ? parseInt(editSeminar.maxAttendees)
          : undefined,
      },
    });
    toast.success("세미나 정보가 수정되었습니다.");
    setEditSeminar(null);
  }

  // 대시보드 통계
  const stats = (() => {
    let draft = 0, upcoming = 0, ongoing = 0, completed = 0, totalAttendees = 0;
    for (const s of seminars) {
      const c = getComputedStatus(s);
      if (c === "draft") draft++;
      else if (c === "upcoming") upcoming++;
      else if (c === "ongoing") ongoing++;
      else if (c === "completed") completed++;
      totalAttendees += s.attendeeIds.length;
    }
    return { draft, upcoming, ongoing, completed, totalAttendees };
  })();

  // 다가오는 세미나 (가장 가까운 예정 세미나)
  const upcomingSeminars = seminars
    .filter((s) => getComputedStatus(s) === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={CalendarDays}
        title="세미나 관리"
        description="세미나 일정을 등록하고 출석/리뷰/수료증을 관리합니다."
      />
      {/* 대시보드 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays size={16} className="text-blue-500" />
            <span>예정</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.upcoming}<span className="ml-1 text-sm font-normal text-muted-foreground">건</span></p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp size={16} className="text-green-500" />
            <span>완료</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.completed}<span className="ml-1 text-sm font-normal text-muted-foreground">건</span></p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={16} className="text-primary" />
            <span>총 참석자</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.totalAttendees}<span className="ml-1 text-sm font-normal text-muted-foreground">명</span></p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileEdit size={16} className="text-gray-400" />
            <span>임시저장</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.draft}<span className="ml-1 text-sm font-normal text-muted-foreground">건</span></p>
        </div>
      </div>

      {/* 다가오는 세미나 하이라이트 */}
      {upcomingSeminars.length > 0 && (
        <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-blue-50 p-4">
          <h3 className="text-sm font-semibold text-primary">다가오는 세미나</h3>
          <div className="mt-2 space-y-2">
            {upcomingSeminars.map((s) => {
              const timeline = s.timeline ?? [];
              const done = timeline.filter((t) => t.done).length;
              const total = timeline.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const dDay = Math.round((new Date(s.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm">
                  <Badge variant="secondary" className="shrink-0 bg-blue-50 text-blue-700">D{dDay <= 0 ? "" : "-"}{Math.abs(dDay)}</Badge>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium line-clamp-1">{s.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{s.speaker} | {s.date} {s.time}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{s.attendeeIds.length}명</span>
                    {total > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-16 rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", pct === 100 ? "bg-green-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    <div className="space-y-0 rounded-xl border bg-white">
      {/* 테이블 헤더 (데스크톱만) */}
      <div className="hidden lg:grid grid-cols-[48px_1fr_120px_140px_80px_100px_80px_80px_80px] items-center gap-1 border-b bg-muted/30 px-4 py-3 text-sm font-medium">
        <span>포스터</span>
        <span>제목</span>
        <span>발표자</span>
        <span>일시</span>
        <span>참석자</span>
        <span>준비현황</span>
        <span>상태</span>
        <span>공간</span>
        <span>관리</span>
      </div>

      {/* 세미나 행 */}
      {seminars.map((s) => {
        const computed = getComputedStatus(s);
        const timeline = s.timeline ?? [];
        const totalTasks = timeline.length;
        const doneTasks = timeline.filter((t) => t.done).length;
        const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : -1;
        const overdue = timeline.filter((t) => !t.done && computed === "upcoming" && (() => {
          const semDate = new Date(s.date);
          const now = new Date();
          const diffDays = Math.round((semDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return t.dDay <= 0 ? diffDays <= Math.abs(t.dDay) : false;
        })());

        return (<>
          {/* 데스크톱: 그리드 행 */}
          <div key={s.id} className="hidden lg:grid grid-cols-[48px_1fr_120px_140px_80px_100px_80px_80px_80px] items-center gap-1 border-b px-4 py-3 text-sm">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border bg-muted/20">
              {s.posterUrl ? (
                <Image src={s.posterUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={16} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex items-start gap-1.5 text-left font-medium min-w-0">
              <span className="line-clamp-2 break-words">{s.title}</span>
              {(s.sessions?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="shrink-0 text-xs">{s.sessions!.length}세션</Badge>
              )}
            </div>
            <span className="line-clamp-1 text-muted-foreground">{s.speaker}</span>
            <span className="text-muted-foreground">{formatDate(s.date)} {s.time}</span>
            <span>{s.attendeeIds.length}{s.maxAttendees ? `/${s.maxAttendees}` : ""}명</span>
            {progressPct >= 0 ? (
              <div className="flex flex-col gap-0.5" title={`${doneTasks}/${totalTasks} 완료${overdue.length > 0 ? ` (지연 ${overdue.length}건)` : ""}`}>
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div className={cn("h-full rounded-full transition-all", progressPct === 100 ? "bg-green-500" : overdue.length > 0 ? "bg-red-400" : "bg-primary")} style={{ width: `${progressPct}%` }} />
                </div>
                <span className={cn("text-[10px]", overdue.length > 0 ? "text-red-500" : "text-muted-foreground")}>{progressPct}%</span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">-</span>
            )}
            <Badge variant="secondary" className={STATUS_COLORS[computed]}>{SEMINAR_STATUS_LABELS[computed]}</Badge>
            <Link href={`/seminars/${s.id}`}>
              <Button variant="outline" size="sm" className="gap-1 text-xs"><BookOpen size={14} />입장</Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => openEditSeminar(s)}><Pencil size={14} /></Button>
            <Button variant="outline" size="sm" title="복제" onClick={() => handleCloneSeminar(s)}><Copy size={14} /></Button>
            {computed === "draft" && (
              <Button variant="default" size="sm" title="등록(공개)" onClick={() => handlePublishDraft(s)}><Send size={14} /></Button>
            )}
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteSeminar(s.id, s.title)}><Trash2 size={14} /></Button>
          </div>

          {/* 모바일: 카드형 */}
          <div key={`m-${s.id}`} className="flex lg:hidden items-start gap-3 border-b px-4 py-3 text-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted/20">
              {s.posterUrl ? (
                <Image src={s.posterUrl} alt="" width={48} height={48} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon size={16} className="text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-1.5 font-medium">
                <span className="line-clamp-2 break-words">{s.title}</span>
                {(s.sessions?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="shrink-0 text-xs">{s.sessions!.length}세션</Badge>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{s.speaker}</span>
                <span>{formatDate(s.date)} {s.time}</span>
                <span>{s.attendeeIds.length}{s.maxAttendees ? `/${s.maxAttendees}` : ""}명</span>
              </div>
              {progressPct >= 0 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", progressPct === 100 ? "bg-green-500" : overdue.length > 0 ? "bg-red-400" : "bg-primary")} style={{ width: `${progressPct}%` }} />
                  </div>
                  <span className={cn("text-[10px] shrink-0", overdue.length > 0 ? "text-red-500" : "text-muted-foreground")}>{progressPct}% ({doneTasks}/{totalTasks})</span>
                </div>
              )}
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[computed])}>{SEMINAR_STATUS_LABELS[computed]}</Badge>
                <Link href={`/seminars/${s.id}`}>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs"><BookOpen size={12} />입장</Button>
                </Link>
                <Button variant="outline" size="sm" className="h-7" onClick={() => openEditSeminar(s)}><Pencil size={12} /></Button>
                <Button variant="outline" size="sm" className="h-7" title="복제" onClick={() => handleCloneSeminar(s)}><Copy size={12} /></Button>
                {computed === "draft" && (
                  <Button variant="default" size="sm" className="h-7" title="등록(공개)" onClick={() => handlePublishDraft(s)}><Send size={12} /></Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-destructive" onClick={() => handleDeleteSeminar(s.id, s.title)}><Trash2 size={12} /></Button>
              </div>
            </div>
          </div>
        </>);
      })}

      {/* 세미나 수정 Dialog */}
      <Dialog
        open={!!editSeminar}
        onOpenChange={(open) => !open && setEditSeminar(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>세미나 수정</DialogTitle>
          </DialogHeader>
          {editSeminar && (
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">제목</label>
                <Input
                  value={editSeminar.title}
                  onChange={(e) =>
                    setEditSeminar({ ...editSeminar, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">날짜</label>
                  <Input
                    type="date"
                    value={editSeminar.date}
                    onChange={(e) =>
                      setEditSeminar({ ...editSeminar, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">시간</label>
                  <Input
                    type="time"
                    value={editSeminar.time}
                    onChange={(e) =>
                      setEditSeminar({ ...editSeminar, time: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-sm font-medium">장소</label>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={editSeminar.isOnline}
                      onChange={(e) =>
                        setEditSeminar({ ...editSeminar, isOnline: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-gray-300"
                    />
                    <Video size={12} className="text-blue-500" />
                    온라인 (ZOOM)
                  </label>
                </div>
                <Input
                  value={editSeminar.location}
                  onChange={(e) =>
                    setEditSeminar({ ...editSeminar, location: e.target.value })
                  }
                  placeholder={editSeminar.isOnline ? "온라인 (ZOOM)" : "장소"}
                />
                {editSeminar.isOnline && (
                  <Input
                    className="mt-2"
                    value={editSeminar.onlineUrl}
                    onChange={(e) =>
                      setEditSeminar({ ...editSeminar, onlineUrl: e.target.value })
                    }
                    placeholder="ZOOM 링크 (https://zoom.us/j/...)"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">발표자</label>
                  <Input
                    value={editSeminar.speaker}
                    onChange={(e) =>
                      setEditSeminar({ ...editSeminar, speaker: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">최대 인원</label>
                  <Input
                    type="number"
                    value={editSeminar.maxAttendees}
                    onChange={(e) =>
                      setEditSeminar({
                        ...editSeminar,
                        maxAttendees: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">발표자 소개</label>
                <Input
                  value={editSeminar.speakerBio}
                  onChange={(e) =>
                    setEditSeminar({ ...editSeminar, speakerBio: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">포스터 URL</label>
                <Input
                  placeholder="https://..."
                  value={editSeminar.posterUrl}
                  onChange={(e) =>
                    setEditSeminar({ ...editSeminar, posterUrl: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">설명</label>
                <textarea
                  value={editSeminar.description}
                  onChange={(e) =>
                    setEditSeminar({
                      ...editSeminar,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          )}
          {/* 세미나 취소/해제 영역 */}
          {editSeminar && (() => {
            const sem = seminars.find((s) => s.id === editSeminar.id);
            if (!sem) return null;
            return sem.status === "cancelled" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                  <AlertTriangle size={16} />
                  이 세미나는 취소된 상태입니다
                </div>
                {sem.cancelReason && (
                  <p className="mt-1 text-xs text-amber-600">사유: {sem.cancelReason}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleUncancelSeminar}
                >
                  취소 해제 (예정 상태로 복원)
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-red-800">
                  <AlertTriangle size={16} />
                  세미나 취소
                </div>
                {showCancelInput ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="취소 사유를 입력하세요..."
                      rows={2}
                      className="w-full rounded-lg border border-input bg-white px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!cancelReason.trim()}
                        onClick={handleCancelSeminar}
                      >
                        취소 확정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowCancelInput(false); setCancelReason(""); }}
                      >
                        돌아가기
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowCancelInput(true)}
                  >
                    이 세미나를 취소합니다
                  </Button>
                )}
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditSeminar(null); setShowCancelInput(false); setCancelReason(""); }}>
              닫기
            </Button>
            <Button onClick={handleSaveSeminar}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import {
  useSeminars,
  useUpdateSeminar,
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
import { Pencil, BookOpen, Image as ImageIcon, Video, AlertTriangle } from "lucide-react";

const STATUS_COLORS: Record<SeminarStatus, string> = {
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

  return (
    <div className="space-y-0 rounded-xl border bg-white">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[48px_1fr_120px_140px_80px_80px_80px_80px] items-center gap-1 border-b bg-muted/30 px-4 py-3 text-sm font-medium">
        <span>포스터</span>
        <span>제목</span>
        <span>발표자</span>
        <span>일시</span>
        <span>참석자</span>
        <span>상태</span>
        <span>공간</span>
        <span>관리</span>
      </div>

      {/* 세미나 행 */}
      {seminars.map((s) => {
        const computed = getComputedStatus(s);
        return (
          <div key={s.id} className="grid grid-cols-[48px_1fr_120px_140px_80px_80px_80px_80px] items-center gap-1 border-b px-4 py-3 text-sm">
            {/* 포스터 썸네일 */}
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border bg-muted/20">
              {s.posterUrl ? (
                <Image
                  src={s.posterUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon size={16} className="text-muted-foreground" />
              )}
            </div>

            {/* 제목 */}
            <div className="flex items-center gap-1.5 text-left font-medium">
              <span className="truncate">{s.title}</span>
              {(s.sessions?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {s.sessions!.length}세션
                </Badge>
              )}
            </div>

            <span className="truncate text-muted-foreground">{s.speaker}</span>
            <span className="text-muted-foreground">
              {formatDate(s.date)} {s.time}
            </span>
            <span>
              {s.attendeeIds.length}
              {s.maxAttendees ? `/${s.maxAttendees}` : ""}명
            </span>
            <Badge variant="secondary" className={STATUS_COLORS[computed]}>
              {SEMINAR_STATUS_LABELS[computed]}
            </Badge>
            <Link href={`/seminars/${s.id}`}>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <BookOpen size={14} />
                입장
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => openEditSeminar(s)}>
              <Pencil size={14} />
            </Button>
          </div>
        );
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
  );
}

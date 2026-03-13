"use client";

import { useState } from "react";
import { useSeminarStore } from "@/features/seminar/seminar-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { Seminar, SeminarSession } from "@/types";
import { toast } from "sonner";
import { ChevronDown, Pencil, Plus, Trash2, Image as ImageIcon } from "lucide-react";

const STATUS_LABELS: Record<Seminar["status"], string> = {
  upcoming: "예정",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<Seminar["status"], string> = {
  upcoming: "bg-blue-50 text-blue-700",
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
  speaker: string;
  speakerBio: string;
  posterUrl: string;
  maxAttendees: string;
};

type EditSession = {
  seminarId: string;
  sessionId?: string;
  title: string;
  speaker: string;
  speakerBio: string;
  time: string;
  duration: string;
  order: string;
};

export default function AdminSeminarTab() {
  const { seminars, updateSeminar, addSession, updateSession, deleteSession } =
    useSeminarStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSeminar, setEditSeminar] = useState<EditSeminar | null>(null);
  const [editSession, setEditSession] = useState<EditSession | null>(null);

  function handleStatusChange(id: string, status: Seminar["status"]) {
    updateSeminar(id, { status });
    toast.success(`세미나 상태가 "${STATUS_LABELS[status]}"(으)로 변경되었습니다.`);
  }

  function openEditSeminar(s: Seminar) {
    setEditSeminar({
      id: s.id,
      title: s.title,
      description: s.description,
      date: s.date,
      time: s.time,
      location: s.location,
      speaker: s.speaker,
      speakerBio: s.speakerBio ?? "",
      posterUrl: s.posterUrl ?? "",
      maxAttendees: s.maxAttendees?.toString() ?? "",
    });
  }

  function handleSaveSeminar() {
    if (!editSeminar) return;
    updateSeminar(editSeminar.id, {
      title: editSeminar.title,
      description: editSeminar.description,
      date: editSeminar.date,
      time: editSeminar.time,
      location: editSeminar.location,
      speaker: editSeminar.speaker,
      speakerBio: editSeminar.speakerBio || undefined,
      posterUrl: editSeminar.posterUrl || undefined,
      maxAttendees: editSeminar.maxAttendees
        ? parseInt(editSeminar.maxAttendees)
        : undefined,
    });
    toast.success("세미나 정보가 수정되었습니다.");
    setEditSeminar(null);
  }

  function openAddSession(seminarId: string) {
    setEditSession({
      seminarId,
      title: "",
      speaker: "",
      speakerBio: "",
      time: "",
      duration: "30",
      order: "1",
    });
  }

  function openEditSession(seminarId: string, sess: SeminarSession) {
    setEditSession({
      seminarId,
      sessionId: sess.id,
      title: sess.title,
      speaker: sess.speaker,
      speakerBio: sess.speakerBio ?? "",
      time: sess.time,
      duration: sess.duration.toString(),
      order: sess.order.toString(),
    });
  }

  function handleSaveSession() {
    if (!editSession) return;
    const data = {
      title: editSession.title,
      speaker: editSession.speaker,
      speakerBio: editSession.speakerBio || undefined,
      time: editSession.time,
      duration: parseInt(editSession.duration) || 30,
      order: parseInt(editSession.order) || 1,
    };
    if (editSession.sessionId) {
      updateSession(editSession.seminarId, editSession.sessionId, data);
      toast.success("세션이 수정되었습니다.");
    } else {
      addSession(editSession.seminarId, data);
      toast.success("세션이 추가되었습니다.");
    }
    setEditSession(null);
  }

  function handleDeleteSession(seminarId: string, sessionId: string) {
    deleteSession(seminarId, sessionId);
    toast.success("세션이 삭제되었습니다.");
  }

  return (
    <div className="space-y-0 rounded-xl border bg-white">
      {/* 테이블 헤더 */}
      <div className="grid grid-cols-[48px_1fr_120px_140px_80px_80px_100px_80px] items-center gap-1 border-b bg-muted/30 px-4 py-3 text-sm font-medium">
        <span>포스터</span>
        <span>제목</span>
        <span>발표자</span>
        <span>일시</span>
        <span>참석자</span>
        <span>상태</span>
        <span>상태 변경</span>
        <span>관리</span>
      </div>

      {/* 세미나 행 */}
      {seminars.map((s) => (
        <Collapsible
          key={s.id}
          open={expandedId === s.id}
          onOpenChange={(open) => setExpandedId(open ? s.id : null)}
        >
          <div className="grid grid-cols-[48px_1fr_120px_140px_80px_80px_100px_80px] items-center gap-1 border-b px-4 py-3 text-sm">
            {/* 포스터 썸네일 */}
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded border bg-muted/20">
              {s.posterUrl ? (
                <img
                  src={s.posterUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon size={16} className="text-muted-foreground" />
              )}
            </div>

            {/* 제목 + 확장 토글 */}
            <CollapsibleTrigger className="flex items-center gap-1.5 text-left font-medium hover:text-primary">
              <ChevronDown
                size={14}
                className={`shrink-0 transition-transform ${expandedId === s.id ? "rotate-180" : ""}`}
              />
              <span className="truncate">{s.title}</span>
              {(s.sessions?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {s.sessions!.length}세션
                </Badge>
              )}
            </CollapsibleTrigger>

            <span className="truncate text-muted-foreground">{s.speaker}</span>
            <span className="text-muted-foreground">
              {formatDate(s.date)} {s.time}
            </span>
            <span>
              {s.attendeeIds.length}
              {s.maxAttendees ? `/${s.maxAttendees}` : ""}명
            </span>
            <Badge variant="secondary" className={STATUS_COLORS[s.status]}>
              {STATUS_LABELS[s.status]}
            </Badge>
            <select
              value={s.status}
              onChange={(e) =>
                handleStatusChange(s.id, e.target.value as Seminar["status"])
              }
              className="rounded-md border px-2 py-1 text-sm"
            >
              <option value="upcoming">예정</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => openEditSeminar(s)}>
              <Pencil size={14} />
            </Button>
          </div>

          {/* 세션 목록 (확장) */}
          <CollapsibleContent>
            <div className="border-b bg-muted/10 px-6 py-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-medium">세부 세션</h4>
                <Button size="sm" variant="outline" onClick={() => openAddSession(s.id)}>
                  <Plus size={14} className="mr-1" />
                  세션 추가
                </Button>
              </div>
              {(s.sessions?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 세션이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {s.sessions!
                    .sort((a, b) => a.order - b.order)
                    .map((sess) => (
                      <div
                        key={sess.id}
                        className="flex items-center justify-between rounded-lg border bg-white px-4 py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                            {sess.order}
                          </span>
                          <div>
                            <p className="font-medium">{sess.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {sess.speaker}
                              {sess.speakerBio && ` · ${sess.speakerBio}`}
                              {" · "}
                              {sess.time} ({sess.duration}분)
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditSession(s.id, sess)}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive"
                            onClick={() => handleDeleteSession(s.id, sess.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

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
                <label className="mb-1 block text-sm font-medium">장소</label>
                <Input
                  value={editSeminar.location}
                  onChange={(e) =>
                    setEditSeminar({ ...editSeminar, location: e.target.value })
                  }
                />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSeminar(null)}>
              취소
            </Button>
            <Button onClick={handleSaveSeminar}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 세션 추가/수정 Dialog */}
      <Dialog
        open={!!editSession}
        onOpenChange={(open) => !open && setEditSession(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editSession?.sessionId ? "세션 수정" : "세션 추가"}
            </DialogTitle>
          </DialogHeader>
          {editSession && (
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">세션 제목</label>
                <Input
                  value={editSession.title}
                  onChange={(e) =>
                    setEditSession({ ...editSession, title: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">발표자</label>
                  <Input
                    value={editSession.speaker}
                    onChange={(e) =>
                      setEditSession({ ...editSession, speaker: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">발표자 소개</label>
                  <Input
                    value={editSession.speakerBio}
                    onChange={(e) =>
                      setEditSession({
                        ...editSession,
                        speakerBio: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">시간</label>
                  <Input
                    type="time"
                    value={editSession.time}
                    onChange={(e) =>
                      setEditSession({ ...editSession, time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">길이(분)</label>
                  <Input
                    type="number"
                    value={editSession.duration}
                    onChange={(e) =>
                      setEditSession({ ...editSession, duration: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">순서</label>
                  <Input
                    type="number"
                    value={editSession.order}
                    onChange={(e) =>
                      setEditSession({ ...editSession, order: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>
              취소
            </Button>
            <Button onClick={handleSaveSession}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

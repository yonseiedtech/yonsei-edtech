"use client";

import { useState } from "react";
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
import { Clock, Plus, Pencil, Trash2 } from "lucide-react";
import {
  useSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
} from "@/features/seminar/useSeminar";
import { toast } from "sonner";
import type { SeminarSession } from "@/types";

interface Props {
  sessions: SeminarSession[];
  seminarId: string;
  seminarSpeaker: string;
  seminarSpeakerBio?: string;
  isStaff: boolean;
}

type EditSessionForm = {
  sessionId?: string;
  category: string;
  title: string;
  useSeminarSpeaker: boolean;
  speaker: string;
  speakerBio: string;
  startTime: string;
  endTime: string;
};

function calcDuration(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export default function SessionProgram({
  sessions: propSessions,
  seminarId,
  seminarSpeaker,
  seminarSpeakerBio,
  isStaff,
}: Props) {
  const { sessions: dbSessions, refetch: refetchSessions } = useSessions(seminarId);
  const { createSession } = useCreateSession();
  const { updateSession } = useUpdateSession();
  const { deleteSession } = useDeleteSession();
  const [editSession, setEditSession] = useState<EditSessionForm | null>(null);

  // DB 컬렉션 우선, 없으면 세미나 내장 배열 폴백
  const sessions = dbSessions.length > 0 ? dbSessions : propSessions;
  const sorted = [...sessions].sort((a, b) => a.time.localeCompare(b.time));

  function openAdd() {
    setEditSession({
      category: "",
      title: "",
      useSeminarSpeaker: true,
      speaker: seminarSpeaker,
      speakerBio: seminarSpeakerBio ?? "",
      startTime: "",
      endTime: "",
    });
  }

  function openEdit(sess: SeminarSession) {
    const isSameSpeaker = sess.speaker === seminarSpeaker;
    setEditSession({
      sessionId: sess.id,
      category: sess.category ?? "",
      title: sess.title,
      useSeminarSpeaker: isSameSpeaker,
      speaker: sess.speaker,
      speakerBio: sess.speakerBio ?? "",
      startTime: sess.time,
      endTime: sess.endTime ?? "",
    });
  }

  async function handleSave() {
    if (!editSession) return;
    if (!editSession.title.trim()) {
      toast.error("세션 제목을 입력하세요.");
      return;
    }
    const speaker = editSession.useSeminarSpeaker ? seminarSpeaker : editSession.speaker;
    const speakerBio = editSession.useSeminarSpeaker
      ? seminarSpeakerBio || undefined
      : editSession.speakerBio || undefined;
    const startTime = editSession.startTime || "";
    const endTime = editSession.endTime || "";
    const duration = calcDuration(startTime, endTime);

    let order = sessions.length + 1;
    if (startTime) {
      const allTimes = sessions
        .filter((s) => !editSession.sessionId || s.id !== editSession.sessionId)
        .map((s) => s.time)
        .filter(Boolean);
      allTimes.push(startTime);
      allTimes.sort();
      order = allTimes.indexOf(startTime) + 1;
    }

    const data = {
      category: editSession.category || undefined,
      title: editSession.title.trim(),
      speaker: speaker || "미정",
      speakerBio,
      time: startTime || "미정",
      endTime: endTime || undefined,
      duration: duration > 0 ? duration : 30,
      order,
    };
    try {
      if (editSession.sessionId) {
        await updateSession({ seminarId, sessionId: editSession.sessionId, data });
        toast.success("세션이 수정되었습니다.");
      } else {
        await createSession({
          seminarId,
          data: data as Omit<SeminarSession, "id" | "seminarId">,
        });
        toast.success("세션이 추가되었습니다.");
      }
      await refetchSessions();
      setEditSession(null);
    } catch (err) {
      console.error("[session save]", err);
      toast.error("세션 저장에 실패했습니다.");
    }
  }

  async function handleDelete(sessionId: string) {
    try {
      await deleteSession({ seminarId, sessionId });
      await refetchSessions();
      toast.success("세션이 삭제되었습니다.");
    } catch {
      toast.error("세션 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card p-5 sm:mt-6 sm:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <Clock size={16} />
          세션 프로그램
        </h2>
        {isStaff && (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus size={14} className="mr-1" />
            세션 추가
          </Button>
        )}
      </div>

      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((sess, idx) => (
            <div
              key={sess.id}
              className="flex items-start gap-4 rounded-lg border bg-muted/20 px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                {sess.category && (
                  <Badge variant="secondary" className="mb-1 text-xs">
                    {sess.category}
                  </Badge>
                )}
                <p className="font-medium text-sm">{sess.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sess.speaker}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground sm:text-xs">
                  {sess.time && sess.time !== "미정" ? (
                    <>
                      {sess.time}
                      {sess.endTime ? `~${sess.endTime}` : ""} ({sess.duration}분)
                    </>
                  ) : (
                    <span className="text-amber-500">시간 미정</span>
                  )}
                </span>
                {isStaff && (
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(sess)}>
                      <Pencil size={12} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleDelete(sess.id)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <Clock size={32} className="text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">등록된 세션이 없습니다.</p>
          {isStaff && (
            <Button variant="outline" size="sm" className="mt-3" onClick={openAdd}>
              <Plus size={14} className="mr-1" />
              세션 추가
            </Button>
          )}
        </div>
      )}

      {/* 세션 추가/수정 Dialog */}
      <Dialog open={!!editSession} onOpenChange={(open) => !open && setEditSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editSession?.sessionId ? "세션 수정" : "세션 추가"}</DialogTitle>
          </DialogHeader>
          {editSession && (
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">세션 구분</label>
                <Input
                  placeholder="예: 기조강연, 발표, 토론, 실습, 휴식 등"
                  value={editSession.category}
                  onChange={(e) => setEditSession({ ...editSession, category: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">세션 제목</label>
                <Input
                  value={editSession.title}
                  onChange={(e) => setEditSession({ ...editSession, title: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editSession.useSeminarSpeaker}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEditSession({
                        ...editSession,
                        useSeminarSpeaker: checked,
                        speaker: checked ? seminarSpeaker : "",
                        speakerBio: checked ? (seminarSpeakerBio ?? "") : "",
                      });
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="font-medium">세미나 발표자와 동일</span>
                  <span className="text-xs text-muted-foreground">({seminarSpeaker})</span>
                </label>
                {!editSession.useSeminarSpeaker && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">발표자</label>
                      <Input
                        value={editSession.speaker}
                        onChange={(e) => setEditSession({ ...editSession, speaker: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">발표자 소개</label>
                      <Input
                        value={editSession.speakerBio}
                        onChange={(e) => setEditSession({ ...editSession, speakerBio: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">시작 시간</label>
                    <Input
                      type="time"
                      value={editSession.startTime}
                      onChange={(e) => setEditSession({ ...editSession, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">종료 시간</label>
                    <Input
                      type="time"
                      value={editSession.endTime}
                      onChange={(e) => setEditSession({ ...editSession, endTime: e.target.value })}
                    />
                  </div>
                </div>
                {editSession.startTime && editSession.endTime && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    소요시간: {calcDuration(editSession.startTime, editSession.endTime)}분
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditSession(null)}>
              취소
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

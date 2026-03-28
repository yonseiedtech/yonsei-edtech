"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useSeminar,
  useSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
} from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import MaterialsSection from "@/features/seminar/MaterialsSection";
import ReviewsSection from "@/features/seminar/ReviewsSection";
import { getComputedStatus } from "@/lib/seminar-utils";
import { SEMINAR_STATUS_LABELS } from "@/types";
import type { Seminar, SeminarSession, SeminarStatus } from "@/types";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Info,
  FolderOpen,
  MessageSquare,
  Mic,
  Calendar,
  MapPin,
  Users,
  AlertCircle,
  Clock,
  Plus,
  Pencil,
  Trash2,
  UserCircle,
} from "lucide-react";

const STATUS_STYLES: Record<SeminarStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

type Tab = "overview" | "speaker" | "sessions" | "materials" | "attendee-reviews" | "speaker-reviews";

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "개요", icon: <Info size={16} /> },
  { value: "speaker", label: "연사 소개", icon: <UserCircle size={16} /> },
  { value: "sessions", label: "세션", icon: <Clock size={16} /> },
  { value: "materials", label: "자료실", icon: <FolderOpen size={16} /> },
  { value: "attendee-reviews", label: "참석자 후기", icon: <MessageSquare size={16} /> },
  { value: "speaker-reviews", label: "연사 후기", icon: <Mic size={16} /> },
];

interface Props {
  seminarId: string;
}

function OverviewSection({ seminar }: { seminar: NonNullable<ReturnType<typeof useSeminar>> }) {
  const computed = getComputedStatus(seminar);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge className={cn("text-xs", STATUS_STYLES[computed])} variant="secondary">
          {SEMINAR_STATUS_LABELS[computed]}
        </Badge>
      </div>
      <h2 className="text-xl font-bold">{seminar.title}</h2>
      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Calendar size={16} />
          <span>{seminar.date} {seminar.time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} />
          <span>{seminar.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} />
          <span>
            참석 {seminar.attendeeIds.length}
            {seminar.maxAttendees ? ` / ${seminar.maxAttendees}` : ""}명
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Mic size={16} />
          <span>{seminar.speaker}</span>
          {seminar.speakerBio && (
            <span className="text-xs">— {seminar.speakerBio}</span>
          )}
        </div>
      </div>
      {seminar.description && (
        <div className="mt-4 whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm leading-relaxed">
          {seminar.description}
        </div>
      )}
    </div>
  );
}

function SpeakerSection({ seminar }: { seminar: Seminar }) {
  const sessions = (seminar.sessions ?? []).sort((a, b) => a.time.localeCompare(b.time));
  const speakerSessions = sessions.filter((s) => s.speaker === seminar.speaker);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start gap-6">
        {seminar.speakerPhotoUrl ? (
          <img
            src={seminar.speakerPhotoUrl}
            alt={seminar.speaker}
            className="h-28 w-28 shrink-0 rounded-full object-cover ring-4 ring-primary/10"
          />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-4 ring-primary/5">
            <UserCircle size={48} />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{seminar.speaker}</span>
            {seminar.speakerType === "guest" ? (
              <Badge variant="secondary" className="bg-amber-50 text-xs text-amber-700">
                GUEST SPEAKER
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                MEMBER
              </Badge>
            )}
          </div>
          {(seminar.speakerAffiliation || seminar.speakerPosition) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {[seminar.speakerAffiliation, seminar.speakerPosition].filter(Boolean).join(" · ")}
            </p>
          )}
          {seminar.speakerBio && (
            <p className="mt-3 text-sm leading-relaxed">
              {seminar.speakerBio}
            </p>
          )}
        </div>
      </div>

      {speakerSessions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">담당 세션</h3>
          <div className="space-y-2">
            {speakerSessions.map((sess) => (
              <div
                key={sess.id}
                className="flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-2.5 text-sm"
              >
                <div>
                  {sess.category && (
                    <Badge variant="secondary" className="mr-2 text-xs">
                      {sess.category}
                    </Badge>
                  )}
                  <span className="font-medium">{sess.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {sess.time}{sess.endTime ? `~${sess.endTime}` : ""} ({sess.duration}분)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
  return (eh * 60 + em) - (sh * 60 + sm);
}

function SessionsSection({ seminar, isStaff }: { seminar: Seminar; isStaff: boolean }) {
  const { sessions: rawSessions, refetch: refetchSessions } = useSessions(seminar.id);
  const { createSession } = useCreateSession();
  const { updateSession } = useUpdateSession();
  const { deleteSession } = useDeleteSession();
  const [editSession, setEditSession] = useState<EditSessionForm | null>(null);

  // 시간 기준 자동 정렬 — useSessions 훅에서 가져온 데이터 우선, 없으면 세미나 내장 배열
  const sessions = (rawSessions.length > 0 ? rawSessions : seminar.sessions ?? []).sort((a, b) => a.time.localeCompare(b.time));

  function openAdd() {
    setEditSession({
      category: "",
      title: "",
      useSeminarSpeaker: true,
      speaker: seminar.speaker,
      speakerBio: seminar.speakerBio ?? "",
      startTime: "",
      endTime: "",
    });
  }

  function openEdit(sess: SeminarSession) {
    const isSameSpeaker = sess.speaker === seminar.speaker;
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
    if (!editSession.title.trim()) { toast.error("세션 제목을 입력하세요."); return; }
    const speaker = editSession.useSeminarSpeaker ? seminar.speaker : editSession.speaker;
    const speakerBio = editSession.useSeminarSpeaker ? (seminar.speakerBio || undefined) : (editSession.speakerBio || undefined);
    const startTime = editSession.startTime || "";
    const endTime = editSession.endTime || "";
    const duration = calcDuration(startTime, endTime);

    // 순서: 시간 있으면 시간순, 없으면 맨 뒤
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
        await updateSession({ seminarId: seminar.id, sessionId: editSession.sessionId, data });
        toast.success("세션이 수정되었습니다.");
      } else {
        await createSession({ seminarId: seminar.id, data: data as Omit<SeminarSession, "id" | "seminarId"> });
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
      await deleteSession({ seminarId: seminar.id, sessionId });
      await refetchSessions();
      toast.success("세션이 삭제되었습니다.");
    } catch {
      toast.error("세션 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">세션 목록</h3>
        {isStaff && (
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus size={14} className="mr-1" />
            세션 추가
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">등록된 세션이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((sess, idx) => (
            <div
              key={sess.id}
              className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {idx + 1}
                </span>
                <div>
                  {sess.category && (
                    <Badge variant="secondary" className="mb-1 text-xs">
                      {sess.category}
                    </Badge>
                  )}
                  <p className="font-medium">{sess.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sess.speaker}
                    {sess.speakerBio && ` · ${sess.speakerBio}`}
                    {" · "}
                    {sess.time}{sess.endTime ? `~${sess.endTime}` : ""} ({sess.duration}분)
                  </p>
                </div>
              </div>
              {isStaff && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(sess)}>
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(sess.id)}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              )}
            </div>
          ))}
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
                <Input value={editSession.title} onChange={(e) => setEditSession({ ...editSession, title: e.target.value })} />
              </div>
              {/* 발표자 - 세미나 발표자와 동일 체크 */}
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
                        speaker: checked ? seminar.speaker : "",
                        speakerBio: checked ? (seminar.speakerBio ?? "") : "",
                      });
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="font-medium">세미나 발표자와 동일</span>
                  <span className="text-xs text-muted-foreground">({seminar.speaker})</span>
                </label>
                {!editSession.useSeminarSpeaker && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium">발표자</label>
                      <Input value={editSession.speaker} onChange={(e) => setEditSession({ ...editSession, speaker: e.target.value })} />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">발표자 소개</label>
                      <Input value={editSession.speakerBio} onChange={(e) => setEditSession({ ...editSession, speakerBio: e.target.value })} />
                    </div>
                  </div>
                )}
              </div>
              {/* 시간 - 시작/종료 → 자동 길이 계산 */}
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium">시작 시간</label>
                    <Input type="time" value={editSession.startTime} onChange={(e) => setEditSession({ ...editSession, startTime: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">종료 시간</label>
                    <Input type="time" value={editSession.endTime} onChange={(e) => setEditSession({ ...editSession, endTime: e.target.value })} />
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
            <Button variant="outline" onClick={() => setEditSession(null)}>취소</Button>
            <Button onClick={handleSave}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SeminarLMS({ seminarId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const seminar = useSeminar(seminarId);
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const isAttending = user ? (seminar?.attendeeIds ?? []).includes(user.id) : false;
  const hasAccess = isAttending || isStaff;

  if (!seminar) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        세미나를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-3xl px-4">
        <Link
          href={`/seminars/${seminarId}`}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          세미나 상세로 돌아가기
        </Link>

        {/* 미참석자 안내 */}
        {!hasAccess && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle size={18} className="shrink-0" />
            <div>
              <p className="font-medium">참석 신청 후 이용 가능합니다</p>
              <p className="mt-0.5 text-xs text-amber-600">
                세미나에 참석 신청하시면 자료실, 후기 작성 등 모든 기능을 이용하실 수 있습니다.
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border bg-white">
          {/* 탭 네비게이션 */}
          <div className="flex overflow-x-auto border-b">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex flex-none items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  activeTab === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {activeTab === "overview" && <OverviewSection seminar={seminar} />}
            {activeTab === "speaker" && <SpeakerSection seminar={seminar} />}
            {activeTab === "sessions" && <SessionsSection seminar={seminar} isStaff={isStaff} />}
            {activeTab === "materials" && <MaterialsSection seminar={seminar} />}
            {activeTab === "attendee-reviews" && (
              <ReviewsSection seminar={seminar} type="attendee" />
            )}
            {activeTab === "speaker-reviews" && (
              <ReviewsSection seminar={seminar} type="speaker" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

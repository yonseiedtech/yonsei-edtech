"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useSeminar,
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
} from "lucide-react";

const STATUS_STYLES: Record<SeminarStatus, string> = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

type Tab = "overview" | "sessions" | "materials" | "attendee-reviews" | "speaker-reviews";

const TABS: { value: Tab; label: string; icon: React.ReactNode }[] = [
  { value: "overview", label: "개요", icon: <Info size={16} /> },
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

type EditSessionForm = {
  sessionId?: string;
  title: string;
  speaker: string;
  speakerBio: string;
  time: string;
  duration: string;
  order: string;
};

function SessionsSection({ seminar, isStaff }: { seminar: Seminar; isStaff: boolean }) {
  const { createSession } = useCreateSession();
  const { updateSession } = useUpdateSession();
  const { deleteSession } = useDeleteSession();
  const [editSession, setEditSession] = useState<EditSessionForm | null>(null);

  const sessions = (seminar.sessions ?? []).sort((a, b) => a.order - b.order);

  function openAdd() {
    setEditSession({ title: "", speaker: "", speakerBio: "", time: "", duration: "30", order: String(sessions.length + 1) });
  }

  function openEdit(sess: SeminarSession) {
    setEditSession({
      sessionId: sess.id,
      title: sess.title,
      speaker: sess.speaker,
      speakerBio: sess.speakerBio ?? "",
      time: sess.time,
      duration: sess.duration.toString(),
      order: sess.order.toString(),
    });
  }

  function handleSave() {
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
      updateSession({ seminarId: seminar.id, sessionId: editSession.sessionId, data });
      toast.success("세션이 수정되었습니다.");
    } else {
      createSession({ seminarId: seminar.id, data: data as Omit<SeminarSession, "id" | "seminarId"> });
      toast.success("세션이 추가되었습니다.");
    }
    setEditSession(null);
  }

  function handleDelete(sessionId: string) {
    deleteSession({ seminarId: seminar.id, sessionId });
    toast.success("세션이 삭제되었습니다.");
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
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
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
                <label className="mb-1 block text-sm font-medium">세션 제목</label>
                <Input value={editSession.title} onChange={(e) => setEditSession({ ...editSession, title: e.target.value })} />
              </div>
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
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">시간</label>
                  <Input type="time" value={editSession.time} onChange={(e) => setEditSession({ ...editSession, time: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">길이(분)</label>
                  <Input type="number" value={editSession.duration} onChange={(e) => setEditSession({ ...editSession, duration: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">순서</label>
                  <Input type="number" value={editSession.order} onChange={(e) => setEditSession({ ...editSession, order: e.target.value })} />
                </div>
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

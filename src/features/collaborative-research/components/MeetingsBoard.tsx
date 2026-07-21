"use client";

import { useState } from "react";
import { Calendar, Plus, Trash2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/ui/empty-state";
import {
  useMeetings,
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
} from "../api/useCollabPhase2";
import type { CollabResearchMeeting } from "@/types";

interface Props {
  researchId: string;
  currentUserId: string;
  isLeader: boolean;
  isMember: boolean;
}

export default function MeetingsBoard({
  researchId,
  currentUserId,
  isLeader,
  isMember,
}: Props) {
  const { data: meetings = [], isLoading } = useMeetings(researchId);
  const createMut = useCreateMeeting(researchId);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [agenda, setAgenda] = useState("");
  const canCreate = isLeader || isMember;

  const handleCreate = async () => {
    if (!title.trim() || !scheduledAt) return;
    await createMut.mutateAsync({
      researchId,
      scheduledAt: new Date(scheduledAt).toISOString(),
      title: title.trim(),
      agenda: agenda.trim() || undefined,
      attendeeIds: [currentUserId],
      recordedBy: currentUserId,
    });
    setCreating(false);
    setTitle("");
    setScheduledAt("");
    setAgenda("");
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">회의 기록 ({meetings.length})</h2>
        {canCreate && (
          <Button size="sm" onClick={() => setCreating(!creating)}>
            <Plus size={14} className="mr-1" />
            새 회의
          </Button>
        )}
      </div>

      {creating && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">회의 추가</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="mt-title" className="text-xs">제목</Label>
                <Input
                  id="mt-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 1차 변인 정의 회의"
                />
              </div>
              <div>
                <Label htmlFor="mt-at" className="text-xs">일시</Label>
                <Input
                  id="mt-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mt-agenda" className="text-xs">의제 (선택)</Label>
              <Textarea
                id="mt-agenda"
                rows={2}
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setCreating(false)}>취소</Button>
              <Button size="sm" onClick={handleCreate} disabled={createMut.isPending}>
                기록 시작
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="아직 회의 기록이 없습니다"
          description="팀 미팅을 진행한 뒤 의제·회의록·결정사항·후속 액션을 기록하세요."
        />
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              researchId={researchId}
              currentUserId={currentUserId}
              canEdit={canCreate}
              isLeader={isLeader}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingCard({
  meeting,
  researchId,
  currentUserId,
  canEdit,
  isLeader,
}: {
  meeting: CollabResearchMeeting;
  researchId: string;
  currentUserId: string;
  canEdit: boolean;
  isLeader: boolean;
}) {
  const updateMut = useUpdateMeeting(researchId, meeting.id);
  const deleteMut = useDeleteMeeting(researchId);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(meeting.notes ?? "");
  const canEditNotes = canEdit && (meeting.recordedBy === currentUserId || isLeader);

  const save = async () => {
    await updateMut.mutateAsync({ notes });
  };

  const handleDelete = () => {
    if (!confirm(`'${meeting.title}' 회의 기록을 삭제하시겠습니까?`)) return;
    deleteMut.mutate(meeting.id);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="block w-full text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{meeting.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(meeting.scheduledAt).toLocaleString("ko-KR")}
                {meeting.durationMinutes ? ` · ${meeting.durationMinutes}분` : ""}
                · 참석 {meeting.attendeeIds.length}명
              </p>
            </div>
            <span className="text-xs text-muted-foreground">{expanded ? "접기" : "펼치기"}</span>
          </div>
        </button>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-3">
            {meeting.agenda && (
              <div>
                <Label className="text-xs">의제</Label>
                <p className="whitespace-pre-wrap rounded bg-muted/5 p-2 text-sm">
                  {meeting.agenda}
                </p>
              </div>
            )}
            <div>
              <Label className="text-xs">회의록 (markdown)</Label>
              <Textarea
                rows={6}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!canEditNotes}
                placeholder="논의된 내용을 기록하세요"
              />
            </div>
            {canEditNotes && (
              <div className="flex justify-between">
                {isLeader ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} className="mr-1" />
                    삭제
                  </Button>
                ) : <div />}
                <Button
                  type="button"
                  size="sm"
                  onClick={save}
                  disabled={updateMut.isPending}
                >
                  <Save size={14} className="mr-1" />
                  저장
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

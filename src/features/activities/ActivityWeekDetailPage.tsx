"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { activitiesApi, activityProgressApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Activity, ActivityProgress, ActivityProgressMode } from "@/types";
import { ACTIVITY_PROGRESS_MODE_LABELS } from "@/types";

const STATUS_LABELS: Record<ActivityProgress["status"], string> = {
  planned: "예정",
  in_progress: "진행중",
  completed: "완료",
};
const STATUS_BG: Record<ActivityProgress["status"], string> = {
  planned: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

interface Props {
  activityId: string;
  weekNumber: number;
  weeksHref: string;
  detailHref: string;
  typeLabel: string;
}

export default function ActivityWeekDetailPage({
  activityId,
  weekNumber,
  weeksHref,
  detailHref,
  typeLabel,
}: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const queryClient = useQueryClient();

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => (await activitiesApi.get(activityId)) as Activity,
  });

  const { data: progressList = [], isLoading } = useQuery({
    queryKey: ["activity-progress", activityId],
    queryFn: async () => {
      const res = await activityProgressApi.list(activityId);
      return ((res.data ?? []) as ActivityProgress[]).sort(
        (a, b) => (a.week ?? 0) - (b.week ?? 0),
      );
    },
  });

  const week = progressList[weekNumber - 1];
  const prevWeek = weekNumber > 1 ? weekNumber - 1 : null;
  const nextWeek = weekNumber < progressList.length ? weekNumber + 1 : null;

  const isLeader = !!user && activity?.leaderId === user.id;
  const canEdit = isStaff || isLeader;

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editMode, setEditMode] = useState<ActivityProgressMode>("in_person");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (week) {
      setEditTitle(week.title);
      setEditDescription(week.description ?? "");
      setEditDate(week.date);
      setEditStart(week.startTime ?? "");
      setEditEnd(week.endTime ?? "");
      setEditMode(week.mode ?? "in_person");
    }
  }, [week]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (!activity || !week) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 px-4 py-12 text-center text-sm text-muted-foreground">
        <p>해당 주차를 찾을 수 없습니다.</p>
        <Link
          href={weeksHref}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> 주차 목록으로
        </Link>
      </div>
    );
  }

  async function handleSave() {
    if (!week) return;
    if (!editTitle.trim()) {
      toast.error("활동 내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await activityProgressApi.update(week.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        date: editDate,
        startTime: editStart || null,
        endTime: editEnd || null,
        mode: editMode,
      });
      await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
      toast.success("저장되었습니다.");
      setEditing(false);
    } catch (e) {
      console.error("[week/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(next: ActivityProgress["status"]) {
    if (!week) return;
    try {
      await activityProgressApi.update(week.id, { status: next });
      await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
      toast.success("상태가 변경되었습니다.");
    } catch (e) {
      console.error("[week/status]", e);
      toast.error(e instanceof Error ? `상태 변경 실패: ${e.message}` : "상태 변경 실패");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={weeksHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 주차 목록
        </Link>
        <Link href={detailHref} className="text-xs text-muted-foreground hover:text-foreground">
          {typeLabel} 상세 →
        </Link>
      </div>

      <Card className="border-primary/20">
        <CardContent className="space-y-3 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-primary text-xs font-bold text-primary-foreground">
              Week {weekNumber}
            </Badge>
            <Badge variant="outline" className={cn("text-[11px]", STATUS_BG[week.status])}>
              {week.status === "completed" ? (
                <CheckCircle2 size={11} className="mr-0.5" />
              ) : (
                <Circle size={11} className="mr-0.5" />
              )}
              {STATUS_LABELS[week.status]}
            </Badge>
            {week.mode && (
              <Badge variant="secondary" className="text-[10px]">
                {ACTIVITY_PROGRESS_MODE_LABELS[week.mode]}
              </Badge>
            )}
            <Link href={detailHref} className="text-xs text-muted-foreground hover:underline">
              {activity.title}
            </Link>
          </div>

          {!editing ? (
            <>
              <h1 className="text-xl font-bold leading-tight text-foreground">{week.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {week.date}
                </span>
                {(week.startTime || week.endTime) && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {week.startTime}
                    {week.startTime && week.endTime ? " ~ " : ""}
                    {week.endTime}
                  </span>
                )}
              </div>
              {week.description && (
                <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-foreground">
                  {week.description}
                </p>
              )}
              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                    <Pencil size={12} className="mr-1" /> 편집
                  </Button>
                  {(["planned", "in_progress", "completed"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={week.status === s ? "default" : "outline"}
                      onClick={() => handleStatusChange(s)}
                      disabled={week.status === s}
                    >
                      {STATUS_LABELS[s]}로 변경
                    </Button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">활동 내용 *</label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">상세 메모</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={5}
                  placeholder="이번 주차의 진행 내용, 결정 사항, 다음 주 준비 등을 기록하세요."
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">날짜</label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">시작</label>
                  <Input type="time" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">종료</label>
                  <Input type="time" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">방법</label>
                  <select
                    value={editMode}
                    onChange={(e) => setEditMode(e.target.value as ActivityProgressMode)}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                  >
                    <option value="in_person">대면</option>
                    <option value="zoom">ZOOM</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                  <X size={12} className="mr-1" /> 취소
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !editTitle.trim()}>
                  {saving ? <Loader2 size={12} className="mr-1 animate-spin" /> : <Save size={12} className="mr-1" />}
                  저장
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-2">
        {prevWeek ? (
          <Link href={`${weeksHref}/${prevWeek}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft size={14} /> Week {prevWeek}
            </Button>
          </Link>
        ) : (
          <span />
        )}
        {nextWeek ? (
          <Link href={`${weeksHref}/${nextWeek}`}>
            <Button variant="outline" size="sm" className="gap-1">
              Week {nextWeek} <ChevronRight size={14} />
            </Button>
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Loader2,
  Paperclip,
  Plus,
  Users,
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
import { todayYmdLocal } from "@/lib/dday";
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
  detailHref: string;
  backHref: string;
  backLabel: string;
  typeLabel: string;
}

export default function ActivityWeeksPage({
  activityId,
  detailHref,
  backHref,
  backLabel,
  typeLabel,
}: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const queryClient = useQueryClient();

  const { data: activity, isLoading: actLoading } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => (await activitiesApi.get(activityId)) as Activity,
  });

  const { data: progressList = [], isLoading: progLoading } = useQuery({
    queryKey: ["activity-progress", activityId],
    queryFn: async () => {
      const res = await activityProgressApi.list(activityId);
      return ((res.data ?? []) as ActivityProgress[]).sort(
        (a, b) => (a.week ?? 0) - (b.week ?? 0),
      );
    },
  });

  const isLeader = !!user && activity?.leaderId === user.id;
  const canEdit = isStaff || isLeader;

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newMode, setNewMode] = useState<ActivityProgressMode>("in_person");
  const [adding, setAdding] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState("");
  const [bulkCount, setBulkCount] = useState(8);
  const [bulkStart, setBulkStart] = useState("19:00");
  const [bulkEnd, setBulkEnd] = useState("21:00");
  const [bulkMode, setBulkMode] = useState<ActivityProgressMode>("in_person");
  const [bulking, setBulking] = useState(false);

  const todayStr = todayYmdLocal();

  const totalWeeks = progressList.length;
  const completedWeeks = progressList.filter((p) => p.status === "completed").length;
  const pct = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const nextWeek = progressList.reduce((max, p) => Math.max(max, p.week ?? 0), 0) + 1;
      await activityProgressApi.create({
        activityId,
        week: nextWeek,
        date: newDate || todayYmdLocal(),
        startTime: newStart || undefined,
        endTime: newEnd || undefined,
        mode: newMode,
        title: newTitle.trim(),
        status: "planned",
      });
      await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
      setNewTitle("");
      setNewDate("");
      setNewStart("");
      setNewEnd("");
      setNewMode("in_person");
      toast.success(`Week ${nextWeek} 추가되었습니다.`);
    } catch (e) {
      console.error("[weeks/add]", e);
      toast.error(e instanceof Error ? `추가 실패: ${e.message}` : "추가 실패");
    } finally {
      setAdding(false);
    }
  }

  async function handleBulkGenerate() {
    if (!bulkStartDate) {
      toast.error("시작 날짜를 선택하세요.");
      return;
    }
    if (bulkCount < 1 || bulkCount > 30) {
      toast.error("주차 수는 1~30 사이여야 합니다.");
      return;
    }
    setBulking(true);
    try {
      const startMax = progressList.reduce((max, p) => Math.max(max, p.week ?? 0), 0);
      const start = new Date(bulkStartDate + "T00:00:00");
      let created = 0;
      for (let i = 0; i < bulkCount; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const week = startMax + i + 1;
        await activityProgressApi.create({
          activityId,
          week,
          date: dateStr,
          startTime: bulkStart || undefined,
          endTime: bulkEnd || undefined,
          mode: bulkMode,
          title: `Week ${week}`,
          status: "planned",
        });
        created += 1;
      }
      await queryClient.invalidateQueries({ queryKey: ["activity-progress", activityId] });
      toast.success(`${created}개 주차가 생성되었습니다.`);
      setBulkOpen(false);
      setBulkStartDate("");
    } catch (e) {
      console.error("[weeks/bulk]", e);
      toast.error(e instanceof Error ? `일괄 생성 실패: ${e.message}` : "일괄 생성 실패");
    } finally {
      setBulking(false);
    }
  }

  if (actLoading || progLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 불러오는 중…
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-sm text-muted-foreground">
        활동을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {typeLabel} 상세로
        </Link>
        <Link href={backHref} className="text-xs text-muted-foreground hover:text-foreground">
          {backLabel} →
        </Link>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="space-y-3 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-white text-xs">
              {typeLabel}
            </Badge>
            <h1 className="text-xl font-bold text-foreground">{activity.title} · 주차별 진행</h1>
          </div>
          {activity.description && (
            <p className="text-sm text-muted-foreground">{activity.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {activity.date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {activity.date}
                {activity.endDate ? ` ~ ${activity.endDate}` : ""}
              </span>
            )}
            {activity.leader && (
              <span>
                {typeLabel === "스터디" ? "모임장" : "담당자"}: {activity.leader}
              </span>
            )}
          </div>
          {totalWeeks > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">전체 진행률</span>
                <span className="text-muted-foreground">
                  {completedWeeks}/{totalWeeks}주차 완료 ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    pct === 100 ? "bg-green-500" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-1">
                <Plus size={14} />
                새 주차 추가
              </h3>
              <Button
                size="sm"
                variant={bulkOpen ? "default" : "outline"}
                onClick={() => setBulkOpen((v) => !v)}
              >
                {bulkOpen ? "단일 추가로 전환" : "일괄 생성 (N주)"}
              </Button>
            </div>
            {bulkOpen && (
              <div className="space-y-3 rounded-lg border bg-primary/5 p-3">
                <p className="text-[11px] text-muted-foreground">
                  시작 날짜부터 매주 같은 요일·시간에 N개의 빈 주차를 생성합니다.
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">시작 날짜</label>
                    <Input type="date" value={bulkStartDate} onChange={(e) => setBulkStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">주차 수 (1~30)</label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={bulkCount}
                      onChange={(e) => setBulkCount(Number.parseInt(e.target.value, 10) || 1)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">시작</label>
                    <Input type="time" value={bulkStart} onChange={(e) => setBulkStart(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">종료</label>
                    <Input type="time" value={bulkEnd} onChange={(e) => setBulkEnd(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">방법</label>
                    <select
                      value={bulkMode}
                      onChange={(e) => setBulkMode(e.target.value as ActivityProgressMode)}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                    >
                      <option value="in_person">대면</option>
                      <option value="zoom">ZOOM</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" disabled={!bulkStartDate || bulking} onClick={handleBulkGenerate}>
                    {bulking ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                    {bulkCount}주차 생성
                  </Button>
                </div>
              </div>
            )}
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="활동 내용 (예: Ch.3 기능주의 발제)"
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">날짜</label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">시작</label>
                <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">종료</label>
                <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-muted-foreground">방법</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as ActivityProgressMode)}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                >
                  <option value="in_person">대면</option>
                  <option value="zoom">ZOOM</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" disabled={!newTitle.trim() || adding} onClick={handleAdd}>
                {adding ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                추가
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {progressList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            아직 등록된 주차가 없습니다.
            {canEdit && " 위에서 추가하세요."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {progressList.map((p, idx) => {
            const displayWeek = idx + 1;
            const href = `${detailHref}/weeks/${displayWeek}`;
            const isToday = p.date === todayStr;
            return (
              <Link key={p.id} href={href}>
                <Card
                  className={cn(
                    "h-full border-2 transition hover:shadow-md",
                    isToday
                      ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                      : p.status === "completed"
                        ? "border-emerald-200 bg-emerald-50/40"
                        : p.status === "in_progress"
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-border",
                  )}
                >
                  <CardContent className="space-y-2 py-4">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="bg-white text-xs font-bold">
                          Week {displayWeek}
                        </Badge>
                        {isToday && (
                          <Badge variant="default" className="bg-primary text-[10px] text-primary-foreground">
                            오늘
                          </Badge>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", STATUS_BG[p.status])}
                      >
                        {p.status === "completed" ? (
                          <CheckCircle2 size={10} className="mr-0.5" />
                        ) : (
                          <Circle size={10} className="mr-0.5" />
                        )}
                        {STATUS_LABELS[p.status]}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                      {p.title}
                    </p>
                    {p.description && (
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{p.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Calendar size={10} />
                        {p.date}
                      </span>
                      {(p.startTime || p.endTime) && (
                        <span className="flex items-center gap-0.5">
                          <Clock size={10} />
                          {p.startTime}
                          {p.startTime && p.endTime ? "~" : ""}
                          {p.endTime}
                        </span>
                      )}
                      {p.mode && <Badge variant="secondary" className="text-[9px]">{ACTIVITY_PROGRESS_MODE_LABELS[p.mode]}</Badge>}
                      {((p.attendedUserIds as string[] | undefined)?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-50 px-1 py-0.5 text-emerald-700">
                          <Users size={9} />
                          {(p.attendedUserIds as string[]).length}
                        </span>
                      )}
                      {((p.materials as ActivityProgress["materials"])?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 rounded bg-blue-50 px-1 py-0.5 text-blue-700">
                          <Paperclip size={9} />
                          {(p.materials as ActivityProgress["materials"])!.length}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end pt-1 text-[11px] font-medium text-primary">
                      열기 <ChevronRight size={12} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

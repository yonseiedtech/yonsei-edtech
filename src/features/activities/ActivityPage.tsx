"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activitiesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import PageHeader from "@/components/ui/page-header";
import { Calendar, MapPin, Users, User, Plus, Pencil, Trash2, Loader2, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType } from "@/types";

const STATUS_LABELS: Record<string, string> = { upcoming: "예정", ongoing: "진행 중", completed: "완료" };
const STATUS_COLORS: Record<string, string> = { upcoming: "bg-blue-50 text-blue-700", ongoing: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };

interface FormData {
  title: string; description: string; date: string; endDate: string;
  status: "upcoming" | "ongoing" | "completed";
  leader: string; location: string; tags: string;
}
const emptyForm: FormData = { title: "", description: "", date: "", endDate: "", status: "upcoming", leader: "", location: "", tags: "" };

interface Props {
  type: ActivityType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}

export default function ActivityPage({ type, icon, title, subtitle, color }: Props) {
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const queryClient = useQueryClient();

  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", type],
    queryFn: async () => { const res = await activitiesApi.list(type); return res.data; },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        type, title: form.title.trim(), description: form.description.trim(),
        date: form.date, endDate: form.endDate || undefined, status: form.status,
        leader: form.leader.trim() || undefined, location: form.location.trim() || undefined,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        participants: editId ? undefined : [], // 신규 생성 시 빈 참여자 배열
        createdBy: user?.id || "",
      };
      if (editId) await activitiesApi.update(editId, data);
      else await activitiesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", type] });
      toast.success(editId ? "수정되었습니다." : "등록되었습니다.");
      closeDialog();
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activitiesApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities", type] }); toast.success("삭제되었습니다."); },
  });

  // 참여 신청
  const joinMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) return;
      const activity = activities.find((a) => a.id === activityId);
      const participants = (activity?.participants as string[] | undefined) ?? [];
      if (participants.includes(user.id)) { toast.error("이미 참여 신청되었습니다."); return; }
      await activitiesApi.update(activityId, { participants: [...participants, user.id] });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities", type] }); toast.success("참여 신청이 완료되었습니다."); },
  });

  const leaveMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) return;
      const activity = activities.find((a) => a.id === activityId);
      const participants = (activity?.participants as string[] | undefined) ?? [];
      await activitiesApi.update(activityId, { participants: participants.filter((p) => p !== user.id) });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities", type] }); toast.success("참여가 취소되었습니다."); },
  });

  function openCreate() { setEditId(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(a: Activity) {
    setEditId(a.id);
    setForm({ title: a.title, description: a.description, date: a.date, endDate: a.endDate || "", status: a.status, leader: a.leader || "", location: a.location || "", tags: a.tags?.join(", ") || "" });
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); setEditId(null); setForm(emptyForm); }

  const ongoing = activities.filter((a) => a.status === "ongoing" || a.status === "upcoming");
  const completed = activities.filter((a) => a.status === "completed");

  function ActivityCard({ a }: { a: Activity }) {
    const participants = (a.participants as string[] | undefined) ?? [];
    const isJoined = user ? participants.includes(user.id) : false;
    const canJoin = user && !isJoined && (a.status === "upcoming" || a.status === "ongoing");

    return (
      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[a.status])}>{STATUS_LABELS[a.status]}</Badge>
              <h3 className="text-lg font-semibold">{a.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar size={12} />{a.date}{a.endDate ? ` ~ ${a.endDate}` : ""}</span>
              {a.leader && <span className="flex items-center gap-1"><User size={12} />{a.leader}</span>}
              {a.location && <span className="flex items-center gap-1"><MapPin size={12} />{a.location}</span>}
              <span className="flex items-center gap-1"><Users size={12} />참여 {participants.length}명</span>
            </div>
            {a.tags && a.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
              </div>
            )}
          </div>
          <div className="flex shrink-0 gap-1 self-end sm:self-start">
            {canJoin && (
              <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => joinMutation.mutate(a.id)} disabled={joinMutation.isPending}>
                <UserPlus size={12} />참여 신청
              </Button>
            )}
            {isJoined && (
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs text-green-600" onClick={() => leaveMutation.mutate(a.id)} disabled={leaveMutation.isPending}>
                <Check size={12} />참여 중
              </Button>
            )}
            {isStaff && (
              <>
                <Button variant="outline" size="sm" className="h-8" onClick={() => openEdit(a)}><Pencil size={12} /></Button>
                <Button variant="outline" size="sm" className="h-8 text-destructive" onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate(a.id); }}><Trash2 size={12} /></Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <PageHeader
          icon={icon}
          title={title}
          description={subtitle}
          actions={isStaff ? (
            <Button size="sm" onClick={openCreate}><Plus size={14} className="mr-1" />{title} 등록</Button>
          ) : undefined}
        />

        {/* 진행 중 / 예정 */}
        {ongoing.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold">진행 중 & 예정</h2>
            <div className="mt-4 space-y-3">{ongoing.map((a) => <ActivityCard key={a.id} a={a} />)}</div>
          </div>
        )}

        {/* 완료 */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">활동 내역</h2>
          {completed.length === 0 && ongoing.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">등록된 활동이 없습니다.</p>
          ) : completed.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">완료된 활동이 없습니다.</p>
          ) : (
            <div className="mt-4 space-y-3">{completed.map((a) => <ActivityCard key={a.id} a={a} />)}</div>
          )}
        </div>

        {/* 등록/수정 Dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editId ? `${title} 수정` : `${title} 등록`}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">제목 *</label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="활동 제목" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">설명</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="활동에 대한 설명" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium">시작일</label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div><label className="mb-1 block text-sm font-medium">종료일</label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium">상태</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormData["status"] })} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="upcoming">예정</option><option value="ongoing">진행 중</option><option value="completed">완료</option>
                  </select>
                </div>
                <div><label className="mb-1 block text-sm font-medium">장소</label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="예: 교육과학관 606호" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium">담당자</label><Input value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })} placeholder="예: 김대경" /></div>
              <div><label className="mb-1 block text-sm font-medium">태그 (쉼표 구분)</label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="예: AI교육, UX리서치" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>취소</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title.trim()}>
                {saveMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}{editId ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { auth } from "@/lib/firebase";
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
import Link from "next/link";
import PageHeader from "@/components/ui/page-header";
import { Calendar, MapPin, Users, User, Plus, Pencil, Trash2, Loader2, UserPlus, Check, Megaphone } from "lucide-react";
import { postsApi } from "@/lib/bkend";

const RECRUIT_LABELS: Record<string, string> = { recruiting: "모집중", closed: "모집마감", in_progress: "진행중", completed: "완료" };
const RECRUIT_COLORS: Record<string, string> = { recruiting: "bg-green-50 text-green-700", closed: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType } from "@/types";

async function apiFetch(url: string, options?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options?.headers } });
}

const STATUS_LABELS: Record<string, string> = { upcoming: "예정", ongoing: "진행 중", completed: "완료" };
const STATUS_COLORS: Record<string, string> = { upcoming: "bg-blue-50 text-blue-700", ongoing: "bg-amber-50 text-amber-700", completed: "bg-muted text-muted-foreground" };

interface FormData {
  title: string; description: string; detailContent: string; date: string; endDate: string;
  status: "upcoming" | "ongoing" | "completed";
  recruitmentStatus: string; maxParticipants: string;
  leader: string; location: string; tags: string;
  organizerName: string; conferenceUrl: string;
}
const emptyForm: FormData = { title: "", description: "", detailContent: "", date: "", endDate: "", status: "upcoming", recruitmentStatus: "recruiting", maxParticipants: "", leader: "", location: "", tags: "", organizerName: "", conferenceUrl: "" };

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
  const [autoPost, setAutoPost] = useState(false);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", type],
    queryFn: async () => {
      const res = await fetch(`/api/activities?type=${type}`);
      const json = await res.json();
      return (json.data ?? []) as Activity[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        type, title: form.title.trim(), description: form.description.trim(),
        detailContent: form.detailContent.trim() || undefined,
        date: form.date, endDate: form.endDate || undefined, status: form.status,
        recruitmentStatus: form.recruitmentStatus || "recruiting",
        maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
        leader: form.leader.trim() || undefined, location: form.location.trim() || undefined,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        organizerName: form.organizerName.trim() || undefined,
        conferenceUrl: form.conferenceUrl.trim() || undefined,
        participants: editId ? undefined : [],
        applicants: editId ? undefined : [],
        createdBy: user?.id || "",
      };
      if (editId) {
        const res = await apiFetch("/api/activities", { method: "PATCH", body: JSON.stringify({ id: editId, ...data }) });
        if (!res.ok) throw new Error("수정 실패");
      } else {
        const res = await apiFetch("/api/activities", { method: "POST", body: JSON.stringify(data) });
        if (!res.ok) throw new Error("생성 실패");

        // 게시판 자동 공고 등록
        if (autoPost && user) {
          const typeLabel = type === "project" ? "프로젝트" : type === "study" ? "스터디" : "대외 학술대회";
          const dateInfo = form.date ? `\n📅 기간: ${form.date}${form.endDate ? ` ~ ${form.endDate}` : ""}` : "";
          const locationInfo = form.location ? `\n📍 장소: ${form.location}` : "";
          const maxInfo = form.maxParticipants ? `\n👥 정원: ${form.maxParticipants}명` : "";
          try {
            await postsApi.create({
              title: `[모집] ${form.title.trim()}`,
              content: `${typeLabel} 모집 안내입니다.\n\n${form.description.trim()}${dateInfo}${locationInfo}${maxInfo}\n\n자세한 내용은 학술활동 페이지에서 확인해 주세요.`,
              category: "free",
              authorId: user.id,
              authorName: user.name,
              viewCount: 0,
            });
          } catch (e) { console.error("[auto-post] 게시글 등록 실패:", e); }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", type] });
      toast.success(editId ? "수정되었습니다." : (autoPost ? "등록 및 게시판 공고가 작성되었습니다." : "등록되었습니다."));
      closeDialog();
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/activities?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("삭제 실패");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities", type] }); toast.success("삭제되었습니다."); },
  });

  // 참여 신청 (atomic arrayUnion)
  const joinMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) return;
      const activity = activities.find((a) => a.id === activityId);
      if (!activity) { toast.error("활동을 찾을 수 없습니다."); return; }
      const participants = (activity.participants as string[] | undefined) ?? [];
      if (participants.includes(user.id)) { toast.error("이미 참여 신청되었습니다."); return; }
      const res = await apiFetch("/api/activities", { method: "PATCH", body: JSON.stringify({ id: activityId, joinUserId: user.id }) });
      if (!res.ok) throw new Error("참여 실패");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities", type] }); toast.success("참여 신청이 완료되었습니다."); },
  });

  const leaveMutation = useMutation({
    mutationFn: async (activityId: string) => {
      if (!user) return;
      const res = await apiFetch("/api/activities", { method: "PATCH", body: JSON.stringify({ id: activityId, leaveUserId: user.id }) });
      if (!res.ok) throw new Error("취소 실패");
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["activities", type] }); toast.success("참여가 취소되었습니다."); },
  });

  function openCreate() { setEditId(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(a: Activity) {
    setEditId(a.id);
    setForm({ title: a.title, description: a.description, detailContent: a.detailContent || "", date: a.date, endDate: a.endDate || "", status: a.status, recruitmentStatus: a.recruitmentStatus || "recruiting", maxParticipants: a.maxParticipants ? String(a.maxParticipants) : "", leader: a.leader || "", location: a.location || "", tags: a.tags?.join(", ") || "", organizerName: a.organizerName || "", conferenceUrl: a.conferenceUrl || "" });
    setDialogOpen(true);
  }
  function closeDialog() { setDialogOpen(false); setEditId(null); setForm(emptyForm); setAutoPost(false); }

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
              {a.recruitmentStatus && <Badge variant="secondary" className={cn("text-xs", RECRUIT_COLORS[a.recruitmentStatus])}>{RECRUIT_LABELS[a.recruitmentStatus]}</Badge>}
              <Link href={`/activities/${type === "project" ? "projects" : type === "study" ? "studies" : "external"}/${a.id}`} className="text-lg font-semibold hover:text-primary hover:underline">{a.title}</Link>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><label className="mb-1 block text-sm font-medium">모집 상태</label>
                  <select value={form.recruitmentStatus} onChange={(e) => setForm({ ...form, recruitmentStatus: e.target.value })} className="w-full rounded-lg border px-3 py-2 text-sm">
                    <option value="recruiting">모집중</option><option value="closed">모집마감</option><option value="in_progress">진행중</option><option value="completed">완료</option>
                  </select>
                </div>
                <div><label className="mb-1 block text-sm font-medium">정원</label><Input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} placeholder="미입력 시 제한 없음" /></div>
              </div>
              <div><label className="mb-1 block text-sm font-medium">담당자</label><Input value={form.leader} onChange={(e) => setForm({ ...form, leader: e.target.value })} placeholder="예: 김대경" /></div>
              <div><label className="mb-1 block text-sm font-medium">상세 내용</label>
                <textarea value={form.detailContent} onChange={(e) => setForm({ ...form, detailContent: e.target.value })} rows={4} placeholder="세부 진행 방법, 커리큘럼, 참여 조건 등" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
              </div>
              {type === "external" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div><label className="mb-1 block text-sm font-medium">주최 기관</label><Input value={form.organizerName} onChange={(e) => setForm({ ...form, organizerName: e.target.value })} placeholder="예: 한국교육공학회" /></div>
                  <div><label className="mb-1 block text-sm font-medium">학회 URL</label><Input value={form.conferenceUrl} onChange={(e) => setForm({ ...form, conferenceUrl: e.target.value })} placeholder="https://..." /></div>
                </div>
              )}
              <div><label className="mb-1 block text-sm font-medium">태그 (쉼표 구분)</label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="예: AI교육, UX리서치" /></div>
              {!editId && (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
                  <input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                  <Megaphone size={14} className="text-primary" />
                  <span className="text-sm">게시판에 모집 공고 자동 등록</span>
                </label>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>취소</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title.trim() || !form.date || !form.description.trim()}>
                {saveMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}{editId ? "수정" : "등록"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

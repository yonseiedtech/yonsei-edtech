"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { activitiesApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Plus, Pencil, Trash2, Loader2, Calendar, Globe, FolderKanban, BookOpen, LayoutDashboard, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType } from "@/types";
import { formatSemester, type Semester } from "@/lib/semester";
import MemberAutocomplete from "@/components/ui/MemberAutocomplete";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

const STATUS_LABELS: Record<string, string> = {
  upcoming: "예정",
  ongoing: "진행 중",
  completed: "완료",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "bg-blue-50 text-blue-700",
  ongoing: "bg-amber-50 text-amber-700",
  completed: "bg-muted text-muted-foreground",
};

interface Props {
  type: ActivityType;
  typeLabel: string;
  icon?: LucideIcon;
  description?: string;
}

const TYPE_DEFAULTS: Record<ActivityType, { icon: LucideIcon; description: string }> = {
  external: { icon: Globe, description: "회원의 대외 학회·공모전·발표 등 외부 학술활동을 등록하고 관리합니다." },
  project: { icon: FolderKanban, description: "학회 연구 프로젝트와 협업 과제의 진행 상황을 관리합니다." },
  study: { icon: BookOpen, description: "학회 스터디 모임의 일정과 참여자를 관리합니다." },
};

const TYPE_TO_PATH: Record<ActivityType, string> = {
  study: "studies",
  project: "projects",
  external: "external",
};

interface FormData {
  title: string;
  description: string;
  date: string;
  endDate: string;
  status: "upcoming" | "ongoing" | "completed";
  leader: string;
  /** PR7: 스터디 모임장 회원 ID (자동완성 선택값) */
  leaderId: string;
  members: string;
  location: string;
  tags: string;
  /** 학기 연도 — 빈 문자열 = 미지정 */
  year: string;
  /** 학기 — "" | "first" | "second" */
  semester: "" | Semester;
}

const emptyForm: FormData = {
  title: "",
  description: "",
  date: "",
  endDate: "",
  status: "upcoming",
  leader: "",
  leaderId: "",
  members: "",
  location: "",
  tags: "",
  year: "",
  semester: "",
};

export default function ActivityList({ type, typeLabel, icon, description }: Props) {
  const resolvedIcon = icon ?? TYPE_DEFAULTS[type].icon;
  const resolvedDescription = description ?? TYPE_DEFAULTS[type].description;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: activities = [] } = useQuery({
    queryKey: ["activities", type],
    queryFn: async () => {
      const res = await activitiesApi.list(type);
      return res.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        type,
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        endDate: form.endDate || undefined,
        status: form.status,
        leader: form.leader.trim() || undefined,
        leaderId: form.leaderId || undefined,
        members: form.members ? form.members.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        location: form.location.trim() || undefined,
        tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        year: form.year ? Number(form.year) : undefined,
        semester: form.semester || undefined,
        createdBy: user?.id || "",
      };
      if (editId) {
        await activitiesApi.update(editId, data);
      } else {
        await activitiesApi.create(data);
      }
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", type] });
      toast.success("삭제되었습니다.");
    },
  });

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(a: Activity) {
    setEditId(a.id);
    setForm({
      title: a.title,
      description: a.description,
      date: a.date,
      endDate: a.endDate || "",
      status: a.status,
      leader: a.leader || "",
      leaderId: a.leaderId || "",
      members: a.members?.join(", ") || "",
      location: a.location || "",
      tags: a.tags?.join(", ") || "",
      year: a.year ? String(a.year) : "",
      semester: a.semester || "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={resolvedIcon}
        title={`${typeLabel} 관리`}
        description={resolvedDescription}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" />
            {typeLabel} 등록
          </Button>
        }
      />

      {activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">등록된 {typeLabel}이(가) 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {activities.map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[a.status])}>
                      {STATUS_LABELS[a.status]}
                    </Badge>
                    <h3 className="font-medium">{a.title}</h3>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{a.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar size={12} />{a.date}{a.endDate ? ` ~ ${a.endDate}` : ""}</span>
                    {(a.year || a.semester) && (
                      <Badge variant="secondary" className="bg-blue-50 text-[10px] text-blue-700">
                        {formatSemester(a.year, a.semester)}
                      </Badge>
                    )}
                    {a.leader && <span>{type === "study" ? "모임장" : "담당"}: {a.leader}</span>}
                    {a.location && <span>{a.location}</span>}
                  </div>
                  {a.tags && a.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {a.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-1 self-end sm:self-start">
                  <Link
                    href={`/console/academic/${TYPE_TO_PATH[type]}/${a.id}`}
                    title="운영 페이지 열기"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-7 gap-1 text-xs")}
                  >
                    <LayoutDashboard size={12} />
                    <span className="hidden sm:inline">운영</span>
                  </Link>
                  <Button variant="outline" size="sm" className="h-7" onClick={() => openEdit(a)} title="기본 정보 수정">
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-destructive"
                    onClick={() => { if (confirm("삭제하시겠습니까?")) deleteMutation.mutate(a.id); }}
                    title="삭제"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? `${typeLabel} 수정` : `${typeLabel} 등록`}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">제목 *</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="활동 제목" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">설명</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="활동에 대한 설명"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">시작일</label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">종료일</label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">학기 연도</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={2000}
                  max={2100}
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                  placeholder="예: 2026 (선택)"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">학기</label>
                <select
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: e.target.value as FormData["semester"] })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">미지정</option>
                  <option value="first">전기</option>
                  <option value="second">후기</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">상태</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as FormData["status"] })}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="upcoming">예정</option>
                  <option value="ongoing">진행 중</option>
                  <option value="completed">완료</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">장소</label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="예: 교육과학관 606호" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{type === "study" ? "모임장" : "담당자"}</label>
              <MemberAutocomplete
                value={form.leaderId}
                displayName={form.leaderId ? form.leader : undefined}
                onSelect={(m) => setForm({ ...form, leaderId: m.id, leader: m.name })}
                onClear={() => setForm({ ...form, leaderId: "", leader: "" })}
                placeholder="회원 이름 또는 학번을 입력하세요"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                회원 검색으로 선택하면 운영 페이지·프로필에서 자동 연동됩니다.
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">참여자 (쉼표 구분)</label>
              <Input value={form.members} onChange={(e) => setForm({ ...form, members: e.target.value })} placeholder="예: 홍길동, 김철수, 이영희" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">태그 (쉼표 구분)</label>
              <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="예: AI교육, UX리서치" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>취소</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title.trim()}>
              {saveMutation.isPending && <Loader2 size={14} className="mr-1 animate-spin" />}
              {editId ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import AuthGuard from "@/features/auth/AuthGuard";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  classSessionsApi,
  courseOfferingsApi,
} from "@/lib/bkend";
import {
  CLASS_SESSION_MODE_LABELS,
  type ClassSession,
  type ClassSessionMode,
  type CourseOffering,
} from "@/types";
import PageHeader from "@/components/ui/page-header";
import LoadingSpinner from "@/components/ui/loading-spinner";
import EmptyState from "@/components/ui/empty-state";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MODE_OPTIONS: ClassSessionMode[] = [
  "in_person",
  "zoom",
  "assignment",
  "cancelled",
  "field",
  "exam",
];

const MODE_COLORS: Record<ClassSessionMode, string> = {
  in_person: "bg-emerald-50 text-emerald-700 border-emerald-200",
  zoom: "bg-blue-50 text-blue-700 border-blue-200",
  assignment: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  field: "bg-purple-50 text-purple-700 border-purple-200",
  exam: "bg-rose-50 text-rose-700 border-rose-200",
};

interface SessionDraft {
  id?: string;
  date: string;
  mode: ClassSessionMode;
  link: string;
  notes: string;
}

const blankDraft = (date?: string): SessionDraft => ({
  date: date ?? new Date().toISOString().slice(0, 10),
  mode: "in_person",
  link: "",
  notes: "",
});

function ScheduleContent({ courseId }: { courseId: string }) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SessionDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["course-offering", courseId],
    queryFn: async () => {
      const res = await courseOfferingsApi.get(courseId);
      return res as unknown as CourseOffering;
    },
  });

  const { data: sessionsRes, isLoading: loadingSessions } = useQuery({
    queryKey: ["class-sessions", "by-course", courseId],
    queryFn: () => classSessionsApi.listByCourse(courseId),
  });
  const sessions: ClassSession[] = (sessionsRes?.data ?? []).slice().sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  async function save() {
    if (!draft || !user) return;
    if (!draft.date) {
      toast.error("날짜를 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        courseOfferingId: courseId,
        date: draft.date,
        mode: draft.mode,
        link: draft.link.trim() || undefined,
        notes: draft.notes.trim() || undefined,
      };
      if (draft.id) {
        await classSessionsApi.update(draft.id, payload);
      } else {
        await classSessionsApi.create({ ...payload, createdBy: user.id });
      }
      await qc.invalidateQueries({
        queryKey: ["class-sessions", "by-course", courseId],
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("저장했습니다.");
      setDraft(null);
    } catch (e) {
      toast.error(`저장 실패: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: ClassSession) {
    if (!confirm(`${s.date} 일정을 삭제하시겠습니까?`)) return;
    try {
      await classSessionsApi.delete(s.id);
      await qc.invalidateQueries({
        queryKey: ["class-sessions", "by-course", courseId],
      });
      await qc.invalidateQueries({ queryKey: ["class-sessions"] });
      toast.success("삭제했습니다.");
    } catch (e) {
      toast.error(`삭제 실패: ${(e as Error).message}`);
    }
  }

  if (loadingCourse) return <LoadingSpinner className="py-24" />;
  if (!course) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="과목을 찾을 수 없습니다"
        description="삭제되었거나 권한이 없습니다."
      />
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="py-16">
      <section className="mx-auto max-w-4xl px-4">
        <Link
          href="/courses"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft size={14} /> 수강과목 목록
        </Link>
        <PageHeader
          icon={<CalendarClock size={24} />}
          title={course.courseName}
          description={`${course.year}년 ${
            course.term === "spring" ? "1학기" : "2학기"
          } · ${course.schedule ?? "시간 미정"}${
            course.classroom ? ` · ${course.classroom}` : ""
          }`}
          actions={
            <Button onClick={() => setDraft(blankDraft(today))} size="sm">
              <Plus size={14} className="mr-1" /> 일정 추가
            </Button>
          }
        />

        <p className="mt-3 text-xs text-muted-foreground">
          기본 운영방식은 <span className="font-medium">대면</span>입니다. 줌 운영 / 과제
          대체 / 휴강 등 변경사항만 일자별로 등록하면, 본인 및 동기 모두의 대시보드에 자동
          반영됩니다.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-4xl px-4">
        {loadingSessions ? (
          <LoadingSpinner />
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="등록된 일정이 없습니다"
            description="‘일정 추가’ 버튼으로 변경사항을 기록하세요."
          />
        ) : (
          <ul className="space-y-2">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{s.date}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "border text-[11px]",
                        MODE_COLORS[s.mode],
                      )}
                    >
                      {CLASS_SESSION_MODE_LABELS[s.mode]}
                    </Badge>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-muted-foreground">{s.notes}</p>
                  )}
                  {s.link && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {s.link}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft({
                        id: s.id,
                        date: s.date,
                        mode: s.mode,
                        link: s.link ?? "",
                        notes: s.notes ?? "",
                      })
                    }
                  >
                    <Pencil size={12} className="mr-1" /> 수정
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => remove(s)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={12} className="mr-1" /> 삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {draft?.id ? "일정 수정" : "일정 추가"}
            </DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  날짜
                </span>
                <Input
                  type="date"
                  value={draft.date}
                  onChange={(e) =>
                    setDraft({ ...draft, date: e.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  운영방식
                </span>
                <select
                  value={draft.mode}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      mode: e.target.value as ClassSessionMode,
                    })
                  }
                  className="rounded-md border bg-white px-3 py-2 text-sm"
                >
                  {MODE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {CLASS_SESSION_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  링크 (줌 등)
                </span>
                <Input
                  value={draft.link}
                  onChange={(e) =>
                    setDraft({ ...draft, link: e.target.value })
                  }
                  placeholder="https://..."
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  메모
                </span>
                <Input
                  value={draft.notes}
                  onChange={(e) =>
                    setDraft({ ...draft, notes: e.target.value })
                  }
                  placeholder="과제 대체 안내, 보강 일정 등"
                />
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              취소
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CourseSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <ScheduleContent courseId={id} />
    </AuthGuard>
  );
}

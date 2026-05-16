"use client";

/**
 * 스터디 회차 과제 카드 (Sprint 2 — Study Enhancement)
 * - 운영진/리더: 과제 부여(CRUD)
 * - 회원: 과제 보기 + 제출 + 피드백 확인
 * - 학술대회 워크북(ConferenceWorkbookTask) 패턴을 스터디 회차 단위로 적용
 */

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  studyAssignmentsApi,
  studyAssignmentSubmissionsApi,
  profilesApi,
} from "@/lib/bkend";
import { uploadToStorage } from "@/lib/storage";
import type {
  StudyAssignment,
  StudyAssignmentSubmission,
  StudyAssignmentType,
  User,
} from "@/types";
import {
  STUDY_ASSIGNMENT_TYPE_LABELS,
  STUDY_ASSIGNMENT_STATUS_LABELS,
  STUDY_ASSIGNMENT_STATUS_COLORS,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  activityId: string;
  activityProgressId: string;
  week: number;
  currentUserId?: string;
  currentUserName?: string;
  /** 운영진/리더 — 과제 CRUD + 모든 제출 열람·피드백 */
  canManage: boolean;
  participantIds: string[];
}

interface DraftAssignment {
  title: string;
  description: string;
  type: StudyAssignmentType;
  required: boolean;
  dueAt: string; // datetime-local
}

const DEFAULT_DRAFT: DraftAssignment = {
  title: "",
  description: "",
  type: "checkbox",
  required: false,
  dueAt: "",
};

export default function StudySessionAssignmentsCard({
  activityId,
  activityProgressId,
  week,
  currentUserId,
  currentUserName,
  canManage,
  participantIds,
}: Props) {
  const queryClient = useQueryClient();

  // 회차 과제 목록
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["study-assignments", "progress", activityProgressId],
    queryFn: async () => {
      const res = await studyAssignmentsApi.listByProgress(activityProgressId);
      return ((res.data as StudyAssignment[]) ?? [])
        .filter((a) => a.active !== false)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
  });

  // 내 제출 — 회차/내가 보는 제출 모두 조회용으로 활동 단위로 가져옴
  const { data: mySubmissions = [] } = useQuery({
    queryKey: ["study-submissions", "mine", activityId, currentUserId],
    enabled: !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [];
      const res = await studyAssignmentSubmissionsApi.listByUser(currentUserId, activityId);
      return (res.data as StudyAssignmentSubmission[]) ?? [];
    },
  });

  // 운영진용 — 회차의 모든 제출
  const { data: allSubmissionsRaw = [] } = useQuery({
    queryKey: ["study-submissions", "progress", activityProgressId],
    enabled: canManage,
    queryFn: async () => {
      const res = await studyAssignmentSubmissionsApi.listByActivity(activityId);
      return ((res.data as StudyAssignmentSubmission[]) ?? []).filter(
        (s) => s.activityProgressId === activityProgressId,
      );
    },
  });

  // 제출자 이름
  const submitterIds = useMemo(
    () =>
      Array.from(
        new Set(
          (allSubmissionsRaw as StudyAssignmentSubmission[])
            .filter((s) => !s.userName)
            .map((s) => s.userId),
        ),
      ),
    [allSubmissionsRaw],
  );
  const { data: submitterUsers = [] } = useQuery({
    queryKey: ["study-submissions", "users", submitterIds.join(",")],
    enabled: submitterIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        submitterIds.map(async (uid) => {
          try {
            return (await profilesApi.get(uid)) as User;
          } catch {
            return null;
          }
        }),
      );
      return results.filter((u): u is User => !!u);
    },
  });
  const userNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (submitterUsers as User[]).forEach((u) => m.set(u.id, u.name));
    return m;
  }, [submitterUsers]);

  const mySubmissionMap = useMemo(() => {
    const m = new Map<string, StudyAssignmentSubmission>();
    (mySubmissions as StudyAssignmentSubmission[]).forEach((s) =>
      m.set(s.assignmentId, s),
    );
    return m;
  }, [mySubmissions]);

  // 작성 폼 (운영진)
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<DraftAssignment>(DEFAULT_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!currentUserId || !canManage) return;
    if (!draft.title.trim()) {
      toast.error("과제 제목을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      const order = assignments.length;
      const dueIso = draft.dueAt ? new Date(draft.dueAt).toISOString() : undefined;
      if (editingId) {
        await studyAssignmentsApi.update(editingId, {
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          type: draft.type,
          required: draft.required,
          dueAt: dueIso,
          updatedAt: new Date().toISOString(),
        });
        toast.success("과제가 수정되었습니다.");
      } else {
        await studyAssignmentsApi.create({
          activityId,
          activityProgressId,
          week,
          title: draft.title.trim(),
          description: draft.description.trim() || undefined,
          type: draft.type,
          required: draft.required,
          dueAt: dueIso,
          order,
          active: true,
          createdBy: currentUserId,
          createdByName: currentUserName,
        });
        toast.success("과제가 추가되었습니다.");
      }
      await queryClient.invalidateQueries({
        queryKey: ["study-assignments", "progress", activityProgressId],
      });
      setDraft(DEFAULT_DRAFT);
      setAddOpen(false);
      setEditingId(null);
    } catch (e) {
      console.error("[assignment/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(a: StudyAssignment) {
    setDraft({
      title: a.title,
      description: a.description ?? "",
      type: a.type,
      required: a.required,
      dueAt: a.dueAt ? isoToLocalInput(a.dueAt) : "",
    });
    setEditingId(a.id);
    setAddOpen(true);
  }

  async function handleDelete(a: StudyAssignment) {
    if (!confirm(`"${a.title}" 과제를 삭제하시겠습니까? 제출 기록은 유지됩니다.`)) return;
    try {
      await studyAssignmentsApi.delete(a.id);
      await queryClient.invalidateQueries({
        queryKey: ["study-assignments", "progress", activityProgressId],
      });
      toast.success("삭제되었습니다.");
    } catch (e) {
      console.error("[assignment/delete]", e);
      toast.error(e instanceof Error ? `삭제 실패: ${e.message}` : "삭제 실패");
    }
  }

  const totalRequired = assignments.filter((a) => a.required).length;
  const myCompletedRequired = assignments.filter(
    (a) => a.required && mySubmissionMap.get(a.id)?.status === "completed",
  ).length;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <ClipboardList size={12} /> 과제 ({assignments.length})
          {totalRequired > 0 && currentUserId && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px]",
                myCompletedRequired === totalRequired
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              필수 {myCompletedRequired}/{totalRequired}
            </Badge>
          )}
        </h4>
        {canManage && (
          <Button
            size="sm"
            variant={addOpen ? "default" : "outline"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => {
              setAddOpen((v) => !v);
              if (addOpen) {
                setEditingId(null);
                setDraft(DEFAULT_DRAFT);
              }
            }}
          >
            <Plus size={11} />
            {addOpen ? "닫기" : "과제 추가"}
          </Button>
        )}
      </div>

      {canManage && addOpen && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2">
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="과제 제목 (예: Ch.4 핵심 개념 요약)"
            className="h-8 text-sm"
          />
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            placeholder="설명 (선택)"
            rows={2}
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({ ...draft, type: e.target.value as StudyAssignmentType })
              }
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              {Object.entries(STUDY_ASSIGNMENT_TYPE_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              type="datetime-local"
              value={draft.dueAt}
              onChange={(e) => setDraft({ ...draft, dueAt: e.target.value })}
              className="h-8 text-xs"
              placeholder="마감 (선택)"
            />
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
                className="h-3.5 w-3.5"
              />
              필수 과제
            </label>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => {
                setAddOpen(false);
                setEditingId(null);
                setDraft(DEFAULT_DRAFT);
              }}
              disabled={saving}
            >
              <X size={11} className="mr-0.5" /> 취소
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={handleCreate}
              disabled={saving || !draft.title.trim()}
            >
              {saving ? (
                <Loader2 size={11} className="mr-0.5 animate-spin" />
              ) : (
                <Save size={11} className="mr-0.5" />
              )}
              {editingId ? "수정" : "추가"}
            </Button>
          </div>
        </div>
      )}

      {assignmentsLoading ? (
        <p className="text-[11px] text-muted-foreground">불러오는 중…</p>
      ) : assignments.length === 0 ? (
        <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
          아직 부여된 과제가 없습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {assignments.map((a) => (
            <AssignmentItem
              key={a.id}
              assignment={a}
              mySubmission={mySubmissionMap.get(a.id)}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              canManage={canManage}
              participantIds={participantIds}
              allSubmissions={allSubmissionsRaw as StudyAssignmentSubmission[]}
              userNameMap={userNameMap}
              onEdit={() => startEdit(a)}
              onDelete={() => handleDelete(a)}
              onChanged={async () => {
                await queryClient.invalidateQueries({
                  queryKey: ["study-submissions", "mine", activityId, currentUserId],
                });
                if (canManage) {
                  await queryClient.invalidateQueries({
                    queryKey: ["study-submissions", "progress", activityProgressId],
                  });
                }
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface AssignmentItemProps {
  assignment: StudyAssignment;
  mySubmission?: StudyAssignmentSubmission;
  currentUserId?: string;
  currentUserName?: string;
  canManage: boolean;
  participantIds: string[];
  allSubmissions: StudyAssignmentSubmission[];
  userNameMap: Map<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onChanged: () => Promise<void>;
}

function AssignmentItem({
  assignment: a,
  mySubmission,
  currentUserId,
  currentUserName,
  canManage,
  participantIds,
  allSubmissions,
  userNameMap,
  onEdit,
  onDelete,
  onChanged,
}: AssignmentItemProps) {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [text, setText] = useState(mySubmission?.text ?? "");
  const [rating, setRating] = useState<number>(mySubmission?.rating ?? 0);
  const [checked, setChecked] = useState<boolean>(!!mySubmission?.checked);
  const [submitting, setSubmitting] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const status = mySubmission?.status ?? "pending";
  const dueAt = a.dueAt ? new Date(a.dueAt) : null;
  const isOverdue = dueAt && status !== "completed" && dueAt < new Date();

  const submissionsForAssignment = allSubmissions.filter(
    (s) => s.assignmentId === a.id,
  );
  const submitterMap = new Map<string, StudyAssignmentSubmission>();
  submissionsForAssignment.forEach((s) => submitterMap.set(s.userId, s));
  const submittedCount = submissionsForAssignment.filter(
    (s) => s.status === "completed",
  ).length;

  async function handleQuickToggle() {
    if (!currentUserId) return;
    if (a.type !== "checkbox") {
      setSubmitOpen(true);
      return;
    }
    setSubmitting(true);
    try {
      const next = !checked;
      const id = `${currentUserId}_${a.id}`;
      await studyAssignmentSubmissionsApi.upsert(id, {
        userId: currentUserId,
        userName: currentUserName,
        assignmentId: a.id,
        activityId: a.activityId,
        activityProgressId: a.activityProgressId,
        status: next ? "completed" : "pending",
        checked: next,
        submittedAt: next ? new Date().toISOString() : undefined,
      });
      setChecked(next);
      await onChanged();
      toast.success(next ? "완료 표시" : "완료 해제");
    } catch (e) {
      console.error("[submission/checkbox]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!currentUserId) return;
    setSubmitting(true);
    try {
      const id = `${currentUserId}_${a.id}`;
      const payload: Record<string, unknown> = {
        userId: currentUserId,
        userName: currentUserName,
        assignmentId: a.id,
        activityId: a.activityId,
        activityProgressId: a.activityProgressId,
        status: "completed",
        submittedAt: new Date().toISOString(),
      };
      if (a.type === "text" || a.type === "long_text") {
        if (!text.trim()) {
          toast.error("내용을 입력하세요.");
          setSubmitting(false);
          return;
        }
        payload.text = text.trim();
      } else if (a.type === "rating") {
        if (rating < 1) {
          toast.error("별점을 선택하세요.");
          setSubmitting(false);
          return;
        }
        payload.rating = rating;
      } else if (a.type === "checkbox") {
        payload.checked = true;
      } else if (a.type === "file") {
        if (!mySubmission?.fileUrl) {
          toast.error("파일을 먼저 업로드하세요.");
          setSubmitting(false);
          return;
        }
        // file 필드는 업로드 단계에서 이미 저장
      }
      await studyAssignmentSubmissionsApi.upsert(id, payload);
      await onChanged();
      toast.success("제출이 저장되었습니다.");
      setSubmitOpen(false);
    } catch (e) {
      console.error("[submission/save]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFileUpload(file: File) {
    if (!currentUserId) return;
    setUploading(true);
    try {
      const folder = `activities/${a.activityId}/assignments/${a.id}/${currentUserId}`;
      const uploaded = await uploadToStorage(file, folder);
      const id = `${currentUserId}_${a.id}`;
      await studyAssignmentSubmissionsApi.upsert(id, {
        userId: currentUserId,
        userName: currentUserName,
        assignmentId: a.id,
        activityId: a.activityId,
        activityProgressId: a.activityProgressId,
        status: "completed",
        fileUrl: uploaded.url,
        fileName: uploaded.name,
        fileSize: uploaded.size,
        submittedAt: new Date().toISOString(),
      });
      await onChanged();
      toast.success(`${file.name} 업로드 완료`);
    } catch (e) {
      console.error("[submission/file]", e);
      toast.error(e instanceof Error ? `업로드 실패: ${e.message}` : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSaveFeedback(submission: StudyAssignmentSubmission) {
    if (!currentUserId || !canManage) return;
    const fb = feedbackDraft[submission.id] ?? submission.feedback ?? "";
    setFeedbackSaving(submission.id);
    try {
      await studyAssignmentSubmissionsApi.upsert(submission.id, {
        feedback: fb.trim() || undefined,
        feedbackBy: currentUserId,
        feedbackByName: currentUserName,
        feedbackAt: new Date().toISOString(),
      });
      await onChanged();
      toast.success("피드백 저장됨");
    } catch (e) {
      console.error("[submission/feedback]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setFeedbackSaving(null);
    }
  }

  return (
    <li className="rounded-md border bg-background p-2">
      <div className="flex items-start gap-2">
        {a.type === "checkbox" && currentUserId ? (
          <button
            type="button"
            disabled={submitting}
            onClick={handleQuickToggle}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
              checked
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-muted-foreground/30 hover:border-primary",
            )}
            aria-label={checked ? "완료 해제" : "완료 표시"}
          >
            {checked && <CheckCircle2 size={12} />}
          </button>
        ) : (
          <Circle size={14} className="mt-1 shrink-0 text-muted-foreground" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground">{a.title}</span>
            <Badge variant="outline" className="text-[9px]">
              {STUDY_ASSIGNMENT_TYPE_LABELS[a.type]}
            </Badge>
            {a.required && (
              <Badge className="bg-rose-50 text-[9px] text-rose-700">필수</Badge>
            )}
            <Badge
              variant="outline"
              className={cn("text-[9px]", STUDY_ASSIGNMENT_STATUS_COLORS[status])}
            >
              {STUDY_ASSIGNMENT_STATUS_LABELS[status]}
            </Badge>
            {isOverdue && (
              <Badge className="bg-red-100 text-[9px] text-red-700">마감초과</Badge>
            )}
          </div>
          {a.description && (
            <p className="mt-0.5 whitespace-pre-wrap text-[11px] text-muted-foreground">
              {a.description}
            </p>
          )}
          {dueAt && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              마감: {dueAt.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}

          {/* 내 제출 미리보기 */}
          {mySubmission && (mySubmission.text || mySubmission.rating || mySubmission.fileUrl) && (
            <div className="mt-1.5 rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 text-[11px] text-foreground">
              {mySubmission.text && (
                <p className="whitespace-pre-wrap">{mySubmission.text}</p>
              )}
              {mySubmission.rating && (
                <p className="flex items-center gap-0.5 text-amber-700">
                  {Array.from({ length: mySubmission.rating }).map((_, i) => (
                    <Star key={i} size={10} className="fill-current" />
                  ))}
                </p>
              )}
              {mySubmission.fileUrl && (
                <a
                  href={mySubmission.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  <FileText size={11} /> {mySubmission.fileName}
                </a>
              )}
              {mySubmission.feedback && (
                <div className="mt-1 border-t border-emerald-200 pt-1">
                  <p className="text-[10px] font-semibold text-emerald-800">
                    🎯 운영진 피드백 — {mySubmission.feedbackByName ?? "운영진"}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-foreground">
                    {mySubmission.feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {currentUserId && a.type !== "checkbox" && (
            <Button
              size="sm"
              variant={mySubmission?.status === "completed" ? "outline" : "default"}
              className="h-6 px-2 text-[10px]"
              onClick={() => setSubmitOpen((v) => !v)}
            >
              {mySubmission?.status === "completed" ? "수정" : "제출"}
            </Button>
          )}
          {canManage && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title="수정"
              >
                <Pencil size={11} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                title="삭제"
              >
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 회원 제출 폼 */}
      {submitOpen && currentUserId && a.type !== "checkbox" && (
        <div className="mt-2 space-y-2 rounded-md border bg-muted/20 p-2">
          {(a.type === "text" || a.type === "long_text") && (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={a.type === "long_text" ? 4 : 2}
              placeholder="답변을 입력하세요"
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          )}
          {a.type === "rating" && (
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating((r) => (r === n ? 0 : n))}
                  className={cn(
                    "rounded p-0.5",
                    rating >= n ? "text-amber-500" : "text-muted-foreground/40",
                  )}
                >
                  <Star size={16} className={cn(rating >= n && "fill-current")} />
                </button>
              ))}
            </div>
          )}
          {a.type === "file" && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">
                  {mySubmission?.fileUrl
                    ? `현재: ${mySubmission.fileName}`
                    : "파일을 업로드하면 자동으로 제출 완료됩니다."}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 size={11} className="mr-0.5 animate-spin" />
                  ) : (
                    <Upload size={11} className="mr-0.5" />
                  )}
                  파일 선택
                </Button>
              </div>
            </>
          )}
          {a.type !== "file" && (
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => setSubmitOpen(false)}
                disabled={submitting}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 size={11} className="mr-0.5 animate-spin" />
                ) : (
                  <Save size={11} className="mr-0.5" />
                )}
                제출
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 운영진 — 전체 제출 토글 */}
      {canManage && (
        <div className="mt-2 border-t pt-2">
          <button
            type="button"
            onClick={() => setStaffOpen((v) => !v)}
            className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <Users size={11} />
            제출 현황 {submittedCount}/{participantIds.length}
            {staffOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          {staffOpen && (
            <div className="mt-1.5 space-y-1.5">
              {participantIds.map((pid) => {
                const sub = submitterMap.get(pid);
                const name = sub?.userName ?? userNameMap.get(pid) ?? pid.slice(0, 6);
                const fb = feedbackDraft[sub?.id ?? ""] ?? sub?.feedback ?? "";
                return (
                  <div
                    key={pid}
                    className="rounded border bg-background p-1.5 text-[11px]"
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px]",
                          STUDY_ASSIGNMENT_STATUS_COLORS[sub?.status ?? "pending"],
                        )}
                      >
                        {STUDY_ASSIGNMENT_STATUS_LABELS[sub?.status ?? "pending"]}
                      </Badge>
                      {sub?.submittedAt && (
                        <span className="text-[9px] text-muted-foreground">
                          {new Date(sub.submittedAt).toLocaleString("ko-KR", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>
                    {sub?.text && (
                      <p className="mt-0.5 whitespace-pre-wrap text-foreground">{sub.text}</p>
                    )}
                    {sub?.rating && (
                      <p className="flex items-center gap-0.5 text-amber-700">
                        {Array.from({ length: sub.rating }).map((_, i) => (
                          <Star key={i} size={9} className="fill-current" />
                        ))}
                      </p>
                    )}
                    {sub?.fileUrl && (
                      <a
                        href={sub.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 flex items-center gap-0.5 text-primary hover:underline"
                      >
                        <Download size={10} /> {sub.fileName}
                      </a>
                    )}
                    {sub && (
                      <div className="mt-1 flex gap-1">
                        <Input
                          value={fb}
                          onChange={(e) =>
                            setFeedbackDraft({ ...feedbackDraft, [sub.id]: e.target.value })
                          }
                          placeholder="피드백 (선택)"
                          className="h-7 flex-1 text-[11px]"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => handleSaveFeedback(sub)}
                          disabled={feedbackSaving === sub.id}
                        >
                          {feedbackSaving === sub.id ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <MessageSquare size={10} />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

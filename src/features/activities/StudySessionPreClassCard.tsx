"use client";

/**
 * 스터디 회차 사전 학습 카드 (Sprint 3 — Study Enhancement)
 * - 발제자 지정 (선택) — 전원 발제 케이스가 일반적이라 비어 있어도 정상
 * - Pre-read 자료 (당일 자료와 별도로 사전 배포)
 * - 핵심 토론 질문 (회원이 미리 생각해 오도록 사전 공유)
 *
 * activityProgress 도큐먼트에 presenterUserIds / preReadMaterials / discussionQuestions 필드 직접 저장.
 */

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  MessageCircleQuestion,
  Mic,
  Pencil,
  Plus,
  Save,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { activityProgressApi, profilesApi } from "@/lib/bkend";
import { uploadToStorage } from "@/lib/storage";
import type { ActivityProgress, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MemberAutocomplete from "@/components/ui/MemberAutocomplete";
import { cn } from "@/lib/utils";

interface Props {
  activityId: string;
  progress: ActivityProgress;
  week: number;
  /** 운영진/리더만 편집 */
  canManage: boolean;
  /** 현재 참여자 ID (발제자 후보 풀) */
  participantIds: string[];
}

export default function StudySessionPreClassCard({
  activityId,
  progress,
  week,
  canManage,
  participantIds,
}: Props) {
  const queryClient = useQueryClient();
  const presenterIds = useMemo(
    () => (progress.presenterUserIds as string[] | undefined) ?? [],
    [progress.presenterUserIds],
  );
  const preReads = useMemo(
    () => (progress.preReadMaterials as ActivityProgress["preReadMaterials"]) ?? [],
    [progress.preReadMaterials],
  );
  const questions = useMemo(
    () => (progress.discussionQuestions as string[] | undefined) ?? [],
    [progress.discussionQuestions],
  );

  // 발제자 프로필
  const { data: presenters = [] } = useQuery({
    queryKey: ["pre-class", "presenters", progress.id, presenterIds.join(",")],
    enabled: presenterIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        presenterIds.map(async (uid) => {
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

  // 편집 상태
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [questionsDraft, setQuestionsDraft] = useState("");
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function patch(updates: Partial<ActivityProgress>) {
    await activityProgressApi.update(progress.id, updates);
    await queryClient.invalidateQueries({
      queryKey: ["activity-progress", activityId],
    });
  }

  async function addPresenter(memberId: string) {
    if (presenterIds.includes(memberId)) return;
    try {
      await patch({ presenterUserIds: [...presenterIds, memberId] });
      toast.success("발제자 추가");
    } catch (e) {
      console.error("[pre-class/presenter/add]", e);
      toast.error("발제자 추가 실패");
    }
  }

  async function removePresenter(memberId: string) {
    try {
      await patch({ presenterUserIds: presenterIds.filter((id) => id !== memberId) });
      toast.success("발제자 제외");
    } catch (e) {
      console.error("[pre-class/presenter/remove]", e);
      toast.error("발제자 제외 실패");
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const folder = `activities/${activityId}/week-${week}/pre-read`;
      const uploaded = await uploadToStorage(file, folder);
      await patch({ preReadMaterials: [...preReads, uploaded] });
      toast.success(`${file.name} 업로드 완료`);
    } catch (e) {
      console.error("[pre-class/pre-read/upload]", e);
      toast.error(e instanceof Error ? `업로드 실패: ${e.message}` : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemoveFile(idx: number) {
    if (!confirm("이 사전 자료를 삭제하시겠습니까?")) return;
    try {
      await patch({ preReadMaterials: preReads.filter((_, i) => i !== idx) });
      toast.success("삭제되었습니다.");
    } catch (e) {
      console.error("[pre-class/pre-read/delete]", e);
      toast.error("삭제 실패");
    }
  }

  async function handleSaveQuestions() {
    setSavingQuestions(true);
    try {
      const next = questionsDraft
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      await patch({ discussionQuestions: next.length > 0 ? next : undefined });
      toast.success("질문이 저장되었습니다.");
      setQuestionsOpen(false);
    } catch (e) {
      console.error("[pre-class/questions/save]", e);
      toast.error("저장 실패");
    } finally {
      setSavingQuestions(false);
    }
  }

  function openQuestionsEdit() {
    setQuestionsDraft(questions.join("\n"));
    setQuestionsOpen(true);
  }

  const isEmpty =
    presenterIds.length === 0 && preReads.length === 0 && questions.length === 0;
  if (isEmpty && !canManage) return null;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <BookOpen size={12} /> 사전 학습
          {presenterIds.length > 0 && (
            <Badge variant="outline" className="text-[9px]">
              발제 {presenterIds.length}명
            </Badge>
          )}
          {preReads.length > 0 && (
            <Badge variant="outline" className="text-[9px]">
              Pre-read {preReads.length}
            </Badge>
          )}
          {questions.length > 0 && (
            <Badge variant="outline" className="text-[9px]">
              질문 {questions.length}
            </Badge>
          )}
        </h4>
      </div>

      {/* 발제자 (선택) */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h5 className="flex items-center gap-1 text-[11px] font-medium text-foreground/80">
            <Mic size={11} /> 발제자 <span className="text-[10px] text-muted-foreground">(선택 — 비우면 전원 발제)</span>
          </h5>
          {canManage && (
            <Button
              size="sm"
              variant={presenterOpen ? "default" : "outline"}
              className="h-6 gap-1 px-1.5 text-[10px]"
              onClick={() => setPresenterOpen((v) => !v)}
            >
              {presenterOpen ? <X size={10} /> : <Plus size={10} />}
              {presenterOpen ? "닫기" : "지정"}
            </Button>
          )}
        </div>
        {presenters.length === 0 ? (
          !canManage ? null : !presenterOpen ? (
            <p className="text-[11px] text-muted-foreground">
              지정된 발제자가 없습니다. 필요할 때만 지정하세요.
            </p>
          ) : null
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(presenters as User[]).map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-800"
              >
                <Mic size={10} />
                {p.name}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => removePresenter(p.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-amber-100"
                    aria-label="발제자 제외"
                  >
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        {canManage && presenterOpen && (
          <div className="rounded-md border border-dashed bg-muted/20 p-2">
            <p className="mb-1 text-[10px] text-muted-foreground">
              참여자 중에서 발제자 선택 — 회원 이름 검색
            </p>
            <MemberAutocomplete
              value=""
              onSelect={(member) => addPresenter(member.id)}
              placeholder="발제자 이름 검색 (회원만)"
              excludeIds={presenterIds}
            />
          </div>
        )}
      </section>

      {/* Pre-read 자료 */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h5 className="flex items-center gap-1 text-[11px] font-medium text-foreground/80">
            <FileText size={11} /> Pre-read 자료
          </h5>
          {canManage && (
            <>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-1.5 text-[10px]"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Upload size={10} />
                )}
                업로드
              </Button>
            </>
          )}
        </div>
        {preReads.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            사전에 배포할 자료가 없습니다.
          </p>
        ) : (
          <ul className="space-y-1">
            {preReads.map((m, i) => (
              <li
                key={`${m.url}-${i}`}
                className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-[11px]"
              >
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <FileText size={11} className="shrink-0 text-muted-foreground" />
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {m.name}
                  </a>
                  {typeof m.size === "number" && (
                    <span className="shrink-0 text-[9px] text-muted-foreground">
                      {(m.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    download={m.name}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="다운로드"
                  >
                    <Download size={11} />
                  </a>
                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(i)}
                      className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      title="삭제"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 핵심 토론 질문 */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h5 className="flex items-center gap-1 text-[11px] font-medium text-foreground/80">
            <MessageCircleQuestion size={11} /> 핵심 토론 질문
          </h5>
          {canManage && !questionsOpen && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-1.5 text-[10px]"
              onClick={openQuestionsEdit}
            >
              <Pencil size={10} />
              {questions.length > 0 ? "편집" : "작성"}
            </Button>
          )}
        </div>
        {questionsOpen ? (
          <div className="space-y-1.5">
            <textarea
              value={questionsDraft}
              onChange={(e) => setQuestionsDraft(e.target.value)}
              rows={4}
              placeholder={"한 줄에 하나씩 질문을 작성하세요.\n예) Vygotsky 의 ZPD 는 온라인 학습에서도 동일하게 적용될까?\n예) Bandura 의 자기효능감 측정 변인 3가지"}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <div className="flex justify-end gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => setQuestionsOpen(false)}
                disabled={savingQuestions}
              >
                <X size={11} className="mr-0.5" /> 취소
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={handleSaveQuestions}
                disabled={savingQuestions}
              >
                {savingQuestions ? (
                  <Loader2 size={11} className="mr-0.5 animate-spin" />
                ) : (
                  <Save size={11} className="mr-0.5" />
                )}
                저장
              </Button>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            사전 공유 질문이 없습니다.
          </p>
        ) : (
          <ul className="space-y-1">
            {questions.map((q, i) => (
              <li
                key={i}
                className="flex gap-1.5 rounded border border-blue-200 bg-blue-50/50 px-2 py-1 text-[11px] text-foreground"
              >
                <HelpCircle size={11} className="mt-0.5 shrink-0 text-blue-700" />
                <span className="whitespace-pre-wrap">{q}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

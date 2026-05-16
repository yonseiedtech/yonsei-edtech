"use client";

/**
 * 스터디 회차 토론 노트 카드 (Sprint 4 — Study Enhancement)
 * - 회원이 회차 도중/직후 자유롭게 작성하는 질문/인사이트/하이라이트/인용
 * - 다중(한 회원이 여러 노트 작성), 익명 옵션
 * - 다른 회원 노트는 모두 read (학습 공유 목적)
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  HelpCircle,
  Lightbulb,
  Loader2,
  MessageSquare,
  Plus,
  Quote,
  Save,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { studySessionNotesApi, profilesApi } from "@/lib/bkend";
import type { StudySessionNote, StudySessionNoteKind, User } from "@/types";
import {
  STUDY_SESSION_NOTE_KIND_LABELS,
  STUDY_SESSION_NOTE_KIND_COLORS,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  activityId: string;
  activityProgressId: string;
  week: number;
  currentUserId?: string;
  currentUserName?: string;
  /** 운영진/리더 — 어떤 노트든 삭제 가능 */
  canModerate: boolean;
}

const KIND_ICONS: Record<StudySessionNoteKind, React.ComponentType<{ size?: number; className?: string }>> = {
  question: HelpCircle,
  insight: Lightbulb,
  highlight: Star,
  quote: Quote,
};

export default function StudySessionNotesCard({
  activityId,
  activityProgressId,
  week,
  currentUserId,
  currentUserName,
  canModerate,
}: Props) {
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["study-notes", activityProgressId],
    queryFn: async () => {
      const res = await studySessionNotesApi.listByProgress(activityProgressId);
      return ((res.data as StudySessionNote[]) ?? []).sort((a, b) =>
        (a.createdAt ?? "").localeCompare(b.createdAt ?? ""),
      );
    },
  });

  const authorIds = useMemo(
    () =>
      Array.from(
        new Set(
          notes
            .filter((n) => !n.userName && !n.anonymous)
            .map((n) => n.userId),
        ),
      ),
    [notes],
  );

  const { data: authors = [] } = useQuery({
    queryKey: ["study-notes", "authors", authorIds.join(",")],
    enabled: authorIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        authorIds.map(async (uid) => {
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
  const authorNameMap = useMemo(() => {
    const m = new Map<string, string>();
    (authors as User[]).forEach((u) => m.set(u.id, u.name));
    return m;
  }, [authors]);

  const [addOpen, setAddOpen] = useState(false);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<StudySessionNoteKind>("insight");
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!currentUserId) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (!body.trim()) {
      toast.error("내용을 입력하세요.");
      return;
    }
    setSaving(true);
    try {
      await studySessionNotesApi.create({
        activityId,
        activityProgressId,
        week,
        userId: currentUserId,
        userName: currentUserName,
        kind,
        body: body.trim(),
        anonymous,
      });
      await queryClient.invalidateQueries({
        queryKey: ["study-notes", activityProgressId],
      });
      setBody("");
      setKind("insight");
      setAnonymous(false);
      setAddOpen(false);
      toast.success("노트가 추가되었습니다.");
    } catch (e) {
      console.error("[note/add]", e);
      toast.error(e instanceof Error ? `저장 실패: ${e.message}` : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(note: StudySessionNote) {
    if (!confirm("이 노트를 삭제하시겠습니까?")) return;
    try {
      await studySessionNotesApi.delete(note.id);
      await queryClient.invalidateQueries({
        queryKey: ["study-notes", activityProgressId],
      });
      toast.success("삭제되었습니다.");
    } catch (e) {
      console.error("[note/delete]", e);
      toast.error("삭제 실패");
    }
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <Sparkles size={12} /> 토론 노트 ({notes.length})
        </h4>
        {currentUserId && (
          <Button
            size="sm"
            variant={addOpen ? "default" : "outline"}
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setAddOpen((v) => !v)}
          >
            {addOpen ? <X size={11} /> : <Plus size={11} />}
            {addOpen ? "닫기" : "노트 추가"}
          </Button>
        )}
      </div>

      {addOpen && currentUserId && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-2">
          <div className="flex flex-wrap gap-1">
            {(Object.keys(STUDY_SESSION_NOTE_KIND_LABELS) as StudySessionNoteKind[]).map(
              (k) => {
                const Icon = KIND_ICONS[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition",
                      kind === k
                        ? STUDY_SESSION_NOTE_KIND_COLORS[k]
                        : "border-border bg-background text-muted-foreground hover:border-primary/30",
                    )}
                  >
                    <Icon size={11} />
                    {STUDY_SESSION_NOTE_KIND_LABELS[k]}
                  </button>
                );
              },
            )}
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder={
              kind === "question"
                ? "예) Vygotsky 의 ZPD 는 비동기 학습에서도 동일한가?"
                : kind === "insight"
                  ? "예) 발표자료의 사례 3개가 결국 메타인지 학습 동기에 수렴함"
                  : kind === "quote"
                    ? "예) \"Learning is a social activity\" — Vygotsky (인용)"
                    : "기록할 인상적인 부분"
            }
            className="w-full rounded-md border bg-background px-2 py-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                className="h-3 w-3"
              />
              익명으로 게시
            </label>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[11px]"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={handleAdd}
                disabled={saving || !body.trim()}
              >
                {saving ? (
                  <Loader2 size={11} className="mr-0.5 animate-spin" />
                ) : (
                  <Save size={11} className="mr-0.5" />
                )}
                추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">불러오는 중…</p>
      ) : notes.length === 0 ? (
        <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
          아직 토론 노트가 없습니다.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((n) => {
            const Icon = KIND_ICONS[n.kind];
            const isMine = n.userId === currentUserId;
            const canDelete = isMine || canModerate;
            const displayName = n.anonymous
              ? "익명"
              : n.userName ?? authorNameMap.get(n.userId) ?? "(이름 미확인)";
            return (
              <li
                key={n.id}
                className={cn(
                  "space-y-1 rounded border px-2 py-1.5 text-[11px]",
                  STUDY_SESSION_NOTE_KIND_COLORS[n.kind],
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1">
                    <Icon size={11} />
                    <Badge variant="outline" className="bg-card text-[9px]">
                      {STUDY_SESSION_NOTE_KIND_LABELS[n.kind]}
                    </Badge>
                    <span className="text-[10px] text-foreground/80">
                      {displayName}
                      {isMine && n.anonymous && (
                        <span className="ml-1 text-[9px]">(나·익명)</span>
                      )}
                      {isMine && !n.anonymous && (
                        <span className="ml-1 text-[9px]">(나)</span>
                      )}
                    </span>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(n)}
                      className="rounded p-0.5 text-foreground/40 hover:text-destructive"
                      title="삭제"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-foreground">{n.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

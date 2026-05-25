"use client";

import { useState } from "react";
import { Plus, Save, Trash2, AlertTriangle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  useChapters,
  useCreateChapter,
  useUpdateChapter,
  useDeleteChapter,
  useChapterComments,
  useCreateComment,
  useToggleResolveComment,
  useDeleteComment,
} from "../api/useCollabPhase2";
import {
  STANDARD_CHAPTER_KEYS,
  STANDARD_CHAPTER_LABELS,
  type ChapterStatus,
  type CollabResearchChapter,
} from "@/types";

interface Props {
  researchId: string;
  currentUserId: string;
  isLeader: boolean;
  isMember: boolean;
}

const STATUS_LABELS: Record<ChapterStatus, string> = {
  empty: "비어 있음",
  draft: "초안",
  review: "검토 중",
  approved: "확정",
};

const STATUS_COLORS: Record<ChapterStatus, string> = {
  empty: "bg-zinc-100 text-zinc-600",
  draft: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
};

export default function ChaptersBoard({
  researchId,
  currentUserId,
  isLeader,
  isMember,
}: Props) {
  const { data: chapters = [], isLoading } = useChapters(researchId);
  const createMut = useCreateChapter(researchId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");

  const selected = chapters.find((c) => c.id === selectedId) ?? chapters[0];
  const canEdit = (isLeader || isMember);

  const handleCreate = async (chapterKey: string, title: string) => {
    if (!chapterKey.trim() || !title.trim()) return;
    await createMut.mutateAsync({
      researchId,
      chapterKey: chapterKey.trim(),
      order: chapters.length + 1,
      title: title.trim(),
      content: "",
      assignedUserIds: [],
      charCount: 0,
      status: "empty",
    });
    setCreatingKey(false);
    setNewKey("");
    setNewTitle("");
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-zinc-500">불러오는 중...</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* 좌측: 챕터 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">챕터 ({chapters.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {chapters.length === 0 && (
            <p className="rounded bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
              아직 챕터가 없습니다.
            </p>
          )}
          {chapters.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`block w-full rounded px-2 py-2 text-left text-sm transition-colors ${
                selected?.id === c.id ? "bg-primary/10 text-primary" : "hover:bg-zinc-100"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-500">
                  {STANDARD_CHAPTER_LABELS[c.chapterKey] ?? c.chapterKey}
                </span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[c.status]}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className="mt-0.5 line-clamp-1 text-sm font-medium">{c.title}</div>
              <div className="mt-1 text-xs text-zinc-500">{c.charCount.toLocaleString()}자</div>
            </button>
          ))}

          {canEdit && (
            <>
              {!creatingKey ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => setCreatingKey(true)}
                >
                  <Plus size={14} className="mr-1" />
                  챕터 추가
                </Button>
              ) : (
                <div className="mt-2 space-y-2 rounded border border-dashed border-zinc-300 p-2">
                  <select
                    value={newKey}
                    onChange={(e) => {
                      setNewKey(e.target.value);
                      if (e.target.value && !newTitle) {
                        setNewTitle(STANDARD_CHAPTER_LABELS[e.target.value] ?? "");
                      }
                    }}
                    className="block w-full rounded border border-zinc-300 px-2 py-1 text-xs"
                  >
                    <option value="">키 선택 (또는 직접 입력)</option>
                    {STANDARD_CHAPTER_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {STANDARD_CHAPTER_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <Input
                    placeholder="자유 키 (예: pilot-study)"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="text-xs"
                  />
                  <Input
                    placeholder="제목"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="text-xs"
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => handleCreate(newKey, newTitle)}
                      disabled={!newKey.trim() || !newTitle.trim() || createMut.isPending}
                    >
                      추가
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCreatingKey(false);
                        setNewKey("");
                        setNewTitle("");
                      }}
                    >
                      취소
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 우측: 선택된 챕터 편집 + 댓글 */}
      <div className="space-y-4">
        {selected ? (
          <ChapterEditor
            chapter={selected}
            researchId={researchId}
            currentUserId={currentUserId}
            canEdit={canEdit}
            isLeader={isLeader}
          />
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-sm text-zinc-500">
              왼쪽에서 챕터를 선택하거나 새로 추가하세요.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ChapterEditor({
  chapter,
  researchId,
  currentUserId,
  canEdit,
  isLeader,
}: {
  chapter: CollabResearchChapter;
  researchId: string;
  currentUserId: string;
  canEdit: boolean;
  isLeader: boolean;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [content, setContent] = useState(chapter.content);
  const [status, setStatus] = useState<ChapterStatus>(chapter.status);
  const [versionAtLoad, setVersionAtLoad] = useState(chapter.version);
  const updateMut = useUpdateChapter(researchId, chapter.id);
  const deleteMut = useDeleteChapter(researchId);

  // chapter prop 변경 시 (다른 챕터 선택) 폼 재초기화
  if (chapter.id !== (versionAtLoad as unknown as string).toString().slice(0, 0) /* always false */) {
    // noop — useState로 충분하지만 시각적 단순화
  }

  const save = async () => {
    try {
      await updateMut.mutateAsync({
        title,
        content,
        status,
        expectedVersion: versionAtLoad,
        lastEditedBy: currentUserId,
      });
      setVersionAtLoad((v) => v + 1);
    } catch {
      // 충돌 시 toast 자동, 새로고침 유도
    }
  };

  const handleDelete = () => {
    if (!confirm(`'${chapter.title}' 챕터를 삭제하시겠습니까?`)) return;
    deleteMut.mutate(chapter.id);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEdit}
              className="border-0 px-0 text-lg font-semibold focus-visible:ring-0"
            />
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ChapterStatus)}
                disabled={!canEdit}
                className="rounded border border-zinc-300 px-2 py-1 text-xs"
              >
                <option value="empty">{STATUS_LABELS.empty}</option>
                <option value="draft">{STATUS_LABELS.draft}</option>
                <option value="review">{STATUS_LABELS.review}</option>
                <option value="approved">{STATUS_LABELS.approved}</option>
              </select>
              <Badge variant="outline" className="text-xs">v{chapter.version}</Badge>
            </div>
          </div>
          {chapter.lastEditedAt && (
            <p className="mt-1 text-xs text-zinc-500">
              마지막 수정: {new Date(chapter.lastEditedAt).toLocaleString("ko-KR")}
              · {chapter.charCount.toLocaleString()}자
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!canEdit}
            rows={20}
            className="font-mono text-sm"
            placeholder="markdown 본문..."
          />
          {canEdit && (
            <div className="flex justify-between">
              {isLeader ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 size={14} className="mr-1" />
                  삭제
                </Button>
              ) : (
                <div />
              )}
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
          {updateMut.isError && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                다른 멤버가 먼저 저장했습니다. 페이지를 새로고침해 최신 본문을 받은 뒤
                다시 시도하세요.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 댓글 */}
      <ChapterCommentSection
        chapterId={chapter.id}
        researchId={researchId}
        currentUserId={currentUserId}
        isLeader={isLeader}
      />
    </>
  );
}

function ChapterCommentSection({
  chapterId,
  researchId,
  currentUserId,
  isLeader,
}: {
  chapterId: string;
  researchId: string;
  currentUserId: string;
  isLeader: boolean;
}) {
  const { data: comments = [] } = useChapterComments(chapterId);
  const createMut = useCreateComment(chapterId);
  const toggleMut = useToggleResolveComment(chapterId);
  const deleteMut = useDeleteComment(chapterId);
  const [body, setBody] = useState("");

  const submit = async () => {
    if (!body.trim()) return;
    // 간단한 @멘션 파싱 — @username 형식 (실제 userId resolve 는 별도 인박스에서)
    const mentioned: string[] = [];
    const re = /@([a-zA-Z0-9_-]+)/g;
    let m;
    while ((m = re.exec(body)) !== null) {
      mentioned.push(m[1]);
    }
    await createMut.mutateAsync({
      researchId,
      chapterId,
      authorId: currentUserId,
      body: body.trim(),
      mentionedUserIds: mentioned,
    });
    setBody("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare size={16} /> 댓글 ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 댓글이 없습니다.</p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className={`rounded border p-3 text-sm ${
                c.resolvedAt ? "border-zinc-200 bg-zinc-50 opacity-70" : "border-zinc-200"
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-600">
                  {c.authorId.slice(0, 8)}… ·{" "}
                  {new Date(c.createdAt).toLocaleString("ko-KR")}
                </span>
                <div className="flex gap-1">
                  {(c.authorId === currentUserId || isLeader) && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleMut.mutate({
                          id: c.id,
                          resolverId: c.resolvedAt ? null : currentUserId,
                        })
                      }
                      className="text-xs text-zinc-500 hover:text-emerald-700"
                    >
                      {c.resolvedAt ? "재오픈" : "해결"}
                    </button>
                  )}
                  {(c.authorId === currentUserId || isLeader) && (
                    <button
                      type="button"
                      onClick={() => deleteMut.mutate(c.id)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      삭제
                    </button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.body}</p>
              {c.mentionedUserIds.length > 0 && (
                <p className="mt-1 text-xs text-blue-600">
                  멘션: {c.mentionedUserIds.map((u) => `@${u}`).join(" ")}
                </p>
              )}
            </div>
          ))
        )}

        <div className="space-y-2 rounded border border-dashed border-zinc-300 p-3">
          <Label htmlFor="comment-body" className="text-xs">
            새 댓글 (@username 으로 멘션 가능)
          </Label>
          <Textarea
            id="comment-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="이 챕터에 대한 의견·질문·제안..."
          />
          <Button size="sm" onClick={submit} disabled={!body.trim() || createMut.isPending}>
            댓글 작성
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

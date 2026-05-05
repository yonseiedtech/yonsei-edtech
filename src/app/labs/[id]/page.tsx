"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  useLab, useLabReactions, useToggleReaction,
  useLabComments, useCreateLabComment, useDeleteLabComment,
  useDeleteLab, useUpdateLab,
} from "@/features/labs/useLabs";
import { useAuthStore } from "@/features/auth/auth-store";
import { canManageLabs, canPromoteLab } from "@/lib/permissions";
import AuthGuard from "@/features/auth/AuthGuard";
import { LAB_EMOJIS, type LabEmoji, type LabStatus } from "@/types";
import { ExternalLink, Trash2, ArrowLeft, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

const STATUS_LABEL: Record<LabStatus, string> = {
  draft: "준비중", testing: "테스트", feedback: "피드백",
  approved: "승인됨", archived: "보관",
};

function LabDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { lab, isLoading } = useLab(id);
  const { reactions } = useLabReactions(id);
  const { toggle } = useToggleReaction();
  const { comments } = useLabComments(id);
  const { createComment, isLoading: posting } = useCreateLabComment();
  const { deleteComment } = useDeleteLabComment();
  const { deleteLab } = useDeleteLab();
  const { updateLab } = useUpdateLab();
  const [newComment, setNewComment] = useState("");

  const reactionCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reactions) c[r.emoji] = (c[r.emoji] ?? 0) + 1;
    return c;
  }, [reactions]);

  const myReactions = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of reactions) if (r.userId === user?.id) map[r.emoji] = r.id;
    return map;
  }, [reactions, user?.id]);

  if (isLoading) return <p className="py-20 text-center text-sm text-muted-foreground">불러오는 중…</p>;
  if (!lab) return <p className="py-20 text-center text-sm text-muted-foreground">실험을 찾을 수 없습니다.</p>;

  const canManage = canManageLabs(user) || lab.ownerId === user?.id;
  const canPromote = canPromoteLab(user);

  async function onToggle(emoji: LabEmoji) {
    if (!user) return toast.error("로그인이 필요합니다.");
    try {
      await toggle({ labId: id, emoji, existingId: myReactions[emoji] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "실패");
    }
  }

  async function onSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await createComment({ labId: id, content: newComment.trim() });
      setNewComment("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "실패");
    }
  }

  async function onDeleteLab() {
    if (!confirm("이 실험을 삭제할까요?")) return;
    try {
      await deleteLab(id);
      toast.success("삭제되었습니다.");
      router.push("/labs");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "실패");
    }
  }

  async function onChangeStatus(s: LabStatus) {
    try {
      await updateLab({ id, data: { status: s } });
      toast.success("상태를 변경했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "실패");
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <Link href="/labs" className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft size={12} /> 목록으로
      </Link>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
              {lab.kind === "external" ? "외부 링크" : "내부 프로토타입"}
            </span>
            <span className="text-muted-foreground">· {STATUS_LABEL[lab.status]}</span>
            <span className="text-muted-foreground">· by {lab.ownerName}</span>
          </div>
          <h1 className="text-2xl font-bold">{lab.title}</h1>
          {lab.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{lab.description}</p>}
          {lab.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {lab.tags.map((t) => (
                <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">#{t}</span>
              ))}
            </div>
          ) : null}
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            {canPromote && (
              <select
                value={lab.status}
                onChange={(e) => onChangeStatus(e.target.value as LabStatus)}
                className="rounded-lg border px-2 py-1 text-xs"
              >
                <option value="draft">준비중</option>
                <option value="testing">테스트</option>
                <option value="feedback">피드백</option>
                <option value="approved">승인됨</option>
                <option value="archived">보관</option>
              </select>
            )}
            <button
              onClick={onDeleteLab}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 size={12} /> 삭제
            </button>
          </div>
        )}
      </header>

      {lab.kind === "external" && lab.externalUrl && (
        <section className="mb-6 overflow-hidden rounded-xl border">
          {lab.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lab.thumbnailUrl} alt={lab.title} className="max-h-80 w-full object-cover" />
          )}
          <div className="flex items-center justify-between gap-3 border-t bg-muted/30 p-3">
            <code className="flex-1 truncate text-xs text-muted-foreground">{lab.externalUrl}</code>
            <a
              href={lab.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
            >
              새 창에서 열기 <ExternalLink size={12} />
            </a>
          </div>
        </section>
      )}

      {lab.kind === "internal" && (
        <section className="mb-6 rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
          <p className="flex items-center gap-2 font-medium text-foreground">
            <FlaskConical size={14} /> 내부 프로토타입
          </p>
          {lab.featureFlag && <p className="mt-1">Feature Flag: <code className="rounded bg-card px-1">{lab.featureFlag}</code></p>}
          {lab.previewRoute && (
            <p className="mt-1">
              미리보기: <Link href={lab.previewRoute} className="text-primary underline">{lab.previewRoute}</Link>
            </p>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold">반응</h2>
        <div className="flex flex-wrap gap-2">
          {LAB_EMOJIS.map((e) => {
            const mine = !!myReactions[e];
            return (
              <button
                key={e}
                onClick={() => onToggle(e)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                  mine ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                <span>{e}</span>
                <span className="text-xs font-semibold">{reactionCounts[e] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold">코멘트 ({comments.length})</h2>
        <form onSubmit={onSubmitComment} className="mb-4 flex gap-2">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="의견을 남겨주세요"
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={posting || !newComment.trim()}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            등록
          </button>
        </form>
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-semibold">{c.authorName}</span>
                  <span className="ml-2 text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                {(c.authorId === user?.id || canManageLabs(user)) && (
                  <button
                    onClick={() => deleteComment({ id: c.id, labId: id })}
                    className="text-xs text-muted-foreground hover:text-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
            </li>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground">첫 의견을 남겨보세요.</p>
          )}
        </ul>
      </section>
    </div>
  );
}

export default function PublicLabDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AuthGuard>
      <LabDetailContent id={id} />
    </AuthGuard>
  );
}

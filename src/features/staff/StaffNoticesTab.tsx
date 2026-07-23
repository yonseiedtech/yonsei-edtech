"use client";

import { useState } from "react";
import { Pin, PinOff, Trash2, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import {
  useStaffNotices,
  useCreateNotice,
  useUpdateNotice,
  useDeleteNotice,
  type StaffNotice,
} from "./staff-store";

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
}

function NoticeCard({
  notice,
  currentUserId,
  isAdmin,
}: {
  notice: StaffNotice;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const updateNotice = useUpdateNotice();
  const deleteNotice = useDeleteNotice();
  const canDelete = notice.authorId === currentUserId || isAdmin;

  const handleTogglePin = () => {
    updateNotice.mutate(
      { id: notice.id, data: { pinned: !notice.pinned } },
      { onSuccess: () => toast.success(notice.pinned ? "고정 해제됨" : "공지 고정됨") },
    );
  };

  const handleDelete = () => {
    if (!confirm("이 공지를 삭제하시겠습니까?")) return;
    deleteNotice.mutate(notice.id, {
      onSuccess: () => toast.success("공지가 삭제되었습니다."),
      onError: () => toast.error("삭제에 실패했습니다."),
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 transition-colors",
        notice.pinned && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3">
        {notice.pinned && (
          <span className="mt-0.5 shrink-0 text-primary">
            <Pin size={14} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex-1 text-left"
            >
              <p className="font-semibold leading-snug">{notice.title}</p>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {isAdmin && (
                <button
                  type="button"
                  title={notice.pinned ? "고정 해제" : "상단 고정"}
                  onClick={handleTogglePin}
                  disabled={updateNotice.isPending}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                >
                  {notice.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  title="삭제"
                  onClick={handleDelete}
                  disabled={deleteNotice.isPending}
                  className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/5 hover:text-destructive"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {notice.authorName} · {formatDate(notice.createdAt)}
          </p>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/40 px-3 py-2.5 text-sm leading-relaxed text-foreground">
          {notice.body}
        </div>
      )}
    </div>
  );
}

function CreateNoticeForm({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const createNotice = useCreateNotice();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !user) return;
    createNotice.mutate(
      {
        title: title.trim(),
        body: body.trim(),
        pinned,
        authorId: user.id,
        authorName: user.name,
      },
      {
        onSuccess: () => {
          toast.success("공지가 등록되었습니다.");
          onClose();
        },
        onError: () => toast.error("등록에 실패했습니다."),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-4 space-y-3"
    >
      <p className="font-semibold text-sm">새 공지 작성</p>
      <input
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        required
      />
      <textarea
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
        placeholder="내용"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        required
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="accent-primary"
        />
        상단 고정
      </label>
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={createNotice.isPending || !title.trim() || !body.trim()}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {createNotice.isPending ? "등록 중..." : "등록"}
        </button>
      </div>
    </form>
  );
}

export default function StaffNoticesTab() {
  const { user } = useAuthStore();
  const { data: notices = [], isLoading } = useStaffNotices();
  const isAdmin = isAdminOrSysadmin(user);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">운영진 공지</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus size={15} />
          공지 작성
        </button>
      </div>

      {showForm && <CreateNoticeForm onClose={() => setShowForm(false)} />}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : notices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">등록된 공지가 없습니다.</p>
          <p className="mt-1 text-xs text-muted-foreground">공지 작성 버튼으로 첫 공지를 남겨보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => (
            <NoticeCard
              key={notice.id}
              notice={notice}
              currentUserId={user?.id ?? ""}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}

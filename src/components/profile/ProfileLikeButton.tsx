"use client";

import { useState } from "react";
import { Heart, Users } from "lucide-react";
import { useProfileLikes } from "@/features/profile/useProfileLikes";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  profileId: string;
  isOwner: boolean;
}

export default function ProfileLikeButton({ profileId, isOwner }: Props) {
  const viewer = useAuthStore((s) => s.user);
  const { count, likedByMe, likes, toggle } = useProfileLikes(profileId);
  const [openModal, setOpenModal] = useState(false);

  function handleClick() {
    if (!viewer) {
      toast.message("로그인 후 좋아요를 누를 수 있어요.");
      return;
    }
    if (viewer.id === profileId) {
      toast.message("본인 프로필에는 좋아요를 누를 수 없어요.");
      return;
    }
    toggle.mutate();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={!viewer || viewer.id === profileId}
        title={!viewer ? "로그인 후 좋아요를 누를 수 있어요." : likedByMe ? "좋아요 취소" : "좋아요"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          likedByMe
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "border-border bg-card text-muted-foreground hover:border-rose-200 hover:text-rose-600"
        }`}
        aria-pressed={likedByMe}
      >
        <Heart size={14} className={likedByMe ? "fill-rose-500 text-rose-500" : ""} />
        <span>{count}</span>
      </button>

      {isOwner && count > 0 && (
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Users size={12} />
                누가 눌렀는지 보기
              </button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>좋아요 {count}명</DialogTitle>
            </DialogHeader>
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {likes
                .slice()
                .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
                .map((l) => (
                  <li key={l.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                    <span className="font-medium">{l.likerName ?? "이름 미상"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {l.createdAt ? new Date(l.createdAt).toLocaleDateString("ko-KR") : ""}
                    </span>
                  </li>
                ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

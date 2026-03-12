import { User, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { Comment } from "@/types";

interface Props {
  comments: Comment[];
  currentUserId?: string;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
}

export default function CommentList({ comments, currentUserId, isAdmin, onDelete }: Props) {
  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div key={comment.id} className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <User size={14} />
              </div>
              <span className="text-sm font-medium">{comment.authorName}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(comment.createdAt)}
              </span>
            </div>
            {(currentUserId === comment.authorId || isAdmin) && onDelete && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={12} />
                삭제
              </button>
            )}
          </div>
          <p className="mt-2 text-sm">{comment.content}</p>
        </div>
      ))}
      {comments.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 댓글이 없습니다.
        </p>
      )}
    </div>
  );
}

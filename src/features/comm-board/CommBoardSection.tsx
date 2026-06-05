"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircleQuestion, Plus, Lock, ChevronRight } from "lucide-react";
import { commBoardsApi } from "@/lib/bkend";
import type { CommBoard, CommContextType, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CommBoardDialog from "./CommBoardDialog";

interface Props {
  contextType: CommContextType;
  contextId: string;
  activityProgressId?: string;
  week?: number;
  user: User | null;
}

export default function CommBoardSection({
  contextType,
  contextId,
  activityProgressId,
  week,
  user,
}: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["comm-boards", contextType, contextId, activityProgressId ?? ""];

  const { data: boards = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await commBoardsApi.listByContext(contextType, contextId, activityProgressId);
      return (res.data as CommBoard[]).sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold">
          <MessageCircleQuestion size={13} /> 소통 보드 ({boards.length})
        </h4>
        {user && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-[11px]"
            onClick={() => setDialogOpen(true)}
          >
            <Plus size={11} /> 보드 만들기
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-[11px] text-muted-foreground">불러오는 중…</p>
      ) : boards.length === 0 ? (
        <p className="rounded border border-dashed bg-muted/20 px-2 py-3 text-center text-[11px] text-muted-foreground">
          아직 소통 보드가 없습니다.{user ? " '보드 만들기'로 질문/답변 보드를 열어보세요." : ""}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/boards/${b.id}`}
                className="flex items-center justify-between gap-2 rounded border px-2.5 py-2 text-xs transition hover:border-primary/40 hover:bg-accent/40"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {b.status === "closed" && <Lock size={11} className="shrink-0 text-muted-foreground" />}
                  <span className="truncate font-medium">{b.title}</span>
                  {b.allowGuest && (
                    <Badge variant="outline" className="text-[9px]">게스트</Badge>
                  )}
                </span>
                <ChevronRight size={13} className="shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {dialogOpen && user && (
        <CommBoardDialog
          contextType={contextType}
          contextId={contextId}
          activityProgressId={activityProgressId}
          week={week}
          ownerId={user.id}
          ownerName={user.name}
          onClose={() => setDialogOpen(false)}
          onSaved={() => queryClient.invalidateQueries({ queryKey })}
        />
      )}
    </div>
  );
}

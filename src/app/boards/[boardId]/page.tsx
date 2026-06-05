"use client";

import { useParams } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import CommBoardDetail from "@/features/comm-board/CommBoardDetail";

export default function BoardPage() {
  const params = useParams();
  const boardId = String(params.boardId);
  const { user } = useAuthStore();
  return <CommBoardDetail boardId={boardId} user={user} />;
}

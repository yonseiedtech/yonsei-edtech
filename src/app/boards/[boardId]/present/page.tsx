"use client";

import { useParams } from "next/navigation";
import CommBoardPresent from "@/features/comm-board/CommBoardPresent";

export default function BoardPresentPage() {
  const params = useParams();
  return <CommBoardPresent boardId={String(params.boardId)} />;
}

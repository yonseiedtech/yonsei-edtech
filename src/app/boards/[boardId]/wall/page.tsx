"use client";

import { useParams } from "next/navigation";
import WallBoard from "@/features/comm-board/WallBoard";

/** Padlet 스타일 실시간 담벼락 — 수강생 화면 */
export default function BoardWallPage() {
  const params = useParams();
  return <WallBoard boardId={String(params.boardId)} variant="wall" />;
}

"use client";

import { useParams } from "next/navigation";
import WallBoard from "@/features/comm-board/WallBoard";

/**
 * 발표(프로젝터) 화면 — 큰 제목 + 참여 QR + 실시간 담벼락.
 * 월 뷰와 동일한 인터랙션(질문/답변 추가·수정·삭제, 해결 표시)을 모두 지원한다.
 */
export default function BoardPresentPage() {
  const params = useParams();
  return <WallBoard boardId={String(params.boardId)} variant="present" />;
}

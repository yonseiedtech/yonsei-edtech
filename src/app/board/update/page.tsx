"use client";

import { Rocket } from "lucide-react";
import CategoryBoardPage from "@/features/board/CategoryBoardPage";

/**
 * 업데이트 게시판 (Sprint 67-AL)
 *
 * 매일 단위 서비스 작업 내용을 게시글로 기록 — 운영자가 사용자에게 변경사항을 투명하게 공유.
 * 작성 권한: 운영진 이상 (minWriteRole=staff)
 */
export default function UpdateBoardPage() {
  return (
    <CategoryBoardPage
      category="update"
      title="업데이트 게시판"
      description="서비스에 매일 어떤 변경·개선이 일어나고 있는지 운영진이 공유합니다."
      icon={<Rocket size={24} className="text-primary" />}
      minWriteRole="staff"
    />
  );
}

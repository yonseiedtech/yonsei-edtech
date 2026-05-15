"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import { DirectoryContent } from "@/app/directory/page";

/**
 * 운영 콘솔 — 연락망.
 * `/directory` 와 동일한 본체(DirectoryContent)를 콘솔 변형으로 렌더 —
 * 콘솔 셸(사이드바·max-w-7xl 컨테이너) 안에서 ConsolePageHeader 와
 * 외곽 컨테이너 없는 레이아웃으로 표시.
 */
export default function ConsoleDirectoryPage() {
  return (
    <AuthGuard>
      <DirectoryContent variant="console" />
    </AuthGuard>
  );
}

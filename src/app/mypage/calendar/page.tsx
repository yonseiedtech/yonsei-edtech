"use client";

import AuthGuard from "@/features/auth/AuthGuard";
import CalendarPage from "@/app/calendar/page";

/**
 * 내 대학원 생활 > 캘린더
 *
 * 기존 공개 학술 캘린더(/calendar)를 마이페이지 컨텍스트에서도 보여준다.
 * 동일 컴포넌트를 재사용해 데이터 일관성 유지 + UI 분기 없음.
 */
export default function MyCalendarPage() {
  return (
    <AuthGuard>
      <CalendarPage />
    </AuthGuard>
  );
}

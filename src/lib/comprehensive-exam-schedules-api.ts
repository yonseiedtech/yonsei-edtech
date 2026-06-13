// 종합시험 일정 API — comprehensive_exam_schedules 컬렉션 (사이클 93)
//
// 운영진이 학기별 실제 종합시험 일정(examDate)을 입력. 회원은 read 만.
// ComprehensiveExamCountdown 위젯이 list() 로 일정을 조회해 본인 응시 학기와 매칭한다.
// firestore.rules: read = 인증 회원, write = staff 이상.

import { dataApi } from "./bkend";
import type { ComprehensiveExamSchedule } from "@/types/comprehensive-exam-schedule";

export const comprehensiveExamSchedulesApi = {
  /** 전체 일정 (최근 시험일 우선) */
  list: () =>
    dataApi.list<ComprehensiveExamSchedule>("comprehensive_exam_schedules", {
      sort: "examDate:desc",
      limit: 50,
    }),
  /** 일정 등록/수정 — 문서 id = `${year}-${term}` (멱등) */
  upsert: (id: string, data: Record<string, unknown>) =>
    dataApi.upsert<ComprehensiveExamSchedule>(
      "comprehensive_exam_schedules",
      id,
      data,
    ),
  delete: (id: string) => dataApi.delete("comprehensive_exam_schedules", id),
};

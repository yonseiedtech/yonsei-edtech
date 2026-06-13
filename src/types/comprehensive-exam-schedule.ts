// 종합시험 일정 (comprehensive_exam_schedules) — 운영진 입력 (사이클 93)
//
// 기존 ComprehensiveExamRecord(courses.ts)는 회원 본인의 응시 계획(plannedYear/plannedTerm,
// 정확한 시험일 없음)이다. 본 타입은 운영진이 입력하는 "학기별 실제 종합시험 일정"으로,
// ComprehensiveExamCountdown 위젯이 plannedYear/term 과 매칭해 정확한 D-day 를 계산한다.
//
// 매칭되는 일정이 없으면(운영진 입력 전) 위젯은 비노출 — "운영진이 일정을 입력하기 전까지
// 영역이 안 보이도록" 하는 사용자 요구 반영.

import type { SemesterTerm } from "./courses";

export interface ComprehensiveExamSchedule {
  /** 문서 id (보통 `${year}-${term}`) */
  id: string;
  year: number;
  term: SemesterTerm;
  /** 실제 종합시험 시행일 (YYYY-MM-DD) */
  examDate: string;
  /** 응시 신청 시작/마감 (YYYY-MM-DD, 선택) */
  applicationStart?: string;
  applicationEnd?: string;
  /** 시험 장소 (선택) */
  location?: string;
  /** 안내/유의사항 (선택) */
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** year/term → 문서 id (멱등 upsert 앵커) */
export function examScheduleId(year: number, term: SemesterTerm): string {
  return `${year}-${term}`;
}

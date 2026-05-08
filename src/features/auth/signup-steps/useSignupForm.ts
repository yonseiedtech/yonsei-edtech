"use client";

import { useCallback } from "react";
import { useForm, type UseFormReturn, type Path } from "react-hook-form";
import type { EnrollmentStatus, SchoolLevel } from "@/types";

/**
 * 회원가입 폼 값 — 기존 SignupForm.tsx의 SignupData를 외부에서 공유 가능하도록 export.
 */
export interface SignupFormValues {
  username: string;
  name: string;
  /** 가입 이메일 — @yonsei.ac.kr 만 허용 */
  email: string;
  /** 연락용 이메일 (선택) — 일반 메일도 가능 */
  contactEmail: string;
  phone: string;
  birthDate: string;
  password: string;
  passwordConfirm: string;
  generation: string;
  enrollmentYear: string;
  enrollmentHalf: string;
  /** 누적학기 (휴학 제외, 실제 다닌 학기 수) — Sprint 67 */
  accumulatedSemesters: string;
  field: string;
  /** 관심 키워드 — Sprint 67 (Step 3 키워드 선택 UI) */
  researchInterests: string[];
  /** 연구 주제 (관심 연구 분야 자유 입력) — Sprint 67 */
  researchTopic: string;
  activity: string;
  affiliation1: string;
  affiliation2: string;
  /** 학교 교사 — 소속 교육청 (Sprint 67 회원가입 반영) */
  affiliationOffice: string;
  /** 학교 교사 — 학교급 (Sprint 67 회원가입 반영) */
  schoolLevel: SchoolLevel | "";
  position: string;
  corporateDuty: string;
  researcherTitle: string;
  researcherDuty: string;
  publicTitle: string;
  publicDuty: string;
  freelancerNotes: string;
  leaveStartYear: string;
  leaveStartHalf: string;
  returnYear: string;
  returnHalf: string;
  thesisTitle: string;
  graduationYear: string;
  graduationMonth: string;
  securityQuestionSelect: string;
  securityQuestionCustom: string;
  securityAnswer: string;
  undergraduateUniversity: string;
  undergraduateCollege: string;
  undergraduateMajor1: string;
  undergraduateMajor1IsEducation: boolean;
  undergraduateMajor2: string;
  undergraduateMajor2IsEducation: boolean;
}

export type SignupStep = 1 | 2 | 3 | 4;

const SECURITY_QUESTIONS_DEFAULT = "첫 반려동물 이름";

/**
 * Step 1 통합 (Sprint 67): 계정 정보 + 입학 시점 + 계정 보안 한 단계로 모음.
 * 기존 5단계 → 4단계 로 단순화.
 */
const STEP_FIELDS_BASE: Record<1 | 2 | 3, (keyof SignupFormValues)[]> = {
  1: [
    "username",
    "name",
    "email",
    "contactEmail",
    "phone",
    "birthDate",
    "enrollmentYear",
    "enrollmentHalf",
    "accumulatedSemesters",
    "password",
    "passwordConfirm",
    "securityQuestionSelect",
    "securityAnswer",
  ],
  2: [
    "undergraduateUniversity",
    "undergraduateCollege",
    "undergraduateMajor1",
  ],
  3: ["activity"], // Sprint 67: 직업/활동 유형 필수
};

export interface UseSignupFormResult {
  form: UseFormReturn<SignupFormValues>;
  validateStep: (
    step: 1 | 2 | 3,
    enrollmentStatus: EnrollmentStatus,
  ) => Promise<boolean>;
}

export function useSignupForm(
  defaultValues?: Partial<SignupFormValues>,
): UseSignupFormResult {
  const form = useForm<SignupFormValues>({
    defaultValues: {
      securityQuestionSelect: SECURITY_QUESTIONS_DEFAULT,
      ...defaultValues,
    },
  });

  const validateStep = useCallback(
    async (
      step: 1 | 2 | 3,
      enrollmentStatus: EnrollmentStatus,
    ): Promise<boolean> => {
      const baseFields = [...STEP_FIELDS_BASE[step]];
      // Step 1 — 직접 입력 보안 질문은 securityQuestionCustom 추가 검증 (Sprint 67 통합 후)
      if (step === 1) {
        const select = form.getValues("securityQuestionSelect");
        if (select === "직접 입력") {
          baseFields.push("securityQuestionCustom");
        }
      }
      // Step 2 학적 정보 조건부 분기 (휴학·졸업)
      if (step === 2) {
        if (enrollmentStatus === "on_leave") {
          baseFields.push(
            "leaveStartYear",
            "leaveStartHalf",
            "returnYear",
            "returnHalf",
          );
        } else if (enrollmentStatus === "graduated") {
          baseFields.push(
            "thesisTitle",
            "graduationYear",
            "graduationMonth",
          );
        }
      }
      if (baseFields.length === 0) return true;
      return await form.trigger(baseFields as Path<SignupFormValues>[]);
    },
    [form],
  );

  return { form, validateStep };
}

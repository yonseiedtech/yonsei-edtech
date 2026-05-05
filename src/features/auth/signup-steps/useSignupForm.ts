"use client";

import { useCallback } from "react";
import { useForm, type UseFormReturn, type Path } from "react-hook-form";
import type { EnrollmentStatus } from "@/types";

/**
 * 회원가입 폼 값 — 기존 SignupForm.tsx의 SignupData를 외부에서 공유 가능하도록 export.
 */
export interface SignupFormValues {
  username: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
  passwordConfirm: string;
  generation: string;
  enrollmentYear: string;
  enrollmentHalf: string;
  field: string;
  activity: string;
  affiliation1: string;
  affiliation2: string;
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

export type SignupStep = 1 | 2 | 3 | 4 | 5;

const SECURITY_QUESTIONS_DEFAULT = "첫 반려동물 이름";

const STEP_FIELDS_BASE: Record<1 | 2 | 3 | 4, (keyof SignupFormValues)[]> = {
  1: ["username", "name", "email", "phone", "birthDate"],
  2: [
    "enrollmentYear",
    "enrollmentHalf",
    "undergraduateUniversity",
    "undergraduateCollege",
    "undergraduateMajor1",
  ],
  3: ["password", "passwordConfirm", "securityQuestionSelect", "securityAnswer"],
  4: [], // 모두 선택값
};

export interface UseSignupFormResult {
  form: UseFormReturn<SignupFormValues>;
  validateStep: (
    step: 1 | 2 | 3 | 4,
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
      step: 1 | 2 | 3 | 4,
      enrollmentStatus: EnrollmentStatus,
    ): Promise<boolean> => {
      const baseFields = [...STEP_FIELDS_BASE[step]];
      // Step 2 조건부 분기
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
      // Step 3 — 직접 입력 보안 질문은 securityQuestionCustom 추가 검증
      if (step === 3) {
        const select = form.getValues("securityQuestionSelect");
        if (select === "직접 입력") {
          baseFields.push("securityQuestionCustom");
        }
      }
      if (baseFields.length === 0) return true;
      return await form.trigger(baseFields as Path<SignupFormValues>[]);
    },
    [form],
  );

  return { form, validateStep };
}

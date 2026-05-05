"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { OccupationType } from "@/types";
import { OCCUPATION_LABELS } from "@/types";
import type { SignupFormValues } from "./useSignupForm";

const ACTIVITY_OPTIONS: { value: "" | OccupationType; label: string }[] = [
  { value: "", label: "선택 안 함" },
  { value: "teacher", label: OCCUPATION_LABELS.teacher },
  { value: "corporate", label: OCCUPATION_LABELS.corporate },
  { value: "researcher", label: OCCUPATION_LABELS.researcher },
  { value: "public", label: OCCUPATION_LABELS.public },
  { value: "freelancer", label: OCCUPATION_LABELS.freelancer },
  { value: "other", label: OCCUPATION_LABELS.other },
];

interface Step4Props {
  form: UseFormReturn<SignupFormValues>;
}

export default function Step4Optional({ form }: Step4Props) {
  const { register, watch } = form;
  const watchedActivity = (watch("activity") || "") as "" | OccupationType;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">선택 정보</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          관심 분야·소속·직업 정보입니다. 선택사항이니 비워두셔도 됩니다.
        </p>
      </header>

      {/* 관심 분야 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">관심 분야</label>
        <Input {...register("field")} placeholder="예: 학습과학, 에듀테크, 교수설계 등" />
      </div>

      {/* 직업/활동 유형 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">직업 / 활동 유형</label>
        <select
          {...register("activity")}
          className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
        >
          {ACTIVITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 직업유형별 동적 필드 */}
      {watchedActivity && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">소속 정보</p>
          <div>
            <label className="mb-1 block text-xs font-medium">소속</label>
            <Input {...register("affiliation1")} placeholder="회사명/학교/기관명" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">부서/세부 영역</label>
            <Input {...register("affiliation2")} placeholder="예: 교수설계팀, 영어과 등" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">직책/직위</label>
            <Input {...register("position")} placeholder="예: 책임연구원, 부장" />
          </div>

          {/* 직업유형별 추가 필드 */}
          {watchedActivity === "corporate" && (
            <div>
              <label className="mb-1 block text-xs font-medium">담당업무</label>
              <Input {...register("corporateDuty")} placeholder="담당 업무 요약" />
            </div>
          )}
          {watchedActivity === "researcher" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium">연구원 직책</label>
                <Input {...register("researcherTitle")} placeholder="예: 책임연구원" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">담당업무</label>
                <Input {...register("researcherDuty")} placeholder="담당 업무 요약" />
              </div>
            </>
          )}
          {watchedActivity === "public" && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium">공무원 직급</label>
                <Input {...register("publicTitle")} placeholder="예: 사무관" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">담당업무</label>
                <Input {...register("publicDuty")} placeholder="담당 업무 요약" />
              </div>
            </>
          )}
          {watchedActivity === "freelancer" && (
            <div>
              <label className="mb-1 block text-xs font-medium">비고</label>
              <Input {...register("freelancerNotes")} placeholder="활동 영역 등" />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

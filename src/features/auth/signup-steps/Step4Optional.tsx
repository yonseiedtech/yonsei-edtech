"use client";

/**
 * 회원가입 Step 3 (구 Step 4 / Sprint 67 재구성):
 *  - 직업/활동 유형 (필수)
 *  - 학교 교사 → 학교급/교육청/학교명 분리 입력
 *  - 직업유형별 동적 추가 필드
 *  - 관심 분야 키워드 (선택, 30개 추천 + 직접 추가)
 *  - 관심 연구 분야(field) 자유 입력
 *  - 연구 주제 자유 입력
 */

import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OccupationType, SchoolLevel } from "@/types";
import { OCCUPATION_LABELS, SCHOOL_LEVEL_LABELS } from "@/types";
import OfficeOfEducationField from "@/components/ui/office-of-education-field";
import KeywordMultiSelect, {
  EDU_TECH_KEYWORDS,
} from "@/components/ui/keyword-multi-select";
import type { SignupFormValues } from "./useSignupForm";

const ACTIVITY_OPTIONS: { value: "" | OccupationType; label: string }[] = [
  { value: "", label: "선택하세요" },
  { value: "teacher", label: OCCUPATION_LABELS.teacher },
  { value: "corporate", label: OCCUPATION_LABELS.corporate },
  { value: "researcher", label: OCCUPATION_LABELS.researcher },
  { value: "public", label: OCCUPATION_LABELS.public },
  { value: "freelancer", label: OCCUPATION_LABELS.freelancer },
  { value: "other", label: OCCUPATION_LABELS.other },
];

const SCHOOL_LEVEL_OPTIONS: { value: SchoolLevel | ""; label: string }[] = [
  { value: "", label: "선택하세요" },
  { value: "kindergarten", label: SCHOOL_LEVEL_LABELS.kindergarten },
  { value: "elementary", label: SCHOOL_LEVEL_LABELS.elementary },
  { value: "middle", label: SCHOOL_LEVEL_LABELS.middle },
  { value: "high", label: SCHOOL_LEVEL_LABELS.high },
];

interface Step4Props {
  form: UseFormReturn<SignupFormValues>;
}

export default function Step4Optional({ form }: Step4Props) {
  const { register, control, setValue, formState: { errors } } = form;
  const watchedActivity = (useWatch({ control, name: "activity" }) ||
    "") as "" | OccupationType;
  const watchedOffice = useWatch({ control, name: "affiliationOffice" }) ?? "";
  const watchedInterests =
    (useWatch({ control, name: "researchInterests" }) as string[] | undefined) ?? [];

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">직업·관심 분야</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          학회 데이터 기반 활동 기획·매칭에 활용됩니다. 직업 유형은 필수입니다.
        </p>
      </header>

      {/* 직업 / 활동 유형 (필수) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          직업 / 활동 유형 <span className="text-destructive">*</span>
        </label>
        <select
          {...register("activity", { required: "직업/활동 유형을 선택하세요" })}
          className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
        >
          {ACTIVITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.activity && (
          <p className="mt-1 text-xs text-destructive">{errors.activity.message}</p>
        )}
      </div>

      {/* 학교 교사 — 학교급/교육청/학교명 분리 입력 */}
      {watchedActivity === "teacher" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">학교 정보</p>

          <div>
            <label className="mb-1 block text-xs font-medium">학교급</label>
            <select
              {...register("schoolLevel")}
              className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
            >
              {SCHOOL_LEVEL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              유아교육 / 초·중·고 — 전공 네트워킹 Map 학교급 매칭에 활용.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">소속 교육청</label>
            <OfficeOfEducationField
              value={watchedOffice}
              onChange={(next) =>
                setValue("affiliationOffice", next, { shouldDirty: true })
              }
              compact
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">소속 학교</label>
            <Input
              {...register("affiliation1")}
              placeholder="예: ○○초등학교"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium">담당 과목 / 학년</label>
            <Input
              {...register("position")}
              placeholder="예: 5학년 담임 / 영어"
            />
          </div>
        </div>
      )}

      {/* 학교 교사 외 직업유형 — 기존 affiliation1/2 + position */}
      {watchedActivity && watchedActivity !== "teacher" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">소속 정보</p>
          <div>
            <label className="mb-1 block text-xs font-medium">소속</label>
            <Input
              {...register("affiliation1")}
              placeholder="회사명 / 기관명"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">부서/세부 영역</label>
            <Input {...register("affiliation2")} placeholder="예: 교수설계팀" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">직책/직위</label>
            <Input {...register("position")} placeholder="예: 책임연구원, 부장" />
          </div>

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

      {/* 관심 키워드 (선택, 30개 추천 + 직접 추가) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">관심 키워드</label>
        <p className="mb-2 text-xs text-muted-foreground">
          교육공학 관련 키워드를 선택하거나 직접 추가하세요. 학회 활동·세미나 매칭에 활용됩니다.
        </p>
        <KeywordMultiSelect
          value={watchedInterests}
          onChange={(next) =>
            setValue("researchInterests", next, { shouldDirty: true })
          }
          suggestions={EDU_TECH_KEYWORDS}
          placeholder="원하는 키워드가 없으면 추가"
          max={15}
        />
      </div>

      {/* 관심 연구 분야 (자유 입력) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">관심 연구 분야</label>
        <Input
          {...register("field")}
          placeholder="예: 학습과학, 에듀테크, 교수설계 등"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          본인의 학문적·실무적 관심 영역을 한 줄로 요약해 주세요.
        </p>
      </div>

      {/* 연구 주제 (자유 입력) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">연구 주제</label>
        <Textarea
          {...register("researchTopic")}
          placeholder="현재 진행 중이거나 관심 있는 연구 주제 (예: AI 튜터의 학습 동기 영향)"
          rows={3}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          진행 중·관심 연구 주제 — 학술 매칭·논문 추천에 활용 (선택).
        </p>
      </div>
    </section>
  );
}

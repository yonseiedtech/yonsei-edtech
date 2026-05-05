"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EnrollmentStatus } from "@/types";
import { ENROLLMENT_STATUS_LABELS } from "@/types";
import type { SignupFormValues } from "./useSignupForm";

const ENROLLMENT_OPTIONS: EnrollmentStatus[] = [
  "enrolled",
  "on_leave",
  "graduated",
  "applicant",
  "external",
];

const ENROLLMENT_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2026 - i);
const LEAVE_YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => 2026 - i + 4);
const RETURN_YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => 2026 + i - 3);
const GRADUATION_YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => 2028 - i);

interface Step2Props {
  form: UseFormReturn<SignupFormValues>;
  enrollmentStatus: EnrollmentStatus;
  setEnrollmentStatus: (s: EnrollmentStatus) => void;
}

export default function Step2Academic({ form, enrollmentStatus, setEnrollmentStatus }: Step2Props) {
  const { register, formState: { errors } } = form;
  const showAcademic = enrollmentStatus === "enrolled" || enrollmentStatus === "on_leave";

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">학적 정보</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          신분 유형과 학부·입학 정보를 입력해 주세요.
        </p>
      </header>

      {/* 신분 유형 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">신분 유형 <span className="text-destructive">*</span></label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ENROLLMENT_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setEnrollmentStatus(opt)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                enrollmentStatus === opt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {ENROLLMENT_STATUS_LABELS[opt]}
            </button>
          ))}
        </div>
      </div>

      {/* 학부 정보 */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-medium">학부 정보 <span className="text-destructive">*</span></p>
        <div>
          <label className="mb-1 block text-xs font-medium">대학교</label>
          <Input {...register("undergraduateUniversity", { required: "대학교를 입력하세요" })} placeholder="예: 연세대학교" />
          {errors.undergraduateUniversity && <p className="mt-1 text-xs text-destructive">{errors.undergraduateUniversity.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">단과대</label>
          <Input {...register("undergraduateCollege", { required: "단과대를 입력하세요" })} placeholder="예: 교육과학대학" />
          {errors.undergraduateCollege && <p className="mt-1 text-xs text-destructive">{errors.undergraduateCollege.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">전공 1</label>
          <Input {...register("undergraduateMajor1", { required: "전공을 입력하세요" })} placeholder="예: 교육학과" />
          <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" {...register("undergraduateMajor1IsEducation")} />
            교육 관련 전공
          </label>
          {errors.undergraduateMajor1 && <p className="mt-1 text-xs text-destructive">{errors.undergraduateMajor1.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">전공 2 (선택)</label>
          <Input {...register("undergraduateMajor2")} placeholder="복수전공/부전공이 있다면 입력" />
          <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" {...register("undergraduateMajor2IsEducation")} />
            교육 관련 전공
          </label>
        </div>
      </div>

      {/* 입학 시점 (재학·휴학) */}
      {showAcademic && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">입학 시점 <span className="text-destructive">*</span></label>
          <div className="flex gap-2">
            <select
              {...register("enrollmentYear", { required: "입학 연도를 선택하세요" })}
              className="rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="">연도</option>
              {ENROLLMENT_YEAR_OPTIONS.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
            <select
              {...register("enrollmentHalf", { required: "반기를 선택하세요" })}
              className="rounded-lg border bg-card px-3 py-2 text-sm"
            >
              <option value="">반기</option>
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </div>
          {(errors.enrollmentYear || errors.enrollmentHalf) && (
            <p className="mt-1 text-xs text-destructive">입학 시점을 모두 선택하세요.</p>
          )}
        </div>
      )}

      {/* 휴학 분기 */}
      {enrollmentStatus === "on_leave" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">휴학 정보 <span className="text-destructive">*</span></p>
          <div className="grid grid-cols-2 gap-2">
            <select {...register("leaveStartYear", { required: true })} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="">휴학 연도</option>
              {LEAVE_YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select {...register("leaveStartHalf", { required: true })} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="">반기</option>
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
            <select {...register("returnYear", { required: true })} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="">복학 연도</option>
              {RETURN_YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select {...register("returnHalf", { required: true })} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="">반기</option>
              <option value="1">1학기</option>
              <option value="2">2학기</option>
            </select>
          </div>
        </div>
      )}

      {/* 졸업 분기 */}
      {enrollmentStatus === "graduated" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">졸업 정보 <span className="text-destructive">*</span></p>
          <Input {...register("thesisTitle", { required: "학위논문 제목을 입력하세요" })} placeholder="학위논문 제목" />
          <div className="grid grid-cols-2 gap-2">
            <select {...register("graduationYear", { required: true })} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="">졸업 연도</option>
              {GRADUATION_YEAR_OPTIONS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
            <select {...register("graduationMonth", { required: true })} className="rounded-lg border bg-card px-3 py-2 text-sm">
              <option value="">월</option>
              <option value="2">2월</option>
              <option value="8">8월</option>
            </select>
          </div>
        </div>
      )}
    </section>
  );
}

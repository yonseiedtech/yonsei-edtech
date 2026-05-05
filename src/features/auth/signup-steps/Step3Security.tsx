"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { SignupFormValues } from "./useSignupForm";

const SECURITY_QUESTIONS = [
  "첫 반려동물 이름",
  "출신 초등학교",
  "좋아하는 책",
  "어머니 성함",
  "첫 직장 이름",
  "직접 입력",
];

interface Step3Props {
  form: UseFormReturn<SignupFormValues>;
}

export default function Step3Security({ form }: Step3Props) {
  const { register, watch, formState: { errors } } = form;
  const watchedPassword = watch("password");
  const watchedSecurityQ = watch("securityQuestionSelect");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">계정 보안</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          비밀번호와 비밀번호 찾기용 보안 질문을 설정해 주세요.
        </p>
      </header>

      {/* 비밀번호 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          비밀번호 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Input
            {...register("password", {
              required: "비밀번호를 입력하세요",
              minLength: { value: 8, message: "8자 이상 입력하세요" },
              validate: (v) => /(?=.*[a-zA-Z])(?=.*\d)/.test(v) || "영문과 숫자를 모두 포함해야 합니다",
            })}
            type={showPassword ? "text" : "password"}
            placeholder="8자 이상, 영문+숫자 포함"
            className={cn("pr-10", errors.password && "border-destructive")}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
      </div>

      {/* 비밀번호 확인 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          비밀번호 확인 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Input
            {...register("passwordConfirm", {
              required: "비밀번호를 한 번 더 입력하세요",
              validate: (v) => v === watchedPassword || "비밀번호가 일치하지 않습니다",
            })}
            type={showPasswordConfirm ? "text" : "password"}
            placeholder="위 비밀번호와 동일하게"
            className={cn("pr-10", errors.passwordConfirm && "border-destructive")}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPasswordConfirm((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label={showPasswordConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
          >
            {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.passwordConfirm && <p className="mt-1 text-xs text-destructive">{errors.passwordConfirm.message}</p>}
      </div>

      {/* 보안 질문 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          보안 질문 <span className="text-destructive">*</span>
        </label>
        <select
          {...register("securityQuestionSelect", { required: true })}
          className="w-full rounded-lg border bg-card px-3 py-2 text-sm"
        >
          {SECURITY_QUESTIONS.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        {watchedSecurityQ === "직접 입력" && (
          <Input
            {...register("securityQuestionCustom", { required: "직접 입력 시 질문을 입력하세요" })}
            placeholder="질문 내용을 입력"
            className="mt-2"
          />
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          보안 질문 답변 <span className="text-destructive">*</span>
        </label>
        <Input
          {...register("securityAnswer", { required: "답변을 입력하세요" })}
          placeholder="답변 (대소문자 구분 없음)"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          비밀번호 찾기 시 본인 확인에 사용됩니다. 안전하게 보관해 주세요.
        </p>
        {errors.securityAnswer && <p className="mt-1 text-xs text-destructive">{errors.securityAnswer.message}</p>}
      </div>
    </section>
  );
}

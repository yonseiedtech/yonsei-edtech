"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { UseFormReturn } from "react-hook-form";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignupFormValues } from "./useSignupForm";

const ENROLLMENT_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2026 - i);
const SECURITY_QUESTIONS = [
  "첫 반려동물 이름",
  "출신 초등학교",
  "좋아하는 책",
  "어머니 성함",
  "첫 직장 이름",
  "직접 입력",
];

interface Step1Props {
  form: UseFormReturn<SignupFormValues>;
}

export default function Step1AccountInfo({ form }: Step1Props) {
  const { register, watch, setValue, formState: { errors } } = form;

  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const birthMonthRef = useRef<HTMLInputElement>(null);
  const birthDayRef = useRef<HTMLInputElement>(null);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const watchedUsername = watch("username") || "";
  const watchedPassword = watch("password");
  const watchedSecurityQ = watch("securityQuestionSelect");
  const isStudentIdFormatValid = /^\d{10}$/.test(watchedUsername);

  // birthDate 통합 동기화
  useEffect(() => {
    if (birthYear && birthMonth && birthDay) {
      const v = `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`;
      setValue("birthDate", v, { shouldValidate: true });
    }
  }, [birthYear, birthMonth, birthDay, setValue]);

  function parseEnrollmentFromStudentId(sid: string) {
    if (sid.length < 7) return;
    const year = sid.slice(0, 4);
    const code = sid.slice(4, 7);
    if (/^\d{4}$/.test(year)) {
      const yearNum = Number(year);
      if (yearNum >= 2000 && yearNum <= 2030) {
        setValue("enrollmentYear", year);
      }
    }
    if (code === "431") setValue("enrollmentHalf", "1");
    else if (code === "432") setValue("enrollmentHalf", "2");
  }

  async function checkUsernameAvailability() {
    if (!watchedUsername || !/^\d{10}$/.test(watchedUsername)) {
      toast.error("학번은 숫자 10자리로 입력하세요.");
      return;
    }
    setCheckingUsername(true);
    try {
      parseEnrollmentFromStudentId(watchedUsername);
      const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(watchedUsername)}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "확인에 실패했습니다.");
        return;
      }
      if (!data.available) {
        setUsernameAvailable(false);
        setUsernameChecked(true);
        toast.error("이미 가입된 학번입니다.", {
          action: {
            label: "비밀번호 찾기",
            onClick: () => {
              window.location.href = "/forgot-password";
            },
          },
        });
      } else {
        setUsernameAvailable(true);
        setUsernameChecked(true);
        toast.success(data.message || "사용 가능한 학번입니다.");
      }
    } catch {
      toast.error("확인에 실패했습니다.");
    } finally {
      setCheckingUsername(false);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">계정 정보</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          학번·이름·이메일 등 식별 정보를 입력해 주세요.
        </p>
      </header>

      {/* 학번 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">학번 (아이디)</label>
        <div className="flex gap-2">
          <Input
            {...register("username", {
              required: "학번을 입력하세요",
              pattern: { value: /^\d{10}$/, message: "학번은 숫자 10자리여야 합니다" },
              onChange: () => { setUsernameChecked(false); setUsernameAvailable(false); },
            })}
            inputMode="numeric"
            maxLength={10}
            placeholder="예: 2023432001"
            autoComplete="username"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={checkUsernameAvailability}
            disabled={checkingUsername || !isStudentIdFormatValid}
          >
            {checkingUsername ? <Loader2 size={14} className="animate-spin" /> : "가입 확인"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {usernameChecked
            ? usernameAvailable
              ? "✓ 사용 가능한 학번입니다."
              : (
                <span className="inline-flex flex-wrap items-center gap-1.5">
                  <span className="text-destructive">✗ 이미 가입된 학번입니다.</span>
                  <Link
                    href="/forgot-password"
                    className="font-medium text-primary hover:underline"
                  >
                    비밀번호 찾기 →
                  </Link>
                </span>
              )
            : "숫자 10자리로 입력하세요."}
        </p>
        {errors.username && (
          <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      {/* 비밀번호 + 확인 — 학번 바로 아래로 (Sprint 67 동선 개선) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          비밀번호 <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <Input
            {...register("password", {
              required: "비밀번호를 입력하세요",
              minLength: { value: 8, message: "8자 이상 입력하세요" },
              validate: (v) =>
                /(?=.*[a-zA-Z])(?=.*\d)/.test(v) || "영문과 숫자를 모두 포함해야 합니다",
            })}
            type={showPassword ? "text" : "password"}
            placeholder="8자 이상, 영문+숫자 포함"
            autoComplete="new-password"
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
            autoComplete="new-password"
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

      {/* 이름 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          이름 <span className="text-destructive">*</span>
        </label>
        <Input {...register("name", { required: "이름을 입력하세요" })} placeholder="홍길동" />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* 가입 이메일 — @yonsei.ac.kr 만 허용 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          가입 이메일 <span className="text-destructive">*</span>
        </label>
        <Input
          {...register("email", {
            required: "이메일을 입력하세요",
            pattern: {
              value: /^[^\s@]+@yonsei\.ac\.kr$/i,
              message: "@yonsei.ac.kr 메일만 가입 가능합니다",
            },
          })}
          type="email"
          placeholder="email@yonsei.ac.kr"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          연세 메일(@yonsei.ac.kr) 만 가입에 사용됩니다.
        </p>
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
      </div>

      {/* 연락용 이메일 (선택) — 일반 메일도 가능 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          연락용 이메일 <span className="text-xs text-muted-foreground">(선택)</span>
        </label>
        <Input
          {...register("contactEmail", {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "올바른 이메일 형식이 아닙니다",
            },
          })}
          type="email"
          placeholder="example@gmail.com"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          평소 자주 쓰시는 메일을 입력하면 학회 안내·뉴스레터 등이 함께 전달됩니다.
        </p>
        {errors.contactEmail && (
          <p className="mt-1 text-xs text-destructive">{errors.contactEmail.message}</p>
        )}
      </div>

      {/* 핸드폰 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          핸드폰 번호 <span className="text-destructive">*</span>
        </label>
        <Input
          {...register("phone", {
            required: "핸드폰 번호를 입력하세요",
            pattern: { value: /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, message: "올바른 핸드폰 번호를 입력하세요" },
          })}
          type="tel"
          placeholder="010-1234-5678"
        />
        {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>}
      </div>

      {/* 생년월일 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          생년월일 <span className="text-destructive">*</span>
        </label>
        <input
          type="hidden"
          {...register("birthDate", {
            required: "생년월일을 입력하세요",
            pattern: { value: /^\d{4}-\d{2}-\d{2}$/, message: "생년월일을 올바르게 입력하세요" },
          })}
        />
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="YYYY"
            value={birthYear}
            maxLength={4}
            className={cn("w-24 text-center", errors.birthDate && "border-destructive")}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setBirthYear(v);
              if (v.length === 4) birthMonthRef.current?.focus();
            }}
          />
          <span className="text-muted-foreground">년</span>
          <Input
            ref={birthMonthRef}
            inputMode="numeric"
            placeholder="MM"
            value={birthMonth}
            maxLength={2}
            className={cn("w-16 text-center", errors.birthDate && "border-destructive")}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (v.length === 2) {
                const n = Number(v);
                if (n < 1) v = "01";
                if (n > 12) v = "12";
              }
              setBirthMonth(v);
              if (v.length === 2) birthDayRef.current?.focus();
            }}
          />
          <span className="text-muted-foreground">월</span>
          <Input
            ref={birthDayRef}
            inputMode="numeric"
            placeholder="DD"
            value={birthDay}
            maxLength={2}
            className={cn("w-16 text-center", errors.birthDate && "border-destructive")}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (v.length === 2) {
                const n = Number(v);
                if (n < 1) v = "01";
                if (n > 31) v = "31";
              }
              setBirthDay(v);
            }}
          />
          <span className="text-muted-foreground">일</span>
        </div>
        {errors.birthDate && <p className="mt-1 text-xs text-destructive">{errors.birthDate.message}</p>}
      </div>

      {/* 입학 시점 — 학번 가입 확인 시 자동 채워짐 (Sprint 67: Step 2 → Step 1 이동) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          입학 시점 <span className="text-destructive">*</span>
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          학번 입력 후 &ldquo;가입 확인&rdquo; 을 누르면 학번 기반으로 자동 채워집니다.
        </p>
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

      {/* 누적 학기 — Sprint 67: 입학 시점 하단 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          누적 학기 <span className="text-destructive">*</span>
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          휴학 제외 실제 다닌 학기 수 (예: 신입생 1, 2학기 차 2). 가입 시점 기준.
        </p>
        <Input
          {...register("accumulatedSemesters", {
            required: "누적 학기를 입력하세요",
            pattern: { value: /^\d+$/, message: "숫자로 입력하세요" },
            validate: (v) => {
              const n = Number(v);
              return (n >= 1 && n <= 30) || "1~30 사이의 숫자로 입력하세요";
            },
          })}
          inputMode="numeric"
          maxLength={2}
          placeholder="예: 1, 2, 3 …"
          className="w-32"
        />
        {errors.accumulatedSemesters && (
          <p className="mt-1 text-xs text-destructive">{errors.accumulatedSemesters.message}</p>
        )}
      </div>

      {/* 비밀번호 찾기용 보안 질문 — 비밀번호 본체는 학번 바로 아래로 분리됨 */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-medium">비밀번호 찾기 정보</p>
        <p className="text-xs text-muted-foreground">
          비밀번호를 잊으셨을 때 본인 확인용으로 사용됩니다.
        </p>

        <div>
          <label className="mb-1.5 block text-xs font-medium">
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
          <label className="mb-1.5 block text-xs font-medium">
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
      </div>
    </section>
  );
}

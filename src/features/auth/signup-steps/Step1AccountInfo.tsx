"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SignupFormValues } from "./useSignupForm";

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

  const watchedUsername = watch("username") || "";
  const watchedEmail = watch("email") || "";
  const isStudentIdFormatValid = /^\d{10}$/.test(watchedUsername);
  const isYonseiEmail = /@yonsei\.ac\.kr$/i.test(watchedEmail.trim());
  const hasEmailInput = !!watchedEmail.trim();

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
        toast.error("이미 가입된 학번입니다.");
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
              : "✗ 이미 가입된 학번입니다."
            : "숫자 10자리로 입력하세요."}
        </p>
        {errors.username && (
          <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      {/* 이름 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          이름 <span className="text-destructive">*</span>
        </label>
        <Input {...register("name", { required: "이름을 입력하세요" })} placeholder="홍길동" />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {/* 이메일 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          이메일 <span className="text-destructive">*</span>
        </label>
        <Input
          {...register("email", {
            required: "이메일을 입력하세요",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "올바른 이메일 형식이 아닙니다" },
          })}
          type="email"
          placeholder="email@yonsei.ac.kr"
        />
        <p className="mt-1 text-xs text-muted-foreground">연세 메일(@yonsei.ac.kr) 권장.</p>
        {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
        {hasEmailInput && !errors.email && !isYonseiEmail && (
          <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
            연세 메일이 아닐 경우 관리자 승인 후 이용 가능합니다.
          </p>
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
    </section>
  );
}

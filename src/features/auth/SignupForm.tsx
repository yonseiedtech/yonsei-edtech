"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, ChevronDown, ChevronUp, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { authApi, profilesApi, saveTokens } from "@/lib/bkend";
import { runAllGuestLinkers } from "@/lib/guestLinker";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { UserConsents } from "@/lib/legal";
import { sha256Hex } from "@/lib/hash";

import type { EnrollmentStatus, OccupationType } from "@/types";
import { ENROLLMENT_STATUS_LABELS, OCCUPATION_LABELS } from "@/types";

// 직업유형 5분류 (PR6) — types/index.ts의 OccupationType 5분류와 1:1 일치
const ACTIVITY_OPTIONS: { value: "" | OccupationType; label: string }[] = [
  { value: "", label: "선택 안 함" },
  { value: "teacher", label: OCCUPATION_LABELS.teacher },
  { value: "corporate", label: OCCUPATION_LABELS.corporate },
  { value: "researcher", label: OCCUPATION_LABELS.researcher },
  { value: "public", label: OCCUPATION_LABELS.public },
  { value: "freelancer", label: OCCUPATION_LABELS.freelancer },
  { value: "other", label: OCCUPATION_LABELS.other },
];

/** 직업유형별 입력 필드 라벨 (placeholder 포함) */
const OCCUPATION_FIELD_LABELS: Record<
  OccupationType,
  { affiliation: string; department?: string; position?: string; title?: string; duty?: string; notes?: string }
> = {
  teacher: { affiliation: "소속 교육청/학교", department: "학교급 (초/중/고)", position: "담당 과목" },
  corporate: { affiliation: "회사명", department: "부서", position: "직책", duty: "담당업무" },
  researcher: { affiliation: "기관명", department: "부서", title: "직책", duty: "담당업무" },
  public: { affiliation: "기관명", department: "부서", title: "직책", duty: "담당업무" },
  freelancer: { affiliation: "활동분야", department: "활동업무", position: "대외직책", notes: "비고" },
  other: { affiliation: "소속", position: "직함" },
};

// 2026년 1학기 기준 누적학기 옵션 (1~10학기 + 기타/모르겠음)
const SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

// 입학 연도 옵션 (최근 15년)
const ENROLLMENT_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2026 - i);
const LEAVE_YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => 2026 - i + 4); // 2030~2011
const RETURN_YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => 2026 + i - 3); // 2023~2032
const GRADUATION_YEAR_OPTIONS = Array.from({ length: 20 }, (_, i) => 2028 - i);

const SECURITY_QUESTIONS = [
  "첫 반려동물 이름",
  "출신 초등학교",
  "좋아하는 책",
  "어머니 성함",
  "첫 직장 이름",
  "직접 입력",
];

interface SignupData {
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
  // PR6 신규: 직업유형별 세부 필드
  corporateDuty: string;
  researcherTitle: string;
  researcherDuty: string;
  publicTitle: string;
  publicDuty: string;
  freelancerNotes: string;
  // 휴학
  leaveStartYear: string;
  leaveStartHalf: string;
  returnYear: string;
  returnHalf: string;
  // 졸업
  thesisTitle: string;
  graduationYear: string;
  graduationMonth: string;
  // 보안질문
  securityQuestionSelect: string;
  securityQuestionCustom: string;
  securityAnswer: string;
  // 학부 정보 (필수)
  undergraduateUniversity: string;
  undergraduateCollege: string;
  undergraduateMajor1: string;
  undergraduateMajor1IsEducation: boolean;
  undergraduateMajor2: string;
  undergraduateMajor2IsEducation: boolean;
}

interface Props {
  onSuccess: () => void;
  defaultName?: string;
  defaultStudentId?: string;
  initialConsents?: UserConsents;
}

export default function SignupForm({ onSuccess, defaultName, defaultStudentId, initialConsents }: Props) {
  const [loading, setLoading] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<EnrollmentStatus>("enrolled");
  const [showOptional, setShowOptional] = useState(true);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const birthMonthRef = useRef<HTMLInputElement>(null);
  const birthDayRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SignupData>({
    defaultValues: {
      username: defaultStudentId || "",
      name: defaultName || "",
      securityQuestionSelect: SECURITY_QUESTIONS[0],
    },
  });

  const watchedUsername = watch("username");
  const watchedSecurityQ = watch("securityQuestionSelect");
  const watchedPassword = watch("password");
  const watchedActivity = watch("activity") as "" | OccupationType;
  const occLabels = watchedActivity ? OCCUPATION_FIELD_LABELS[watchedActivity] : null;

  // 학번에서 입학 시점 추출
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
    if (!watchedUsername || watchedUsername.length < 5) {
      toast.error("학번을 5자 이상 입력하세요.");
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

  async function onSubmit(data: SignupData) {
    if (!initialConsents) {
      toast.error("약관 동의 정보가 없습니다. 처음부터 다시 진행해주세요.");
      return;
    }
    if (!usernameChecked || !usernameAvailable) {
      toast.error("학번 가입여부 확인을 먼저 진행해주세요.");
      return;
    }

    // 보안 질문 확정
    const securityQuestion =
      data.securityQuestionSelect === "직접 입력"
        ? (data.securityQuestionCustom || "").trim()
        : data.securityQuestionSelect;
    if (!securityQuestion) {
      toast.error("보안 질문을 입력하세요.");
      return;
    }
    if (!data.securityAnswer || !data.securityAnswer.trim()) {
      toast.error("보안 질문 답변을 입력하세요.");
      return;
    }

    // 휴학 필수 분기 검증
    if (enrollmentStatus === "on_leave") {
      if (!data.leaveStartYear || !data.leaveStartHalf || !data.returnYear || !data.returnHalf) {
        toast.error("휴학/복학 정보를 모두 입력하세요.");
        return;
      }
    }
    if (enrollmentStatus === "graduated") {
      if (!data.thesisTitle || !data.graduationYear || !data.graduationMonth) {
        toast.error("졸업 정보를 모두 입력하세요.");
        return;
      }
    }

    setLoading(true);
    try {
      const securityAnswerHash = await sha256Hex(data.securityAnswer.trim().toLowerCase());

      try {
        const tokens = await authApi.signup({
          email: data.email,
          password: data.password,
          name: data.name,
        });
        saveTokens(tokens.accessToken, tokens.refreshToken);

        // role / approved는 setDoc(authApi.signup)에서 이미 설정됨.
        // Firestore Rules의 noSensitiveFieldChange()와 충돌을 피하기 위해 update payload에서 제외.
        const profileData: Record<string, unknown> = {
          username: data.username,
          name: data.name,
          email: data.email,
          memberType: enrollmentStatus === "graduated" ? "alumni" : "student",
          enrollmentStatus,
          generation: data.generation ? Number(data.generation) : 0,
          studentId: data.username || "",
          phone: data.phone || "",
          birthDate: data.birthDate || "",
          enrollmentYear: data.enrollmentYear ? Number(data.enrollmentYear) : null,
          enrollmentHalf: data.enrollmentHalf ? Number(data.enrollmentHalf) : null,
          field: data.field || "",
          privacyAgreedAt: new Date().toISOString(),
          consents: initialConsents,
          securityQuestion,
          securityAnswerHash,
          // 학부 정보 (필수)
          undergraduateUniversity: data.undergraduateUniversity.trim(),
          undergraduateCollege: data.undergraduateCollege.trim(),
          undergraduateMajor1: data.undergraduateMajor1.trim(),
          undergraduateMajor1IsEducation: !!data.undergraduateMajor1IsEducation,
          undergraduateMajor2: data.undergraduateMajor2?.trim() || "",
          undergraduateMajor2IsEducation: !!data.undergraduateMajor2IsEducation,
        };

        if (enrollmentStatus === "on_leave") {
          profileData.leaveStartYear = Number(data.leaveStartYear);
          profileData.leaveStartHalf = Number(data.leaveStartHalf);
          profileData.returnYear = Number(data.returnYear);
          profileData.returnHalf = Number(data.returnHalf);
        }
        if (enrollmentStatus === "graduated") {
          profileData.thesisTitle = data.thesisTitle;
          profileData.graduationYear = Number(data.graduationYear);
          profileData.graduationMonth = Number(data.graduationMonth) as 2 | 8;
        }

        if (data.activity) profileData.occupation = data.activity;
        if (data.affiliation1) profileData.affiliation = data.affiliation1;
        if (data.affiliation2) profileData.department = data.affiliation2;
        if (data.position) profileData.position = data.position;
        // PR6: 직업유형별 세부 필드 (해당 유형일 때만 저장)
        if (data.activity === "corporate" && data.corporateDuty) {
          profileData.corporateDuty = data.corporateDuty;
        }
        if (data.activity === "researcher") {
          if (data.researcherTitle) profileData.researcherTitle = data.researcherTitle;
          if (data.researcherDuty) profileData.researcherDuty = data.researcherDuty;
        }
        if (data.activity === "public") {
          if (data.publicTitle) profileData.publicTitle = data.publicTitle;
          if (data.publicDuty) profileData.publicDuty = data.publicDuty;
        }
        if (data.activity === "freelancer" && data.freelancerNotes) {
          profileData.freelancerNotes = data.freelancerNotes;
        }

        await profilesApi.update("me", profileData);

        // 학번/이메일 기반 게스트 레코드 일괄 연동 (참석자·신청자·수료증)
        try {
          const me = await profilesApi.get("me");
          const myId = (me as unknown as { id: string }).id;
          const result = await runAllGuestLinkers({
            userId: myId,
            userName: data.name,
            studentId: data.username || undefined,
            email: data.email || undefined,
          });
          const totalLinked =
            result.attendees.linked + result.applicants.linked + result.certificates.linked;
          if (totalLinked > 0) {
            const parts: string[] = [];
            if (result.attendees.linked > 0) parts.push(`참석 ${result.attendees.linked}건`);
            if (result.applicants.linked > 0) parts.push(`신청 ${result.applicants.linked}건`);
            if (result.certificates.linked > 0) parts.push(`수료증 ${result.certificates.linked}건`);
            toast.success(`이전 활동 기록이 연동되었습니다 (${parts.join(", ")}).`);
          }
        } catch {
          // 연동 실패해도 가입은 진행
        }
      } catch (bkendErr) {
        console.error("[signup] profile save failed:", bkendErr);
        const detail = bkendErr instanceof Error ? bkendErr.message : String(bkendErr);
        toast.error(`프로필 저장 실패: ${detail}`);
        return;
      }

      // 자동 승인 시도: 규칙 통과 시 즉시 approved=true (관리자 대기 불필요)
      let autoApproved = false;
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (idToken) {
          const res = await fetch("/api/auth/auto-approve", {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const json = (await res.json()) as { approved?: boolean; autoApproved?: boolean };
            if (json.approved) autoApproved = true;
          }
        }
      } catch (autoErr) {
        console.warn("[signup] auto-approve skipped:", autoErr);
      }

      if (autoApproved) {
        toast.success("가입이 완료되었습니다. 바로 로그인하실 수 있습니다.");
      } else {
        toast.success("가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function onInvalid(errs: Record<string, { message?: string } | undefined>) {
    const fieldLabels: Record<string, string> = {
      username: "학번",
      name: "이름",
      email: "이메일",
      phone: "핸드폰 번호",
      birthDate: "생년월일",
      password: "비밀번호",
      passwordConfirm: "비밀번호 확인",
      enrollmentYear: "입학 연도",
      enrollmentHalf: "입학 반기",
      generation: "누적학기",
      securityAnswer: "보안 질문 답변",
      undergraduateUniversity: "학부 대학교",
      undergraduateCollege: "학부 단과대",
      undergraduateMajor1: "학부 전공 1",
    };
    const firstKey = Object.keys(errs)[0];
    const label = fieldLabels[firstKey] ?? "필수 정보";
    const message = errs[firstKey]?.message ?? "필수 항목을 확인해 주세요.";
    toast.error(`${label}: ${message}`);

    // scroll to first error field
    const el =
      (document.querySelector(`[name="${firstKey}"]`) as HTMLElement | null) ??
      (firstKey === "birthDate"
        ? (document.querySelector('input[placeholder="YYYY"]') as HTMLElement | null)
        : null);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof (el as HTMLInputElement).focus === "function") {
        setTimeout(() => (el as HTMLInputElement).focus(), 300);
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-4 rounded-2xl border bg-white p-8 shadow-sm"
    >
      {/* ── 필수 정보 ── */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">필수 정보</p>

      <div>
        <label className="mb-1.5 block text-sm font-medium">학번 (아이디)</label>
        <div className="flex gap-2">
          <Input
            {...register("username", {
              required: "학번을 입력하세요",
              minLength: { value: 5, message: "5자 이상 입력하세요" },
              maxLength: { value: 20, message: "20자 이하로 입력하세요" },
              pattern: { value: /^[a-zA-Z0-9_]+$/, message: "영문, 숫자, 밑줄(_)만 사용 가능합니다" },
              onChange: () => { setUsernameChecked(false); setUsernameAvailable(false); },
            })}
            placeholder="예: 2023432001"
            autoComplete="username"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={checkUsernameAvailability}
            disabled={checkingUsername || !watchedUsername || watchedUsername.length < 5}
          >
            {checkingUsername ? <Loader2 size={14} className="animate-spin" /> : "가입 확인"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {usernameChecked
            ? usernameAvailable
              ? "✓ 사용 가능한 학번입니다."
              : "✗ 이미 가입된 학번입니다."
            : "로그인 시 아이디로 사용됩니다."}
        </p>
        {errors.username && (
          <p className="mt-1 text-xs text-destructive">{errors.username.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          이름 <span className="text-destructive">*</span>
        </label>
        <Input
          {...register("name", { required: "이름을 입력하세요" })}
          placeholder="홍길동"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

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
        <p className="mt-1 text-xs text-muted-foreground">
          연세 메일(@yonsei.ac.kr)로 작성해 주세요.
        </p>
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

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
        {errors.phone && (
          <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          생년월일 <span className="text-destructive">*</span>
        </label>
        {/* hidden field that holds the YYYY-MM-DD value for react-hook-form */}
        <input
          type="hidden"
          {...register("birthDate", {
            required: "생년월일을 입력하세요",
            pattern: {
              value: /^\d{4}-\d{2}-\d{2}$/,
              message: "생년월일을 올바르게 입력하세요",
            },
          })}
        />
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            placeholder="YYYY"
            value={birthYear}
            maxLength={4}
            className={cn(
              "w-24 text-center",
              errors.birthDate && "border-destructive ring-2 ring-destructive/40",
            )}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setBirthYear(v);
              setValue(
                "birthDate",
                `${v.padEnd(4, " ")}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
                  .replace(/ /g, "")
                  .replace(/^-+|-+$/g, ""),
                { shouldValidate: true },
              );
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
            className={cn(
              "w-16 text-center",
              errors.birthDate && "border-destructive ring-2 ring-destructive/40",
            )}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (v.length === 2) {
                const n = Number(v);
                if (n < 1) v = "01";
                if (n > 12) v = "12";
              }
              setBirthMonth(v);
              setValue(
                "birthDate",
                `${birthYear}-${v.padStart(2, "0")}-${birthDay.padStart(2, "0")}`,
                { shouldValidate: true },
              );
              if (v.length === 2) birthDayRef.current?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && birthMonth === "") {
                const yearInput = e.currentTarget.parentElement?.querySelector(
                  'input[placeholder="YYYY"]',
                ) as HTMLInputElement | null;
                yearInput?.focus();
              }
            }}
          />
          <span className="text-muted-foreground">월</span>
          <Input
            ref={birthDayRef}
            inputMode="numeric"
            placeholder="DD"
            value={birthDay}
            maxLength={2}
            className={cn(
              "w-16 text-center",
              errors.birthDate && "border-destructive ring-2 ring-destructive/40",
            )}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, "").slice(0, 2);
              if (v.length === 2) {
                const n = Number(v);
                if (n < 1) v = "01";
                if (n > 31) v = "31";
              }
              setBirthDay(v);
              setValue(
                "birthDate",
                `${birthYear}-${birthMonth.padStart(2, "0")}-${v.padStart(2, "0")}`,
                { shouldValidate: true },
              );
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && birthDay === "") {
                birthMonthRef.current?.focus();
              }
            }}
          />
          <span className="text-muted-foreground">일</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          연도(4자리) → 월 → 일 순서로 입력하세요. 비밀번호 찾기 시 본인 확인에 활용됩니다.
        </p>
        {errors.birthDate && (
          <p className="mt-1 text-xs text-destructive">{errors.birthDate.message}</p>
        )}
      </div>

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
            className={cn(
              "pr-10",
              errors.password && "border-destructive ring-2 ring-destructive/40",
            )}
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
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
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
            placeholder="위에서 입력한 비밀번호와 동일하게 입력"
            className={cn(
              "pr-10",
              errors.passwordConfirm && "border-destructive ring-2 ring-destructive/40",
            )}
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
        {errors.passwordConfirm && (
          <p className="mt-1 text-xs text-destructive">{errors.passwordConfirm.message}</p>
        )}
      </div>

      {/* 학부 정보 (필수) */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">
            학부 정보 <span className="text-destructive">*</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            학부 전공 기반으로 학회원 대상 학술 활동 기획·운영 등에 참고하기 위한 목적입니다.
          </p>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium">대학교</label>
          <Input
            {...register("undergraduateUniversity", { required: "대학교를 입력하세요" })}
            placeholder="예: 연세대학교"
          />
          {errors.undergraduateUniversity && (
            <p className="mt-1 text-xs text-destructive">{errors.undergraduateUniversity.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium">단과대</label>
          <Input
            {...register("undergraduateCollege", { required: "단과대를 입력하세요" })}
            placeholder="예: 교육과학대학"
          />
          {errors.undergraduateCollege && (
            <p className="mt-1 text-xs text-destructive">{errors.undergraduateCollege.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium">전공 1</label>
          <Input
            {...register("undergraduateMajor1", { required: "전공 1을 입력하세요" })}
            placeholder="예: 교육학과"
          />
          <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" {...register("undergraduateMajor1IsEducation")} />
            교육학 계열
          </label>
          {errors.undergraduateMajor1 && (
            <p className="mt-1 text-xs text-destructive">{errors.undergraduateMajor1.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium">
            전공 2 <span className="text-muted-foreground">(복수전공·부전공, 선택)</span>
          </label>
          <Input
            {...register("undergraduateMajor2")}
            placeholder="예: 심리학과"
          />
          <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <input type="checkbox" {...register("undergraduateMajor2IsEducation")} />
            교육학 계열
          </label>
        </div>
      </div>

      {/* 신분 유형 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          신분 유형 <span className="text-destructive">*</span>
        </label>
        <div className="flex gap-2">
          {(Object.entries(ENROLLMENT_STATUS_LABELS) as [EnrollmentStatus, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setEnrollmentStatus(key)}
              className={cn(
                "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                enrollmentStatus === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-white text-muted-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 입학 시점 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">입학 시점</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            {...register("enrollmentYear", { required: "입학 연도를 선택하세요" })}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="">연도 선택</option>
            {ENROLLMENT_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            {...register("enrollmentHalf", { required: "반기를 선택하세요" })}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="">반기 선택</option>
            <option value="1">전반기 (3월)</option>
            <option value="2">후반기 (9월)</option>
          </select>
        </div>
        {(errors.enrollmentYear || errors.enrollmentHalf) && (
          <p className="mt-1 text-xs text-destructive">
            {errors.enrollmentYear?.message || errors.enrollmentHalf?.message}
          </p>
        )}
      </div>

      {/* 누적학기 선택 (재학/휴학만) */}
      {enrollmentStatus !== "graduated" && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">누적학기</label>
          <select
            {...register("generation", { required: "누적학기를 선택하세요" })}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
          >
            <option value="">누적학기를 선택하세요</option>
            {SEMESTER_OPTIONS.map((sem) => (
              <option key={sem} value={sem}>
                {sem}학기
              </option>
            ))}
            <option value="0">기타 / 모르겠음</option>
          </select>
          <p className="mt-1 text-xs text-muted-foreground">2026년 1학기 기준 재학 중인 학기를 선택하세요.</p>
          {errors.generation && (
            <p className="mt-1 text-xs text-destructive">{errors.generation.message}</p>
          )}
        </div>
      )}

      {/* 휴학 분기 */}
      {enrollmentStatus === "on_leave" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">휴학 정보 <span className="text-destructive">*</span></p>
          <div>
            <label className="mb-1.5 block text-xs font-medium">휴학 시작</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                {...register("leaveStartYear")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">연도</option>
                {LEAVE_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                {...register("leaveStartHalf")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">학기</option>
                <option value="1">전기</option>
                <option value="2">후기</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">복학 예정</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                {...register("returnYear")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">연도</option>
                {RETURN_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                {...register("returnHalf")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">학기</option>
                <option value="1">전기</option>
                <option value="2">후기</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 졸업 분기 */}
      {enrollmentStatus === "graduated" && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-medium">졸업 정보 <span className="text-destructive">*</span></p>
          <div>
            <label className="mb-1.5 block text-xs font-medium">졸업 논문(연구보고서) 제목</label>
            <Input {...register("thesisTitle")} placeholder="제목을 입력하세요" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium">졸업 시점</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                {...register("graduationYear")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">연도</option>
                {GRADUATION_YEAR_OPTIONS.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
              <select
                {...register("graduationMonth")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm"
              >
                <option value="">월</option>
                <option value="2">2월</option>
                <option value="8">8월</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 보안 질문 */}
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-medium">
          보안 질문 <span className="text-destructive">*</span>
          <span className="ml-1 text-xs text-muted-foreground">(비밀번호 찾기용)</span>
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-medium">질문</label>
          <select
            {...register("securityQuestionSelect", { required: true })}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
          >
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
        </div>
        {watchedSecurityQ === "직접 입력" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium">직접 입력한 질문</label>
            <Input
              {...register("securityQuestionCustom")}
              placeholder="질문을 직접 입력하세요"
            />
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-xs font-medium">답변</label>
          <Input
            {...register("securityAnswer", { required: "답변을 입력하세요" })}
            placeholder="답변을 입력하세요"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            답변은 암호화되어 저장되며, 평문은 서버에 보관되지 않습니다.
          </p>
        </div>
      </div>

      {/* ── 선택 정보 (접이식) ── */}
      <div className="border-t pt-4">
        <button
          type="button"
          onClick={() => setShowOptional(!showOptional)}
          className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <span className="text-xs font-semibold uppercase tracking-wider">선택 정보</span>
          {showOptional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showOptional && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                현재 활동 구분 <span className="text-muted-foreground">(선택)</span>
              </label>
              <select
                {...register("activity")}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                {ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* 직업유형별 세부 필드 (PR6) */}
            {occLabels && (
              <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
                <p className="text-xs text-muted-foreground">
                  {OCCUPATION_LABELS[watchedActivity as OccupationType]} 세부 정보
                </p>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    {occLabels.affiliation} <span className="text-muted-foreground">(선택)</span>
                  </label>
                  <Input {...register("affiliation1")} placeholder={occLabels.affiliation} />
                </div>
                {occLabels.department && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.department} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("affiliation2")} placeholder={occLabels.department} />
                  </div>
                )}
                {/* 연구소·공무원: 직책(title) → researcherTitle/publicTitle 별도 필드 */}
                {occLabels.title && watchedActivity === "researcher" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.title} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("researcherTitle")} placeholder={occLabels.title} />
                  </div>
                )}
                {occLabels.title && watchedActivity === "public" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.title} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("publicTitle")} placeholder={occLabels.title} />
                  </div>
                )}
                {/* 그 외: position(직책/직함/대외직책/담당과목) → 기존 position 필드 */}
                {occLabels.position && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.position} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("position")} placeholder={occLabels.position} />
                  </div>
                )}
                {/* 담당업무 — 기업/연구소/공무원 */}
                {occLabels.duty && watchedActivity === "corporate" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.duty} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("corporateDuty")} placeholder={occLabels.duty} />
                  </div>
                )}
                {occLabels.duty && watchedActivity === "researcher" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.duty} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("researcherDuty")} placeholder={occLabels.duty} />
                  </div>
                )}
                {occLabels.duty && watchedActivity === "public" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.duty} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("publicDuty")} placeholder={occLabels.duty} />
                  </div>
                )}
                {/* 비고 — 프리랜서 */}
                {occLabels.notes && watchedActivity === "freelancer" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      {occLabels.notes} <span className="text-muted-foreground">(선택)</span>
                    </label>
                    <Input {...register("freelancerNotes")} placeholder={occLabels.notes} />
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                관심 분야 <span className="text-muted-foreground">(선택)</span>
              </label>
              <Input {...register("field")} placeholder="예: AI 교육, 교수설계, UX" />
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading || !usernameChecked || !usernameAvailable}>
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <UserPlus size={16} className="mr-2" />
            가입 신청
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}

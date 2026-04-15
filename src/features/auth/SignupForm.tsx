"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authApi, profilesApi, attendeesApi, saveTokens } from "@/lib/bkend";
import { cn } from "@/lib/utils";
import type { UserConsents } from "@/lib/legal";
import { sha256Hex } from "@/lib/hash";

import type { EnrollmentStatus } from "@/types";
import { ENROLLMENT_STATUS_LABELS } from "@/types";

const ACTIVITY_OPTIONS = [
  { value: "", label: "선택 안 함" },
  { value: "teacher", label: "학교 교사" },
  { value: "corporate", label: "기업 재직" },
  { value: "university", label: "대학 교직원" },
  { value: "researcher", label: "연구소/기관" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

// 2026년 1학기 기준 누적학기 옵션 (1~20학기)
const SEMESTER_OPTIONS = Array.from({ length: 20 }, (_, i) => i + 1);

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
  generation: string;
  enrollmentYear: string;
  enrollmentHalf: string;
  field: string;
  activity: string;
  affiliation1: string;
  affiliation2: string;
  position: string;
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
  const [showOptional, setShowOptional] = useState(false);
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

        const profileData: Record<string, unknown> = {
          username: data.username,
          name: data.name,
          email: data.email,
          role: "member",
          memberType: enrollmentStatus === "graduated" ? "alumni" : "student",
          enrollmentStatus,
          generation: data.generation ? Number(data.generation) : 0,
          studentId: data.username || "",
          phone: data.phone || "",
          birthDate: data.birthDate || "",
          enrollmentYear: data.enrollmentYear ? Number(data.enrollmentYear) : null,
          enrollmentHalf: data.enrollmentHalf ? Number(data.enrollmentHalf) : null,
          field: data.field || "",
          approved: true,
          privacyAgreedAt: new Date().toISOString(),
          consents: initialConsents,
          securityQuestion,
          securityAnswerHash,
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

        await profilesApi.update("me", profileData);

        // 학번 기반 게스트 세미나 기록 연동
        const studentIdForLookup = data.username;
        if (studentIdForLookup) {
          try {
            const guestRecords = await attendeesApi.findGuestsByStudentId(studentIdForLookup);
            const records = guestRecords.data as unknown as { id: string }[];
            if (records.length > 0) {
              const me = await profilesApi.get("me");
              const myId = (me as unknown as { id: string }).id;
              for (const rec of records) {
                await attendeesApi.update(rec.id, { userId: myId, isGuest: false });
              }
              toast.success(`이전 세미나 참석 기록 ${records.length}건이 연동되었습니다.`);
            }
          } catch {
            // 연동 실패해도 가입은 진행
          }
        }
      } catch (bkendErr) {
        console.error("[signup] profile save failed:", bkendErr);
        toast.error("프로필 저장에 실패했습니다. 관리자에게 문의하세요.");
        return;
      }

      toast.success("가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "가입 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
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
        <label className="mb-1.5 block text-sm font-medium">이름</label>
        <Input
          {...register("name", { required: "이름을 입력하세요" })}
          placeholder="홍길동"
        />
        {errors.name && (
          <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">이메일</label>
        <Input
          {...register("email", {
            required: "이메일을 입력하세요",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "올바른 이메일 형식이 아닙니다" },
          })}
          type="email"
          placeholder="email@yonsei.ac.kr"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">핸드폰 번호</label>
        <Input
          {...register("phone", {
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
        <label className="mb-1.5 block text-sm font-medium">생년월일</label>
        <Input
          {...register("birthDate", { required: "생년월일을 입력하세요" })}
          type="date"
        />
        <p className="mt-1 text-xs text-muted-foreground">아이디/비밀번호 찾기 시 본인 확인에 활용됩니다.</p>
        {errors.birthDate && (
          <p className="mt-1 text-xs text-destructive">{errors.birthDate.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">비밀번호</label>
        <Input
          {...register("password", {
            required: "비밀번호를 입력하세요",
            minLength: { value: 8, message: "8자 이상 입력하세요" },
            validate: (v) =>
              /(?=.*[a-zA-Z])(?=.*\d)/.test(v) || "영문과 숫자를 모두 포함해야 합니다",
          })}
          type="password"
          placeholder="8자 이상 입력하세요"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
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
                관심 분야 <span className="text-muted-foreground">(선택)</span>
              </label>
              <Input {...register("field")} placeholder="예: AI 교육, 교수설계, UX" />
            </div>

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

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  소속1 <span className="text-muted-foreground">(선택)</span>
                </label>
                <Input {...register("affiliation1")} placeholder="예: 서울시교육청" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  소속2 <span className="text-muted-foreground">(선택)</span>
                </label>
                <Input {...register("affiliation2")} placeholder="예: 교육정책과" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                직책 <span className="text-muted-foreground">(선택)</span>
              </label>
              <Input {...register("position")} placeholder="예: 장학사" />
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

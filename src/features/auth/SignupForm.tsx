"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { authApi, profilesApi, saveTokens } from "@/lib/bkend";
import { cn } from "@/lib/utils";

type MemberType = "student" | "alumni";

const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  student: "재학생 (대학원생 포함)",
  alumni: "졸업생",
};

const ACTIVITY_OPTIONS = [
  { value: "", label: "선택 안 함" },
  { value: "teacher", label: "학교 교사" },
  { value: "corporate", label: "기업 재직" },
  { value: "university", label: "대학 교직원" },
  { value: "researcher", label: "연구소/기관" },
  { value: "freelancer", label: "프리랜서" },
  { value: "other", label: "기타" },
];

// 현재 연도 기준 기수 옵션 생성 (최근 10개 기수)
const currentYear = new Date().getFullYear();
const GENERATION_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const gen = currentYear - 2010 - i; // 2011년 1기 기준
  return gen > 0 ? gen : null;
}).filter((g): g is number => g !== null);

interface SignupData {
  username: string;
  name: string;
  email: string;
  password: string;
  generation: string;
  studentId: string;
  field: string;
  activity: string;
  affiliation1: string;
  affiliation2: string;
  position: string;
}

interface Props {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [memberType, setMemberType] = useState<MemberType>("student");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<SignupData>();

  async function onSubmit(data: SignupData) {
    if (!privacyAgreed) {
      toast.error("개인정보 수집 및 이용에 동의해주세요.");
      return;
    }

    setLoading(true);
    try {
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
          memberType,
          generation: data.generation ? Number(data.generation) : 0,
          studentId: data.studentId || "",
          field: data.field || "",
          approved: false,
          privacyAgreedAt: new Date().toISOString(),
        };
        if (data.activity) profileData.occupation = data.activity;
        if (data.affiliation1) profileData.affiliation = data.affiliation1;
        if (data.affiliation2) profileData.department = data.affiliation2;
        if (data.position) profileData.position = data.position;

        await profilesApi.update("me", profileData);
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
        <label className="mb-1.5 block text-sm font-medium">아이디</label>
        <Input
          {...register("username", {
            required: "아이디를 입력하세요",
            minLength: { value: 3, message: "3자 이상 입력하세요" },
            maxLength: { value: 20, message: "20자 이하로 입력하세요" },
            pattern: { value: /^[a-zA-Z0-9_]+$/, message: "영문, 숫자, 밑줄(_)만 사용 가능합니다" },
          })}
          placeholder="영문, 숫자 조합 (3~20자)"
          autoComplete="username"
        />
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

      {/* 재학생/졸업생 선택 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">구분</label>
        <div className="flex gap-2">
          {(Object.entries(MEMBER_TYPE_LABELS) as [MemberType, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMemberType(key)}
              className={cn(
                "flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                memberType === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-muted bg-white text-muted-foreground hover:bg-muted/50",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 기수 선택 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">기수</label>
        <select
          {...register("generation", { required: "기수를 선택하세요" })}
          className="w-full rounded-lg border px-3 py-2.5 text-sm"
        >
          <option value="">기수를 선택하세요</option>
          {GENERATION_OPTIONS.map((gen) => (
            <option key={gen} value={gen}>
              {gen}기 ({2010 + gen}학번)
            </option>
          ))}
          <option value="0">기타 / 모르겠음</option>
        </select>
        {errors.generation && (
          <p className="mt-1 text-xs text-destructive">{errors.generation.message}</p>
        )}
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
                학번 <span className="text-muted-foreground">(선택)</span>
              </label>
              <Input {...register("studentId")} placeholder="예: 2024123456" />
            </div>

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

            <div className="grid gap-4 sm:grid-cols-2">
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

      {/* 개인정보 동의 */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(e) => setPrivacyAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300"
          />
          <div>
            <span className="text-sm font-medium">개인정보 수집 및 이용 동의 (필수)</span>
            <p className="mt-1 text-xs text-muted-foreground">
              연세교육공학회는 회원 관리 및 학술 활동 안내를 위해 이름, 이메일, 학번 등의
              개인정보를 수집합니다. 수집된 정보는 회원 탈퇴 시까지 보관되며, 동의를 거부할 수
              있으나 이 경우 회원 가입이 제한됩니다.
            </p>
          </div>
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={loading || !privacyAgreed}>
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

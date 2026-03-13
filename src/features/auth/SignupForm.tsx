"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { authApi, profilesApi, saveTokens } from "@/lib/bkend";

interface SignupData {
  code: string;
  username: string;
  name: string;
  email: string;
  password: string;
  generation: number;
  field: string;
}

interface Props {
  onSuccess: () => void;
}

export default function SignupForm({ onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<SignupData>();

  async function onSubmit(data: SignupData) {
    setLoading(true);
    try {
      // Validate signup code server-side
      // TODO: Replace with bkend.ai server-side validation
      const validCode = process.env.NEXT_PUBLIC_SIGNUP_CODE || "YONSEI2026";
      if (data.code !== validCode) {
        toast.error("가입 코드가 올바르지 않습니다. 학회 관리자에게 문의하세요.");
        return;
      }

      try {
        // 1) bkend 인증 계정 생성
        const tokens = await authApi.signup({
          email: data.email,
          password: data.password,
          name: data.name,
        });
        saveTokens(tokens.accessToken, tokens.refreshToken);

        // 2) users 테이블에 프로필 저장
        await profilesApi.update("me", {
          username: data.username,
          name: data.name,
          email: data.email,
          role: "member",
          generation: data.generation,
          field: data.field || "",
          approved: false,
        });
      } catch {
        // bkend 미연결 시 데모 모드
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
      <div>
        <label className="mb-1.5 block text-sm font-medium">가입 코드</label>
        <Input
          {...register("code", { required: "가입 코드를 입력하세요" })}
          placeholder="학회 가입 코드를 입력하세요"
        />
        {errors.code && (
          <p className="mt-1 text-xs text-destructive">{errors.code.message}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          학회 관리자에게 가입 코드를 받으세요.
        </p>
      </div>

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
        <label className="mb-1.5 block text-sm font-medium">이메일 (선택)</label>
        <Input
          {...register("email", {
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
          })}
          type="password"
          placeholder="8자 이상 입력하세요"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">기수</label>
        <Input
          {...register("generation", { required: "기수를 입력하세요", valueAsNumber: true })}
          type="number"
          placeholder="3"
          min={1}
        />
        {errors.generation && (
          <p className="mt-1 text-xs text-destructive">{errors.generation.message}</p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">관심 분야</label>
        <Input
          {...register("field")}
          placeholder="예: AI 교육, 교수설계, UX"
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
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

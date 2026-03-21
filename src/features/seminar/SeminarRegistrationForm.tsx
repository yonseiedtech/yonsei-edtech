"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { registrationsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";

interface FormData {
  name: string;
  email: string;
  affiliation: string;
  phone: string;
  memo: string;
}

interface Props {
  seminarId: string;
  seminarTitle: string;
}

export default function SeminarRegistrationForm({ seminarId, seminarTitle }: Props) {
  const { user } = useAuthStore();
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      affiliation: "",
      phone: "",
      memo: "",
    },
  });

  async function onSubmit(data: FormData) {
    try {
      await registrationsApi.create({
        seminarId,
        name: data.name,
        email: data.email,
        affiliation: data.affiliation || undefined,
        phone: data.phone || undefined,
        memo: data.memo || undefined,
        userId: user?.id ?? undefined,
      });
      setSubmitted(true);
      toast.success("신청이 완료되었습니다.");
    } catch {
      toast.error("신청에 실패했습니다. 다시 시도해주세요.");
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
        <h3 className="text-lg font-bold">신청 완료</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          &ldquo;{seminarTitle}&rdquo; 세미나 참석 신청이 완료되었습니다.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4 rounded-2xl border bg-white p-8"
    >
      <h3 className="text-lg font-bold">세미나 참석 신청</h3>
      <p className="text-sm text-muted-foreground">
        아래 정보를 입력하고 참석을 신청하세요. 비회원도 신청 가능합니다.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">이름 *</label>
          <Input
            {...register("name", { required: "이름을 입력하세요" })}
            placeholder="홍길동"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">이메일 *</label>
          <Input
            type="email"
            {...register("email", { required: "이메일을 입력하세요" })}
            placeholder="email@example.com"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            소속 <span className="text-muted-foreground">(선택)</span>
          </label>
          <Input {...register("affiliation")} placeholder="연세대학교 교육학과" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            연락처 <span className="text-muted-foreground">(선택)</span>
          </label>
          <Input {...register("phone")} placeholder="010-1234-5678" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          메모 <span className="text-muted-foreground">(선택)</span>
        </label>
        <Textarea
          {...register("memo")}
          placeholder="질문이나 요청 사항이 있으면 적어주세요."
          rows={3}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          <Send size={16} className="mr-1" />
          {isSubmitting ? "신청 중..." : "참석 신청"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";
import { toast } from "sonner";

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function PasswordChangeForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordData>();

  async function onSubmit(data: PasswordData) {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    if (data.newPassword.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    // TODO: bkend.ai 연동 시 실제 API 호출
    toast.success("비밀번호가 변경되었습니다. (데모)");
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">현재 비밀번호</label>
        <Input
          type="password"
          autoComplete="current-password"
          {...register("currentPassword", { required: true })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">새 비밀번호</label>
        <Input
          type="password"
          autoComplete="new-password"
          {...register("newPassword", { required: true, minLength: 6 })}
        />
        {errors.newPassword?.type === "minLength" && (
          <p className="mt-1 text-xs text-destructive">6자 이상 입력해주세요.</p>
        )}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">새 비밀번호 확인</label>
        <Input
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword", { required: true })}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit">
          <Lock size={16} className="mr-1" />
          비밀번호 변경
        </Button>
      </div>
    </form>
  );
}

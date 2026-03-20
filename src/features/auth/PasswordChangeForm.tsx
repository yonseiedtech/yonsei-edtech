"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function PasswordChangeForm() {
  const [loading, setLoading] = useState(false);
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

    const user = auth.currentUser;
    if (!user || !user.email) {
      toast.error("로그인 상태를 확인해주세요.");
      return;
    }

    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, data.newPassword);
      toast.success("비밀번호가 변경되었습니다.");
      reset();
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("현재 비밀번호가 올바르지 않습니다.");
      } else if (code === "auth/weak-password") {
        toast.error("비밀번호가 너무 약합니다. 6자 이상 입력해주세요.");
      } else {
        toast.error("비밀번호 변경에 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
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
        <Button type="submit" disabled={loading}>
          {loading ? (
            <Loader2 size={16} className="mr-1 animate-spin" />
          ) : (
            <Lock size={16} className="mr-1" />
          )}
          비밀번호 변경
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

interface ProfileData {
  name: string;
  generation: number;
  field: string;
  bio: string;
}

interface Props {
  user: User;
}

export default function ProfileEditor({ user }: Props) {
  const { register, handleSubmit } = useForm<ProfileData>({
    defaultValues: {
      name: user.name,
      generation: user.generation,
      field: user.field,
      bio: user.bio || "",
    },
  });

  async function onSubmit(data: ProfileData) {
    try {
      // TODO: bkend.ai profilesApi.update()
      toast.success("프로필이 저장되었습니다.");
    } catch {
      toast.error("프로필 저장에 실패했습니다.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">이름</label>
        <Input {...register("name")} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">이메일</label>
        <Input value={user.email} disabled className="bg-muted" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">기수</label>
        <Input {...register("generation", { valueAsNumber: true })} type="number" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">관심 분야</label>
        <Input {...register("field")} placeholder="예: AI 교육, UX" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">자기소개</label>
        <Textarea
          {...register("bio")}
          placeholder="간단한 자기소개를 작성해주세요."
          rows={3}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit">
          <Save size={16} className="mr-1" />
          저장
        </Button>
      </div>
    </form>
  );
}

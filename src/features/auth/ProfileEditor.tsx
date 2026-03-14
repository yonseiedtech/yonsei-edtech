"use client";

import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { User, OccupationType, ContactVisibility } from "@/types";
import { OCCUPATION_LABELS, VISIBILITY_LABELS } from "@/types";

interface ProfileData {
  name: string;
  generation: number;
  field: string;
  bio: string;
  occupation: OccupationType | "";
  affiliation: string;
  department: string;
  position: string;
  contactEmail: string;
  contactVisibility: ContactVisibility;
}

interface Props {
  user: User;
}

const OCCUPATION_FIELDS: Record<OccupationType, { affiliation: string; department: string; position: string }> = {
  student: { affiliation: "소속 대학·기관", department: "학과", position: "과정 (학부/석사/박사)" },
  corporate: { affiliation: "회사명", department: "부서", position: "직책" },
  teacher: { affiliation: "소속 교육청/학교", department: "학교급 (초/중/고)", position: "담당 과목" },
  researcher: { affiliation: "기관명", department: "부서", position: "직위" },
  freelancer: { affiliation: "활동 분야", department: "", position: "직함" },
  other: { affiliation: "소속", department: "", position: "직함" },
};

export default function ProfileEditor({ user }: Props) {
  const { register, handleSubmit, control } = useForm<ProfileData>({
    defaultValues: {
      name: user.name,
      generation: user.generation,
      field: user.field,
      bio: user.bio || "",
      occupation: user.occupation || "",
      affiliation: user.affiliation || "",
      department: user.department || "",
      position: user.position || "",
      contactEmail: user.contactEmail || "",
      contactVisibility: user.contactVisibility || "members",
    },
  });

  const occupation = useWatch({ control, name: "occupation" });
  const occFields = occupation ? OCCUPATION_FIELDS[occupation as OccupationType] : null;

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
        <label className="mb-1.5 block text-sm font-medium">아이디</label>
        <Input value={user.username} disabled className="bg-muted" />
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

      {/* 소속 정보 */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-bold">소속 정보</h3>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">현재 신분 유형</label>
            <select
              {...register("occupation")}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">선택하세요</option>
              {(Object.entries(OCCUPATION_LABELS) as [OccupationType, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {occFields && (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium">{occFields.affiliation}</label>
                <Input {...register("affiliation")} placeholder={occFields.affiliation} />
              </div>
              {occFields.department && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.department}</label>
                  <Input {...register("department")} placeholder={occFields.department} />
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">{occFields.position}</label>
                <Input {...register("position")} placeholder={occFields.position} />
              </div>
            </>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium">연락용 이메일</label>
            <Input {...register("contactEmail")} type="email" placeholder="example@email.com" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">연락처 공개 범위</label>
            <select
              {...register("contactVisibility")}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {(Object.entries(VISIBILITY_LABELS) as [ContactVisibility, string][]).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
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

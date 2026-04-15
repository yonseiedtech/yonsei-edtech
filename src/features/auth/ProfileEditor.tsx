"use client";

import { useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/features/member/useMembers";
import { useAuthStore } from "@/features/auth/auth-store";
import type { User, OccupationType, ContactVisibility, EnrollmentStatus } from "@/types";
import { OCCUPATION_LABELS, VISIBILITY_LABELS, ENROLLMENT_STATUS_LABELS } from "@/types";

const ENROLLMENT_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2026 - i);

interface ProfileData {
  name: string;
  generation: number;
  studentId: string;
  enrollmentYear: string;
  enrollmentHalf: string;
  enrollmentStatus: EnrollmentStatus | "";
  field: string;
  bio: string;
  occupation: OccupationType | "";
  affiliation: string;
  department: string;
  position: string;
  contactEmail: string;
  phone: string;
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
  const { register, handleSubmit, control, setValue } = useForm<ProfileData>({
    defaultValues: {
      name: user.name,
      generation: user.generation,
      studentId: user.studentId || "",
      enrollmentYear: user.enrollmentYear ? String(user.enrollmentYear) : "",
      enrollmentHalf: user.enrollmentHalf ? String(user.enrollmentHalf) : "",
      enrollmentStatus: user.enrollmentStatus || "",
      field: user.field,
      bio: user.bio || "",
      occupation: user.occupation || "",
      affiliation: user.affiliation || "",
      department: user.department || "",
      position: user.position || "",
      contactEmail: user.contactEmail || "",
      phone: user.phone || "",
      contactVisibility: user.contactVisibility || "members",
    },
  });

  const occupation = useWatch({ control, name: "occupation" });
  const watchedStudentId = useWatch({ control, name: "studentId" });
  const occFields = occupation ? OCCUPATION_FIELDS[occupation as OccupationType] : null;
  const { updateProfile, isLoading: isSaving } = useUpdateProfile();

  // 학번에서 입학 시점 자동 추출: 2023432001 → 2023년, 432=후반기 / 431=전반기
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
    if (code === "431") {
      setValue("enrollmentHalf", "1");
    } else if (code === "432") {
      setValue("enrollmentHalf", "2");
    }
  }

  async function onSubmit(data: ProfileData) {
    try {
      const payload = {
        ...data,
        enrollmentYear: data.enrollmentYear ? Number(data.enrollmentYear) : undefined,
        enrollmentHalf: data.enrollmentHalf ? Number(data.enrollmentHalf) : undefined,
        enrollmentStatus: data.enrollmentStatus || undefined,
      };
      await updateProfile({ id: user.id, data: payload as unknown as Record<string, unknown> });
      const updatedUser = {
        ...user,
        ...payload,
        occupation: data.occupation || undefined,
      };
      useAuthStore.getState().setUser(updatedUser);
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
        <label className="mb-1.5 block text-sm font-medium">학번</label>
        <div className="flex gap-2">
          <Input
            {...register("studentId")}
            placeholder="예: 2024123456"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={() => {
              if (watchedStudentId) parseEnrollmentFromStudentId(watchedStudentId);
            }}
          >
            입학시점 추출
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">학번 입력 후 &apos;입학시점 추출&apos;을 클릭하면 입학연도와 반기가 자동 설정됩니다.</p>
      </div>

      {/* 입학 시점 */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">입학 시점</label>
        <div className="grid grid-cols-2 gap-2">
          <select
            {...register("enrollmentYear")}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">연도 선택</option>
            {ENROLLMENT_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <select
            {...register("enrollmentHalf")}
            className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">반기 선택</option>
            <option value="1">전반기 (3월)</option>
            <option value="2">후반기 (9월)</option>
          </select>
        </div>
      </div>

      {/* 신분 유형 (필수) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">
          신분 유형 <span className="text-destructive">*</span>
        </label>
        <select
          {...register("enrollmentStatus", { required: "신분 유형을 선택하세요" })}
          className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">선택하세요</option>
          {(Object.entries(ENROLLMENT_STATUS_LABELS) as [EnrollmentStatus, string][]).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
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
            <label className="mb-1.5 block text-sm font-medium">핸드폰 번호</label>
            <Input {...register("phone")} type="tel" placeholder="010-0000-0000" />
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
        <Button type="submit" disabled={isSaving}>
          <Save size={16} className="mr-1" />
          {isSaving ? "저장 중..." : "저장"}
        </Button>
      </div>
    </form>
  );
}

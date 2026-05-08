"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save, Plus, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useUpdateProfile } from "@/features/member/useMembers";
import { useAuthStore } from "@/features/auth/auth-store";
import type {
  User,
  OccupationType,
  ContactVisibility,
  EnrollmentStatus,
  SocialLink,
} from "@/types";
import {
  OCCUPATION_LABELS,
  VISIBILITY_LABELS,
  ENROLLMENT_STATUS_LABELS,
  SCHOOL_LEVEL_LABELS,
  type SchoolLevel,
} from "@/types";
import OfficeOfEducationField from "@/components/ui/office-of-education-field";
import { calcGeneration } from "@/lib/generation";
import ProfileSocialsEditor from "@/components/profile/ProfileSocialsEditor";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { EDU_TECH_KEYWORD_CATEGORIES } from "@/lib/edu-keywords";
import { cn } from "@/lib/utils";

const ENROLLMENT_YEAR_OPTIONS = Array.from({ length: 15 }, (_, i) => 2026 - i);

interface ProfileData {
  name: string;
  generation: number;
  /** 누적학기 (휴학 제외, 실제 다닌 학기 수) */
  accumulatedSemesters: string;
  studentId: string;
  enrollmentYear: string;
  enrollmentHalf: string;
  enrollmentStatus: EnrollmentStatus | "";
  field: string;
  bio: string;
  occupation: OccupationType | "";
  /** Phase 2 (major-network-map): 학교급 — 네트워킹 Map 의 school_level 차원 매칭에 사용 */
  schoolLevel: SchoolLevel | "";
  affiliation: string;
  /** Phase 2 fix: 학교 교사 — 소속 교육청 (affiliation 과 분리) */
  affiliationOffice: string;
  department: string;
  position: string;
  // PR6 신규: 직업유형별 세부 필드
  corporateDuty: string;
  researcherTitle: string;
  researcherDuty: string;
  publicTitle: string;
  publicDuty: string;
  freelancerNotes: string;
  contactEmail: string;
  phone: string;
  contactVisibility: ContactVisibility;
  socials: SocialLink[];
  // 학부 정보
  undergraduateUniversity: string;
  undergraduateCollege: string;
  undergraduateMajor1: string;
  undergraduateMajor1IsEducation: boolean;
  undergraduateMajor2: string;
  undergraduateMajor2IsEducation: boolean;
}

interface Props {
  user: User;
}

/** PR6 / Sprint 67(Phase 2 fix): 직업유형별 입력 필드 라벨 */
const OCCUPATION_FIELDS: Record<
  OccupationType,
  {
    affiliation: string;
    department: string;
    position: string;
    title?: string;
    duty?: string;
    notes?: string;
    /** 학교 교사 전용 — 교육청 (affiliation 과 별개) */
    office?: string;
  }
> = {
  teacher: {
    office: "소속 교육청",
    affiliation: "소속 학교",
    // 학교급은 schoolLevel 구조화 필드가 대체 → department 자유텍스트 제거
    department: "",
    position: "담당 과목",
  },
  corporate: { affiliation: "회사명", department: "부서", position: "직책", duty: "담당업무" },
  researcher: { affiliation: "기관명", department: "부서", position: "", title: "직책", duty: "담당업무" },
  public: { affiliation: "기관명", department: "부서", position: "", title: "직책", duty: "담당업무" },
  freelancer: { affiliation: "활동분야", department: "활동업무", position: "대외직책", notes: "비고" },
  other: { affiliation: "소속", department: "", position: "직함" },
};

export default function ProfileEditor({ user }: Props) {
  // ── 관심 분야 키워드 (카탈로그 + 직접 입력) ──
  const [interestKeywords, setInterestKeywords] = useState<string[]>(
    user.interestKeywords ?? [],
  );
  const [keywordDraft, setKeywordDraft] = useState("");

  // ── 관심 연구 주제 (자유서술 복수) ──
  const [researchTopics, setResearchTopics] = useState<string[]>(
    user.researchTopics ?? [],
  );
  const [topicDraft, setTopicDraft] = useState("");
  const [editingTopicIdx, setEditingTopicIdx] = useState<number | null>(null);
  const [editingTopicText, setEditingTopicText] = useState("");

  const { register, handleSubmit, control, setValue } = useForm<ProfileData>({
    defaultValues: {
      name: user.name,
      generation: user.generation,
      accumulatedSemesters: user.accumulatedSemesters != null ? String(user.accumulatedSemesters) : "",
      studentId: user.studentId || "",
      enrollmentYear: user.enrollmentYear ? String(user.enrollmentYear) : "",
      enrollmentHalf: user.enrollmentHalf ? String(user.enrollmentHalf) : "",
      enrollmentStatus: user.enrollmentStatus || "",
      field: user.field,
      bio: user.bio || "",
      occupation: user.occupation || "",
      schoolLevel: user.schoolLevel || "",
      affiliation: user.affiliation || "",
      affiliationOffice: user.affiliationOffice || "",
      department: user.department || "",
      position: user.position || "",
      corporateDuty: user.corporateDuty || "",
      researcherTitle: user.researcherTitle || "",
      researcherDuty: user.researcherDuty || "",
      publicTitle: user.publicTitle || "",
      publicDuty: user.publicDuty || "",
      freelancerNotes: user.freelancerNotes || "",
      contactEmail: user.contactEmail || "",
      phone: user.phone || "",
      contactVisibility: user.contactVisibility || "members",
      socials: user.socials ?? [],
      undergraduateUniversity: user.undergraduateUniversity || "",
      undergraduateCollege: user.undergraduateCollege || "",
      undergraduateMajor1: user.undergraduateMajor1 || "",
      undergraduateMajor1IsEducation: !!user.undergraduateMajor1IsEducation,
      undergraduateMajor2: user.undergraduateMajor2 || "",
      undergraduateMajor2IsEducation: !!user.undergraduateMajor2IsEducation,
    },
  });

  const occupation = useWatch({ control, name: "occupation" });
  const watchedStudentId = useWatch({ control, name: "studentId" });
  const watchedOffice = useWatch({ control, name: "affiliationOffice" });
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
      const enrollmentYear = data.enrollmentYear ? Number(data.enrollmentYear) : undefined;
      const enrollmentHalf = data.enrollmentHalf ? Number(data.enrollmentHalf) : undefined;
      const computedGen = calcGeneration(enrollmentYear ?? null, enrollmentHalf ?? null);
      const payload = {
        ...data,
        enrollmentYear,
        enrollmentHalf,
        enrollmentStatus: data.enrollmentStatus || undefined,
        schoolLevel: data.schoolLevel || undefined,
        generation: computedGen || data.generation,
        accumulatedSemesters: data.accumulatedSemesters ? Number(data.accumulatedSemesters) : undefined,
        interestKeywords,
        researchTopics,
      };
      await updateProfile({ id: user.id, data: payload as unknown as Record<string, unknown> });
      // 본인 프로필을 편집한 경우에만 authStore를 갱신.
      // 관리자가 다른 회원 정보를 수정할 때 setUser를 호출하면
      // 관리자 세션이 그 회원 데이터로 덮어씌워져 계정이 전환된 것처럼 보임.
      const currentAuthUser = useAuthStore.getState().user;
      if (currentAuthUser?.id === user.id) {
        const updatedUser = {
          ...user,
          ...payload,
          occupation: data.occupation || undefined,
        };
        useAuthStore.getState().setUser(updatedUser);
      }
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

      {/* 누적학기 (실제 다닌 학기 — 휴학 제외) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">누적학기</label>
        <Input
          type="number"
          min={0}
          max={20}
          step={1}
          {...register("accumulatedSemesters")}
          placeholder="예: 3"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          휴학 기간은 제외하고 실제로 학교를 다닌 누적 학기 수를 입력하세요. (학회 기수와는 별개로 관리됩니다)
        </p>
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

      {/* 관심 분야 키워드 */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-bold">관심 분야 키워드</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          카탈로그에서 선택하거나 직접 입력하세요. 명함에도 표시됩니다.
        </p>

        {/* 선택된 키워드 chips */}
        {interestKeywords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {interestKeywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {k}
                <button
                  type="button"
                  onClick={() => setInterestKeywords((prev) => prev.filter((x) => x !== k))}
                  aria-label={`${k} 제거`}
                  className="rounded-full p-0.5 hover:bg-primary/20"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* 카탈로그: 카테고리별 그룹 */}
        <div className="mt-3 space-y-3">
          {EDU_TECH_KEYWORD_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                {cat.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {cat.keywords.map((kw) => {
                  const active = interestKeywords.includes(kw);
                  return (
                    <button
                      key={kw}
                      type="button"
                      onClick={() =>
                        setInterestKeywords((prev) =>
                          active ? prev.filter((x) => x !== kw) : [...prev, kw],
                        )
                      }
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {kw}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 직접 입력 */}
        <div className="mt-3 flex gap-2">
          <Input
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const trimmed = keywordDraft.trim();
                if (trimmed && !interestKeywords.includes(trimmed)) {
                  setInterestKeywords((prev) => [...prev, trimmed]);
                }
                setKeywordDraft("");
              }
            }}
            placeholder="카탈로그에 없는 키워드 직접 입력"
            maxLength={40}
          />
          <button
            type="button"
            onClick={() => {
              const trimmed = keywordDraft.trim();
              if (trimmed && !interestKeywords.includes(trimmed)) {
                setInterestKeywords((prev) => [...prev, trimmed]);
              }
              setKeywordDraft("");
            }}
            disabled={!keywordDraft.trim()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
          >
            <Plus size={14} /> 추가
          </button>
        </div>
      </div>

      {/* 관심 연구 주제 */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-bold">관심 연구 주제</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          연구 관심사를 1–3문장으로 서술해 주세요. 여러 주제를 추가할 수 있습니다.
        </p>

        {/* 등록된 주제 목록 */}
        {researchTopics.length > 0 && (
          <ul className="mt-3 space-y-2">
            {researchTopics.map((topic, idx) => (
              <li key={idx} className="rounded-lg border bg-muted/30 p-3 text-sm">
                {editingTopicIdx === idx ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingTopicText}
                      onChange={(e) => setEditingTopicText(e.target.value)}
                      rows={3}
                      className="text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditingTopicIdx(null); setEditingTopicText(""); }}
                      >
                        취소
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          const trimmed = editingTopicText.trim();
                          if (!trimmed) return;
                          setResearchTopics((prev) =>
                            prev.map((t, i) => (i === idx ? trimmed : t)),
                          );
                          setEditingTopicIdx(null);
                          setEditingTopicText("");
                        }}
                      >
                        저장
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm leading-relaxed">{topic}</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => { setEditingTopicIdx(idx); setEditingTopicText(topic); }}
                        aria-label="편집"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setResearchTopics((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label="삭제"
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* 새 주제 추가 */}
        <div className="mt-3 space-y-2">
          <Textarea
            value={topicDraft}
            onChange={(e) => setTopicDraft(e.target.value)}
            placeholder="예: 생성형 AI를 활용한 개인화 학습 설계에 관심이 있습니다."
            rows={3}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const trimmed = topicDraft.trim();
                if (!trimmed) return;
                setResearchTopics((prev) => [...prev, trimmed]);
                setTopicDraft("");
              }}
              disabled={!topicDraft.trim()}
              className="inline-flex items-center gap-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <Plus size={14} /> 주제 추가
            </button>
          </div>
        </div>
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

          <div>
            <label className="mb-1.5 block text-sm font-medium">학교급 (선택)</label>
            <select
              {...register("schoolLevel")}
              className="w-full rounded-lg border border-input px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">선택 안 함</option>
              {(Object.entries(SCHOOL_LEVEL_LABELS) as [SchoolLevel, string][]).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              유아교육 / 초·중·고 — 전공 네트워킹 Map의 학교급 매칭에 활용됩니다. 학교 교사가 아닌 경우 비워 두세요.
            </p>
          </div>

          {occFields && (
            <>
              {occFields.office && occupation === "teacher" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.office}</label>
                  <OfficeOfEducationField
                    value={watchedOffice ?? ""}
                    onChange={(next) =>
                      setValue("affiliationOffice", next, { shouldDirty: true })
                    }
                  />
                </div>
              )}
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
              {occFields.title && occupation === "researcher" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.title}</label>
                  <Input {...register("researcherTitle")} placeholder={occFields.title} />
                </div>
              )}
              {occFields.title && occupation === "public" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.title}</label>
                  <Input {...register("publicTitle")} placeholder={occFields.title} />
                </div>
              )}
              {occFields.position && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.position}</label>
                  <Input {...register("position")} placeholder={occFields.position} />
                </div>
              )}
              {occFields.duty && occupation === "corporate" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.duty}</label>
                  <Input {...register("corporateDuty")} placeholder={occFields.duty} />
                </div>
              )}
              {occFields.duty && occupation === "researcher" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.duty}</label>
                  <Input {...register("researcherDuty")} placeholder={occFields.duty} />
                </div>
              )}
              {occFields.duty && occupation === "public" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.duty}</label>
                  <Input {...register("publicDuty")} placeholder={occFields.duty} />
                </div>
              )}
              {occFields.notes && occupation === "freelancer" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">{occFields.notes}</label>
                  <Input {...register("freelancerNotes")} placeholder={occFields.notes} />
                </div>
              )}
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

      {/* 학부 정보 */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-bold">학부 정보 <span className="text-destructive">*</span></h3>
        <p className="mt-1 text-xs text-muted-foreground">
          학부 전공 기반으로 학회원 대상 학술 활동 기획·운영 등에 참고하기 위한 목적입니다.
        </p>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">대학교</label>
            <Input {...register("undergraduateUniversity")} placeholder="예: 연세대학교" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">단과대</label>
            <Input {...register("undergraduateCollege")} placeholder="예: 교육과학대학" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">전공 1</label>
            <Input {...register("undergraduateMajor1")} placeholder="예: 교육학과" />
            <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" {...register("undergraduateMajor1IsEducation")} />
              교육학 계열
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              전공 2 <span className="text-muted-foreground text-xs">(복수전공·부전공)</span>
            </label>
            <Input {...register("undergraduateMajor2")} placeholder="예: 심리학과" />
            <label className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" {...register("undergraduateMajor2IsEducation")} />
              교육학 계열
            </label>
          </div>
        </div>
      </div>

      {/* SNS · 외부 링크 */}
      <div className="border-t pt-6">
        <Controller
          control={control}
          name="socials"
          render={({ field: f }) => (
            <ProfileSocialsEditor
              value={f.value}
              onChange={f.onChange}
              disabled={isSaving}
            />
          )}
        />
      </div>

      {/* 섹션별 공개 범위 안내 (개인 페이지에서 직접 설정) */}
      <div className="border-t pt-6">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold">프로필 공개 범위 설정</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            섹션별 공개 범위는 내 개인 페이지에서 직접 설정할 수 있습니다.
          </p>
          <Link
            href={`/profile/${user.id}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            내 개인 페이지로 이동
            <ExternalLink size={12} />
          </Link>
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

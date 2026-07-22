"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { activitiesApi } from "@/lib/bkend";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEMANTIC } from "@/lib/design-tokens";
import {
  ArrowLeft,
  Calendar,
  Users,
  UserPlus,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import type { Activity, FormField } from "@/types";
import { computeRecruitmentStatus } from "@/lib/recruitment-status";

/** 질문지가 없을 때 기본 제공되는 지원 동기 질문 */
const DEFAULT_QUESTION: FormField = {
  id: "motivation",
  type: "long_text",
  label: "지원 동기",
  required: true,
  placeholder: "스터디 참여를 희망하는 이유를 간략히 작성해 주세요.",
};

function isAnswerEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

export default function StudyApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: activityId } = use(params);
  const { user } = useAuthStore();

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => activitiesApi.get(activityId),
  });

  const { data: myApplication = null, isLoading: appLoading } = useQuery({
    queryKey: ["my-application", activityId],
    enabled: !!user && !!activityId,
    queryFn: async (): Promise<{ status: string } | null> => {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return null;
      const res = await fetch(`/api/activities/${activityId}/my-application`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        application: { status: string } | null;
      };
      return json.application;
    },
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (activityLoading || appLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        스터디를 찾을 수 없습니다.
      </div>
    );
  }

  const act = activity as unknown as Activity;
  const recruitmentComputed = computeRecruitmentStatus(act);
  const applicationForm: FormField[] =
    (act.applicationForm as FormField[] | undefined) ?? [];
  const questions =
    applicationForm.filter((f) => f.type !== "section_break").length > 0
      ? applicationForm.filter((f) => f.type !== "section_break")
      : [DEFAULT_QUESTION];
  const participantCount = (act.participants as string[] | undefined)?.length ?? 0;
  const backHref = `/activities/studies/${activityId}`;

  // ── 비로그인 ──
  if (!user) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-xl px-4">
          <Link
            href={backHref}
            className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            {act.title}
          </Link>
          <div className="rounded-2xl border bg-card p-8 text-center">
            <UserPlus size={36} className="mx-auto mb-3 text-primary" />
            <h1 className="text-lg font-bold">로그인이 필요합니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              스터디 참여 신청은 회원만 가능합니다.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(`/activities/studies/${activityId}/apply`)}`}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              로그인 후 신청하기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 이미 신청함 ──
  if (myApplication) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-xl px-4">
          <Link
            href={backHref}
            className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            {act.title}
          </Link>
          <div className="rounded-2xl border bg-card p-8 text-center">
            <CheckCircle
              size={36}
              className={cn("mx-auto mb-3", SEMANTIC.success.accent)}
            />
            <h1 className="text-lg font-bold">이미 신청하셨습니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {myApplication.status === "approved"
                ? "참여자로 확정되었습니다."
                : "운영진 검토 후 결과를 안내드립니다."}
            </p>
            <Link
              href={backHref}
              className="mt-5 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              스터디로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 모집 마감 / 신청 불가 ──
  if (
    act.registrationMethod !== "open" ||
    recruitmentComputed.status !== "recruiting"
  ) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-xl px-4">
          <Link
            href={backHref}
            className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            {act.title}
          </Link>
          <div
            className={cn(
              "rounded-2xl border p-8 text-center",
              SEMANTIC.danger.bg,
              SEMANTIC.danger.border,
            )}
          >
            <AlertCircle
              size={36}
              className={cn("mx-auto mb-3", SEMANTIC.danger.text)}
            />
            <h1 className={cn("text-lg font-bold", SEMANTIC.danger.text)}>
              모집이 마감되었습니다
            </h1>
            <Link
              href={backHref}
              className="mt-5 inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              스터디로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── 신청 완료 화면 ──
  if (submitted) {
    return (
      <div className="py-16">
        <div className="mx-auto max-w-xl px-4">
          <div className="rounded-2xl border bg-card p-8 text-center">
            <CheckCircle
              size={44}
              className={cn("mx-auto mb-3", SEMANTIC.success.accent)}
            />
            <h1 className="text-xl font-bold">신청이 완료되었습니다</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              운영진이 사전 답변을 검토한 후 결과를 안내드립니다.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href={backHref}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                스터디 상세 보기
              </Link>
              <Link
                href="/activities/studies"
                className="inline-flex h-10 items-center justify-center rounded-md border px-5 text-sm font-medium hover:bg-muted"
              >
                스터디 목록
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 신청 폼 ──
  async function handleSubmit() {
    setError(null);
    const missing = questions.filter(
      (f) => f.required && isAnswerEmpty(answers[f.id]),
    );
    if (missing.length > 0) {
      setError(
        `필수 항목을 작성해 주세요: ${missing.map((f) => f.label).join(", ")}`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("로그인이 필요합니다.");
      const res = await fetch(`/api/activities/${activityId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          answers:
            Object.keys(answers).length > 0 ? answers : undefined,
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error ?? "신청에 실패했습니다.");
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "신청에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-xl px-4">
        <Link
          href={backHref}
          className="mb-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          스터디로 돌아가기
        </Link>

        {/* 스터디 요약 헤더 */}
        <div className="mb-4 rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("text-xs", SEMANTIC.info.chip)}>
              스터디
            </Badge>
          </div>
          <h1 className="mt-2 text-lg font-bold leading-snug">{act.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {act.date}
              {act.endDate ? ` ~ ${act.endDate}` : ""}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              참여 {participantCount}
              {act.maxParticipants ? `/${act.maxParticipants}` : ""}명
            </span>
          </div>
          {act.tagline && (
            <p className="mt-2 text-sm text-muted-foreground">
              {act.tagline as string}
            </p>
          )}
        </div>

        {/* 신청 폼 */}
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          <div>
            <h2 className="font-semibold">참여 신청</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              아래 질문에 답변 후 신청 버튼을 눌러주세요. 운영진 검토 후 결과를 안내드립니다.
            </p>
          </div>

          {questions.map((field, idx) => (
            <div key={field.id}>
              <label className="mb-1.5 block text-sm font-medium">
                {idx + 1}. {field.label}
                {field.required && (
                  <span className="ml-1 text-[10px] text-destructive">*필수</span>
                )}
              </label>
              {field.description && (
                <p className="mb-1.5 text-xs text-muted-foreground">
                  {field.description}
                </p>
              )}
              <Textarea
                value={answers[field.id] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
                placeholder={field.placeholder ?? "답변을 입력해 주세요."}
                rows={4}
              />
            </div>
          ))}

          {error && (
            <p className={cn("text-sm", SEMANTIC.danger.text)}>{error}</p>
          )}

          <Button
            size="lg"
            className="w-full font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="mr-1.5 animate-spin" />
                신청 중…
              </>
            ) : (
              <>
                <UserPlus size={16} className="mr-1.5" />
                참여 신청
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

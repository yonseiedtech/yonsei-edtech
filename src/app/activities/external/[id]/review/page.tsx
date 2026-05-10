"use client";

/**
 * 활동 상세 — 학술대회 참석자 후기 작성 페이지 (Sprint 67-Z)
 *
 * 회원이 학술대회 종료 후 종합 후기 작성:
 *  - 단순 느낀점
 *  - 가장 인상 깊었던 논문 세션 (본인 plans 중 paper)
 *  - 가장 인상 깊었던 포스터 세션 (본인 plans 중 poster)
 *  - 추천 대상
 *  - 향후 재참석 의사
 *  - 아쉬운 점 (운영진만 열람)
 *  - 내 연구 참고할 내용
 *  - 마지막으로 하고 싶은 말
 *  - 별점
 *
 * 저장 완료 시 성취 애니메이션 (체크 마크 + 학술활동 리스트 추가 안내)
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Save,
  Sparkles,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  activitiesApi,
  attendeeReviewsApi,
  userSessionPlansApi,
} from "@/lib/bkend";
import type {
  Activity,
  ConferenceAttendeeReview,
  UserSessionPlan,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";

const WILL_ATTEND_OPTIONS: Array<{
  value: NonNullable<ConferenceAttendeeReview["willAttendAgain"]>;
  label: string;
  emoji: string;
}> = [
  { value: "yes", label: "꼭 다시 참석", emoji: "🙌" },
  { value: "maybe", label: "기회되면", emoji: "🤔" },
  { value: "no", label: "당분간 안 갈 듯", emoji: "🥲" },
];

export default function AttendeeReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const activityId = String(params.id ?? "");
  const { user } = useAuthStore();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [plans, setPlans] = useState<UserSessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [generalImpression, setGeneralImpression] = useState("");
  const [paperId, setPaperId] = useState<string>("");
  const [paperReason, setPaperReason] = useState("");
  const [posterId, setPosterId] = useState<string>("");
  const [posterReason, setPosterReason] = useState("");
  const [recommendTo, setRecommendTo] = useState("");
  const [willAttendAgain, setWillAttendAgain] = useState<
    ConferenceAttendeeReview["willAttendAgain"] | undefined
  >(undefined);
  const [regrets, setRegrets] = useState("");
  const [researchTakeaway, setResearchTakeaway] = useState("");
  const [finalWords, setFinalWords] = useState("");
  const [overallRating, setOverallRating] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 데이터 로드
  useEffect(() => {
    if (!activityId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [actRes, plansRes, existingRes] = await Promise.all([
          activitiesApi.get(activityId),
          userSessionPlansApi.listByUser(user.id),
          attendeeReviewsApi.get(`${user.id}_${activityId}`).catch(() => null),
        ]);
        if (cancelled) return;
        setActivity(actRes as Activity | null);
        const myPlans = (plansRes?.data ?? []).filter(
          (p) => p.activityId === activityId && p.status !== "skipped",
        );
        setPlans(myPlans);
        // 기존 후기가 있으면 폼 채우기 (수정 모드)
        if (existingRes) {
          setGeneralImpression(existingRes.generalImpression ?? "");
          setPaperId(existingRes.mostImpressivePaperSessionId ?? "");
          setPaperReason(existingRes.mostImpressivePaperReason ?? "");
          setPosterId(existingRes.mostImpressivePosterSessionId ?? "");
          setPosterReason(existingRes.mostImpressivePosterReason ?? "");
          setRecommendTo(existingRes.recommendTo ?? "");
          setWillAttendAgain(existingRes.willAttendAgain);
          setRegrets(existingRes.regrets ?? "");
          setResearchTakeaway(existingRes.researchTakeaway ?? "");
          setFinalWords(existingRes.finalWords ?? "");
          setOverallRating(existingRes.overallRating ?? 0);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "로드 실패");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, user]);

  const paperPlans = useMemo(
    () => plans.filter((p) => /\[[A-Z]-\d\]/.test(p.sessionTitle ?? "")),
    [plans],
  );
  const posterPlans = useMemo(
    () => plans.filter((p) => /포스터|poster/i.test(p.sessionTitle ?? "") || /포스터/.test(p.sessionTrack ?? "")),
    [plans],
  );

  async function handleSubmit() {
    if (!user || !activity) return;
    if (!generalImpression.trim()) {
      toast.error("느낀점을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const id = `${user.id}_${activityId}`;
      const paperPlan = plans.find((p) => p.sessionId === paperId);
      const posterPlan = plans.find((p) => p.sessionId === posterId);
      await attendeeReviewsApi.upsert(id, {
        id,
        userId: user.id,
        userName: user.name,
        userAffiliation: user.affiliation,
        userPosition: user.position,
        activityId,
        activityTitle: (activity as { title?: string }).title,
        activityDate: (activity as { date?: string }).date,
        generalImpression: generalImpression.trim(),
        mostImpressivePaperSessionId: paperId || undefined,
        mostImpressivePaperTitle: paperPlan?.sessionTitle,
        mostImpressivePaperReason: paperReason.trim() || undefined,
        mostImpressivePosterSessionId: posterId || undefined,
        mostImpressivePosterTitle: posterPlan?.sessionTitle,
        mostImpressivePosterReason: posterReason.trim() || undefined,
        recommendTo: recommendTo.trim() || undefined,
        willAttendAgain,
        regrets: regrets.trim() || undefined,
        researchTakeaway: researchTakeaway.trim() || undefined,
        finalWords: finalWords.trim() || undefined,
        overallRating: overallRating > 0 ? overallRating : undefined,
        submittedAt: new Date().toISOString(),
      } as unknown as Record<string, unknown>);
      setShowSuccess(true);
      // 4초 후 활동 페이지로 자동 이동
      setTimeout(() => {
        router.push(`/activities/external/${activityId}?via=review`);
      }, 4000);
    } catch (e) {
      toast.error(
        `저장 실패: ${e instanceof Error ? e.message : "권한 또는 네트워크 오류"}`,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 후기 작성 페이지 로드 중…
        </div>
      </div>
    );
  }

  if (error || !activity) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={MessageSquare}
          title={error ?? "활동을 찾을 수 없습니다"}
          description="목록으로 돌아가서 다시 시도하세요."
          actions={[
            { label: "활동으로 돌아가기", href: `/activities/external/${activityId}` },
          ]}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={MessageSquare}
          title="로그인이 필요합니다"
          description="후기 작성은 로그인 후 가능합니다."
        />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto max-w-3xl space-y-5 py-6">
        <div className="flex items-start gap-3 border-b pb-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">참석자 후기 작성</h1>
            <p className="text-xs text-muted-foreground">
              {(activity as { title?: string }).title}
            </p>
          </div>
          <Link href={`/activities/external/${activityId}`}>
            <Button size="sm" variant="ghost">
              <ArrowLeft className="mr-1 h-3 w-3" /> 활동으로
            </Button>
          </Link>
        </div>

        {/* 1. 단순 느낀점 */}
        <Section title="1. 전체 느낀점" required>
          <Textarea
            rows={4}
            value={generalImpression}
            onChange={(e) => setGeneralImpression(e.target.value)}
            placeholder="학술대회 전반에 대한 인상, 분위기, 가장 기억에 남는 순간 등을 자유롭게 적어주세요."
          />
        </Section>

        {/* 2. 가장 인상 깊었던 논문 세션 */}
        <Section title="2. 가장 인상 깊었던 논문 세션">
          {paperPlans.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              내 일정에 추가한 논문 세션이 없습니다. 활동 페이지에서 논문 세션을 ★ 내 일정에 추가해두세요.
            </p>
          ) : (
            <>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={paperId}
                onChange={(e) => setPaperId(e.target.value)}
              >
                <option value="">선택…</option>
                {paperPlans.map((p) => (
                  <option key={p.id} value={p.sessionId}>
                    {p.sessionTitle?.slice(0, 80)}
                  </option>
                ))}
              </select>
              {paperId && (
                <Textarea
                  rows={2}
                  className="mt-2"
                  value={paperReason}
                  onChange={(e) => setPaperReason(e.target.value)}
                  placeholder="이 논문이 인상 깊었던 이유 (선택)"
                />
              )}
            </>
          )}
        </Section>

        {/* 3. 가장 인상 깊었던 포스터 */}
        <Section title="3. 가장 인상 깊었던 포스터">
          {posterPlans.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              내 일정에 추가한 포스터가 없습니다.
            </p>
          ) : (
            <>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={posterId}
                onChange={(e) => setPosterId(e.target.value)}
              >
                <option value="">선택…</option>
                {posterPlans.map((p) => (
                  <option key={p.id} value={p.sessionId}>
                    {p.sessionTitle?.slice(0, 80)}
                  </option>
                ))}
              </select>
              {posterId && (
                <Textarea
                  rows={2}
                  className="mt-2"
                  value={posterReason}
                  onChange={(e) => setPosterReason(e.target.value)}
                  placeholder="이 포스터가 인상 깊었던 이유 (선택)"
                />
              )}
            </>
          )}
        </Section>

        {/* 4. 추천 대상 */}
        <Section title="4. 추천 대상">
          <Input
            value={recommendTo}
            onChange={(e) => setRecommendTo(e.target.value)}
            placeholder="예: 교수설계 연구자, 예비교사, 박사과정 후반기 학생 등"
          />
        </Section>

        {/* 5. 향후 재참석 */}
        <Section title="5. 향후 재참석 의사">
          <div className="flex flex-wrap gap-2">
            {WILL_ATTEND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setWillAttendAgain(willAttendAgain === opt.value ? undefined : opt.value)
                }
                className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition ${
                  willAttendAgain === opt.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted"
                }`}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* 6. 아쉬운 점 (운영진만) */}
        <Section
          title="6. 아쉬운 점 (운영진만 열람)"
          subtitle="운영 개선을 위한 솔직한 피드백 — 다른 참석자에게는 공개되지 않습니다."
        >
          <Textarea
            rows={3}
            value={regrets}
            onChange={(e) => setRegrets(e.target.value)}
            placeholder="예: A 트랙 강의실 너무 좁았음, 점심시간 너무 짧음 등"
            className="border-amber-300 dark:border-amber-700"
          />
        </Section>

        {/* 7. 내 연구 참고할 내용 */}
        <Section title="7. 학술대회에서 배운 점 중 내 연구(논문)에 참고할 만한 내용">
          <Textarea
            rows={4}
            value={researchTakeaway}
            onChange={(e) => setResearchTakeaway(e.target.value)}
            placeholder="이번 학술대회에서 알게 된 이론·방법·사례 중 본인 연구(논문)에 직접 적용·참고할 수 있는 내용을 정리해두세요."
          />
        </Section>

        {/* 8. 마지막으로 하고 싶은 말 */}
        <Section title="8. 마지막으로 하고 싶은 말">
          <Textarea
            rows={3}
            value={finalWords}
            onChange={(e) => setFinalWords(e.target.value)}
            placeholder="감사 인사, 다음 학술대회 기대 등 자유 메시지"
          />
        </Section>

        {/* 별점 */}
        <Section title="전체 만족도 (선택)">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setOverallRating(overallRating === n ? 0 : n)}
                className="p-1"
                aria-label={`${n}점`}
              >
                <Star
                  className={`h-7 w-7 ${
                    n <= overallRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
            {overallRating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">{overallRating}/5</span>
            )}
          </div>
        </Section>

        <div className="flex items-center justify-between border-t pt-4">
          <Link href={`/activities/external/${activityId}`}>
            <Button variant="ghost">
              <ArrowLeft className="mr-1 h-3 w-3" /> 뒤로
            </Button>
          </Link>
          <Button onClick={handleSubmit} disabled={saving} size="lg">
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            후기 저장하고 학술활동에 추가
          </Button>
        </div>
      </div>

      {/* Sprint 67-Z: 저장 완료 성취 애니메이션 */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative mx-4 max-w-md rounded-2xl bg-card p-8 text-center shadow-2xl animate-in zoom-in-50 duration-500">
            {/* 떠다니는 sparkle 효과 */}
            <Sparkles className="absolute left-4 top-4 h-5 w-5 animate-pulse text-amber-400" />
            <Sparkles className="absolute right-6 top-8 h-4 w-4 animate-pulse text-amber-400 [animation-delay:0.3s]" />
            <Sparkles className="absolute bottom-12 left-8 h-4 w-4 animate-pulse text-amber-400 [animation-delay:0.6s]" />
            <Sparkles className="absolute bottom-6 right-4 h-5 w-5 animate-pulse text-amber-400 [animation-delay:0.9s]" />

            <div className="relative">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 animate-in zoom-in duration-700">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold">후기 저장 완료!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                소중한 후기 감사합니다.
              </p>

              {/* 학술활동 추가 시각 표시 */}
              <div className="mt-5 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-in slide-in-from-bottom-4 duration-700 [animation-delay:0.5s] fill-mode-backwards">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 shrink-0 text-primary" />
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground">내 학술활동 ✨</p>
                    <p className="text-sm font-semibold">
                      {(activity as { title?: string }).title}
                    </p>
                  </div>
                  <Badge className="ml-auto animate-in zoom-in duration-500 [animation-delay:1.2s] fill-mode-backwards">
                    NEW
                  </Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  프로필 → 학술활동 영역에 자동으로 추가되었습니다.
                </p>
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                잠시 후 활동 페이지로 이동합니다…
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push(`/activities/external/${activityId}?via=review`)}
                className="mt-2"
              >
                지금 이동
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({
  title,
  subtitle,
  required,
  children,
}: {
  title: string;
  subtitle?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">
        {title}
        {required && <span className="ml-1 text-destructive">*</span>}
      </h3>
      {subtitle && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

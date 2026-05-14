"use client";

/**
 * 학술대회 참석자 후기 리스트 섹션 (Sprint 67-Z)
 *
 * 활동 상세 개요 탭 하단에 mount.
 * - 본인 후기 있으면 '내 후기 수정', 없으면 '후기 작성' 버튼
 * - 다른 회원 후기 카드 리스트 (regrets 필드 제외 — 운영진/본인만 열람)
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Pencil,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { attendeeReviewsApi } from "@/lib/bkend";
import type { ConferenceAttendeeReview } from "@/types";

interface Props {
  activityId: string;
  currentUserId?: string;
  isStaff?: boolean;
}

const WILL_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  yes: { label: "꼭 다시", emoji: "🙌", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" },
  maybe: { label: "기회되면", emoji: "🤔", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" },
  no: { label: "당분간", emoji: "🥲", color: "bg-muted text-muted-foreground" },
};

export default function AttendeeReviewsSection({
  activityId,
  currentUserId,
  isStaff,
}: Props) {
  const [reviews, setReviews] = useState<ConferenceAttendeeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // QA-H1: regrets 는 별도 collection 에서 권한별 fetch
  const [regretsMap, setRegretsMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!activityId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await attendeeReviewsApi.listByActivity(activityId);
        if (!cancelled) setReviews(res?.data ?? []);
        // 본인 regrets 또는 staff 라면 모든 regrets fetch
        const regretsResult: Record<string, string> = {};
        if (isStaff) {
          try {
            const regRes = await attendeeReviewsApi.listRegretsByActivity(activityId);
            for (const r of regRes?.data ?? []) {
              if (r.regrets) regretsResult[r.id] = r.regrets;
            }
          } catch {
            /* 권한 없으면 무시 */
          }
        } else if (currentUserId) {
          try {
            const myReg = await attendeeReviewsApi
              .getMyRegrets(`${currentUserId}_${activityId}`)
              .catch(() => null);
            if (myReg?.regrets) regretsResult[myReg.id] = myReg.regrets;
          } catch {
            /* 없으면 무시 */
          }
        }
        if (!cancelled) setRegretsMap(regretsResult);
      } catch (e) {
        console.error("[AttendeeReviewsSection]", e);
        if (!cancelled) setReviews([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, currentUserId, isStaff]);

  const sorted = useMemo(
    () =>
      [...reviews].sort((a, b) =>
        (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""),
      ),
    [reviews],
  );
  const myReview = currentUserId
    ? sorted.find((r) => r.userId === currentUserId)
    : undefined;
  const othersCount = currentUserId
    ? sorted.filter((r) => r.userId !== currentUserId).length
    : sorted.length;

  return (
    <div className="rounded-2xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">참석자 후기</h3>
          <Badge variant="secondary" className="text-xs">
            {sorted.length}건
          </Badge>
        </div>
        {currentUserId && (
          <Link href={`/activities/external/${activityId}/review`}>
            <Button size="sm" variant={myReview ? "outline" : "default"}>
              {myReview ? (
                <>
                  <Pencil className="mr-1 h-3 w-3" /> 내 후기 수정
                </>
              ) : (
                <>
                  <MessageSquare className="mr-1 h-3 w-3" /> 후기 작성
                </>
              )}
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" /> 후기 불러오는 중…
        </div>
      ) : sorted.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          아직 후기가 없습니다. 첫 번째 후기 작성자가 되어보세요!
        </div>
      ) : (
        <ul className="divide-y">
          {sorted.map((r) => {
            const expanded = expandedId === r.id;
            const isMine = r.userId === currentUserId;
            const showRegrets = isStaff || isMine;
            return (
              <li key={r.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {r.userName ?? "회원"}
                      </span>
                      {isMine && (
                        <Badge className="text-[10px]" variant="secondary">
                          내 후기
                        </Badge>
                      )}
                      {r.userAffiliation && (
                        <span className="text-xs text-muted-foreground">
                          · {r.userAffiliation}
                        </span>
                      )}
                      {r.willAttendAgain && WILL_LABELS[r.willAttendAgain] && (
                        <Badge className={`text-[10px] ${WILL_LABELS[r.willAttendAgain].color}`}>
                          {WILL_LABELS[r.willAttendAgain].emoji}{" "}
                          {WILL_LABELS[r.willAttendAgain].label}
                        </Badge>
                      )}
                      {/* QA-M2: overallRating falsy 방어 (0 저장 케이스 차단) */}
                      {r.overallRating != null && r.overallRating > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-700 dark:text-amber-300">
                          <Star className="h-3 w-3 fill-current" />
                          {r.overallRating}/5
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">
                      {r.generalImpression}
                    </p>
                    {r.submittedAt && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        <Calendar className="mr-1 inline h-3 w-3" />
                        {new Date(r.submittedAt).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExpandedId(expanded ? null : r.id)}
                    className="shrink-0 h-7 px-2 text-xs"
                  >
                    {expanded ? (
                      <>
                        <ChevronUp className="mr-0.5 h-3 w-3" /> 접기
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-0.5 h-3 w-3" /> 자세히
                      </>
                    )}
                  </Button>
                </div>

                {expanded && (
                  <div className="mt-3 space-y-2 border-t pt-3 text-xs">
                    {r.mostImpressivePaperTitle && (
                      <Field label="🎓 인상 깊었던 논문">
                        <p className="font-medium">{r.mostImpressivePaperTitle}</p>
                        {r.mostImpressivePaperReason && (
                          <p className="mt-0.5 text-muted-foreground">
                            {r.mostImpressivePaperReason}
                          </p>
                        )}
                      </Field>
                    )}
                    {r.mostImpressivePosterTitle && (
                      <Field label="📊 인상 깊었던 포스터">
                        <p className="font-medium">{r.mostImpressivePosterTitle}</p>
                        {r.mostImpressivePosterReason && (
                          <p className="mt-0.5 text-muted-foreground">
                            {r.mostImpressivePosterReason}
                          </p>
                        )}
                      </Field>
                    )}
                    {r.recommendTo && (
                      <Field label="👥 추천 대상">{r.recommendTo}</Field>
                    )}
                    {r.researchTakeaway && (
                      <Field label="📚 내 연구에 참고할 내용">
                        <p className="text-foreground/80">{r.researchTakeaway}</p>
                      </Field>
                    )}
                    {r.finalWords && (
                      <Field label="💬 마지막으로 하고 싶은 말">
                        <p className="text-foreground/80">{r.finalWords}</p>
                      </Field>
                    )}
                    {/* QA-H1: regrets 는 별도 collection 에서 권한별 fetch — 페이로드 노출 차단 */}
                    {showRegrets && regretsMap[r.id] && (
                      <Field label="⚠️ 아쉬운 점 (운영진/본인만 열람)">
                        <p className="rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                          {regretsMap[r.id]}
                        </p>
                      </Field>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {currentUserId && !myReview && othersCount > 0 && (
        <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          <Award className="mr-1 inline h-3 w-3 text-amber-500" />
          후기를 작성하면 내 학술활동 리스트에 자동 추가됩니다.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

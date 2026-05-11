"use client";

/**
 * 활동 상세 — 본인 봉사 페이지 (Sprint 67-AJ Phase 1)
 *
 * volunteer participantType 인 회원이 본인 봉사 정보를 한 화면에 모아볼 수 있는 페이지.
 * 운영진이 VolunteerAssignment 로 부여한 내용 표시.
 */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  HandHeart,
  Loader2,
  MapPin,
  Phone,
  ShieldAlert,
  User as UserIcon,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { activitiesApi, volunteerAssignmentsApi } from "@/lib/bkend";
import {
  VOLUNTEER_ROLE_LABELS,
  type Activity,
  type VolunteerAssignment,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ui/empty-state";

export default function MyVolunteerPage() {
  const params = useParams<{ id: string }>();
  const activityId = String(params.id ?? "");
  const { user } = useAuthStore();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [assignment, setAssignment] = useState<VolunteerAssignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activityId || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [actRes, assignRes] = await Promise.all([
          activitiesApi.get(activityId),
          volunteerAssignmentsApi
            .get(`${user.id}_${activityId}`)
            .catch(() => null),
        ]);
        if (cancelled) return;
        setActivity(actRes as Activity | null);
        setAssignment(assignRes);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, user]);

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 봉사 정보를 불러오는 중…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={HandHeart}
          title="로그인이 필요합니다"
          description="본인 봉사 정보는 로그인 후 확인할 수 있습니다."
        />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto py-10">
        <EmptyState
          icon={HandHeart}
          title="활동을 찾을 수 없습니다"
          description="목록에서 다시 시도하세요."
        />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="container mx-auto max-w-2xl space-y-4 py-6">
        <Header activity={activity} />
        <EmptyState
          icon={HandHeart}
          title="아직 봉사 역할이 배정되지 않았습니다"
          description="운영진이 역할·시간을 부여하면 이 페이지에 표시됩니다. 잠시 기다려 주세요."
          actions={[
            { label: "활동으로 돌아가기", href: `/activities/external/${activityId}` },
          ]}
        />
      </div>
    );
  }

  const roleLabel =
    assignment.role === "other" && assignment.customRoleName
      ? assignment.customRoleName
      : VOLUNTEER_ROLE_LABELS[assignment.role];

  return (
    <div className="container mx-auto max-w-2xl space-y-4 py-6">
      <Header activity={activity} />

      {/* 메인 역할 카드 */}
      <div className="rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-6 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
              오늘 내 미션
            </p>
            <h2 className="mt-1 text-2xl font-bold text-primary">{roleLabel}</h2>
          </div>
          <Badge className="bg-primary text-primary-foreground">
            <HandHeart size={11} className="mr-1" /> 봉사
          </Badge>
        </div>
        {assignment.contactDisplay && (
          <p className="mt-2 text-sm text-foreground/70">
            <UserIcon size={12} className="mr-1 inline" />
            {assignment.contactDisplay}
          </p>
        )}
      </div>

      {/* 시간대 슬롯 */}
      {assignment.shifts.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Clock size={14} className="text-primary" /> 시간·장소
          </h3>
          <ul className="space-y-2">
            {assignment.shifts.map((shift, i) => (
              <li
                key={i}
                className="rounded-lg border bg-muted/30 p-3 text-sm"
              >
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-base font-bold tabular-nums">
                    {shift.startTime}~{shift.endTime}
                  </span>
                  {shift.trackName && (
                    <Badge variant="secondary" className="text-[10px]">
                      {shift.trackName}
                    </Badge>
                  )}
                  {shift.location && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin size={11} /> {shift.location}
                    </span>
                  )}
                </div>
                {shift.note && (
                  <p className="mt-1 text-xs text-muted-foreground">{shift.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 체크리스트 */}
      {assignment.duties.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 size={14} className="text-primary" /> 체크리스트 · 세부 임무
          </h3>
          <ul className="space-y-1.5">
            {assignment.duties.map((duty) => (
              <li
                key={duty.id}
                className="flex items-start gap-2 rounded-md bg-muted/20 px-2 py-1.5 text-sm"
              >
                {duty.checked ? (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                )}
                <span className={duty.checked ? "text-muted-foreground line-through" : ""}>
                  {duty.text}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">
            ✅ 체크/체크 해제 기능은 Phase 2 에서 활성화 예정.
          </p>
        </div>
      )}

      {/* 비상 연락처 */}
      {assignment.emergencyContact && (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-950/30">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-rose-900 dark:text-rose-100">
            <ShieldAlert size={14} /> 비상 연락처 (학회장 본부석)
          </h3>
          <a
            href={`tel:${assignment.emergencyContact.replace(/\D/g, "")}`}
            className="inline-flex items-center gap-1 text-lg font-bold text-rose-700 hover:underline dark:text-rose-300"
          >
            <Phone size={16} /> {assignment.emergencyContact}
          </a>
          <p className="mt-1 text-[11px] text-rose-800/80 dark:text-rose-200/80">
            특이사항·돌발 상황 시 즉시 연락
          </p>
        </div>
      )}

      {/* 운영진 메모 */}
      {assignment.notes && (
        <div className="rounded-xl border bg-card p-4 text-sm">
          <h3 className="mb-1 text-xs font-semibold text-muted-foreground">운영진 메모</h3>
          <p className="whitespace-pre-wrap text-foreground/80">{assignment.notes}</p>
        </div>
      )}

      {/* 안내 — Phase 2 미리 알림 */}
      <p className="rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
        💡 다음 단계: 세션 시작·종료·혼잡도 입력 및 특이사항 보고 기능이 곧 추가될 예정입니다.
      </p>
    </div>
  );
}

function Header({ activity }: { activity: Activity }) {
  const activityId = (activity as { id: string }).id;
  return (
    <div className="flex items-start gap-3 border-b pb-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">
        <HandHeart className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h1 className="text-lg font-semibold">내 봉사 정보</h1>
        <p className="text-xs text-muted-foreground">
          <Calendar size={11} className="mr-0.5 inline" />
          {(activity as { title?: string }).title}
        </p>
      </div>
      <Link href={`/activities/external/${activityId}`}>
        <Button size="sm" variant="ghost">
          <ArrowLeft className="mr-1 h-3 w-3" /> 활동으로
        </Button>
      </Link>
    </div>
  );
}

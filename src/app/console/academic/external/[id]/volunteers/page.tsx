"use client";

/**
 * 운영 콘솔 — 대외 학술대회 자원봉사자 운영 (Sprint 70).
 *
 * 사용자 서비스(/activities/external/[id]/my-volunteer)에서 본인이 배정된 역할만
 * 확인할 수 있었음. 운영진이 전체 봉사자 명부·역할·시간대를 한곳에서 보고 조정·
 * 본부석에서 비상 연락할 수 있는 모니터링 페이지를 신설.
 *
 * 매칭 분석 GAP #4: 운영 콘솔에 봉사자 배정 관리 페이지 부재.
 */

import { use, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  HeartHandshake,
  Phone,
  MapPin,
  Clock,
  ClipboardList,
  Users,
} from "lucide-react";
import { activitiesApi, volunteerAssignmentsApi } from "@/lib/bkend";
import {
  VOLUNTEER_ROLE_LABELS,
  type VolunteerAssignment,
  type VolunteerRoleKey,
  type Activity,
} from "@/types";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import EmptyState from "@/components/ui/empty-state";

const ROLE_ORDER: VolunteerRoleKey[] = [
  "track_runner",
  "registration",
  "guide",
  "media",
  "poster_manager",
  "other",
];

const ROLE_COLORS: Record<VolunteerRoleKey, string> = {
  track_runner: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-200 dark:border-blue-800",
  registration: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800",
  guide: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-200 dark:border-purple-800",
  media: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-200 dark:border-rose-800",
  poster_manager: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800",
  other: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
};

export default function ExternalActivityVolunteersConsole({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: activityId } = use(params);

  const { data: activity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => activitiesApi.get(activityId) as Promise<Activity>,
    retry: false,
  });

  const { data: vRes, isLoading } = useQuery({
    queryKey: ["console", "volunteers", activityId],
    queryFn: () => volunteerAssignmentsApi.listByActivity(activityId),
    retry: false,
  });
  const volunteers = (vRes?.data ?? []) as VolunteerAssignment[];

  const grouped = useMemo(() => {
    const m = new Map<VolunteerRoleKey, VolunteerAssignment[]>();
    for (const k of ROLE_ORDER) m.set(k, []);
    for (const v of volunteers) {
      const k = (m.has(v.role) ? v.role : "other") as VolunteerRoleKey;
      m.get(k)!.push(v);
    }
    // 시간대 시작순 정렬 (없으면 끝으로)
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const sa = a.shifts?.[0]?.startTime ?? "99:99";
        const sb = b.shifts?.[0]?.startTime ?? "99:99";
        return sa.localeCompare(sb);
      });
    }
    return m;
  }, [volunteers]);

  const stats = useMemo(() => {
    const roleDist = ROLE_ORDER.map((k) => ({
      key: k,
      label: VOLUNTEER_ROLE_LABELS[k],
      count: grouped.get(k)?.length ?? 0,
    }));
    const dutyDone = volunteers.reduce((acc, v) => {
      const total = v.duties?.length ?? 0;
      const done = v.duties?.filter((d) => d.checked).length ?? 0;
      return { total: acc.total + total, done: acc.done + done };
    }, { total: 0, done: 0 });
    const completionRate = dutyDone.total > 0
      ? Math.round((dutyDone.done / dutyDone.total) * 100)
      : null;
    return { total: volunteers.length, roleDist, dutyDone, completionRate };
  }, [volunteers, grouped]);

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={HeartHandshake}
        title={`자원봉사자 운영 — ${activity?.title ?? "대외 학술대회"}`}
        description="배정된 봉사자 명부·역할·시간대·임무 진행률을 한곳에서 관리합니다. 본부석 모니터링·비상 연락처 조회용."
      />

      <div className="flex items-center justify-between">
        <Link
          href={`/console/academic/external/${activityId}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={12} /> 활동 상세로
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border bg-card px-3 py-1.5 text-xs text-foreground hover:bg-muted"
        >
          🖨 명단 인쇄 (본부석용)
        </button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Users} label="총 봉사자" value={String(stats.total)} color="text-primary bg-primary/10" />
        <StatCard
          icon={ClipboardList}
          label="임무 체크 진행률"
          value={stats.completionRate != null ? `${stats.completionRate}%` : "—"}
          color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30"
        />
        <StatCard
          icon={ClipboardList}
          label="임무 (완료/전체)"
          value={`${stats.dutyDone.done} / ${stats.dutyDone.total}`}
          color="text-blue-600 bg-blue-50 dark:bg-blue-950/30"
        />
        <StatCard
          icon={HeartHandshake}
          label="역할 종류"
          value={String(stats.roleDist.filter((r) => r.count > 0).length)}
          color="text-amber-600 bg-amber-50 dark:bg-amber-950/30"
        />
      </div>

      {/* 역할별 분포 (요약 막대) */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-bold">역할별 분포</h2>
        <div className="space-y-1.5">
          {stats.roleDist.map((r) => (
            <div key={r.key} className="flex items-center gap-3 text-xs">
              <span className="w-28 shrink-0 text-muted-foreground">{r.label}</span>
              <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: stats.total > 0 ? `${(r.count / stats.total) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{r.count}명</span>
            </div>
          ))}
        </div>
      </div>

      {/* 역할별 봉사자 목록 */}
      {isLoading ? (
        <div className="rounded-2xl border bg-card p-10 text-center text-xs text-muted-foreground">
          불러오는 중…
        </div>
      ) : volunteers.length === 0 ? (
        <div className="rounded-2xl border bg-card p-5">
          <EmptyState
            icon={HeartHandshake}
            title="아직 배정된 봉사자가 없습니다"
            description="활동 상세 페이지에서 봉사자를 배정하면 본 목록에 표시됩니다."
          />
        </div>
      ) : (
        ROLE_ORDER.map((roleKey) => {
          const list = grouped.get(roleKey) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={roleKey} className="rounded-2xl border bg-card p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[roleKey]}`}>
                  {VOLUNTEER_ROLE_LABELS[roleKey]}
                </span>
                <span className="text-xs text-muted-foreground">{list.length}명</span>
              </div>
              <ul className="space-y-3">
                {list.map((v) => (
                  <li key={v.id} className="rounded-2xl border bg-background p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">
                          {v.userName ?? "(이름 미상)"}
                          {v.customRoleName && (
                            <span className="ml-2 text-[10px] font-normal text-muted-foreground">
                              · {v.customRoleName}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {v.userAffiliation ?? ""}
                          {v.userPhone && (
                            <a
                              href={`tel:${v.userPhone}`}
                              className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
                            >
                              <Phone size={10} /> {v.userPhone}
                            </a>
                          )}
                        </p>
                      </div>
                      {v.duties?.length > 0 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          임무 {v.duties.filter((d) => d.checked).length}/{v.duties.length}
                        </span>
                      )}
                    </div>

                    {v.shifts?.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {v.shifts.map((s, i) => (
                          <div key={i} className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5">
                              <Clock size={10} /> {s.startTime}~{s.endTime}
                            </span>
                            {s.trackName && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                                {s.trackName}
                              </span>
                            )}
                            {s.location && (
                              <span className="inline-flex items-center gap-0.5">
                                <MapPin size={10} /> {s.location}
                              </span>
                            )}
                            {s.note && <span className="text-muted-foreground/70">· {s.note}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {v.duties?.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {v.duties.map((d) => (
                          <li
                            key={d.id}
                            className={`text-[11px] ${d.checked ? "text-muted-foreground line-through" : "text-foreground"}`}
                          >
                            {d.checked ? "✓" : "○"} {d.text}
                          </li>
                        ))}
                      </ul>
                    )}

                    {(v.emergencyContact || v.notes) && (
                      <div className="mt-2 rounded-lg bg-muted/30 p-2 text-[11px] leading-relaxed">
                        {v.emergencyContact && (
                          <p>
                            <strong>비상 연락:</strong> {v.emergencyContact}
                          </p>
                        )}
                        {v.notes && (
                          <p>
                            <strong>메모:</strong> {v.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

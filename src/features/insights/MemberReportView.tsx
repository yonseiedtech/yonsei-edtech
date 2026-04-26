"use client";

/**
 * 회원 보고서 (Sprint 37) — admin 전용.
 *
 * 사이트 접속 빈도(출석률) + 활동 참여율 + 운영진 직책을 종합한 로얄티 점수,
 * 운영진 저활동 인원, 장기 미접속 회원을 한 화면에서 식별.
 *
 * 향후 확장 슬롯:
 * - 게시물·댓글 활동 (computeMemberMetrics에 postCount/commentCount 시그니처 보유)
 * - 관심 연구분야 ↔ 졸업생 논문 키워드 매칭 추천 (별도 섹션 합류 예정)
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, AlertTriangle, Crown, Trophy, Clock, Search, Download,
  ShieldAlert, Filter,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import { profilesApi, dataApi, gradLifePositionsApi } from "@/lib/bkend";
import type {
  User, SeminarAttendee, ActivityParticipation, GradLifePosition,
} from "@/types";
import {
  computeMemberMetrics,
  segmentColor,
  segmentLabel,
  type MemberMetricsRow,
} from "./computeMemberMetrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportCSV } from "@/lib/export-csv";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<User["role"], string> = {
  member: "회원",
  staff: "운영진",
  president: "회장",
  admin: "관리자",
  sysadmin: "시스템관리자",
  advisor: "지도교수",
  alumni: "동문",
};

function formatDays(d: number): string {
  if (d >= 999) return "기록 없음";
  if (d === 0) return "오늘";
  if (d < 30) return `${d}일 전`;
  if (d < 90) return `${Math.floor(d / 7)}주 전`;
  return `${Math.floor(d / 30)}개월 전`;
}

export default function MemberReportView() {
  const { user } = useAuthStore();
  const isAdmin = isAdminOrSysadmin(user);

  const { data: membersRes, isLoading: loadingMembers } = useQuery({
    enabled: isAdmin,
    queryKey: ["report-members"],
    queryFn: () => profilesApi.list({ limit: 2000 }),
  });

  const { data: attendeesRes } = useQuery({
    enabled: isAdmin,
    queryKey: ["report-attendees"],
    queryFn: () => dataApi.list<SeminarAttendee>("seminar_attendees", { limit: 5000 }),
  });

  const { data: participationsRes } = useQuery({
    enabled: isAdmin,
    queryKey: ["report-participations"],
    queryFn: () =>
      dataApi.list<ActivityParticipation>("activity_participations", { limit: 5000 }),
  });

  const { data: gradLifeRes } = useQuery({
    enabled: isAdmin,
    queryKey: ["report-gradlife"],
    queryFn: () => gradLifePositionsApi.list({ limit: 2000 }),
  });

  const members = (membersRes?.data ?? []) as User[];
  const attendees = (attendeesRes?.data ?? []) as SeminarAttendee[];
  const participations = (participationsRes?.data ?? []) as ActivityParticipation[];
  const gradLife = (gradLifeRes?.data ?? []) as GradLifePosition[];

  // 회원별 카운트 맵 만들기 — O(N) 한 번 순회
  const rows = useMemo<MemberMetricsRow[]>(() => {
    const attMap = new Map<string, number>();
    for (const a of attendees) {
      if (!a.checkedIn) continue;
      if (a.isGuest) continue;
      if (!a.userId) continue;
      attMap.set(a.userId, (attMap.get(a.userId) ?? 0) + 1);
    }

    const partMap = new Map<string, number>();
    for (const p of participations) {
      if (!p.userId) continue;
      partMap.set(p.userId, (partMap.get(p.userId) ?? 0) + 1);
    }

    const ongoingMap = new Map<string, number>();
    for (const g of gradLife) {
      if (g.endYear && g.endSemester) continue; // 진행중만
      ongoingMap.set(g.userId, (ongoingMap.get(g.userId) ?? 0) + 1);
    }

    const now = Date.now();
    return members
      .map((m) =>
        computeMemberMetrics({
          member: m,
          attendanceCount: attMap.get(m.id) ?? 0,
          activityCount: partMap.get(m.id) ?? 0,
          gradLifeOngoingCount: ongoingMap.get(m.id) ?? 0,
          nowMs: now,
        }),
      );
  }, [members, attendees, participations, gradLife]);

  // 필터·정렬
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState<MemberMetricsRow["segment"] | "all">("all");
  const [staffOnly, setStaffOnly] = useState(false);
  const [sortKey, setSortKey] = useState<"loyaltyScore" | "daysSinceLogin" | "attendanceCount" | "activityCount">("loyaltyScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q) || (r.position ?? "").toLowerCase().includes(q));
    if (filterSegment !== "all") list = list.filter((r) => r.segment === filterSegment);
    if (staffOnly) list = list.filter((r) => r.role === "staff" || r.role === "president" || r.role === "admin" || r.role === "sysadmin");

    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return (Number(av) - Number(bv)) * dir;
    });
  }, [rows, search, filterSegment, staffOnly, sortKey, sortDir]);

  // KPI 계산
  const kpi = useMemo(() => {
    const total = rows.length;
    const active30 = rows.filter((r) => r.daysSinceLogin <= 30).length;
    const dormant90 = rows.filter((r) => r.daysSinceLogin >= 90).length;
    const staffLow = rows.filter((r) => r.staffLowActivity).length;
    return {
      total,
      active30,
      dormant90,
      staffLow,
      activeRate: total ? Math.round((active30 / total) * 100) : 0,
    };
  }, [rows]);

  const champions = useMemo(
    () => [...rows].sort((a, b) => b.loyaltyScore - a.loyaltyScore).slice(0, 10),
    [rows],
  );
  const staffAlerts = useMemo(() => rows.filter((r) => r.staffLowActivity), [rows]);
  const dormantList = useMemo(
    () =>
      [...rows]
        .filter((r) => r.daysSinceLogin >= 60)
        .sort((a, b) => b.daysSinceLogin - a.daysSinceLogin)
        .slice(0, 30),
    [rows],
  );

  function downloadCsv() {
    const headers = [
      "이름", "역할", "기수", "직책", "로얄티점수", "분류",
      "최근접속(일전)", "세미나출석", "활동참여", "진행중운영진직책", "운영진저활동",
    ];
    const rowsCsv = filtered.map((r) => [
      r.name,
      ROLE_LABEL[r.role],
      r.generation,
      r.position ?? "",
      r.loyaltyScore,
      segmentLabel(r.segment),
      r.daysSinceLogin >= 999 ? "기록없음" : r.daysSinceLogin,
      r.attendanceCount,
      r.activityCount,
      r.gradLifeOngoingCount,
      r.staffLowActivity ? "Y" : "N",
    ]);
    exportCSV("member-report", headers, rowsCsv);
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border bg-amber-50 p-6 text-center text-sm text-amber-800">
        <ShieldAlert className="mx-auto mb-2" size={24} />
        관리자 전용 페이지입니다.
      </div>
    );
  }

  if (loadingMembers) {
    return <div className="py-16 text-center text-sm text-muted-foreground">불러오는 중…</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Users} color="bg-blue-50 text-blue-700" label="총 회원" value={kpi.total} sub={`${kpi.activeRate}% 활성(30일)`} />
        <Kpi icon={Trophy} color="bg-violet-50 text-violet-700" label="30일 내 접속" value={kpi.active30} sub={`전체 ${kpi.total}명 중`} />
        <Kpi icon={Clock} color="bg-amber-50 text-amber-700" label="90일+ 미접속" value={kpi.dormant90} sub="휴면 후보" />
        <Kpi icon={ShieldAlert} color="bg-rose-50 text-rose-700" label="운영진 저활동" value={kpi.staffLow} sub="관리 필요" />
      </section>

      {/* 운영진 저활동 경보 */}
      {staffAlerts.length > 0 && (
        <section className="rounded-xl border border-rose-200 bg-rose-50/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
            <AlertTriangle size={16} />
            운영진 저활동 경보 ({staffAlerts.length}명)
          </div>
          <p className="mb-3 text-xs text-rose-700/80">
            staff 이상 권한 보유 인원 중 60일+ 미접속 또는 90일+ 미접속 인원입니다.
          </p>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-rose-50/60 text-xs text-rose-800">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">직책</th>
                  <th className="px-3 py-2 font-medium">최근 접속</th>
                  <th className="px-3 py-2 text-right font-medium">출석/활동</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffAlerts.map((r) => (
                  <tr key={r.userId} className="hover:bg-rose-50/30">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{ROLE_LABEL[r.role]}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.position ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{formatDays(r.daysSinceLogin)}</td>
                    <td className="px-3 py-2 text-right text-xs">{r.attendanceCount} / {r.activityCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 챔피언 Top 10 */}
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Crown size={16} className="text-violet-600" />
            로얄티 Top 10
          </div>
          <ol className="space-y-1.5">
            {champions.map((r, i) => (
              <li key={r.userId} className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2">
                <span className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  i === 0 ? "bg-amber-400 text-white" : i < 3 ? "bg-amber-200 text-amber-900" : "bg-muted text-foreground",
                )}>
                  {i + 1}
                </span>
                <span className="flex-1 truncate text-sm font-medium">{r.name}</span>
                <Badge variant="outline" className={cn("text-[10px]", segmentColor(r.segment))}>
                  {segmentLabel(r.segment)}
                </Badge>
                <span className="w-12 text-right text-sm font-bold tabular-nums">{r.loyaltyScore}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* 장기 미접속 */}
        <section className="rounded-xl border bg-white p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock size={16} className="text-amber-600" />
            장기 미접속 회원 (60일+)
          </div>
          {dormantList.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              해당 회원이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {dormantList.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm">
                  <span className="flex-1 truncate font-medium">{r.name}</span>
                  <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[r.role]}</Badge>
                  <span className="w-20 text-right text-xs text-muted-foreground tabular-nums">
                    {formatDays(r.daysSinceLogin)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 전체 회원 테이블 */}
      <section className="rounded-xl border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users size={16} />
            전체 회원 ({filtered.length})
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름·직책 검색"
                className="h-8 w-44 pl-7 text-xs"
              />
            </div>
            <select
              value={filterSegment}
              onChange={(e) => setFilterSegment(e.target.value as MemberMetricsRow["segment"] | "all")}
              className="h-8 rounded-md border px-2 text-xs"
            >
              <option value="all">전체 분류</option>
              <option value="champion">챔피언</option>
              <option value="active">활성</option>
              <option value="new">신규</option>
              <option value="at_risk">주의</option>
              <option value="dormant">휴면</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={staffOnly} onChange={(e) => setStaffOnly(e.target.checked)} />
              운영진만
            </label>
            <Button size="sm" variant="outline" onClick={downloadCsv}>
              <Download size={12} className="mr-1" />
              CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">이름</th>
                <th className="px-3 py-2 font-medium">역할/직책</th>
                <SortableHeader label="로얄티" current={sortKey} dir={sortDir} target="loyaltyScore" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <th className="px-3 py-2 font-medium">분류</th>
                <SortableHeader label="최근접속" current={sortKey} dir={sortDir} target="daysSinceLogin" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <SortableHeader label="세미나출석" current={sortKey} dir={sortDir} target="attendanceCount" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <SortableHeader label="활동참여" current={sortKey} dir={sortDir} target="activityCount" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <th className="px-3 py-2 font-medium">진행중 직책</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.userId} className="hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">
                    <a href={`/profile/${r.userId}`} className="hover:underline">{r.name}</a>
                    <span className="ml-1 text-[10px] text-muted-foreground">{r.generation}기</span>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[r.role]}</Badge>
                    {r.position && <span className="ml-1 text-muted-foreground">{r.position}</span>}
                  </td>
                  <td className="px-3 py-2 font-bold tabular-nums">{r.loyaltyScore}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className={cn("text-[10px]", segmentColor(r.segment))}>
                      {segmentLabel(r.segment)}
                    </Badge>
                    {r.staffLowActivity && <Badge variant="outline" className="ml-1 border-rose-200 bg-rose-50 text-[10px] text-rose-700">경보</Badge>}
                  </td>
                  <td className="px-3 py-2 text-xs">{formatDays(r.daysSinceLogin)}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.attendanceCount}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.activityCount}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.gradLifeOngoingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          로얄티 점수: 접속(35) + 출석(25) + 활동(25) + 운영진(10) + 콘텐츠(5). 향후 게시물·댓글·관심분야 매칭 추가 예정.
        </p>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType; color: string; label: string; value: number; sub?: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", color)}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

function SortableHeader<K extends string>({ label, current, dir, target, onClick }: {
  label: string; current: K; dir: "asc" | "desc"; target: K; onClick: (k: K) => void;
}) {
  const active = current === target;
  return (
    <th className="px-3 py-2 text-left font-medium">
      <button
        type="button"
        onClick={() => onClick(target)}
        className={cn("inline-flex items-center gap-1 hover:text-foreground", active ? "text-foreground" : "")}
      >
        {label}
        {active && <span className="text-[9px]">{dir === "desc" ? "▼" : "▲"}</span>}
      </button>
    </th>
  );
}

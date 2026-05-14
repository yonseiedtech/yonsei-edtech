"use client";

/**
 * 회원 보고서 (Sprint 37 → Sprint 40 v2 산출식) — admin 전용.
 *
 * v2: 접속(login) 기반 점수 제거, 활동 기반 5개 카테고리로 재설계
 *  - 참여(30) + 콘텐츠(25) + 연구(25) + 운영진(10) + 후기(10) = 100
 *
 * 데이터 소스:
 *  - seminar_attendees, activity_participations, grad_life_positions (v1 유지)
 *  - posts, comments, interview_responses (콘텐츠)
 *  - study_sessions, writing_papers, research_proposals (연구)
 *  - seminar_reviews (세미나), course_reviews (강의)
 */

import { useMemo, useState } from "react";
import {
  Users, AlertTriangle, Crown, Trophy, Clock, Search, Download,
  ShieldAlert, FileText, PieChart, BarChart3,
  TrendingUp, ArrowUpRight, ArrowRight, ArrowDownRight,
} from "lucide-react";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAdminOrSysadmin } from "@/lib/permissions";
import type { User } from "@/types";
import {
  segmentColor,
  segmentLabel,
  type MemberMetricsRow,
} from "./computeMemberMetrics";
import { useMemberMetrics, type MemberMomentum } from "./useMemberMetrics";
import LoyaltyTrendSection from "./LoyaltyTrendSection";
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

  const { rows, momentumByUser, isLoading: loadingMembers } =
    useMemberMetrics(isAdmin);

  // 필터·정렬
  const [search, setSearch] = useState("");
  const [filterSegment, setFilterSegment] = useState<MemberMetricsRow["segment"] | "all">("all");
  const [staffOnly, setStaffOnly] = useState(false);
  const [sortKey, setSortKey] = useState<
    "loyaltyScore" | "daysSinceLogin" | "attendanceCount" | "activityCount" | "postCount" | "commentCount" | "studyHours"
  >("loyaltyScore");
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
    const champion = rows.filter((r) => r.segment === "champion").length;
    const active = rows.filter((r) => r.segment === "active").length;
    const dormant = rows.filter((r) => r.segment === "dormant").length;
    const staffLow = rows.filter((r) => r.staffLowActivity).length;
    return {
      total,
      champion,
      active,
      dormant,
      staffLow,
      activeRate: total ? Math.round(((champion + active) / total) * 100) : 0,
    };
  }, [rows]);

  const segmentDist = useMemo(() => {
    const order: MemberMetricsRow["segment"][] = [
      "champion", "active", "new", "at_risk", "dormant",
    ];
    const counts = new Map<MemberMetricsRow["segment"], number>();
    for (const r of rows) counts.set(r.segment, (counts.get(r.segment) ?? 0) + 1);
    const total = rows.length || 1;
    return order.map((seg) => {
      const count = counts.get(seg) ?? 0;
      return { seg, count, pct: Math.round((count / total) * 100) };
    });
  }, [rows]);

  const generationStats = useMemo(() => {
    const map = new Map<
      number,
      { count: number; sumLoyalty: number; engaged: number }
    >();
    for (const r of rows) {
      const gen = Number.isFinite(r.generation) ? r.generation : 0;
      const e = map.get(gen) ?? { count: 0, sumLoyalty: 0, engaged: 0 };
      e.count += 1;
      e.sumLoyalty += r.loyaltyScore;
      if (r.segment === "champion" || r.segment === "active") e.engaged += 1;
      map.set(gen, e);
    }
    return [...map.entries()]
      .map(([gen, e]) => ({
        gen,
        count: e.count,
        avgLoyalty: Math.round(e.sumLoyalty / e.count),
        engagedRate: Math.round((e.engaged / e.count) * 100),
      }))
      .sort((a, b) => b.gen - a.gen);
  }, [rows]);

  const momentum = useMemo(() => {
    let rising = 0;
    let falling = 0;
    let flat = 0;
    const cooling: { row: MemberMetricsRow; m: MemberMomentum }[] = [];
    for (const r of rows) {
      const m = momentumByUser.get(r.userId);
      if (!m) continue; // 최근 60일 활동 없음
      if (m.trend === "rising") rising += 1;
      else if (m.trend === "falling") {
        falling += 1;
        cooling.push({ row: r, m });
      } else if (m.trend === "flat") flat += 1;
    }
    cooling.sort(
      (a, b) =>
        b.m.prevCount - b.m.recentCount - (a.m.prevCount - a.m.recentCount),
    );
    return { rising, falling, flat, cooling: cooling.slice(0, 20) };
  }, [rows, momentumByUser]);

  const champions = useMemo(
    () => [...rows].sort((a, b) => b.loyaltyScore - a.loyaltyScore).slice(0, 10),
    [rows],
  );
  const staffAlerts = useMemo(() => rows.filter((r) => r.staffLowActivity), [rows]);
  const dormantList = useMemo(
    () =>
      [...rows]
        .filter((r) => r.segment === "dormant" || r.segment === "at_risk")
        .sort((a, b) => a.loyaltyScore - b.loyaltyScore)
        .slice(0, 30),
    [rows],
  );

  function downloadCsv() {
    const headers = [
      "이름", "역할", "기수", "직책", "로얄티점수", "분류",
      "세미나출석", "활동참여", "게시물", "댓글", "인터뷰응답",
      "연구타이머(시간)", "논문글자수", "계획서보유",
      "세미나후기", "강의후기", "진행중운영진직책", "운영진저활동",
    ];
    const rowsCsv = filtered.map((r) => [
      r.name,
      ROLE_LABEL[r.role],
      r.generation,
      r.position ?? "",
      r.loyaltyScore,
      segmentLabel(r.segment),
      r.attendanceCount,
      r.activityCount,
      r.postCount,
      r.commentCount,
      r.interviewResponseCount,
      r.studyHours,
      r.writingChars,
      r.hasResearchProposal ? "Y" : "N",
      r.seminarReviewCount,
      r.courseReviewCount,
      r.gradLifeOngoingCount,
      r.staffLowActivity ? "Y" : "N",
    ]);
    exportCSV("member-report", headers, rowsCsv);
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border bg-amber-50 p-6 text-center text-sm text-amber-800">
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
        <Kpi icon={Users} color="bg-blue-50 text-blue-700" label="총 회원" value={kpi.total} sub={`${kpi.activeRate}% 챔피언+활성`} />
        <Kpi icon={Trophy} color="bg-violet-50 text-violet-700" label="챔피언" value={kpi.champion} sub="loyalty 70+" />
        <Kpi icon={Clock} color="bg-amber-50 text-amber-700" label="휴면" value={kpi.dormant} sub="loyalty 15 미만" />
        <Kpi icon={ShieldAlert} color="bg-rose-50 text-rose-700" label="운영진 저활동" value={kpi.staffLow} sub="loyalty 30 미만" />
      </section>

      {/* 세그먼트 분포 */}
      <section className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <PieChart size={16} className="text-muted-foreground" />
          회원 세그먼트 분포
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {segmentDist.map(({ seg, count, pct }) =>
            count > 0 ? (
              <div
                key={seg}
                className={SEGMENT_BAR_COLOR[seg]}
                style={{ width: `${pct}%` }}
                title={`${segmentLabel(seg)} ${count}명 (${pct}%)`}
              />
            ) : null,
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {segmentDist.map(({ seg, count, pct }) => (
            <div key={seg} className="flex items-center gap-1.5 text-xs">
              <span className={cn("h-2.5 w-2.5 rounded-full", SEGMENT_BAR_COLOR[seg])} />
              <span className="font-medium">{segmentLabel(seg)}</span>
              <span className="tabular-nums text-muted-foreground">
                {count}명 · {pct}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 기수별 평균 로얄티 */}
      {generationStats.length > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <BarChart3 size={16} className="text-muted-foreground" />
            기수별 평균 로얄티
          </div>
          <div className="space-y-1.5">
            {generationStats.map(({ gen, count, avgLoyalty, engagedRate }) => (
              <div key={gen} className="flex items-center gap-3 text-xs">
                <span className="w-12 shrink-0 font-medium tabular-nums">
                  {gen > 0 ? `${gen}기` : "미상"}
                </span>
                <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground">
                  {count}명
                </span>
                <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-violet-500"
                    style={{ width: `${avgLoyalty}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right font-bold tabular-nums">
                  {avgLoyalty}
                </span>
                <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                  활성 {engagedRate}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            막대 = 기수 평균 로얄티 점수(0-100) · 활성% = 챔피언+활성 세그먼트 비율
          </p>
        </section>
      )}

      {/* 활동 모멘텀 */}
      {momentum.rising + momentum.falling + momentum.flat > 0 && (
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp size={16} className="text-muted-foreground" />
            활동 모멘텀
            <span className="text-xs font-normal text-muted-foreground">
              (최근 30일 vs 이전 30일)
            </span>
          </div>
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight size={14} className="text-emerald-600" />
              상승 <b className="tabular-nums">{momentum.rising}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowRight size={14} className="text-slate-400" />
              유지 <b className="tabular-nums">{momentum.flat}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownRight size={14} className="text-rose-600" />
              하락 <b className="tabular-nums">{momentum.falling}</b>
            </span>
          </div>
          {momentum.cooling.length > 0 ? (
            <>
              <p className="mb-2 text-xs font-medium text-rose-700">
                최근 활동이 식어가는 회원 (하락폭 큰 순)
              </p>
              <ul className="space-y-1.5">
                {momentum.cooling.map(({ row, m }) => (
                  <li
                    key={row.userId}
                    className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm"
                  >
                    <a
                      href={`/profile/${row.userId}`}
                      className="flex-1 truncate font-medium hover:underline"
                    >
                      {row.name}
                    </a>
                    <Badge variant="outline" className="text-[10px]">
                      {ROLE_LABEL[row.role]}
                    </Badge>
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {m.prevCount} → {m.recentCount}
                    </span>
                    <span className="flex items-center gap-0.5 text-xs font-bold tabular-nums text-rose-600">
                      <ArrowDownRight size={12} />
                      {m.prevCount - m.recentCount}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="rounded-lg border border-dashed bg-muted/20 p-3 text-center text-xs text-muted-foreground">
              최근 30일 활동이 감소한 회원이 없습니다.
            </p>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            활동 이벤트 = 세미나 출석·활동 참여·게시물·댓글·인터뷰 응답·연구 세션·후기 작성.
            최근 60일 내 활동 회원만 집계합니다.
          </p>
        </section>
      )}

      {/* 로얄티 추이 (스냅샷 기반) */}
      <LoyaltyTrendSection isAdmin={isAdmin} />

      {/* 운영진 저활동 경보 */}
      {staffAlerts.length > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-800">
            <AlertTriangle size={16} />
            운영진 저활동 경보 ({staffAlerts.length}명)
          </div>
          <p className="mb-3 text-xs text-rose-700/80">
            staff 이상 권한 보유 인원 중 로얄티 점수 30 미만 (참여·콘텐츠·연구 모두 저조).
          </p>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-rose-50/60 text-xs text-rose-800">
                <tr className="text-left">
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">역할</th>
                  <th className="px-3 py-2 font-medium">직책</th>
                  <th className="px-3 py-2 font-medium">로얄티</th>
                  <th className="px-3 py-2 text-right font-medium">출석/활동/콘텐츠</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {staffAlerts.map((r) => (
                  <tr key={r.userId} className="hover:bg-rose-50/30">
                    <td className="px-3 py-2 font-medium">
                      <a href={`/profile/${r.userId}`} className="hover:underline">{r.name}</a>
                    </td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{ROLE_LABEL[r.role]}</Badge></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{r.position ?? "—"}</td>
                    <td className="px-3 py-2 font-bold tabular-nums">{r.loyaltyScore}</td>
                    <td className="px-3 py-2 text-right text-xs">
                      {r.attendanceCount} / {r.activityCount} / {r.postCount + r.commentCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 챔피언 Top 10 */}
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Crown size={16} className="text-violet-600" />
            로얄티 Top 10
          </div>
          <ol className="space-y-2">
            {champions.map((r, i) => (
              <li key={r.userId} className="rounded-lg border bg-muted/10 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    i === 0 ? "bg-amber-400 text-white" : i < 3 ? "bg-amber-200 text-amber-900" : "bg-muted text-foreground",
                  )}>
                    {i + 1}
                  </span>
                  <a href={`/profile/${r.userId}`} className="flex-1 truncate text-sm font-medium hover:underline">
                    {r.name}
                  </a>
                  <Badge variant="outline" className={cn("text-[10px]", segmentColor(r.segment))}>
                    {segmentLabel(r.segment)}
                  </Badge>
                  <span className="w-12 text-right text-sm font-bold tabular-nums">{r.loyaltyScore}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 pl-8 text-[10px] text-muted-foreground">
                  <ScoreChip label="참여" value={r.scoreBreakdown.engagement} max={30} tone="emerald" />
                  <ScoreChip label="콘텐츠" value={r.scoreBreakdown.content} max={25} tone="blue" />
                  <ScoreChip label="연구" value={r.scoreBreakdown.research} max={25} tone="violet" />
                  <ScoreChip label="운영진" value={r.scoreBreakdown.staff} max={10} tone="amber" />
                  <ScoreChip label="후기" value={r.scoreBreakdown.review} max={10} tone="slate" />
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 저활동·휴면 회원 */}
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock size={16} className="text-amber-600" />
            저활동·휴면 회원 (loyalty 15 미만 우선)
          </div>
          {dormantList.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-muted/20 p-4 text-center text-xs text-muted-foreground">
              해당 회원이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {dormantList.map((r) => (
                <li key={r.userId} className="flex items-center gap-2 rounded-lg border bg-muted/10 px-3 py-2 text-sm">
                  <a href={`/profile/${r.userId}`} className="flex-1 truncate font-medium hover:underline">{r.name}</a>
                  <Badge variant="outline" className="text-[10px]">{ROLE_LABEL[r.role]}</Badge>
                  <Badge variant="outline" className={cn("text-[10px]", segmentColor(r.segment))}>{segmentLabel(r.segment)}</Badge>
                  <span className="w-10 text-right text-xs font-bold tabular-nums">{r.loyaltyScore}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 전체 회원 테이블 */}
      <section className="rounded-2xl border bg-card p-5">
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
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">이름</th>
                <th className="px-3 py-2 font-medium">역할/직책</th>
                <SortableHeader label="로얄티" current={sortKey} dir={sortDir} target="loyaltyScore" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <th className="px-3 py-2 font-medium">분류</th>
                <SortableHeader label="출석" current={sortKey} dir={sortDir} target="attendanceCount" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <SortableHeader label="활동" current={sortKey} dir={sortDir} target="activityCount" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <SortableHeader label="게시물" current={sortKey} dir={sortDir} target="postCount" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <SortableHeader label="댓글" current={sortKey} dir={sortDir} target="commentCount" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <SortableHeader label="연구(시간)" current={sortKey} dir={sortDir} target="studyHours" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
                <th className="px-3 py-2 font-medium">계획서</th>
                <SortableHeader label="최근접속" current={sortKey} dir={sortDir} target="daysSinceLogin" onClick={(k) => { setSortKey(k); setSortDir(sortKey === k && sortDir === "desc" ? "asc" : "desc"); }} />
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
                  <td className="px-3 py-2 text-center tabular-nums">{r.attendanceCount}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.activityCount}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.postCount}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.commentCount}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.studyHours > 0 ? r.studyHours.toFixed(1) : "-"}</td>
                  <td className="px-3 py-2 text-center">
                    {r.hasResearchProposal ? (
                      <Badge variant="outline" className="bg-violet-50 text-violet-700 text-[10px]">
                        <FileText size={10} className="mr-0.5" />보유
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{formatDays(r.daysSinceLogin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          로얄티 점수 (총 100): 참여(30) — 출석×3·활동×5 / 콘텐츠(25) — 게시물×3·댓글×1·인터뷰응답×1.5 /
          연구(25) — 타이머시간÷5·논문글자수÷500·계획서5점 / 운영진(10) — 권한5+직책5 / 후기(10) — 세미나후기×2·강의후기×2.
          접속 기준은 산출에서 제외하고 보조 정보로만 표시합니다.
        </p>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, color, label, value, sub }: {
  icon: React.ElementType; color: string; label: string; value: number; sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
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

const SCORE_CHIP_TONE = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  slate: "bg-slate-50 text-slate-600 border-slate-200",
} as const;

/** 세그먼트 분포 막대·범례용 솔리드 색상 */
const SEGMENT_BAR_COLOR: Record<MemberMetricsRow["segment"], string> = {
  champion: "bg-violet-500",
  active: "bg-emerald-500",
  new: "bg-blue-500",
  at_risk: "bg-amber-500",
  dormant: "bg-slate-400",
};

function ScoreChip({ label, value, max, tone }: {
  label: string; value: number; max: number; tone: keyof typeof SCORE_CHIP_TONE;
}) {
  const dim = value === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 tabular-nums",
        SCORE_CHIP_TONE[tone],
        dim && "opacity-50",
      )}
      title={`${label} ${value}/${max}`}
    >
      <span className="font-medium">{label}</span>
      <span className="font-bold">{value}</span>
      <span className="text-[9px] opacity-60">/{max}</span>
    </span>
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

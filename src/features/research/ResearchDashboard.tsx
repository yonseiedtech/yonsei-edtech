"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { ResearchPaper, WritingPaperHistory } from "@/types";
import {
  computeWritingDays,
  computeParticipationRate,
  computeLongestStreak,
  computeHourBuckets,
  computeWeekdayBuckets,
  computeReadingStats,
  computeAvgReadDuration,
  computeTopKeywords,
  computeVariableBreakdown,
} from "@/lib/research-stats";
import { formatPeriodLabel } from "@/lib/research-period";
import { Calendar, Flame, Clock4, BarChart3, BookMarked, CheckCheck, Hourglass, Hash, Variable } from "lucide-react";

interface Props {
  papers: ResearchPaper[];
  history: WritingPaperHistory[];
  periodStart?: string | null;
  periodEnd?: string | null;
}

const VARIABLE_LABEL: Record<string, string> = {
  independent: "독립 변인",
  dependent: "종속 변인",
  mediator: "매개 변인",
  moderator: "조절 변인",
  control: "통제 변인",
};

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];

export default function ResearchDashboard({ papers, history, periodStart, periodEnd }: Props) {
  const opts = { periodStart, periodEnd };
  const periodLabel = formatPeriodLabel(periodStart, periodEnd);

  // 작성 통계
  const writingDays = useMemo(() => computeWritingDays(history, opts), [history, periodStart, periodEnd]);
  const participation = useMemo(() => computeParticipationRate(history, opts), [history, periodStart, periodEnd]);
  const streak = useMemo(() => computeLongestStreak(history, opts), [history, periodStart, periodEnd]);
  const hourBuckets = useMemo(() => computeHourBuckets(history, opts), [history, periodStart, periodEnd]);
  const weekdayBuckets = useMemo(() => computeWeekdayBuckets(history, opts), [history, periodStart, periodEnd]);

  // 읽기 통계
  const readingStats = useMemo(() => computeReadingStats(papers, opts), [papers, periodStart, periodEnd]);
  const avgDuration = useMemo(() => computeAvgReadDuration(papers, opts), [papers, periodStart, periodEnd]);
  const topKeywords = useMemo(() => computeTopKeywords(papers, 12, opts), [papers, periodStart, periodEnd]);
  const variableBreakdown = useMemo(() => computeVariableBreakdown(papers, 5, opts), [papers, periodStart, periodEnd]);

  const hourData = hourBuckets.map((v, i) => ({ hour: `${String(i).padStart(2, "0")}시`, count: v }));
  const weekdayData = weekdayBuckets.map((v, i) => ({ day: WEEKDAY_LABEL[i], count: v }));

  return (
    <div className="space-y-6">
      {/* 메인 4지표 */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">요약 지표</h2>
          <span className="text-[11px] text-muted-foreground">{periodLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={<Calendar size={16} />} label="작성활동일" value={`${writingDays}일`} hint="저장 기록이 있는 날" tone="emerald" />
          <MetricCard icon={<Flame size={16} />} label="작성 참여률" value={`${participation}%`} hint="활동일 / 기간 일수" tone="amber" />
          <MetricCard icon={<BookMarked size={16} />} label="등록 논문" value={`${readingStats.total}건`} hint={`완독 ${readingStats.completed}건`} tone="sky" />
          <MetricCard icon={<Hourglass size={16} />} label="평균 완독일" value={avgDuration !== null ? `${avgDuration}일` : "—"} hint="완독 시작~종료 평균" tone="violet" />
        </div>
      </section>

      {/* 작성 세부 지표 */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold">작성 세부 지표</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Flame size={14} />
              최대 연속 작성일
            </div>
            <p className="mt-2 text-3xl font-bold leading-none">{streak}<span className="ml-1 text-base font-medium text-muted-foreground">일</span></p>
            <p className="mt-2 text-[11px] text-muted-foreground">중단 없이 매일 저장한 최장 기간</p>
          </div>

          <div className="rounded-2xl border bg-white p-4 lg:col-span-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock4 size={14} />
              작성 시간대 (저장 시각 기준)
            </div>
            <div className="mt-2 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} axisLine={false} tickLine={false} width={24} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {hourData.map((_, i) => (
                      <Cell key={i} fill="#3b82f6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4 lg:col-span-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <BarChart3 size={14} />
              요일별 작성 활동
            </div>
            <div className="mt-2 h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} allowDecimals={false} axisLine={false} tickLine={false} width={24} />
                  <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {weekdayData.map((_, i) => (
                      <Cell key={i} fill={i === 0 || i === 6 ? "#f97316" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* 읽기 세부 지표 */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold">읽기 세부 지표</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat icon={<BookMarked size={14} />} label="총 등록" value={`${readingStats.total}건`} />
          <MiniStat icon={<CheckCheck size={14} />} label="완독" value={`${readingStats.completed}건`} />
          <MiniStat icon={<Hourglass size={14} />} label="평균 완독 소요" value={avgDuration !== null ? `${avgDuration}일` : "—"} />
          <MiniStat icon={<Calendar size={14} />} label="읽는 중" value={`${readingStats.reading}건`} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Hash size={14} />
              주요 키워드 (Top 12)
            </div>
            {topKeywords.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">키워드(태그)가 등록된 논문이 없습니다.</p>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {topKeywords.map(({ tag, count }) => (
                  <li
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-[11px]"
                  >
                    <span className="font-medium text-foreground">#{tag}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Variable size={14} />
              변인별 정리
            </div>
            <div className="mt-3 space-y-2">
              {(["independent", "dependent", "mediator", "moderator", "control"] as const).map((g) => {
                const items = variableBreakdown[g];
                return (
                  <div key={g} className="flex items-start gap-2 border-b pb-2 last:border-b-0 last:pb-0">
                    <span className="w-16 shrink-0 text-[11px] font-medium text-muted-foreground">{VARIABLE_LABEL[g]}</span>
                    {items.length === 0 ? (
                      <span className="flex-1 text-[11px] text-muted-foreground">—</span>
                    ) : (
                      <ul className="flex flex-1 flex-wrap gap-1">
                        {items.map(({ name, count }) => (
                          <li
                            key={name}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px]"
                          >
                            <span className="text-foreground">{name}</span>
                            <span className="text-muted-foreground">×{count}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, hint, tone = "sky" }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: "emerald" | "amber" | "sky" | "violet" }) {
  const ring: Record<string, string> = {
    emerald: "ring-emerald-100 bg-emerald-50/40",
    amber: "ring-amber-100 bg-amber-50/40",
    sky: "ring-sky-100 bg-sky-50/40",
    violet: "ring-violet-100 bg-violet-50/40",
  };
  const text: Record<string, string> = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    sky: "text-sky-700",
    violet: "text-violet-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ring-1 ${ring[tone]}`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-medium ${text[tone]}`}>
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold leading-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-3 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold leading-tight">{value}</p>
    </div>
  );
}

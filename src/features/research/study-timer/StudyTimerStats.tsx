"use client";

import { useMemo } from "react";
import { useStudySessions } from "./useStudySessions";
import { Clock, Flame, Target, BookOpen } from "lucide-react";
import { todayYmdLocal } from "@/lib/dday";
import type { StudySession } from "@/types";

function fmtMinutes(min: number): string {
  if (min < 1) return "0분";
  if (min < 60) return `${Math.round(min)}분`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

function semesterStartIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  // 1학기: 3월 1일 / 2학기: 9월 1일 기준
  const start = m < 6 ? new Date(y, 2, 1) : new Date(y, 8, 1);
  return todayYmdLocal(start);
}

function weekStartIso(): string {
  const now = new Date();
  const day = now.getDay() || 7; // 일=0 → 7로
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day - 1));
  return todayYmdLocal(monday);
}

interface DailyBucket {
  date: string;
  minutes: number;
}

function buildLast7Days(sessions: StudySession[]): DailyBucket[] {
  const today = new Date();
  const buckets: DailyBucket[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    buckets.push({ date: todayYmdLocal(d), minutes: 0 });
  }
  for (const s of sessions) {
    if (!s.endTime || !s.startTime) continue;
    const day = todayYmdLocal(new Date(s.startTime));
    const b = buckets.find((x) => x.date === day);
    if (b) b.minutes += s.durationMinutes || 0;
  }
  return buckets;
}

interface PaperRank {
  title: string;
  minutes: number;
  count: number;
}

function topPapers(sessions: StudySession[], limit = 3): PaperRank[] {
  const map = new Map<string, PaperRank>();
  for (const s of sessions) {
    if (!s.endTime) continue;
    const key = s.targetTitle || "제목 없음";
    const cur = map.get(key) ?? { title: key, minutes: 0, count: 0 };
    cur.minutes += s.durationMinutes || 0;
    cur.count += 1;
    map.set(key, cur);
  }
  return Array.from(map.values())
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, limit);
}

export default function StudyTimerStats() {
  const { sessions, isLoading } = useStudySessions();

  const stats = useMemo(() => {
    const today = todayYmdLocal();
    const weekStart = weekStartIso();
    const semStart = semesterStartIso();

    const completed = sessions.filter((s) => !!s.endTime);

    let todayMin = 0;
    let weekMin = 0;
    let semMin = 0;
    let focusSum = 0;
    let focusCount = 0;
    for (const s of completed) {
      const day = s.startTime ? todayYmdLocal(new Date(s.startTime)) : "";
      const dur = s.durationMinutes || 0;
      if (day === today) todayMin += dur;
      if (day >= weekStart) weekMin += dur;
      if (day >= semStart) semMin += dur;
      if (typeof s.focusScore === "number") {
        focusSum += s.focusScore;
        focusCount += 1;
      }
    }

    return {
      todayMin,
      weekMin,
      semMin,
      avgFocus: focusCount > 0 ? Math.round((focusSum / focusCount) * 10) / 10 : null,
      buckets: buildLast7Days(completed),
      tops: topPapers(completed),
      totalCount: completed.length,
    };
  }, [sessions]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
        타이머 통계 불러오는 중...
      </div>
    );
  }

  const maxMin = Math.max(1, ...stats.buckets.map((b) => b.minutes));

  return (
    <section className="rounded-2xl border bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Clock size={14} className="text-primary" />
          내 연구 타이머
        </h3>
        <span className="text-[11px] text-muted-foreground">
          누적 세션 {stats.totalCount}회
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatBox
          icon={<Flame size={14} className="text-orange-500" />}
          label="오늘"
          value={fmtMinutes(stats.todayMin)}
        />
        <StatBox
          icon={<Clock size={14} className="text-blue-500" />}
          label="이번주"
          value={fmtMinutes(stats.weekMin)}
        />
        <StatBox
          icon={<BookOpen size={14} className="text-violet-500" />}
          label="이번 학기"
          value={fmtMinutes(stats.semMin)}
        />
        <StatBox
          icon={<Target size={14} className="text-emerald-500" />}
          label="평균 집중도"
          value={stats.avgFocus !== null ? `${stats.avgFocus}/5` : "—"}
        />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
          최근 7일 학습량
        </p>
        <div className="flex items-end gap-1.5 h-20">
          {stats.buckets.map((b) => {
            const ratio = b.minutes / maxMin;
            const heightPct = b.minutes === 0 ? 4 : Math.max(8, ratio * 100);
            const dow = new Date(b.date).toLocaleDateString("ko-KR", {
              weekday: "short",
            });
            return (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-full rounded-t-sm transition-colors ${
                    b.minutes > 0 ? "bg-primary/70" : "bg-muted"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`${b.date} · ${fmtMinutes(b.minutes)}`}
                />
                <span className="text-[10px] text-muted-foreground">{dow}</span>
              </div>
            );
          })}
        </div>
      </div>

      {stats.tops.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            가장 많이 학습한 논문 / 자료
          </p>
          <ol className="space-y-1.5">
            {stats.tops.map((t, i) => (
              <li
                key={t.title}
                className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2.5 py-1.5"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="truncate text-xs">{t.title}</span>
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {fmtMinutes(t.minutes)} · {t.count}회
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {stats.totalCount === 0 && (
        <p className="rounded-md border border-dashed bg-muted/10 px-3 py-4 text-center text-xs text-muted-foreground">
          아직 타이머 기록이 없습니다. 논문 읽기 또는 작성 화면에서 타이머를 시작해보세요.
        </p>
      )}
    </section>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 px-3 py-2">
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

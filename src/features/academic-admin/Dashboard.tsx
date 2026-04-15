"use client";

import { useQuery } from "@tanstack/react-query";
import { seminarsApi, activitiesApi } from "@/lib/bkend";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getComputedStatus } from "@/lib/seminar-utils";
import type { Seminar, Activity } from "@/types";
import { Calendar, BookOpen, Users, FolderKanban, Globe, AlertTriangle } from "lucide-react";
import Link from "next/link";

function StatCard({ icon, title, color, stats, href }: { icon: React.ReactNode; title: string; color: string; stats: { label: string; value: number }[]; href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-xl border-l-4 border bg-white p-4 transition-shadow hover:shadow-md",
        color,
      )}
    >
      <div className="flex items-center justify-between text-sm font-semibold">
        <span className="flex items-center gap-2">{icon}{title}</span>
        <span className="text-[10px] font-normal text-muted-foreground">관리 →</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default function AcademicDashboard() {
  const { data: seminars = [] } = useQuery({
    queryKey: ["seminars-dashboard"],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 100 });
      return res.data as unknown as Seminar[];
    },
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["activities-project"],
    queryFn: async () => { const r = await activitiesApi.list("project"); return r.data as Activity[]; },
  });

  const { data: studies = [] } = useQuery({
    queryKey: ["activities-study"],
    queryFn: async () => { const r = await activitiesApi.list("study"); return r.data as Activity[]; },
  });

  const { data: externals = [] } = useQuery({
    queryKey: ["activities-external"],
    queryFn: async () => { const r = await activitiesApi.list("external"); return r.data as Activity[]; },
  });

  const seminarStats = {
    total: seminars.length,
    upcoming: seminars.filter((s) => getComputedStatus(s) === "upcoming").length,
    ongoing: seminars.filter((s) => getComputedStatus(s) === "ongoing").length,
    completed: seminars.filter((s) => getComputedStatus(s) === "completed").length,
    totalAttendees: seminars.reduce((sum, s) => sum + s.attendeeIds.length, 0),
  };

  const activityStats = (list: Activity[]) => ({
    total: list.length,
    ongoing: list.filter((a) => a.status === "ongoing" || a.status === "upcoming").length,
    completed: list.filter((a) => a.status === "completed").length,
    recruiting: list.filter((a) => a.recruitmentStatus === "recruiting").length,
    totalParticipants: list.reduce((sum, a) => sum + ((a.participants as string[]) ?? []).length, 0),
  });

  const projectStats = activityStats(projects);
  const studyStats = activityStats(studies);
  const externalStats = activityStats(externals);

  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split("T")[0];
  const weekStr = weekLater.toISOString().split("T")[0];

  const upcomingEvents: { type: string; title: string; date: string; link: string; extra?: string }[] = [];

  seminars.filter((s) => s.date >= todayStr && s.date <= weekStr && getComputedStatus(s) !== "cancelled").forEach((s) => {
    const timeline = s.timeline ?? [];
    const total = timeline.length;
    const done = timeline.filter((t) => t.done).length;
    upcomingEvents.push({ type: "세미나", title: s.title, date: `${s.date} ${s.time}`, link: `/seminars/${s.id}`, extra: total > 0 ? `준비 ${Math.round((done / total) * 100)}%` : undefined });
  });

  [...projects, ...studies, ...externals].filter((a) => a.date >= todayStr && a.date <= weekStr && a.status !== "completed").forEach((a) => {
    const label = a.type === "project" ? "프로젝트" : a.type === "study" ? "스터디" : "대외활동";
    upcomingEvents.push({ type: label, title: a.title, date: a.date, link: `/activities/${a.type === "project" ? "projects" : a.type === "study" ? "studies" : "external"}/${a.id}` });
  });

  upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));

  const warnings: { message: string; link: string }[] = [];

  seminars.filter((s) => getComputedStatus(s) === "upcoming").forEach((s) => {
    const timeline = s.timeline ?? [];
    const overdue = timeline.filter((t) => {
      if (t.done) return false;
      const semDate = new Date(s.date);
      const diffDays = Math.round((semDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return t.dDay <= 0 ? diffDays <= Math.abs(t.dDay) : false;
    });
    if (overdue.length > 0) {
      warnings.push({ message: `${s.title}: 미완료 준비 항목 ${overdue.length}건`, link: `/seminars/${s.id}/lms` });
    }
  });

  [...projects, ...studies, ...externals].forEach((a) => {
    if (a.recruitmentStatus === "recruiting" && a.date && a.date < todayStr) {
      warnings.push({ message: `${a.title}: 시작일 경과했으나 아직 모집중`, link: `/activities/${a.type === "project" ? "projects" : a.type === "study" ? "studies" : "external"}/${a.id}` });
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<BookOpen size={20} />} title="세미나" color="border-l-blue-500" href="/academic-admin/seminars" stats={[
          { label: "완료", value: seminarStats.completed },
          { label: "예정", value: seminarStats.upcoming },
          { label: "진행중", value: seminarStats.ongoing },
          { label: "총 참석자", value: seminarStats.totalAttendees },
        ]} />
        <StatCard icon={<Users size={20} />} title="스터디" color="border-l-green-500" href="/academic-admin/studies" stats={[
          { label: "진행/예정", value: studyStats.ongoing },
          { label: "완료", value: studyStats.completed },
          { label: "모집중", value: studyStats.recruiting },
          { label: "참여자", value: studyStats.totalParticipants },
        ]} />
        <StatCard icon={<FolderKanban size={20} />} title="프로젝트" color="border-l-purple-500" href="/academic-admin/projects" stats={[
          { label: "진행/예정", value: projectStats.ongoing },
          { label: "완료", value: projectStats.completed },
          { label: "모집중", value: projectStats.recruiting },
          { label: "참여자", value: projectStats.totalParticipants },
        ]} />
        <StatCard icon={<Globe size={20} />} title="대외 학술대회" color="border-l-amber-500" href="/academic-admin/external" stats={[
          { label: "진행/예정", value: externalStats.ongoing },
          { label: "완료", value: externalStats.completed },
          { label: "모집중", value: externalStats.recruiting },
          { label: "참여자", value: externalStats.totalParticipants },
        ]} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Calendar size={16} />이번 주 일정</h2>
          {upcomingEvents.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">이번 주 예정된 일정이 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {upcomingEvents.map((e, i) => (
                <Link key={i} href={e.link} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm hover:bg-muted/30">
                  <Badge variant="secondary" className="text-[10px] shrink-0">{e.type}</Badge>
                  <span className="flex-1 truncate font-medium">{e.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{e.date}</span>
                  {e.extra && <Badge variant="secondary" className="text-[10px] shrink-0">{e.extra}</Badge>}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-5">
          <h2 className="flex items-center gap-2 font-semibold text-amber-600"><AlertTriangle size={16} />주의 필요</h2>
          {warnings.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">현재 주의가 필요한 항목이 없습니다.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {warnings.map((w, i) => (
                <Link key={i} href={w.link} className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm hover:bg-amber-100">
                  <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                  <span className="flex-1">{w.message}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

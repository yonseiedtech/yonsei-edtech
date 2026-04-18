"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BookOpen, FolderKanban, Users, Globe, Calendar, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSeminars } from "@/features/seminar/useSeminar";
import { usePosts } from "@/features/board/useBoard";
import { formatDate } from "@/lib/utils";

const activities = [
  {
    icon: BookOpen,
    category: "세미나",
    title: "정기 세미나",
    desc: "매주 교육공학/에듀테크 관련 최신 논문이나 트렌드를 발제하고 토론합니다.",
    schedule: "매주 수요일",
    color: "bg-primary/10 text-primary",
    href: "/seminars",
  },
  {
    icon: FolderKanban,
    category: "프로젝트",
    title: "프로젝트",
    desc: "실제 교육 현장의 문제를 기술로 해결하는 프로토타입을 개발합니다.",
    schedule: "학기 단위",
    color: "bg-secondary/10 text-secondary",
    href: "/activities/projects",
  },
  {
    icon: Users,
    category: "스터디",
    title: "주제별 스터디",
    desc: "AI 교육, UX 리서치, 교수설계 등 관심 주제별로 소그룹 스터디를 운영합니다.",
    schedule: "수시",
    color: "bg-accent/10 text-accent",
    href: "/activities/studies",
  },
  {
    icon: Globe,
    category: "대외활동",
    title: "대외 학술대회",
    desc: "외부 학술대회 참가, 학회 발표 등 대외 활동을 통해 학문적 역량을 확장합니다.",
    schedule: "수시",
    color: "bg-amber-50 text-amber-700",
    href: "/activities/external",
  },
];

export default function ActivitiesPage() {
  const { seminars } = useSeminars("completed");
  const { posts } = usePosts("all");

  const highlights = useMemo(() => {
    const completedSeminars = seminars.map((s) => ({
      category: "세미나",
      color: "bg-primary/10 text-primary",
      title: s.title,
      desc: `${s.speaker} 발표 · ${s.location}`,
      date: s.date,
      sortKey: s.date,
    }));

    const recentPosts = posts
      .filter((p) => p.category === "notice" || p.category === "promotion")
      .map((p) => ({
        category: p.category === "notice" ? "공지" : "홍보",
        color: p.category === "notice" ? "bg-amber-50 text-amber-700" : "bg-secondary/10 text-secondary",
        title: p.title,
        desc: p.content.split("\n")[0].slice(0, 60),
        date: formatDate(p.createdAt),
        sortKey: p.createdAt,
      }));

    return [...completedSeminars, ...recentPosts]
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey))
      .slice(0, 6);
  }, [seminars, posts]);

  return (
    <div className="py-16">
      {/* 헤더 */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">활동 소개</h1>
            <p className="text-sm text-muted-foreground">
              세미나, 프로젝트, 스터디를 통해 교육공학의 이론과 실천을 연결합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 활동 카드 */}
      <section className="mx-auto mt-8 max-w-5xl px-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {activities.map((a) => (
            <Link
              key={a.title}
              href={a.href}
              className="group rounded-2xl border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.color}`}>
                  <a.icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {a.category}
                  </span>
                  <h3 className="text-lg font-bold">{a.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {a.desc}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      {a.schedule}
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      자세히 보기 <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 주요 활동 내역 */}
      <section className="mx-auto mt-12 max-w-5xl px-4">
        <h2 className="text-lg font-bold">주요 활동 내역</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {highlights.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              활동 내역이 없습니다.
            </div>
          ) : (
            highlights.map((h, i) => (
              <div key={i} className="flex gap-4 rounded-xl border bg-white p-4">
                <div className="shrink-0 text-sm font-bold text-primary">
                  {h.date.length > 10 ? h.date : formatDate(h.date)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn("text-[10px]", h.color)}>{h.category}</Badge>
                    <h3 className="font-medium">{h.title}</h3>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{h.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { BookOpen, FolderKanban, Users, Calendar } from "lucide-react";
import { useSeminars } from "@/features/seminar/useSeminar";
import { usePosts } from "@/features/board/useBoard";
import { formatDate } from "@/lib/utils";

const activities = [
  {
    icon: BookOpen,
    category: "세미나",
    title: "정기 세미나",
    desc: "매주 교육공학/에듀테크 관련 최신 논문이나 트렌드를 발제하고 토론합니다. 학회원이 직접 주제를 선정하고 발표를 준비합니다.",
    schedule: "매주 수요일",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: FolderKanban,
    category: "프로젝트",
    title: "팀 프로젝트",
    desc: "실제 교육 현장의 문제를 기술로 해결하는 프로토타입을 개발합니다. 기획부터 개발, 사용성 테스트까지 전 과정을 경험합니다.",
    schedule: "학기 단위",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: Users,
    category: "스터디",
    title: "주제별 스터디",
    desc: "AI 교육, UX 리서치, 교수설계 등 관심 주제별로 소그룹 스터디를 운영합니다. 깊이 있는 학습과 실습을 병행합니다.",
    schedule: "수시",
    color: "bg-accent/10 text-accent",
  },
];

export default function ActivitiesPage() {
  const { seminars } = useSeminars("completed");
  const { posts } = usePosts("all");

  const highlights = useMemo(() => {
    const completedSeminars = seminars.map((s) => ({
      title: s.title,
      desc: `${s.speaker} 발표 · ${s.location}`,
      date: s.date,
      sortKey: s.date,
    }));

    const recentPosts = posts
      .filter((p) => p.category === "notice" || p.category === "promotion")
      .map((p) => ({
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
      <section className="mx-auto max-w-6xl px-4 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">활동 소개</h1>
        <p className="mt-4 text-muted-foreground">
          세미나, 프로젝트, 스터디를 통해 교육공학의 이론과 실천을 연결합니다.
        </p>
      </section>

      {/* Activity Types */}
      <section className="mx-auto mt-16 max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-3">
          {activities.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${a.color}`}
              >
                <a.icon size={24} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {a.category}
              </span>
              <h3 className="mt-1 text-xl font-bold">{a.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {a.desc}
              </p>
              <div className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar size={14} />
                {a.schedule}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Highlights */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="text-center text-2xl font-bold">주요 활동 내역</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {highlights.length === 0 ? (
            <div className="col-span-2 py-8 text-center text-sm text-muted-foreground">
              활동 내역이 없습니다.
            </div>
          ) : (
            highlights.map((h, i) => (
              <div
                key={i}
                className="flex gap-4 rounded-xl border bg-white p-5"
              >
                <div className="shrink-0 text-sm font-bold text-primary">
                  {h.date.length > 10 ? h.date : formatDate(h.date)}
                </div>
                <div>
                  <h3 className="font-semibold">{h.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{h.desc}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

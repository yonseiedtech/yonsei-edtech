"use client";

import Link from "next/link";
import { BookOpen, FolderKanban, Users, Globe, ArrowRight } from "lucide-react";

const CARDS = [
  {
    href: "/academic-admin/seminars",
    title: "세미나",
    desc: "목록·생성·홍보·타임라인·신청/참석·수료증",
    icon: BookOpen,
    color: "bg-primary/10 text-primary",
  },
  {
    href: "/academic-admin/projects",
    title: "프로젝트",
    desc: "교육 문제 해결 프로토타입 팀 운영",
    icon: FolderKanban,
    color: "bg-secondary/15 text-amber-700",
  },
  {
    href: "/academic-admin/studies",
    title: "스터디",
    desc: "전공/관심 분야 학습 스터디 운영",
    icon: Users,
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    href: "/academic-admin/external",
    title: "대외 학술대회",
    desc: "외부 학회·컨퍼런스 참여 관리",
    icon: Globe,
    color: "bg-blue-50 text-blue-700",
  },
];

export default function AcademicAdminDashboardPage() {
  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-4 rounded-2xl border bg-white p-5 transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${card.color}`}
            >
              <card.icon size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{card.title}</h3>
                <ArrowRight
                  size={16}
                  className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p>
          💡 각 활동 유형을 클릭하면 해당 활동의 목록·생성·관리 화면으로 이동합니다.
          공통 콘텐츠(소개문구, 이미지 등)는{" "}
          <Link href="/admin/settings/activities" className="text-primary underline underline-offset-2">
            사이트 설정
          </Link>
          에서 관리합니다.
        </p>
      </div>
    </div>
  );
}

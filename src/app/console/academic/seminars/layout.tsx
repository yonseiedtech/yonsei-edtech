"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  PlusCircle,
  Megaphone,
  ListChecks,
  Award,
  ClipboardList,
  CalendarDays,
} from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

const SUB_TABS = [
  { href: "/console/academic/seminars", label: "세미나 목록", icon: BookOpen, exact: true },
  { href: "/console/academic/seminars/create", label: "세미나 생성", icon: PlusCircle },
  { href: "/console/academic/seminars/promotion", label: "홍보 제작", icon: Megaphone },
  { href: "/console/academic/seminars/timeline", label: "운영 타임라인", icon: ListChecks },
  { href: "/console/academic/seminars/registrations", label: "신청/참석 관리", icon: ClipboardList },
  { href: "/console/academic/seminars/certificate", label: "수료증/명찰", icon: Award },
];

export default function SeminarsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 → 하위 nav → 콘텐츠 순서 (콘솔 전체 통일) */}
      <ConsolePageHeader
        icon={CalendarDays}
        title="세미나 관리"
        description="세미나 일정을 등록하고 출석/리뷰/수료증을 관리합니다."
      />
      <nav className="inline-flex h-10 items-center justify-center gap-0.5 overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground">
        {SUB_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-3 py-1.5 text-xs font-medium transition-all sm:text-sm",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "hover:bg-background/50 hover:text-foreground",
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div>{children}</div>
    </div>
  );
}

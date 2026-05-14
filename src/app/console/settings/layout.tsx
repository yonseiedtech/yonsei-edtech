"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

const SETTINGS_GROUPS = [
  {
    label: "학회소개",
    tabs: [
      { href: "/console/settings/greeting", label: "인사말" },
      { href: "/console/settings/about", label: "학회 소개" },
      { href: "/console/settings/fields", label: "활동 분야" },
      { href: "/console/settings/history", label: "연혁" },
    ],
  },
  {
    label: "구성원",
    tabs: [
      { href: "/console/settings/professor", label: "주임교수" },
      { href: "/console/settings/org-chart", label: "운영진 조직도" },
      { href: "/console/settings/presidents", label: "역대 회장" },
    ],
  },
  {
    label: "학술활동",
    tabs: [
      { href: "/console/settings/activities", label: "활동 소개" },
      { href: "/console/settings/projects", label: "프로젝트" },
      { href: "/console/settings/studies", label: "스터디" },
      { href: "/console/settings/external", label: "대외활동" },
    ],
  },
  {
    label: "기타",
    tabs: [
      { href: "/console/settings/contact", label: "연락처" },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* 섹션 헤더 → 하위 nav → 콘텐츠 순서 (콘솔 전체 통일) */}
      <ConsolePageHeader
        icon={Settings}
        title="홈페이지 설정"
        description="홈페이지에 노출되는 학회 소개·구성원·학술활동 정보를 관리합니다."
      />
      <nav className="flex flex-wrap items-center gap-x-1 gap-y-2">
        {SETTINGS_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-0.5">
            {gi > 0 && <div className="mx-1.5 h-4 w-px bg-border" />}
            <span className="mr-1 text-[10px] font-semibold text-muted-foreground/70">{group.label}</span>
            <div className="inline-flex items-center rounded-md bg-muted p-1">
              {group.tabs.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "shrink-0 rounded-sm px-3 py-1.5 text-xs font-medium transition-all",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {children}
    </div>
  );
}

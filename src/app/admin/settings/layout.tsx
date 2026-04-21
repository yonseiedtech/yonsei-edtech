"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SETTINGS_GROUPS = [
  {
    label: "학회소개",
    tabs: [
      { href: "/admin/settings/greeting", label: "인사말" },
      { href: "/admin/settings/about", label: "학회 소개" },
      { href: "/admin/settings/fields", label: "활동 분야" },
      { href: "/admin/settings/history", label: "연혁" },
    ],
  },
  {
    label: "구성원",
    tabs: [
      { href: "/admin/settings/professor", label: "주임교수" },
      { href: "/admin/settings/org-chart", label: "운영진 조직도" },
      { href: "/admin/settings/presidents", label: "역대 회장" },
    ],
  },
  {
    label: "학술활동",
    tabs: [
      { href: "/admin/settings/activities", label: "활동 소개" },
      { href: "/admin/settings/projects", label: "프로젝트" },
      { href: "/admin/settings/studies", label: "스터디" },
      { href: "/admin/settings/external", label: "대외활동" },
    ],
  },
  {
    label: "기타",
    tabs: [
      { href: "/admin/settings/contact", label: "연락처" },
      { href: "/admin/settings/page-headers", label: "페이지 헤더" },
    ],
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-x-1 gap-y-2 pb-4">
        {SETTINGS_GROUPS.map((group, gi) => (
          <div key={group.label} className="flex items-center gap-1">
            {gi > 0 && <div className="mx-1.5 h-4 w-px bg-border" />}
            <span className="mr-0.5 text-[10px] font-semibold text-muted-foreground/70">{group.label}</span>
            {group.tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      {children}
    </div>
  );
}

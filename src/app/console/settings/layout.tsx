"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

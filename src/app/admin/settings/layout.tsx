"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SETTINGS_TABS = [
  { href: "/admin/settings/greeting", label: "인사말" },
  { href: "/admin/settings/professor", label: "주임교수" },
  { href: "/admin/settings/about", label: "학회 소개" },
  { href: "/admin/settings/history", label: "연혁" },
  { href: "/admin/settings/fields", label: "활동 분야" },
  { href: "/admin/settings/contact", label: "연락처" },
  { href: "/admin/settings/presidents", label: "역대 회장" },
  { href: "/admin/settings/org-chart", label: "운영진 조직도" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <nav className="flex gap-1 overflow-x-auto pb-4">
        {SETTINGS_TABS.map((tab) => {
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
      </nav>
      {children}
    </div>
  );
}

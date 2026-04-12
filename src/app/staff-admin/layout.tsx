"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  ArrowRightLeft,
} from "lucide-react";

const TABS = [
  { href: "/staff-admin", label: "업무수행철", icon: BookOpen, exact: true },
  { href: "/staff-admin/todos", label: "To-Do", icon: ClipboardList },
  { href: "/staff-admin/activity-dashboard", label: "학술활동 대시보드", icon: LayoutDashboard },
  { href: "/staff-admin/transition", label: "운영진 교체", icon: ArrowRightLeft },
];

function StaffAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">운영진 관리</h1>
        </div>

        <nav className="mt-8 flex flex-wrap gap-0 border-b sm:overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-none items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-6">{children}</div>
      </div>
    </div>
  );
}

export default function StaffAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <StaffAdminShell>{children}</StaffAdminShell>
    </AuthGuard>
  );
}

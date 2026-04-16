"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  FolderKanban,
  Users,
  Globe,
  Award,
} from "lucide-react";

const HUB_TABS = [
  { href: "/academic-admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/academic-admin/seminars", label: "세미나", icon: BookOpen },
  { href: "/academic-admin/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/academic-admin/studies", label: "스터디", icon: Users },
  { href: "/academic-admin/external", label: "대외 학술대회", icon: Globe },
  { href: "/academic-admin/certificates", label: "수료증·감사장", icon: Award },
];

function AcademicAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={28} className="text-primary" />
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">학술활동 관리</h1>
            <p className="text-sm text-muted-foreground">
              세미나·프로젝트·스터디·대외활동을 한 곳에서 운영합니다.
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap gap-0 border-b sm:overflow-x-auto">
          {HUB_TABS.map((tab) => {
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

export default function AcademicAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <AcademicAdminShell>{children}</AcademicAdminShell>
    </AuthGuard>
  );
}

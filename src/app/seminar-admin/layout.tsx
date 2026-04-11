"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthGuard from "@/features/auth/AuthGuard";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  PlusCircle,
  Megaphone,
  ListChecks,
  BarChart3,
  Award,
  ClipboardList,
} from "lucide-react";

const TABS = [
  { href: "/seminar-admin", label: "세미나 목록", icon: BookOpen, exact: true },
  { href: "/seminar-admin/create", label: "세미나 생성", icon: PlusCircle },
  { href: "/seminar-admin/promotion", label: "홍보 제작", icon: Megaphone },
  { href: "/seminar-admin/timeline", label: "운영 타임라인", icon: ListChecks },
  { href: "/seminar-admin/registrations", label: "참석자", icon: ClipboardList },
  { href: "/seminar-admin/report", label: "참석 분석", icon: BarChart3 },
  { href: "/seminar-admin/certificate", label: "수료증/명찰", icon: Award },
];

function SeminarAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="py-16">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-primary" />
          <h1 className="text-3xl font-bold">세미나 관리</h1>
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

export default function SeminarAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard allowedRoles={["staff", "president", "admin"]}>
      <SeminarAdminShell>{children}</SeminarAdminShell>
    </AuthGuard>
  );
}

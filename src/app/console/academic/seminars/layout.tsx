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
} from "lucide-react";

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
    <div>
      <nav className="mb-6 flex flex-wrap gap-0 border-b sm:overflow-x-auto">
        {SUB_TABS.map((tab) => {
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
      <div>{children}</div>
    </div>
  );
}

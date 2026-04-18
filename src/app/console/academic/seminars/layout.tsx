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
      <nav className="mb-6 inline-flex h-10 items-center justify-center gap-0.5 overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground">
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

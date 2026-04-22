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
  X,
} from "lucide-react";
import { useSeminarAdminContext } from "@/features/seminar-admin/seminar-admin-store";
import { useSeminar } from "@/features/seminar/useSeminar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SUB_TABS = [
  { href: "/academic-admin/seminars", label: "세미나 목록", icon: BookOpen, exact: true },
  { href: "/academic-admin/seminars/create", label: "세미나 생성", icon: PlusCircle },
  { href: "/academic-admin/seminars/promotion", label: "홍보 제작", icon: Megaphone },
  { href: "/academic-admin/seminars/timeline", label: "운영 타임라인", icon: ListChecks },
  { href: "/academic-admin/seminars/registrations", label: "신청/참석 관리", icon: ClipboardList },
  { href: "/academic-admin/seminars/certificate", label: "수료증/명찰", icon: Award },
];

export default function SeminarsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeSeminarId = useSeminarAdminContext((s) => s.activeSeminarId);
  const clear = useSeminarAdminContext((s) => s.clear);
  const activeSeminar = useSeminar(activeSeminarId ?? "");

  return (
    <div>
      <nav className="mb-3 flex flex-wrap gap-0 border-b sm:overflow-x-auto">
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
      {activeSeminarId && activeSeminar && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
          <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/15">
            작업 중
          </Badge>
          <span className="font-semibold text-foreground">{activeSeminar.title}</span>
          <span className="text-muted-foreground">
            {activeSeminar.date}
            {activeSeminar.time ? ` · ${activeSeminar.time}` : ""}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            onClick={() => clear()}
          >
            <X size={12} className="mr-1" />
            선택 해제
          </Button>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

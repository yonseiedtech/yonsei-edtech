"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BookOpen, ClipboardList, LayoutDashboard, GraduationCap, Wallet,
  MessageSquare, FileText, Newspaper, Award, ArrowRightLeft, Loader2, BookUser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HandoverSection from "@/features/admin/HandoverSection";

const spin = (
  <div className="flex items-center justify-center py-16">
    <Loader2 size={24} className="animate-spin text-muted-foreground" />
  </div>
);

const TodosView = dynamic(() => import("./todos/page"), { ssr: false, loading: () => spin });
const ActivityDashboardView = dynamic(() => import("./activity-dashboard/page"), { ssr: false, loading: () => spin });
const AcademicAdminView = dynamic(() => import("../academic-admin/page"), { ssr: false, loading: () => spin });
const FeesView = dynamic(() => import("../admin/fees/page"), { ssr: false, loading: () => spin });
const InquiriesView = dynamic(() => import("../admin/inquiries/page"), { ssr: false, loading: () => spin });
const PostsView = dynamic(() => import("../admin/posts/page"), { ssr: false, loading: () => spin });
const NewsletterView = dynamic(() => import("../admin/newsletter/page"), { ssr: false, loading: () => spin });
const CertificatesView = dynamic(() => import("../admin/certificates/page"), { ssr: false, loading: () => spin });
const HandoverOverviewView = dynamic(() => import("./handover-overview/page"), { ssr: false, loading: () => spin });
const TransitionView = dynamic(() => import("./transition/page"), { ssr: false, loading: () => spin });
const DirectoryView = dynamic(() => import("../directory/page"), { ssr: false, loading: () => spin });

const TABS = [
  { key: "handover", label: "업무수행철", icon: BookOpen },
  { key: "directory", label: "연락망", icon: BookUser },
  { key: "todos", label: "To-Do", icon: ClipboardList },
  { key: "activity-dashboard", label: "학술활동 대시보드", icon: LayoutDashboard },
  { key: "academic", label: "학술활동 관리", icon: GraduationCap },
  { key: "fees", label: "학회비", icon: Wallet },
  { key: "inquiries", label: "문의 답변", icon: MessageSquare },
  { key: "posts", label: "게시글 관리", icon: FileText },
  { key: "newsletter", label: "학회보", icon: Newspaper },
  { key: "certificates", label: "수료증·감사장", icon: Award },
  { key: "handover-overview", label: "인수인계 종합", icon: FileText },
  { key: "transition", label: "운영진 교체", icon: ArrowRightLeft },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function renderView(key: TabKey) {
  switch (key) {
    case "handover": return <HandoverSection />;
    case "directory": return <DirectoryView />;
    case "todos": return <TodosView />;
    case "activity-dashboard": return <ActivityDashboardView />;
    case "academic": return <AcademicAdminView />;
    case "fees": return <FeesView />;
    case "inquiries": return <InquiriesView />;
    case "posts": return <PostsView />;
    case "newsletter": return <NewsletterView />;
    case "certificates": return <CertificatesView />;
    case "handover-overview": return <HandoverOverviewView />;
    case "transition": return <TransitionView />;
  }
}

function StaffAdminInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const active = (searchParams.get("view") as TabKey) ?? "handover";

  return (
    <div>
      <nav className="mt-6 flex flex-wrap gap-0 border-b sm:overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                const url = new URL(window.location.href);
                url.searchParams.set("view", t.key);
                router.replace(url.pathname + url.search);
              }}
              className={cn(
                "flex flex-none items-center gap-1 border-b-2 px-2.5 py-2 text-xs font-medium transition-colors sm:gap-1.5 sm:px-4 sm:py-2.5 sm:text-sm",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </nav>
      <div className="pt-6">{renderView(active)}</div>
    </div>
  );
}

export default function StaffAdminPage() {
  return (
    <Suspense fallback={spin}>
      <StaffAdminInner />
    </Suspense>
  );
}

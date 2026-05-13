"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, FileText, HelpCircle, LayoutDashboard, Bot, Map, FileUp, Loader2, Globe, ClipboardCheck, MessageSquareQuote, HeartHandshake, BarChart3, ListChecks } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { auth as firebaseAuth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import AdminTodoTab from "@/features/admin/AdminTodoTab";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import ActionableBanner from "@/components/ui/actionable-banner";

function StatCard({ icon: Icon, label, value, color, href }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border bg-card p-5">
      {href ? (
        <Link href={href} className="block hover:opacity-80 transition-opacity">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

export default function ConsoleDashboardPage() {
  const { user } = useAuthStore();
  const { inquiries } = useInquiries();
  const { posts } = usePosts("all");
  const unansweredCount = inquiries.filter((i) => i.status === "pending").length;
  const [seeding, setSeeding] = useState(false);
  // 시드 완료 상태 (localStorage 영속 + 세션 내 즉시 반영)
  const [seedDone, setSeedDone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem("yedu_content_seed_done_v1") === "1";
    } catch {
      return false;
    }
  });

  async function handleSeedContent() {
    if (seedDone) {
      toast.info("모든 콘텐츠가 이미 등록되어 있습니다.");
      return;
    }
    setSeeding(true);
    try {
      const token = await firebaseAuth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/seed-board-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      const created = Number(data?.created ?? 0);
      const skipped = Number(data?.skipped ?? 0);
      const total = Number(data?.total ?? created + skipped);
      // 신규 등록이 0건 + 모두 skip → 완료 상태로 마킹
      if (created === 0 && skipped >= total && total > 0) {
        try {
          window.localStorage.setItem("yedu_content_seed_done_v1", "1");
        } catch {
          // ignore
        }
        setSeedDone(true);
        toast.info("모든 콘텐츠가 이미 등록되어 있습니다.");
      } else {
        toast.success(`${created}건 신규 등록 / ${skipped}건 기존 유지`);
        // 모두 처리 완료한 경우에도 잠금 (skipped + created = total)
        if (created + skipped >= total && total > 0) {
          try {
            window.localStorage.setItem("yedu_content_seed_done_v1", "1");
          } catch {
            // ignore
          }
          setSeedDone(true);
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "콘텐츠 시드 등록 실패");
    } finally {
      setSeeding(false);
    }
  }

  const { data: membersData } = useQuery({
    queryKey: ["admin", "members"],
    queryFn: () => profilesApi.list({ limit: 0 }),
    retry: false,
  });
  const { data: pendingData } = useQuery({
    queryKey: ["admin", "pending"],
    queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={LayoutDashboard}
        title="운영 콘솔"
        description={`${user?.name}님, 안녕하세요.`}
      />

      {(pendingData?.total ?? 0) > 0 && (
        <ActionableBanner
          kind="warning"
          title={`승인 대기 회원 ${pendingData?.total ?? 0}명`}
          description="새 가입 신청이 누적되어 있습니다. 자동 승인 가능한 회원도 함께 처리하세요."
          action={{ label: "회원 관리로 이동", href: "/console/members" }}
        />
      )}
      {unansweredCount > 0 && (
        <ActionableBanner
          kind="error"
          title={`미답변 문의 ${unansweredCount}건`}
          description="답변 대기 중인 회원 문의가 있습니다. 24시간 내 응답이 학회 운영 표준입니다."
          action={{ label: "문의 답변하기", href: "/console/inquiries" }}
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="전체 회원" value={membersData?.total ?? 0} color="bg-blue-50 text-blue-600" href="/console/members" />
        <StatCard icon={Clock} label="승인 대기" value={pendingData?.total ?? 0} color="bg-amber-50 text-amber-600" href="/console/members" />
        <StatCard icon={FileText} label="게시글" value={posts.length} color="bg-green-50 text-green-600" href="/console/posts" />
        <StatCard icon={HelpCircle} label="미답변 문의" value={unansweredCount} color="bg-red-50 text-red-600" href="/console/inquiries" />
      </div>

      {!seedDone && (
        <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <FileUp size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">운영진 콘텐츠 시드 — 1-click 일괄 등록</p>
              <p className="text-xs text-muted-foreground">
                docs/board-content/ 의 운영진 콘텐츠 초안을 게시판에 한 번에 등록. Idempotent — 중복 등록되지 않습니다.
              </p>
            </div>
            <Button onClick={handleSeedContent} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
              {seeding ? "등록 중…" : "콘텐츠 일괄 등록"}
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
          신규 관리 도구
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/console/ai-forum"
            className="flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">AI 포럼 운영</p>
              <p className="text-xs text-muted-foreground">
                AI 자율 토론 — 등록·개최·중지·수동 진행
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              새 기능
            </span>
          </Link>

          <Link
            href="/console/roadmap"
            className="flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Map size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">학기별 로드맵 관리</p>
              <p className="text-xs text-muted-foreground">
                디딤판 단계 카드 — 즉시 편집·순서 변경
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              새 기능
            </span>
          </Link>

          {/* Sprint 70: 신청 승인 통합 대시보드 — 단독 진입 가능 */}
          <Link
            href="/console/academic/applications"
            className="flex items-center gap-3 rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4 transition-shadow hover:shadow-md dark:border-amber-700 dark:bg-amber-950/20 sm:col-span-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
              <ClipboardCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">신청 승인 통합 대시보드</p>
              <p className="text-xs text-muted-foreground">
                모든 학술활동(외부·프로젝트·스터디)의 pending 신청자를 한 화면에서 확인·즉시 처리
              </p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-200">
              🆕 신설
            </span>
          </Link>
        </div>
      </div>

      {/* Sprint 70 신설 — 학술대회 운영 통합 (활동 상세 진입 후 사용) */}
      <div>
        <h2 className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">
          🆕 Sprint 70 신설 — 학술대회 운영 통합
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          아래 4개 기능은 <strong className="text-foreground">활동 상세 페이지</strong> 진입 후 사용합니다. 카드를 클릭해 대외 학술대회 목록으로 이동 → 활동 클릭 → 상세 페이지 우측 운영 영역에서 진입 버튼 표시.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50/40 p-4 transition-shadow hover:shadow-md dark:border-blue-800 dark:bg-blue-950/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
              <MessageSquareQuote size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">참석자 후기 모니터링</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                회원이 작성한 종합 후기·재참석 의사·연구 시사점·별점을 통계로 분석. (GAP #1)
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-200">
              신설
            </span>
          </Link>

          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/40 p-4 transition-shadow hover:shadow-md dark:border-emerald-800 dark:bg-emerald-950/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
              <HeartHandshake size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">자원봉사자 운영</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                전체 봉사자 명부·역할·시간대·임무 체크 진행률 + 본부석 인쇄. (GAP #4)
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200">
              신설
            </span>
          </Link>

          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-xl border-2 border-purple-200 bg-purple-50/40 p-4 transition-shadow hover:shadow-md dark:border-purple-800 dark:bg-purple-950/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
              <BarChart3 size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">세션 분석 통계</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                인기 세션 TOP 10·카테고리 분포·선택 이유 분포·출석률·평균 별점. (GAP #5)
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">
              신설
            </span>
          </Link>

          <Link
            href="/console/academic/external"
            className="flex items-start gap-3 rounded-xl border-2 border-rose-200 bg-rose-50/40 p-4 transition-shadow hover:shadow-md dark:border-rose-800 dark:bg-rose-950/20"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
              <ListChecks size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">워크북 관리</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                과제 task CRUD + 제출 모니터링 + 검토 워크플로우. (GAP #2-3, 통합)
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
              console 통합
            </span>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">오늘 할 일</h2>
        <AdminTodoTab />
      </div>
    </div>
  );
}

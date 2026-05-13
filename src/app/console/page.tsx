"use client";

import Link from "next/link";
import { useAuthStore } from "@/features/auth/auth-store";
import { useInquiries } from "@/features/inquiry/useInquiry";
import { usePosts } from "@/features/board/useBoard";
import { profilesApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { Users, Clock, FileText, HelpCircle, LayoutDashboard, Bot, Map, FileUp, Loader2, Globe } from "lucide-react";
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

          {/* Sprint 70: 매칭 GAP #1·4 신설 — 대외 학술대회 후기·봉사자 운영 */}
          <Link
            href="/console/academic/external"
            className="flex items-center gap-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 transition-shadow hover:shadow-md sm:col-span-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Globe size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">대외 학술대회 후기·봉사자 운영</p>
              <p className="text-xs text-muted-foreground">
                활동 상세 진입 → 신설 페이지: 참석자 후기 모니터링·자원봉사자 명부·임무 체크 진행률
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              신설
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

"use client";

/**
 * 세미나 운영 허브 (Sprint UX-S2 — 콘솔 심화)
 *
 * 세미나 1개의 운영 전 과정(준비→모집→당일→사후)을 한 화면에서 조망하고
 * 각 운영 도구(신청·타임라인·출석·수료증·홍보·현장 체크인)로 직행한다.
 * 이동 시 공유 store(activeSeminarId)에 현재 세미나를 심어 탭 재선택을 없앤다.
 */

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Mic,
  Users,
  UserCheck,
  ClipboardList,
  ListChecks,
  Award,
  Megaphone,
  QrCode,
  ExternalLink,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSeminar, useAttendees } from "@/features/seminar/useSeminar";
import { useSeminarAdminContext } from "@/features/seminar-admin/seminar-admin-store";
import { getComputedStatus } from "@/lib/seminar-utils";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  upcoming: { label: "예정", cls: "bg-blue-50 text-blue-700" },
  ongoing: { label: "진행 중", cls: "bg-green-50 text-green-700" },
  completed: { label: "완료", cls: "bg-slate-100 text-slate-600" },
  cancelled: { label: "취소", cls: "bg-red-50 text-red-700" },
};

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-1.5 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function SeminarHubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const seminar = useSeminar(id);
  const { attendees } = useAttendees(id);
  const setActiveSeminarId = useSeminarAdminContext((s) => s.setActiveSeminarId);

  if (!seminar) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const status = getComputedStatus(seminar);
  const statusMeta = STATUS_META[status] ?? STATUS_META.upcoming;

  const timeline = seminar.timeline ?? [];
  const timelineDone = timeline.filter((t) => t.done).length;
  const timelinePct = timeline.length > 0 ? Math.round((timelineDone / timeline.length) * 100) : 0;
  const now = new Date();
  const diffDays = Math.round((new Date(seminar.date).getTime() - now.getTime()) / 86400000);
  const overdue = timeline.filter((t) => !t.done && t.dDay <= 0 && diffDays <= Math.abs(t.dDay)).length;

  const checkedIn = attendees.filter((a) => a.checkedIn).length;

  /** 운영 도구 카드 — 공유 store 에 현재 세미나를 심고 이동 */
  function goTool(href: string) {
    setActiveSeminarId(id);
    router.push(href);
  }

  const TOOLS: { label: string; desc: string; icon: React.ElementType; href: string; accent?: boolean }[] = [
    { label: "신청/참석 관리", desc: "신청자 승인·참석 확정·CSV", icon: ClipboardList, href: "/console/academic/seminars/registrations" },
    { label: "운영 타임라인", desc: `준비 항목 ${timelineDone}/${timeline.length} 완료`, icon: ListChecks, href: "/console/academic/seminars/timeline" },
    { label: "출석/리포트", desc: "출석 현황·참석률 분석", icon: BarChart3, href: "/console/academic/seminars/report" },
    { label: "수료증/명찰", desc: "일괄 발급·인쇄", icon: Award, href: "/console/academic/seminars/certificate" },
    { label: "홍보 제작", desc: "포스터·보도자료·SNS", icon: Megaphone, href: "/console/academic/seminars/promotion" },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/console/academic/seminars"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> 세미나 목록
      </Link>

      {/* ── 기본 정보 ── */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold">{seminar.title}</h1>
              <Badge className={cn("text-[11px]", statusMeta.cls)}>{statusMeta.label}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays size={14} /> {seminar.date} {seminar.time}
              </span>
              {seminar.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} /> {seminar.location}
                </span>
              )}
              {seminar.speaker && (
                <span className="inline-flex items-center gap-1">
                  <Mic size={14} /> {seminar.speaker}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/seminars/${id}`}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            <ExternalLink size={13} /> 공개 페이지
          </Link>
        </div>

        {/* 준비 진행률 */}
        {timeline.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>운영 준비 진행률</span>
              <span>
                {timelinePct}%
                {overdue > 0 && (
                  <span className="ml-2 inline-flex items-center gap-0.5 font-semibold text-amber-600">
                    <AlertTriangle size={11} /> 기한 경과 {overdue}건
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full transition-all", overdue > 0 ? "bg-amber-500" : "bg-primary")}
                style={{ width: `${timelinePct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 핵심 지표 ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="참석 명단" value={attendees.length} sub={seminar.maxAttendees ? `정원 ${seminar.maxAttendees}명` : undefined} />
        <StatCard icon={UserCheck} label="체크인" value={checkedIn} sub={attendees.length > 0 ? `${Math.round((checkedIn / attendees.length) * 100)}%` : undefined} />
        <StatCard icon={ListChecks} label="준비 완료" value={`${timelineDone}/${timeline.length}`} sub={overdue > 0 ? `기한 경과 ${overdue}건` : undefined} />
        <StatCard icon={CalendarDays} label={diffDays >= 0 ? "D-Day" : "지난 일수"} value={diffDays === 0 ? "D-Day" : diffDays > 0 ? `D-${diffDays}` : `D+${Math.abs(diffDays)}`} />
      </div>

      {/* ── 현장 체크인 (당일 핵심 동선) ── */}
      <button
        type="button"
        onClick={() => goTool(`/seminars/${id}/checkin`)}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-left transition-shadow hover:shadow-md"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <QrCode size={22} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">현장 체크인 열기</p>
          <p className="text-xs text-muted-foreground">QR 스캔 + 셀프 체크인 + 실시간 출석 명부 — 행사 당일 이 버튼 하나로 운영</p>
        </div>
        <Badge variant="secondary" className="shrink-0 text-[11px]">{checkedIn}/{attendees.length}</Badge>
      </button>

      {/* ── 운영 도구 ── */}
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">운영 도구</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.href}
                type="button"
                onClick={() => goTool(tool.href)}
                className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-left transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{tool.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{tool.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          도구로 이동하면 이 세미나가 자동 선택됩니다 — 탭마다 다시 고를 필요 없습니다.
        </p>
      </div>
    </div>
  );
}

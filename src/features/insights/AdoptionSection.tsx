"use client";

/**
 * 기능 채택률 섹션 (C-5, 2026-07-04) — 운영 인사이트.
 *
 * 실사용 스냅샷(2026-07-04 제안서)의 핵심 지표를 상시 노출해
 * "개강 채택 전환" 사이클의 KPI(활성 회원·매트릭스 사용·알림 읽음률)를
 * 운영진이 이 화면에서 바로 판정하게 한다.
 */

import { useQuery } from "@tanstack/react-query";
import { Gauge, Users, Microscope, Bell, MessageSquare } from "lucide-react";
import { auth } from "@/lib/firebase";

interface Adoption {
  at: string;
  members: { approved: number; active7d: number; active30d: number };
  research: {
    papersUpdated30d: number;
    reportsUpdated30d: number;
    modelsTotal: number;
    matrixFilled: number;
    readingLogs30d: number;
    sessions30d: number;
  };
  community: { posts30d: number; comments30d: number; dmTotal: number; rsvpTotal: number; checkins: number };
  notifications: { total: number; unread: number; readRate: number | null };
  studioDocs: number;
  eventsByType: Record<string, number>;
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

export default function AdoptionSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["console-adoption"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("로그인이 필요합니다.");
      const res = await fetch("/api/console/adoption", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("집계 실패");
      return (await res.json()) as Adoption;
    },
  });

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl border bg-muted/40" />;
  if (!data) return null;

  const m = data.members;
  const r = data.research;
  const n = data.notifications;
  const c = data.community;
  const newFeatureEvents =
    (data.eventsByType["matrix-edit"] ?? 0) +
    (data.eventsByType["model-edit"] ?? 0) +
    (data.eventsByType["studio-edit"] ?? 0);

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Gauge size={15} className="text-primary" />
        기능 채택률 (실사용 스냅샷)
        <span className="text-[11px] font-normal text-muted-foreground">
          개강 채택 전환 사이클 KPI — {new Date(data.at).toLocaleDateString("ko-KR")} 기준
        </span>
      </h2>

      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Users size={12} /> 활성
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="승인 회원" value={m.approved} />
        <Stat label="7일 활성" value={m.active7d} sub={`목표 12/${m.approved} (개강 2주)`} />
        <Stat label="30일 활성" value={m.active30d} />
        <Stat label="세미나 체크인 누적" value={c.checkins} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Microscope size={12} /> 연구 여정 채택
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="매트릭스 정리 논문" value={r.matrixFilled} sub="목표 5+ (회원 기준 워크숍 후)" />
        <Stat label="연구 모형 저장" value={r.modelsTotal} sub="목표 5+" />
        <Stat label="30일 읽기 기록" value={r.readingLogs30d} />
        <Stat label="30일 논문 저장 / 보고서" value={`${r.papersUpdated30d} / ${r.reportsUpdated30d}`} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Bell size={12} /> 알림 소비
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="알림 읽음률"
          value={n.readRate != null ? `${n.readRate}%` : "—"}
          sub={`미읽음 ${n.unread}/${n.total} · 목표 40%+`}
        />
        <Stat label="신규 기능 이벤트" value={newFeatureEvents} sub="매트릭스·모형·스튜디오" />
        <Stat label="스튜디오 문서" value={data.studioDocs} />
        <Stat label="30일 타이머 세션" value={r.sessions30d} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <MessageSquare size={12} /> 커뮤니티
      </p>
      <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="30일 글 / 댓글" value={`${c.posts30d} / ${c.comments30d}`} />
        <Stat label="쪽지 누적" value={c.dmTotal} sub="첫 쪽지 발생이 KPI" />
        <Stat label="행사 RSVP 누적" value={c.rsvpTotal} />
        <Stat label="측정 기준" value="10월 초 재판정" sub="PROPOSAL_2026-07-04_cycle-next" />
      </div>
    </section>
  );
}

"use client";

/**
 * 해커톤 당일 운영 실행 콘솔 (H3-v10, 2026-07-20)
 *
 * 리허설(v9-H3)이 짚은 운영자 액션(단계 전환)을 순서대로 배치한 체크리스트형 실행 화면.
 * 운영진이 행사 당일 한 화면에서:
 *  1. 현황 위젯 — 참가 신청·팀 확정·제출·심사 진행률 실시간 요약(기존 데이터 재사용)
 *  2. 단계 전환 체크리스트 — 접수 마감→제출 오픈→제출 마감→심사→수상 공개
 *     · 저장은 site_settings(hackathon_ops) 오버라이드 재사용(수동 우선·자동 폴백)
 *     · 파괴적 전환(마감·심사·수상)은 confirm 후 실행
 *
 * staff+ 전용 (console/layout AuthGuard 로 보호). 신규 컬렉션 없음.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  UserCheck,
  FileText,
  Gavel,
  Trophy,
  Loader2,
  CheckCircle2,
  Circle,
  RotateCcw,
  Lock,
  Unlock,
  Download,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  commBoardsApi,
  commQuestionsApi,
  hackathonSubmissionsApi,
  hackathonJudgingsApi,
} from "@/lib/bkend";
import type {
  CommBoard,
  CommQuestion,
  HackathonSubmission,
  HackathonJudging,
} from "@/types";
import {
  HACKATHON_CONTEXT_ID,
  HACKATHON_PHASE_TIMELINE,
  getHackathonPhase,
  isHackathonSubmissionClosed,
  type HackathonOpsOverride,
  type HackathonPhaseKey,
} from "./config";
import { useHackathonOps, useUpdateHackathonOps } from "./useHackathonOps";

const PHASE_LABEL: Record<HackathonPhaseKey, string> = Object.fromEntries(
  HACKATHON_PHASE_TIMELINE.map((p) => [p.key, p.label]),
) as Record<HackathonPhaseKey, string>;

export default function HackathonDdayConsole() {
  const { override, recordId, phase, submissionClosed, sectionVisibility, isManual, isLoading } =
    useHackathonOps();
  const updateOps = useUpdateHackathonOps();

  // ── 현황 데이터 (기존 컬렉션 재사용) ──
  const { data: board } = useQuery({
    queryKey: ["hackathon-board", HACKATHON_CONTEXT_ID],
    queryFn: async () => {
      const res = await commBoardsApi.listByContext("hackathon", HACKATHON_CONTEXT_ID);
      return (res.data as CommBoard[])[0] ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["hackathon-entries", board?.id ?? ""],
    enabled: !!board?.id,
    queryFn: async () => {
      const res = await commQuestionsApi.listByBoard(board!.id);
      return res.data as CommQuestion[];
    },
  });

  const { data: submissions = [], isLoading: subsLoading } = useQuery({
    queryKey: ["console-hackathon-submissions"],
    queryFn: async () => {
      const res = await hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonSubmission[];
    },
  });

  const { data: judgings = [] } = useQuery({
    queryKey: ["console-hackathon-judgings"],
    queryFn: async () => {
      const res = await hackathonJudgingsApi.listByContext(HACKATHON_CONTEXT_ID);
      return res.data as HackathonJudging[];
    },
  });

  const stats = useMemo(() => {
    const applicants = entries.length;
    const submitted = submissions.length;
    const teamsConfirmed = submissions.filter((s) => s.members.length > 0).length;
    const judgedIds = new Set(judgings.map((j) => j.submissionId));
    const judged = submissions.filter((s) => judgedIds.has(s.id)).length;
    const judgePct = submitted === 0 ? 0 : Math.round((judged / submitted) * 100);
    return { applicants, submitted, teamsConfirmed, judged, judgePct };
  }, [entries, submissions, judgings]);

  const autoPhase = getHackathonPhase();
  const autoClosed = isHackathonSubmissionClosed();

  function apply(patch: Partial<HackathonOpsOverride>, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const value: HackathonOpsOverride = { ...override, ...patch };
    updateOps.mutate(
      { recordId, value },
      {
        onSuccess: () => toast.success("단계를 전환했습니다."),
        onError: (e) =>
          toast.error(`전환 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  }

  function resetToAuto() {
    updateOps.mutate(
      {
        recordId,
        value: {
          phase: null,
          submissionClosed: null,
          sectionVisibility: override.sectionVisibility,
        },
      },
      {
        onSuccess: () => toast.success("자동(날짜 기준)으로 되돌렸습니다."),
        onError: (e) =>
          toast.error(`되돌리기 실패: ${e instanceof Error ? e.message : "오류"}`),
      },
    );
  }

  // ── 현재 진행 단계 인덱스 (체크리스트 완료 표시용) ──
  // 0 접수 · 1 제출 오픈 · 2 제출 마감 · 3 심사 · 4 수상
  const stageIndex = useMemo(() => {
    if (phase === "awards") return 4;
    if (phase === "judging") return 3;
    if (phase === "submission") return submissionClosed ? 2 : 1;
    return 0;
  }, [phase, submissionClosed]);

  const busy = updateOps.isPending;

  /** 참가자 명단 CSV 다운로드 (v14-H2) */
  function downloadParticipantsCsv() {
    const header = "이름,팀희망,아이디어,공감수,신청일,AI리터러시,바이브코딩,도구,강점";
    const rows = entries.map((e) => {
      // 수식 인젝션 방어: =,+,-,@,탭,CR 로 시작하는 셀은 ' prefix 로 무력화 (Excel/Sheets DDE·HYPERLINK 차단)
      const escape = (v: string) => {
        const flat = v.replace(/\r?\n/g, " ");
        const safe = /^[=+\-@\t\r]/.test(flat) ? `'${flat}` : flat;
        return `"${safe.replace(/"/g, '""')}"`;
      };
      const sv = e.hackathonSurvey;
      return [
        escape(e.authorName ?? ""),
        escape(e.presenter ?? ""),
        escape(e.body ?? ""),
        String(e.likeCount ?? 0),
        (e.createdAt ?? "").slice(0, 10),
        sv?.aiLiteracy != null ? String(sv.aiLiteracy) : "",
        sv?.vibeCoding != null ? escape(sv.vibeCoding) : "",
        sv?.tools?.length ? escape(sv.tools.join("/")) : "",
        sv?.strengths?.length ? escape(sv.strengths.join("/")) : "",
      ].join(",");
    });
    const csv = "﻿" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hackathon-participants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const steps: {
    idx: number;
    label: string;
    desc: string;
    icon: typeof Users;
    action: () => void;
    cta: string;
  }[] = [
    {
      idx: 1,
      label: "접수 마감 · 제출 오픈",
      desc: "참가 접수를 마치고 산출물 제출 폼을 엽니다.",
      icon: Unlock,
      cta: "제출 오픈",
      action: () => apply({ phase: "submission", submissionClosed: false }),
    },
    {
      idx: 2,
      label: "제출 마감",
      desc: "산출물 제출 폼을 잠급니다. 이후 회원은 제출할 수 없습니다.",
      icon: Lock,
      cta: "제출 마감",
      action: () =>
        apply(
          { submissionClosed: true },
          "제출을 마감하면 회원이 더 이상 산출물을 제출할 수 없습니다. 마감할까요?",
        ),
    },
    {
      idx: 3,
      label: "심사 시작",
      desc: "심사 단계로 전환합니다. 심사위원이 콘솔에서 점수를 입력합니다.",
      icon: Gavel,
      cta: "심사 시작",
      action: () =>
        apply(
          { phase: "judging", submissionClosed: true },
          "심사 단계로 전환하면 제출이 마감되고 심사가 시작됩니다. 진행할까요?",
        ),
    },
    {
      idx: 4,
      label: "수상 공개",
      desc: "수상 발표 단계로 전환합니다. 각 수상작 공개는 심사 탭에서 개별 처리합니다.",
      icon: Trophy,
      cta: "수상 공개 단계로",
      action: () =>
        apply(
          { phase: "awards" },
          "수상 발표 단계로 전환할까요? (개별 수상작 공개는 심사 탭에서 진행)",
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 현황 위젯 ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Users}
          label="참가 신청"
          value={stats.applicants}
          unit="명"
        />
        <StatCard
          icon={UserCheck}
          label="팀 확정"
          value={stats.teamsConfirmed}
          unit="팀"
        />
        <StatCard
          icon={FileText}
          label="제출"
          value={stats.submitted}
          unit="건"
        />
        <StatCard
          icon={Gavel}
          label="심사 진행률"
          value={stats.judgePct}
          unit="%"
          sub={`${stats.judged}/${stats.submitted}건`}
          loading={subsLoading}
        />
      </div>

      {/* ── 참가자 명단 CSV (v14-H2) ── */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">
              참가 신청자 <span className="font-semibold text-foreground">{entries.length}명</span>
            </p>
            <p className="text-xs text-muted-foreground">
              설문 응답{" "}
              <span className="font-semibold text-foreground">
                {entries.filter((e) => e.hackathonSurvey).length}/{entries.length}
              </span>
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={downloadParticipantsCsv}>
            <Download size={13} className="mr-1" />
            참가자 명단 CSV
          </Button>
        </div>
      )}

      {/* ── 현재 단계 ── */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            현재 단계
          </span>
          {isLoading ? (
            <Skeleton className="h-5 w-16 rounded-full" />
          ) : (
            <>
              <Badge variant="default">{PHASE_LABEL[phase]}</Badge>
              <Badge variant={submissionClosed ? "secondary" : "outline"}>
                {submissionClosed ? "제출 마감" : "제출 열림"}
              </Badge>
              {isManual ? (
                <Badge variant="outline" className="text-primary">
                  수동 지정
                </Badge>
              ) : (
                <Badge variant="outline">자동(날짜)</Badge>
              )}
            </>
          )}
        </div>
        {isManual && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              자동 기준: {PHASE_LABEL[autoPhase]} ·{" "}
              {autoClosed ? "제출 마감" : "제출 열림"}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={resetToAuto}
              disabled={busy}
            >
              <RotateCcw size={13} className="mr-1" />
              자동으로 되돌리기
            </Button>
          </div>
        )}
      </div>

      {/* ── 단계 전환 체크리스트 ── */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          단계 전환 실행
        </h3>
        <ol className="space-y-2.5">
          {steps.map((step) => {
            const done = stageIndex > step.idx;
            const active = stageIndex === step.idx;
            const StepIcon = step.icon;
            return (
              <li
                key={step.idx}
                className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${
                  active ? "border-primary bg-primary/5" : "bg-card"
                }`}
              >
                <span aria-hidden="true" className="shrink-0">
                  {done ? (
                    <CheckCircle2 size={18} className="text-success" />
                  ) : (
                    <Circle
                      size={18}
                      className={active ? "text-primary" : "text-muted-foreground/40"}
                    />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <StepIcon size={14} className="text-muted-foreground" />
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={active ? "default" : "outline"}
                  onClick={step.action}
                  disabled={busy}
                  className="ml-auto shrink-0"
                >
                  {busy ? (
                    <Loader2 size={13} className="mr-1 animate-spin" />
                  ) : null}
                  {step.cta}
                </Button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── 영역 공개 토글 ── */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">영역 공개</p>
          <span className="ml-auto text-xs text-muted-foreground">
            단계 전환과 독립적 — 단계를 전환해도 자동 공개되지 않습니다
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          행사 당일 순서에 맞춰 공개하세요 — 팀 현황 → 산출물 제출 → 수상작
        </p>
        <ul className="space-y-2">
          {(
            [
              { key: "teams", label: "팀 현황" },
              { key: "submissions", label: "산출물 제출" },
              { key: "awards", label: "수상작" },
            ] as const
          ).map(({ key, label }) => {
            const visible = sectionVisibility[key];
            return (
              <li
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/20 px-4 py-3"
              >
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={visible ? "default" : "outline"}>
                    {visible ? "공개" : "비공개"}
                  </Badge>
                  <Button
                    size="sm"
                    variant={visible ? "outline" : "default"}
                    onClick={() => {
                      const newVis = { ...sectionVisibility, [key]: !visible };
                      apply({ sectionVisibility: newVis });
                    }}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 size={13} className="mr-1 animate-spin" />
                    ) : visible ? (
                      <EyeOff size={13} className="mr-1" />
                    ) : (
                      <Eye size={13} className="mr-1" />
                    )}
                    {visible ? "숨기기" : "공개"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  loading,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  unit: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon size={13} />
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-14" />
      ) : (
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
          {value}
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        </p>
      )}
      {sub && !loading && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

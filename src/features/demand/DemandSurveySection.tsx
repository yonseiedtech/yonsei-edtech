"use client";

/**
 * 수요 조사 섹션 — 전환(개설) 루프 (2026-07-24 PM/PO 개편)
 * 스터디·세미나 페이지 "수요조사" 탭 안에서 수요를 등록·반응하고,
 * 운영진이 상태를 전환(검토→개설/보류)해 실제 개설로 잇는다.
 *
 * - kind="study"|"seminar" — 유형 고정
 * - 학기별 보드(contextId="demand-{YYYY}-{1|2}") — 지난 학기와 분리
 * - 반응 2종: 관심있어요(likeCount) · 참여할래요(comm_likes "demand-join")
 * - 라이프사이클: 수집중 → 개설 검토중 → 개설됨 / 보류 (운영진 전환)
 * - 정족수 신호: 참여 N명 이상이면 "개설 정족수" 강조 → 운영진 액션 유도
 * - 요약 지표 + 상태 필터
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  UserPlus,
  Trash2,
  Plus,
  Inbox,
  Loader2,
  ArrowRight,
  Flame,
  CircleDot,
  Search,
  CheckCircle2,
  PauseCircle,
  UserCheck,
  PencilRuler,
  Rocket,
  Megaphone,
  ChevronDown,
  Pencil,
  X,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import EmptyState from "@/components/ui/empty-state";
import { useAuthStore } from "@/features/auth/auth-store";
import { isAtLeast } from "@/lib/permissions";
import { commQuestionsApi, commLikesApi } from "@/lib/bkend";
import {
  ensureDemandBoard,
  currentDemandContextId,
  currentDemandSemesterLabel,
} from "./ensure-demand-board";
import StudyLaunchPanel from "./StudyLaunchPanel";
import { appendStatusHistory } from "./demand-status";
import { notifyDemandQuorumReached } from "@/features/notifications/notify";
import { useEffectiveSemesterKey } from "@/features/site-settings/useCurrentSemester";
import {
  useDemandCampaigns,
  resolveActiveCampaign,
  resolveCampaignPhase,
  DOMAIN_OPTIONS,
  DIFFICULTY_OPTIONS,
  TIME_OPTIONS,
} from "./useDemandCampaign";
import type { CommQuestion } from "@/types";

const DEMAND_JOIN = "demand-join";
/** 참여 의사 이 수 이상이면 개설 정족수 신호 */
const JOIN_THRESHOLD = 3;

type DemandStatus = "collecting" | "reviewing" | "leader" | "designing" | "opened" | "declined";

const STATUS_META: Record<DemandStatus, { label: string; badge: string; icon: React.ElementType }> = {
  collecting: { label: "수집중", badge: "bg-muted text-muted-foreground border-transparent", icon: CircleDot },
  reviewing: { label: "개설 검토중", badge: "bg-primary/10 text-primary border-primary/20", icon: Search },
  leader: { label: "모임장 선정", badge: "bg-primary/10 text-primary border-primary/20", icon: UserCheck },
  designing: { label: "설계중", badge: "bg-primary/10 text-primary border-primary/20", icon: PencilRuler },
  opened: { label: "개설됨", badge: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  declined: { label: "보류", badge: "bg-muted text-muted-foreground border-border", icon: PauseCircle },
};

const STATUS_RANK: Record<DemandStatus, number> = {
  reviewing: 0, leader: 1, designing: 2, collecting: 3, opened: 4, declined: 5,
};

function resolveStatus(q: CommQuestion): DemandStatus {
  return (q.demandPref?.status as DemandStatus | undefined) ?? "collecting";
}

/** 내 수요 파이프라인 스테퍼 단계 (제안서 2.5.1 M4) — declined 는 별도 표기 */
const DEMAND_STEPS: { key: DemandStatus; label: string }[] = [
  { key: "collecting", label: "수집중" },
  { key: "reviewing", label: "검토중" },
  { key: "leader", label: "모임장" },
  { key: "designing", label: "설계중" },
  { key: "opened", label: "개설됨" },
];
const STEP_INDEX: Record<DemandStatus, number> = {
  collecting: 0, reviewing: 1, leader: 2, designing: 3, opened: 4, declined: -1,
};

/** 내 수요 카드의 현재 단계 시각화 (M4) */
function DemandStepper({ status }: { status: DemandStatus }) {
  if (status === "declined") {
    return (
      <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
        <PauseCircle size={12} /> 보류된 수요입니다.
      </p>
    );
  }
  const idx = STEP_INDEX[status];
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-1">
      {DEMAND_STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <li key={step.key} className="flex items-center gap-1">
            <span
              className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border text-[9px]",
                done && "border-success bg-success/10 text-success",
                active && "border-primary bg-primary/10 text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
            >
              {done ? <CheckCircle2 size={10} /> : i + 1}
            </span>
            <span className={cn("text-[10px]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
            {i < DEMAND_STEPS.length - 1 && (
              <span className={cn("mx-0.5 h-px w-3", done ? "bg-success/40" : "bg-border")} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type StatusFilter = "all" | "active" | "opened" | "declined";
type DemandScope = "all" | "mine";

type FormatPref = "온라인" | "오프라인" | "무관";
const FORMAT_OPTIONS: FormatPref[] = ["온라인", "오프라인", "무관"];

const KIND_META = {
  study: {
    demandType: "스터디 희망" as const,
    sectionTitle: "이런 스터디가 있었으면 해요",
    placeholder: "예: 논문 읽기 방법론, AI 교육 활용 스터디",
    hint: "열렸으면 하는 스터디 주제를 남겨주세요.",
    emptyTitle: "등록된 스터디 수요가 없습니다",
    emptyDesc: "첫 번째로 원하는 스터디 주제를 등록해보세요.",
  },
  seminar: {
    demandType: "세미나 희망" as const,
    sectionTitle: "이런 세미나를 듣고 싶어요",
    placeholder: "예: 생성형 AI 교육 활용, 교수설계 최신 동향",
    hint: "듣고 싶은 세미나 주제를 남겨주세요.",
    emptyTitle: "등록된 세미나 수요가 없습니다",
    emptyDesc: "첫 번째로 원하는 세미나 주제를 등록해보세요.",
  },
} as const;

/** 구조화 선호 3종 셀렉트 (등록·편집 폼 공용, 제안서 2.1.1) */
function PrefSelects({
  idPrefix,
  domain,
  difficulty,
  time,
  onDomain,
  onDifficulty,
  onTime,
}: {
  idPrefix: string;
  domain: string;
  difficulty: string;
  time: string;
  onDomain: (v: string) => void;
  onDifficulty: (v: string) => void;
  onTime: (v: string) => void;
}) {
  const selectCls =
    "h-9 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground";
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground" htmlFor={`${idPrefix}-domain`}>
          분야
        </label>
        <select
          id={`${idPrefix}-domain`}
          value={domain}
          onChange={(e) => onDomain(e.target.value)}
          className={selectCls}
        >
          <option value="">무관</option>
          {DOMAIN_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground" htmlFor={`${idPrefix}-difficulty`}>
          난이도
        </label>
        <select
          id={`${idPrefix}-difficulty`}
          value={difficulty}
          onChange={(e) => onDifficulty(e.target.value)}
          className={selectCls}
        >
          <option value="">무관</option>
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground" htmlFor={`${idPrefix}-time`}>
          시간대
        </label>
        <select
          id={`${idPrefix}-time`}
          value={time}
          onChange={(e) => onTime(e.target.value)}
          className={selectCls}
        >
          <option value="">무관</option>
          {TIME_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface Props {
  kind: "study" | "seminar";
}

export default function DemandSurveySection({ kind }: Props) {
  const meta = KIND_META[kind];
  const semesterLabel = currentDemandSemesterLabel();
  const semesterKey = useEffectiveSemesterKey();
  // 복수 캠페인 중 현재 활성 1건을 골라 배너·주제칩·기간마감을 적용. 활성 없으면 현행 자유 등록.
  const { campaigns, today } = useDemandCampaigns(semesterKey);
  const campaign = useMemo(
    () => resolveActiveCampaign(campaigns, today),
    [campaigns, today],
  );
  const campaignState = useMemo(
    () => resolveCampaignPhase(campaign, today),
    [campaign, today],
  );
  const { user } = useAuthStore();
  const isStaff = isAtLeast(user, "staff");
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scope, setScope] = useState<DemandScope>("all"); // 전체 ↔ 내 수요 (M4)
  const [pipelineTarget, setPipelineTarget] = useState<CommQuestion | null>(null);

  // ── 보드 프로비저닝 (학기별) ───────────────────────────────────────────────
  const { data: board, isLoading: boardLoading } = useQuery({
    queryKey: ["demand-board", currentDemandContextId()],
    queryFn: () => ensureDemandBoard(user!.id, user!.name ?? ""),
    enabled: !!user,
  });

  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ["demand-questions", board?.id],
    queryFn: () =>
      commQuestionsApi.listByBoard(board!.id).then((r) => r.data as CommQuestion[]),
    enabled: !!board,
  });

  const { data: likedSet = new Set<string>() } = useQuery({
    queryKey: ["demand-liked", user?.id],
    queryFn: () => commLikesApi.listMineSet(user!.id),
    enabled: !!user,
  });

  const { data: joinCounts = {} } = useQuery({
    queryKey: ["demand-joins", board?.id],
    queryFn: () => commLikesApi.countsByType(DEMAND_JOIN),
    enabled: !!board,
  });

  // ── 폼 상태 ───────────────────────────────────────────────────────────────
  const [body, setBody] = useState("");
  const [formatPref, setFormatPref] = useState<FormatPref>("무관");
  const [note, setNote] = useState("");
  // 구조화 선호 (제안서 2.1.1) — 기본 접힘 아코디언
  const [domain, setDomain] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [campaignTopicId, setCampaignTopicId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 수요 편집 (본인·수집중 항목) — 제안서 2.5.2
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editFormat, setEditFormat] = useState<FormatPref>("무관");
  const [editNote, setEditNote] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("");
  const [editTime, setEditTime] = useState("");

  // v17 M4: 러닝가이드 완독 카드 등에서 넘어온 주제 prefill (client-only, DB 무변경)
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("demandTopic");
    if (topic) setBody((prev) => (prev ? prev : topic.slice(0, 140)));
  }, []);

  // ── 이 유형 항목(정렬: 검토>수집>개설>보류, 그 안에서 참여순) ──────────────
  const kindItems = useMemo(
    () =>
      [...questions]
        .filter((q) => q.presenter === meta.demandType)
        .sort((a, b) => {
          const rd = STATUS_RANK[resolveStatus(a)] - STATUS_RANK[resolveStatus(b)];
          if (rd !== 0) return rd;
          const jd = (joinCounts[b.id] ?? 0) - (joinCounts[a.id] ?? 0);
          if (jd !== 0) return jd;
          return (b.likeCount ?? 0) - (a.likeCount ?? 0);
        }),
    [questions, meta.demandType, joinCounts],
  );

  // ── 요약 지표 (유형 전체 기준) ────────────────────────────────────────────
  const summary = useMemo(() => {
    let joinTotal = 0;
    let opened = 0;
    let reviewing = 0;
    for (const q of kindItems) {
      joinTotal += joinCounts[q.id] ?? 0;
      const s = resolveStatus(q);
      if (s === "opened") opened += 1;
      else if (s === "reviewing") reviewing += 1;
    }
    return { total: kindItems.length, joinTotal, opened, reviewing };
  }, [kindItems, joinCounts]);

  // ── 내 수요 (등록했거나 관심·참여 표시한 항목) — M4 ─────────────────────────
  const mineItems = useMemo(() => {
    if (!user) return [];
    return kindItems.filter(
      (q) =>
        q.authorId === user.id ||
        likedSet.has(`question__${q.id}`) ||
        likedSet.has(`${DEMAND_JOIN}__${q.id}`),
    );
  }, [kindItems, user, likedSet]);

  // ── 스코프(전체/내 수요) + 상태 필터 적용 ──────────────────────────────────
  const visible = useMemo(() => {
    const base = scope === "mine" ? mineItems : kindItems;
    if (statusFilter === "all") return base;
    return base.filter((q) => {
      const s = resolveStatus(q);
      if (statusFilter === "active") return s !== "opened" && s !== "declined";
      return s === statusFilter;
    });
  }, [kindItems, mineItems, scope, statusFilter]);

  // ── 유사 수요 안내 (제안서 2.1.2) — 입력 중 부분 문자열 매칭 ────────────────
  const similar = useMemo(() => {
    const q = body.trim().toLowerCase();
    if (q.length < 2) return [];
    return kindItems
      .filter((it) => {
        const b = (it.body ?? "").trim().toLowerCase();
        if (!b || b === q) return false;
        return b.includes(q) || q.includes(b);
      })
      .slice(0, 3);
  }, [body, kindItems]);

  // ── 등록 ──────────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!board || !user) throw new Error("로그인이 필요합니다.");
      await commQuestionsApi.create({
        boardId: board.id,
        contextId: board.contextId,
        authorId: user.id,
        authorName: user.name ?? "",
        anonymous: false,
        body: body.trim(),
        presenter: meta.demandType,
        demandPref: {
          format: formatPref,
          status: "collecting",
          statusHistory: appendStatusHistory(undefined, "collecting", user.id),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(domain ? { domain } : {}),
          ...(difficulty ? { difficulty } : {}),
          ...(preferredTime ? { preferredTime } : {}),
          ...(campaignTopicId ? { campaignTopicId } : {}),
        },
      });
    },
    onSuccess: () => {
      toast.success("수요가 등록되었습니다.");
      setBody("");
      setNote("");
      setFormatPref("무관");
      setDomain("");
      setDifficulty("");
      setPreferredTime("");
      setCampaignTopicId(null);
      setShowAdvanced(false);
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) => toast.error(`등록 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  const interestMutation = useMutation({
    mutationFn: (questionId: string) =>
      commLikesApi.toggle(user!.id, "question", questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
      qc.invalidateQueries({ queryKey: ["demand-liked"] });
    },
    onError: (e) => toast.error(`관심 반응 오류: ${e instanceof Error ? e.message : "오류"}`),
  });

  const joinMutation = useMutation({
    mutationFn: async (q: CommQuestion) => {
      const added = await commLikesApi.togglePlain(user!.id, DEMAND_JOIN, q.id, user!.name ?? "");
      // Q2: 참여 추가로 정족수 도달 & 아직 수집중일 때만 collecting → reviewing 자동 전환
      if (added && resolveStatus(q) === "collecting") {
        const nextCount = (joinCounts[q.id] ?? 0) + 1; // 방금 추가분 반영 (added=true → 미집계였음)
        if (nextCount >= JOIN_THRESHOLD) {
          await commQuestionsApi.update(q.id, {
            demandPref: {
              ...(q.demandPref ?? {}),
              status: "reviewing",
              statusHistory: appendStatusHistory(q.demandPref, "reviewing", user!.id),
            },
          });
          // M6: 운영진 알림 — 전환 1회 시점에만. 실패해도 전환을 막지 않는다(비블로킹).
          try {
            await notifyDemandQuorumReached(q.body ?? "", meta.demandType);
          } catch {
            // 알림 실패는 무시
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["demand-joins"] });
      qc.invalidateQueries({ queryKey: ["demand-liked"] });
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) => toast.error(`참여 반응 오류: ${e instanceof Error ? e.message : "오류"}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => commQuestionsApi.delete(questionId),
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) => toast.error(`삭제 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  // ── 수요 편집 (본인·수집중) — 제안서 2.5.2 ─────────────────────────────────
  const editMutation = useMutation({
    mutationFn: (q: CommQuestion) =>
      commQuestionsApi.update(q.id, {
        body: editBody.trim(),
        demandPref: {
          ...(q.demandPref ?? {}),
          format: editFormat,
          note: editNote.trim() || undefined,
          domain: editDomain || undefined,
          difficulty: editDifficulty || undefined,
          preferredTime: editTime || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("수정되었습니다.");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) => toast.error(`수정 실패: ${e instanceof Error ? e.message : "오류"}`),
  });

  function startEdit(q: CommQuestion) {
    setEditingId(q.id);
    setEditBody(q.body ?? "");
    setEditFormat((q.demandPref?.format as FormatPref | undefined) ?? "무관");
    setEditNote(q.demandPref?.note ?? "");
    setEditDomain(q.demandPref?.domain ?? "");
    setEditDifficulty(q.demandPref?.difficulty ?? "");
    setEditTime(q.demandPref?.preferredTime ?? "");
  }

  // ── 운영진 상태 전환 ──────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ q, status, statusNote }: { q: CommQuestion; status: DemandStatus; statusNote: string }) =>
      commQuestionsApi.update(q.id, {
        demandPref: {
          ...(q.demandPref ?? {}),
          status,
          statusNote: statusNote || undefined,
          statusHistory: appendStatusHistory(q.demandPref, status, user?.id),
        },
      }),
    onSuccess: () => {
      toast.success("상태를 변경했습니다.");
      qc.invalidateQueries({ queryKey: ["demand-questions"] });
    },
    onError: (e) => toast.error(`상태 변경 오류: ${e instanceof Error ? e.message : "오류"}`),
  });

  function changeStatus(q: CommQuestion, status: DemandStatus) {
    let statusNote = q.demandPref?.statusNote ?? "";
    if (status === "opened" || status === "declined") {
      const label =
        status === "opened"
          ? "개설 안내 (스터디명·일정 등, 선택)"
          : "보류 사유 (선택)";
      const input = window.prompt(label, statusNote);
      if (input === null) return; // 취소
      statusNote = input.trim().slice(0, 120);
    } else {
      statusNote = "";
    }
    statusMutation.mutate({ q, status, statusNote });
  }

  const isLoading = boardLoading || qLoading;

  const FILTER_TABS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "전체", count: summary.total },
    { key: "active", label: "진행중", count: summary.total - summary.opened - kindItems.filter((q) => resolveStatus(q) === "declined").length },
    { key: "opened", label: "개설됨", count: summary.opened },
    { key: "declined", label: "보류", count: kindItems.filter((q) => resolveStatus(q) === "declined").length },
  ];

  return (
    <section className="pb-8 pt-1">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">{meta.sectionTitle}</h2>
        <Badge variant="secondary" className="text-[10px]">{semesterLabel}</Badge>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {meta.hint} <span className="text-foreground">관심있어요</span>·
        <span className="text-foreground">참여할래요</span>로 수요를 표현하면, 참여 의사가 많은
        주제부터 운영진이 개설을 검토합니다.
      </p>

      {/* ── 수요조사 캠페인 배너 ── */}
      {campaign && campaignState.isVisible && (
        <div
          className={cn(
            "mb-4 rounded-2xl border p-4",
            campaignState.isOpen
              ? "border-primary/30 bg-primary/5"
              : "border-border bg-muted/40",
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Megaphone size={15} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">{campaign.title}</p>
            {campaignState.isOpen ? (
              campaignState.daysLeft !== null && (
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                  {campaignState.daysLeft > 0
                    ? `마감까지 D-${campaignState.daysLeft}`
                    : "오늘 마감"}
                </Badge>
              )
            ) : (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                마감됨
              </Badge>
            )}
          </div>
          {campaign.description && (
            <p className="mt-1.5 text-xs text-muted-foreground">{campaign.description}</p>
          )}
          {(campaign.startDate || campaign.endDate) && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              진행 기간: {campaign.startDate || "미정"} ~ {campaign.endDate || "미정"}
            </p>
          )}
        </div>
      )}

      {/* ── 요약 지표 ── */}
      {!!user && !isLoading && summary.total > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:max-w-md">
          {[
            { label: "등록 수요", value: `${summary.total}건`, cls: "text-foreground" },
            { label: "참여 의사 합", value: `${summary.joinTotal}명`, cls: "text-success" },
            { label: "개설됨", value: `${summary.opened}건`, cls: "text-primary" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border bg-card px-3 py-2 text-center">
              <p className={cn("text-lg font-bold tabular-nums", s.cls)}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 비로그인 CTA ── */}
      {!user ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-dashed bg-card px-5 py-4 text-sm">
          <p className="text-muted-foreground">로그인하면 수요를 등록하고 반응할 수 있습니다.</p>
          <Link href="/login">
            <Button size="sm" variant="outline">
              로그인
              <ArrowRight size={13} className="ml-1" />
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* ── 등록 폼 (캠페인 마감 시 비활성) ── */}
          {!campaignState.isOpen ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed bg-muted/40 px-5 py-6 text-sm">
              <Lock size={16} className="shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">수요조사가 마감되었습니다.</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  이미 등록된 수요에는 관심·참여로 계속 반응할 수 있습니다.
                </p>
              </div>
            </div>
          ) : (
          <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
            {/* 캠페인 사전 주제 칩 */}
            {campaignState.isVisible && (campaign?.topics.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">추천 주제</p>
                <div className="flex flex-wrap gap-1.5">
                  {campaign!.topics.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setBody(t.label.slice(0, 140));
                        setCampaignTopicId(t.id);
                        if (t.domain) setDomain(t.domain);
                      }}
                      aria-pressed={campaignTopicId === t.id}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        campaignTopicId === t.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={`demand-body-${kind}`}>
                주제 한 줄 <span className="text-destructive" aria-hidden>*</span>
              </label>
              <Input
                id={`demand-body-${kind}`}
                placeholder={meta.placeholder}
                value={body}
                onChange={(e) => {
                  setBody(e.target.value.slice(0, 140));
                  setCampaignTopicId(null);
                }}
                maxLength={140}
              />
              <p className="text-right text-[11px] text-muted-foreground">{body.length}/140</p>

              {/* 유사 수요 안내 (2.1.2) */}
              {similar.length > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="mb-1.5 text-xs font-medium text-foreground">
                    비슷한 수요가 이미 있습니다. 관심으로 합류해보세요.
                  </p>
                  <ul className="space-y-1">
                    {similar.map((it) => (
                      <li key={it.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {it.body}
                        </span>
                        <button
                          type="button"
                          onClick={() => interestMutation.mutate(it.id)}
                          disabled={interestMutation.isPending}
                          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                        >
                          <Heart size={10} /> 관심으로 합류
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">선호 형태</p>
              <div className="flex gap-2">
                {FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormatPref(f)}
                    aria-pressed={formatPref === f}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      formatPref === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor={`demand-note-${kind}`}>
                메모 <span className="text-muted-foreground/60">(선택 — 희망 주기·수준 등)</span>
              </label>
              <Input
                id={`demand-note-${kind}`}
                placeholder="예: 주 1회 온라인, 논문 초급자 대상"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 100))}
                maxLength={100}
              />
            </div>

            {/* 상세 선호 아코디언 (2.1.1) — 기본 접힘 */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  size={13}
                  className={cn("transition-transform", showAdvanced && "rotate-180")}
                />
                상세 선호 <span className="text-muted-foreground/60">(선택 — 분야·난이도·시간대)</span>
              </button>
              {showAdvanced && (
                <PrefSelects
                  idPrefix={`demand-adv-${kind}`}
                  domain={domain}
                  difficulty={difficulty}
                  time={preferredTime}
                  onDomain={setDomain}
                  onDifficulty={setDifficulty}
                  onTime={setPreferredTime}
                />
              )}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => submitMutation.mutate()} disabled={!body.trim() || submitMutation.isPending}>
                {submitMutation.isPending ? (
                  <Loader2 size={14} className="mr-1 animate-spin" />
                ) : (
                  <Plus size={14} className="mr-1" />
                )}
                등록
              </Button>
            </div>
          </div>
          )}

          {/* ── 스코프 토글 (전체 / 내 수요) — M4 ── */}
          {!isLoading && summary.total > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {([
                { key: "all", label: "전체 보기", count: kindItems.length },
                { key: "mine", label: "내 수요", count: mineItems.length },
              ] as { key: DemandScope; label: string; count: number }[]).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setScope(s.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    scope === s.key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s.label} <span className="tabular-nums opacity-70">{s.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── 상태 필터 ── */}
          {!isLoading && summary.total > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {FILTER_TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setStatusFilter(t.key)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    statusFilter === t.key
                      ? "bg-primary text-primary-foreground"
                      : "border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label} <span className="tabular-nums opacity-70">{t.count}</span>
                </button>
              ))}
            </div>
          )}

          {/* ── 보드 목록 ── */}
          <div className="mt-3 space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-muted-foreground" size={22} />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title={
                  scope === "mine" && mineItems.length === 0
                    ? "내 수요가 아직 없습니다"
                    : summary.total === 0
                      ? meta.emptyTitle
                      : "해당 상태의 수요가 없습니다"
                }
                description={
                  scope === "mine" && mineItems.length === 0
                    ? "주제를 등록하거나 관심·참여로 반응하면 여기에 모여요."
                    : summary.total === 0
                      ? meta.emptyDesc
                      : "다른 상태 필터를 선택해 보세요."
                }
              />
            ) : (
              visible.map((q) => {
                const isInterested = likedSet.has(`question__${q.id}`);
                const isJoined = likedSet.has(`${DEMAND_JOIN}__${q.id}`);
                const joinCount = joinCounts[q.id] ?? 0;
                const isOwner = q.authorId === user.id;
                const pref = q.demandPref;
                const status = resolveStatus(q);
                const sm = STATUS_META[status];
                const StatusIcon = sm.icon;
                const quorum = joinCount >= JOIN_THRESHOLD && (status === "collecting" || status === "reviewing");
                const dimmed = status === "opened" || status === "declined";
                return (
                  <div
                    key={q.id}
                    className={cn(
                      "rounded-2xl border bg-card p-4 transition-all duration-150 hover:shadow-sm",
                      quorum ? "border-success/40" : "hover:border-primary/30",
                      dimmed && "opacity-80",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* 반응 버튼 */}
                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => interestMutation.mutate(q.id)}
                          disabled={interestMutation.isPending}
                          aria-pressed={isInterested}
                          aria-label={isInterested ? "관심 취소" : "관심있어요"}
                          className={cn(
                            "flex w-14 flex-col items-center gap-0.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-colors",
                            isInterested
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary",
                          )}
                        >
                          <Heart size={14} className={isInterested ? "fill-primary" : ""} />
                          <span className="tabular-nums">{q.likeCount ?? 0}</span>
                          <span className="text-[9px] font-medium">관심</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => joinMutation.mutate(q)}
                          disabled={joinMutation.isPending}
                          aria-pressed={isJoined}
                          aria-label={isJoined ? "참여 의사 취소" : "참여할래요"}
                          className={cn(
                            "flex w-14 flex-col items-center gap-0.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-colors",
                            isJoined
                              ? "border-success bg-success/10 text-success"
                              : "border-border text-muted-foreground hover:border-success/40 hover:text-success",
                          )}
                        >
                          <UserPlus size={14} />
                          <span className="tabular-nums">{joinCount}</span>
                          <span className="text-[9px] font-medium">참여</span>
                        </button>
                      </div>

                      {/* 내용 */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className={cn("gap-1 text-[10px]", sm.badge)}>
                            <StatusIcon size={10} />
                            {sm.label}
                          </Badge>
                          {quorum && (
                            <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-[10px] text-success">
                              <Flame size={10} />
                              개설 정족수
                            </Badge>
                          )}
                          {pref?.format && pref.format !== "무관" && (
                            <Badge variant="outline" className="text-[10px]">{pref.format}</Badge>
                          )}
                          {pref?.domain && (
                            <Badge variant="outline" className="text-[10px]">{pref.domain}</Badge>
                          )}
                          {pref?.difficulty && pref.difficulty !== "무관" && (
                            <Badge variant="outline" className="text-[10px]">{pref.difficulty}</Badge>
                          )}
                          {pref?.preferredTime && pref.preferredTime !== "무관" && (
                            <Badge variant="outline" className="text-[10px]">{pref.preferredTime}</Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-foreground">{q.body}</p>
                        {pref?.note && <p className="mt-1 text-xs text-muted-foreground">{pref.note}</p>}
                        {pref?.statusNote && (
                          <p className={cn(
                            "mt-1.5 flex items-start gap-1 rounded-lg px-2 py-1 text-xs",
                            status === "opened" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
                          )}>
                            <StatusIcon size={12} className="mt-0.5 shrink-0" />
                            <span>{pref.statusNote}</span>
                          </p>
                        )}
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          {q.authorName} · {(q.createdAt ?? "").slice(0, 10)}
                        </p>

                        {/* 내 수요 스테퍼 + 개설 활동 바로가기 (M4) */}
                        {scope === "mine" && (
                          <>
                            <DemandStepper status={status} />
                            {status === "opened" && pref?.linkedActivityId && (
                              <Link
                                href={`/activities/studies/${pref.linkedActivityId}`}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/5 px-2 py-0.5 text-[10px] font-medium text-success transition-colors hover:bg-success/10"
                              >
                                개설된 활동 보기 <ArrowRight size={11} />
                              </Link>
                            )}
                          </>
                        )}

                        {/* 본인 편집 폼 (수집중 항목) — 2.5.2 */}
                        {editingId === q.id && (
                          <div className="mt-2 space-y-2.5 rounded-xl border bg-muted/20 p-3">
                            <Input
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value.slice(0, 140))}
                              maxLength={140}
                              placeholder={meta.placeholder}
                            />
                            <div className="flex flex-wrap gap-1.5">
                              {FORMAT_OPTIONS.map((f) => (
                                <button
                                  key={f}
                                  type="button"
                                  onClick={() => setEditFormat(f)}
                                  aria-pressed={editFormat === f}
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-xs transition-colors",
                                    editFormat === f
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border text-muted-foreground hover:bg-accent",
                                  )}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                            <Input
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value.slice(0, 100))}
                              maxLength={100}
                              placeholder="메모 (선택 — 희망 주기·수준 등)"
                            />
                            <PrefSelects
                              idPrefix={`demand-edit-${q.id}`}
                              domain={editDomain}
                              difficulty={editDifficulty}
                              time={editTime}
                              onDomain={setEditDomain}
                              onDifficulty={setEditDifficulty}
                              onTime={setEditTime}
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingId(null)}
                                disabled={editMutation.isPending}
                              >
                                취소
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => editMutation.mutate(q)}
                                disabled={!editBody.trim() || editMutation.isPending}
                              >
                                {editMutation.isPending ? (
                                  <Loader2 size={13} className="mr-1 animate-spin" />
                                ) : null}
                                저장
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* 개설 파이프라인(스터디) / 운영진 액션(세미나) */}
                        {status !== "opened" && status !== "declined" && user && (
                          <div className="mt-2 flex flex-wrap items-center gap-1 border-t pt-2">
                            {kind === "study" ? (
                              <button
                                type="button"
                                onClick={() => setPipelineTarget(q)}
                                className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/10"
                              >
                                <Rocket size={11} /> 개설 진행
                              </button>
                            ) : (
                              isStaff &&
                              (["reviewing", "opened"] as DemandStatus[])
                                .filter((s) => s !== status)
                                .map((s) => (
                                  <button
                                    key={s}
                                    type="button"
                                    onClick={() => changeStatus(q, s)}
                                    disabled={statusMutation.isPending}
                                    className="rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                                  >
                                    {STATUS_META[s].label}로
                                  </button>
                                ))
                            )}
                            {isStaff && (
                              <button
                                type="button"
                                onClick={() => changeStatus(q, "declined")}
                                disabled={statusMutation.isPending}
                                className="rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                              >
                                보류
                              </button>
                            )}
                          </div>
                        )}
                        {isStaff && status === "declined" && (
                          <div className="mt-2 flex items-center gap-1 border-t pt-2">
                            <button
                              type="button"
                              onClick={() => changeStatus(q, "collecting")}
                              disabled={statusMutation.isPending}
                              className="rounded-md border px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                            >
                              재검토로
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 본인 편집·삭제 */}
                      {isOwner && (
                        <div className="flex shrink-0 flex-col gap-1">
                          {status === "collecting" && (
                            <button
                              type="button"
                              onClick={() => (editingId === q.id ? setEditingId(null) : startEdit(q))}
                              aria-label="수정"
                              className={cn(
                                "rounded-lg p-1.5 transition-colors hover:bg-muted",
                                editingId === q.id
                                  ? "text-primary"
                                  : "text-muted-foreground hover:text-primary",
                              )}
                            >
                              {editingId === q.id ? <X size={14} /> : <Pencil size={14} />}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (!window.confirm("삭제하시겠습니까?")) return;
                              deleteMutation.mutate(q.id);
                            }}
                            disabled={deleteMutation.isPending}
                            aria-label="삭제"
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* 개설 파이프라인 패널 */}
      {pipelineTarget && (
        <StudyLaunchPanel
          question={pipelineTarget}
          joinCount={joinCounts[pipelineTarget.id] ?? 0}
          open={!!pipelineTarget}
          onClose={() => setPipelineTarget(null)}
          onUpdated={() => {
            qc.invalidateQueries({ queryKey: ["demand-questions"] });
            qc.invalidateQueries({ queryKey: ["demand-joins"] });
          }}
        />
      )}
    </section>
  );
}

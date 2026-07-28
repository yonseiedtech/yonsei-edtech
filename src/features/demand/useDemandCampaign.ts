"use client";

/**
 * 수요조사 캠페인 설정 (2026-07-28) — 관리자가 "어떤 스터디 주제로·어느 기간 동안"
 * 수요조사를 진행할지 학기 단위로 관리한다.
 *
 * 저장: site_settings 키 `demand_campaign:{YYYY-1|2}` (학기 스코프, useOrgChart 패턴 재사용).
 * 값은 JSON 문자열(DemandCampaign). 신규 컬렉션 없음.
 *
 * 회원 반영(DemandSurveySection): status="active" 이고 기간 내이면 배너·주제 칩·D-day 노출,
 * status="closed" 이거나 endDate 경과 시 등록 폼 비활성. status="draft" 는 회원 비노출(현행 자유 등록).
 *
 * 렌더 순수성: 오늘(YYYY-MM-DD)은 훅에서 useMemo 로 1회 고정하고,
 * 단계 판정은 아래 순수 함수(resolveCampaignPhase)에 today 를 주입해 계산한다.
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

export type CampaignStatus = "draft" | "active" | "closed";

export interface DemandCampaignTopic {
  id: string;
  label: string;
  /** 사전 분야 (선택) — 선택 시 등록 폼 domain 자동 채움 */
  domain?: string;
}

export interface DemandCampaign {
  /**
   * 캠페인 고유 식별자 — 복수 캠페인(라운드) 배열에서 항목을 upsert/편집/삭제할 때의 키.
   * 레거시 단일 캠페인(id 부재)은 로드 시 `legacy-{semester}-{index}` 로 안정 부여된다.
   */
  id: string;
  /** 라운드 번호 (1차·2차…). 레거시는 1. */
  round?: number;
  /** 학기 키 "YYYY-1" | "YYYY-2" */
  semester: string;
  title: string;
  description?: string;
  topics: DemandCampaignTopic[];
  /** 수요조사 진행 시작일 (YYYY-MM-DD) */
  startDate: string;
  /** 수요조사 진행 종료일 (YYYY-MM-DD) */
  endDate: string;
  status: CampaignStatus;
  updatedBy?: string;
  updatedAt?: string;
}

/** 구조화 선호 필드 후보 (제안서 2.1.1) — 등록 폼·캠페인 주제·집계 공용 */
export const DOMAIN_OPTIONS = [
  "교수설계",
  "학습분석",
  "에듀테크",
  "HRD/평생교육",
  "교육평가",
  "연구방법론",
  "기타",
] as const;

export const DIFFICULTY_OPTIONS = ["입문", "중급", "심화", "무관"] as const;

export const TIME_OPTIONS = ["오전", "오후", "저녁", "무관"] as const;

/**
 * 새 캠페인 주제 생성 — 고유 id 발급.
 * 학기 복제(L5)·수요 이월(L2) 시 교차 학기 topicId 혼동을 막기 위해 항상 새 id 를 부여한다.
 * 이벤트 핸들러에서만 호출(렌더 순수성 무관 — crypto/Date 폴백).
 */
export function makeCampaignTopic(label = "", domain = ""): DemandCampaignTopic {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return { id, label, domain };
}

/**
 * 새 캠페인(라운드) 고유 id 발급. 이벤트 핸들러·mutation 에서만 호출(crypto/Date 폴백 — 렌더 순수성 무관).
 */
export function makeCampaignId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 학기 스코프 site_settings 키 — 예: "demand_campaign:2026-2" */
export function demandCampaignKey(semesterKey: string): string {
  return `demand_campaign:${semesterKey}`;
}

const QUERY_KEY_BASE = ["site_settings", "demand_campaign"];

/** KST 기준 오늘 YYYY-MM-DD. currentSemesterKey 와 동일한 KST 앵커. */
export function todayYmdKst(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 두 YYYY-MM-DD 사이 일수(to - from). 파싱 불가 시 null. */
export function daysBetweenYmd(fromYmd: string, toYmd: string): number | null {
  const a = Date.parse(`${fromYmd}T00:00:00Z`);
  const b = Date.parse(`${toYmd}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

export type CampaignPhase = "none" | "upcoming" | "active" | "ended";

export interface CampaignState {
  phase: CampaignPhase;
  /** endDate 까지 남은 일수 (>=0). active/upcoming 이고 종료일 유효할 때만, 아니면 null. */
  daysLeft: number | null;
  /** 회원 등록 폼 허용 여부. 캠페인 없음/초안이면 현행대로 true, 진행 캠페인 종료·마감 시 false. */
  isOpen: boolean;
  /** 회원에게 캠페인 배너를 노출할지 (draft·none 은 미노출) */
  isVisible: boolean;
}

/**
 * 캠페인 단계 판정 (순수 함수 — today 주입).
 *  - 캠페인 없음 또는 draft: 회원에겐 현행 자유 등록(isOpen=true, isVisible=false).
 *  - active + endDate 경과: ended(마감, isOpen=false).
 *  - active + startDate 이전: upcoming(등록은 허용, 배너 노출).
 *  - closed: ended(마감, isOpen=false).
 */
export function resolveCampaignPhase(
  campaign: DemandCampaign | null,
  todayYmd: string,
): CampaignState {
  if (!campaign || campaign.status === "draft") {
    return { phase: "none", daysLeft: null, isOpen: true, isVisible: false };
  }
  const toEnd = campaign.endDate ? daysBetweenYmd(todayYmd, campaign.endDate) : null;
  const toStart = campaign.startDate ? daysBetweenYmd(todayYmd, campaign.startDate) : null;

  if (campaign.status === "closed") {
    return { phase: "ended", daysLeft: null, isOpen: false, isVisible: true };
  }
  // status === "active"
  if (toEnd !== null && toEnd < 0) {
    return { phase: "ended", daysLeft: null, isOpen: false, isVisible: true };
  }
  if (toStart !== null && toStart > 0) {
    return { phase: "upcoming", daysLeft: toEnd, isOpen: true, isVisible: true };
  }
  return { phase: "active", daysLeft: toEnd, isOpen: true, isVisible: true };
}

/**
 * 저장값(레거시 객체·배열 항목) 1건을 DemandCampaign 으로 정규화.
 * 레거시(id/round 부재)는 id=`legacy-{semester}-{index+1}`, round=index+1 로 안정 부여.
 */
function normalizeCampaign(
  raw: unknown,
  semesterKey: string,
  index: number,
): DemandCampaign {
  const o = (raw ?? {}) as Partial<DemandCampaign>;
  return {
    id: typeof o.id === "string" && o.id ? o.id : `legacy-${semesterKey}-${index + 1}`,
    round: typeof o.round === "number" ? o.round : index + 1,
    semester: o.semester ?? semesterKey,
    title: o.title ?? "",
    description: o.description,
    topics: Array.isArray(o.topics) ? o.topics : [],
    startDate: o.startDate ?? "",
    endDate: o.endDate ?? "",
    status: o.status ?? "draft",
    updatedBy: o.updatedBy,
    updatedAt: o.updatedAt,
  };
}

/**
 * 학기 캠페인 로드 — 하위호환 파싱.
 *  - 배열 → 그대로 DemandCampaign[] 정규화.
 *  - 객체(레거시 단일) → [1건] 래핑.
 *  - 파싱 실패/부재 → [].
 */
async function loadCampaigns(semesterKey: string): Promise<{
  campaigns: DemandCampaign[];
  recordId: string | null;
}> {
  const res = await siteSettingsApi.getByKey(demandCampaignKey(semesterKey));
  if (res.data.length === 0) return { campaigns: [], recordId: null };
  const row = res.data[0];
  let campaigns: DemandCampaign[] = [];
  try {
    const parsed: unknown = JSON.parse(String(row.value ?? ""));
    if (Array.isArray(parsed)) {
      campaigns = parsed
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c, i) => normalizeCampaign(c, semesterKey, i));
    } else if (parsed && typeof parsed === "object") {
      campaigns = [normalizeCampaign(parsed, semesterKey, 0)];
    }
  } catch (e) {
    console.warn("[useDemandCampaign] campaign value 파싱 실패 — 캠페인 없음으로 폴백", e);
  }
  return { campaigns, recordId: (row.id as string) ?? null };
}

/** 최신 우선 정렬: round 큰 순 → startDate 최신 → updatedAt 최신. */
function campaignRecency(a: DemandCampaign, b: DemandCampaign): number {
  const ar = a.round ?? 0;
  const br = b.round ?? 0;
  if (ar !== br) return br - ar;
  if ((a.startDate ?? "") !== (b.startDate ?? "")) {
    return (b.startDate ?? "").localeCompare(a.startDate ?? "");
  }
  return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
}

/**
 * 현재 활성 캠페인 1건 판정 — status==="active" 이고 종료일 미경과(진행/예정)인 것 중
 * round 큰(동률이면 startDate 최신) 1건. 없으면 null. (순수 함수 — todayYmd 주입)
 */
export function resolveActiveCampaign(
  campaigns: DemandCampaign[],
  todayYmd: string,
): DemandCampaign | null {
  const active = campaigns.filter((c) => {
    if (c.status !== "active") return false;
    const toEnd = c.endDate ? daysBetweenYmd(todayYmd, c.endDate) : null;
    return !(toEnd !== null && toEnd < 0); // 종료일 경과분 제외
  });
  if (active.length === 0) return null;
  return [...active].sort(campaignRecency)[0];
}

/**
 * 소비처(콘솔 대시보드·회고 이월)에서 기본 표시할 단일 캠페인 —
 * 활성 캠페인 우선, 없으면 최신(round·기간) 1건. 배열이 비면 null.
 */
export function pickActiveOrLatest(
  campaigns: DemandCampaign[],
  todayYmd: string,
): DemandCampaign | null {
  return resolveActiveCampaign(campaigns, todayYmd) ?? [...campaigns].sort(campaignRecency)[0] ?? null;
}

/** 배열에 캠페인 upsert — 같은 id 있으면 교체, 없으면 추가(불변). */
export function upsertCampaign(
  campaigns: DemandCampaign[],
  campaign: DemandCampaign,
): DemandCampaign[] {
  const idx = campaigns.findIndex((c) => c.id === campaign.id);
  if (idx === -1) return [...campaigns, campaign];
  const next = [...campaigns];
  next[idx] = campaign;
  return next;
}

/**
 * 학기별 수요조사 캠페인(복수) 조회 훅.
 * @param semesterKey 대상 학기 키(생략 시 호출부에서 useEffectiveSemesterKey 로 주입 권장).
 */
export function useDemandCampaigns(semesterKey: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY_BASE, semesterKey],
    queryFn: () => loadCampaigns(semesterKey),
    staleTime: 1000 * 60 * 5,
    enabled: !!semesterKey,
  });

  // 렌더 순수성 — 마운트 시 1회 오늘 고정
  const today = useMemo(() => todayYmdKst(), []);
  const campaigns = useMemo(() => data?.campaigns ?? [], [data]);

  return {
    campaigns,
    recordId: data?.recordId ?? null,
    today,
    isLoading,
  };
}

/** 배열 전체 저장 — recordId 있으면 update, 없으면 create. */
export function useUpdateDemandCampaigns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      campaigns,
      semesterKey,
    }: {
      recordId: string | null;
      campaigns: DemandCampaign[];
      semesterKey: string;
    }) => {
      const payload = {
        key: demandCampaignKey(semesterKey),
        value: JSON.stringify(campaigns),
      };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY_BASE }),
  });
}

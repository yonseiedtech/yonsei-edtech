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

async function loadCampaign(semesterKey: string): Promise<{
  campaign: DemandCampaign | null;
  recordId: string | null;
}> {
  const res = await siteSettingsApi.getByKey(demandCampaignKey(semesterKey));
  if (res.data.length === 0) return { campaign: null, recordId: null };
  const row = res.data[0];
  let campaign: DemandCampaign | null = null;
  try {
    const parsed = JSON.parse(String(row.value ?? "")) as DemandCampaign;
    if (parsed && typeof parsed === "object") {
      campaign = {
        semester: parsed.semester ?? semesterKey,
        title: parsed.title ?? "",
        description: parsed.description,
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        startDate: parsed.startDate ?? "",
        endDate: parsed.endDate ?? "",
        status: parsed.status ?? "draft",
        updatedBy: parsed.updatedBy,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch (e) {
    console.warn("[useDemandCampaign] campaign value 파싱 실패 — 캠페인 없음으로 폴백", e);
  }
  return { campaign, recordId: (row.id as string) ?? null };
}

/**
 * 학기별 수요조사 캠페인 조회 훅.
 * @param semesterKey 대상 학기 키(생략 시 호출부에서 useEffectiveSemesterKey 로 주입 권장).
 */
export function useDemandCampaign(semesterKey: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY_BASE, semesterKey],
    queryFn: () => loadCampaign(semesterKey),
    staleTime: 1000 * 60 * 5,
    enabled: !!semesterKey,
  });

  // 렌더 순수성 — 마운트 시 1회 오늘 고정
  const today = useMemo(() => todayYmdKst(), []);
  const campaign = data?.campaign ?? null;
  const state = useMemo(() => resolveCampaignPhase(campaign, today), [campaign, today]);

  return {
    campaign,
    recordId: data?.recordId ?? null,
    state,
    today,
    isLoading,
  };
}

export function useUpdateDemandCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      campaign,
      semesterKey,
    }: {
      recordId: string | null;
      campaign: DemandCampaign;
      semesterKey: string;
    }) => {
      const payload = {
        key: demandCampaignKey(semesterKey),
        value: JSON.stringify(campaign),
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

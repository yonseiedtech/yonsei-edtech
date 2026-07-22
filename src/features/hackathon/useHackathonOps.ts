"use client";

/**
 * 해커톤 당일 운영 오버라이드 훅 (H3-v10, 2026-07-20 / 설정 주입 확장 2026-07-22)
 *
 * 단계 전환(접수/제출/심사/수상)과 제출 마감 여부를 운영진이 콘솔에서 수동으로
 * 덮어쓸 수 있게 한다. 저장은 site_settings(key="hackathon_ops") 재사용 — 신규 컬렉션 없음.
 * 수동 값이 있으면 우선, 없으면 하드코딩 날짜 기준 자동 폴백(수동 우선·자동 폴백).
 *
 * 2026-07-22: useHackathonEvent() 에서 이벤트 레코드의 phaseStartDates / submissionDeadline 을
 * 주입한다. 이벤트 레코드에 설정이 없으면 기존 동작(config 상수)과 100% 동일.
 *
 * 공개 컴포넌트(HackathonPhaseTimeline·HackathonAwards·HackathonSubmissions)와
 * 콘솔 당일 운영 탭이 같은 쿼리 키를 공유하므로 React Query 가 요청을 dedupe 한다.
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import {
  HACKATHON_OPS_SETTINGS_KEY,
  HACKATHON_OPS_DEFAULT,
  resolveHackathonPhase,
  resolveHackathonSubmissionClosed,
  resolveSectionVisibility,
  type HackathonOpsOverride,
  type HackathonPhaseKey,
  type SectionVisibility,
} from "./config";
import { useHackathonEvent } from "./useHackathonEvent";

const QUERY_KEY = ["site_settings", HACKATHON_OPS_SETTINGS_KEY];

interface OpsRow {
  override: HackathonOpsOverride;
  recordId: string | null;
}

export function useHackathonOps() {
  const { data, isLoading } = useQuery<OpsRow>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey(HACKATHON_OPS_SETTINGS_KEY);
      if (res.data.length === 0) {
        return { override: HACKATHON_OPS_DEFAULT, recordId: null };
      }
      const row = res.data[0];
      const parsed = JSON.parse(row.value as string) as Partial<HackathonOpsOverride>;
      return {
        override: {
          phase: parsed.phase ?? null,
          submissionClosed: parsed.submissionClosed ?? null,
          sectionVisibility: parsed.sectionVisibility ?? null,
        },
        recordId: (row.id as string) ?? null,
      };
    },
    staleTime: 60 * 1000,
  });

  // 이벤트 레코드 설정 주입 — internal_conferences React Query 가 dedupe
  const { event } = useHackathonEvent();

  const override = data?.override ?? HACKATHON_OPS_DEFAULT;
  const recordId = data?.recordId ?? null;

  const phase = useMemo<HackathonPhaseKey>(
    () => resolveHackathonPhase(override, new Date(), event.phaseStartDates),
    [override, event],
  );
  const submissionClosed = useMemo(
    () => resolveHackathonSubmissionClosed(override, new Date(), event.submissionDeadline),
    [override, event],
  );
  const isManual = override.phase !== null || override.submissionClosed !== null;
  const sectionVisibility = useMemo<SectionVisibility>(
    () => resolveSectionVisibility(override),
    [override],
  );

  return { override, recordId, phase, submissionClosed, sectionVisibility, isManual, isLoading };
}

export function useUpdateHackathonOps() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      value,
    }: {
      recordId: string | null;
      value: HackathonOpsOverride;
    }) => {
      const payload = {
        key: HACKATHON_OPS_SETTINGS_KEY,
        value: JSON.stringify(value),
      };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import {
  ACADEMIC_STATUS_CAMPAIGN_KEY,
  defaultCampaign,
  type AcademicStatusCampaign,
} from "@/lib/academic-status";

const QUERY_KEY = ["site_settings", ACADEMIC_STATUS_CAMPAIGN_KEY];

/** 학사정보 최신화 캠페인 설정 조회 (site_settings 단일 문서) */
export function useAcademicStatusCampaign() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey(ACADEMIC_STATUS_CAMPAIGN_KEY);
      if (res.data.length === 0) {
        return { id: null as string | null, value: defaultCampaign() };
      }
      const row = res.data[0];
      return {
        id: row.id as string,
        value: JSON.parse(row.value as string) as AcademicStatusCampaign,
      };
    },
    staleTime: 1000 * 60,
  });

  return {
    campaign: data?.value ?? defaultCampaign(),
    recordId: data?.id ?? null,
    isLoading,
  };
}

/** 캠페인 설정 저장(없으면 생성) */
export function useUpdateAcademicStatusCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      value,
    }: {
      recordId: string | null;
      value: AcademicStatusCampaign;
    }) => {
      const payload = { key: ACADEMIC_STATUS_CAMPAIGN_KEY, value: JSON.stringify(value) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

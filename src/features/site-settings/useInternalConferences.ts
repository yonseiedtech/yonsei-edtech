"use client";

/**
 * 대내 학술대회 목록 — site_settings 컬렉션 key="internal_conferences" 문서로 관리.
 *
 * 병합 규칙:
 *  ① 설정 문서가 없으면 코드 레지스트리(INTERNAL_CONFERENCES)를 표시값으로 반환.
 *  ② 운영진이 처음 편집할 때 recordId=null 로 create 가 호출되어 레지스트리를 시드한다.
 *  ③ 이후 설정 문서가 단일 진실 원천.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import { INTERNAL_CONFERENCES, type InternalConference } from "@/features/internal-conference/conferences";

const SETTINGS_KEY = "internal_conferences";
const QUERY_KEY = ["site_settings", SETTINGS_KEY] as const;

export function useInternalConferences() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey(SETTINGS_KEY);
      if (res.data.length === 0) {
        // 설정 문서 없음 — 레지스트리를 표시값으로 사용
        return { id: null as string | null, conferences: [...INTERNAL_CONFERENCES] as InternalConference[] };
      }
      const row = res.data[0];
      const parsed = JSON.parse(row.value as string) as InternalConference[];
      return { id: row.id as string, conferences: parsed };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    /** 표시할 행사 목록. 설정 문서가 없으면 레지스트리 폴백. */
    conferences: data?.conferences ?? ([...INTERNAL_CONFERENCES] as InternalConference[]),
    /** Firestore 문서 id. null 이면 설정 문서가 아직 없음(첫 편집 시 create). */
    recordId: data?.id ?? null,
    isLoading,
  };
}

export function useSaveInternalConferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      conferences,
    }: {
      recordId: string | null;
      conferences: InternalConference[];
    }) => {
      const payload = { key: SETTINGS_KEY, value: JSON.stringify(conferences) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import { currentSemesterKey } from "@/lib/semester";

/**
 * 현재 학기 수동 설정(override).
 * site_settings 키 `current_semester` — 값이 "YYYY-1"|"YYYY-2" 이면 수동, 빈 문자열이면 자동(날짜 파생).
 *
 * ①층(귀속·스탬프·기본필터)만 override 를 반영한다. ②층 날짜 파생 표시·cron 은 여전히
 * currentSemesterKey() 를 앵커로 쓰므로 이 훅과 무관하다.
 *
 * 렌더 순수성: currentSemesterKey() 폴백은 useMemo 로 마운트 시 1회 고정한다.
 */

const KEY = "current_semester";
const QUERY_KEY = ["site_settings", KEY];

/** 유효한 학기 키 형식인지 — "YYYY-1" | "YYYY-2". */
function isValidSemesterKey(v: string | undefined | null): v is string {
  return !!v && /^\d{4}-[12]$/.test(v.trim());
}

export interface CurrentSemesterSetting {
  /** 저장된 override 원문(수동이면 "YYYY-1|2", 자동이면 ""). */
  override: string;
  /** 자동(날짜 기준) 여부 — override 가 유효 키가 아니면 true. */
  isAuto: boolean;
  /** 실제 적용 학기 키 — override 우선, 아니면 currentSemesterKey(). */
  effectiveKey: string;
  /** site_settings 레코드 id(신규 저장 시 null). */
  recordId: string | null;
  isLoading: boolean;
}

async function loadCurrentSemester(): Promise<{ override: string; recordId: string | null }> {
  const res = await siteSettingsApi.getByKey(KEY);
  if (res.data.length === 0) return { override: "", recordId: null };
  const row = res.data[0];
  return { override: String(row.value ?? ""), recordId: (row.id as string) ?? null };
}

/**
 * 현재 학기 설정 조회 — override/자동 여부·effectiveKey·recordId.
 * staleTime 5분.
 */
export function useCurrentSemesterSetting(): CurrentSemesterSetting {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: loadCurrentSemester,
    staleTime: 1000 * 60 * 5,
  });
  // 렌더 순수성 — 마운트 시 1회 고정. (Date.now() 계열 렌더 중 직접 호출 회피)
  const autoKey = useMemo(() => currentSemesterKey(), []);
  const override = data?.override ?? "";
  const isAuto = !isValidSemesterKey(override);
  return {
    override,
    isAuto,
    effectiveKey: isAuto ? autoKey : override.trim(),
    recordId: data?.recordId ?? null,
    isLoading,
  };
}

/**
 * 실제 적용 학기 키만 반환하는 경량 훅.
 * override 가 유효하면 그것, 아니면 currentSemesterKey()(useMemo 고정).
 * override 미설정 시 반환값은 currentSemesterKey() 와 동일 → 기존 동작 무회귀.
 */
export function useEffectiveSemesterKey(): string {
  return useCurrentSemesterSetting().effectiveKey;
}

/**
 * 현재 학기 override 저장 — 값 저장 + 관련 학기 쿼리 무효화.
 * value: 수동이면 "YYYY-1"|"YYYY-2", 자동이면 빈 문자열.
 */
export function useSetCurrentSemester() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ value, recordId }: { value: string; recordId: string | null }) => {
      const payload = { key: KEY, value };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QUERY_KEY });
      // override 변경 시 학기 스코프 조직도(useOrgChart)도 재평가되도록 무효화
      void qc.invalidateQueries({ queryKey: ["site_settings", "org_chart"] });
    },
  });
}

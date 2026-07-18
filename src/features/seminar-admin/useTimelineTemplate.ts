"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";
import { OFFLINE_TIMELINE, ONLINE_TIMELINE } from "./timeline-template";
import type { TimelinePhase } from "@/types";

/** 저장 가능한 타임라인 템플릿 항목 (진행 상태 없는 정의) */
export type TemplateItem = Omit<TimelinePhase, "done" | "doneAt" | "status" | "doneBy" | "notifiedAssigneeId">;

export interface TimelineTemplateDoc {
  id?: string;
  key: string;
  offline: TemplateItem[];
  online: TemplateItem[];
}

const SETTING_KEY = "seminar_timeline_template";

/**
 * 세미나 운영 타임라인 기본 템플릿 조회/저장.
 * site_settings 컬렉션(key 기반)을 재사용한다. 저장 문서가 없으면 하드코딩 기본값으로 폴백.
 * 저장 권한은 firestore rules 상 president/admin 으로 제한된다(읽기는 공개).
 */
export function useTimelineTemplate() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["timeline-template"],
    queryFn: async (): Promise<TimelineTemplateDoc> => {
      const res = await siteSettingsApi.getByKey(SETTING_KEY);
      const doc = (res.data?.[0] as unknown as TimelineTemplateDoc | undefined) ?? undefined;
      return {
        id: doc?.id,
        key: SETTING_KEY,
        offline: doc?.offline?.length ? doc.offline : [...OFFLINE_TIMELINE],
        online: doc?.online?.length ? doc.online : [...ONLINE_TIMELINE],
      };
    },
    retry: false,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ type, items }: { type: "offline" | "online"; items: TemplateItem[] }) => {
      const res = await siteSettingsApi.getByKey(SETTING_KEY);
      const existing = res.data?.[0] as unknown as TimelineTemplateDoc | undefined;
      const next = {
        key: SETTING_KEY,
        offline: type === "offline" ? items : existing?.offline ?? [...OFFLINE_TIMELINE],
        online: type === "online" ? items : existing?.online ?? [...ONLINE_TIMELINE],
      };
      if (existing?.id) {
        return siteSettingsApi.update(existing.id, next as unknown as Record<string, unknown>);
      }
      return siteSettingsApi.create(next as unknown as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline-template"] });
    },
  });

  return {
    template: data ?? { key: SETTING_KEY, offline: [...OFFLINE_TIMELINE], online: [...ONLINE_TIMELINE] },
    isLoading,
    saveTemplate: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}

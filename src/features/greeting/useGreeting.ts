"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

export interface GreetingData {
  presidentName: string;
  presidentTitle: string;
  presidentPhoto: string;
  content: string;
}

const QUERY_KEY = ["site_settings", "greeting"];

const DEFAULT_GREETING: GreetingData = {
  presidentName: "",
  presidentTitle: "연세교육공학회 회장",
  presidentPhoto: "",
  content:
    "연세교육공학회 홈페이지를 방문해 주셔서 감사합니다.\n\n" +
    "저희 학회는 교육공학의 이론과 실천을 연결하여, " +
    "더 나은 교육 경험을 설계하고 공유하는 학술 커뮤니티입니다.\n\n" +
    "함께 배우고, 깊이 연구하며, 새로운 가능성을 탐색하는 여정에 " +
    "많은 관심과 참여 부탁드립니다.",
};

export function useGreeting() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey("greeting");
      if (res.data.length === 0) return { id: null, greeting: DEFAULT_GREETING };
      const row = res.data[0];
      return {
        id: row.id as string,
        greeting: JSON.parse(row.value as string) as GreetingData,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    greeting: data?.greeting ?? DEFAULT_GREETING,
    recordId: data?.id ?? null,
    isLoading,
  };
}

export function useUpdateGreeting() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      greeting,
    }: {
      recordId: string | null;
      greeting: GreetingData;
    }) => {
      const payload = { key: "greeting", value: JSON.stringify(greeting) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

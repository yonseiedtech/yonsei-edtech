"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

export interface GreetingPerson {
  name: string;
  title: string;
  photo: string;
  content: string;
}

export interface GreetingData {
  /** 주임교수 인사말 (org-structure-v2 신규) */
  advisor?: GreetingPerson;
  /** 학회장 인사말 (정규화 결과는 항상 채워짐) */
  president?: GreetingPerson;
  /** @deprecated 레거시 호환용 - normalizeGreeting() 통과 후엔 비워짐 */
  presidentName?: string;
  /** @deprecated */
  presidentTitle?: string;
  /** @deprecated */
  presidentPhoto?: string;
  /** @deprecated */
  content?: string;
}

const QUERY_KEY = ["site_settings", "greeting"];

const EMPTY_PERSON: GreetingPerson = { name: "", title: "", photo: "", content: "" };

const DEFAULT_PRESIDENT: GreetingPerson = {
  name: "",
  title: "연세교육공학회 회장",
  photo: "",
  content:
    "연세교육공학회 홈페이지를 방문해 주셔서 감사합니다.\n\n" +
    "저희 학회는 교육공학의 이론과 실천을 연결하여, " +
    "더 나은 교육 경험을 설계하고 공유하는 학술 커뮤니티입니다.\n\n" +
    "함께 배우고, 깊이 연구하며, 새로운 가능성을 탐색하는 여정에 " +
    "많은 관심과 참여 부탁드립니다.",
};

const DEFAULT_ADVISOR: GreetingPerson = {
  name: "",
  title: "연세교육공학회 주임교수",
  photo: "",
  content: "",
};

/** 레거시 필드 → president.* 매핑. 항상 advisor/president가 채워진 객체 반환. */
export function normalizeGreeting(raw: GreetingData | null | undefined): {
  advisor: GreetingPerson;
  president: GreetingPerson;
} {
  const data = raw ?? {};
  const president: GreetingPerson = data.president
    ? { ...DEFAULT_PRESIDENT, ...data.president }
    : {
        name: data.presidentName ?? "",
        title: data.presidentTitle || DEFAULT_PRESIDENT.title,
        photo: data.presidentPhoto ?? "",
        content: data.content ?? DEFAULT_PRESIDENT.content,
      };
  const advisor: GreetingPerson = data.advisor
    ? { ...DEFAULT_ADVISOR, ...data.advisor }
    : { ...DEFAULT_ADVISOR };
  return { advisor, president };
}

const DEFAULT_GREETING: GreetingData = {
  advisor: { ...DEFAULT_ADVISOR },
  president: { ...DEFAULT_PRESIDENT },
};

export function useGreeting() {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey("greeting");
      if (res.data.length === 0) return { id: null, greeting: DEFAULT_GREETING };
      const row = res.data[0];
      let parsed: GreetingData = DEFAULT_GREETING;
      try {
        parsed = JSON.parse(row.value as string) as GreetingData;
      } catch {
        parsed = DEFAULT_GREETING;
      }
      return { id: row.id as string, greeting: parsed };
    },
    staleTime: 1000 * 60 * 5,
  });

  const raw = data?.greeting ?? DEFAULT_GREETING;
  const normalized = normalizeGreeting(raw);

  return {
    greeting: { ...raw, advisor: normalized.advisor, president: normalized.president },
    advisor: normalized.advisor,
    president: normalized.president,
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
      // 레거시 필드는 더 이상 저장하지 않음 (advisor/president만 유지)
      const normalized = normalizeGreeting(greeting);
      const cleanGreeting: GreetingData = {
        advisor: normalized.advisor,
        president: normalized.president,
      };
      const payload = { key: "greeting", value: JSON.stringify(cleanGreeting) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export { EMPTY_PERSON };

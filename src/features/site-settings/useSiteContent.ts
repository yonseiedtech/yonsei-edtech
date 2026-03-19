"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { siteSettingsApi } from "@/lib/bkend";

// ── 제네릭 site_settings CRUD ──

function useSiteSetting<T>(key: string, defaultValue: T) {
  const queryKey = ["site_settings", key];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await siteSettingsApi.getByKey(key);
      if (res.data.length === 0) return { id: null, value: defaultValue };
      const row = res.data[0];
      return { id: row.id as string, value: JSON.parse(row.value as string) as T };
    },
    staleTime: 1000 * 60 * 5,
  });

  return { value: data?.value ?? defaultValue, recordId: data?.id ?? null, isLoading };
}

function useUpdateSiteSetting<T>(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ recordId, value }: { recordId: string | null; value: T }) => {
      const payload = { key, value: JSON.stringify(value) };
      if (recordId) {
        await siteSettingsApi.update(recordId, payload);
      } else {
        await siteSettingsApi.create(payload);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site_settings", key] }),
  });
}

// ── 주임교수 ──

export interface ProfessorData {
  name: string;
  title: string;
  photo: string;
  affiliation: string;
  department: string;
  email: string;
  website: string;
  bio: string;
  research: string[];
}

const DEFAULT_PROFESSOR: ProfessorData = {
  name: "",
  title: "교수",
  photo: "",
  affiliation: "연세대학교",
  department: "교육학과 교육공학 전공",
  email: "",
  website: "",
  bio: "",
  research: [],
};

export function useProfessor() {
  return useSiteSetting<ProfessorData>("professor", DEFAULT_PROFESSOR);
}
export function useUpdateProfessor() {
  return useUpdateSiteSetting<ProfessorData>("professor");
}

// ── 학회 소개 (미션/비전/가치) ──

export interface AboutData {
  mission: string;
  vision: string;
  values: string;
  description: string;
}

const DEFAULT_ABOUT: AboutData = {
  mission: "교육공학의 이론과 실천을 연결하여, 더 나은 교육 경험을 설계하고 공유합니다.",
  vision: "에듀테크 분야의 차세대 리더를 양성하고, 교육 혁신을 선도하는 학술 커뮤니티가 됩니다.",
  values: "협력, 탐구, 혁신 — 함께 배우고, 깊이 연구하며, 새로운 가능성을 탐색합니다.",
  description: "연세교육공학회는 연세대학교에서 교육공학을 탐구하는 학술 커뮤니티입니다.",
};

export function useAbout() {
  return useSiteSetting<AboutData>("about", DEFAULT_ABOUT);
}
export function useUpdateAbout() {
  return useUpdateSiteSetting<AboutData>("about");
}

// ── 활동 분야 ──

export interface FieldItem {
  title: string;
  desc: string;
  icon: string;
}

const DEFAULT_FIELDS: FieldItem[] = [
  { title: "에듀테크", desc: "AI 교육, LMS, 교육용 앱 등 기술 기반 교육 솔루션을 탐구하고 프로토타입을 개발합니다.", icon: "Monitor" },
  { title: "교수설계", desc: "ADDIE, SAM 등 체계적인 교수-학습 설계 모형을 연구하고 실제 교육 현장에 적용합니다.", icon: "GraduationCap" },
  { title: "학습과학", desc: "인지심리학, 동기이론, 자기조절학습 등 학습의 과학적 원리를 탐구합니다.", icon: "Brain" },
  { title: "UX/UI 디자인", desc: "교육 서비스의 사용자 경험을 설계하고 학습자 중심의 인터페이스를 연구합니다.", icon: "Lightbulb" },
  { title: "학습 분석", desc: "학습 데이터를 수집·분석하여 교육 효과를 측정하고 개선 방안을 도출합니다.", icon: "BarChart3" },
  { title: "협력 학습", desc: "온·오프라인 환경에서의 협력 학습 설계와 커뮤니티 기반 학습을 연구합니다.", icon: "Users" },
];

export function useFields() {
  return useSiteSetting<FieldItem[]>("fields", DEFAULT_FIELDS);
}
export function useUpdateFields() {
  return useUpdateSiteSetting<FieldItem[]>("fields");
}

// ── 연혁 ──

export interface HistoryItem {
  year: string;
  title: string;
  desc: string;
}

const DEFAULT_HISTORY: HistoryItem[] = [
  { year: "2024", title: "학회 창립", desc: "연세대학교 교육공학 전공 학생들이 모여 학회를 설립" },
  { year: "2024", title: "첫 세미나 시리즈", desc: "AI와 교육 주제의 첫 정기 세미나 개최" },
  { year: "2025", title: "프로젝트 런칭", desc: "에듀테크 프로토타입 팀 프로젝트 시작" },
  { year: "2025", title: "회원 확대", desc: "타과 학생 참여로 학제간 교류 활성화" },
  { year: "2026", title: "홈페이지 오픈", desc: "공식 웹사이트를 통한 지식 아카이빙 시작" },
];

export function useHistory() {
  return useSiteSetting<HistoryItem[]>("history", DEFAULT_HISTORY);
}
export function useUpdateHistory() {
  return useUpdateSiteSetting<HistoryItem[]>("history");
}

// ── 문의 연락처 ──

export interface ContactInfoData {
  email: string;
  address: string;
  meetingSchedule: string;
}

const DEFAULT_CONTACT: ContactInfoData = {
  email: "yonsei.edtech@gmail.com",
  address: "서울시 서대문구 연세로 50\n연세대학교 교육과학관",
  meetingSchedule: "매주 수요일 오후 7시",
};

export function useContactInfo() {
  return useSiteSetting<ContactInfoData>("contact_info", DEFAULT_CONTACT);
}
export function useUpdateContactInfo() {
  return useUpdateSiteSetting<ContactInfoData>("contact_info");
}

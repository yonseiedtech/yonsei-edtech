/**
 * 학사 정보 최신화(academic-status) — 학기 키 헬퍼 + 캠페인 모델 + 문구 상수.
 *
 * 매 학기 재학/휴학 상태를 회원이 직접 갱신하는 기능의 순수 로직 계층.
 * - 학기 키 포맷은 semester.ts 의 currentSemesterKey 와 동일한 "YYYY-1"(전기) | "YYYY-2"(후기).
 * - 캠페인 설정은 site_settings 컬렉션 1개 문서(key = ACADEMIC_STATUS_CAMPAIGN_KEY)에 저장.
 */
import { currentSemesterKey } from "./semester";
import type { AcademicStatusEntry } from "@/types";

export interface ParsedSemesterKey {
  year: number;
  half: 1 | 2;
}

/** "2026-2" → { year: 2026, half: 2 } · 형식 불일치 시 null */
export function parseSemesterKey(key: string): ParsedSemesterKey | null {
  const m = /^(\d{4})-([12])$/.exec(key.trim());
  if (!m) return null;
  return { year: Number(m[1]), half: Number(m[2]) as 1 | 2 };
}

/** "2026-2" → "2026년 후기" (표시용) */
export function formatSemesterKey(key: string): string {
  const p = parseSemesterKey(key);
  if (!p) return key;
  return `${p.year}년 ${p.half === 1 ? "전기" : "후기"}`;
}

/** 다음 학기 키 — 전기→후기, 후기→다음해 전기 */
export function nextSemesterKey(key: string = currentSemesterKey()): string {
  const p = parseSemesterKey(key);
  if (!p) return key;
  return p.half === 1 ? `${p.year}-2` : `${p.year + 1}-1`;
}

/** 직전 학기 키 — 후기→전기, 전기→작년 후기 */
export function prevSemesterKey(key: string = currentSemesterKey()): string {
  const p = parseSemesterKey(key);
  if (!p) return key;
  return p.half === 2 ? `${p.year}-1` : `${p.year - 1}-2`;
}

/** 학기 키 내림차순 정렬 비교자(최신 학기 먼저) */
export function compareSemesterKeyDesc(a: string, b: string): number {
  const pa = parseSemesterKey(a);
  const pb = parseSemesterKey(b);
  if (!pa || !pb) return 0;
  if (pa.year !== pb.year) return pb.year - pa.year;
  return pb.half - pa.half;
}

/** 특정 학기의 상태 이력 항목 조회 */
export function getStatusForSemester(
  history: AcademicStatusEntry[] | undefined,
  semester: string,
): AcademicStatusEntry | undefined {
  return (history ?? []).find((e) => e.semester === semester);
}

/** 학기당 1건을 보장하며 이력 upsert(있으면 교체) 후 최신순 정렬 반환 */
export function upsertStatusEntry(
  history: AcademicStatusEntry[] | undefined,
  entry: AcademicStatusEntry,
): AcademicStatusEntry[] {
  const rest = (history ?? []).filter((e) => e.semester !== entry.semester);
  return [...rest, entry].sort((a, b) => compareSemesterKeyDesc(a.semester, b.semester));
}

// ── 캠페인 (site_settings) ──

export const ACADEMIC_STATUS_CAMPAIGN_KEY = "academic_status_campaign";

export interface AcademicStatusCampaign {
  /** 활성 토글 — 운영진 "지금 요청" 포함 */
  active: boolean;
  /** 회원이 최신화해야 할 대상 학기 키("2026-2") */
  targetSemester: string;
  /** 노출 시작(ISO) — 빈 문자열이면 즉시 시작 */
  startsAt: string;
  /** 노출 종료(ISO) — 빈 문자열이면 무기한 */
  endsAt: string;
}

export function defaultCampaign(): AcademicStatusCampaign {
  return {
    active: false,
    targetSemester: nextSemesterKey(),
    startsAt: "",
    endsAt: "",
  };
}

/** 현재 시각 기준 캠페인이 실제 노출 대상인지 (active + 기간 내) */
export function isCampaignLive(
  c: AcademicStatusCampaign | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!c || !c.active || !c.targetSemester) return false;
  const t = now.getTime();
  if (c.startsAt && new Date(c.startsAt).getTime() > t) return false;
  if (c.endsAt && new Date(c.endsAt).getTime() < t) return false;
  return true;
}

// ── 문구 상수 (분리) ──

export const ACADEMIC_STATUS_COPY = {
  popupTitle: "학사 정보 최신화 안내",
  /** 요구 문구 반영 — 대상 학기 라벨 병기 */
  popupBody: (targetSemester: string) =>
    `다음 학기(${formatSemesterKey(targetSemester)}) 학사 정보 최신화를 해주시기 바랍니다.`,
  popupHint: "마이페이지에서 재학/휴학 등 학사 상태를 1분 안에 등록할 수 있습니다.",
  ctaLabel: "지금 최신화하기",
  laterLabel: "나중에",
  pageTitle: "학사 정보 최신화",
  pageDescription: "매 학기 재학·휴학 등 학사 상태를 직접 등록·수정합니다.",
} as const;

/** 마이페이지 학사정보 입력 경로 */
export const ACADEMIC_STATUS_PATH = "/mypage/academic-status";

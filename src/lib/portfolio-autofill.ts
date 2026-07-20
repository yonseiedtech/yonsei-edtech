/**
 * portfolio-autofill.ts — 포트폴리오 자동 적재 (백로그 v3 G3, M2-v12 커버리지 확장)
 *
 * 회원이 쌓아온 활동 신호를 조회 결과로부터
 * "포트폴리오 항목 후보(유형·제목·역할·날짜·출처 링크)"로 정규화하는 순수 함수 모음.
 *
 * 설계 원칙:
 *  - I/O 없는 순수 함수 — 이미 조회된 배열만 입력받아 후보를 계산한다(테스트·재사용 용이).
 *  - 대상 컬렉션은 기존 external_activities 하나로 통일한다(유형·역할·날짜·출처링크·검증 필드가
 *    후보 정규화 스키마와 정확히 일치). 새 컬렉션·새 firestore.rules 규칙을 만들지 않는다.
 *  - 멱등: 각 후보는 안정적 `sourceRef`(출처 id) 를 가지며, 이미 적재된 항목(autoSourceRef 일치)
 *    또는 제목+날짜가 동일한 기존 항목은 `alreadyAdded=true` 로 표시해 재적재를 막는다.
 *  - 이미 다른 경로로 포트폴리오에 자동 노출되는 소스(활동 참여 이력·수료증 집계)는 중복·오귀인을
 *    피하기 위해 여기서 후보로 만들지 않는다(리포트 참조).
 *
 * v12-M2 확장 소스:
 *  - receivedKudos (멘토링 context) → "멘토링 기여 인정" 대외활동 1건 (집계)
 *  - hackathonSubmissions (ownerId 일치) → 해커톤 참가 1건/제출건
 */

import { isSeminarHost } from "@/lib/host-helpers";
import { DEFAULT_EXTERNAL_AFFILIATION } from "@/types";
import type {
  ExternalActivity,
  ExternalActivityType,
  Kudos,
  HackathonSubmission,
  RecentPaper,
  Seminar,
} from "@/types";

export type AutofillSourceKind =
  | "seminar"
  | "publication"
  | "kudos_mentoring"
  | "hackathon_submission";

/** 정규화된 포트폴리오 후보 — external_activities 로 적재 가능한 형태 */
export interface PortfolioCandidate {
  /** 출처 기반 멱등 키 (예: "seminar:{id}", "paper:{정규화제목}") */
  sourceRef: string;
  sourceKind: AutofillSourceKind;
  sourceKindLabel: string;
  title: string;
  type: ExternalActivityType;
  organization?: string;
  role?: string;
  /** YYYY-MM-DD */
  date: string;
  url?: string;
  description?: string;
  /** 이미 포트폴리오에 존재 → UI에서 "추가됨" 표시, 선택 불가 */
  alreadyAdded: boolean;
}

export interface AutofillInput {
  userId: string;
  /** 전체 세미나 목록(호스트 여부는 내부에서 필터) */
  seminars: Seminar[];
  /** 회원 프로필 대표 논문 (user.recentPapers) */
  recentPapers: RecentPaper[];
  /** 기존 external_activities — 중복 제거 기준 */
  existingExternals: ExternalActivity[];
  /**
   * v12-M2: 내가 받은 kudos 목록 (kudosApi.listReceivedByUser).
   * mentoring context 만 집계해 "멘토링 기여 인정" 1건으로 후보화한다.
   */
  receivedKudos?: Kudos[];
  /**
   * v12-M2: 해커톤 회차 전체 제출 목록 (hackathonSubmissionsApi.listByContext).
   * ownerId === userId 인 건만 필터해 후보화한다.
   */
  hackathonSubmissions?: HackathonSubmission[];
}

function normalizeTitle(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function fmtDate(d?: string): string {
  return d ? d.slice(0, 10) : "";
}

interface ExistingIndex {
  refs: Set<string>;
  titleDate: Set<string>;
}

function buildExistingIndex(existing: ExternalActivity[]): ExistingIndex {
  const refs = new Set<string>();
  const titleDate = new Set<string>();
  for (const e of existing) {
    if (e.autoSourceRef) refs.add(e.autoSourceRef);
    titleDate.add(`${normalizeTitle(e.title ?? "")}__${fmtDate(e.date)}`);
  }
  return { refs, titleDate };
}

function isAlready(idx: ExistingIndex, sourceRef: string, title: string, date: string): boolean {
  if (idx.refs.has(sourceRef)) return true;
  return idx.titleDate.has(`${normalizeTitle(title)}__${date}`);
}

/**
 * 세미나·대표 논문 → 포트폴리오 후보 목록.
 * 미적재 항목을 앞에, 그 안에서 날짜 내림차순으로 정렬한다.
 */
export function buildPortfolioCandidates(input: AutofillInput): PortfolioCandidate[] {
  const { userId, seminars, recentPapers, existingExternals, receivedKudos, hackathonSubmissions } = input;
  const idx = buildExistingIndex(existingExternals);
  const out: PortfolioCandidate[] = [];
  const seen = new Set<string>();

  // 1. 세미나 발표 — 연사/호스트로 지정된 세미나
  for (const s of seminars) {
    if (!isSeminarHost(s, userId)) continue;
    const sourceRef = `seminar:${s.id}`;
    if (seen.has(sourceRef)) continue;
    seen.add(sourceRef);
    const title = s.title?.trim() || "세미나 발표";
    const date = fmtDate(s.date);
    const desc = s.description?.trim();
    out.push({
      sourceRef,
      sourceKind: "seminar",
      sourceKindLabel: "세미나 발표",
      title,
      type: "conference",
      organization: "연세교육공학회",
      role: "발표자",
      date,
      url: `/seminars/${s.id}`,
      description: desc ? desc.slice(0, 200) : undefined,
      alreadyAdded: isAlready(idx, sourceRef, title, date),
    });
  }

  // 2. 연구 논문 — 프로필 대표 논문(user.recentPapers)
  for (const p of recentPapers) {
    const title = p.title?.trim();
    if (!title) continue;
    const sourceRef = `paper:${normalizeTitle(title)}`;
    if (seen.has(sourceRef)) continue;
    seen.add(sourceRef);
    const date = p.year ? `${p.year}-01-01` : "";
    const authors = p.authors?.trim();
    out.push({
      sourceRef,
      sourceKind: "publication",
      sourceKindLabel: "연구 논문",
      title,
      type: "publication",
      role: "저자",
      date,
      url: p.url?.trim() || undefined,
      description: authors ? `저자: ${authors}` : undefined,
      alreadyAdded: isAlready(idx, sourceRef, title, date),
    });
  }

  // 3. v12-M2: 멘토링 기여 인정 — mentoring context kudos 수신 집계
  //    "cohort" 등 일반 응원은 포트폴리오 항목으로 부적합 → mentoring context만 처리.
  //    여러 주에 걸친 멘토링 인정을 1건으로 집계(멱등 sourceRef).
  const mentoringKudos = (receivedKudos ?? []).filter((k) => k.context === "mentoring");
  if (mentoringKudos.length > 0) {
    const sourceRef = "kudos:received:mentoring";
    if (!seen.has(sourceRef)) {
      seen.add(sourceRef);
      const title = "멘토링 기여 인정";
      // 가장 최근 weekKey 를 대표 날짜로 사용
      const latestWeek = mentoringKudos
        .map((k) => k.weekKey)
        .sort()
        .at(-1) ?? "";
      out.push({
        sourceRef,
        sourceKind: "kudos_mentoring",
        sourceKindLabel: "멘토링 기여",
        title,
        type: "community",
        organization: "연세교육공학회",
        role: "멘토",
        date: latestWeek,
        description: `멘토링 답변 채택 응원 ${mentoringKudos.length}건 수신`,
        alreadyAdded: isAlready(idx, sourceRef, title, latestWeek),
      });
    }
  }

  // 4. v12-M2: 해커톤 참가 — ownerId(팀 대표 제출자) 일치 건만 후보화
  for (const sub of (hackathonSubmissions ?? [])) {
    if (sub.ownerId !== userId) continue;
    const sourceRef = `hackathon:submission:${sub.id}`;
    if (seen.has(sourceRef)) continue;
    seen.add(sourceRef);
    const teamPart = sub.teamName ? `[${sub.teamName}] ` : "";
    const title = `${teamPart}${sub.title}`;
    // 산출물 링크: 발표자료 > 데모 > 저장소 우선순위
    const url = sub.presentationUrl || sub.demoUrl || sub.repoUrl;
    // 행사 날짜(제출일 기준, 없으면 contextId에서 추출 시도)
    const date =
      sub.createdAt?.slice(0, 10) ||
      sub.contextId?.replace("hackathon-", "").slice(0, 10) ||
      "";
    out.push({
      sourceRef,
      sourceKind: "hackathon_submission",
      sourceKindLabel: "해커톤 참가",
      title,
      type: "conference",
      organization: "연세교육공학회",
      role: "팀 대표",
      date,
      url,
      description: sub.description ? sub.description.slice(0, 200) : undefined,
      alreadyAdded: isAlready(idx, sourceRef, title, date),
    });
  }

  return out.sort((a, b) => {
    if (a.alreadyAdded !== b.alreadyAdded) return a.alreadyAdded ? 1 : -1;
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
}

/** 후보 → external_activities create 페이로드 (undefined 필드는 생략) */
export function candidateToExternalPayload(
  c: PortfolioCandidate,
  userId: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    userId,
    title: c.title,
    type: c.type,
    affiliation: DEFAULT_EXTERNAL_AFFILIATION,
    date: c.date || new Date().toISOString().slice(0, 10),
    verified: false,
    autoSourceRef: c.sourceRef,
  };
  if (c.organization) payload.organization = c.organization;
  if (c.role) payload.role = c.role;
  if (c.url) payload.url = c.url;
  if (c.description) payload.description = c.description;
  return payload;
}

// ── M5: 콘텐츠 자동 초안 생성 (deterministic, no-AI) ──
// 세미나/활동 데이터 → 카드뉴스·뉴스레터·안내문/후기 초안 필드 매핑.
// 모든 함수는 순수 함수이며 외부 호출/부수효과가 없다. 운영진 검수·편집 전제(자동 발행 금지).

import type { Seminar, SeminarSpeaker } from "@/types";
import type { CardSpec } from "@/features/card-news/types";
import type { NewsletterSection } from "@/features/newsletter/newsletter-store";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** "2026-06-20" → "2026년 6월 20일(금)" (유효하지 않으면 원문 반환) */
export function formatKoreanDate(dateStr?: string): string {
  if (!dateStr) return "추후 안내";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

/** 단일/다중 연사 필드를 정규화해 표시용 연사 목록을 만든다 (하위호환 마이그레이션). */
export function resolveSpeakers(seminar: Seminar): SeminarSpeaker[] {
  if (seminar.speakers && seminar.speakers.length > 0) {
    return seminar.speakers;
  }
  if (seminar.speaker && seminar.speaker.trim()) {
    return [
      {
        type: seminar.speakerType ?? "guest",
        name: seminar.speaker,
        bio: seminar.speakerBio,
        affiliation: seminar.speakerAffiliation,
        position: seminar.speakerPosition,
        photoUrl: seminar.speakerPhotoUrl,
      },
    ];
  }
  return [];
}

/** 연사 표기 문자열: "홍길동(연세대 교수), 김철수" */
export function formatSpeakerLine(speakers: SeminarSpeaker[]): string {
  if (speakers.length === 0) return "추후 안내";
  return speakers
    .map((s) => {
      const meta = [s.affiliation, s.position].filter(Boolean).join(" ");
      return meta ? `${s.name}(${meta})` : s.name;
    })
    .join(", ");
}

/** 장소 표기: 온라인/오프라인/미정 처리 */
export function formatLocation(seminar: Seminar): string {
  if (seminar.location && seminar.location.trim()) return seminar.location;
  if (seminar.isOnline) return seminar.onlineUrl ? `온라인 (${seminar.onlineUrl})` : "온라인 (링크 별도 안내)";
  return "추후 안내";
}

function dateTimeLine(seminar: Seminar): string {
  const date = formatKoreanDate(seminar.date);
  return seminar.time ? `${date} ${seminar.time}` : date;
}

const SIGNATURE = "연세교육공학회 드림";

// ── 초안 보강 자료 (세미나 종료 후 집계·후기) ──
// cron이 세미나 completed 전환 시 seminar_reviews·attendeeIds에서 계산해 전달한다.
// 값이 없으면(수동 사전 초안 등) 기존 결정적 초안과 동일하게 동작한다(하위호환).
export interface DraftExtras {
  stats?: {
    attendeeCount?: number;
    reviewCount?: number;
    avgRating?: number;
  };
  /** 참석자 후기 인용문 (짧게 정제된 발췌). 최대 3개 사용. */
  reviewQuotes?: string[];
}

/** "12명 참석 · 후기 5건 · 평점 4.6" 형태의 통계 요약 라인 (자료 없으면 빈 문자열) */
export function formatStatsLine(extras?: DraftExtras): string {
  const s = extras?.stats;
  if (!s) return "";
  const parts: string[] = [];
  if (typeof s.attendeeCount === "number" && s.attendeeCount > 0) parts.push(`${s.attendeeCount}명 참석`);
  if (typeof s.reviewCount === "number" && s.reviewCount > 0) parts.push(`후기 ${s.reviewCount}건`);
  if (typeof s.avgRating === "number" && s.avgRating > 0) parts.push(`평점 ${s.avgRating.toFixed(1)}`);
  return parts.join(" · ");
}

function cleanQuote(text: string, max = 90): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}

// ── 1. 세미나 안내문 초안 ──

/** 세미나 데이터 → 사전 안내문 초안 텍스트. 운영진이 편집 후 발행. */
export function buildSeminarNoticeDraft(seminar: Seminar): string {
  const speakers = resolveSpeakers(seminar);
  const lines: string[] = [
    `[연세교육공학회 세미나 안내] ${seminar.title}`,
    "",
    "안녕하세요, 연세대학교 교육대학원 교육공학전공 연세교육공학회입니다.",
    "",
    "아래와 같이 세미나를 개최하오니 관심 있는 분들의 많은 참여 바랍니다.",
    "",
    "■ 세미나 개요",
    `• 주제: ${seminar.title}`,
    `• 일시: ${dateTimeLine(seminar)}`,
    `• 장소: ${formatLocation(seminar)}`,
  ];

  if (speakers.length > 0) {
    lines.push(`• 연사: ${formatSpeakerLine(speakers)}`);
  }
  if (typeof seminar.maxAttendees === "number" && seminar.maxAttendees > 0) {
    lines.push(`• 정원: 선착순 ${seminar.maxAttendees}명`);
  }

  if (seminar.description && seminar.description.trim()) {
    lines.push("", "■ 세미나 소개", seminar.description.trim());
  }

  const firstSpeakerBio = speakers.find((s) => s.bio && s.bio.trim())?.bio;
  if (firstSpeakerBio) {
    lines.push("", "■ 연사 소개", firstSpeakerBio.trim());
  }

  lines.push(
    "",
    "■ 신청 방법",
    seminar.registrationUrl
      ? `• 신청 링크: ${seminar.registrationUrl}`
      : `• 학회 홈페이지 세미나 페이지에서 신청해 주세요.`,
    `• 신청 페이지: https://yonsei-edtech.vercel.app/seminars/${seminar.id}`,
    "",
    "많은 관심과 참여 부탁드립니다.",
    SIGNATURE,
  );

  return lines.join("\n");
}

// ── 2. 세미나 후기 초안 ──

/** 세미나 데이터 → 종료 후 후기/리뷰 초안 텍스트. 운영진이 편집 후 발행. */
export function buildSeminarReviewDraft(seminar: Seminar): string {
  const speakers = resolveSpeakers(seminar);
  const speakerLine = speakers.length > 0 ? formatSpeakerLine(speakers) : "";

  const lines: string[] = [
    `[세미나 후기] ${seminar.title}`,
    "",
    `지난 ${formatKoreanDate(seminar.date)}, 연세교육공학회는 「${seminar.title}」 세미나를 ${formatLocation(seminar)}에서 성황리에 개최하였습니다.`,
  ];

  if (speakerLine) {
    lines.push(
      "",
      `이번 세미나에서는 ${speakerLine}께서 깊이 있는 발표를 진행해 주셨습니다.`,
    );
  }

  if (seminar.description && seminar.description.trim()) {
    lines.push("", seminar.description.trim());
  }

  lines.push(
    "",
    "참석해 주신 모든 분들께 감사드리며, 세미나에서 나눈 논의가 각자의 연구와 실천에 의미 있는 발판이 되기를 바랍니다.",
    "",
    "앞으로도 연세교육공학회는 교육공학 분야의 학술 교류를 위한 다양한 세미나를 이어가겠습니다. 많은 관심 부탁드립니다.",
    "",
    SIGNATURE,
  );

  return lines.join("\n");
}

// ── 3. 카드뉴스 슬라이드 카피 초안 ──

function takeBullets(text: string | undefined, max = 3): string[] {
  if (!text) return [];
  return text
    .split(/[\n。.·•\-]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4)
    .slice(0, max);
}

/**
 * 세미나 데이터 → 카드뉴스 슬라이드(CardSpec[]) 초안.
 * 표지 → 인트로(개요) → 연사 소개(연사가 있으면) → 신청 안내 CTA.
 * 반환된 카드의 id는 호출부에서 시리즈 내 고유성을 보장해야 한다.
 */
export function buildCardNewsDraft(seminar: Seminar, extras?: DraftExtras): CardSpec[] {
  const speakers = resolveSpeakers(seminar);
  const isCompleted = seminar.status === "completed";
  const statsLine = formatStatsLine(extras);
  const quotes = (extras?.reviewQuotes ?? []).map((q) => cleanQuote(q)).filter(Boolean).slice(0, 3);
  const cards: CardSpec[] = [];

  // 표지 — 종료 세미나면 "현장 스케치" 톤
  cards.push({
    id: "draft-01-cover",
    kind: "cover",
    title: seminar.title,
    badge: isCompleted ? `${formatKoreanDate(seminar.date)} 현장 스케치` : formatKoreanDate(seminar.date),
    body: dateTimeLine(seminar),
    english: "Yonsei Educational Technology Seminar",
  });

  // 인트로 (개요 불릿) — 종료 세미나면 참석/후기 통계 슬롯 추가
  const introBullets = [
    `일시 · ${dateTimeLine(seminar)}`,
    `장소 · ${formatLocation(seminar)}`,
  ];
  if (speakers.length > 0) introBullets.push(`연사 · ${formatSpeakerLine(speakers)}`);
  if (statsLine) introBullets.push(`성과 · ${statsLine}`);
  cards.push({
    id: "draft-02-intro",
    kind: "intro",
    title: isCompleted ? "세미나 돌아보기" : "세미나 개요",
    badge: "About",
    body: seminar.description?.trim() || "연세교육공학회가 준비한 학술 세미나입니다.",
    bullets: introBullets,
  });

  // 연사 소개 (있을 때만)
  if (speakers.length > 0) {
    const lead = speakers[0];
    const bullets =
      takeBullets(lead.bio, 3).length > 0
        ? takeBullets(lead.bio, 3)
        : speakers.map((s) => formatSpeakerLine([s])).slice(0, 3);
    cards.push({
      id: "draft-03-speaker",
      kind: "feature",
      title: "연사 소개",
      subtitle: "Speaker",
      badge: "연사",
      bullets,
    });
  }

  // 참석자 후기 카드 (후기 인용이 있을 때만) — 종료 세미나 자동 초안의 핵심 보강
  if (quotes.length > 0) {
    cards.push({
      id: "draft-04-reviews",
      kind: "feature",
      title: "참석자 후기",
      subtitle: "Voices",
      badge: "후기",
      bullets: quotes.map((q) => `“${q}”`),
    });
  }

  // 마무리 CTA — 종료 세미나면 다음 세미나 안내 톤
  cards.push({
    id: "draft-05-cta",
    kind: "cta",
    title: isCompleted ? "다음 세미나에서\n만나요.": "지금\n신청하세요.",
    badge: isCompleted ? "See you" : "Join us",
    body: seminar.registrationUrl || `yonsei-edtech.vercel.app/seminars/${seminar.id}`,
    english: isCompleted
      ? "학회 홈페이지에서 지난 세미나 자료와 다음 일정을 확인하세요."
      : "학회 홈페이지에서 간편하게 신청할 수 있습니다.",
  });

  return cards;
}

// ── 4. 뉴스레터 섹션 초안 ──

/**
 * 세미나 데이터 → 뉴스레터 섹션(NewsletterSection[]) 초안.
 * 섹션 id는 임시(`draft-...`)이며 호출부에서 order를 재정렬할 수 있다.
 */
export function buildNewsletterSectionsDraft(
  seminar: Seminar,
  baseOrder = 1,
  extras?: DraftExtras,
): NewsletterSection[] {
  const speakers = resolveSpeakers(seminar);
  const statsLine = formatStatsLine(extras);
  const quotes = (extras?.reviewQuotes ?? []).map((q) => cleanQuote(q, 140)).filter(Boolean).slice(0, 3);
  const stamp = Date.now();
  const sections: NewsletterSection[] = [];
  let order = baseOrder;

  // 소식 섹션: 세미나 개요 (+ 종료 시 성과 요약)
  const newsLines = [
    `일시: ${dateTimeLine(seminar)}`,
    `장소: ${formatLocation(seminar)}`,
  ];
  if (speakers.length > 0) newsLines.push(`연사: ${formatSpeakerLine(speakers)}`);
  if (statsLine) newsLines.push(`성과: ${statsLine}`);
  if (seminar.description && seminar.description.trim()) {
    newsLines.push("", seminar.description.trim());
  }
  sections.push({
    id: `draft-${stamp}-news`,
    postId: undefined as unknown as string,
    title: seminar.title,
    content: newsLines.join("\n"),
    authorName: "편집팀",
    authorType: "staff",
    authorEnrollment: "",
    type: "news",
    order: order++,
  });

  // 특집 섹션: 후기 초안 (편집용 시드)
  sections.push({
    id: `draft-${stamp}-review`,
    postId: undefined as unknown as string,
    title: `[후기] ${seminar.title}`,
    content: buildSeminarReviewDraft(seminar),
    authorName: "편집팀",
    authorType: "staff",
    authorEnrollment: "",
    type: "feature",
    order: order++,
  });

  // 리뷰 섹션: 실제 참석자 후기 인용 (있을 때만) — 자동 초안의 핵심 보강
  if (quotes.length > 0) {
    const quoteBlock = quotes.map((q) => `“${q}”`).join("\n\n");
    sections.push({
      id: `draft-${stamp}-voices`,
      postId: undefined as unknown as string,
      title: "참석자 한마디",
      content: `${quoteBlock}\n\n(참석자 후기에서 발췌 — 게재 전 동의·표기를 확인하세요.)`,
      authorName: "편집팀",
      authorType: "staff",
      authorEnrollment: "",
      type: "review",
      order: order++,
    });
  }

  return sections;
}

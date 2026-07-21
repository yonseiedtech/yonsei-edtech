"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  CheckSquare,
  Bell,
  Archive,
  Trophy,
  ArrowRight,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Compass,
  GraduationCap,
  Quote,
  BarChart3,
  Microscope,
  BookMarked,
  Network,
  Palette,
  Target,
  Wand2,
  Radio,
  Heart,
  Users,
  Zap,
} from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WHATS_NEW_DISMISSED_KEY, NEW_THRESHOLD_DAYS, FEATURE_DATES } from "@/lib/whats-new-meta";

/** v12-M6: 공유 상수 재사용 — SemesterKickoffBanner와 키·임계값 동기화 */
const WHATS_NEW_KEY = WHATS_NEW_DISMISSED_KEY;

interface Feature {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge: string;
  badgeVariant?: "default" | "secondary" | "outline";
  title: string;
  description: string;
  highlights: string[];
  cta: string;
  ctaHref: string;
  color: string;
  iconBg: string;
  iconColor: string;
  /** ISO 날짜 (YYYY-MM-DD) — 자동 정렬·NEW 배지 만료 기준 */
  addedAt: string;
}

function isNew(addedAt: string): boolean {
  const diffDays = (Date.now() - new Date(addedAt).getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= NEW_THRESHOLD_DAYS;
}

const FEATURES: Feature[] = [
  // ── 2026-07-21 ────────────────────────────────────────────────
  {
    id: "curriculum-wizard",
    addedAt: FEATURE_DATES["curriculum-wizard"],
    icon: Wand2,
    badge: "스터디",
    badgeVariant: "default",
    title: "스터디 교수설계 마법사 — ADDIE·Gagne 기반 커리큘럼 자동 설계",
    description:
      "스터디 모임장이 학습 목표 유형과 회차 수를 입력하면 ADDIE·Gagne 9이벤트·Bloom 목표 분류 기반으로 회차별 목표·활동·평가 방법이 자동 생성됩니다. 생성 후 회차별 수동 편집도 지원합니다.",
    highlights: [
      "학습 목표 유형(지식·기술·태도) → Bloom 분류 자동 적용",
      "회차별 목표·주요 활동·평가 방법 자동 스캐폴딩",
      "목표 달성 여부 체크(curriculumGoalCheck) — 스터디 진행 중 추적",
    ],
    cta: "스터디 커리큘럼 설계하기",
    ctaHref: "/activities/studies",
    color: "from-violet-500/10 to-transparent",
    iconBg: "bg-cat-5/10",
    iconColor: "text-cat-5",
  },
  // ── 2026-07-17 ────────────────────────────────────────────────
  {
    id: "newcomer-onboarding",
    addedAt: FEATURE_DATES["newcomer-onboarding"],
    icon: Users,
    badge: "온보딩",
    badgeVariant: "default",
    title: "신입 온보딩 강화 — 첫 2주 단계별 가이드",
    description:
      "신입 회원 대시보드에 첫 2주 동안 단계별 온보딩 진행 위젯이 표시됩니다. 퀵링크로 주요 기능을 빠르게 찾고, 진행도에 따라 다음 추천 액션이 제안됩니다.",
    highlights: [
      "신입 전용 2주 온보딩 시퀀스 위젯",
      "퀵링크 단계별 노출 — 진행도에 맞춰 확장",
      "완료 시 마일스톤 배지 자동 부여",
    ],
    cta: "대시보드 확인하기",
    ctaHref: "/dashboard",
    color: "from-green-500/10 to-transparent",
    iconBg: "bg-success/10",
    iconColor: "text-success",
  },
  // ── 2026-07-16 ────────────────────────────────────────────────
  {
    id: "seminar-live",
    addedAt: FEATURE_DATES["seminar-live"],
    icon: Radio,
    badge: "세미나",
    badgeVariant: "default",
    title: "세미나 라이브 — 실시간 PDF 장표·Q&A·설문",
    description:
      "세미나 진행 중 실시간으로 PDF 장표를 공유하고 참석자 Q&A·설문을 진행할 수 있습니다. onSnapshot 기반 실시간 동기화로 발표자가 넘기는 장표를 참석자 화면과 즉시 동기화합니다.",
    highlights: [
      "PDF 장표 실시간 공유·페이지 동기화",
      "참석자 실시간 Q&A 수집 + 강의 노트 작성",
      "세미나 종료 후 Q&A·설문 결과 아카이빙",
    ],
    cta: "세미나 목록 보기",
    ctaHref: "/seminars",
    color: "from-rose-500/10 to-transparent",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  // ── 2026-07-10 ────────────────────────────────────────────────
  {
    id: "hackathon-2026",
    addedAt: FEATURE_DATES["hackathon-2026"],
    icon: Zap,
    badge: "행사",
    badgeVariant: "default",
    title: "에듀테크 해커톤 2026 — 8월 22일 개최",
    description:
      "교육공학 기반 에듀테크 솔루션을 설계·개발하는 대내 해커톤입니다. 팀 구성부터 아이디어 제출, 현장 심사까지 플랫폼 내에서 통합 관리되며 D-day 당일 운영 콘솔을 지원합니다.",
    highlights: [
      "팀 신청·합류·관리 원스톱 (팀 형성 현황 실시간 확인)",
      "아이디어 제출 및 심사 현황 실시간 조회",
      "D-day 체크리스트 + 단계 전환 현장 운영 콘솔",
    ],
    cta: "해커톤 참여하기",
    ctaHref: "/hackathon",
    color: "from-amber-500/10 to-transparent",
    iconBg: "bg-amber-100 dark:bg-amber-950/40",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  // ── 2026-06-15 ────────────────────────────────────────────────
  {
    id: "kudos-recognition",
    addedAt: FEATURE_DATES["kudos-recognition"],
    icon: Heart,
    badge: "커뮤니티",
    badgeVariant: "default",
    title: "동료 인정 보내기(Kudos) — 한 주의 학습에 응원을",
    description:
      "이번 주 학습을 이어간 동기에게 인정과 응원을 보낼 수 있습니다. 주 1회 전송, 양성 메시지만 허용하며 순위 없이 운영되어 건강한 커뮤니티 문화를 지향합니다.",
    highlights: [
      "동기·스터디원에게 주 1회 응원 메시지 전송",
      "받은 kudos는 대시보드·마이페이지에서 확인",
      "순위 없음·양성 메시지만 — 부담 없는 인정 루프",
    ],
    cta: "대시보드에서 보내기",
    ctaHref: "/dashboard",
    color: "from-pink-500/10 to-transparent",
    iconBg: "bg-pink-100 dark:bg-pink-950/40",
    iconColor: "text-pink-600 dark:text-pink-400",
  },
  // ── 2026-06-12 ────────────────────────────────────────────────
  {
    id: "reading-apa-doi",
    addedAt: FEATURE_DATES["reading-apa-doi"],
    icon: Quote,
    badge: "논문 읽기",
    badgeVariant: "secondary",
    title: "DOI 자동 채움 · APA 인용 복사",
    description:
      "논문 등록 시 DOI만 입력하면 제목·저자·연도·저널 정보가 자동으로 채워지고, 분석 노트 카드에서 APA 7 인용을 바로 복사하거나 현재 목록 전체를 참고문헌으로 내보낼 수 있습니다.",
    highlights: [
      "DOI '자동 채움' — Crossref 서지정보, 빈 칸만 채움",
      "카드 hover 'APA 인용 복사' 원클릭",
      "'APA 내보내기' — 필터 결과를 가나다순 참고문헌으로",
    ],
    cta: "논문 읽기 노트 열기",
    ctaHref: "/mypage/research?tab=reading",
    color: "from-emerald-50 to-emerald-100/60 dark:from-emerald-950/30 dark:to-emerald-950/30",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    id: "scholar-seminal-works",
    addedAt: FEATURE_DATES["scholar-seminal-works"],
    icon: GraduationCap,
    badge: "아카이브",
    badgeVariant: "outline",
    title: "이론 개념마다 대표 학자와 원전 링크",
    description:
      "인지부하·자기효능감·TPACK 등 26개 이론 개념에 대표 학자와 원전(seminal work)을 연결했습니다. 모든 링크는 검증을 거쳤으며, 무료 공개 원문은 배지로 표시됩니다.",
    highlights: [
      "대표 학자 칩 + 원전 서지·링크 (DOI/무료 공개 구분)",
      "Sweller 1988 · Bandura 1977 · Wing 2006 등 고전 원문 연결",
      "개념 → 변인 → 측정도구 → 졸업생 논문으로 이어지는 학습 동선",
    ],
    cta: "아카이브 개념 보기",
    ctaHref: "/archive/concept",
    color: "from-indigo-50 to-indigo-100/60 dark:from-indigo-950/30 dark:to-indigo-950/30",
    iconBg: "bg-indigo-100/80 dark:bg-indigo-950/40",
    iconColor: "text-indigo-700 dark:text-indigo-400",
  },
  {
    id: "research-design-profile",
    addedAt: FEATURE_DATES["research-design-profile"],
    icon: BarChart3,
    badge: "연구 분석",
    badgeVariant: "outline",
    title: "졸업생 논문 연구 설계 프로파일",
    description:
      "졸업생 학위논문의 제목·초록에서 연구대상·변인·통계방법·연구방법을 자동 추출해 구조화했습니다. 선배들이 어떤 설계와 통계로 연구했는지 경향을 보고, 클릭 한 번으로 해당 방법의 가이드로 이동하세요.",
    highlights: [
      "논문 상세 '연구 분석 프로필' — 대상·독립/종속 변인·방법 칩",
      "/research 통계방법 Top 10 · 연구방법 분포 차트",
      "막대 클릭 → 아카이브 가이드(가정·절차·보고 문장)로 연결",
    ],
    cta: "연구 동향 분석 열기",
    ctaHref: "/research",
    color: "from-violet-50 to-violet-100/60 dark:from-violet-950/30 dark:to-violet-950/30",
    iconBg: "bg-violet-100/80 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-400",
  },
  // ── 2026-06-03 ────────────────────────────────────────────────
  {
    id: "research-journey-v2",
    addedAt: FEATURE_DATES["research-journey-v2"],
    icon: Microscope,
    badge: "연구 여정",
    badgeVariant: "outline",
    title: "연구 여정 대개편 — 보고서가 계획서·논문까지 흘러갑니다",
    description:
      "주제 탐색부터 심사 대응까지 7단계 지도로 통합됐고, 보고서의 문제·이론·선행연구·학습자·환경 분석이 계획서와 논문 초안으로 자동 이관됩니다. 논문 에디터에는 용어의 정의·연구 절차·연구 윤리 절, 목차 자동 생성, 표 만들기 팝업, APA7 참고문헌 자동 정렬이 추가됐어요.",
    highlights: [
      "'보고서에서 가져오기' 한 번으로 서론·이론적 배경·연구 방법 초안 완성",
      "연구윤리 체크리스트(동의·IRB·개인정보) + 보고 문형 삽입",
      "목차·표 목차 자동 생성, 참고문헌 APA 7판 자동 정렬",
    ],
    cta: "논문 에디터 열기",
    ctaHref: "/mypage/research?tab=writing",
    color: "from-indigo-50 to-indigo-100/60 dark:from-indigo-950/30 dark:to-indigo-950/30",
    iconBg: "bg-indigo-100/80 dark:bg-indigo-950/40",
    iconColor: "text-indigo-700 dark:text-indigo-400",
  },
  {
    id: "literature-matrix",
    addedAt: FEATURE_DATES["literature-matrix"],
    icon: BookMarked,
    badge: "문헌 고찰",
    badgeVariant: "outline",
    title: "문헌 리뷰 매트릭스 — 읽은 논문이 비교표가 됩니다",
    description:
      "논문 읽기 탭에서 읽은 논문을 대상·설계·결과·시사점 열로 정리하는 비교표 편집기. 열 선택·정렬(저자/연도/완성도)·CSV 내보내기를 지원하고, 완성된 표는 보고서·논문에 클릭 한 번으로 삽입됩니다.",
    highlights: [
      "셀 자동 저장 — 논문 상세 분석 필드와 동기화",
      "Excel 호환 CSV 내려받기",
      "심사 단골 요구 '선행연구 비교표' 원클릭 삽입",
    ],
    cta: "문헌 매트릭스 열기",
    ctaHref: "/mypage/research?tab=reading",
    color: "from-emerald-50 to-emerald-100/60 dark:from-emerald-950/30 dark:to-emerald-950/30",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-950/40",
    iconColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    id: "research-model-wizard",
    addedAt: FEATURE_DATES["research-model-wizard"],
    icon: Network,
    badge: "연구 모형",
    badgeVariant: "outline",
    title: "연구모형 마법사 — 변인 이름만 넣으면 모형이 그려집니다",
    description:
      "독립·종속·매개·조절·통제 변인 이름만 입력하면 표준 배치와 관계선까지 자동 생성. 매개·조절·조절된 매개 등 대표 모형 5종 템플릿도 제공합니다.",
    highlights: [
      "질문 5개로 모형 자동 생성",
      "템플릿 5종 — 이름만 바꾸면 완성",
      "보고서·계획서 변인과 양방향 동기화",
    ],
    cta: "연구 모형 그리기",
    ctaHref: "/research-model",
    color: "from-sky-50 to-sky-100/60 dark:from-sky-950/30 dark:to-sky-950/30",
    iconBg: "bg-sky-100/80 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-400",
  },
  {
    id: "design-studio",
    addedAt: FEATURE_DATES["design-studio"],
    icon: Palette,
    badge: "콘텐츠",
    badgeVariant: "outline",
    title: "디자인 스튜디오 — 카드뉴스·포스터·발표 슬라이드 제작",
    description:
      "Canva 스타일 자유 캔버스에서 텍스트·도형·이미지를 배치하고 PNG·PDF·PPT로 내보냅니다. 세미나·스터디 활동과 연계해 소개 자료를 바로 만들 수 있어요.",
    highlights: [
      "실행 취소/다시 실행·요소 잠금",
      "PNG/ZIP/PDF/PPT 내보내기",
      "활동 연계 자동 채우기",
    ],
    cta: "스튜디오 열기",
    ctaHref: "/studio",
    color: "from-violet-50 to-violet-100/60 dark:from-violet-950/30 dark:to-violet-950/30",
    iconBg: "bg-violet-100/80 dark:bg-violet-950/40",
    iconColor: "text-violet-700 dark:text-violet-400",
  },
  {
    id: "finders",
    addedAt: FEATURE_DATES["finders"],
    icon: Target,
    badge: "아카이브",
    badgeVariant: "outline",
    title: "통계·연구방법 파인더 — 몇 가지 질문으로 방법 추천",
    description:
      "무엇을 비교하는지, 집단이 몇 개인지 같은 질문에 답하면 적합한 통계방법(비모수 포함)과 연구방법(질적·혼합 포함)을 추천하고 선배 논문 사례까지 연결합니다.",
    highlights: [
      "반복측정·공변량 분기 반영",
      "질적·혼합 설계 8종 포함",
      "선배 학위논문 사례 매칭",
    ],
    cta: "통계방법 파인더 열기",
    ctaHref: "/archive/method-finder",
    color: "from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-950/30",
    iconBg: "bg-amber-100/80 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "stat-model-diagrams",
    addedAt: FEATURE_DATES["stat-model-diagrams"],
    icon: BarChart3,
    badge: "통계 가이드",
    badgeVariant: "outline",
    title: "통계방법이 그림으로 — 연구모형 다이어그램",
    description:
      "ANCOVA·SEM 같은 통계방법이 변인 사이의 어떤 관계를 보는지 애니메이션 다이어그램으로 보여드립니다. 가정 위반 시 대처, jamovi 실습 경로까지 — 분석 선택부터 실행까지 한 페이지에서 해결됩니다.",
    highlights: [
      "12종 변인 관계 모형 — 화살표가 그려지는 애니메이션",
      "가정 위반 시 대처(Welch·비모수 대체 등) + 최소 표본 참고",
      "'jamovi로 따라하기' 단계별 메뉴 경로 (무료 SW)",
    ],
    cta: "통계방법 가이드 열기",
    ctaHref: "/archive/statistical-methods",
    color: "from-cyan-50 to-cyan-100/60 dark:from-cyan-950/30 dark:to-cyan-950/30",
    iconBg: "bg-cyan-100/80 dark:bg-cyan-950/40",
    iconColor: "text-cyan-700 dark:text-cyan-400",
  },
  {
    id: "archive-foundation-expansion",
    addedAt: FEATURE_DATES["archive-foundation-expansion"],
    icon: GraduationCap,
    badge: "아카이브 확장",
    badgeVariant: "outline",
    title: "학습이론부터 통계 기호까지 — 아카이브 대확장",
    description:
      "행동주의·구성주의 등 학습이론 8종(대표 학자·원전 포함), 측정 척도와 모수/비모수, 결과표 기호(p·t·F·df·효과크기), 척도 개발·타당도 검증 가이드까지 한곳에 정리했습니다.",
    highlights: [
      "학습이론 8종 신설 — 검증된 원전 링크와 함께",
      "측정 척도·통계 기호 기초 용어 (결과표 읽는 법)",
      "척도 개발 8단계·프로그램 타당화 연구방법 가이드",
    ],
    cta: "기초 용어 사전 열기",
    ctaHref: "/archive/foundation-terms",
    color: "from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-950/30",
    iconBg: "bg-amber-100/80 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "thesis-journey-suite",
    addedAt: FEATURE_DATES["thesis-journey-suite"],
    icon: Compass,
    badge: "논문 여정",
    badgeVariant: "outline",
    title: "논문 여정 — 계획서가 본문의 초안이 됩니다",
    description:
      "나의 논문 여정에서 단계별 산출물(완독·보고서·계획서·본문 진행률)을 한눈에 확인하고, 논문 에디터에서는 연구계획서의 목적·범위·방법을 서론과 연구 방법 장의 초안으로 한 번에 가져올 수 있습니다.",
    highlights: [
      "여정 단계 카드에 '내 산출물' 칩 — 완독 N편·계획서·본문 %",
      "에디터 '계획서에서 가져오기' — 빈 장에만 안전하게 시딩",
      "대시보드 여정 헤더에서 진행률·미반영 지도 바로 확인",
    ],
    cta: "나의 논문 여정 열기",
    ctaHref: "/mypage/research?tab=writing",
    color: "from-sky-50 to-sky-100/60 dark:from-sky-950/30 dark:to-sky-950/30",
    iconBg: "bg-sky-100/80 dark:bg-sky-950/40",
    iconColor: "text-sky-700 dark:text-sky-400",
  },
  // ── 2026-05-15 ────────────────────────────────────────────────
  {
    id: "dashboard-phase-d",
    addedAt: FEATURE_DATES["dashboard-phase-d"],
    icon: LayoutDashboard,
    badge: "대시보드",
    badgeVariant: "outline",
    title: "대시보드 개인화 — 위젯 순서·알림 자유 조합",
    description:
      "14개 위젯의 가시성·순서·알림을 자유롭게 조합하세요. 학습 스타일에 맞는 5종 프리셋을 제공하며, 설정은 기기 간에 자동 동기화됩니다.",
    highlights: [
      "14개 위젯 가시성·순서·알림 토글",
      "학생·운영진·연구·미니멀 5종 프리셋",
      "localStorage + Firestore 기기간 sync",
    ],
    cta: "대시보드 설정 열기",
    ctaHref: "/mypage/dashboard-settings",
    color: "from-blue-50 to-blue-100/60 dark:from-blue-950/30 dark:to-blue-950/30",
    iconBg: "bg-blue-100/80 dark:bg-blue-950/40",
    iconColor: "text-blue-700 dark:text-blue-400",
  },
  {
    id: "onboarding-checklist",
    addedAt: FEATURE_DATES["onboarding-checklist"],
    icon: CheckSquare,
    badge: "시작하기",
    badgeVariant: "outline",
    title: "시작하기 체크리스트 — 마일스톤 배지",
    description:
      "신입 회원을 위한 5단계 온보딩 체크리스트입니다. 항목을 완료할 때마다 학습 잔디 가산점이 부여되고, 마일스톤 배지를 획득할 수 있습니다.",
    highlights: [
      "5단계 체크리스트 (운영진 편집 가능)",
      "마일스톤 배지 4종 — 첫걸음·절반·완성·신속적응",
      "항목 완료 시 다음 추천 액션 토스트",
    ],
    cta: "대시보드에서 확인",
    ctaHref: "/dashboard",
    color: "from-green-50 to-green-100/60 dark:from-green-950/30 dark:to-green-950/30",
    iconBg: "bg-green-100/80 dark:bg-green-950/40",
    iconColor: "text-green-700 dark:text-green-400",
  },
  {
    id: "notification-center",
    addedAt: FEATURE_DATES["notification-center"],
    icon: Bell,
    badge: "알림센터",
    badgeVariant: "outline",
    title: "알림센터 — 이벤트 알림 한 곳에서",
    description:
      "헤더 Bell 아이콘에서 미열람 알림 수를 확인하고 전체 목록을 조회할 수 있습니다. 세미나·학술활동·수업 등 주요 이벤트 알림을 한 곳에서 관리하세요.",
    highlights: [
      "헤더 Bell 아이콘 — 미열람 카운트 표시",
      "전체 알림 목록 페이지",
      "마이페이지에서 알림 수신 설정 가능",
    ],
    cta: "알림 설정 열기",
    ctaHref: "/mypage/notifications",
    color: "from-purple-50 to-purple-100/60 dark:from-purple-950/30 dark:to-purple-950/30",
    iconBg: "bg-purple-100/80 dark:bg-purple-950/40",
    iconColor: "text-purple-700 dark:text-purple-400",
  },
  {
    id: "archive-enhanced",
    addedAt: FEATURE_DATES["archive-enhanced"],
    icon: Archive,
    badge: "아카이브",
    badgeVariant: "outline",
    title: "교육공학 아카이브 강화 — 관계 그래프·다중 필터",
    description:
      "개념·변인·측정도구 8개 컬렉션에 sticky 목차가 추가되어 탐색이 편해졌습니다. 항목 간 관계를 그래프로 시각화하는 아카이브 그래프 페이지도 새로 오픈했습니다.",
    highlights: [
      "8개 컬렉션 sticky 목차 네비게이션",
      "관계 그래프 시각화 /archive/graph",
      "태그 다중 필터·즐겨찾기·정렬 기능",
    ],
    cta: "아카이브 보러 가기",
    ctaHref: "/archive",
    color: "from-amber-50 to-amber-100/60 dark:from-amber-950/30 dark:to-amber-950/30",
    iconBg: "bg-amber-100/80 dark:bg-amber-950/40",
    iconColor: "text-amber-700 dark:text-amber-400",
  },
  {
    id: "external-activity-status",
    addedAt: FEATURE_DATES["external-activity-status"],
    icon: Trophy,
    badge: "대외 학술대회",
    badgeVariant: "outline",
    title: "대외 학술대회 모집 기간 자동 상태",
    description:
      "대외 학술대회 활동에 모집 상태(예정·모집중·마감)가 자동으로 표시됩니다. D-day 카운트와 신청 게이트, D-1 알림 cron도 함께 지원합니다.",
    highlights: [
      "scheduled / open / closed 자동 상태 표시",
      "D-day 카운트 + 신청 게이트",
      "D-1 cron 알림 발송",
    ],
    cta: "대외활동 보러 가기",
    ctaHref: "/activities/external",
    color: "from-rose-50 to-rose-100/60 dark:from-rose-950/30 dark:to-rose-950/30",
    iconBg: "bg-rose-100/80 dark:bg-rose-950/40",
    iconColor: "text-rose-700 dark:text-rose-400",
  },
];

/**
 * addedAt 내림차순 자동 정렬 — 신기능을 배열 맨 위에 추가하지 않아도 자동으로 최신순 정렬.
 * 새 기능 추가 시 addedAt 날짜만 지정하면 됨.
 */
const SORTED_FEATURES = [...FEATURES].sort((a, b) => b.addedAt.localeCompare(a.addedAt));

/** 헤더에 표시할 마지막 갱신일 (max addedAt) */
const LAST_UPDATED = SORTED_FEATURES[0]?.addedAt ?? "";

export default function WhatsNewPage() {
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(WHATS_NEW_KEY) === "true",
  );

  function handleDismiss() {
    localStorage.setItem(WHATS_NEW_KEY, "true");
    setDismissed(true);
  }

  return (
    <PageContainer width="default">
      {/* 헤더 */}
      <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 flex-wrap">
            <Sparkles size={20} className="text-primary" />
            <span className="text-sm font-semibold text-primary">신규 기능 안내</span>
            {LAST_UPDATED && (
              <span className="text-xs text-muted-foreground">최종 갱신 {LAST_UPDATED}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold sm:text-3xl">이번 업데이트에서 추가된 기능</h1>
          <p className="mt-2 text-muted-foreground">
            최신 기능부터 순서대로 정리했습니다.{" "}
            <strong>NEW</strong> 배지는 60일 이내 추가된 기능에 자동 표시됩니다.
          </p>
        </div>
        {!dismissed && (
          <Button variant="outline" size="sm" className="shrink-0 self-start" onClick={handleDismiss}>
            다시 보지 않기
          </Button>
        )}
      </div>

      {/* 기능 카드 목록 */}
      <div className="space-y-5">
        {SORTED_FEATURES.map((feature) => {
          const Icon = feature.icon;
          const showNew = isNew(feature.addedAt);
          return (
            <div
              key={feature.id}
              className={`rounded-2xl border bg-gradient-to-br p-6 ${feature.color}`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                {/* 아이콘 */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${feature.iconBg} ${feature.iconColor}`}
                >
                  <Icon size={22} />
                </div>

                {/* 본문 */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    {showNew && (
                      <Badge variant="default" className="text-[10px]">
                        NEW
                      </Badge>
                    )}
                    <Badge variant={feature.badgeVariant ?? "secondary"} className="text-[10px]">
                      {feature.badge}
                    </Badge>
                    <h2 className="text-base font-bold">{feature.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>

                  {/* 하이라이트 목록 */}
                  <ul className="mt-3 space-y-1">
                    {feature.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm">
                        <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-4">
                    <Link
                      href={feature.ctaHref}
                      className="inline-flex items-center gap-1.5 rounded-lg border bg-white/80 px-3 py-1.5 text-sm font-medium text-foreground shadow-xs transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {feature.cta}
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 피드백 CTA */}
      <div className="mt-10 rounded-2xl border bg-gradient-to-br from-slate-50 to-slate-100/60 dark:from-slate-950/30 dark:to-slate-950/30 p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
              <MessageSquare size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">이 기능에 대한 의견이 있으신가요?</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                버그 제보, UI 개선 제안, 새 기능 요청을 자유롭게 남겨주세요.
              </p>
            </div>
          </div>
          <Link
            href="/feedback"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border bg-white/80 px-4 py-2 text-sm font-medium text-foreground shadow-xs transition hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageSquare size={14} />
            피드백 남기기
          </Link>
        </div>
      </div>

      {/* 하단 — 대시보드로 돌아가기 */}
      <div className="mt-6 flex justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <LayoutDashboard size={16} />
          대시보드로 돌아가기
        </Link>
      </div>
    </PageContainer>
  );
}

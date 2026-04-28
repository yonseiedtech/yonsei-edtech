import type { CardNewsSeries } from "./types";

const launchSeries: CardNewsSeries = {
  id: "2026-04-launch",
  title: "사이트 런칭 안내",
  description:
    "연세교육공학회 공식 웹사이트 정식 오픈 및 주요 기능 8가지를 소개하는 시리즈입니다.",
  publishedAt: "2026-04-28",
  category: "공지",
  cards: [
    {
      id: "01-cover",
      kind: "cover",
      title: "공식 웹사이트\n오픈을 알립니다.",
      badge: "2026년 4월",
      body: "yonsei-edtech.vercel.app",
      english: "Yonsei Educational Technology",
    },
    {
      id: "02-intro",
      kind: "intro",
      title: "학술 커뮤니티의\n새로운 시작",
      badge: "About",
      body:
        "연세대학교 교육대학원 교육공학전공 구성원이 함께 만드는\n학회 운영·연구·교류 통합 플랫폼이 정식 오픈했습니다.",
      bullets: ["에듀테크", "교수설계", "학습과학", "현장 연구"],
    },
    {
      id: "03-home",
      kind: "feature",
      title: "한 화면에서 만나는\n학회 활동",
      subtitle: "Dashboard",
      badge: "01. 대시보드",
      page: "/",
      screenshot: "home",
      bullets: [
        "이번 학기 학사일정 진행률을 한눈에",
        "오늘·이번주 수업 타임라인 위젯",
        "내 할 일·D-day 통합 관리",
      ],
    },
    {
      id: "04-seminars",
      kind: "feature",
      title: "학회 세미나, 발표자,\n출석까지",
      subtitle: "Seminar Operations",
      badge: "02. 세미나",
      page: "/seminars",
      screenshot: "seminars",
      bullets: [
        "다중 연사 프로필과 발표 자료",
        "QR 출석 + 자동 수료증 발급",
        "D-day 알림 · 후기 요청 cron",
      ],
    },
    {
      id: "05-activities",
      kind: "feature",
      title: "스터디·프로젝트·\n대외 학술활동",
      subtitle: "Academic Activities",
      badge: "03. 학술활동",
      page: "/activities",
      screenshot: "activities",
      bullets: [
        "공개 신청 · 참여자 관리",
        "타임라인 · 리뷰 · 포스터 통합",
        "활동 종료 시 참석확인서 자동 발급",
      ],
    },
    {
      id: "06-courses",
      kind: "feature",
      title: "선배들의 수강 후기와\n인터뷰",
      subtitle: "Course Catalog",
      badge: "04. 수강과목",
      page: "/courses",
      screenshot: "courses",
      bullets: [
        "학기별 강의·시간표 자동 정리",
        "후기·인터뷰 답변 통합 검색",
        "종합시험 기출과 합격수기",
      ],
    },
    {
      id: "07-alumni",
      kind: "feature",
      title: "선배 논문 계보도와\n추천 시스템",
      subtitle: "Alumni Theses",
      badge: "05. 졸업생 논문",
      page: "/alumni",
      screenshot: "alumni",
      bullets: [
        "5년 단위 계보도와 지도교수 매핑",
        "관심 분야 기반 논문 추천",
        "내 논문 읽기 리스트·분석 노트",
      ],
    },
    {
      id: "08-research",
      kind: "feature",
      title: "키워드·제목·계보\n통합 분석",
      subtitle: "Research Analytics",
      badge: "06. 연구 분석",
      page: "/research",
      screenshot: "research",
      bullets: [
        "연도별 키워드 클라우드·슬라이더",
        "제목 N-gram·연구 유형·대상 위젯",
        "양적/질적/혼합 분류와 venue 분석",
      ],
    },
    {
      id: "09-thesis-defense",
      kind: "feature",
      title: "논문 심사,\n연습부터 다르게",
      subtitle: "Thesis Defense Practice",
      badge: "07. 인지디딤판",
      page: "/steppingstone/thesis-defense",
      screenshot: "thesis-defense",
      bullets: [
        "Web Speech STT 기반 따라읽기",
        "문장 단위 양방향 형광펜 비교",
        "자동 채점과 연습 이력 보관",
      ],
    },
    {
      id: "10-newsletter",
      kind: "feature",
      title: "학회보,\n매거진처럼 다시 펴다",
      subtitle: "Newsletter & Magazine",
      badge: "08. 학회보",
      page: "/newsletter",
      screenshot: "newsletter",
      bullets: [
        "PDF 다운로드·페이지 북마크",
        "TOC dots leader·모바일 sticky 챕터",
        "콘솔 빌더·실시간 미리보기",
      ],
    },
    {
      id: "11-cta",
      kind: "cta",
      title: "지금\n함께하세요.",
      badge: "Join us",
      body: "yonsei-edtech.vercel.app",
      english: "회원가입 한 번으로 학회의 모든 활동에 참여할 수 있습니다.",
    },
  ],
};

export const CARD_NEWS_SERIES: CardNewsSeries[] = [launchSeries];

export function findSeries(id: string): CardNewsSeries | undefined {
  return CARD_NEWS_SERIES.find((s) => s.id === id);
}

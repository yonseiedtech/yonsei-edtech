/**
 * 커맨드 팔레트 — 정적 라우트/기능 레지스트리 (3차 백로그 G1)
 *
 * 라우트 50+·feature 50+ 시대의 발견성 회복. 키워드→페이지 매핑을 한 곳에 모아
 * Ctrl/Cmd+K 팔레트에서 즉시 검색·이동한다. 네트워크 의존 없이 정적 목록만으로
 * 동작하므로 hang 위험이 없다(동적 콘텐츠 검색은 GlobalSearch 에서 보조로 합류).
 *
 * 가시성(visibility)으로 로그인/운영진 전용 메뉴를 분기한다.
 */

import {
  Compass, LayoutDashboard, User, Sparkles, FlaskConical, Shield,
  GraduationCap, BookOpen, Calendar, Presentation, FolderKanban, Users,
  Microscope, Lightbulb, ClipboardCheck, Handshake, Library, Megaphone,
  MessageSquare, FileText, Newspaper, Images, Image as ImageIcon, Network,
  Trophy, HelpCircle, Settings, Bell, NotebookPen, Download, Target,
  Building2, FlaskRound, ScrollText, Award, BookMarked, Palette, Blocks,
  DraftingCompass,
  type LucideIcon,
} from "lucide-react";

/** 라우트 가시성 — 'both'(항상) / 'auth'(로그인) / 'staff'(운영진 이상) */
export type RouteVisibility = "both" | "auth" | "staff";

export interface CommandRoute {
  /** 안정적 식별자 (최근 기록용) */
  key: string;
  /** 그룹(카테고리) 라벨 */
  group: string;
  /** 표시 라벨 */
  label: string;
  /** 부가 설명 (선택) */
  sub?: string;
  href: string;
  icon: LucideIcon;
  /** 검색 매칭 키워드 — label 외 별칭·영문·동의어 */
  keywords: string;
  visibility?: RouteVisibility;
  /**
   * 대표 단축키 표기 (선택). 새 전역 키바인딩을 남발하지 않기 위해
   * 팔레트 내부 "빠른 필터 프리픽스"(예: ">진단")를 그대로 표기·동작시킨다.
   * '>' 로 시작하는 쿼리는 "빠른 실행" 그룹만 좁혀 보여주며, 뒤 키워드가 keywords 와 매칭된다.
   */
  shortcut?: string;
}

/**
 * 빠른 실행 명령 — 라우트 "이동"을 넘어 대표 도구를 즉시 "실행"하는 진입점.
 * 모두 기존 라우트/딥링크로만 동작한다(새 mutation 로직 없음). ux-gap 최상위 갭
 * "핵심 도구 매몰"(진단·암기카드·공동연구·진행미팅 등)을 팔레트 최상단으로 끌어올린다.
 */
export const COMMAND_ACTIONS: CommandRoute[] = [
  { key: "a:diagnosis", group: "빠른 실행", label: "진단 시작하기", sub: "연구 준비도 진단평가", href: "/diagnosis", icon: ClipboardCheck, shortcut: ">진단", keywords: "진단 시작 시작하기 준비도 평가 테스트 진단평가 시작 diagnosis start 실행", visibility: "auth" },
  { key: "a:flashcards-review", group: "빠른 실행", label: "암기카드 복습하기", sub: "간격반복 복습 시작", href: "/flashcards", icon: BookMarked, shortcut: ">복습", keywords: "암기카드 복습 복습하기 플래시카드 간격반복 srs 시작 review flashcard 실행", visibility: "auth" },
  { key: "a:research-design", group: "빠른 실행", label: "연구 설계 열기", sub: "모형·대상·방법·도구 계획", href: "/mypage/research?tab=design", icon: DraftingCompass, shortcut: ">설계", keywords: "연구 설계 열기 설계 에디터 연구모형 연구대상 연구방법 측정도구 분석 design 실행", visibility: "auth" },
  { key: "a:weekly-goal", group: "빠른 실행", label: "이번 주 목표 설정", sub: "주간 학습 목표", href: "/dashboard", icon: Target, shortcut: ">목표", keywords: "이번 주 목표 설정 주간 목표 weekly goal 대시보드 목표 세우기 실행", visibility: "auth" },
  { key: "a:collab", group: "빠른 실행", label: "공동연구자 찾기", sub: "관심사 기반 매칭", href: "/collab", icon: Handshake, shortcut: ">공동", keywords: "공동 연구자 찾기 협업 매칭 collaborator collab 실행", visibility: "auth" },
  { key: "a:progress-meeting", group: "빠른 실행", label: "진도 미팅 잡기", sub: "지도·면담 기록", href: "/progress-meetings", icon: Target, shortcut: ">미팅", keywords: "진도 미팅 잡기 면담 지도 progress meeting 실행", visibility: "auth" },
  { key: "a:archive", group: "빠른 실행", label: "아카이브 열기", sub: "개념·변인·측정도구", href: "/archive", icon: Library, shortcut: ">아카이브", keywords: "아카이브 열기 개념 변인 측정도구 이론 archive 실행", visibility: "both" },
];

/**
 * 정적 라우트·기능 레지스트리.
 * 그룹 순서는 GROUP_ORDER 에서 통제한다.
 */
export const COMMAND_ROUTES: CommandRoute[] = [
  // ── 내 공간 ──
  { key: "r:dashboard", group: "내 공간", label: "대시보드", href: "/dashboard", icon: LayoutDashboard, keywords: "대시보드 dashboard 홈 home 오늘 할일 일정", visibility: "auth" },
  { key: "r:mypage", group: "내 공간", label: "마이페이지", href: "/mypage", icon: User, keywords: "마이페이지 mypage 내 정보 프로필 잔디 활동", visibility: "auth" },
  { key: "r:mypage-research", group: "내 공간", label: "내 연구활동 · 논문 여정", href: "/mypage/research", icon: Microscope, keywords: "연구활동 논문 여정 학위논문 에디터 지도 노트 코크핏 journey research", visibility: "auth" },
  { key: "r:research-design", group: "내 공간", label: "연구 설계", sub: "모형·대상·방법·도구·분석 계획", href: "/mypage/research?tab=design", icon: DraftingCompass, keywords: "연구 설계 research design 연구모형 연구대상 표집 연구방법 측정도구 분석 계획 설계 단계", visibility: "auth" },
  { key: "r:research-model", group: "내 공간", label: "연구 모형 그리기", sub: "마법사·템플릿", href: "/research-model", icon: Network, keywords: "연구 모형 변인 독립 종속 매개 조절 다이어그램 마법사 research model wizard", visibility: "auth" },
  { key: "r:literature-matrix", group: "내 공간", label: "문헌 리뷰 매트릭스", sub: "선행연구 비교표", href: "/mypage/research?tab=reading&focus=matrix", icon: BookMarked, keywords: "문헌 매트릭스 선행연구 비교표 리뷰 literature matrix", visibility: "auth" },
  { key: "r:topic-explorer", group: "내 공간", label: "주제 탐색 인터뷰", sub: "연구 주제 찾기", href: "/mypage/research?tab=explore", icon: BookMarked, keywords: "주제 탐색 연구주제 인터뷰 topic explorer 아이디어", visibility: "auth" },
  { key: "r:method-finder", group: "내 공간", label: "통계방법 찾기", sub: "질문으로 추천", href: "/archive/method-finder", icon: Target, keywords: "통계방법 찾기 파인더 추천 t검정 anova ancova method finder", visibility: "auth" },
  { key: "r:research-finder", group: "내 공간", label: "연구방법 찾기", sub: "질문으로 추천", href: "/archive/research-finder", icon: Compass, keywords: "연구방법 찾기 파인더 질적 양적 혼합 설계 research finder", visibility: "auth" },
  { key: "r:mypage-portfolio", group: "내 공간", label: "학술 포트폴리오", href: "/mypage/portfolio", icon: Award, keywords: "포트폴리오 portfolio 학술 이력 산출물", visibility: "auth" },
  { key: "r:mypage-calendar", group: "내 공간", label: "내 캘린더", href: "/mypage/calendar", icon: Calendar, keywords: "캘린더 일정 calendar 내 일정", visibility: "auth" },
  { key: "r:mypage-notes", group: "내 공간", label: "내 노트", href: "/mypage/notes", icon: NotebookPen, keywords: "노트 메모 notes 기록", visibility: "auth" },
  { key: "r:studio", group: "내 공간", label: "디자인 스튜디오", href: "/studio", icon: Palette, keywords: "디자인 스튜디오 카드뉴스 포스터 ppt 슬라이드 canva studio design", visibility: "auth" },
  { key: "r:mypage-messages", group: "내 공간", label: "쪽지함", href: "/mypage/messages", icon: MessageSquare, keywords: "쪽지 메시지 messages dm", visibility: "auth" },
  { key: "r:mypage-notifications", group: "내 공간", label: "알림 설정", href: "/mypage/notifications", icon: Bell, keywords: "알림 설정 notifications 푸시 이메일", visibility: "auth" },
  { key: "r:mypage-data-export", group: "내 공간", label: "내 데이터 내보내기", href: "/mypage/data-export", icon: Download, keywords: "데이터 내보내기 export 다운로드 백업", visibility: "auth" },
  { key: "r:whats-new", group: "내 공간", label: "새 기능 보기", href: "/whats-new", icon: Sparkles, keywords: "새 기능 whats new 업데이트 변경", visibility: "auth" },
  { key: "r:profile-me", group: "내 공간", label: "내 공개 프로필", href: "/profile/me", icon: User, keywords: "공개 프로필 profile 내 프로필", visibility: "auth" },

  // ── 대학원 생활 ──
  { key: "r:steppingstone", group: "대학원 생활", label: "인지디딤판", sub: "학기별 로드맵", href: "/steppingstone", icon: GraduationCap, keywords: "인지디딤판 디딤판 steppingstone 로드맵 학기 가이드", visibility: "auth" },
  { key: "r:steppingstone-onboarding", group: "대학원 생활", label: "신입생 온보딩", href: "/steppingstone/onboarding", icon: Compass, keywords: "온보딩 신입생 onboarding 시작", visibility: "auth" },
  { key: "r:steppingstone-current", group: "대학원 생활", label: "재학생 디딤판", href: "/steppingstone/current-student", icon: GraduationCap, keywords: "재학생 디딤판 current student", visibility: "auth" },
  { key: "r:steppingstone-defense", group: "대학원 생활", label: "논문 심사 연습", href: "/steppingstone/thesis-defense", icon: Presentation, keywords: "논문 심사 연습 디펜스 defense 발표", visibility: "auth" },
  { key: "r:steppingstone-program-development", group: "대학원 생활", label: "프로그램 설계·개발", sub: "ADDIE · 가네 9절차 셀프 가이드", href: "/steppingstone/program-development", icon: Blocks, keywords: "프로그램 설계 개발 교육훈련 addie 분석 설계 개발 실행 평가 교수설계 instructional design program development 연수 hrd 수업설계 교육 훈련 프로그램 개발 모형 가네 9절차 9가지 교수절차 수업 사태 gagne 학습목표 과정안 lesson plan mager", visibility: "both" },
  { key: "r:steppingstone-conference", group: "대학원 생활", label: "학술대회 디딤판", href: "/steppingstone/conference", icon: Presentation, keywords: "학술대회 컨퍼런스 conference 발표", visibility: "auth" },
  { key: "r:courses", group: "대학원 생활", label: "내 수강과목", href: "/courses", icon: BookOpen, keywords: "수강 과목 courses 강의 시간표 수업", visibility: "auth" },
  { key: "r:exam-schedule", group: "대학원 생활", label: "종합시험 일정 관리", href: "/exam-schedule-admin", icon: ClipboardCheck, keywords: "종합시험 시험 일정 exam schedule", visibility: "staff" },

  // ── 학술 활동 ──
  { key: "r:activities", group: "학술 활동", label: "활동 소개", href: "/activities", icon: Users, keywords: "학술활동 활동 activities 소개", visibility: "both" },
  { key: "r:activities-studies", group: "학술 활동", label: "스터디", href: "/activities/studies", icon: BookOpen, keywords: "스터디 study 모임 공부", visibility: "both" },
  { key: "r:activities-projects", group: "학술 활동", label: "프로젝트", href: "/activities/projects", icon: FolderKanban, keywords: "프로젝트 project 연구 과제", visibility: "both" },
  { key: "r:activities-external", group: "학술 활동", label: "대외 학술대회", href: "/activities/external", icon: Presentation, keywords: "대외 학술대회 external 외부 컨퍼런스", visibility: "both" },
  { key: "r:seminars", group: "학술 활동", label: "세미나", href: "/seminars", icon: Presentation, keywords: "세미나 seminar 강연 특강", visibility: "both" },
  { key: "r:calendar", group: "학술 활동", label: "학술 캘린더", href: "/calendar", icon: Calendar, keywords: "학술 캘린더 일정 calendar 행사", visibility: "both" },
  { key: "r:gatherings", group: "학술 활동", label: "모임 · 행사", href: "/gatherings", icon: Handshake, keywords: "모임 행사 네트워킹 gatherings 만남", visibility: "auth" },
  { key: "r:leaderboard", group: "학술 활동", label: "리더보드", href: "/leaderboard", icon: Trophy, keywords: "리더보드 순위 leaderboard 랭킹 점수", visibility: "auth" },

  // ── 연구 · 아카이브 ──
  { key: "r:diagnosis", group: "연구 · 아카이브", label: "연구 준비도 진단평가", href: "/diagnosis", icon: ClipboardCheck, keywords: "진단 진단평가 diagnosis 준비도 테스트 평가", visibility: "auth" },
  { key: "r:flashcards", group: "연구 · 아카이브", label: "암기카드", href: "/flashcards", icon: BookMarked, keywords: "암기카드 플래시카드 flashcard 복습 srs 카드", visibility: "auth" },
  { key: "r:collab", group: "연구 · 아카이브", label: "공동 연구", href: "/collab", icon: Handshake, keywords: "공동 연구 협업 collab 공동연구자 추천", visibility: "auth" },
  { key: "r:progress-meetings", group: "학술 활동", label: "진도 미팅", sub: "스터디·프로젝트 진도", href: "/progress-meetings", icon: Target, keywords: "진도 미팅 progress meeting 면담 지도 스터디 프로젝트", visibility: "auth" },
  { key: "r:research", group: "연구 · 아카이브", label: "연세교육공학 연구 분석", href: "/research", icon: Microscope, keywords: "연구 분석 키워드 계보 트렌드 research analysis", visibility: "both" },
  { key: "r:alumni-thesis", group: "연구 · 아카이브", label: "졸업생 학위논문", href: "/alumni/thesis", icon: GraduationCap, keywords: "졸업생 학위논문 alumni thesis 선배 논문", visibility: "both" },
  { key: "r:archive", group: "연구 · 아카이브", label: "교육공학 아카이브", href: "/archive", icon: Library, keywords: "아카이브 개념 변인 측정도구 archive 이론", visibility: "both" },
  { key: "r:archive-concept", group: "연구 · 아카이브", label: "개념 라이브러리", sub: "이론·구성개념", href: "/archive/concept", icon: Lightbulb, keywords: "개념 concept 이론 구성개념 자기효능감 학습몰입 라이브러리", visibility: "both" },
  { key: "r:archive-variable", group: "연구 · 아카이브", label: "변인 라이브러리", sub: "측정 가능한 단위", href: "/archive/variable", icon: Target, keywords: "변인 variable 독립변인 종속변인 인지적 정의적 행동적 라이브러리", visibility: "both" },
  { key: "r:archive-measurement", group: "연구 · 아카이브", label: "측정도구 라이브러리", sub: "검증된 척도", href: "/archive/measurement", icon: ClipboardCheck, keywords: "측정도구 measurement 척도 설문 검사 신뢰도 타당도 likert 라이브러리", visibility: "both" },
  { key: "r:archive-research-methods", group: "연구 · 아카이브", label: "연구방법 가이드", href: "/archive/research-methods", icon: Lightbulb, keywords: "연구방법 방법론 research method 양적 질적 혼합", visibility: "both" },
  { key: "r:archive-statistical-methods", group: "연구 · 아카이브", label: "통계방법 가이드", href: "/archive/statistical-methods", icon: Lightbulb, keywords: "통계 통계방법 statistics 분석 t검정 anova 회귀", visibility: "both" },
  { key: "r:archive-paper-guide", group: "연구 · 아카이브", label: "논문 작성 가이드", href: "/archive/paper-guide", icon: FileText, keywords: "논문 작성 가이드 paper guide 글쓰기", visibility: "both" },
  { key: "r:archive-apa-style", group: "연구 · 아카이브", label: "APA 스타일", href: "/archive/apa-style", icon: ScrollText, keywords: "apa 스타일 인용 참고문헌 citation", visibility: "both" },
  { key: "r:archive-citation-guide", group: "연구 · 아카이브", label: "인용 가이드", href: "/archive/citation-guide", icon: ScrollText, keywords: "인용 가이드 citation 참고문헌 출처", visibility: "both" },
  { key: "r:archive-literature-review", group: "연구 · 아카이브", label: "문헌 고찰 가이드", href: "/archive/literature-review-guide", icon: BookOpen, keywords: "문헌 고찰 literature review 선행연구", visibility: "both" },
  { key: "r:archive-foundation-terms", group: "연구 · 아카이브", label: "기초 용어", href: "/archive/foundation-terms", icon: Lightbulb, keywords: "기초 용어 foundation terms 개념", visibility: "both" },
  { key: "r:archive-terminology", group: "연구 · 아카이브", label: "AECT 용어 표준 사전", sub: "공식 용어·역어 186개", href: "/archive/terminology", icon: BookMarked, keywords: "aect 용어 표준 사전 교육공학 용어해설 richey 역어 표제어 terminology 학지사", visibility: "both" },
  { key: "r:archive-theory-map", group: "연구 · 아카이브", label: "학습이론 가계도", sub: "사조·계열·학자 지도", href: "/archive/theory-map", icon: Network, keywords: "학습이론 가계도 이론 지도 계보 사조 행동주의 인지주의 구성주의 파블로프 스키너 피아제 비고츠키 반두라 theory map family", visibility: "both" },
  { key: "r:journal", group: "연구 · 아카이브", label: "연구지 (Journal)", href: "/journal", icon: BookMarked, keywords: "연구지 학회지 저널 journal 논문집", visibility: "both" },

  // ── 커뮤니티 ──
  { key: "r:notices", group: "커뮤니티", label: "공지사항", href: "/notices", icon: Megaphone, keywords: "공지 공지사항 notice 알림", visibility: "both" },
  { key: "r:board-free", group: "커뮤니티", label: "자유게시판", href: "/board/free", icon: MessageSquare, keywords: "자유게시판 게시판 자유 free board", visibility: "auth" },
  { key: "r:board-interview", group: "커뮤니티", label: "인터뷰 게시판", href: "/board/interview", icon: MessageSquare, keywords: "인터뷰 게시판 interview", visibility: "auth" },
  { key: "r:board-paper-review", group: "커뮤니티", label: "교육공학 논문 리뷰", href: "/board/paper-review", icon: FileText, keywords: "논문 리뷰 paper review 게시판", visibility: "auth" },
  { key: "r:board-promotion", group: "커뮤니티", label: "홍보게시판", href: "/board/promotion", icon: Megaphone, keywords: "홍보 게시판 promotion", visibility: "auth" },
  { key: "r:board-resources", group: "커뮤니티", label: "자료실", href: "/board/resources", icon: Library, keywords: "자료실 자료 resources 파일", visibility: "auth" },
  { key: "r:board-update", group: "커뮤니티", label: "업데이트 게시판", href: "/board/update", icon: Sparkles, keywords: "업데이트 게시판 update", visibility: "auth" },
  { key: "r:ai-forum", group: "커뮤니티", label: "AI 포럼 (실험)", href: "/ai-forum", icon: FlaskRound, keywords: "ai 포럼 forum 실험 인공지능", visibility: "auth" },
  { key: "r:members", group: "커뮤니티", label: "회원", href: "/members", icon: Users, keywords: "회원 멤버 members 재학생 졸업생 명단", visibility: "auth" },
  { key: "r:directory", group: "커뮤니티", label: "구성원 디렉토리", href: "/directory", icon: Users, keywords: "디렉토리 구성원 directory 명부", visibility: "auth" },
  { key: "r:network", group: "커뮤니티", label: "회원 관계망 Map", href: "/network", icon: Network, keywords: "관계망 네트워크 network map 맵", visibility: "auth" },

  // ── 콘텐츠 ──
  { key: "r:newsletter", group: "콘텐츠", label: "학회보", href: "/newsletter", icon: Newspaper, keywords: "학회보 뉴스레터 newsletter 소식", visibility: "both" },
  { key: "r:card-news", group: "콘텐츠", label: "카드뉴스", href: "/card-news", icon: Images, keywords: "카드뉴스 card news 카드", visibility: "both" },
  { key: "r:gallery", group: "콘텐츠", label: "포토갤러리", href: "/gallery", icon: ImageIcon, keywords: "갤러리 사진 포토 gallery photo", visibility: "both" },
  { key: "r:labs", group: "콘텐츠", label: "실험실", href: "/labs", icon: FlaskConical, keywords: "실험실 연구실 labs lab qa wall", visibility: "auth" },

  // ── 학회 소개 ──
  { key: "r:about", group: "학회 소개", label: "학회 소개", href: "/about", icon: Building2, keywords: "학회 소개 about 연세교육공학회", visibility: "both" },
  { key: "r:about-greeting", group: "학회 소개", label: "인사말", href: "/about/greeting", icon: Building2, keywords: "인사말 greeting 학회장 주임교수", visibility: "both" },
  { key: "r:about-fields", group: "학회 소개", label: "활동 분야", href: "/about/fields", icon: Building2, keywords: "활동 분야 fields 연구 분야", visibility: "both" },
  { key: "r:about-history", group: "학회 소개", label: "연혁", href: "/about/history", icon: ScrollText, keywords: "연혁 history 역사", visibility: "both" },
  { key: "r:about-leadership", group: "학회 소개", label: "주요 구성원", href: "/about/leadership", icon: Users, keywords: "주임교수 운영진 leadership 구성원", visibility: "both" },
  { key: "r:help", group: "학회 소개", label: "도움말", href: "/help", icon: HelpCircle, keywords: "도움말 help 가이드 faq", visibility: "both" },
  { key: "r:contact", group: "학회 소개", label: "문의하기", href: "/contact", icon: MessageSquare, keywords: "문의 연락 contact", visibility: "both" },
  { key: "r:feedback", group: "학회 소개", label: "피드백 보내기", href: "/feedback", icon: MessageSquare, keywords: "피드백 의견 feedback 건의", visibility: "auth" },

  // ── 운영 (staff+) ──
  { key: "r:console", group: "운영", label: "운영 콘솔", href: "/console", icon: Shield, keywords: "운영 콘솔 console admin 관리", visibility: "staff" },
  { key: "r:console-members", group: "운영", label: "회원 관리", href: "/console/members", icon: Users, keywords: "회원 관리 members 승인 명단", visibility: "staff" },
  { key: "r:console-academic", group: "운영", label: "학술활동 관리", href: "/console/academic", icon: BookOpen, keywords: "학술활동 관리 academic 세미나 스터디", visibility: "staff" },
  { key: "r:console-insights", group: "운영", label: "운영 인사이트", href: "/console/insights", icon: Target, keywords: "인사이트 통계 insights 분석 넛지", visibility: "staff" },
  { key: "r:console-posts", group: "운영", label: "게시물 관리", href: "/console/posts", icon: FileText, keywords: "게시물 관리 posts 게시판", visibility: "staff" },
  { key: "r:console-archive", group: "운영", label: "아카이브 관리", href: "/console/archive", icon: Library, keywords: "아카이브 관리 archive 개념 변인", visibility: "staff" },
  { key: "r:console-card-news", group: "운영", label: "카드뉴스 관리", href: "/console/card-news", icon: Images, keywords: "카드뉴스 관리 card news", visibility: "staff" },
  { key: "r:console-newsletter", group: "운영", label: "학회보 관리", href: "/console/newsletter", icon: Newspaper, keywords: "학회보 뉴스레터 관리 newsletter", visibility: "staff" },
  { key: "r:console-todos", group: "운영", label: "운영 업무철", href: "/console/todos", icon: ClipboardCheck, keywords: "할일 업무 todos 운영 업무철", visibility: "staff" },
  { key: "r:console-settings", group: "운영", label: "사이트 설정", href: "/console/settings", icon: Settings, keywords: "설정 사이트 settings 관리", visibility: "staff" },
];

/** 결과 그룹 표시 순서 (정적 라우트 우선 → 동적 콘텐츠 후순위) */
export const GROUP_ORDER = [
  "최근",
  "빠른 실행",
  "내 공간",
  "대학원 생활",
  "학술 활동",
  "연구 · 아카이브",
  "커뮤니티",
  "콘텐츠",
  "학회 소개",
  "운영",
  // 동적 콘텐츠 그룹 (GlobalSearch 에서 합류)
  "공지",
  "아카이브",
  "세미나",
  "학술활동",
  "졸업생 논문",
  "강의",
  "암기카드",
];

/** 주어진 역할에 항목 하나가 보이는지 판정 */
function isVisibleFor(vis: RouteVisibility, isAuthed: boolean, isStaff: boolean): boolean {
  if (vis === "both") return true;
  if (vis === "auth") return isAuthed;
  if (vis === "staff") return isStaff;
  return true;
}

/** 사용자 역할에 맞는 정적 라우트만 필터 */
export function visibleRoutes(role: string | undefined | null): CommandRoute[] {
  const isAuthed = !!role && role !== "guest";
  const isStaff =
    role === "staff" || role === "president" || role === "admin" || role === "sysadmin";
  return COMMAND_ROUTES.filter((r) => isVisibleFor(r.visibility ?? "both", isAuthed, isStaff));
}

/** 사용자 역할에 맞는 빠른 실행 명령만 필터 (팔레트 최상단 노출용) */
export function visibleActions(role: string | undefined | null): CommandRoute[] {
  const isAuthed = !!role && role !== "guest";
  const isStaff =
    role === "staff" || role === "president" || role === "admin" || role === "sysadmin";
  return COMMAND_ACTIONS.filter((a) => isVisibleFor(a.visibility ?? "both", isAuthed, isStaff));
}

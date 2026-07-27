/**
 * 26년 후기(2026-2) 운영진 업무 매뉴얼 시드 데이터
 *
 * 근거: docs/plans/staff-manual-2026-2.md
 * 5개 역할(학회장·부학회장·기획운영·연구학술·대외협력)의 임무를
 * 현재 LIVE 플랫폼 기능에 매핑한 업무수행철(HandoverDocument) 초안.
 *
 * 콘솔 업무수행철 탭의 "26년 후기 운영진 매뉴얼 시드" 버튼으로 1회 생성한다.
 * 중복 생성 방지: 같은 term + role 조합이 이미 있으면 스킵.
 * ⚠️ 이 시드는 매뉴얼 문서(handover_docs)만 생성하며, 회원 계정 권한·조직도 userId 는
 *    건드리지 않는다(되돌리기 어려운 계정 변경은 운영진이 별도 UI에서 확인 후 수행).
 */

import type { HandoverWorkflowStep, HandoverTodoItem, HandoverDocument } from "@/types";

export const STAFF_MANUAL_TERM = "2026-2";

export interface StaffManualSeedItem {
  role: string;
  roles: string[];
  title: string;
  content: string;
  workflow: HandoverWorkflowStep[];
  todos: HandoverTodoItem[];
  category: HandoverDocument["category"];
  priority: HandoverDocument["priority"];
  /** 담당자 이름(표시용) — 실제 계정 매칭은 조직 설정에서 별도 수행 */
  assigneeName: string;
}

export const STAFF_MANUAL_SEED_2026_2: StaffManualSeedItem[] = [
  {
    role: "학회장",
    roles: ["학회장"],
    assigneeName: "김혜진",
    category: "routine",
    priority: "high",
    title: "학회장 업무 매뉴얼 (26년 후기)",
    content: [
      "## 한 줄 정의",
      "학회 전체 방향을 정하고, 운영진 업무를 조율하며, 최종 승인 게이트를 책임진다.",
      "",
      "## 담당 업무",
      "- 학기 운영 방향·일정 총괄, 운영진 역할 배분·조율",
      "- 회원 가입 최종 승인, 공지·뉴스레터 발행 승인",
      "- 조직도·권한(운영진 교체) 관리",
      "",
      "## 플랫폼 경로",
      "- **운영 현황**: `/staff` 홈 대시보드 (팀 스냅샷·처리 대기 큐)",
      "- **조직·권한**: `/console/settings`(조직도), `/console/handover` 운영진 교체 탭",
      "- **인사이트**: `/admin/insights` (연결 KPI·여정 완주율)",
    ].join("\n"),
    workflow: [
      { title: "운영 현황 점검", description: "/staff 홈 대시보드에서 팀 스냅샷·처리 대기 큐 확인 (매주)" },
      { title: "처리 대기 배분", description: "회원 승인·미답변 문의·아카이브 검수 항목을 담당 운영진에게 배분" },
      { title: "공지/뉴스레터 발행 승인", description: "/console 콘텐츠에서 초안 검토 후 발행 승인" },
      { title: "인사이트 리뷰", description: "/admin/insights에서 연결 KPI·여정 완주율 월간 점검" },
    ],
    todos: [
      { text: "26년 후기 운영진 4인 조직도 배정 확인 (/console/settings)", done: false },
      { text: "학기 운영 일정(세미나·모임·대내 학술대회) 캘린더 확정", done: false },
      { text: "전기(2026-1) 미완 처리 대기 큐 인수 점검", done: false },
    ],
  },
  {
    role: "부학회장",
    roles: ["부학회장"],
    assigneeName: "한지혜",
    category: "routine",
    priority: "high",
    title: "부학회장 업무 매뉴얼 (26년 후기)",
    content: [
      "## 한 줄 정의",
      "학회장을 보좌하고, 운영진 실무 진행을 챙기며, 학회장 부재 시 대행한다.",
      "",
      "## 담당 업무",
      "- 운영진 업무 진행 상황 취합·독려, 회의 준비·주재 보조",
      "- 회원 관리 실무(가입 승인 1차 검토), 공지 초안 작성",
      "- 학회장 위임 사항 대행",
      "",
      "## 플랫폼 경로",
      "- **팀 업무**: `/staff` 홈 대시보드 (내 할당 업무·팀 스냅샷)",
      "- **회원 관리**: `/console` 회원 승인 1차 검토",
      "- **모임 조율**: `/gatherings` 일정 투표",
    ].join("\n"),
    workflow: [
      { title: "팀 업무 취합", description: "/staff 홈 대시보드로 운영진 진행률 확인" },
      { title: "회원 승인 1차", description: "/console 회원 관리에서 가입 신청 검토 → 학회장 최종 승인 전 정리" },
      { title: "회의 운영", description: "진행 미팅 타이머로 운영진 회의 아젠다·시간 관리" },
      { title: "공지 초안", description: "/console 공지에서 초안 작성 → 학회장 발행 승인 요청" },
    ],
    todos: [
      { text: "운영진 주간 체크인 채널·주기 확정", done: false },
      { text: "회원 승인 기준(자격·소속 확인 항목) 문서화", done: false },
      { text: "학회장 위임 범위 합의", done: false },
    ],
  },
  {
    role: "기획운영",
    roles: ["기획운영"],
    assigneeName: "김남영",
    category: "project",
    priority: "high",
    title: "기획·운영담당 업무 매뉴얼 (26년 후기)",
    content: [
      "## 한 줄 정의",
      "세미나·스터디·모임 등 학회 활동을 기획하고 실제 운영을 굴린다.",
      "",
      "## 담당 업무",
      "- 세미나·스터디·모임 기획 및 개설, 활동 진행 관리",
      "- 스터디 수요조사 → 개설 파이프라인 운영",
      "- 활동 자료·출석·회차 진행 기록 관리",
      "",
      "## 플랫폼 경로",
      "- **수요조사**: `/staff` 스터디 수요조사 탭 (수요→모임장→설계→개설)",
      "- **세미나 라이브**: 장표·강의노트·Q&A·설문 콘솔",
      "- **회차 관리**: 주차별 일정·출석·자료·교수설계 마법사",
    ].join("\n"),
    workflow: [
      { title: "수요조사 운영", description: "/staff 수요조사 탭: 수요 접수 → 모임장 지정 → 설계 → 개설" },
      { title: "세미나 개설·진행", description: "세미나 생성 후 세미나 라이브 콘솔로 당일 운영" },
      { title: "회차 관리", description: "주차별 일정·출석·자료·발제자 기록" },
      { title: "모임 일정 조율", description: "/gatherings 일정 투표로 참석 가능 시간 집계" },
    ],
    todos: [
      { text: "26년 후기 스터디 수요조사 개시 (/staff 수요조사 탭)", done: false },
      { text: "세미나 최소 1건 일정·연사 확정", done: false },
      { text: "활동 자료 저장 규칙(자료 경로·명명) 인수", done: false },
    ],
  },
  {
    role: "연구학술",
    roles: ["연구학술"],
    assigneeName: "수연",
    category: "project",
    priority: "high",
    title: "연구·학술담당 업무 매뉴얼 (26년 후기)",
    content: [
      "## 한 줄 정의",
      "학회의 연구·아카이브·학술 콘텐츠 품질을 책임진다.",
      "",
      "## 담당 업무",
      "- 아카이브(개념·논문·용어) 검수·확충, 진단평가 문항 관리",
      "- 학술지(ResearchJournal)·러닝 가이드 편집",
      "- 공동연구·대내 학술대회 학술 운영",
      "",
      "## 플랫폼 경로",
      "- **아카이브 검수**: `/staff` 처리 대기 큐 아카이브 검수 항목",
      "- **학술지**: `/console/research/journal` (호수·논문·CRediT)",
      "- **연구 트렌드**: `/research` 다축 트렌드 정합성 점검",
    ].join("\n"),
    workflow: [
      { title: "아카이브 검수", description: "/staff 처리 대기 큐의 아카이브 검수 항목 소진" },
      { title: "학술지 편집", description: "/console/research/journal에서 호수·논문·저자(CRediT) 관리" },
      { title: "연구 트렌드 관리", description: "/research 다축 트렌드 데이터 정합성 점검" },
      { title: "진단평가", description: "진단 문항·개념 매핑 정확성 교차검증" },
    ],
    todos: [
      { text: "아카이브 미검수 항목 잔량 인수 및 검수 일정 수립", done: false },
      { text: "26년 후기 학술지 호수 발간 계획 확정", done: false },
      { text: "진단 문항 정답·통계 교차검증 체계 인수", done: false },
    ],
  },
  {
    role: "대외협력",
    roles: ["대외협력"],
    assigneeName: "유지은",
    category: "project",
    priority: "medium",
    title: "대외협력담당 업무 매뉴얼 (26년 후기)",
    content: [
      "## 한 줄 정의",
      "외부 학회·연사·타 기관과의 협력과 학회 대외 창구를 담당한다.",
      "",
      "## 담당 업무",
      "- 외부 학술대회 참가·연계, 초청 연사 섭외",
      "- 대외 문의 응대, 협력·후원 창구",
      "- 명함 교환·네트워킹 운영",
      "",
      "## 플랫폼 경로",
      "- **대외 문의**: `/staff` 처리 대기 큐 미답변 문의 소진",
      "- **외부 학술대회**: 참가 프로그램·시간표 등록·관리",
      "- **네트워킹**: 명함 교환·모임 네트워킹 프로그램",
    ].join("\n"),
    workflow: [
      { title: "대외 문의 응대", description: "/staff 처리 대기 큐 미답변 문의(Inquiry) 소진" },
      { title: "외부 학술대회", description: "참가 프로그램·시간표 등록·관리" },
      { title: "연사 섭외·후기", description: "세미나 연사 정보 관리, 후기·감사장 발급 연동" },
      { title: "네트워킹", description: "명함 교환·모임 네트워킹 프로그램 운영" },
    ],
    todos: [
      { text: "협력 기관·연사 연락처 목록 인수", done: false },
      { text: "대외 문의 응대 SLA(응답 기한) 확정", done: false },
      { text: "26년 후기 외부 학술대회 참가 후보 선정", done: false },
    ],
  },
];

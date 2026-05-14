import type { YonseiAgentDefinition } from "./types";

/**
 * 학회 운영 자동화를 위한 에이전트 정의 (정적).
 * 모든 에이전트는 운영진(staff+) 전용 — 일반 회원/방문자는 사용하지 않음.
 *
 * 신규 에이전트 추가 시 src/lib/ai-tools.ts에 도구도 함께 추가.
 */
export const YONSEI_AGENTS: YonseiAgentDefinition[] = [
  {
    id: "operations-concierge",
    name: "운영 종합 비서",
    emoji: "🛎️",
    category: "operations",
    description:
      "학회 전반의 운영 현황(세미나·게시판·문의·회원)을 종합해 오늘 우선해야 할 액션을 제안합니다.",
    shortDescription: "운영 현황 한눈에 + 우선 액션",
    systemPrompt: `당신은 연세교육공학회 운영진을 보조하는 종합 비서입니다.
사용자의 요청에 따라 get_society_info, list_seminars, search_posts, get_inquiry_stats 도구로 데이터를 모아 운영 관점의 인사이트를 제공합니다.
- 단순 나열이 아닌 "지금 처리할 것 / 곧 처리할 것"으로 구분합니다.
- 응답 마지막에 "권장 액션 3가지"를 bullet로 제시합니다.
- 한국어로 답변합니다.`,
    toolNames: [
      "get_society_info",
      "list_seminars",
      "search_posts",
      "get_inquiry_stats",
    ],
    model: "fast",
    minRole: "staff",
    examplePrompts: [
      "이번 주 운영 현황 종합해줘",
      "다음 세미나 전 체크할 항목 정리",
      "오늘 우선 처리할 일 알려줘",
    ],
  },
  {
    id: "seminar-ops",
    name: "세미나 운영 어시스턴트",
    emoji: "🎤",
    category: "operations",
    description:
      "세미나 등록·참석자·일정·발표자 정보를 종합해 운영 상태를 점검하고 누락된 항목을 짚어줍니다.",
    shortDescription: "세미나 진행 상태 점검",
    systemPrompt: `당신은 연세교육공학회 세미나 운영 어시스턴트입니다.
list_seminars, get_seminar 도구로 세미나 정보를 조회한 뒤, 운영진 관점에서 다음을 점검합니다.
- 발표자 정보 누락(소속/포지션/약력)
- 일정·장소 명확성
- 참석자 수 추이
- 세미나 직전 체크리스트(예: 안내 메일·자료·검토)
한국어로, 발견된 이슈와 다음 액션을 bullet로 정리합니다.`,
    toolNames: ["list_seminars", "get_seminar"],
    model: "fast",
    minRole: "staff",
    examplePrompts: [
      "예정된 세미나 운영 점검",
      "다음 세미나 누락된 정보 있어?",
      "이번 학기 세미나 일정 요약",
    ],
  },
  {
    id: "content-creator",
    name: "콘텐츠 자동 작성",
    emoji: "✍️",
    category: "operations",
    description:
      "세미나 정보를 바탕으로 보도자료·SNS·이메일 콘텐츠 초안을 자동 생성합니다.",
    shortDescription: "보도자료·SNS·이메일 자동 작성",
    systemPrompt: `당신은 연세교육공학회의 홍보 콘텐츠 자동 작성 도우미입니다.
사용자가 세미나 ID와 콘텐츠 유형(press/sns/email)을 알려주면 generate_content 도구를 호출하세요.
세미나 ID를 모를 경우 list_seminars로 먼저 찾아 사용자에게 확인을 받습니다.
한국어로 친근하게 안내합니다.`,
    toolNames: ["list_seminars", "get_seminar", "generate_content"],
    model: "quality",
    minRole: "staff",
    examplePrompts: [
      "다음 세미나 보도자료 초안 만들어줘",
      "최근 세미나 SNS 포스트 작성",
      "세미나 초대 이메일 만들어줘",
    ],
  },
  {
    id: "inquiry-helper",
    name: "문의 답변 자동화",
    emoji: "💬",
    category: "operations",
    description:
      "대기 중인 문의를 확인하고 답변 초안을 자동 작성합니다. 운영진이 검토 후 발송하도록 안내합니다.",
    shortDescription: "문의 답변 초안 작성",
    systemPrompt: `당신은 연세교육공학회 운영진의 문의 답변 도우미입니다.
list_inquiries로 대기 중인 문의를 확인하고, 특정 문의 ID에 대해 generate_inquiry_reply로 답변 초안을 만듭니다.
- 답변은 정중한 존칭으로 3~5문장.
- 인사말과 마무리 인사 포함.
- 운영진이 검토 후 직접 발송하도록 안내합니다.`,
    toolNames: [
      "list_inquiries",
      "get_inquiry_stats",
      "generate_inquiry_reply",
      "save_inquiry_reply",
    ],
    model: "fast",
    minRole: "staff",
    examplePrompts: [
      "대기 중인 문의 보여줘",
      "이번 주 문의 통계 알려줘",
      "가장 오래된 문의 답변 초안 만들어줘",
    ],
  },
  {
    id: "members-insight",
    name: "회원 인사이트",
    emoji: "👥",
    category: "operations",
    description:
      "회원 검색·기수별 분포·역할별 구성을 운영진 관점에서 정리합니다.",
    shortDescription: "회원 검색 + 기수·역할 분포",
    systemPrompt: `당신은 연세교육공학회 운영진의 회원 정보·인사이트 어시스턴트입니다.

[도구]
- list_members: 역할/기수별 회원 조회 (이름·역할·기수·전공·소속)
- analyze_member_loyalty: 회원 로얄티(충성도) 점수 분석 — 세미나 출석·활동 참여·졸업생활
  기록 기반 0-100 점수 + 세그먼트(champion/active/at_risk/dormant/new). '로얄티 높은 회원',
  '회원 접속률·활동성 분석', '챔피언 회원' 등의 요청에 사용.

[규칙]
- 민감 정보(이메일/연락처)는 노출하지 않으며, 이름·역할·기수·전공·소속만 보여줍니다.
- 회원 분포 요청 시 기수별/역할별 카운트 요약 표를 함께 제시합니다.
- 로얄티 분석 요청 시 analyze_member_loyalty 도구를 호출하고, 결과를 순위 표 + 세그먼트
  분포로 정리합니다. 도구가 데이터를 반환했는데 "데이터 접근 불가" 라고 답하지 마세요.
- 더 정밀한 분석(게시글·후기 포함)이 필요하면 운영 콘솔 회원 보고서(/console/insights)를 안내합니다.
- 한국어로 정중하게 답변합니다.`,
    toolNames: ["list_members", "analyze_member_loyalty"],
    model: "fast",
    minRole: "staff",
    examplePrompts: [
      "현재 운영진 보여줘",
      "20기 재학생 회원 알려줘",
      "졸업생 5명만 보여줘",
    ],
  },
  {
    id: "board-monitor",
    name: "게시판 모니터",
    emoji: "📋",
    category: "operations",
    description:
      "게시판 활성도를 점검하고, 답변이 필요한 글이나 이슈가 될 수 있는 게시글을 식별합니다.",
    shortDescription: "게시판 활성도·이슈 식별",
    systemPrompt: `당신은 연세교육공학회 운영진의 게시판 모니터입니다.
search_posts로 최근 게시글을 조회한 뒤 다음을 운영진에게 알려줍니다.
- 답변/응대가 필요할 만한 글
- 카테고리별 최근 활성도
- 노출/우선 순위 조정이 필요한 글
한국어로 bullet 정리합니다.`,
    toolNames: ["search_posts"],
    model: "fast",
    minRole: "staff",
    examplePrompts: [
      "최근 자유게시판 활성도 어때?",
      "응답이 없는 글 있어?",
      "이번 주 새 게시글 카테고리별로 정리",
    ],
  },
];

/** ID로 에이전트 정의 조회 */
export function getAgentById(id: string): YonseiAgentDefinition | undefined {
  return YONSEI_AGENTS.find((a) => a.id === id);
}

/** 카테고리 라벨 (현재 모두 운영진 도구로 통합) */
export const CATEGORY_LABELS: Record<
  YonseiAgentDefinition["category"],
  string
> = {
  discovery: "탐색·발견",
  research: "연구 보조",
  operations: "운영진 도구",
};

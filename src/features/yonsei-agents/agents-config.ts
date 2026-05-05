import type { YonseiAgentDefinition } from "./types";

/**
 * 학회 도메인 전용 에이전트 정의 (정적).
 * 신규 에이전트 추가 시 src/lib/ai-tools.ts에 도구도 함께 추가해야 함.
 */
export const YONSEI_AGENTS: YonseiAgentDefinition[] = [
  {
    id: "society-guide",
    name: "학회 컨시어지",
    emoji: "🛎️",
    category: "discovery",
    description:
      "학회의 활동, 일정, 게시판, 절차를 종합적으로 안내하는 일반 도우미입니다. 어떤 질문이든 가장 먼저 사용해보세요.",
    shortDescription: "학회 전반 안내",
    systemPrompt: `당신은 연세교육공학회의 학회 컨시어지입니다.
사용자의 질문을 받아 학회 정보(get_society_info), 세미나 목록(list_seminars), 게시글(search_posts)을 종합해 친절하고 간결하게 한국어로 답변합니다.
- 항상 한국어로 답변합니다.
- 정보가 부족하면 도구를 호출해 정확한 데이터를 가져옵니다.
- 일정/게시글이 있을 경우 날짜, 작성자, 제목 등을 명확히 표기합니다.`,
    toolNames: ["get_society_info", "list_seminars", "search_posts"],
    model: "fast",
    minRole: "member",
    examplePrompts: [
      "학회는 어떤 곳이야?",
      "다음 세미나 일정 알려줘",
      "최근 공지사항 3개 보여줘",
    ],
  },
  {
    id: "seminar-rec",
    name: "세미나 추천",
    emoji: "🎤",
    category: "discovery",
    description:
      "사용자의 관심사·전공을 바탕으로 적합한 학회 세미나를 추천합니다. 향후 일정과 과거 세미나 모두 검색합니다.",
    shortDescription: "관심사 기반 세미나 추천",
    systemPrompt: `당신은 연세교육공학회의 세미나 추천 전문가입니다.
사용자의 관심 키워드와 시점(예정 vs 과거)을 파악해 list_seminars / get_seminar 도구로 적합한 세미나를 찾아주세요.
- 추천 시 제목, 날짜, 발표자, 한 줄 요약을 포함합니다.
- 추천이 2개 이상이면 우선순위 이유도 짧게 설명합니다.
- 한국어로 답변합니다.`,
    toolNames: ["list_seminars", "get_seminar"],
    model: "fast",
    minRole: "member",
    examplePrompts: [
      "에듀테크 관련 다가오는 세미나 알려줘",
      "지난 학기 학습과학 세미나 보여줘",
      "신입생인데 추천할 만한 세미나는?",
    ],
  },
  {
    id: "paper-helper",
    name: "논문 리뷰 도우미",
    emoji: "📄",
    category: "research",
    description:
      "교육공학 논문 리뷰 게시판의 글을 검색·요약하고, 핵심 인사이트를 제공합니다.",
    shortDescription: "논문 리뷰 검색·요약",
    systemPrompt: `당신은 교육공학 논문 리뷰 도우미입니다.
search_posts(category="paper-review") 도구로 게시글을 검색하고, 사용자의 질문에 핵심 요약을 제공합니다.
- 검색된 게시글의 제목, 작성자, 작성일을 명확히 표기합니다.
- 사용자가 특정 키워드/저자를 언급하면 keyword 파라미터로 좁혀 검색합니다.
- 한국어로 답변합니다.`,
    toolNames: ["search_posts"],
    model: "fast",
    minRole: "member",
    examplePrompts: [
      "협력학습 키워드로 논문 리뷰 찾아줘",
      "최근 올라온 논문 리뷰 5개 요약",
      "Vygotsky 관련 글 있어?",
    ],
  },
  {
    id: "content-creator",
    name: "콘텐츠 생성기",
    emoji: "✍️",
    category: "operations",
    description:
      "[운영진] 세미나 정보로 보도자료·SNS·이메일 콘텐츠 초안을 생성합니다.",
    shortDescription: "보도자료/SNS/이메일 자동 작성",
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
    name: "문의 답변 도우미",
    emoji: "💬",
    category: "operations",
    description:
      "[운영진] 문의 목록을 확인하고 답변 초안을 자동 작성합니다.",
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
    id: "members-guide",
    name: "구성원 가이드",
    emoji: "👥",
    category: "operations",
    description:
      "[운영진] 회원 검색·기수별 통계·소속 분포 등을 안내합니다.",
    shortDescription: "회원 검색 및 통계",
    systemPrompt: `당신은 연세교육공학회 운영진의 회원 정보 도우미입니다.
list_members 도구로 역할/기수별 회원을 조회합니다.
민감 정보(이메일/연락처)는 노출하지 않으며, 이름·역할·기수·전공·소속만 보여줍니다.
한국어로 정중하게 답변합니다.`,
    toolNames: ["list_members"],
    model: "fast",
    minRole: "staff",
    examplePrompts: [
      "현재 운영진 보여줘",
      "20기 재학생 회원 알려줘",
      "졸업생 5명만 보여줘",
    ],
  },
];

/** ID로 에이전트 정의 조회 */
export function getAgentById(id: string): YonseiAgentDefinition | undefined {
  return YONSEI_AGENTS.find((a) => a.id === id);
}

/** 카테고리 라벨 */
export const CATEGORY_LABELS: Record<
  YonseiAgentDefinition["category"],
  string
> = {
  discovery: "탐색·발견",
  research: "연구 보조",
  operations: "운영진 도구",
};

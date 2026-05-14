import type { AgentWorkflowDefinition } from "./workflow-types";

/**
 * 에이전트 워크플로우 정의 (정적) — Sprint 70.
 *
 * 각 워크플로우는 기존 yonsei-agents (agents-config.ts) 를 stage 로 묶어 순차 실행.
 * stage 의 promptTemplate 에서 {{userInput}}·{{prevOutput}}·{{stageN}} 이 실행 시 치환된다.
 *
 * 신규 워크플로우 추가: AGENT_WORKFLOWS 에 append. stages 의 agentId 는 반드시
 * agents-config.ts 에 존재해야 한다.
 */
export const AGENT_WORKFLOWS: AgentWorkflowDefinition[] = [
  {
    id: "seminar-promotion",
    name: "세미나 홍보 콘텐츠 제작",
    emoji: "📣",
    description:
      "최근 게시판·세미나 동향을 파악한 뒤 그 맥락을 반영한 홍보 콘텐츠를 자동 작성하는 2단계 워크플로우.",
    shortDescription: "동향 파악 → 홍보 콘텐츠 작성",
    minRole: "staff",
    examplePrompts: [
      "이번 달 정기 세미나 홍보글을 만들어줘",
      "신입생 대상 세미나 안내 콘텐츠 작성",
    ],
    stages: [
      {
        index: 0,
        agentId: "board-monitor",
        label: "게시판·세미나 동향 파악",
        promptTemplate:
          "다음 요청과 관련된 최근 게시판·세미나 활동 동향을 조사해 핵심을 3~5줄로 정리해줘.\n\n[요청]\n{{userInput}}",
      },
      {
        index: 1,
        agentId: "content-creator",
        label: "홍보 콘텐츠 작성",
        promptTemplate:
          "아래 동향 정리를 참고해 학회 홍보 콘텐츠를 작성해줘. 원래 요청 의도를 우선하되, 동향에서 드러난 회원 관심사를 반영해.\n\n[원래 요청]\n{{userInput}}\n\n[최근 동향 정리]\n{{prevOutput}}",
      },
    ],
  },
  {
    id: "member-ops-report",
    name: "회원 운영 종합 리포트",
    emoji: "📊",
    description:
      "회원 인사이트 분석 → 게시판 활동 모니터링 → 종합 운영 리포트 작성까지 3단계로 운영진 의사결정 자료를 생성.",
    shortDescription: "회원 분석 → 활동 모니터 → 종합 리포트",
    minRole: "staff",
    examplePrompts: [
      "이번 학기 회원 운영 현황 리포트 만들어줘",
      "최근 회원 활동성 종합 분석",
    ],
    stages: [
      {
        index: 0,
        agentId: "members-insight",
        label: "회원 인사이트 분석",
        promptTemplate:
          "다음 요청에 대한 회원 인사이트를 분석해줘.\n\n[요청]\n{{userInput}}",
      },
      {
        index: 1,
        agentId: "board-monitor",
        label: "게시판 활동 모니터",
        promptTemplate:
          "최근 게시판 활동 동향을 조사해 회원 참여도 관점에서 핵심을 정리해줘.\n\n[참고 — 회원 인사이트]\n{{stage0}}",
      },
      {
        index: 2,
        agentId: "operations-concierge",
        label: "종합 운영 리포트 작성",
        promptTemplate:
          "아래 두 분석을 종합해 운영진용 회원 운영 리포트를 작성해줘. 현황 요약 + 발견된 이슈 + 권장 액션 구조로.\n\n[원래 요청]\n{{userInput}}\n\n[회원 인사이트]\n{{stage0}}\n\n[게시판 활동 모니터]\n{{stage1}}",
      },
    ],
  },
  {
    id: "inquiry-faq-content",
    name: "문의 → FAQ 콘텐츠화",
    emoji: "❓",
    description:
      "회원 문의를 분석해 답변 방향을 잡고, 자주 묻는 질문을 공지·자료실용 FAQ 콘텐츠로 가공하는 2단계 워크플로우.",
    shortDescription: "문의 분석 → FAQ 콘텐츠 작성",
    minRole: "staff",
    examplePrompts: [
      "최근 자주 들어온 문의를 FAQ로 만들어줘",
      "회원 문의 기반 공지 콘텐츠 작성",
    ],
    stages: [
      {
        index: 0,
        agentId: "inquiry-helper",
        label: "문의 분석·답변 방향 정리",
        promptTemplate:
          "다음 요청과 관련된 문의를 분석해 자주 묻는 질문과 답변 방향을 정리해줘.\n\n[요청]\n{{userInput}}",
      },
      {
        index: 1,
        agentId: "content-creator",
        label: "FAQ 콘텐츠 작성",
        promptTemplate:
          "아래 문의 분석을 바탕으로 공지·자료실에 게시할 FAQ 콘텐츠를 작성해줘. 질문-답변 형식으로 명확하게.\n\n[문의 분석]\n{{prevOutput}}",
      },
    ],
  },
];

/** id 로 워크플로우 정의 조회 */
export function getWorkflowById(
  id: string,
): AgentWorkflowDefinition | undefined {
  return AGENT_WORKFLOWS.find((w) => w.id === id);
}

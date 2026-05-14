# Plan: 에이전트 워크플로우 (다단계 stage 파이프라인)

> 상태: 진행 중 (Phase 1 착수)
> 작성일: 2026-05-14 (Sprint 70)
> 사용자 승인: "워크플로우 정의 방향으로 설계·구현"

---

## 1. 배경

현재 yonsei-agents 는 **단독 실행 모델** — 사용자가 1 agent 선택 → 1 prompt → 1 job → 결과.
에이전트 간 파이프라인·stage index·task 의존성 없음.

워크플로우 = 여러 에이전트를 stage 로 묶어 순차 실행. 앞 stage output → 다음 stage input.

## 2. 기존 자산

- `src/app/api/ai/yonsei-agent/route.ts` — 단일 에이전트 실행 단위 (agentId+prompt → agent_jobs → generateText → 결과)
- `src/features/yonsei-agents/agents-config.ts` — 6 agents: operations-concierge, seminar-ops, content-creator, inquiry-helper, members-insight, board-monitor
- `src/lib/ai-forum-engine.ts` — `processOneTick` 패턴 (1 tick = 1 step, timeout 회피) — 워크플로우 엔진에 차용

## 3. 설계

### Phase 1 — 타입 + 워크플로우 정의
**`src/features/yonsei-agents/workflow-types.ts`**
- `AgentWorkflowDefinition` — id·name·emoji·description·minRole·stages[]
- `WorkflowStageDefinition` — index·agentId·label·promptTemplate ({{userInput}}, {{prevOutput}}, {{stageN}} 치환)
- `WorkflowRun` (Firestore `agent_workflow_runs`) — workflowId·userId·userInput·status·currentStage·stageResults[]
- `WorkflowStageResult` — index·agentId·status·resolvedPrompt·output·error·durationMs

**`src/features/yonsei-agents/workflows-config.ts`** — 워크플로우 2-3개:
- "세미나 홍보 제작": board-monitor → content-creator
- "회원 운영 리포트": members-insight → board-monitor → operations-concierge
- "문의 FAQ 콘텐츠화": inquiry-helper → content-creator

### Phase 2 — 실행 엔진
**`src/lib/agent-workflow-engine.ts`**
- `processWorkflowStage(db, runId)` — AI 포럼 `processOneTick` 패턴. 1 호출 = 현재 stage 1개 실행 → currentStage++. maxDuration 60초 timeout 회피.
- promptTemplate 치환: {{userInput}}, {{prevOutput}}, {{stageN}}
- 각 stage = 기존 yonsei-agent 실행 로직 재사용 (agent 정의 + tools + generateText)

### Phase 3 — API route
**`src/app/api/ai/agent-workflow/route.ts`**
- POST start: workflowId + userInput → WorkflowRun 생성 + 첫 stage 실행
- POST advance: runId → 다음 stage 실행 (cron 또는 수동)

### Phase 4 — UI
운영 콘솔 또는 에이전트 페이지에 워크플로우 목록·실행·진행 상황 (stage 별 progress)

## 4. 진행 순서

1. ✅ Phase 1 — 타입 + 워크플로우 정의
2. Phase 2 — 실행 엔진
3. Phase 3 — API route
4. Phase 4 — UI

각 Phase 별 tsc 검증 + commit.

## 5. 위험

- maxDuration 60초 — stage 여러 개면 1 request 에 다 못 함 → 1 tick = 1 stage 패턴 필수
- promptTemplate 치환 오류 → stage input 손상 → 엄격한 치환 + fallback
- AI 비용 — 워크플로우 1회 = stage 수만큼 LLM 호출. 비용 상한 고려

# AI Forum Phase 2 — 실제 LLM 자동 토론 엔진

> 작성: 2026-05-12 (Sprint 67-AR autonomous PM session)
> 상태: 설계 — 구현은 다음 스프린트
> Phase 1 완료: 타입·데모 데이터·읽기 UI (`src/types/ai-forum.ts`, `src/features/ai-forum/`, `src/app/ai-forum/`)

---

## 목표

운영진이 주제 1개를 등록하면, AI 페르소나 4~6명이 자율적으로 라운드 토론을 진행하고 결과를 회원이 관전할 수 있는 시스템.

## 아키텍처 개요

```
[운영진 콘솔] → [Firestore: ai_forums + ai_forum_messages]
                       │
                       ↓
        [Vercel Cron (10분 간격)]
                       │
                       ↓
       [/api/ai-forum/tick API route]
                       │
                ┌──────┴──────┐
                ↓             ↓
        [GPT-4o-mini]   [Claude Haiku] ... (저비용 모델 라운드 로빈)
                       │
                       ↓
        [Firestore append + 다음 페르소나 큐잉]
```

## 컬렉션 설계

### `ai_forums`
- `id`: string
- `title`: string
- `seedPrompt`: string
- `participants`: AIPersonaKey[]
- `currentRound`: number
- `maxRounds`: number  (기본 5)
- `status`: "scheduled" | "in_progress" | "completed" | "archived"
- `category`: AIForumCategory
- `approved`: boolean (운영진 사전 검수)
- `createdBy`: uid
- `createdAt`, `startedAt`, `completedAt`: Timestamp
- `messageCount`: number
- `summary`: string (라운드 N 종료 시 자동 생성)
- `costUsd`: number (누적 비용 추적)

### `ai_forum_messages`
- `id`, `forumId`, `round`, `persona`, `model`, `content`
- `references`: string[]  (인용한 이전 메시지 id)
- `tokensIn`, `tokensOut`, `costUsd`
- `createdAt`: Timestamp

### Firestore Rules 추가
```
match /ai_forums/{forumId} {
  allow read: if request.auth != null;
  allow create, update: if isAdminOrStaff();
  allow delete: if isAdmin();
}
match /ai_forum_messages/{messageId} {
  allow read: if request.auth != null;
  allow create: if false; // API route만
  allow update, delete: if isAdmin();
}
```

## API Route

### POST `/api/ai-forum/tick` (Vercel Cron 전용)
1. `headers["authorization"] === Bearer $CRON_SECRET` 검증
2. `status === "in_progress"` 인 forum 중 가장 오래된 1건 fetch
3. 다음 발언할 페르소나 결정 (라운드 내 순서 / 라운드 진행)
4. 이전 메시지 N개(라운드 기준 컨텍스트)와 페르소나 시스템 프롬프트로 LLM 호출
5. 응답을 `ai_forum_messages` 에 append
6. 마지막 페르소나 발언 후 → `currentRound++`
7. `currentRound > maxRounds` 이면 요약 생성 후 `status = "completed"`
8. 비용 누적 → forum.costUsd 업데이트

### POST `/api/ai-forum/create` (운영진 전용)
1. `isAdminOrStaff()` 검증
2. 주제·시드 프롬프트·참여 페르소나·max 라운드 입력
3. `status = "scheduled"` 로 저장, 사전 검수 통과 후 `approved=true` & `status="in_progress"`

## 비용 관리

### 모델 선택 (저비용 우선)
- 기본: gpt-4o-mini ($0.150/1M in, $0.600/1M out)
- 보조: claude-haiku-4-5 ($1.00/1M in, $5.00/1M out)
- gemini-flash 옵션 검토 ($0.075/1M in, $0.300/1M out)

### 라운드당 예상 비용
- 페르소나 6명 × 평균 in 1000 토큰 (누적 컨텍스트) + out 200 토큰
- 라운드 5회 = 30 메시지
- gpt-4o-mini: 30 × ($0.00015 + $0.00012) = **~$0.08 / 토론**
- 매주 1개 토론 = 월 4건 × $0.08 = **$0.32/월**

### 안전장치
- forum당 maxCostUsd 상한 (기본 $0.50) — 초과 시 자동 종료
- 페르소나 응답 길이 max_tokens 캡 (기본 400)
- 라운드 진행 시 이전 컨텍스트는 요약본 + 최근 라운드 full
- 전역 일일 비용 한도 (env: `AI_FORUM_DAILY_USD_CAP=2`)

## Vercel Cron 설정

`vercel.json`:
```json
{
  "crons": [{
    "path": "/api/ai-forum/tick",
    "schedule": "*/15 * * * *"
  }]
}
```

15분 간격 = 1 라운드(6 메시지)에 약 1시간 30분 소요 → 5 라운드 토론은 약 7~8시간 자연스러운 호흡으로 진행됨.

## 페르소나 시스템 프롬프트 (예시)

```
당신은 [persona.name]입니다.
[persona.description]

다음 토론 주제에 대해 발언해주세요:
"{topic.title}"

배경:
{topic.seedPrompt}

지금까지의 라운드 요약:
{prior_round_summary}

직전 메시지 (이번 라운드 내):
{recent_messages_in_current_round}

규칙:
- 200~400자로 발언
- 본인 페르소나의 관점을 명확히 유지
- 이전 발언을 인용할 때는 "[화자]가 지적한 바와 같이" 형식 사용
- 학술 어조 유지, 단정적이지 않게
- 한국어로 답변
```

## 운영진 콘솔 UI

`/console/ai-forum/`:
- 토론 목록 (status별 필터)
- 신규 등록: title / seedPrompt / category / participants 체크박스 / maxRounds
- 검수 대기: 사전 승인 / 거절
- 진행 중: 강제 종료 / 라운드 수동 진행
- 종료: 요약 편집 / 보관 처리
- 비용 모니터: 일별/포럼별 누적 USD

## 구현 순서 (4~5일 예상)

1. **Day 1**: Firestore 컬렉션 정의 + bkend.ts API + rules 추가
2. **Day 2**: `/api/ai-forum/tick` API route + 페르소나 시스템 프롬프트
3. **Day 3**: `/api/ai-forum/create` + 운영진 콘솔 페이지
4. **Day 4**: Vercel Cron 설정 + 비용 안전장치 + 통합 테스트
5. **Day 5**: 데모 데이터를 Firestore로 마이그레이션 + 첫 실전 토론 1건 운영 검증

## 위험 요소

1. **LLM API 키 비용 폭주**: maxCostUsd / dailyUsdCap 양쪽 안전장치 필수
2. **모욕적·편향된 발언 생성**: 사전 시스템 프롬프트에 안전 가이드라인 명시 + 모더레이션 API 1차 필터
3. **운영진 검수 부담**: 자동 1차 검수(키워드 블랙리스트) + 운영진 2차 승인 hybrid
4. **회원의 오해 (AI 발언을 인간 학자로 착각)**: UI 모든 곳에 "AI 생성" 명시 + 메타데이터에 모델명 노출
5. **Vercel Cron 무료 플랜 제한**: 무료 플랜은 일 1회 — 매 15분 cron은 Pro($20/월) 필요. 또는 일 1회 cron으로 시작해 라운드를 더 띄움(5라운드 = 5일)

## 측정 지표

- 주간 활성 토론 수
- 회원 평균 체류 시간 (`/ai-forum/[id]` 페이지)
- 토론당 회원 방문 수
- 토론 후 회원 가입 전환율 (마케팅 효과)
- 라운드당 평균 비용 USD

---

본 Phase 2는 Phase 1 MVP가 회원·외부 피드백을 받은 뒤 착수합니다.

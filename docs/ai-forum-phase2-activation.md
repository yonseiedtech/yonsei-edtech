# AI 포럼 Phase 2 활성화 가이드

> 작성: 2026-05-12 (Sprint 67-AR autonomous PM session)
> 대상: 운영진 / 시스템 관리자
> 코드 상태: Phase 2 cron 라우트 + vercel.json cron 등록 완료

---

## 현재 상태

- ✅ 운영진 콘솔 `/console/ai-forum` — 토론 등록·개최·중지 UI
- ✅ `/api/cron/ai-forum-tick` — 6시간 주기 cron 라우트
- ✅ Firestore rules — `ai_forums` + `ai_forum_messages` 접근 제어
- ✅ vercel.json — cron 1개 추가 (`0 */6 * * *`)
- ⚠️ 환경변수 미설정 시 cron 실행되지만 401 반환 (Unauthorized)

## 활성화 단계

### 1. CRON_SECRET 설정 (필수)

Vercel 프로젝트 환경변수에 추가:

```
CRON_SECRET=<랜덤 64자 문자열>
```

생성 예시:
```bash
openssl rand -hex 32
```

### 2. GOOGLE_GENERATIVE_AI_API_KEY 확인 (필수)

이미 다른 AI 엔드포인트가 사용 중이라면 동일 키 재사용 가능.
없는 경우 Google AI Studio (https://aistudio.google.com/apikey)에서 발급.

### 3. 첫 토론 등록 + 개최

운영진 계정으로 로그인 후:

1. https://yonsei-edtech.vercel.app/console/ai-forum
2. "새 토론 등록" 버튼
3. 주제 / 시드 프롬프트 / 카테고리 / 페르소나 4명 이상 / max 라운드 5 입력
4. 등록 후 토론 카드의 "개최" 버튼 클릭

### 4. 첫 라운드 진행 모니터링

- 6시간 이내 첫 메시지가 자동 생성됨
- 6명 페르소나 × 5라운드 = 30 메시지 → 약 7~8일 소요
- 관전 페이지 `/ai-forum/{id}` 에서 실시간 확인

## 비용 추정

### 토론당 (5라운드, 6 페르소나)
- 페르소나 6명 × 라운드 5회 = 30 메시지
- 평균 입력 1000 토큰 (누적 컨텍스트) + 출력 450 토큰
- Gemini Flash: 30 × ($0.075/1M × 1000 + $0.300/1M × 450) ≈ **$0.006 / 토론**

### 안전장치
- `MAX_FORUM_COST_USD = 0.5` — 토론당 50센트 상한 도달 시 자동 종료
- `MAX_OUTPUT_TOKENS = 450` — 발언 길이 캡
- `PRIOR_MESSAGES_CONTEXT = 6` — 입력 컨텍스트 6개로 제한
- forum.costUsd, messageCount 실시간 누적

### 월간 운영비 시뮬레이션
- 주 1건 신규 토론 = 월 4건 × $0.006 = **약 $0.024/월**
- 매우 저렴 (현실적으로 한 자릿수 달러 이하)

## 페르소나 시스템 프롬프트

`src/app/api/cron/ai-forum-tick/route.ts` 의 `buildSystemPrompt()` 함수에서 정의.
페르소나별 톤 조정 시 본 함수 + `AI_PERSONAS` (`src/types/ai-forum.ts`) 의 `description` 동시 수정.

## 종료 후 자동 요약

마지막 라운드 종료 시 Gemini Flash 가 토론 전체를 받아 "합의된 사항 / 미해결 과제" 형식 요약을 자동 생성하여 `forum.summary` 에 저장.

## 운영 체크리스트

- [ ] CRON_SECRET 환경변수 설정
- [ ] GOOGLE_GENERATIVE_AI_API_KEY 환경변수 확인
- [ ] 운영진 계정으로 첫 토론 등록·개최
- [ ] 6시간 후 첫 메시지 자동 생성 확인
- [ ] Firebase 콘솔에서 ai_forum_messages 컬렉션 적재 확인
- [ ] 비용 추적 (forum.costUsd) 모니터링

## 트러블슈팅

### cron이 401 응답
→ CRON_SECRET 미설정 또는 Vercel cron 요청 헤더와 불일치.
Vercel 자동 cron은 `authorization: Bearer ${CRON_SECRET}` 헤더 자동 포함됨.

### "권한 거부" / Firestore 403
→ Firebase Admin SDK 가 ai_forums / ai_forum_messages 컬렉션에 쓸 수 있어야 함.
firestore.rules 의 `create: if false` (클라이언트 차단)은 Admin SDK에 영향 없음 (Admin SDK는 rules 우회).

### 동일 페르소나가 한 라운드에 2번 발언
→ `spokenInRound` 검사 로직 실패. `ai_forum_messages` 인덱스 누락 또는 timing race. 로그 확인.

### 토론이 in_progress 인데 진행 안 됨
→ 비용 상한 도달 (status: completed, autoStopReason: max_cost_exceeded) 확인.
또는 모든 페르소나가 maxRounds 까지 발언 완료된 상태인지 확인.

---

본 가이드는 Phase 2 활성화 1회만 필요한 작업입니다.

# H4 (v9) 지표 정확성 감사 보정 — 처리 결과 (A급 2 + B급 6)

> 원 감사: `docs/plans/metrics-verification-h4v9-2026-07-21.md` · 처리: executor · 2026-07-20
> 검증: `npx tsc --noEmit` src 에러 0 · `npx eslint` 대상 5파일 통과(무경고). build·commit 미수행.
> 대상 파일: `src/features/insights/adoption-metrics.ts`, `FunnelSection.tsx`,
> `SuggestedActionsSection.tsx`, `DigestStatsSection.tsx`,
> `src/app/api/cron/weekly-digest/route.ts`, `firestore.indexes.json`
> 오탐 방지 기록(비이슈 3건: active7d/30d·computeGoalStreak 경계·hoursAfterSend 앵커)은 미변경.

## A급

### A1 — `cnt2` 혼합 타입 부등식 과대집계 (보수적 수정 채택)
- **파일**: `adoption-metrics.ts:80-94`
- **조치**: 라이브 프로브 대신 **타입 범위 폐색**으로 보수 수정. Timestamp 하한 쿼리에
  Timestamp 상한(`tsMax = 3000-01-01`)을 AND 로 추가 → `where(field,">",tsCut).where(field,"<",tsMax)`.
  Firestore 값 타입 정렬(Timestamp < String)상 문자열 createdAt 문서는 상한 초과로 배제되어,
  `b` 가 문자열 문서 전체 이력을 흡수하던 과대집계 제거. `a`(문자열 하한)는 원래 오염 없음 → 유지.
- **영향 지표 정상화**: readingLogs30d·sessions30d·posts30d·comments30d·diagnostics.completed30d.
  표시 문구 변경 불필요(정의 동일, 값만 정확해짐).

### A2 — 퍼널 조회 `limit(500)` + orderBy 부재로 최근 30일 이벤트 누락
- **파일**: `FunnelSection.tsx:53-77`, `SuggestedActionsSection.tsx:93-117`, `firestore.indexes.json`
- **조치**: 두 `fetchFunnelRows` 에 서버측 `where("createdAt",">=",cutoffISO)` + `orderBy("createdAt","desc")`
  추가, `limit` 500→2000 상향. 최신부터 잘라와 누적 500 초과 시 최근 이벤트가 잘리던 문제 해소.
  클라이언트 30일 필터는 안전망으로 유지. `user_activity_logs.createdAt` 은 ISO 문자열이라 문자열 비교로 정확.
- **인덱스**: `user_activity_logs` 복합 인덱스 `funnelType ASC, createdAt DESC` 추가.
  **배포 필요**(`firebase deploy --only firestore:indexes`) — 미배포 시 쿼리 실패로 섹션이 조용히 숨겨짐.

## B급

### B1 — responseRate 분자 소스 불일치(answerCount 의존)
- **파일**: `adoption-metrics.ts` 멘토링 블록
- **조치**: 답변 유무 판정을 정규화 필드 `answerCount` 대신 **`comm_answers` 의 distinct `questionId` 집합**으로 전환.
  질문/답변을 보드별 병렬 조회 후 answeredQ Set 으로 mWithAnswers 판정. `answerCount` 미갱신 시 responseRate 과소 제거.
  `mAnswers` 도 comm_answers 실제 문서 수(`ans.size`)로 집계.

### B2 — 멘토링 보드 선택자 불일치(contextType vs contextId)
- **파일**: `adoption-metrics.ts` 멘토링 블록
- **조치**: adoption 의 보드 선택자를 `where("contextType","==","mentoring")` →
  다이제스트 `loadMentorPendingByUser` 와 동일한 `where("contextId","==",MENTORING_CONTEXT_ID)` 로 통일.
  `@/features/mentoring/topics` 에서 상수 import. contextType 태깅 누락 보드로 인한 콘솔↔이메일 모집단 불일치 제거.

### B3 — `draft = notPublished − held` 뺄셈 추정 취약
- **파일**: `adoption-metrics.ts` M4 블록
- **조치**: 스키마 확인 결과 4개 검수형 컬렉션(연구방법·통계방법·기초용어·학술글쓰기)은
  `published` boolean 게이트만 사용(타입에 reviewStatus/held 없음). 따라서 보고서의
  "reviewStatus=='draft' 직접 카운트" 는 부적합 → **draft(대기)=published==false 직접 합산**으로
  뺄셈 추정을 제거(음수 클램프로 인한 draft 과소 해소). held 는 reviewStatus 독립 집계로 유지(실측 0).
  콘솔 표시 라벨(대기/보류)은 의미 그대로라 변경 불필요.

### B4 — 열람률·CTR 이 고유 아닌 이벤트 총량 → 100% 초과 가능
- **파일**: `DigestStatsSection.tsx` 주차별 표 하단
- **조치**: 값 자체는 히트 총량 근사라 유지하되, **표 하단 상시 각주 추가** — "열람·클릭은 픽셀/링크
  총 히트 수(고유 수신자 아님) — 재열람·프록시 재요청 시 CTR·열람률이 100%를 초과할 수 있음".
  지표 정의와 표시 문구를 일치(클램프 대신 정의 표기, 보고서 권장 방향).

### B5 — weekly_goal_records 적재가 다이제스트 발송에 종속 → 스트릭 단절
- **파일**: `weekly-digest/route.ts`
- **조치**: `sendDigest` 내부의 `weekly_goal_records` upsert 를 제거하고, 신규
  `persistWeeklyGoalRecords(db, lastWeekKey)` 로 분리 — `_handler` 에서 sendDigest 이전에
  **승인 회원 전원 대상**으로 실행. 콘텐츠 0건 조기반환·weeklyDigest off·조용시간과 무관하게
  목표 설정자의 met 기록이 적재되어 computeGoalStreak/recentWeekBars 의 스트릭 과소 해소.
  sendDigest 는 이메일 개인화(회고 인용)만 담당. 응답에 `goalRecords` 카운트 노출.

### B6 — getRecentWeekKeys 가 브라우저 로컬 타임존 기준
- **파일**: `DigestStatsSection.tsx:29-48`
- **조치**: weekKey 생성을 `Asia/Seoul` 벽시계 고정으로 전환(`toLocaleString("en-US",{timeZone:"Asia/Seoul"})`
  + 수동 YMD 포맷). 서버 저장 키(todayYmdKst KST 월요일)와 일치 → 비-KST 로케일 관리자에서 표가
  0/"—" 로 어긋나던 드리프트 제거.

## 미처리(범위 외)
- C급 7건 및 B6/C5 의 "운영진 판단" 학기 경계(cohortKeyOf) 정의는 본 태스크 범위(A급+B급 코드 보정) 밖.
- A2 인덱스는 코드에 반영했으나 실제 반영은 `firestore:indexes` 배포 필요(게이트 단계).

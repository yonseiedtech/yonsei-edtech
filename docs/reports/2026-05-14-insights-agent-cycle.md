# 사이클 보고서 — AI 에이전트 로얄티 분석 복구 & insights 대시보드 개선

- **날짜**: 2026-05-14
- **모드**: 자율 PM 모드
- **트리거**:
  1. "AI 학회장" 회원 로얄티 분석 작업 할당 시 "데이터 접근이 어려운 상황" 무용 응답 발생
  2. "/console/insights 분석 대시보드를 분석하고 개선 프로젝트를 자율 PM 모드로 진행"

---

## 1. 개요

운영진이 AI 학회장(yonsei-agents)에게 "회원 접속률·로얄티 분석"을 지시했으나,
members-insight 에이전트가 보유한 도구(`list_members`)로는 활동 데이터를 집계할 수 없어
"데이터 접근 불가"라는 무용한 응답을 반환하던 문제를 해소했다.
병행하여 `/console/insights` 회원 보고서의 데이터 정합성 버그를 수정하고,
데이터 수집 로직을 훅으로 추출 + 세그먼트 분포 시각화를 추가했다.

---

## 2. 산출물

| 구분 | 파일 | 내용 |
|------|------|------|
| 신규 | `src/lib/ai-tools.ts` (`analyze_member_loyalty`) | staff 전용 로얄티 분석 도구 |
| 수정 | `src/features/yonsei-agents/agents-config.ts` | members-insight 에이전트에 도구 연결 + 프롬프트 보강 |
| 신규 | `src/features/insights/useMemberMetrics.ts` | 12개 컬렉션 조회 + 집계 훅 |
| 수정 | `src/features/insights/MemberReportView.tsx` | 훅 사용으로 리팩터링 + 세그먼트 분포 차트 |

---

## 3. 도메인별 결과

### 3.1 AI 에이전트 — 로얄티 분석 도구

- `analyze_member_loyalty` 도구 신설: `getAdminDb()`로 승인 회원 + 3개 활동 컬렉션
  (`seminar_attendees`·`activity_participations`·`grad_life_positions`)을 조회해
  `computeMemberMetrics`로 0-100 로얄티 점수와 세그먼트를 산출, 상위 N명 + 세그먼트 분포 반환.
- members-insight 에이전트 `toolNames`에 추가, 시스템 프롬프트에 도구 사용 규칙 명시
  ("도구가 데이터를 반환했는데 데이터 접근 불가라고 답하지 말 것").
- 정밀 분석은 운영 콘솔 회원 보고서로 안내하도록 가이드.

### 3.2 insights 대시보드

- **데이터 버그 수정**: `MemberReportView`가 세미나 후기를 `reviews` 컬렉션에서 조회 →
  코드베이스 전체가 `seminar_reviews`를 쓰므로 로얄티 점수의 후기 항목(max 10점)이
  항상 0이던 문제. `seminar_reviews`로 통일.
- **Group B (구조 개선)**: 12개 `useQuery` + 집계 `useMemo`를 `useMemberMetrics` 훅으로 추출.
  MemberReportView 636 → 약 380줄. 향후 인사이트 위젯에서 재사용 가능.
- **Group A (UI)**: 회원 세그먼트 분포 시각화 추가 — champion/active/new/at_risk/dormant
  5개 구간의 가로 누적 막대 + 범례(인원수·비율).

---

## 4. Commits

| 해시 | 메시지 |
|------|--------|
| `8b8b0126` | feat: members-insight 에이전트에 analyze_member_loyalty 도구 추가 |
| `7660bb30` | refactor: insights 회원 보고서 데이터 훅 추출 + 세그먼트 분포 차트 |

---

## 5. 검수 URL

- 운영 콘솔 인사이트: https://yonsei-edtech.vercel.app/console/insights (회원 보고서 탭)
- AI 에이전트: https://yonsei-edtech.vercel.app/console/agents → members-insight 에 "로얄티 높은 회원 분석" 지시

검수 포인트:
1. AI 학회장에게 로얄티 분석 지시 시 실제 순위 표 + 세그먼트 분포 응답이 오는지
2. 회원 보고서 상단에 세그먼트 분포 막대가 표시되는지
3. 로얄티 Top 10의 "후기" 점수 칩이 0이 아닌 값으로 표시되는지 (버그 수정 검증)

---

## 6. 잔여 작업

- insights Group C (성능/캐싱): `useMemberMetrics`의 12개 쿼리에 `staleTime` 설정 검토
- insights Group D (선택): 기수별 로얄티 추이, 세그먼트 이동 추적 등 고급 기능
- `analyze_member_loyalty`는 게시글·후기 등 콘텐츠 카운트를 수집하지 않음(required 3종만) →
  필요 시 콘텐츠 컬렉션 추가 조회로 정밀도 향상 가능

---

## 7. 교훈

- **컬렉션명 불일치는 조용한 버그**: `reviews` vs `seminar_reviews`는 타입 에러 없이
  통과하며 점수만 0으로 만든다. 신규 데이터 소스 추가 시 `src/lib/bkend.ts`의
  정식 API 래퍼를 거치면 이런 불일치를 예방할 수 있다.
- **에이전트 무용 응답의 원인은 도구 부재**: LLM이 "데이터 접근 불가"라고 답하면
  프롬프트가 아니라 `toolNames`에 필요한 도구가 있는지부터 확인해야 한다.
- **인라인 데이터 수집은 재사용을 막는다**: MemberReportView의 12개 쿼리가 컴포넌트에
  묶여 있어 에이전트 도구가 같은 로직을 admin SDK로 재구현해야 했다. 훅 추출로
  최소한 클라이언트 측 재사용은 확보.

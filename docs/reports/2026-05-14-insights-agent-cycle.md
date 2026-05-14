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

- `analyze_member_loyalty` 도구 신설: `getAdminDb()`로 승인 회원 + 활동 컬렉션을 조회해
  `computeMemberMetrics`로 0-100 로얄티 점수와 세그먼트를 산출, 상위 N명 + 세그먼트 분포 반환.
- members-insight 에이전트 `toolNames`에 추가, 시스템 프롬프트에 도구 사용 규칙 명시
  ("도구가 데이터를 반환했는데 데이터 접근 불가라고 답하지 말 것").
- **2차 확장**: 초기 3개 컬렉션(출석·활동·졸업생활)만 사용 → 콘솔 회원 보고서(12개 컬렉션)와
  점수·세그먼트 라벨이 어긋나는 문제 발견. 콘텐츠(게시물·댓글·인터뷰)·연구(타이머·논문·계획서)·
  후기(세미나·강의) 컬렉션을 모두 병렬 조회하여 콘솔과 **동일한 5개 카테고리 산출식**으로 통일.

### 3.2 insights 대시보드

- **데이터 버그 수정**: `MemberReportView`가 세미나 후기를 `reviews` 컬렉션에서 조회 →
  코드베이스 전체가 `seminar_reviews`를 쓰므로 로얄티 점수의 후기 항목(max 10점)이
  항상 0이던 문제. `seminar_reviews`로 통일.
- **Group B (구조 개선)**: 12개 `useQuery` + 집계 `useMemo`를 `useMemberMetrics` 훅으로 추출.
  MemberReportView 636 → 약 380줄. 향후 인사이트 위젯에서 재사용 가능.
- **Group A (UI)**: 회원 세그먼트 분포 시각화 추가 — champion/active/new/at_risk/dormant
  5개 구간의 가로 누적 막대 + 범례(인원수·비율).
- **Group C (성능)**: `useMemberMetrics` 12개 쿼리에 `staleTime` 5분 적용 — insights 탭
  간 이동 시 무거운 컬렉션 중복 조회 방지.
- **Group D 일부 (UI)**: 기수별 평균 로얄티 막대 + 활성 세그먼트 비율 추가 — 운영진이
  어느 기수 코호트가 가장 활발한지 한눈에 파악 가능.
- **Group D 추이 (효율 버전)**: 활동 모멘텀 — 스냅샷 인프라 없이 활동 컬렉션의
  타임스탬프(`checkedInAt`·`createdAt`·`submittedAt`)로 **최근 30일 vs 이전 30일**
  활동 이벤트 수를 비교. 상승/유지/하락 분포 + "식어가는 회원" 하락폭 순 리스트로
  운영진이 선제적 재참여 유도 대상을 파악. 활동 이벤트 = 세미나 출석·활동 참여·게시물·
  댓글·인터뷰 응답·연구 세션·후기 작성 8종.

### 3.3 Group D 진짜 시계열 — 로얄티 스냅샷 인프라

- **공용 서버 함수 추출**: `snapshotMemberMetrics(db)` — 콘솔과 동일한 12개 컬렉션
  산출식을 firebase-admin 직접 조회로 재현. `analyze_member_loyalty` 도구의 인라인
  로직을 이 함수로 대체(도구가 얇아짐) → cron·도구가 동일 로직 공용.
- **cron 적재**: `/api/cron/loyalty-snapshot` — 주 1회(월 09:00 KST) 승인 회원 전체의
  로얄티·세그먼트를 `loyalty_snapshots/{YYYY-MM-DD}`에 적재. 같은 날 재실행 idempotent.
  admin POST 핸들러로 수동 캡처도 지원.
- **추이 UI**: `LoyaltyTrendSection` — 평균 로얄티 추이 라인 차트 + 직전 스냅샷 대비
  세그먼트 이동(상승/하락 인원). admin "지금 캡처" 버튼으로 첫 스냅샷 즉시 시딩 가능.
- 스냅샷이 누적될수록 가치가 커지는 구조 — 활동 모멘텀(3.2)이 인프라 없는 추이 신호라면,
  본 스냅샷은 진짜 시계열 기반 장기 추이.

### 3.4 라우트 정리 (dead-code 인벤토리)

- 백그라운드 dead-code 에이전트가 세션 내내 무응답 → 인벤토리를 직접 수행 후 에이전트 중단.
- **라우팅 버그 수정**: `admin/insights/page.tsx`가 탭 전환 시 하드코딩된 `/admin/insights`
  로 이동 → 같은 컴포넌트가 `/console/insights`에도 서빙되므로 콘솔 이용자가 탭 클릭 시
  `/admin/insights`로 이탈하던 문제. `usePathname()` 기반으로 현재 경로 유지하도록 수정.
- **orphan 제거**: `admin/settings/layout.tsx` — 하위 페이지가 전혀 없는 고아 레이아웃.
  실제 설정 페이지는 모두 `console/settings/*`에 존재. 삭제.
- 나머지 `admin/*` 페이지(analytics·audit-log·certificates·chatbot·fees·insights·
  semester-report·user-audit)는 `console/*`가 re-export하는 소스로 사용 중 — orphan 아님.

---

## 4. Commits

| 해시 | 메시지 |
|------|--------|
| `8b8b0126` | feat: members-insight 에이전트에 analyze_member_loyalty 도구 추가 |
| `7660bb30` | refactor: insights 회원 보고서 데이터 훅 추출 + 세그먼트 분포 차트 |
| `0473bf5e` | docs: insights-agent 사이클 보고서 누적 |
| `aa70c1f0` | perf: useMemberMetrics 12개 쿼리에 staleTime 5분 적용 |
| `83f2e485` | feat: analyze_member_loyalty 도구를 콘솔과 동일한 12개 컬렉션 산출식으로 확장 |
| `87c4e471` | docs: insights-agent 사이클 보고서 갱신 (로얄티 도구 확장 반영) |
| `f88f5caf` | fix: insights 탭 라우팅 버그 수정 + orphan admin/settings 레이아웃 제거 |
| `e114f7c7` | docs: 사이클 보고서에 라우트 정리 작업 반영 |
| `4890f078` | feat: 회원 보고서에 기수별 평균 로얄티 분포 추가 |
| `ef9015cc` | feat: 회원 보고서에 활동 모멘텀 추가 (최근 30일 vs 이전 30일) |
| (다음) | feat: 로얄티 스냅샷 cron 인프라 + 추이 그래프 |

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

- ~~insights Group C (성능/캐싱)~~ → 완료: `useMemberMetrics` 12개 쿼리에 `staleTime` 5분 적용
- ~~`analyze_member_loyalty` 콘텐츠 카운트 미수집~~ → 완료: 12개 컬렉션 전체 조회로 확장
- ~~dead-code 라우트 인벤토리~~ → 완료: 라우팅 버그 1건 수정 + orphan 레이아웃 1건 제거
- insights Group D (선택): 기수별 평균 로얄티 + 활동 모멘텀(최근 30일 vs 이전 30일) 완료.
  진짜 시계열(월별 로얄티 점수 추이 그래프, 세그먼트 이동 추적)은 매일 스냅샷을 적재하는
  cron 인프라가 선행돼야 함 — 현재 모멘텀 방식으로 인프라 없이 추이 신호는 확보됨
- `admin/*` ↔ `console/*` 이중 라우트: `admin/*`가 여전히 직접 접근 가능. 8개 라우트가
  상호 의존(admin/insights가 admin/analytics·admin/semester-report를 dynamic import)
  하므로 소스를 `src/features/`로 이전하는 구조 개선은 별도 계획 사이클로 진행 권장

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

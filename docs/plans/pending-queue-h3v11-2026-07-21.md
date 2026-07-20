# H3 처리 대기 통합 큐 — 소스 전수 표 (v11-2026-07-21)

> 콘솔 랜딩(`src/app/console/page.tsx`)에 집계되지 않던 수동 처리 대기 소스를 전수 조사하고,
> 집계 가능한 3종을 "처리 대기 통합 큐" 카드로 통합한 결과를 기록한다.

---

## 1. 서비스 전역 "운영진 처리 대기" 소스 전수

| # | 소스 | 컬렉션/API | 대기 판정 기준 | 기존 콘솔 집계 여부 | H3 집계 여부 |
|---|------|------------|----------------|---------------------|-------------|
| A | **승인 대기 회원** | bkend `profiles` (`approved=false`) | `approved === false` | ✅ ActionableBanner (pendingData) | 중복 — 기존 배너 유지 |
| B | **미답변 문의** | Firestore `inquiries` | `status === "pending"` | ✅ ActionableBanner (unansweredCount) | 중복 — 기존 배너 유지 |
| C | **학술활동 신청 대기** | Firestore `activity_applicants` | `applicants[].status === "pending"` | ✅ ActionableBanner (pendingAppsCount) | 중복 — 기존 배너 유지 |
| D | **세미나 타임라인 경과** | bkend `seminars` | 예정 세미나 타임라인 `done=false && dDay <= 0` | ✅ ActionableBanner (overdueTimelineCount) | 중복 — 기존 배너 유지 |
| E | **포트폴리오 검증 대기** | bkend `external_activities` (`verified=false`) + `awards` (`verified=false`) | `verified === false` | ❌ 미집계 | **✅ H3 신규 집계** |
| F | **미매핑 졸업논문** | bkend `alumni_theses` (`authorMappingStatus=unmapped`) | `authorMappingStatus === "unmapped"` | ❌ 미집계 | **✅ H3 신규 집계** |
| G | **콘텐츠 초안 검토 대기** | bkend `content_drafts` (`status=pending`) | `status === "pending"` | ❌ 미집계 | **✅ H3 신규 집계** |
| H | **잠재회원** | `/api/console/potential-members` (Server API) | 비회원 게스트 참여자 집계 | ❌ 미집계 | ⏭ 제외 — 착륙 페이지 비용 대비 과중 (전용 페이지 `/console/potential-members` 사용) |
| I | **해커톤 심사 대기** | Firestore `hackathon_submissions` + `hackathon_judgings` | 미심사 제출물 (contextId 필요) | ❌ 미집계 | ⏭ 제외 — 활성 contextId 없이 전역 집계 불가 (전용 콘솔 `/console/hackathon` 사용) |
| J | **미처리 관리자 할 일** | Firestore `admin_todos` | `done === false` | ✅ AdminTodoTab (페이지 하단) | 중복 — 기존 AdminTodoTab 유지 |

---

## 2. H3 구현 — 처리 대기 통합 큐 카드

### 집계 소스 (3종)

| 소스 | API 메서드 | 쿼리 키 | staleTime | 딥링크 |
|------|-----------|---------|-----------|--------|
| 포트폴리오 검증 | `externalActivitiesApi.listPending()` + `awardsApi.listPending()` | `["console","pf-externals-pending"]` / `["console","pf-awards-pending"]` | 3분 | `/console/portfolio-verification` |
| 미매핑 졸업논문 | `alumniThesesApi.listUnmapped()` | `["console","alumni-unmapped-pending"]` | 5분 | `/console/alumni-mapping` |
| 콘텐츠 초안 | `fetchPendingDrafts()` | `["console","content-drafts-pending"]` | 5분 | `/console/content-drafts` |

### 집계 주의사항

- `externalActivitiesApi.listPending()` / `awardsApi.listPending()` — `filter[verified]=false` 조건이므로
  명시적으로 `verified: false` 가 저장된 항목만 집계 (undefined/null 제외). 실제 검증 대기 수와 경미한 차이 가능.
- `alumniThesesApi.listUnmapped()` — `filter[authorMappingStatus]=unmapped` 조건이므로
  필드 자체가 없는 초기 시드 항목은 제외. 실제 미매핑 수보다 소폭 낮을 수 있음.
- `dataApi.list` 는 Firestore 직접 쿼리 (`getDocs`)이므로 `total = data.length` (서버 카운트 없음).
  limit을 초과하는 대기 건수가 있으면 집계 한계(200/500/100) 내에서만 표시.

### 표시 조건

- `totalManualQueueCount > 0` 일 때만 카드 렌더링 (0건 EmptyState 없음 — 컴팩트 원칙).
- 각 소스별로 0건이면 해당 항목만 생략 (나머지는 유지).
- 가장 오래된 항목 경과일: `oldestElapsedLabel()` 함수로 각 소스의 `createdAt` 최솟값으로 계산.

### 위치

기존 ActionableBanner 4종(승인 대기·미답변 문의·활동 신청 대기·타임라인 경과) 이후, 통계 카드 그리드 이전.

---

## 3. 수정 파일

- `src/app/console/page.tsx` — 쿼리 4종·계산값·`oldestElapsedLabel` 헬퍼·JSX 섹션 추가

## 4. 미구현 (외부 의존 또는 비용 초과)

- **잠재회원 수** — `/api/console/potential-members` Server API (Admin SDK + 다중 컬렉션 집계)는 랜딩 착륙 비용 과중. 전용 페이지 사용.
- **해커톤 심사 대기 수** — 활성 `contextId` 없이는 `hackathon_submissions` 전역 집계 불가. 당일 콘솔(`/console/hackathon`) 사용.
- **수동 큐 넛지 cron** — 푸시 발송 정책·SLA 합의 필요 (§4 외부 의존).

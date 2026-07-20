# 포트폴리오 자동적재 커버리지 감사 — v12-M2 (2026-07-21)

> 감사 기준: `mypage/portfolio/page.tsx` · `lib/portfolio-autofill.ts` · `components/profile/PortfolioAutofillDialog.tsx`  
> 확장 범위: `portfolio-autofill.ts` + `PortfolioAutofillDialog.tsx` 수정, 신규 컬렉션 0

---

## 1. 자동 적재 커버리지 전후 비교

| 활동 소스 | 컬렉션/신호 | Before (v11) | After (v12-M2) | sourceRef 패턴 |
|---|---|---|---|---|
| **세미나 발표** | `seminars` (isSeminarHost) | ✅ | ✅ (유지) | `seminar:{id}` |
| **대표 논문** | `user.recentPapers` | ✅ | ✅ (유지) | `paper:{normalizedTitle}` |
| **멘토링 기여 인정** | `kudos` (context=mentoring, toUserId) | ❌ 누락 | ✅ **신규** | `kudos:received:mentoring` |
| **해커톤 참가** | `hackathon_submissions` (ownerId) | ❌ 누락 | ✅ **신규** | `hackathon:submission:{id}` |
| **교수설계 마법사 산출** | `activities.curriculumDesign` | ❌ 누락 | ⚠️ 제외 (API 한계) | — |

---

## 2. 구현 상세

### 2-1. 멘토링 기여 인정 (kudos:received:mentoring)

- **데이터 소스**: `kudosApi.listReceivedByUser(userId)` — `filter[toUserId]` 단일 필터 (기존 API, 신규 컬렉션 없음)
- **집계 방식**: `context === "mentoring"` 건만 필터 → 전체를 1건으로 집계
  - `cohort` / `study` / `hackathon` context는 포트폴리오 부적합 항목으로 제외
- **포트폴리오 매핑**: `external_activities` type=`"community"`, role=`"멘토"`, org=`"연세교육공학회"`
- **멱등 키**: `kudos:received:mentoring` (사용자당 1건, 재적재 방지)
- **날짜**: 가장 최근 weekKey (YYYY-MM-DD 주 시작일)
- **description**: `멘토링 답변 채택 응원 N건 수신`

### 2-2. 해커톤 참가 (hackathon:submission:{id})

- **데이터 소스**: `hackathonSubmissionsApi.listByContext(HACKATHON_CONTEXT_ID)` + 클라이언트 `ownerId === userId` 필터
  - `listByOwner` API 없어 컨텍스트 전체 조회 후 client-side 필터 (기존 패턴 재사용)
- **커버리지**: `ownerId` (팀 대표 제출자)만. 팀원(`members[]`)은 이름 문자열만 저장되어 userId 매핑 불가 — 향후 팀원 ID 저장 시 확장 가능
- **포트폴리오 매핑**: `external_activities` type=`"conference"`, role=`"팀 대표"`, org=`"연세교육공학회"`
- **멱등 키**: `hackathon:submission:{submissionId}` (제출건당 1건)
- **URL 우선순위**: presentationUrl → demoUrl → repoUrl
- **날짜**: `createdAt.slice(0,10)` → contextId 파싱(`hackathon-YYYY-MM-DD`) 폴백

### 2-3. 교수설계 마법사 산출 (제외 — API 한계)

- **현황**: `StudyCurriculumWizard`가 `activities.curriculumDesign` 필드에만 저장, 작성자 userId 별도 기록 없음
- **이유**: `activitiesApi.list()` 는 전체 activities 조회만 지원 (userId 필터 없음). `curriculumDesign` 작성자를 user-level에서 쿼리하는 API 미존재
- **권고**: 마법사 저장 시 `activity_participations`에 role=`"designer"` 자동 생성, 또는 `design_events` 별도 컬렉션 추가 후 후속 스프린트 확장

---

## 3. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/lib/portfolio-autofill.ts` | `AutofillSourceKind` 2종 추가, `AutofillInput` optional 필드 2종 추가, `buildPortfolioCandidates` 에 소스 3·4 로직 추가 |
| `src/components/profile/PortfolioAutofillDialog.tsx` | `kudosApi`·`hackathonSubmissionsApi`·`HACKATHON_CONTEXT_ID` import 추가, `openDialog` 병렬 fetch 확장, 안내 문구 갱신 |

---

## 4. 검증

- `npx tsc --noEmit` → 에러 0
- `npx eslint src/lib/portfolio-autofill.ts src/components/profile/PortfolioAutofillDialog.tsx --quiet` → 에러 0
- 신규 컬렉션: 0
- 기존 autofill 파이프(external_activities 적재 흐름) 변경 없음 — 선택적 optional 필드 추가만

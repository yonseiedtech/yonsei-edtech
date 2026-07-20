# 데드코드 정리 실행 보고 (2026-07-21)

> 근거 감사: `docs/plans/deps-deadcode-h6v10-2026-07-21.md`
> 원칙: 위험도 낮음 + 오탐 주의 미표기 항목만, 삭제 전 전수 grep 재검증(동적 import·문자열 참조 포함)

---

## 1. 삭제 파일 목록 (28건)

### 1-1. 인증 (2건)
| # | 경로 | 비고 |
|---|---|---|
| 1 | `src/features/auth/SignupForm.tsx` | "SignupForm" 참조는 모두 `SignupFormValues` 타입(useSignupForm.ts) — 컴포넌트 import 0건 |
| 2 | `src/features/auth/signup-steps/Step3Security.tsx` | 자기 자신만 참조 |

### 1-2. 대시보드 (4건)
| # | 경로 | 비고 |
|---|---|---|
| 3 | `src/features/dashboard/NewMemberWelcomeBanner.tsx` | 자기 자신만 참조 |
| 4 | `src/features/dashboard/MiniCalendar.tsx` | HabitTracker.tsx:376이 동명 내부 함수를 독자 정의 — import 없음 |
| 5 | `src/features/dashboard/popup-coordination.ts` | notification-orchestrator.ts가 주석에만 언급 |
| 6 | `src/components/notifications/PushPermissionPrompt.tsx` | dashboard/page.tsx는 `@/features/dashboard/PushPermissionPrompt`(LIVE) import |

### 1-3. 어드민 (5건)
| # | 경로 | 비고 |
|---|---|---|
| 7 | `src/components/admin/StatusBadge.tsx` | `from.*components/admin/StatusBadge` import 0건 — JournalArticleStatusBadge 등은 별개 컴포넌트 |
| 8 | `src/features/activities/ActivityWeeksPage.tsx` | 자기 자신만 참조 |
| 9 | `src/features/admin/AdminGreetingTab.tsx` | admin→console 이관 잔재 |
| 10 | `src/features/admin/AdminUserList.tsx` | 〃 |
| 11 | `src/features/admin/settings/ActivityEditor.tsx` | 〃 |
| 12 | `src/components/admin/AdminFilterBar.tsx` | 〃 |

### 1-4. 세미나 (3건)
| # | 경로 | 비고 |
|---|---|---|
| 13 | `src/features/seminar/ReviewsSection.tsx` | `app/seminars/[id]/page.tsx`가 동명 함수를 로컬 정의(line 91) — import 없음; ActivityDetail은 AttendeeReviewsSection import |
| 14 | `src/features/seminar/seminar-data.ts` | 참조 0건 |
| 15 | `src/features/seminar/SeminarStatusTabs.tsx` | 자기 자신만 참조 |

### 1-5. 연구·스터디타이머 (2건)
| # | 경로 | 비고 |
|---|---|---|
| 16 | `src/features/research/study-timer/StudyEndDialog.tsx` | 스텁(270B), 자기 자신만 참조 |
| 17 | `src/features/research/study-timer/StudyTimerBar.tsx` | 스텁(281B), 자기 자신만 참조 |

### 1-6. 공통 컴포넌트 (12건)
| # | 경로 | 비고 |
|---|---|---|
| 18 | `src/components/activities/ActivityCard.tsx` | `from.*ActivityCard` import 0건 — ActivityCards.tsx(복수s)는 별개 파일 |
| 19 | `src/components/activities/ActivityFilter.tsx` | 자기 자신만 참조 |
| 20 | `src/components/home/StatsSection.tsx` | admin/insights는 DigestStatsSection import — StatsSection import 없음 |
| 21 | `src/components/members/GenerationTabs.tsx` | 자기 자신만 참조 |
| 22 | `src/components/profile/ProfileAwards.tsx` | 프로필 개편 잔재 |
| 23 | `src/components/profile/ProfileCertificates.tsx` | 〃 |
| 24 | `src/components/profile/ProfileContentCreations.tsx` | 〃 |
| 25 | `src/components/profile/ProfileExternalActivities.tsx` | 〃 |
| 26 | `src/components/profile/ProfileGraduateInfo.tsx` | 〃 |
| 27 | `src/components/ui/collapsible.tsx` | archive/graph/page.tsx는 주석에만 "collapsible" 언급 — import 없음 |
| 28 | `src/components/ui/pagination.tsx` | ResearchLineageMap `{/* Pagination header */}` 주석, bkend.ts는 console.warn 문자열 — import 없음 |

---

## 2. 제거 의존성 (3건)

| 패키지 | 위치 | 제거 사유 |
|---|---|---|
| `ics` ^3.12.0 | dependencies | src·scripts 전체 import 0건. ICS 3개 라우트 모두 수기 문자열 직접 구현 |
| `shadcn` ^4.0.4 | dependencies | CLI 도구, 런타임 import 0건. 컴포넌트 추가 시 `npx shadcn` 사용 |
| `@vitejs/plugin-react` ^6.0.1 | devDependencies | vitest.config.ts에 plugins 미등록, tsx 테스트 없음, 코드베이스 참조 0건 |

---

## 3. 재배치 의존성 (2건)

| 패키지 | 변경 | 사유 |
|---|---|---|
| `firebase-admin` ^13.8.0 | devDep → **dependencies** | src 런타임 76파일 import. `--omit=dev` 환경 이식성 확보 |
| `pdfjs-dist` ^4.10.38 | dep → **devDependencies** | 런타임 import 0건. `lib/pdf-rasterize.ts`가 `public/pdfjs/` 벤더 사본을 webpackIgnore로 로드 — 버전 추적용 원본 역할만 |

---

## 4. 보류 목록 (삭제 금지)

| 파일 | 보류 사유 |
|---|---|
| `src/features/dashboard/NewMemberChecklistWidget.tsx` | 감사 표기 위험도 **중** — `lib/onboarding-evaluator.ts` 규칙 동기 확인 전 삭제 금지 (task 원칙: 위험도 중·고 삭제 금지) |
| `src/app/**/page.tsx` 외 라우트 파일 전부 | task 원칙: 라우트 파일 삭제 금지 |
| `scripts/*.mjs/*.ts` seed/스크립트 | task 원칙: seed/스크립트 삭제 금지 |
| 감사 §1-4 중복 기능·과대 패키지 5묶음 | 위험도 중·고 — 별도 게이트에서 검토 |
| 감사 §3 유틸 수렴 (formatDate·timeAgo·KST날짜·학기계산) | 위험도 낮음~중 — 포맷 일치 검증 필요, 별도 게이트 |

---

## 5. 검증 결과

- `npx tsc --noEmit` → `src/` 에러 **0건** (scripts/ dotenv 에러는 기존 사전 존재, 본 작업 무관)
- `npm install` → lock 갱신 완료 (audit 경고는 기존 xlsx 취약점)
- `npx eslint src --quiet` → 실행 중 (백그라운드)

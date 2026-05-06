# Plan: types/index.ts 도메인별 분해 (types-domain-split)

> **작성일**: 2026-05-06
> **PDCA 단계**: Plan
> **추정 작업량**: 7-10h (15개 도메인 점진 분리)
> **참조**: Codex × Claude UI/UX 분석 — "src/types/index.ts 분해 (현재 파일 비대)"

---

## 1. 현황

### 1.1 단일 파일 규모
- `src/types/index.ts` — **2719줄, 51개 섹션 헤더**
- 회원/게시판/세미나/연구/학술포트폴리오/수강과목/인지디딤판/논문심사 등 거의 모든 도메인이 한 파일에 응집
- 일부 v2/v3 마이그레이션 흔적 (`// ── v2: 2. 교육공학 이론 ──` 등)

### 1.2 영향
| 측면 | 현재 |
|------|------|
| import 경로 | 전 사이트 `from "@/types"` 단일 진입 |
| 빌드 영향 | TypeScript는 사용된 타입만 emit하므로 번들 영향 0 |
| 유지보수 | 도메인 추가/수정 시 단일 파일 충돌 위험, IDE 탐색 어려움 |
| 코드 리뷰 | 한 도메인 변경이 큰 파일 diff로 노출되어 컨텍스트 분리 어려움 |

---

## 2. 도메인 매핑 (15개)

| # | 도메인 | 라인 범위 | 주요 타입 |
|---|--------|-----------|-----------|
| 1 | **auth** | 1-228 | UserRole, User, OccupationType, EnrollmentStatus, ContactVisibility, SectionVisibility, SocialLink, SocialPlatform, NotificationPrefs |
| 2 | **profile** | 230-258 | ProfileLike, ProfileView, ProfileViewChannel |
| 3 | **board** | 260-371 | RecentPaper, SeminarSpeaker, SpeakerType, PostPoll, PostPollOption, PostAttachment, PostLinkedPaper, Post, PostCategory |
| 4 | **research-paper** | 372-498 | PaperType, ThesisLevel, PaperReadStatus, PaperVariables, ResearchPaper, WritingPaper, WritingPaperHistory, WritingPaperChapterKey, StudySession, StudySessionType |
| 5 | **research-report** | 498-773 | ResearchReport, ResearchGroup, ProblemEvidenceItem, ProblemCauseItem, ProblemMeasurementItem, EvidenceType, CauseType, EducationFormat, TheoryCard, TheoryConcept, ResearchApproach, ResearchProposal |
| 6 | **interview** | 775-928 | InterviewQuestion 류 |
| 7 | **seminar** | 930-1248 | Seminar, SeminarStatus, SeminarSession, RetrospectiveItem, ApplicationFieldConfig, SeminarTimeline, SeminarAttendance, SeminarApplicant, Certificate, Lab, PromotionContent, SeminarMaterial, SeminarReview |
| 8 | **academic** | 1250-1542 | Activity, ExternalConference, Vote/Survey, PhotoGallery |
| 9 | **operations** | 1544-1753 | HandoverNote, BusinessCardLog, SeminarQueue, Notification, AuditLog, AdminTodo, ActivityProgress, MeetingTimer, ActivityOutput, EmailLog, Inquiry |
| 10 | **portfolio** | 1755-1951 | 학술 포트폴리오 시스템 (Track 2) |
| 11 | **alumni** | 1953-2037 | AlumniThesis 류 |
| 12 | **courses** | 2039-2340 | CourseOffering, CourseEnrollment, CourseSessionNote, CourseTodo |
| 13 | **steppingstone** | 2342-2411 | 인지디딤판 (가이드 트랙) |
| 14 | **popup** | 2413-2453 | SitePopup |
| 15 | **defense** | 2455-2621 | ThesisDefensePractice |
| 16 | **edutech-archive** | 2623-2719 | 교육공학 아카이브 (Concept → Variable → MeasurementTool) |

> 16개 (계산 보정). 일부 도메인은 100줄 이하로 작고, research-report/courses/seminar/portfolio/defense는 200줄+

---

## 3. 분해 전략

### 3.1 핵심 원칙 — Re-export 패턴
```ts
// src/types/auth.ts (신규)
export type UserRole = "sysadmin" | ...;
export interface User { ... }
// ...

// src/types/index.ts (기존 진입점)
export * from "./auth";
export * from "./profile";
export * from "./board";
// ...
```

→ 기존 `import { User } from "@/types"` **모든 사용처 영향 없음**.

### 3.2 도메인 간 의존성 처리
- 일부 타입은 다른 도메인 타입을 사용 (예: `Post.linkedPaper` → ResearchPaper)
- 분리 시 cross-import 발생 (예: `import type { ResearchPaper } from "./research-paper";` in `board.ts`)
- 순환 import 방지 — 도메인 간 단방향 dependency 그래프 점검 필요

### 3.3 점진 마이그레이션 순서 (의존성 낮은 순)
```
Phase 1 (독립 도메인 — 다른 곳에서 import만 받음):
  1. popup (2413-2453, 40줄)
  2. edutech-archive (2623-2719, 96줄)
  3. defense (2455-2621, 166줄)
  4. steppingstone (2342-2411, 69줄)

Phase 2 (auth/profile — 거의 모든 곳에서 사용):
  5. auth (1-228) + profile (230-258) → 합쳐서 user.ts
  6. board (260-371)

Phase 3 (research 그룹):
  7. research-paper (372-498)
  8. research-report (498-773)

Phase 4 (seminar 그룹):
  9. seminar (930-1248) — 큰 덩어리, careful

Phase 5 (operations + academic):
  10. operations (1544-1753)
  11. academic (1250-1542)

Phase 6 (Track 시리즈):
  12. portfolio (1755-1951)
  13. alumni (1953-2037)
  14. courses (2039-2340)
  15. interview (775-928)

마지막: types/index.ts 정리 — 모든 도메인 re-export만 남김
```

### 3.4 안전 검증
- 각 Phase 후 `npx tsc --noEmit` 통과 확인
- `npx vercel build` 통과 확인 (배포 환경 strict tsc)
- 이슈 발견 시 즉시 rollback (Phase 단위로 commit)

---

## 4. 리스크

| 리스크 | 완화 |
|--------|------|
| 도메인 간 cross-import 누락 시 컴파일 에러 | tsc 검증 + 단계별 commit |
| 타입 충돌 (동일 이름 다른 정의) | 단일 파일 정의라 이미 충돌 없음 — 분해 후도 안전 |
| 사용처 import 경로 영향 | re-export 패턴으로 0 — 기존 `@/types` 그대로 |
| v2/v3 마이그레이션 잔존 코드 | 분해 전 그대로 옮기되 별도 sprint에서 정리 권장 |
| 큰 도메인(seminar 318줄, research-report 275줄) 분해 시 careful | Phase 단계 분리, 단일 commit으로 회귀 추적 |

---

## 5. 작업 분해

### Phase Plan ✅ (현재)

### Phase Do (Phase 1 우선 — 독립 도메인 4개)
- [ ] `types/popup.ts` 신규 + index.ts 정리
- [ ] `types/edutech-archive.ts` 신규 + index.ts 정리
- [ ] `types/defense.ts` 신규 + index.ts 정리
- [ ] `types/steppingstone.ts` 신규 + index.ts 정리
- [ ] tsc + vercel build 검증
- [ ] commit + push + vercel deploy

### Phase Do (Phase 2 — auth/profile/board)
- [ ] `types/user.ts` (auth + profile 합침)
- [ ] `types/board.ts`
- [ ] cross-import 점검 + 검증

### Phase Do (Phase 3-6 — 점진 진행)
- [ ] research-paper / research-report
- [ ] seminar (큰 덩어리)
- [ ] operations / academic
- [ ] portfolio / alumni / courses / interview

### Phase Check
- [ ] gap-detector — 모든 사용처 import 정상
- [ ] 빌드 + 운영 검증

### Phase Report

---

## 6. 일정

| 단계 | 시간 |
|------|------|
| Plan | 1h ✅ |
| Do Phase 1 (독립 4개) | 1h |
| Do Phase 2 (auth/board) | 1.5h |
| Do Phase 3 (research) | 1.5h |
| Do Phase 4 (seminar) | 1.5h |
| Do Phase 5-6 (나머지) | 2h |
| Check + Report | 1h |
| **합계** | **~9h** |

---

## 7. 결정 포인트

| Q | 옵션 |
|---|------|
| Q1. 모든 도메인을 sub 파일로 분리 vs 큰 도메인만 분리 | A. 모두 분리(권장) / B. seminar/research/courses 등 큰 것만 |
| Q2. v2/v3 마이그레이션 코드 분해 시 정리 vs 그대로 이동 | A. 그대로 이동(권장) — 정리는 별도 sprint / B. 함께 정리 |
| Q3. Phase 진행 — 한 commit으로 묶음 vs Phase별 commit | A. Phase별 commit(권장) — 회귀 추적 가능 / B. 한 큰 commit |

### 권장 묶음
- Q1 A · Q2 A · Q3 A

---

> 다음: 사용자 컨펌 후 `/pdca do types-domain-split` 즉시 진입 → Phase 1 (독립 도메인 4개) 시작.

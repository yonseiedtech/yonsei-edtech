# M2 Deadcode 감축 보고서

**작업일**: 2026-07-27  
**목표**: knip 미참조 export 확인 후 안전 삭제로 deadcode baseline CEILING 감축  
**결과**: 26 → 13 (13개 감소)

---

## 삭제 항목 (16개 primary + secondary cleanup)

### 1. `src/features/collaborative-research/api/useCollabPhase2.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `useChapter` | `grep useChapter src/` → 정의부 외 참조 0 (`useChapters`는 사용되나 `useChapter` 단수는 미사용) | 삭제 |
| `useMentionsInbox` | `grep useMentionsInbox src/` → 정의부 1건 | 삭제 |
| `useMyMilestones` | `grep useMyMilestones src/` → 정의부 1건 | 삭제 |

### 2. `src/features/collaborative-research/api/useCollabResearch.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `useCollabSentInvites` | `grep useCollabSentInvites src/` → 정의부 1건 | 삭제 |
| `useCancelCollabInvite` | `grep useCancelCollabInvite src/` → 정의부 1건 | 삭제 |
| `useUpdateSelfMemberMeta` | `grep useUpdateSelfMemberMeta src/` → 정의부 1건 | 삭제 |

### 3. `src/features/collaborative-research/lib/research-status.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `canEditChapter` | `grep canEditChapter src/` → 정의부 1건 | 삭제 |

### 4. `src/features/demand/ensure-demand-board.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `currentDemandSemesterKey` | `grep currentDemandSemesterKey src/` → 정의부 1건 | 삭제 (NEW 신규 유입) |

### 5. `src/features/journal/api/useJournal.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `useUpdateIssue` | `grep useUpdateIssue src/` → 정의부 1건 | 삭제 (NEW 신규 유입) |

#### 연쇄 정리
- `UpdateJournalIssueInput` import → `useUpdateIssue` 삭제로 고아 → import에서 제거

### 6. `src/features/journal/lib/consent-gate.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `areAllAuthorsComplete` | `grep areAllAuthorsComplete src/` → 정의부 1건 | 삭제 |

### 7. `src/features/newsletter/newsletter-store.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `useNewsletterStore` | `grep useNewsletterStore src/` → 정의부 1건 | 삭제 |

#### 연쇄 정리
- `import { create } from "zustand"` → store 삭제로 고아 → 제거
- `interface NewsletterState` → store만 사용 → 제거  
- `ResearchPaper`/`NewsletterIssue`/`NewsletterSection` 등 다른 exports는 39개 파일에서 참조 → **보존**

### 8. `src/features/research/usePaperReadingLogs.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `useUpdateReadingLog` | `grep useUpdateReadingLog src/` → 정의부 1건 | 삭제 |
| `useDeleteReadingLog` | `grep useDeleteReadingLog src/` → 정의부 1건 | 삭제 |

### 9. `src/lib/ai-tools.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `getToolsForRole` | `grep getToolsForRole src/` → 정의부 1건 | 삭제 |

### 10. `src/lib/diagnostic-seed.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `seedDiagnosticQuestions` | `grep seedDiagnosticQuestions src/` → 정의부 1건 (app/api에도 0건) | 삭제 |

#### 연쇄 정리
- `export interface DiagnosticSeedResult` → 함수 삭제로 고아 → 제거
- `import { diagnosticQuestionsApi }` → 함수 삭제로 고아 → 제거
- `function identityKey(...)` → 함수 삭제로 고아 internal 함수 → 제거 (ESLint no-unused-vars)
- `DiagnosticQuestion` type import → `identityKey` 삭제로 고아 → 제거
- `import { questionType }` → `identityKey` 삭제로 고아 → 제거

### 11. `src/lib/research-paper-source.ts`

| export | 무참조 증거 | 판단 |
|--------|-----------|------|
| `searchOpenAlexEdTech` | `grep searchOpenAlexEdTech src/` → 정의부 1건 | 삭제 |

#### 연쇄 정리
- `export const OPENALEX_EDTECH_CONCEPT_ID` → 함수 삭제로 고아 → 제거
- `export const TRUSTED_VENUE_ISSN` → 함수 삭제로 고아 → 제거
- `interface OpenAlexAuthor` / `interface OpenAlexWork` → 함수 삭제로 고아 internal → 제거 (ESLint)
- `function reconstructAbstract` → 함수 삭제로 고아 internal → 제거 (ESLint)
- `ResearchPaper` interface는 39개 파일에서 참조 → **보존**

---

## 보존 판단 항목

| export | 위치 | 보존 이유 |
|--------|------|---------|
| `notifyNewNotice` | `src/features/notifications/notify.ts` | 알림 정책 재개 예약 (task 명시) |
| `notifyNewSeminar` | `src/features/notifications/notify.ts` | 알림 정책 재개 예약 (task 명시) |
| `notifySeminarReminder` | `src/features/notifications/notify.ts` | 알림 정책 재개 예약 (task 명시) |
| `minutesToHm` | `src/lib/notify-timing.ts` | notify-timing 미래 유틸 (task 명시) |
| `computePeakWindow` | `src/lib/notify-timing.ts` | notify-timing 미래 유틸 (task 명시) |
| `disablePushForCurrentUser` | `src/lib/push.ts` | push 예약 (task 명시) |
| `onForegroundPush` | `src/lib/push.ts` | push 예약 (task 명시) |
| `createNotification` | `src/features/notifications/useNotifications.ts` | notifications 디렉토리 내부, 애매 → 유지 |
| `activityMaterialsApi` | `src/lib/bkend.ts` | 미구현 기능 API wrapper, borderline → 유지 |
| `emailLogsApi` | `src/lib/bkend.ts` | 미구현 기능 API wrapper, borderline → 유지 |
| `thesisReferencesApi` | `src/lib/bkend.ts` | 미구현 기능 API wrapper, borderline → 유지 |
| `thesisClaimsApi` | `src/lib/bkend.ts` | 미구현 기능 API wrapper, borderline → 유지 |

---

## 검증 결과

| 검증 항목 | 결과 |
|---------|------|
| `npx tsc --noEmit` | ✅ PASS (0 errors) |
| ESLint warning ratchet | ✅ PASS (263건 / 상한 263건 — 변동 없음) |
| `node scripts/check-deadcode-ratchet.mjs` | ✅ PASS (13개 / 상한 13개) |
| `npm run build` | 실행 중 (백그라운드) |

## 새 CEILING

```
deadcode-baseline.json: CEILING 26 → 13 (13개 감소)
```

## 커밋/배포

메인이 검증 후 배포. 현재 미커밋 상태.

# v17-M1 · knip deadcode 감축 리포트

- **작업**: service-enhancement-plan-v17.md M1 "knip deadcode 13→8 감축 (기능 무변경 안전 삭제)"
- **일자**: 2026-07-27
- **결과**: **deadcode 17 → 9** (CEILING 13 → 9). 목표 8 미도달 → 안전 우선으로 9에서 멈춤(사유 아래).

## 1. 삭제 전/후 실측값

| 시점 | unusedExports | unusedTypes | unusedFiles | 합계 |
|------|---------------|-------------|-------------|------|
| baseline(H4 직후 실측) | 16 | 1 | 0 | **17** |
| 작업 후 | 9 | 0 | 0 | **9** |

- baseline JSON의 명목 CEILING은 13이었으나, 직전 v17-H4 작업이 새 미참조 export/type 4건(article-status·brand-kit×2·crosslink type)을 유입시켜 **실측 17**(래칫 회귀 상태)였다. 먼저 `knip --reporter json`으로 현재 상태를 측정한 뒤 착수.
- 삭제 8개 항목 제거로 17 → 9. `scripts/gen-deadcode-baseline.mjs` 재생성 → **CEILING 9**. `npm run lint:deadcode` PASS (9/9).

## 2. 삭제한 export/type + 무참조 증거

모든 항목은 `Grep`으로 전역(node_modules 제외) 검색해 **정의 라인 외 참조 0**을 확인 후 삭제. 도큐먼트(.md 리포트)만 히트한 경우는 코드 참조 아님으로 간주.

| # | 파일 | 삭제 export/type | 무참조 증거 |
|---|------|------------------|-------------|
| 1 | `src/lib/bkend.ts` | `activityMaterialsApi` (const) | 이름 grep → 정의 1행만. 컬렉션 문자열 `activity_materials` grep → 죽은 클라이언트 내부에서만 사용. UI/훅/시드 참조 0 |
| 2 | `src/lib/bkend.ts` | `thesisReferencesApi` (const) | 이름 grep → 정의 1행만. `thesis_references` 문자열 → 죽은 클라이언트 내부만 |
| 3 | `src/lib/bkend.ts` | `thesisClaimsApi` (const) | 이름 grep → 정의 1행만. `thesis_claims` 문자열 → 죽은 클라이언트 내부만 |
| 4 | `src/features/journal/lib/article-status.ts` | `canTransitionReviewStatus` (fn) | 이름 grep → 정의 1행만 |
| 5 | `src/features/journal/lib/consent-gate.ts` | `isAuthorComplete` (fn) | 이름 grep → 정의 1행만 |
| 6 | `src/features/studio/brand-kit.ts` | `BRAND_FONTS` (const) | 이름 grep → 정의 1행만 |
| 7 | `src/features/studio/brand-kit.ts` | `BRAND_TYPE_SCALE` (const) | 이름 grep → 정의 1행만 |
| 8 | `src/lib/archive-crosslink-sync.ts` | `CrosslinkPair` (interface/type) | 이름 grep → 정의 1행만 |

### 함께 정리한 orphan (신규 경고/신규 deadcode 방지)

삭제로 참조가 끊긴 import·헬퍼·타입 정의를 동반 제거했다. 각 동반 타입은 **삭제 대상 클라이언트에서만 사용**됨을 grep으로 확인(외부 참조 0)했으므로 자족적(self-contained) cascade — 새 unused-type가 생기지 않는다.

- `src/lib/bkend.ts` import: `ActivityMaterial`, `ThesisReference`, `ThesisClaim` 제거 (`EmailLog`·`AlumniThesis`는 보존).
- `src/types/operations.ts`: `ActivityMaterial` interface 삭제 (`EmailLog`·`Inquiry` 등 보존).
- `src/types/alumni.ts`: `ThesisReference`, `ThesisClaim` interface + `ThesisReferenceSource` type 삭제 (`ThesisReferenceSource`는 `ThesisReference` 전용 → 동반 제거. `AlumniThesis` 보존).
- `src/features/journal/lib/article-status.ts`: `ALLOWED_TRANSITIONS` const 동반 삭제(`canTransitionReviewStatus` 전용). `ArticleReviewStatus` 타입은 `REVIEW_STATUS_LABELS`/`COLORS`에서 계속 사용 → 보존.
- `src/features/journal/lib/consent-gate.ts`: import에서 `ArticleAuthorSnapshot` 제거(`isAuthorComplete` 전용). `AuthorConsent`·`ResearchJournalArticle`은 계속 사용 → 보존.

## 3. 보존한 항목(9개)과 사유

전량 **push/notify/알림·이메일 발송 계열 예약 export** — v17-X3 알림정책 재개 대비. 태스크의 "push/notify/알림 예약 export는 애매하면 보존" 규칙 적용. 무참조지만 삭제하지 않음.

| 파일 | export | 보존 사유 |
|------|--------|-----------|
| `src/features/notifications/notify.ts` | `notifyNewNotice` | 알림 발송 예약(X3) |
| `src/features/notifications/notify.ts` | `notifyNewSeminar` | 알림 발송 예약(X3) |
| `src/features/notifications/notify.ts` | `notifySeminarReminder` | 알림 발송 예약(X3) |
| `src/features/notifications/useNotifications.ts` | `createNotification` | 인앱 알림 생성 훅(X3) |
| `src/lib/notify-timing.ts` | `minutesToHm` | 알림 발송 시간대 유틸(X3) |
| `src/lib/notify-timing.ts` | `computePeakWindow` | 알림 피크 윈도우 산출(X3) |
| `src/lib/push.ts` | `disablePushForCurrentUser` | 푸시 구독 관리(X3) |
| `src/lib/push.ts` | `onForegroundPush` | 포그라운드 푸시 핸들러(X3) |
| `src/lib/bkend.ts` | `emailLogsApi` | 이메일 발송 이력 API — **이메일=알림 채널**이므로 X3 알림정책 재개 시 필요 판단. 애매 → 보존 |

### 목표 8 미도달 사유
남은 9개가 모두 알림/푸시/이메일 예약 export다. 8에 도달하려면 이 중 하나(가장 애매한 `emailLogsApi`)를 추가 삭제해야 하나, 이메일은 알림 채널이라 X3 재개 대비 보존이 규칙에 부합. **억지 삭제 금지** 원칙에 따라 9에서 정지하고 CEILING을 실측 9로 갱신. (태스크가 "8 미달 시 도달 가능한 만큼만 낮추고 baseline 갱신"을 허용.)

### bkend 스키마 cascade 관련 판단
`activityMaterialsApi`/`thesisReferencesApi`/`thesisClaimsApi`는 삭제 시 공유 타입 파일(`operations.ts`·`alumni.ts`)의 타입까지 동반 제거해야 했다. 각 타입은 (a) 죽은 클라이언트에서만 사용, (b) 해당 컬렉션 문자열이 코드 전역에서 그 클라이언트 밖에 **전무**(미배선 스캐폴딩)함을 grep으로 입증, (c) cascade가 자족적(외부 참조 0)임을 확인해 **런타임 무변경**이 tsc로 보장되므로 안전 삭제로 분류. `AlumniThesis`(활성 기능) 및 `EmailLog`(알림 인접)는 보존.

## 4. 검증 결과 (증거)

| 검증 | 명령 | 결과 |
|------|------|------|
| 타입체크 | `npx tsc --noEmit` | **exit 0** (0 에러) |
| eslint(수정 7파일) | `npx eslint <7 files>` | **exit 0** (신규 경고 0) |
| deadcode 래칫 | `npm run lint:deadcode` | **PASS (9 / 상한 9)** |
| baseline 갱신 | `node scripts/gen-deadcode-baseline.mjs` | ceiling 13 → 9, unusedExports 9 |

- build 미실행(메인 게이트 수행 예정 — 태스크 제약 준수).
- eslint·rawcolor baseline 미수정. deadcode baseline만 갱신.
- 금지 영역(steppingstone·mypage/research·insights·JourneyStepperWidget·DemandRetroSection·GuideCompletionCard·console/cron-logs·console/demand) 미수정.

## 5. 수정 파일 목록

- `src/lib/bkend.ts` (3 export + 2 import 정리)
- `src/types/operations.ts` (ActivityMaterial 타입)
- `src/types/alumni.ts` (ThesisReference·ThesisClaim·ThesisReferenceSource 타입)
- `src/features/journal/lib/article-status.ts` (canTransitionReviewStatus + ALLOWED_TRANSITIONS)
- `src/features/journal/lib/consent-gate.ts` (isAuthorComplete + import 정리)
- `src/features/studio/brand-kit.ts` (BRAND_FONTS·BRAND_TYPE_SCALE)
- `src/lib/archive-crosslink-sync.ts` (CrosslinkPair 타입)
- `scripts/deadcode-baseline.json` (ceiling 13 → 9)

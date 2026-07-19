# cron 관측성 구현 보고 — M6 (v7) · 2026-07-20

> 구현 범위: `src/lib/cron-observability.ts`(신규) · `src/app/api/console/cron-runs/route.ts`(신규) · cron 라우트 28종 래핑 · `src/app/console/cron-logs/page.tsx`(섹션 추가)

---

## 1. 핵심 헬퍼 — `src/lib/cron-observability.ts`

### 스키마 (`cron_runs` 컬렉션 문서)

| 필드 | 타입 | 설명 |
|---|---|---|
| `kind` | string | cron 라우트 디렉토리명 (e.g. `"weekly-digest"`) |
| `startedAt` | ISO string | 실행 시작 시각 |
| `endedAt` | ISO string | 실행 종료 시각 |
| `durationMs` | number | 소요 시간 (ms) |
| `success` | boolean | `true` = 200–499 / `false` = 500+ 또는 throw |
| `summary` | `Record<string, number>` | 응답 본문의 숫자 필드 (sent·updated·deleted 등) |
| `errorMessage?` | string | 실패 시 에러 메시지 (있는 경우) |
| `createdAt` | ISO string | `endedAt`과 동일 — Firestore 인덱스 편의 |

### Firestore 보안 규칙

```
match /cron_runs/{id} {
  allow read: if isAdmin();   // admin·sysadmin 만 조회
  allow write: if false;      // Admin SDK 전용 적재 — 클라 write 불허
}
```

> **적용 필요**: `firestore.rules`에 위 규칙을 추가해야 클라이언트 직접 읽기를 차단할 수 있음. 현재 콘솔 조회는 서버 사이드 API(`/api/console/cron-runs`)로만 수행하므로 규칙 없이도 동작함.

---

## 2. 래핑 대상 cron 전수 목록

| kind | 파일 경로 | GET 래핑 | POST 유지 |
|---|---|---|---|
| `activity-status` | `api/cron/activity-status/route.ts` | ✓ | — |
| `adoption-snapshot` | `api/cron/adoption-snapshot/route.ts` | ✓ | ✓ (수동 캡처) |
| `ai-forum-tick` | `api/cron/ai-forum-tick/route.ts` | ✓ | — |
| `analytics-retention` | `api/cron/analytics-retention/route.ts` | ✓ | — |
| `archive-seed-sync` | `api/cron/archive-seed-sync/route.ts` | ✓ | — |
| `compexam-reminder` | `api/cron/compexam-reminder/route.ts` | ✓ | — |
| `content-draft-generator` | `api/cron/content-draft-generator/route.ts` | ✓ | — |
| `deadline-reminder` | `api/cron/deadline-reminder/route.ts` | ✓ | — |
| `external-recruitment-reminder` | `api/cron/external-recruitment-reminder/route.ts` | ✓ | — |
| `flashcard-review-reminder` | `api/cron/flashcard-review-reminder/route.ts` | ✓ | — |
| `lecture-review-todos` | `api/cron/lecture-review-todos/route.ts` | ✓ | — |
| `loyalty-snapshot` | `api/cron/loyalty-snapshot/route.ts` | ✓ | ✓ (수동 캡처) |
| `networking-reminder` | `api/cron/networking-reminder/route.ts` | ✓ | — |
| `newcomer-activation-sequence` | `api/cron/newcomer-activation-sequence/route.ts` | ✓ | — |
| `newsletter-publisher` | `api/cron/newsletter-publisher/route.ts` | ✓ | — |
| `notifications-cleanup` | `api/cron/notifications-cleanup/route.ts` | ✓ | — |
| `push-class-reminder` | `api/cron/push-class-reminder/route.ts` | ✓ | — |
| `push-token-cleanup` | `api/cron/push-token-cleanup/route.ts` | ✓ | — |
| `semester-advance` | `api/cron/semester-advance/route.ts` | ✓ | ✓ (수동 실행) |
| `semester-start-reminder` | `api/cron/semester-start-reminder/route.ts` | ✓ | — |
| `seminar-push-reminder` | `api/cron/seminar-push-reminder/route.ts` | ✓ | — |
| `seminar-push-review-request` | `api/cron/seminar-push-review-request/route.ts` | ✓ | — |
| `seminar-reminder` | `api/cron/seminar-reminder/route.ts` | ✓ | — |
| `seminar-review-request` | `api/cron/seminar-review-request/route.ts` | ✓ | — |
| `seminar-status` | `api/cron/seminar-status/route.ts` | ✓ | — |
| `study-assignment-reminder` | `api/cron/study-assignment-reminder/route.ts` | ✓ | — |
| `study-session-reminder` | `api/cron/study-session-reminder/route.ts` | ✓ | — |
| `weekly-digest` | `api/cron/weekly-digest/route.ts` | ✓ | — |

---

## 3. 실패 감지 배너 규칙

| 조건 | 표시 |
|---|---|
| kind별 `consecutiveFailures >= 2` | 상단 경고 배너 (destructive 색상) |
| kind별 `consecutiveFailures == 1` | 테이블 행 amber 색상 |
| 0 | 정상 — 표시 없음 |

---

## 4. 래핑 동작 규칙

| 상황 | 로깅 여부 | 비고 |
|---|---|---|
| 200 (ok·skip) | ✓ success=true | 스킵된 run도 기록 |
| 4xx (401 제외) | ✓ success=true | verifyCronAuth 통과 후 app 레벨 에러 |
| 401 | **제외** | 인증 실패 = 실제 cron 실행 아님 |
| 500 | ✓ success=false | errorMessage 추출 |
| throw | ✓ success=false | 드문 케이스 방어 |

---

## 5. 검증 결과

- `npx tsc --noEmit` → 에러 0건
- `npx eslint src --quiet` → 에러 0건 (신규·수정 파일 전체)
- 빌드·커밋: 사용자 게이트 후 진행 (과제 규율)

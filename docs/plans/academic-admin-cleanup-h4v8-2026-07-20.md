# academic-admin ↔ console 이중 운영 정리 (v8-H4) — 이행 내역

감사 보고서: `docs/plans/academic-admin-audit-h4v8-2026-07-20.md` 의 "통합 권고안 이행 순서" 중 **단계 1~3** 수행.
단계 4(디렉토리 삭제·robots/BottomNav 정리)는 **미수행(삭제 대기)** — 본 문서 하단 목록 참조.

검증: `npx tsc --noEmit` src 에러 0 · `npx eslint src --quiet` 통과 (build·commit 미수행).

---

## 단계 1 — 인바운드 링크 교체 (LOW)

| 파일 | 위치 | 변경 |
|---|---|---|
| `src/app/activities/external/[id]/program/page.tsx` | :66 Link href | `/academic-admin/external/${id}/program` → `/console/academic/external/${id}/program` (신 편집기) |
| `src/app/api/cron/seminar-status/route.ts` | :175 dedup where("link") | `/academic-admin/seminars/certificate?...` → `/console/academic/seminars/certificate?...` |
| `src/app/api/cron/seminar-status/route.ts` | :195 알림 생성 link | 동일 교체 |

- dedup 쿼리(175)와 생성 링크(195)를 동일 경로로 맞춰 신규 발송 알림의 중복 억제 유지.
- 기존 발송분 backfill 미수행(신규만 교체).

## 단계 2 — 역결합 5건 구현 이관 (MEDIUM)

console 페이지가 `@/app/academic-admin/*` 라우트를 재export 하던 방향을 역전 →
실제 구현을 console 페이지로 이관(파일 내용 이동·경로만 보정, 로직 무변경). console 은 더 이상
academic-admin **앱 라우트**를 import 하지 않음. (참고: `@/features/academic-admin/Dashboard` 는
feature 모듈로 유지 대상이며 이관 범위 아님.)

| # | console 페이지 | 이전(재export 대상) | 이관 방식 |
|---|---|---|---|
| 1 | `src/app/console/academic/manage/page.tsx` | `@/app/academic-admin/page` | `<AcademicDashboard/>`(feature) 직접 렌더로 전환 |
| 2 | `src/app/console/academic/external/[id]/workbook/page.tsx` | `@/app/academic-admin/external/[id]/workbook/page` (597L) | 구현 인라인 이관. 내부 back-link `/academic-admin/external/${id}` → `/console/academic/external/${id}` 보정 |
| 3 | `src/app/console/academic/seminars/reviews/page.tsx` | `@/app/academic-admin/seminars/reviews/page` (43L) | 구현 인라인 이관 |
| 4 | `src/app/console/academic/seminars/promotion/page.tsx` | `@/app/academic-admin/seminars/promotion/page` (42L) | 구현 인라인 이관 |
| 5 | `src/app/console/academic/seminars/certificate/page.tsx` | `@/app/academic-admin/seminars/certificate/page` (44L) | 구현 인라인 이관 |

부수 조정: `eslint-rawcolor-baseline.mjs` — raw-color 부채 baseline 항목을
`src/app/academic-admin/external/[id]/workbook/page.tsx` → `src/app/console/academic/external/[id]/workbook/page.tsx`
로 이동(코드가 옮겨간 새 경로로 부채 등록 유지, 스텁이 된 구 경로엔 raw-color 없음). eslint 통과 목적.

## 단계 3 — redirect 스텁 배치 (LOW)

`src/app/academic-admin/*` 전 라우트를 구현 제거 후 얇은 redirect 스텁으로 축소.
static 라우트는 동기 `redirect()`, 동적 라우트는 `params` await 후 리다이렉트.

### 라우트별 스텁 매핑표

| academic-admin 라우트 | redirect 대상 |
|---|---|
| `page.tsx` | `/console/academic` |
| `certificates/page.tsx` | `/console/academic/certificates` |
| `external/page.tsx` | `/console/academic/external` |
| `external/[id]/page.tsx` | `/console/academic/external/${id}` |
| `external/[id]/program/page.tsx` | `/console/academic/external/${id}/program` (신 편집기 — divergence 해소) |
| `external/[id]/workbook/page.tsx` | `/console/academic/external/${id}/workbook` |
| `projects/page.tsx` | `/console/academic/projects` |
| `projects/[id]/page.tsx` | `/console/academic/projects/${id}` |
| `studies/page.tsx` | `/console/academic/studies` |
| `studies/[id]/page.tsx` | `/console/academic/studies/${id}` |
| `seminars/page.tsx` | `/console/academic/seminars` |
| `seminars/create/page.tsx` | `/console/academic/seminars/create` |
| `seminars/promotion/page.tsx` | `/console/academic/seminars/promotion` |
| `seminars/timeline/page.tsx` | `/console/academic/seminars/timeline` |
| `seminars/registrations/page.tsx` | `/console/academic/seminars/registrations` |
| `seminars/certificate/page.tsx` | `/console/academic/seminars/certificate` |
| `seminars/reviews/page.tsx` | `/console/academic/seminars/reviews` |
| `seminars/poster/page.tsx` | `/console/academic/seminars/poster` |
| `seminars/report/page.tsx` | `/console/academic/seminars/report` |

### 부속 레이아웃 (스텁 최소화)

- `academic-admin/layout.tsx` — AuthGuard/외곽 컨테이너 제거, `<>{children}</>` 통과.
  (하위가 즉시 리다이렉트되므로 auth 대기로 리다이렉트가 지연되지 않게 함. console 대상엔 자체 AuthGuard 존재.)
- `academic-admin/seminars/layout.tsx` — 탭 네비 제거, `<>{children}</>` 통과.

---

## 단계 4 — 삭제 대기 목록 (미수행, 사용자 승인 대상)

아래는 이번 작업에서 **건드리지 않음**. 유예 후 승인 시 별도 처리.

- `src/app/academic-admin/**` 디렉토리 전체 제거(현재 21개 redirect 스텁 상태).
- `src/app/robots.ts:13` — `"/academic-admin"` Disallow 항목.
- `src/components/layout/BottomNav.tsx:162` — `pathname.startsWith("/academic-admin")` 가드 조건.
- `src/features/activities/ActivityDetail.tsx:920` — `backHref.includes("academic-admin")` 문자열 체크(런타임 표시 조건). 삭제 시 영향 재확인 필요.
- 참고: `src/app/console/page.tsx:144` 의 academic-admin 언급은 주석일 뿐 정리 불필요.

---

## 수정 파일 요약

- 단계 1: 2개 (activities program page, cron seminar-status route)
- 단계 2: 5개 (manage / workbook / reviews / promotion / certificate console 페이지) + baseline 1개
- 단계 3: 21개 (academic-admin 19 page + 2 layout)
- **합계 29개 파일 수정** + 본 문서 신규.

검증 결과: tsc 에러 0, eslint 통과.

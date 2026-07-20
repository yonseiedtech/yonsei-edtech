# academic-admin 디렉토리 제거 이행 내역 (단계 4)

감사 보고서·cleanup 보고서 단계 4 이행 결과.

---

## 삭제 라우트 (21개)

`src/app/academic-admin/**` 전체 삭제:

| # | 경로 |
|---|---|
| 1 | `academic-admin/layout.tsx` |
| 2 | `academic-admin/page.tsx` |
| 3 | `academic-admin/certificates/page.tsx` |
| 4 | `academic-admin/external/page.tsx` |
| 5 | `academic-admin/external/[id]/page.tsx` |
| 6 | `academic-admin/external/[id]/program/page.tsx` |
| 7 | `academic-admin/external/[id]/workbook/page.tsx` |
| 8 | `academic-admin/projects/page.tsx` |
| 9 | `academic-admin/projects/[id]/page.tsx` |
| 10 | `academic-admin/studies/page.tsx` |
| 11 | `academic-admin/studies/[id]/page.tsx` |
| 12 | `academic-admin/seminars/layout.tsx` |
| 13 | `academic-admin/seminars/page.tsx` |
| 14 | `academic-admin/seminars/create/page.tsx` |
| 15 | `academic-admin/seminars/promotion/page.tsx` |
| 16 | `academic-admin/seminars/timeline/page.tsx` |
| 17 | `academic-admin/seminars/registrations/page.tsx` |
| 18 | `academic-admin/seminars/certificate/page.tsx` |
| 19 | `academic-admin/seminars/reviews/page.tsx` |
| 20 | `academic-admin/seminars/poster/page.tsx` |
| 21 | `academic-admin/seminars/report/page.tsx` |

## 동반 정리 (3건)

| 파일 | 위치 | 변경 |
|---|---|---|
| `src/app/robots.ts` | :13 | `"/academic-admin"` Disallow 항목 제거 |
| `src/components/layout/BottomNav.tsx` | :162 | `\|\| pathname.startsWith("/academic-admin")` 가드 조건 제거 |
| `src/features/activities/ActivityDetail.tsx` | :920 | `backHref.includes("academic-admin") \|\|` 조건 제거 |

참고: `src/app/console/page.tsx:144` academic-admin 언급은 주석이므로 변경 없음.
참고: `src/app/console/academic/page.tsx`, `manage/page.tsx`의 `@/features/academic-admin/Dashboard` import는 feature 모듈(유지 대상) — 변경 없음.

## 검증

- `npx tsc --noEmit`: 에러 0 (.next 캐시 제거 후 재실행)
- `npx eslint src --quiet`: 에러 0
- build · commit 미수행

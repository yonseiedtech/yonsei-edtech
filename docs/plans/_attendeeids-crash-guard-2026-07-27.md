# attendeeIds 런타임 크래시 방어 가드 배치 적용

**날짜**: 2026-07-27  
**배경**: `Seminar.attendeeIds`는 타입상 `string[]`(필수)이지만 레거시 Firestore 문서에 필드가 없을 경우 `undefined` → `.length`/`.includes()` 접근 시 TypeError → Next error.tsx 페이지 전체 붕괴.  
**패턴**: 코드베이스 기존 선례(`Array.isArray(s.attendeeIds) && ...`) 준수. 로직 변경 없이 옵셔널 가드만 추가.

## 수정 내역

| # | 파일 | 수정 전 | 수정 후 |
|---|------|---------|---------|
| 1 | `src/features/dashboard/JourneyStepperWidget.tsx` | `seminars.some((s) => s.attendeeIds.includes(userId))` | `seminars.some((s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(userId))` |
| 2 | `src/app/dashboard/page.tsx` | `seminars.filter((s) => s.attendeeIds.includes(user.id))` | `seminars.filter((s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(user.id))` |
| 3 | `src/features/seminar/SeminarList.tsx` | `seminar.attendeeIds.length` (count 계산) | `(seminar.attendeeIds ?? []).length` |
| 4 | `src/features/seminar/detail/HeroSection.tsx` | `seminar.attendeeIds.length` (attendeeCount 계산) | `(seminar.attendeeIds ?? []).length` |
| 5 | `src/features/seminar/SeminarReviews.tsx` | `seminar.attendeeIds.includes(user.id)` | `(seminar.attendeeIds ?? []).includes(user.id)` |
| 6 | `src/features/seminar/SeminarLMS.tsx` | `seminar.attendeeIds.length + (registrations?.length ?? 0)` | `(seminar.attendeeIds ?? []).length + (registrations?.length ?? 0)` |
| 7 | `src/features/seminar/detail/RegistrationSection.tsx` | `seminar.attendeeIds.length` (정원 마감 표시) | `(seminar.attendeeIds ?? []).length` |
| 8 | `src/features/academic-admin/Dashboard.tsx` | `sum + s.attendeeIds.length` | `sum + (s.attendeeIds ?? []).length` |
| 9a | `src/features/admin/AdminSeminarTab.tsx` | `totalAttendees += s.attendeeIds.length` | `totalAttendees += (s.attendeeIds ?? []).length` |
| 9b | `src/features/admin/AdminSeminarTab.tsx` | `{s.attendeeIds.length}명` (text-xs span) | `{(s.attendeeIds ?? []).length}명` |
| 9c | `src/features/admin/AdminSeminarTab.tsx` | `{s.attendeeIds.length}{s.maxAttendees ...}명` (line-clamp row) | `{(s.attendeeIds ?? []).length}{...}명` |
| 9d | `src/features/admin/AdminSeminarTab.tsx` | `{s.attendeeIds.length}{s.maxAttendees ...}명` (mobile row) | `{(s.attendeeIds ?? []).length}{...}명` |
| 10 | `src/app/console/members/[id]/page.tsx` | `all.filter((s) => s.attendeeIds.includes(memberId))` | `all.filter((s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(memberId))` |
| 11a | `src/lib/graduation-progress.ts` | `req.creditRules.map(` | `(req.creditRules ?? []).map(` |
| 11b | `src/lib/graduation-progress.ts` | `req.milestones.map(` | `(req.milestones ?? []).map(` |
| 12 | `src/features/research/ResearchQuestionsPanel.tsx` | `cur.researchMethodIds.filter((x) => x !== id)` | `(cur.researchMethodIds ?? []).filter((x) => x !== id)` |

## 검증 결과

- `npx tsc --noEmit` → **exit 0** (오류 없음)
- `npx eslint <12개 파일>` → **0 errors, 1 warning** (warning은 line 298 `Date.now` purity — 사전 존재, 이번 변경과 무관)

## 비고

- build/commit/deploy/push 는 메인이 게이트 후 수행.
- `includes` 접근 패턴은 `Array.isArray()` 가드 사용(코드베이스 기존 선례).
- `.length` 접근 패턴은 `?? []` nullish coalescing 사용(더 간결).

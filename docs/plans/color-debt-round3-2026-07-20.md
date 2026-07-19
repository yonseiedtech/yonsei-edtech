# Color Debt Round 3 — Dashboard Semantic Token Migration

**Date:** 2026-07-20  
**Scope:** `src/app/dashboard/`, `src/features/dashboard/`, `src/components/dashboard/`  
**Constraint:** Pure class substitution — no logic changes, no build/commit during migration

---

## Token Mapping Applied

| Raw palette | Semantic token |
|---|---|
| `emerald-*` | `success` |
| `blue-*` / `sky-*` / `indigo-*` | `info` |
| `amber-*` / `orange-*` | `warning` |
| `rose-*` / `red-*` | `destructive` |
| `violet-*` / `purple-*` | `cat-5` |
| `slate-*` (muted) | `muted` / `cat-6` |

Dark-mode suffixes (`dark:bg-xxx-950/40 dark:text-xxx-300`) removed — CSS vars auto-adapt.

---

## Files Migrated

### `src/features/dashboard/` (28 files)

| File | Changes |
|---|---|
| `AcademicCalendarProgress.tsx` | ✓ previous round |
| `ActivityFeed.tsx` | ✓ previous round |
| `AlumniHomeWidgets.tsx` | ARCHIVE_QUICK_LINKS (8 entries), activity/thesis icons, mentor-open badge |
| `DailyReflectionPrompt.tsx` | `via-sky-500/3` → `via-info/3` |
| `DashboardCommandCenter.tsx` | ✓ previous round |
| `DiagnosisReadinessWidget.tsx` | ✓ previous round |
| `InactivityCoachingCard.tsx` | ✓ previous round |
| `JourneyGreetingHeader.tsx` | ✓ previous round |
| `MyGrowthWidget.tsx` | ✓ previous round |
| `NewMemberChecklistWidget.tsx` | ring-emerald, border-rose, sparkle |
| `NewMemberOnboardingCard.tsx` | ✓ previous round |
| `NewMemberWelcomeBanner.tsx` | `via-sky-500/5` → `via-info/5` |
| `NextActionBanner.tsx` | ✓ previous round |
| `PeerActivityFeed.tsx` | ✓ previous round |
| `ProfileSideWidget.tsx` | emerald button, tab badge, dday badge, notification dots (×2) |
| `ProfileSummaryCard.tsx` | ✓ previous round |
| `PushPermissionPrompt.tsx` | ✓ previous round |
| `RecentPostsWidget.tsx` | ✓ previous round |
| `SemesterKickoffBanner.tsx` | `via-sky-500/5` → `via-info/5` |
| `StaffPriorityPanel.tsx` | ✓ previous round |
| `StageRecommendationPanel.tsx` | ✓ previous round |
| `TodayCard.tsx` | ✓ previous round |
| `TodaySummaryCard.tsx` | ✓ previous round |
| `TodayTodosPopup.tsx` | ✓ previous round |
| `todos/ActivityItem.tsx` | near-deadline orange chip |
| `todos/AddTodoDialog.tsx` | ✓ previous round |
| `todos/CourseTodoItem.tsx` | session label badge (blue), near-deadline chip (orange), delete hover (rose) |
| `todos/LectureReviewItem.tsx` | session label badge (blue) |
| `todos/StaffItems.tsx` | ✓ previous round |
| `timeline/DailyGrid.tsx` | activity-type badge (violet), leader badge (amber), Users icon (violet) |
| `timeline/FinishedClassPrompts.tsx` | border-t, inactive button (emerald), hint text (emerald) |
| `timeline/MonthlyGrid.tsx` | Sunday/Saturday headers & date text (rose/blue), seminar dots ×3 (violet) |
| `timeline/types.ts` | `MODE_BADGE` (6 entries), `ACTIVITY_MODE_BADGE` (2), `SEMINAR_MODE_BADGE` (2), `MODE_BORDER` (6), `ACTIVITY_MODE_BORDER` (2) |
| `timeline/WeeklyGrid.tsx` | reset button (amber), activity-type badge (violet), leader badge (amber) |

### `src/app/dashboard/`

| File | Changes |
|---|---|
| `page.tsx` | 4× `StatCard color` props (blue, emerald, violet, rose) |

### `src/components/dashboard/`

No raw palette colors found — scope clean.

---

## Verification

```
node scripts/gen-rawcolor-baseline.mjs  →  baseline 411개 파일 기록 완료
npx tsc --noEmit                        →  0 errors
grep raw-palette src/features/dashboard →  No matches found
grep raw-palette src/app/dashboard      →  No matches found
grep raw-palette src/components/dashboard → No matches found
```

---

## Excluded (per task rules)

- `src/app/console/archive/**`
- `src/features/insights/**`
- `src/app/api/cron/**`
- `src/app/r/**`

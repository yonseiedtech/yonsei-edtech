# M1 ESLint Warning 감축 리포트 (v16 백로그)

> 작성일: 2026-07-27  
> 담당: executor (oh-my-claudecode)

---

## 결과 요약

| 항목 | 전 | 후 |
|------|----|----|
| ESLint warning CEILING | 263 | 212 |
| 실제 warning 수 | ~263 | 212 |
| **감소량** | — | **51건 (-19.4%)** |
| tsc 에러 | 0 | 0 |
| rawcolor CEILING | 1 | 1 (유지) |
| 빌드 | — | 확인 중 |

---

## 수행 원칙

- **행동·기능 무변경** (behavior unchanged)
- **DB/rules 무변경**
- `react-hooks/exhaustive-deps` SKIP (런타임 사이드이펙트 위험)
- `@next/next/no-img-element` SKIP (의도적 img 사용)
- `no-console` SKIP (API/cron 핵심 로깅)
- 보호 파일 무변경: `TodaySummaryCard.tsx`, 진단, 대시보드 핵심 로직

---

## 수정 파일 목록

### Batch 1 — 미사용 import 제거 (일반 경로)

| 파일 | 제거 항목 |
|------|----------|
| `src/app/agents/page.tsx` | `Button` (ui/button) |
| `src/app/alumni/thesis/page.tsx` | `ShieldCheck` (lucide) |
| `src/app/archive/literature-review-guide/page.tsx` | Card 류 전체 import |
| `src/app/console/agent-board/page.tsx` | `Bot` (lucide) |
| `src/app/console/archive/content-gaps/page.tsx` | `ArrowLeft` (lucide) |
| `src/app/console/members/migrate-teacher-affiliation/page.tsx` | `PageHeader` |
| `src/app/console/page.tsx` | `Globe` (lucide) |
| `src/app/labs/qa-wall/page.tsx` | `Badge` (ui/badge) |
| `src/app/mypage/notifications/page.tsx` | `Bell` (lucide) |
| `src/app/research/page.tsx` | `Separator` import + `StatCard` 미사용 컴포넌트 정의 |
| `src/app/steppingstone/program-development/_components/LessonDesignTools.tsx` | `cn` (utils) |
| `src/features/activities/StudySessionPreClassCard.tsx` | `Users` (lucide) |
| `src/features/collaborative-research/components/CollabResearchMembersPanel.tsx` | `CreditRole` type |
| `src/features/comm-board/CommBoardDetail.tsx` | `CommBoard` type |
| `src/features/network/NetworkAnalyticsReport.tsx` | `NetworkEdge` type |
| `src/features/research-analytics/ResearchHero.tsx` | `AnimatePresence` (framer-motion) |
| `src/features/seminar/detail/HeroSection.tsx` | `BookOpen` (lucide) |
| `src/lib/bkend.ts` | `Inquiry` type |

### Batch 2 — 미사용 import 제거 (bracket 경로, PowerShell LiteralPath)

| 파일 | 제거 항목 |
|------|----------|
| `src/app/activities/external/[id]/workbook/page.tsx` | `useMutation` (react-query) |
| `src/app/console/labs/[id]/page.tsx` | `Link` (next/link) |
| `src/app/console/members/[id]/page.tsx` | `certificatesApi`, `Certificate` |
| `src/app/console/academic/external/[id]/speakers/page.tsx` | `Link` (next/link) |
| `src/app/console/academic/external/[id]/volunteers/page.tsx` | `Link` (next/link) |
| `src/app/progress-meetings/[id]/page.tsx` | `useMemo` (React) |
| `src/app/seminars/[id]/page.tsx` | `SeminarStatus` type |
| `src/app/courses/[id]/schedule/page.tsx` | `NotebookPen`, `ListChecks` (lucide) |

### Batch 3 — 미사용 함수·상수 제거

| 파일 | 제거 항목 |
|------|----------|
| `src/features/research-analytics/multi-axis.ts` | `collectByYear`, `countByYear` 함수 |
| `src/features/internal-conference/InternalConferencesView.tsx` | `INTERNAL_CONFERENCES` import |
| `src/features/internal-conference/conferences.ts` | `getConferenceBySlug` 함수 |
| `src/types/alumni.ts` | `GRADUATION_TYPE_LABELS` const |
| `src/types/board.ts` | `POST_CATEGORIES` const |
| `src/types/research-report.ts` | 잔여 `};` parse error 수정 |
| `src/features/insights/loyalty-snapshot-types.ts` | `SNAPSHOT_SEGMENTS` const |
| `src/features/journal/lib/article-status.ts` | `VISIBILITY_DESCRIPTIONS` const |
| `src/features/studio/brand-kit.ts` | `BRAND_KIT` const |
| `src/types/research-paper.ts` | `HYPOTHESIS_DIRECTION_LABELS` const |
| `src/lib/theory-family.ts` | `THEORY_FAMILY_META` const (reduce 결과) |
| `src/lib/archive-crosslink-sync.ts` | `RESEARCH_TO_STAT`, `STAT_TO_RESEARCH` const |
| `src/lib/alumni-thesis-crosslink.ts` | `thesesForStatMethod` 함수 |
| `src/features/collaborative-research/lib/research-status.ts` | `COLLAB_INVITE_STATUS_LABELS`, `HYPOTHESIS_TYPE_LABELS`, `HYPOTHESIS_STATUS_LABELS` |
| `src/features/greeting/useGreeting.ts` | `EMPTY_PERSON` const |
| `src/lib/design-tokens.ts` | `STATUS_VARIANT_TO_TONE` const + 고아 JSDoc |
| `src/lib/notify-timing.ts` | `ACTIVITY_WINDOW_LABELS`, `ACTIVITY_WINDOW_SEND_HM` const |

---

## SKIP 항목 (의도적 제외)

| 규칙 | 건수 | 이유 |
|------|------|------|
| `react-hooks/exhaustive-deps` | ~131 | 의존성 배열 수정 시 런타임 사이드이펙트 위험 |
| `@next/next/no-img-element` | ~18 | 의도적 `<img>` 사용 (외부 CDN 등) |
| `no-console` | ~6 | API 라우트·cron 핵심 로깅 |

---

## 검증 결과

- ESLint ratchet: **PASS** (212 / 212)
- rawcolor ratchet: **PASS** (1 / 1)
- tsc: **exit 0** (타입 에러 없음)
- npm run build: 실행 확인 중

---

## 다음 단계 (선택)

- `react-hooks/exhaustive-deps` 131건: 각 파일별 안전성 검토 후 단계적 수정 가능
- `@next/next/no-img-element` 18건: Next.js `<Image>` 전환 검토
- CEILING을 추가 낮추려면 위 SKIP 항목을 하나씩 수동 검토 후 수정

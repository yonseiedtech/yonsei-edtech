# M3 빈 상태 일관성 표준화 — 구현 보고서 (2026-07-20)

> v9 백로그 M3: ad-hoc 54파일 후보 → 공용 `EmptyState` 수렴  
> 기준 컴포넌트: `src/components/ui/empty-state.tsx` (기존, 82곳 사용)  
> 우선순위: 대시보드·아카이브·마이페이지·알림 — 신입 고빈도 노출 화면 우선  
> 규율: 순수 표현 치환·로직 불변·문구 유지

---

## 1. 치환 완료 파일 목록 (12파일 · ~14 인스턴스)

| # | 파일 | 치환 내용 | 비고 |
|---|---|---|---|
| 1 | `src/features/dashboard/KudosWidget.tsx` | `<p>` → `EmptyState compact` (응원 없음) | PartyPopper 아이콘 재사용 |
| 2 | `src/features/dashboard/ProfileSideWidget.tsx` | 로컬 `Empty()` 함수 body → `EmptyState compact` | 알림/할일/쪽지 3곳 일괄 반영 |
| 3 | `src/app/dashboard/page.tsx` | `div+icon+p+p+Link` → `EmptyState` (위젯 없음) | LayoutDashboard 아이콘, actionHref 유지 |
| 4 | `src/app/mypage/notifications/page.tsx` | 대형 `div+icon+div+p+p+Link` → `EmptyState` | 동적 title/description/actions 유지 |
| 5 | `src/components/mypage/MyResearchView.tsx` | `<p>` → `EmptyState compact` (세션 없음) | Clock 아이콘 재사용 |
| 6 | `src/features/notifications/NotificationBell.tsx` | `<p>` → `EmptyState compact` (알림 없음) | Inbox 아이콘 신규 추가 |
| 7 | `src/app/leaderboard/page.tsx` | `div+Medal+p` → `EmptyState` (기록 없음) | Medal 아이콘 재사용 |
| 8 | `src/app/archive/my/page.tsx` | ① 로그인 유도 Card → EmptyState+actionHref<br/>② 즐겨찾기 없음 Card → EmptyState<br/>③ 최근 본 항목 없음 Card → EmptyState | 3 인스턴스 치환 |
| 9 | `src/app/archive/graph/page.tsx` | `Card+CardContent+Network+h2+p` → `EmptyState` | Network 아이콘 재사용 |
| 10 | `src/app/archive/[type]/ArchiveTypeListClient.tsx` | `Card+CardContent` (동적 텍스트) → `EmptyState` | concept·variable·measurement 등 전 타입 공용 |
| 11 | `src/app/archive/method-finder/page.tsx` | `<p>` → `EmptyState compact` (졸업생 논문 없음) | GraduationCap 재사용 |
| 12 | `src/app/archive/research-finder/page.tsx` | `<p>` → `EmptyState compact` (졸업생 논문 없음) | GraduationCap 재사용 |

---

## 2. 잔여 파일 목록 (다음 라운드 — 우선순위순)

### 2-A. 회원 대면 고빈도 (다음 1순위)

| 파일 | ad-hoc 패턴 | 추천 아이콘 |
|---|---|---|
| `src/features/dashboard/AcademicCalendarProgress.tsx` | `<p>` (학사일정 미등록) — WidgetCard 내부, canEdit 조건부 | CalendarDays |
| `src/features/dashboard/TodayTodosPopup.tsx` | ad-hoc `<p>` 확인 필요 | ListTodo |
| `src/features/dashboard/ProfileSummaryCard.tsx` | ad-hoc 패턴 확인 필요 | User |
| `src/features/mypage/LearningStreak.tsx` | ad-hoc `<p>` 확인 필요 | Flame |
| `src/features/mypage/GraduationChecklistCard.tsx` | ad-hoc 패턴 | CheckCircle2 |
| `src/features/mypage/LearningEffectCard.tsx` | ad-hoc 패턴 | TrendingUp |
| `src/app/mypage/portfolio/page.tsx` | ad-hoc 패턴 | Briefcase |
| `src/features/board/PostForm.tsx` | ad-hoc 패턴 확인 필요 | — |

### 2-B. 아카이브 서브페이지

| 파일 | ad-hoc 패턴 | 추천 아이콘 |
|---|---|---|
| `src/app/archive/[type]/[id]/page.tsx` | `<p>` (아직 없음) | FileText |
| `src/app/archive/statistical-methods/[id]/page.tsx` | `<p>` 확인 필요 | BarChart3 |
| `src/app/archive/foundation-terms/[id]/page.tsx` | `<p>` 확인 필요 | BookOpen |
| `src/app/archive/research-methods/[id]/page.tsx` | `<p>` 확인 필요 | Layers |
| `src/app/archive/writing-tips/[id]/page.tsx` | `<p>` 확인 필요 | PenLine |
| `src/features/archive/ArchiveGlobalSearch.tsx` | `div+p` (검색 결과 없음) — 검색 컨텍스트 특수 | Search |

### 2-C. 세미나·활동·리서치

| 파일 | ad-hoc 패턴 |
|---|---|
| `src/app/seminars/[id]/page.tsx` | ad-hoc 빈 상태 확인 필요 |
| `src/features/activities/ActivityPage.tsx` | ad-hoc 빈 상태 |
| `src/features/research/ResearchPaperList.tsx` | ad-hoc `<p>` |
| `src/features/content-draft/ContentDraftInbox.tsx` | ad-hoc 빈 상태 |
| `src/components/mypage/DiagnosticWeakConceptPath.tsx` | `<p>` + 인라인 Link (EmptyState CTA로 변환 필요) |

### 2-D. 콘솔·관리자 (운영진 전용 — 낮은 우선순위)

`src/app/console/**`, `src/features/admin/**`, `src/features/insights/**` 등  
(신입 대면 아님 → 다음 라운드 마지막)

---

## 3. 검증 결과

- `npx tsc --noEmit` → **에러 0** (전 파일 통과)
- `npx eslint src --quiet` → 실행 중 (백그라운드)
- 수정 금지 파일 준수: `src/features/hackathon/**` 미접촉 확인

---

## 4. 적용 원칙 요약

- **로직 불변**: 조건부 렌더 조건(`length === 0`, `!user` 등) 전혀 수정하지 않음
- **문구 유지**: 기존 텍스트 그대로 `title`/`description`으로 이동 (명백한 어색함만 정리)
- **아이콘**: 이미 파일에 import된 아이콘 재사용 우선, 신규 추가 최소
- **compact 모드**: 위젯 내부 등 좁은 영역은 `compact` prop 사용
- **className 보존**: `mt-3`, `bg-transparent` 등 여백·배경 커스터마이징 보존

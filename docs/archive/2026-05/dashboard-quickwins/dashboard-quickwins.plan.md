# Plan: 대시보드 Quick Wins 8건 (dashboard-quickwins)

> **작성일**: 2026-05-06
> **PDCA 단계**: Plan
> **추정 작업량**: 7~8h (1일 1 PDCA 사이클)
> **참조**: [dashboard-uiux-synthesis.md](../../03-analysis/dashboard-uiux-synthesis.md) §4 P0 Quick Wins
> **다음 사이클**: dashboard-persona-redesign (Sprint 2)

---

## 1. 목적

Codex × Claude 병렬 분석에서 양 모델이 **모두 P0**로 분류한 8건을 1일 안에 일괄 적용하여:
- **시맨틱 토큰·표준 컴포넌트 인프라** 구축 (이후 P1+ 작업의 기반)
- **WCAG 모바일 접근성 결함** 해소
- **알림 동시 노출** 즉시 차단

빠르게 운영 영향이 큰 항목부터 처리 — 큰 구조 변경은 다음 사이클(persona-redesign)에서.

---

## 2. 범위 (8건)

### Bundle A — 토큰·컴포넌트 인프라 (~3~4h)

| ID | 작업 | 파일 |
|----|------|------|
| A1 | `src/lib/design-tokens.ts` 신규 — `SEMANTIC` 상수 (info/warning/danger/success) + 다크모드 일괄 정의 | 신규 |
| A2 | `src/components/ui/widget-card.tsx` 신규 — `<WidgetCard title icon actions semantic>{children}</WidgetCard>` | 신규 |
| A3 | `src/components/ui/empty-state.tsx` 신규 — `<EmptyState icon message actions={[{label, href}]}>` | 신규 |
| A4 | `src/components/ui/skeleton-widget.tsx` 신규 — `<SkeletonWidget rows={3} />` | 신규 |
| A5 | 5개 위젯에 우선 적용 — MyAcademicActivitiesWidget, ActivityFeed, PeerActivityFeed, ComprehensiveExamCountdown, PushPermissionPrompt | 5 위젯 수정 |

### Bundle B — 모바일·접근성 (~2h)

| ID | 작업 | 파일 |
|----|------|------|
| B1 | MiniCalendar 월 이동 버튼 + 날짜 셀 → `h-11 w-11` (44px) | `src/features/dashboard/MiniCalendar.tsx` |
| B2 | MyTodosWidget `TabsList grid-cols-5` → `flex overflow-x-auto gap-1` + `shrink-0` | `src/features/dashboard/MyTodosWidget.tsx` |
| B3 | CourseTodoItem 인라인 편집 `opacity-0 group-hover:opacity-100` → `sm:opacity-0 sm:group-hover:opacity-100` (모바일 상시) | MyTodosWidget 내 또는 별도 파일 |

### Bundle C — 알림 순차화 + 운영 페이지 보강 (~2h)

| ID | 작업 | 파일 |
|----|------|------|
| C1 | PushPermissionPrompt — TodayTodosPopup 활성 시 노출 차단 (전역 dialog-active 상태 또는 zustand) | `src/features/dashboard/PushPermissionPrompt.tsx` |
| C2 | admin/activity-dashboard React Query에 `isLoading` 분기 (SkeletonWidget) + `isError` 분기 (Alert) | `src/app/admin/activity-dashboard/page.tsx` |

---

## 3. 비범위 (이번 사이클 제외)

- ★L "The Big 3" Primary Zone 시각 강조 — Sprint 2 (persona-redesign)
- ★K 페르소나별 위젯 배열 (`WIDGET_ORDER`) — Sprint 2
- ★J NotificationOrchestrator 전역 레이어 (전체 구현) — Sprint 2 (이번엔 단순 dialog-active 체크만)
- ★M MyTodosWidget 다이얼로그 단계화 — Sprint 3
- T 신규 회원 Zero State 온보딩 — Sprint 3
- 시즌 어댑터 / 위젯 지연 렌더 — Sprint 4 (chore PR)

---

## 4. 의존성·순서

```
A1 (design-tokens.ts) ────┐
                          ├──→ A2 (WidgetCard 사용)
                          ├──→ A3 (EmptyState 사용)
                          ├──→ A4 (SkeletonWidget 사용)
                          │
A2 + A3 + A4 ─────────────┴──→ A5 (5 위젯 적용)
                               │
                               ├──→ C2 (admin/activity-dashboard 도 SkeletonWidget·Alert 활용)
                               │
B1 / B2 / B3 ── 독립 ─────────│
C1 ── 독립 ────────────────────┘
```

→ A1 먼저 완료 후 A2~A5 가능. B/C는 A와 독립적으로 병렬 가능.

---

## 5. 검증 기준

- `npx tsc --noEmit` 통과
- `npm run build` 통과
- `npx vercel build` 통과 (SSG strict tsc)
- 수동 검증:
  - 라이트 모드 / 다크 모드 양쪽 색상 대비 확인 (DevTools Lighthouse 또는 시각 점검)
  - 모바일 (375px DevTools) MyTodosWidget 탭 스크롤 동작
  - 모바일 MiniCalendar 터치 타겟 44px 시각 확인
  - PushPermissionPrompt + TodayTodosPopup 동시 트리거 시 후자만 노출되는지

---

## 6. 리스크

| 리스크 | 완화 |
|--------|------|
| WidgetCard 적용 시 기존 클래스 차이로 일부 위젯 시각 회귀 | 5개 위젯만 우선 적용 (점진), 나머지는 다음 사이클로 |
| design-tokens 도입 후 기존 하드코딩 컬러와 시각 차이 | SEMANTIC 토큰 값을 기존 사용 색상에 맞춰 정의 → 시각 변화 최소 |
| MyTodosWidget 모바일 탭 스크롤 → 활성 탭 자동 스크롤 안 됨 | `data-state=active` 시 `scrollIntoView({inline:"center"})` 추가 |
| PushPermissionPrompt dialog-active 체크가 다른 dialog까지 차단 | TodayTodosPopup 전용 zustand state 또는 specific event 사용 |

---

## 7. 산출물 예측

- 신규 파일 4개: design-tokens.ts, widget-card.tsx, empty-state.tsx, skeleton-widget.tsx
- 수정 파일 ~9개: 5 위젯 + MiniCalendar + MyTodosWidget + PushPermissionPrompt + admin/activity-dashboard
- Commit: 2~3건 (Bundle A / B / C 별 commit 권장)
- Vercel 배포: 1회 (모든 작업 완료 후)

---

## 8. 일정

| 단계 | 시간 |
|------|------|
| Plan | 0.5h ✅ |
| Do — Bundle A | 3.5h |
| Do — Bundle B | 1.5h |
| Do — Bundle C | 1.5h |
| Build/Deploy | 0.5h |
| Report | 0.5h |
| **합계** | **~8h** |

---

> 다음: `/pdca do dashboard-quickwins` 즉시 진입 → Bundle A부터 시작.

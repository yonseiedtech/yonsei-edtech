# Plan: 대시보드 페르소나·위계 재설계 (dashboard-persona-redesign)

> **작성일**: 2026-05-06
> **PDCA 단계**: Plan
> **추정 작업량**: 12~16h (2일 1 PDCA 사이클)
> **참조**: [dashboard-uiux-synthesis.md](../../03-analysis/dashboard-uiux-synthesis.md) §5 Sprint 2 / P1 ★I·J·K·L·M
> **선행 사이클**: [dashboard-quickwins](./dashboard-quickwins.plan.md) ✅ 완료 (Bundle A 토큰·컴포넌트 인프라 의존)

---

## 1. 목적

Sprint 1에서 확보한 토큰·표준 컴포넌트 위에서, **페르소나별 노출 우선순위와 시각 위계**를 재설계.

핵심 변화:
1. 11개 위젯이 평등하게 나열되던 구조 → **3-tier 위계** (Primary / Secondary / Tertiary)
2. `isStaff` 분기로 부분 처리되던 로직 → **`WIDGET_ORDER: Record<UserRole, string[]>`** 명시적 배열
3. 페이지 중간에 묻혀 있던 빠른 액션 → `PageHeader` actions 통합 + `NextActionBanner` 인접
4. TodayTodosPopup·PushPermissionPrompt·NextActionBanner 3중 충돌 → **NotificationOrchestrator 우선순위 큐**
5. MyTodosWidget의 5종 데이터·복수 폼 단일 다이얼로그 → **컨텍스트별 단계화**

---

## 2. 범위 (5건)

### F1: 페르소나별 위젯 배열 (★K, P1)
**문제**: `isStaff` 조건 분기는 StatCard 4개와 "관리 알림"만 처리. alumni·advisor·president는 재학생과 동일.
**해결**:
- `src/features/dashboard/widget-order.ts` 신규 — `WIDGET_ORDER: Record<UserRole, string[]>` (member·staff·president·advisor·alumni·admin)
- `src/app/dashboard/page.tsx` 리팩터 — 위젯을 `widget-registry.tsx` 룩업 객체로 분리, 페르소나에 맞는 배열만 렌더
- alumni: 종합시험·수강 위젯 제외, 뉴스레터·동문 네트워크 우선
- staff/president: 운영 알림 배너를 NextActionBanner 바로 아래로 분리

**파일 신규**:
- `src/features/dashboard/widget-order.ts`
- `src/features/dashboard/widget-registry.tsx`

**파일 수정**:
- `src/app/dashboard/page.tsx`

### F2: "The Big 3" Primary Zone 시각 강조 (★L, P1)
**문제**: 11개 위젯이 `rounded-2xl border bg-card p-6`로 평등.
**해결**:
- `WidgetCard` 에 `priority: "primary" | "secondary" | "tertiary"` prop 추가
- primary: `shadow-sm` + `text-xl` 헤더 + 살짝 강한 배경 톤
- secondary: 기존 (default)
- tertiary: 약간 약한 톤 + 작은 패딩 (압축)
- NextActionBanner / AcademicCalendarProgress / MyTodosWidget 만 primary

**파일 수정**:
- `src/components/ui/widget-card.tsx`
- 위 3개 위젯 + 일부 secondary 위젯

### F3: CTA 통합 (★I, P1)
**문제**: "빠른 액션" (게시글 작성·세미나·마이페이지·운영 콘솔) 이 페이지 중간에 위치.
**해결**:
- `src/app/dashboard/page.tsx` "빠른 액션" 섹션 제거
- `PageHeader` actions prop으로 1~2개 핵심 CTA 이동 (페르소나별 다른 액션)
- 나머지는 `NextActionBanner` 우측 영역 또는 위젯 내부 진입점에 흡수

**파일 수정**:
- `src/app/dashboard/page.tsx`
- (필요 시) `src/components/ui/page-header.tsx` actions slot 확장

### F4: NotificationOrchestrator (★J, P1)
**문제**: Sprint 1 의 `popup-coordination.ts` 는 단일 페어(TodayPopup ↔ PushPrompt)만 처리. 운영 알림·일반 토스트는 미통합.
**해결**:
- `src/features/dashboard/notification-orchestrator.ts` 신규 — 우선순위 큐 (priority: number, payload: {kind, render})
- 등록 키: `"undergrad-info"`, `"today-todos"`, `"push-permission"`, `"staff-alert"`, `"site-popup"`
- 우선순위: 운영 알림 > 학부 정보 미입력 > 오늘 마감 할 일 > 사이트 팝업 > 푸시 권한
- 하루에 최대 1개의 modal/sheet 자동 노출 (sessionStorage 게이트)
- Sprint 1의 popup-coordination 흡수·deprecate

**파일 신규**:
- `src/features/dashboard/notification-orchestrator.ts`

**파일 수정**:
- `TodayTodosPopup`, `PushPermissionPrompt`, (필요 시 `SitePopupGate`, undergrad info popup)

### F5: MyTodosWidget 추가 다이얼로그 단계화 (★M, P1)
**문제**: 단일 Dialog에 수업·연구활동·학술활동·운영 5종 추가 폼이 한꺼번에 노출.
**해결**:
- 1단계: 컨텍스트 선택 (수업 / 연구 / 학술 / 운영) — 큰 버튼 4종
- 2단계: 선택된 컨텍스트의 폼만 표시
- 데스크톱은 단일 화면에서 맞춤 표시 가능 (탭 형식 유지) — 모바일에서만 단계화

**파일 수정**:
- `src/features/dashboard/MyTodosWidget.tsx` (또는 `AddTodoDialog` 분리)

---

## 3. 비범위 (이번 사이클 제외)

- T 신규 회원 Zero State 온보딩 (P3) — Sprint 3
- S 시즌 어댑터 (방학·시험기간 카운트다운) — Sprint 3
- N 모바일 스크롤 힌트 / O 8px 그리드 강제 / P StatCard 마이크로모션 / Q document.hidden / R focus-visible 보완 — Sprint 4 (chore PR 일괄)
- U 위젯 지연 렌더 (Intersection Observer) — Sprint 4

---

## 4. 의존성·순서

```
F1 (widget-order, registry) ──┐
                               ├──→ F2 (priority prop on WidgetCard) → primary 위젯 확정
F1 ─────────────────────────────┤
                               └──→ F3 (PageHeader actions, 빠른 액션 제거)
                               
F4 (NotificationOrchestrator) ── 독립 ── popup-coordination deprecate
F5 (MyTodos 단계화) ── 독립
```

권장 순서: F1 → F2 → F3 (위계 작업 묶음) → F4 → F5 (별도 사이클로 가능)

---

## 5. 검증

- `npx tsc --noEmit` + `npm run build`
- 페르소나별 시각 점검 (DevTools 또는 사용자 권한 전환):
  - member: NextActionBanner → AcademicCalendar → MyTodos → ... 순
  - staff/president: StaffAlertBanner 가 최상위에 추가
  - alumni: 종합시험·수강 위젯 비노출
  - advisor: 운영 알림 + 세미나만 노출
- 모바일·다크모드 대비 회귀 확인
- TodayPopup·PushPrompt·UndergradPopup·SitePopup 4종이 동시 트리거되는 시나리오에서 1개만 자동 노출

---

## 6. 리스크

| 리스크 | 완화 |
|--------|------|
| WIDGET_ORDER 도입 시 기존 위젯 일부가 누락되어 회귀 | dashboard/page.tsx 의 모든 위젯 import 를 등록하지 않으면 빌드 시 ESLint unused 경고로 잡히도록 | 
| F2 priority prop 으로 시각 변화가 너무 큼 | 변화 폭은 미세 (그림자·헤더 크기·패딩 0.5~1단계) — 시각 점검 필수 |
| F4 NotificationOrchestrator 가 기존 모달 흐름 깨뜨림 | Sprint 1 의 popup-coordination 인터페이스 호환 우선, 점진 마이그레이션 |
| F5 단계화로 데스크톱 사용자 동선 더 길어짐 | 데스크톱은 단계화 적용 안 함 (md+ 화면은 단일 폼 유지) |
| alumni·advisor 페르소나 미테스트 → 빈 대시보드 | F1 시 각 페르소나 최소 4개 위젯 보장 점검 |

---

## 7. 산출물 예측

- 신규 파일 3개: widget-order.ts, widget-registry.tsx, notification-orchestrator.ts
- 수정 파일 ~8개: dashboard/page.tsx, WidgetCard, NextActionBanner / AcademicCalendarProgress / MyTodosWidget (primary 적용), TodayTodosPopup, PushPermissionPrompt, MyTodosWidget AddTodoDialog
- Commit: 4건 (F1+F2+F3 한 묶음 / F4 / F5 / Report)
- Vercel 배포: 1회

---

## 8. 일정

| 단계 | 시간 |
|------|------|
| Plan | 0.5h ✅ |
| Do — F1 widget-order + registry | 3h |
| Do — F2 priority prop + 3 primary widgets | 2h |
| Do — F3 PageHeader actions 통합 | 1h |
| Do — F4 NotificationOrchestrator | 3h |
| Do — F5 MyTodos 단계화 | 3h |
| Build/Deploy/Report | 1.5h |
| **합계** | **~14h** |

---

> 다음: `/pdca do dashboard-persona-redesign` 즉시 진입 → F1 (widget-order + registry) 부터.

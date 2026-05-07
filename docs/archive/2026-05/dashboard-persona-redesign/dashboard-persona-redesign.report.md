# 완료 보고서: 대시보드 페르소나·위계 재설계 (dashboard-persona-redesign)

> **작성일**: 2026-05-07
> **PDCA 단계**: Report
> **상태**: ✅ 완료 (F1~F5)
> **참조**: [Plan](../archive/2026-05/dashboard-persona-redesign/dashboard-persona-redesign.plan.md), [Sprint 1 보고서](./dashboard-quickwins.report.md)

---

## 1. 요약

Sprint 1에서 구축한 인프라 위에, **페르소나별 노출 우선순위와 시각 위계** 재설계.

| ID | 항목 | 결과 |
|----|------|------|
| F1 | 페르소나 가시성 (`widget-visibility.ts`) | 졸업생·자문위원에게 학사 위젯 5종 자동 비노출 |
| F2 | Primary tier 시각 강조 | 3개 위젯(NextAction·AcademicCalendar·MyTodos)에 `shadow-sm` + 헤더 `text-xl` |
| F3 | CTA 통합 | "빠른 액션" 섹션 제거 → PageHeader actions slot 으로 흡수 |
| F4 | NotificationOrchestrator | 4종 자동 알림 우선순위 큐 일괄 통합 |
| F5 | MyTodos 모바일 단계화 | picker(4 큰 버튼) → form 단계 / 데스크톱은 기존 탭 유지 |

---

## 2. 핵심 산출물

### F1 — `widget-visibility.ts`
```ts
canShowWidget(role, key): boolean
// alumni / advisor → 학사 위젯(academicCalendar, dailyClassTimeline, myTodos, comprehensiveExam, myAcademicActivities) 비노출
```

### F2 — `WidgetCard.priority`
```ts
type WidgetPriority = "primary" | "secondary" | "tertiary";
```
- `primary`: shadow-sm + text-lg sm:text-xl + 표준 padding
- `tertiary`: 압축 padding (p-4 sm:p-5)
- AcademicCalendarProgress 4 return path 모두 `WidgetCard priority="primary"`로 변환
- MyTodosWidget (1,667줄)는 외곽만 직접 shadow-sm 적용 (헤더 보존)
- NextActionBanner는 banner Link에 shadow-sm 추가

### F3 — PageHeader actions 통합
- "글 작성" / "세미나" / "운영 콘솔"(staff+) + 역할 배지 → 페이지 최상단 우측

### F4 — `notification-orchestrator.ts`
- modal slot 배타: `undergrad-info(P1) > site-popup(P2) > today-todos(P3)`
- banner slot: `push-permission(P100)` — modal 활성 시 자동 보류
- Sprint 1 `popup-coordination.ts` → 본 모듈 위 redirect (back-compat shim)
- 마이그레이션: UndergradInfoPrompt · SitePopupGate · TodayTodosPopup · PushPermissionPrompt 4개 모두 wiring

### F5 — MyTodos 모바일 단계화
- `mobileStep: "picker" | "form"` — openAdd 시 "picker" 초기화
- 모바일 picker: 4개 큰 카테고리 버튼 (수업 / 학술활동 / 세미나 / 운영 업무)
- 모바일 form: ChevronLeft "카테고리 변경" back 버튼
- TabsList는 `hidden sm:grid` (데스크톱 전용) — Tailwind JIT 룩업도 sm: prefix 화

---

## 3. Commit·배포

| Phase | Commit | 내용 |
|-------|--------|------|
| Phase A | `8ec2b154` | F1 + F2 prop + F3 |
| F2 적용 | `08f54109` | 3개 Primary 위젯에 실제 마킹 |
| F4 | `79d1bbed` | NotificationOrchestrator |
| F5 | `12fe58bc` | MyTodos 단계화 + 네트워크 노드 이름 fix 동반 |

배포: 4회 (각 Phase별 push + vercel --prod) — `https://yonsei-edtech.vercel.app`

---

## 4. 검증

- `npx tsc --noEmit` + `npm run build` + `npx vercel --prod` 모두 통과
- F4 wiring: 4종 popup 동시 트리거 시나리오에서 1개만 자동 노출 (priority 큐 동작)
- F5 단계화: 모바일 375px 에서 picker → form 흐름 정상

---

## 5. 후속 권장 (Sprint 3·4 후보)

| ID | 항목 | 우선 |
|----|------|------|
| T | 신규 회원 Zero State 온보딩 | P3 |
| S | AcademicCalendarProgress 시즌 어댑터 | P2 |
| N+O+P+Q+R | 모바일 스크롤 힌트 + 8px 그리드 + 마이크로모션 + document.hidden + focus-visible 묶음 chore PR | P2 |
| U | 위젯 지연 렌더 (Intersection Observer) | P3 |

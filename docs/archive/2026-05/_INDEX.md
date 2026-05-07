# Archive Index - 2026-05

> **참조 분석 리포트** (cross-cutting):
> - [`dashboard-uiux-claude.md`](./dashboard-uiux-claude.md) — Claude designer 단독 분석 (3,000자)
> - [`dashboard-uiux-synthesis.md`](./dashboard-uiux-synthesis.md) — Codex × Claude 통합 메타 분석 + 우선순위 매트릭스

---

## types-domain-split

- **Archived**: 2026-05-06
- **Match Rate**: N/A (type-only refactor — 빌드/배포로 검증)
- **Iterations**: 0
- **Duration**: 2026-05-06 (Plan → Phase 1~6 → Report → 후속작업 FU-3)

### Documents
- `types-domain-split.plan.md` - Plan document (16개 도메인 분해 매핑)
- `types-domain-split.report.md` - Completion report (2719줄 → 34줄, 98.7% 감소)
- `types-domain-split-followups.md` - 후속작업 트래킹 (FU-1·FU-2 연기, FU-3 적용)

### Outcome
- src/types/index.ts 단일 비대 파일을 16개 도메인 sub 파일로 분해
- @/types 사용처 영향 0 (re-export 패턴)
- ESLint no-restricted-imports 룰로 회귀 방지
- 9 commit (Phase 1~6 + 2 fixup + 1 report + 1 후속) — 회귀 추적 가능

---

## dashboard-quickwins (Sprint 1)

- **Archived**: 2026-05-07
- **Match Rate**: N/A (UI 시각 변경 — 빌드/배포로 검증)
- **Iterations**: 0
- **Duration**: 2026-05-06

### Documents
- `dashboard-quickwins.plan.md` - 8건 Quick Wins (Bundle A·B·C)
- `dashboard-quickwins.report.md` - 완료 보고서

### Outcome
- 토큰·표준 컴포넌트 인프라 구축 (`design-tokens.ts` + `WidgetCard` + `EmptyState` 확장 + `SkeletonWidget`)
- 5 위젯 다크모드 일괄 처리
- WCAG 모바일 터치 타겟 보강 (MiniCalendar 32→44px), MyTodos 모바일 탭, 인라인 편집 모바일 상시
- 알림 동시 노출 차단 (popup-coordination)
- 운영 대시보드 isLoading/isError 분기

### Commits
`c2e201ee` (A) · `4420e084` (B) · `96c6cfc3` (C)

---

## dashboard-persona-redesign (Sprint 2)

- **Archived**: 2026-05-07
- **Match Rate**: N/A (UI 시각 변경)
- **Iterations**: 0
- **Duration**: 2026-05-06 ~ 2026-05-07

### Documents
- `dashboard-persona-redesign.plan.md` - F1~F5 페르소나·위계 재설계
- `dashboard-persona-redesign.report.md` - 완료 보고서

### Outcome
- F1: `widget-visibility.ts` — alumni·advisor 학사 위젯 자동 비노출
- F2: WidgetCard `priority` prop + 3 Primary 위젯 시각 강조
- F3: "빠른 액션" → PageHeader actions slot 통합
- F4: `notification-orchestrator.ts` — 4종 자동 알림 우선순위 큐 일괄 통합
- F5: MyTodos 추가 다이얼로그 모바일 단계화 (picker → form)

### Commits
`8ec2b154` (Phase A) · `08f54109` (F2 적용) · `79d1bbed` (F4) · `12fe58bc` (F5)

---

## major-network-map (Phase 1 MVP)

- **Archived**: 2026-05-07
- **Match Rate**: N/A (신규 기능)
- **Iterations**: 0
- **Duration**: 2026-05-06 ~ 2026-05-07

### Documents
- `major-network-map.plan.md` - 고도화 제안서 (Phase 1~4 로드맵)
- `major-network-map.report.md` - MVP 완료 보고서

### Outcome
- /network 신규 페이지 (대학원 생활 → 네트워크)
- 회원 노드 + 동기/신분 자동 추정 엣지 (react-flow)
- 4종 MVP 기능: 관계 체크박스 / 1촌 토글 / 검색 / 클릭→미니 모달
- vitest 7/7 통과 (build-network.test.ts)

### Commits
`93df2c3a` (MVP) · `12fe58bc` (이름 표시 fix 동반)

### 후속 — Phase 2~4
- Phase 2: 옵트아웃 토글 + 학교급 (~8h)
- Phase 3: 교육청 + 관심사 다차원 (~12h)
- Phase 4: 클러스터·추천·시계열 (~16h)

---

## members-split

- **Archived**: 2026-05-07
- **Match Rate**: N/A (chore-style IA 정리)
- **Iterations**: 0
- **Duration**: 2026-05-07

### Documents
- `members-split.report.md` - Plan + Report 결합 (chore-scale)

### Outcome
- 단일 4탭 /members → 두 컨텍스트 페이지로 분리
- /about/leadership: 학회 소개 — 주임교수 / 운영진 (OrgChart 포함)
- /members: 대학원 생활 — 재학생 / 졸업생
- Legacy URL 자동 redirect (`/members?tab=professor|staff` → `/about/leadership`)
- GNB 링크 갱신 (Header.tsx)

### Commits
`db63dab7`

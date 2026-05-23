# 대시보드 사용자 개인화 — Phase D 명세 (2026-05-23)

> 작성: Claude Opus 4.7 · 자율 PM 모드 사용자 요청
> 전제: Phase A/B/C 완료 (queryKey 통합·위젯 분할·퍼소나 분기·Alumni 위젯·신규사용자 체크리스트)

## TL;DR

사용자가 본인 대시보드를 **위치 조정·표시 토글·알림 비활성화** 할 수 있게 한다. 4-step sub-phase 로 나눠 진행하며, P0 가시성 토글(D-1) → P1 순서 변경(D-2) → P2 알림 비활성화(D-3) → P3 프리셋(D-4) 순으로 점진 배포.

## 1. 적용 범위 (어떤 위젯이 개인화 대상인가)

**개인화 대상 위젯** (총 14종):
| key | 라벨 | 기본 표시 | 비고 |
|---|---|---|---|
| `nextActionBanner` | 다음 액션 안내 | ON | sticky 헤더성, 비활성화 가능 |
| `dailyTimeline` | 일일 수업 타임라인 | ON (학생) | 학부생/대학원생 |
| `myTodos` | 나의 할 일 | ON | 모든 사용자 |
| `statCards` | 통계 카드 | ON | |
| `notices` | 공지사항 | ON | |
| `miniCalendar` | 미니 캘린더 | ON | |
| `myAcademicActivities` | 학술활동 | ON (학생) | |
| `comprehensiveExam` | 종합시험 | ON (대학원생) | |
| `dailyReflection` | 학습 회고 | ON | |
| `aiForumLive` | AI 포럼 라이브 | ON | |
| `spacedRepetition` | 간격 반복 학습 | ON | |
| `peerActivityFeed` | 동료 활동 피드 | ON | feedOptIn 별도 게이트 |
| `seminars` | 예정 세미나 | ON | |
| `staffAlerts` | 운영 알림 | ON (운영진) | StaffPriorityPanel 있으면 자동 숨김 |

**개인화 비대상** (항상 표시):
- Header / NewMemberWelcomeBanner / NewMemberChecklistWidget / StaffPriorityPanel / TermBriefHero / TodaySummaryCard (모바일)

## 2. 데이터 모델

### 2-1. 저장 위치 — **2-tier**

**Tier 1 (1차, P0 가능)**: `localStorage`
- Key: `dashboard:layout:v1:{userId}`
- Value: JSON `{ widgets: [{ key, visible, order, mutedNotifications }], updatedAt }`
- 장점: 즉시 구현·서버 라운드트립 없음·Firestore rules 변경 불필요
- 단점: 기기간 동기화 안 됨

**Tier 2 (영구화, P1 후)**: Firestore `users/{uid}.dashboardLayout` 필드
- 기존 user document 의 새 optional field 로 추가
- 기기간 sync. localStorage 는 cache 로 활용
- 마이그레이션: 최초 fetch 시 localStorage → Firestore 자동 백업

### 2-2. 타입 정의 (예정 — `src/types/dashboard-layout.ts`)
```ts
export type DashboardWidgetKey =
  | "nextActionBanner" | "dailyTimeline" | "myTodos" | "statCards"
  | "notices" | "miniCalendar" | "myAcademicActivities" | "comprehensiveExam"
  | "dailyReflection" | "aiForumLive" | "spacedRepetition"
  | "peerActivityFeed" | "seminars" | "staffAlerts";

export interface DashboardWidgetConfig {
  key: DashboardWidgetKey;
  visible: boolean;
  order: number;        // 0~13
  mutedNotifications?: boolean;  // D-3, 위젯별 토스트/뱃지 비활성화
}

export interface DashboardLayout {
  widgets: DashboardWidgetConfig[];
  preset?: "default" | "student" | "staff" | "research" | "minimal";
  updatedAt: string;
  schemaVersion: 1;
}
```

### 2-3. 기본값
- 신규 사용자: 퍼소나(`getUserPersona`) 기반 자동 프리셋 적용
  - 학생 → "student" (학술 위젯 위주)
  - 운영진 → "staff" (StaffPriority + 통계 위주)
  - 졸업생 → Alumni 전용 컨테이너 (개인화 비활성, AlumniHomeWidgets 고정)

## 3. 단계별 분해

### D-1 (P0, 2일) — 가시성 토글 매트릭스

**범위**: 위젯을 보이게/숨기게 토글. 순서 변경은 D-2.

**구현**:
1. `src/app/mypage/dashboard-settings/page.tsx` 신규 — 위젯 가시성 설정 페이지
2. 14개 위젯 카드 그리드, 각 카드에 토글 스위치
3. localStorage 즉시 저장 + 토스트 "저장됨"
4. `src/lib/dashboard-layout.ts` 신규 — load/save/get visibility helper
5. `src/app/dashboard/page.tsx` 에 `useDashboardLayout()` 훅 적용 — `widget.visible === false` 면 렌더 안 함
6. MyPage 사이드바에 "대시보드 설정" 진입점 추가

**제약**:
- 모바일에서도 동일 페이지 (토글은 모바일 친화)
- 비활성화된 위젯은 React Query 도 disable (불필요 fetch 막음) — `enabled: visible`

### D-2 (P1, 3일) — 위젯 순서 변경 (드래그·화살표)

**범위**: 위젯 순서를 사용자가 변경.

**구현**:
1. `@dnd-kit/core` + `@dnd-kit/sortable` 추가 (가벼움, React Query 충돌 없음)
2. dashboard-settings 페이지에 드래그 핸들 + 모바일용 ↑↓ 화살표 둘 다 제공
3. 순서 변경 시 `order` 값 재계산 + localStorage 저장
4. `dashboard/page.tsx` 렌더 시 `widgets.sort((a,b) => a.order - b.order)` 적용
5. "기본 순서로 복원" 버튼

**제약**:
- 데스크톱 드래그 + 모바일 화살표 동시 지원 (접근성)
- 드래그 시 keyboard 접근성 (`@dnd-kit` 기본 제공)

### D-3 (P2, 2일) — 위젯별 알림 비활성화

**범위**: 위젯이 보이지만 토스트·뱃지·소리는 끄기. 또는 React Query 폴링 중단.

**구현**:
1. dashboard-settings 페이지 각 위젯 카드에 "알림 끄기" 토글
2. `mutedNotifications: true` 인 위젯은:
   - toast.success/info 호출을 no-op (위젯 내부에서 `useMutedNotifications(key)` 훅으로 가드)
   - StaleTime 을 3배로 증가 (백그라운드 부하 절감)
3. 적용 위젯 예시: peerActivityFeed (피드 알림 끔), aiForumLive (실시간 폴링 중단), seminars (예정 알림 끔)

**제약**:
- 모든 위젯이 알림을 가진 건 아님 → key 별로 옵트인 (DASHBOARD_NOTIFIABLE_WIDGETS 화이트리스트)

### D-4 (P2, 2일) — 프리셋

**범위**: 4-5개 프리셋으로 빠른 전환.

**프리셋**:
- **기본**: 모든 위젯 ON, 기본 순서
- **학생 집중**: dailyTimeline / myTodos / myAcademicActivities / comprehensiveExam 상단, 피드·AI 하단
- **운영진 집중**: staffAlerts / statCards 상단, 학생 위젯 숨김
- **연구 집중**: myAcademicActivities / spacedRepetition / dailyReflection 상단, 피드·세미나 하단
- **미니멀**: nextActionBanner / myTodos / dailyTimeline 만 표시, 나머지 숨김

**구현**:
1. `src/lib/dashboard-presets.ts` — 프리셋 정의 (DashboardLayout 5개)
2. dashboard-settings 페이지 상단에 프리셋 셀렉트 (4-5 카드)
3. 프리셋 선택 시 confirm 다이얼로그 → 현재 설정 덮어쓰기
4. 프리셋 적용 후에도 개별 토글로 fine-tune 가능

### D-5 (P3, 1일) — Firestore 영구화

**범위**: Tier 2 활성화. 기기간 동기화.

**구현**:
1. `users/{uid}.dashboardLayout` 필드 (firestore.rules: 본인만 read/write)
2. `src/lib/dashboard-layout.ts` — `loadLayout`/`saveLayout` 헬퍼에 Firestore fallback
3. 로그인 시 Firestore → localStorage 동기화. 저장 시 양쪽 모두 업데이트
4. 로그아웃 시 localStorage 유지 (다음 로그인 시 사용자별 분리)

## 4. UX·UI 가이드

### dashboard-settings 페이지 레이아웃
```
┌─────────────────────────────────────┐
│ 대시보드 설정                          │
├─────────────────────────────────────┤
│ [기본] [학생 집중] [운영진] [연구] [미니멀]│  ← 프리셋
├─────────────────────────────────────┤
│ ⋮⋮ ☑ 다음 액션 안내       🔕         │
│ ⋮⋮ ☑ 일일 수업 타임라인   🔔         │
│ ⋮⋮ ☐ 나의 할 일           🔔         │  ← 드래그 핸들 + 가시성 + 알림
│ ⋮⋮ ☑ 통계 카드            🔕         │
│ ...                                  │
├─────────────────────────────────────┤
│ [기본 순서로 복원]  [모두 켜기]         │
└─────────────────────────────────────┘
```

### 진입 동선
1. MyPage 사이드바 → "대시보드 설정" 메뉴
2. Dashboard 상단 헤더 우측 ⚙️ 아이콘 → 같은 페이지로 이동
3. 신규 사용자 체크리스트에 "내 대시보드 정리하기" 항목 추가 (선택)

## 5. 위험 요인·완화

| 위험 | 완화 |
|---|---|
| 사용자가 모든 위젯을 숨겨버려 빈 대시보드 | "최소 1개는 표시" 강제 + 모두 숨김 시 안내 카드 |
| 신규 위젯 추가 시 기존 사용자 layout 미반영 | schemaVersion 체크 + 새 위젯 기본 visible=true 자동 병합 |
| 모바일 드래그 UX 어려움 | 드래그 + 화살표 둘 다 제공 |
| Firestore write 빈번 (드래그 중) | debounce 500ms + 화면 이탈 시 final save |
| 운영진 알림 (staffAlerts) 끄면 업무 누락 | 운영진은 staffAlerts·StaffPriorityPanel 비활성화 시 경고 토스트 |

## 6. 로드맵 일정

| Step | 작업량 | 누적 | 비고 |
|---|---|---|---|
| D-1 가시성 토글 | 2일 | 2일 | localStorage 1차 |
| D-2 순서 변경 | 3일 | 5일 | @dnd-kit 도입 |
| D-3 알림 비활성화 | 2일 | 7일 | 화이트리스트 위젯 한정 |
| D-4 프리셋 | 2일 | 9일 | 5개 정의 |
| D-5 Firestore 영구화 | 1일 | 10일 | Tier 2 |

**최소 출시 (MVP)**: D-1 + D-4 (4일) — 가시성 + 프리셋만으로도 사용자 가치 큼
**전체 출시**: D-1~5 (10일) — 완전체

## 7. 측정 지표

- `dashboardLayout` 필드 가진 사용자 수
- 프리셋 사용률 (기본 vs 학생·운영진·연구·미니멀)
- 가장 많이 숨겨진 위젯 (UX 개선 시그널)
- 가장 많이 최상단으로 이동된 위젯 (기본 순서 재검토 시그널)
- dashboard-settings 페이지 방문 후 7일내 재방문률

---

*작성: Claude Opus 4.7 · 일자: 2026-05-23 · 자율 PM 모드 사용자 요청*

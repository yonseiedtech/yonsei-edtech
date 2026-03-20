# Design: 관리자 페이지 고도화 (admin-enhance)

## 1. 구현 순서

```
1. admin/layout.tsx 리팩토링 (공통 레이아웃 + 사이드바/탭 네비게이션)
2. 탭별 개별 라우트 페이지 생성 (7개)
3. admin/page.tsx → 리다이렉트 전용으로 변경
4. settings/ 중첩 레이아웃 + 세부 탭 페이지 (7개)
5. AdminGreetingTab.tsx 섹션 분리 → 개별 컴포넌트화
6. 운영진 조직도 데이터 모델 + API 훅
7. 조직도 편집 UI (admin/settings/org-chart)
8. 조직도 시각화 컴포넌트 (OrgChart.tsx)
9. 구성원 페이지 staff 탭에 조직도 통합
10. 기존 링크 업데이트 (Header, Dashboard 등)
```

## 2. 라우트 구조

```
src/app/admin/
├── layout.tsx          → 공통 레이아웃 (AuthGuard + 사이드 네비게이션)
├── page.tsx            → 리다이렉트 (/admin/members 또는 /admin/posts)
├── members/page.tsx    → AdminMemberTab
├── posts/page.tsx      → AdminPostTab
├── seminars/page.tsx   → AdminSeminarTab
├── inquiries/page.tsx  → AdminInquiryTab
├── newsletter/page.tsx → AdminNewsletterTab
├── agents/page.tsx     → AdminAgentTab
└── settings/
    ├── layout.tsx      → 세부 탭 네비게이션
    ├── page.tsx        → 리다이렉트 (/admin/settings/greeting)
    ├── greeting/page.tsx    → 인사말 편집
    ├── professor/page.tsx   → 주임교수 편집
    ├── about/page.tsx       → 학회 소개 (미션/비전/가치)
    ├── history/page.tsx     → 연혁 편집
    ├── fields/page.tsx      → 활동 분야 편집
    ├── contact/page.tsx     → 연락처 편집
    ├── presidents/page.tsx  → 역대 회장 편집
    └── org-chart/page.tsx   → 운영진 조직도 편집
```

## 3. 컴포넌트 상세 설계

### 3.1 admin/layout.tsx (공통 레이아웃)

```typescript
// 클라이언트 컴포넌트
// AuthGuard + 헤더 + 탭 네비게이션 + children

const ADMIN_TABS = [
  { href: "/admin/members", label: "회원", icon: Users, presidentOnly: true },
  { href: "/admin/posts", label: "게시글", icon: FileText },
  { href: "/admin/seminars", label: "세미나", icon: BookOpen },
  { href: "/admin/inquiries", label: "문의", icon: MessageSquare },
  { href: "/admin/newsletter", label: "학회보", icon: Newspaper },
  { href: "/admin/agents", label: "에이전트", icon: Bot },
  { href: "/admin/settings", label: "사이트 설정", icon: Settings },
];

UI:
  ┌──────────────────────────────────────────┐
  │ 🛡 관리자                                │
  │ [통계카드 4열]                            │
  │                                          │
  │ [회원|게시글|세미나|문의|학회보|에이전트|설정] │  ← 상단 탭바 (가로 스크롤)
  │ ─────────────────────────────────────────│
  │ {children}                               │
  └──────────────────────────────────────────┘

- pathname 기반 활성 탭 감지: pathname.startsWith(tab.href)
- 탭 클릭 시 Link 컴포넌트로 클라이언트 라우팅
- presidentOnly 탭은 isPresidentOrAbove(user)일 때만 표시
```

### 3.2 admin/page.tsx (리다이렉트)

```typescript
// 클라이언트 컴포넌트
// canManageMembers ? redirect("/admin/members") : redirect("/admin/posts")
// useEffect + router.replace 사용 (서버 redirect 대신)
```

### 3.3 탭별 페이지 (7개)

각 페이지는 기존 탭 컴포넌트를 래핑:

```typescript
// src/app/admin/posts/page.tsx
"use client";
import AdminPostTab from "@/features/admin/AdminPostTab";
export default function AdminPostsPage() {
  return <AdminPostTab />;
}
```

동일 패턴으로: members, seminars, inquiries, newsletter, agents

### 3.4 settings/layout.tsx (세부 탭 레이아웃)

```typescript
const SETTINGS_TABS = [
  { href: "/admin/settings/greeting", label: "인사말" },
  { href: "/admin/settings/professor", label: "주임교수" },
  { href: "/admin/settings/about", label: "학회 소개" },
  { href: "/admin/settings/history", label: "연혁" },
  { href: "/admin/settings/fields", label: "활동 분야" },
  { href: "/admin/settings/contact", label: "연락처" },
  { href: "/admin/settings/presidents", label: "역대 회장" },
  { href: "/admin/settings/org-chart", label: "운영진 조직도" },
];

UI:
  ┌──────────────────────────────────┐
  │ [인사말|주임교수|학회소개|연혁|...] │  ← 세부 탭 (소형, 가로 스크롤)
  │ ─────────────────────────────────│
  │ {children}                       │  ← 개별 설정 페이지
  └──────────────────────────────────┘

- 스타일: 작은 크기의 pill/underline 탭
- pathname 기반 활성 감지
```

### 3.5 설정 개별 페이지 (7개)

AdminGreetingTab.tsx의 각 Section을 독립 페이지로 분리.
기존 섹션 컴포넌트를 `src/features/admin/settings/`로 이동:

```
src/features/admin/settings/
├── GreetingSection.tsx     ← AdminGreetingTab의 GreetingSection 추출
├── ProfessorSection.tsx    ← ProfessorSection 추출
├── AboutSection.tsx        ← AboutSection 추출
├── HistorySection.tsx      ← HistorySection 추출
├── FieldsSection.tsx       ← FieldsSection 추출
├── ContactInfoSection.tsx  ← ContactInfoSection 추출
└── PastPresidentsSection.tsx ← PastPresidentsSection 추출
```

각 페이지는 섹션 컴포넌트 1개만 렌더링:
```typescript
// src/app/admin/settings/greeting/page.tsx
"use client";
import GreetingSection from "@/features/admin/settings/GreetingSection";
export default function AdminGreetingPage() {
  return <GreetingSection />;
}
```

### 3.6 운영진 조직도 데이터 모델

```typescript
// src/features/admin/settings/org-chart-types.ts

interface OrgPosition {
  id: string;
  title: string;          // 직책명 (회장, 부회장, 학술팀장 등)
  department?: string;    // 부서명 (학술부, 홍보부 등)
  level: number;          // 0=회장, 1=부회장/감사, 2=팀장, 3=팀원
  parentId?: string;      // 상위 직책 ID (회장은 없음)
  order: number;          // 동일 레벨 내 정렬 순서
  userId?: string;        // 배정된 회원 ID
  userName?: string;      // 표시용 이름 (비정규화)
  userPhoto?: string;     // 표시용 사진 URL
}
```

저장: Firestore `site_settings` 컬렉션, key = `"org_chart"`, value = `OrgPosition[]` (JSON 직렬화)
→ 기존 `useSiteSetting` 패턴 재활용.

### 3.7 조직도 API 훅

```typescript
// src/features/admin/settings/useOrgChart.ts

export function useOrgChart() {
  return useSiteSetting<OrgPosition[]>("org_chart", DEFAULT_ORG);
}

export function useUpdateOrgChart() {
  return useUpdateSiteSetting<OrgPosition[]>("org_chart");
}

// 트리 빌드 유틸
export function buildOrgTree(positions: OrgPosition[]): OrgTreeNode[] {
  // parentId 기반으로 트리 구조 생성
  // level 0 = 루트, children은 parentId로 매핑
}
```

### 3.8 조직도 편집 UI

```
/admin/settings/org-chart

UI:
  ┌──────────────────────────────────────────┐
  │ 운영진 조직도                              │
  │                                          │
  │ [+ 직책 추가]                             │
  │                                          │
  │ Level 0: 회장                             │
  │   ┌────────────────────────────────┐     │
  │   │ 회장 · 김OO  [수정] [삭제]      │     │
  │   └────────────────────────────────┘     │
  │                                          │
  │ Level 1: 부회장/감사                      │
  │   ┌──────────────┐ ┌──────────────┐     │
  │   │ 부회장 · 이OO │ │ 감사 · 박OO  │     │
  │   │ [↑][↓][수정] │ │ [↑][↓][수정] │     │
  │   └──────────────┘ └──────────────┘     │
  │                                          │
  │ Level 2: 팀장                             │
  │   ┌──────────────┐ ┌──────────────┐     │
  │   │ 학술팀장·최OO │ │ 홍보팀장·정OO│     │
  │   └──────────────┘ └──────────────┘     │
  │                                          │
  │ [저장]                                    │
  └──────────────────────────────────────────┘

직책 추가/수정 다이얼로그:
  - 직책명 (Input)
  - 부서명 (Input, 선택)
  - 계층 (Select: 0~3)
  - 상위 직책 (Select: 해당 level-1 직책 목록)
  - 담당자 (Select: staff/president 역할 회원 목록)
  - 순서 (Number)
```

### 3.9 조직도 시각화 (공개)

```typescript
// src/features/member/OrgChart.tsx

Props:
  - positions: OrgPosition[]

UI (데스크톱):
  CSS Grid 기반 트리 구조
  ┌──────┐
  │ 회장 │
  └──┬───┘
  ┌──┴──────────┐
  ┌──────┐  ┌──────┐
  │부회장│  │ 감사 │
  └──┬───┘  └──────┘
  ┌──┴───────┐
  ┌──────┐┌──────┐
  │학술팀││홍보팀│
  └──────┘└──────┘

각 노드:
  - 프로필 사진 (아바타)
  - 직책명
  - 이름
  - 부서명 (있으면)

UI (모바일):
  세로 리스트 + 인덴트
  Level 0: 회장 · 김OO
    Level 1: 부회장 · 이OO
      Level 2: 학술팀장 · 최OO
      Level 2: 홍보팀장 · 정OO
    Level 1: 감사 · 박OO

연결선: CSS border + :before/:after 의사 요소
```

### 3.10 구성원 페이지 통합

```
/members?tab=staff 변경:

Before:
  [MemberCard 그리드]

After:
  ┌──────────────────────────┐
  │ [조직도 시각화]           │  ← OrgChart 컴포넌트
  └──────────────────────────┘
  ── 운영진 목록 ──
  ┌──────────────────────────┐
  │ [MemberCard 그리드]       │  ← 기존 유지
  └──────────────────────────┘
```

## 4. 수정 대상 파일

### Phase 1: 관리자 탭 URL 분리

| 파일 | 변경 |
|------|------|
| `src/app/admin/layout.tsx` | 리팩토링 — 공통 레이아웃 + 탭 네비게이션 |
| `src/app/admin/page.tsx` | 리팩토링 — 리다이렉트 전용 |
| `src/app/admin/members/page.tsx` | 신규 |
| `src/app/admin/posts/page.tsx` | 신규 |
| `src/app/admin/seminars/page.tsx` | 신규 |
| `src/app/admin/inquiries/page.tsx` | 신규 |
| `src/app/admin/newsletter/page.tsx` | 신규 |
| `src/app/admin/agents/page.tsx` | 신규 |

### Phase 2: 사이트 설정 세부 탭

| 파일 | 변경 |
|------|------|
| `src/app/admin/settings/layout.tsx` | 신규 — 세부 탭 네비게이션 |
| `src/app/admin/settings/page.tsx` | 신규 — 리다이렉트 |
| `src/app/admin/settings/greeting/page.tsx` | 신규 |
| `src/app/admin/settings/professor/page.tsx` | 신규 |
| `src/app/admin/settings/about/page.tsx` | 신규 |
| `src/app/admin/settings/history/page.tsx` | 신규 |
| `src/app/admin/settings/fields/page.tsx` | 신규 |
| `src/app/admin/settings/contact/page.tsx` | 신규 |
| `src/app/admin/settings/presidents/page.tsx` | 신규 |
| `src/features/admin/settings/GreetingSection.tsx` | AdminGreetingTab에서 추출 |
| `src/features/admin/settings/ProfessorSection.tsx` | 추출 |
| `src/features/admin/settings/AboutSection.tsx` | 추출 |
| `src/features/admin/settings/HistorySection.tsx` | 추출 |
| `src/features/admin/settings/FieldsSection.tsx` | 추출 |
| `src/features/admin/settings/ContactInfoSection.tsx` | 추출 |
| `src/features/admin/settings/PastPresidentsSection.tsx` | 추출 |

### Phase 3: 운영진 조직도

| 파일 | 변경 |
|------|------|
| `src/app/admin/settings/org-chart/page.tsx` | 신규 |
| `src/features/admin/settings/OrgChartEditor.tsx` | 신규 — 조직도 CRUD |
| `src/features/admin/settings/useOrgChart.ts` | 신규 — API 훅 |
| `src/features/member/OrgChart.tsx` | 신규 — 조직도 시각화 |
| `src/app/members/page.tsx` | 변경 — staff 탭에 조직도 추가 |

### 기존 파일 업데이트

| 파일 | 변경 |
|------|------|
| `src/components/layout/Header.tsx` | /admin → /admin/posts (또는 /admin/members) |
| `src/app/dashboard/page.tsx` | /admin 링크 업데이트 |
| `src/app/newsletter/edit/page.tsx` | /admin?tab=newsletter → /admin/newsletter |
| `src/features/admin/AdminGreetingTab.tsx` | 삭제 또는 유지 (하위 호환) |

## 5. 구현 체크리스트

### Phase 1
- [ ] admin/layout.tsx — AuthGuard + 통계 카드 + 탭 네비게이션
- [ ] admin/page.tsx — 리다이렉트
- [ ] admin/members/page.tsx
- [ ] admin/posts/page.tsx
- [ ] admin/seminars/page.tsx
- [ ] admin/inquiries/page.tsx
- [ ] admin/newsletter/page.tsx
- [ ] admin/agents/page.tsx
- [ ] 기존 /admin?tab= 링크 업데이트

### Phase 2
- [ ] settings/layout.tsx — 세부 탭 네비게이션
- [ ] settings/page.tsx — 리다이렉트
- [ ] AdminGreetingTab 섹션 분리 (7개 독립 컴포넌트)
- [ ] settings/greeting/page.tsx
- [ ] settings/professor/page.tsx
- [ ] settings/about/page.tsx
- [ ] settings/history/page.tsx
- [ ] settings/fields/page.tsx
- [ ] settings/contact/page.tsx
- [ ] settings/presidents/page.tsx

### Phase 3
- [ ] useOrgChart.ts — site_settings 기반 CRUD
- [ ] OrgChartEditor.tsx — 관리자 조직도 편집
- [ ] settings/org-chart/page.tsx
- [ ] OrgChart.tsx — 트리 시각화 컴포넌트
- [ ] members/page.tsx — staff 탭에 조직도 통합

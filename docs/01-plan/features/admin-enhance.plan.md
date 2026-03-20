# Plan: 관리자 페이지 고도화 (admin-enhance)

## 1. 개요

관리자 페이지(`/admin`)의 탭을 개별 URL로 분리하고,
사이트 설정을 세부 탭으로 구성하며,
운영진 조직도 관리 + 구성원 페이지 반영 기능을 추가한다.

## 2. 목표

- 관리자 탭별 개별 URL 라우팅 (`/admin/members`, `/admin/posts` 등)
- 사이트 설정을 세부 탭(인사말, 주임교수, 소개, 연혁, 활동분야, 연락처, 역대회장)으로 분리
- 운영진 조직도 관리 (계층 구조 편집, 직책/역할 배정)
- 조직도 자동 시각화 (트리 구조)
- 구성원 페이지(`/members?tab=staff`)에 조직도 반영

## 3. 사용자 스토리

| 역할 | 스토리 | 우선순위 |
|------|--------|----------|
| 운영진 | 관리자 탭을 북마크하거나 직접 URL로 접근할 수 있다 | P0 |
| 운영진 | 사이트 설정에서 각 섹션을 개별 탭으로 확인하고 저장할 수 있다 | P0 |
| 회장 | 운영진 구성을 계층별로 관리하고 조직도를 편집할 수 있다 | P1 |
| 회원 | 구성원 페이지에서 운영진 조직도를 시각적으로 확인할 수 있다 | P1 |
| 운영진 | 관리자 페이지 URL을 공유하여 특정 탭으로 바로 이동할 수 있다 | P2 |

## 4. 기능 범위

### Phase 1: 관리자 탭 URL 분리 (P0)

#### 4.1 라우팅 구조 변경

현재:
```
/admin?tab=members
/admin?tab=posts
/admin?tab=site-settings
```

변경 후:
```
/admin               → /admin/members 리다이렉트 (president+) 또는 /admin/posts (staff)
/admin/members       → 회원 관리
/admin/posts         → 게시글 관리
/admin/seminars      → 세미나 관리
/admin/inquiries     → 문의 관리
/admin/newsletter    → 학회보 관리
/admin/agents        → 에이전트 관리
/admin/settings      → 사이트 설정
/admin/settings/greeting    → 인사말
/admin/settings/professor   → 주임교수
/admin/settings/about       → 학회 소개
/admin/settings/history     → 연혁
/admin/settings/fields      → 활동 분야
/admin/settings/contact     → 연락처
/admin/settings/presidents  → 역대 회장
/admin/settings/org-chart   → 운영진 조직도 (Phase 2)
```

#### 4.2 공통 레이아웃

```
/admin/layout.tsx
├── AuthGuard (staff+)
├── 통계 카드 (4열)
├── 좌측 사이드바 (탭 네비게이션) 또는 상단 탭바
└── children (탭 콘텐츠)
```

- `layout.tsx`: 공통 헤더 + 탭 네비게이션
- 각 탭은 `page.tsx`로 개별 라우트
- 현재 위치를 pathname 기반으로 하이라이트
- 모바일: 상단 가로 스크롤 탭바 유지

### Phase 2: 사이트 설정 세부 탭 (P0)

#### 4.3 설정 세부 탭 구조

`/admin/settings`를 중첩 레이아웃으로 구성:

```
/admin/settings/layout.tsx   → 세부 탭 네비게이션
/admin/settings/page.tsx     → 첫 번째 탭(인사말)으로 리다이렉트
/admin/settings/greeting     → 인사말 편집
/admin/settings/professor    → 주임교수 편집
/admin/settings/about        → 미션/비전/가치
/admin/settings/history      → 연혁 (리스트 CRUD)
/admin/settings/fields       → 활동 분야 (리스트 CRUD)
/admin/settings/contact      → 연락처
/admin/settings/presidents   → 역대 회장 (리스트 CRUD)
```

각 탭은 독립 저장 버튼을 유지 (현재와 동일).

### Phase 3: 운영진 조직도 (P1)

#### 4.4 운영진 조직 데이터 모델

```typescript
interface OrgPosition {
  id: string;
  userId?: string;         // 연결된 회원 ID (없으면 공석)
  title: string;           // 직책명 (회장, 부회장, 총무 등)
  level: number;           // 계층 (0: 회장, 1: 부회장, 2: 팀장, 3: 팀원)
  parentId?: string;       // 상위 직책 ID
  order: number;           // 같은 레벨 내 순서
  department?: string;     // 부서/팀명
}
```

Firestore 컬렉션: `org_positions`

#### 4.5 관리자 조직도 편집

`/admin/settings/org-chart`:
- 계층별 직책 추가/수정/삭제
- 회원 선택 드롭다운 (role이 staff/president인 회원)
- 드래그 앤 드롭 또는 화살표로 순서 변경
- 직책명, 부서명 편집
- 저장 버튼

#### 4.6 조직도 자동 시각화

```
                ┌──────────┐
                │   회장    │
                └────┬─────┘
           ┌─────────┼─────────┐
      ┌────┴────┐ ┌──┴───┐ ┌──┴───┐
      │ 부회장  │ │ 총무  │ │ 감사  │
      └────┬────┘ └──────┘ └──────┘
     ┌─────┼─────┐
  ┌──┴──┐ ┌┴───┐
  │학술팀│ │홍보팀│
  └─────┘ └────┘
```

- CSS Grid + flexbox 기반 트리 렌더링
- 각 노드: 직책 + 이름 + 프로필 사진
- 반응형: 모바일에서는 세로 리스트로 전환

#### 4.7 구성원 페이지 반영

`/members?tab=staff`:
- 현재: MemberCard 그리드 (플랫 목록)
- 변경: 상단에 조직도 시각화 + 하단에 상세 카드 그리드

## 5. 수정 대상 파일

### Phase 1: URL 분리
| 파일 | 변경 |
|------|------|
| `src/app/admin/page.tsx` | 기본 리다이렉트 페이지로 변경 |
| `src/app/admin/layout.tsx` | 신규 — 공통 레이아웃 + 탭 네비게이션 |
| `src/app/admin/members/page.tsx` | 신규 — AdminMemberTab 래핑 |
| `src/app/admin/posts/page.tsx` | 신규 — AdminPostTab 래핑 |
| `src/app/admin/seminars/page.tsx` | 신규 — AdminSeminarTab 래핑 |
| `src/app/admin/inquiries/page.tsx` | 신규 — AdminInquiryTab 래핑 |
| `src/app/admin/newsletter/page.tsx` | 신규 — AdminNewsletterTab 래핑 |
| `src/app/admin/agents/page.tsx` | 신규 — AdminAgentTab 래핑 |
| `src/components/layout/Header.tsx` | /admin 링크 업데이트 |

### Phase 2: 사이트 설정 세부 탭
| 파일 | 변경 |
|------|------|
| `src/app/admin/settings/layout.tsx` | 신규 — 세부 탭 레이아웃 |
| `src/app/admin/settings/page.tsx` | 신규 — 리다이렉트 |
| `src/app/admin/settings/greeting/page.tsx` | 신규 — GreetingSection |
| `src/app/admin/settings/professor/page.tsx` | 신규 — ProfessorSection |
| `src/app/admin/settings/about/page.tsx` | 신규 — AboutSection |
| `src/app/admin/settings/history/page.tsx` | 신규 — HistorySection |
| `src/app/admin/settings/fields/page.tsx` | 신규 — FieldsSection |
| `src/app/admin/settings/contact/page.tsx` | 신규 — ContactInfoSection |
| `src/app/admin/settings/presidents/page.tsx` | 신규 — PastPresidentsSection |

### Phase 3: 운영진 조직도
| 파일 | 변경 |
|------|------|
| `src/app/admin/settings/org-chart/page.tsx` | 신규 — 조직도 편집 |
| `src/features/admin/OrgChartEditor.tsx` | 신규 — 조직도 CRUD |
| `src/features/member/OrgChart.tsx` | 신규 — 조직도 시각화 컴포넌트 |
| `src/features/member/useOrgChart.ts` | 신규 — 조직도 API 훅 |
| `src/app/members/page.tsx` | 변경 — staff 탭에 조직도 추가 |

## 6. 예상 작업량

- **Phase 1**: M (1세션) — 라우팅 구조 변경, 파일 분리
- **Phase 2**: S (0.5세션) — 기존 섹션을 개별 페이지로 분리
- **Phase 3**: L (2세션) — 조직도 데이터 모델 + 편집 UI + 시각화

**총 예상: 3~4세션**

## 7. 기술 결정 사항

- 조직도 시각화: 외부 라이브러리 없이 CSS Grid + flexbox 자체 구현
- 관리자 탭 네비게이션: pathname 기반 활성 탭 감지 (usePathname)
- 사이트 설정 세부 탭: 중첩 레이아웃 (layout.tsx) 활용
- 조직도 데이터: Firestore `org_positions` 컬렉션 (JSON 직렬화 아님, 개별 문서)

## 8. 선행 조건

- Phase 1, 2는 즉시 진행 가능
- Phase 3는 Firestore `org_positions` 컬렉션 생성 필요

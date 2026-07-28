# 운영 콘솔 메뉴 정보구조 개편안

> **문서 유형**: 아키텍처 분석 + 개편 제안 (READ-ONLY, 코드 수정 없음)  
> **분석 일자**: 2026-07-28  
> **분석 대상**: `src/app/console/layout.tsx` (NAV_GROUPS, 9그룹 ~50링크)  
> **분석 관점**: URL↔메뉴 정합성, 분류 원칙 일관성, 확장성, 권한 모델, 구현 리스크

---

## 1. 현황 진단

### 1-1. URL 경로 ↔ 사이드바 그룹 정합성

아래 표는 **사이드바 그룹 소속**과 **실제 URL 경로 접두사**가 불일치하는 항목을 표시한다.

| 사이드바 그룹 | Nav Item | URL href | URL 접두사 | 불일치 |
|---|---|---|---|---|
| 회원/문의 | 회원관리 | `/console/members` | `members` | -- |
| 회원/문의 | 회원 검증 | `/console/members/audit` | `members` | -- |
| 회원/문의 | 교사 affiliation 분리 | `/console/members/migrate-teacher-affiliation` | `members` | -- |
| 회원/문의 | 연락망 | `/console/directory` | `directory` | Flat |
| 회원/문의 | 잠재회원 | `/console/potential-members` | `potential-members` | Flat |
| 회원/문의 | 포트폴리오 검증 | `/console/portfolio-verification` | `portfolio-verification` | Flat |
| 회원/문의 | 졸업논문 매핑 | `/console/alumni-mapping` | `alumni-mapping` | Flat |
| 회원/문의 | 신청자 학번 연동 | `/console/applicant-link-by-studentid` | Flat | Flat |
| 회원/문의 | 문의 답변 | `/console/inquiries` | `inquiries` | **도메인 불일치**: "문의"와 "회원"은 다른 관심사 |
| 회원/문의 | 피드백 | `/console/feedback` | `feedback` | **도메인 불일치** |
| 회원/문의 | 운영진 설정 | `/console/org` | `org` | **도메인 불일치**: 조직 구조 ≠ 회원 관리 |
| **학사** | 학술활동 대시보드 | `/console/academic/manage` | `academic` | -- |
| 학사 | 신청 승인 대시보드 | `/console/academic/applications` | `academic` | -- |
| 학사 | 발급 문서 | `/console/academic/certificates` | `academic` | -- |
| 학사 | 수강과목 마스터 | `/console/courses` | `courses` | Flat |
| 학사 | 졸업요건 | `/console/graduation` | `graduation` | Flat |
| 학사 | 연구활동 | `/console/research` | `research` | Flat |
| 학사 | 학회비 | `/console/fees` | `fees` | Flat |
| 학사 | 인지디딤판 | `/console/steppingstone` | `steppingstone` | Flat |
| 학사 | 학기별 로드맵 | `/console/roadmap` | `roadmap` | Flat |
| **활동** | 세미나 | `/console/academic/seminars` | **`academic`** | **충돌: URL은 "academic"인데 사이드바는 "활동"** |
| 활동 | 프로젝트 | `/console/academic/projects` | **`academic`** | **동일 충돌** |
| 활동 | 스터디 | `/console/academic/studies` | **`academic`** | **동일 충돌** |
| 활동 | 대외 학술대회 | `/console/academic/external` | **`academic`** | **동일 충돌** |
| 활동 | 모임·네트워킹 | `/console/networking` | `networking` | Flat |
| 활동 | 해커톤 운영 | `/console/hackathon` | `hackathon` | Flat |
| 활동 | 수요 조사 집계 | `/console/demand` | `demand` | Flat |
| 활동 | 활동 이력 | `/console/grad-life/positions` | **`grad-life`** | **충돌: "grad-life" ≠ "활동"** |
| 활동 | 논문 심사 연습 | `/console/grad-life/thesis-defense` | **`grad-life`** | **동일 충돌** |
| 활동 | 심사 질문 템플릿 | `/console/grad-life/thesis-defense-templates` | **`grad-life`** | **동일 충돌** |

#### 핵심 발견

**`academic` URL 접두사가 두 사이드바 그룹에 걸쳐 분할**되어 있다(layout.tsx:267-292).
- "학사" 그룹: `academic/manage`, `academic/applications`, `academic/certificates`
- "활동" 그룹: `academic/seminars`, `academic/projects`, `academic/studies`, `academic/external`

이로 인해 `pathname.startsWith("/console/academic")`(layout.tsx:75) 활성 상태 감지가 두 그룹의 항목을 동시에 하이라이트할 수 있다.

### 1-2. 분류 원칙 혼재

현재 9개 그룹은 **4가지 다른 분류 축**을 동시에 사용한다:

| 분류 축 | 해당 그룹 | 설명 |
|---|---|---|
| **대상/엔티티별** (누구/무엇을 관리) | 회원/문의, 콘텐츠 | 관리 대상 중심 |
| **도메인별** (학술 주제 영역) | 학사, 활동, 아카이브 | 업무 영역 중심 |
| **생애주기 단계** | 온보딩 | 회원 여정 단계 |
| **시스템 계층** (운영/인프라) | 모니터링, 시스템 | 기술 계층 중심 |

**문제**: 새 기능(예: "멘토링 프로그램")이 추가될 때 어느 그룹에 배치할지 예측 불가 -- "활동"인가, "학사"인가, "회원"인가?

### 1-3. 그룹 크기 불균형

| 그룹 | 항목 수 | 상태 |
|---|---|---|
| 회원/문의 | 11 | **과부하** -- 회원 CRUD, 검증 유틸, 문의, 피드백, 조직 설정 혼합 |
| 활동 | 10 | **과부하** -- 3개 URL 접두사 혼합 |
| 학사 | 9 | 대형 -- 대시보드 + CRUD + 재정 |
| 아카이브 | 9 | 내부 일관성 양호 (모두 `/console/archive/*`) |
| 콘텐츠 | 8 | 중간 |
| 시스템 | 7 | 적정 (회장+ 전용) |
| 모니터링 | 4 | AI 포럼은 도메인 콘텐츠이며 모니터링이 아님 |
| 홈 | 2 | 적정 |
| **온보딩** | **1** | **싱글턴 -- 성장 불가능한 그룹** |

### 1-4. 권한 모델 현황

| 계층 | 메커니즘 | 위치 | 적용 대상 |
|---|---|---|---|
| Layout 가드 | `AuthGuard allowedRoles={["staff","president","admin","sysadmin"]}` | layout.tsx:409 | 전체 콘솔 |
| 그룹 단위 | `presidentOnly: true` | layout.tsx:43, 331 | "시스템" 그룹 1개만 |
| 항목 단위 | `adminOnly: true` | layout.tsx:37 | 5개 항목 (3개 그룹에 산재) |
| 페이지 가드 | 개별 `<AuthGuard>` | 각 page.tsx | 중복 적용 (members, applicant-link 등) |

**문제점**:
- `adminOnly`와 `presidentOnly`는 두 개의 독립적인 boolean으로, 합성 불가 (예: "admin이면서 president가 아닌" 경우 표현 불가)
- `staffOnly` 플래그가 없음 -- 기본값이 staff+이므로 불필요하지만, 향후 세분화 불가
- 일부 페이지가 layout 가드 위에 **중복** AuthGuard를 적용 (members/page.tsx:8, applicant-link-by-studentid/page.tsx:330)

### 1-5. 미등록(Orphaned) 라우트

파일시스템에 page.tsx가 존재하지만 사이드바에 없는 라우트:

| 라우트 | 상태 | 비고 |
|---|---|---|
| `/console/todos` | 커맨드 팔레트에만 등록 | command-routes.ts:171 |
| `/console/transition` | `/console/handover?tab=transition`으로 리다이렉트 | transition/page.tsx:3 |
| `/console/research/journal` | page.tsx 존재, 미등록 | |
| `/console/academic` (최상위) | page.tsx 존재, 미등록 | |
| `/console/settings/page-headers` | settings 서브탭에 미등록 | |
| `/console/settings/org-chart` | `/console/org`로 리다이렉트 | 리팩토링 잔존 |
| `/console/settings/projects,studies,external` | settings 서브탭에 미등록 | |

---

## 2. 개편안: Domain-first 6그룹 체계

### 2-1. 분류 원칙

> **"이 기능은 누구의 무엇을 다루는가?"**

| 축 | 그룹 |
|---|---|
| 사람 (People) | 회원 |
| 활동 (Activities) | 학술 |
| 발행물 (Publications) | 콘텐츠·아카이브 |
| 소통+재정 (Comms & Finance) | 운영 |
| 인프라 (Infrastructure) | 모니터링·시스템 |
| 진입점 (Entry) | 홈 |

**확장 규칙**: 새 기능이 추가될 때 "다루는 대상"이 사람이면 -> 회원, 학술 프로그램이면 -> 학술, 발행/저작물이면 -> 콘텐츠·아카이브, 돈·커뮤니케이션이면 -> 운영, 시스템 인프라면 -> 시스템.

### 2-2. 제안 구조

> URL 경로는 변경하지 않는다. 사이드바 그룹핑만 재배치한다.

```
1. 홈 (3항목)
+-- 홈 대시보드              /console
+-- 업무노트                 /console/handover
+-- 운영 업무철              /console/todos          <- orphaned 복원

2. 회원 (7항목)
+-- 회원관리                 /console/members              [adminOnly]
+-- 잠재회원                 /console/potential-members
+-- 연락망                   /console/directory
+-- 회원 검증                /console/members/audit
+-- 신규 회원 체크리스트     /console/onboarding-checklist  <- "온보딩" 해체
+-- 운영진 설정              /console/org
+-- [관리 도구] (접힘)
   +-- 포트폴리오 검증       /console/portfolio-verification
   +-- 졸업논문 매핑         /console/alumni-mapping
   +-- 신청자 학번 연동      /console/applicant-link-by-studentid  [adminOnly]
   +-- 교사 affiliation 분리 /console/members/migrate-teacher-affiliation [adminOnly]

3. 학술 (14항목)
+-- 학술활동 대시보드        /console/academic/manage
+-- 세미나                   /console/academic/seminars
+-- 프로젝트                 /console/academic/projects
+-- 스터디                   /console/academic/studies
+-- 대외 학술대회            /console/academic/external
+-- 모임·네트워킹            /console/networking
+-- 해커톤 운영              /console/hackathon
+-- 논문 심사 연습           /console/grad-life/thesis-defense
+-- 수요 조사 집계           /console/demand
+-- 신청 승인 대시보드       /console/academic/applications   [adminOnly]
+-- 수강과목 마스터          /console/courses
+-- 졸업요건                 /console/graduation
+-- 학기별 로드맵            /console/roadmap
+-- 인지디딤판               /console/steppingstone

4. 콘텐츠·아카이브 (17항목, 서브섹션 2개)
+-- [콘텐츠]
|  +-- 게시글                /console/posts
|  +-- 학회보                /console/newsletter
|  +-- 학회지 운영           /console/journal
|  +-- 카드뉴스              /console/card-news
|  +-- 축하카드              /console/celebration-card
|  +-- 콘텐츠 초안함         /console/content-drafts
|  +-- 러닝 가이드           /console/learning-guides
|  +-- 팝업 공지             /console/popups
+-- [아카이브]
   +-- 아카이브 홈           /console/archive
   +-- 콘텐츠 갭             /console/archive/content-gaps
   +-- 통합 검수 큐          /console/archive/review-queue
   +-- 연구방법 가이드       /console/archive/research-methods
   +-- 통계방법 가이드       /console/archive/statistical-methods
   +-- 기초 용어 가이드      /console/archive/foundation-terms
   +-- 학술 글쓰기 가이드    /console/archive/writing-tips
   +-- 핵심 개념             /console/archive/concepts
   +-- 연구 변인             /console/archive/variables
   +-- 측정 도구             /console/archive/measurements

5. 운영 (7항목)
+-- 문의 답변                /console/inquiries
+-- 피드백                   /console/feedback
+-- 학회비                   /console/fees
+-- 연구활동                 /console/research
+-- 활동 이력                /console/grad-life/positions
+-- 발급 문서                /console/academic/certificates
+-- 심사 질문 템플릿         /console/grad-life/thesis-defense-templates  [adminOnly]

6. 모니터링·시스템 (11항목, 서브섹션 2개)
+-- [모니터링]
|  +-- 인사이트              /console/insights
|  +-- 감사로그              /console/audit-log
|  +-- Cron 실행 이력        /console/cron-logs         [adminOnly]
+-- [시스템 -- presidentOnly]
   +-- 사이트 설정           /console/settings
   +-- 학사일정              /console/academic-calendar
   +-- 챗봇 설정             /console/ai
   +-- AI 에이전트 관리      /console/agents
   +-- 에이전트 워크플로우   /console/agent-workflows
   +-- 에이전트 작업 보드    /console/agent-board
   +-- AI 포럼 운영          /console/ai-forum          <- 모니터링에서 이동
   +-- 실험실                /console/labs
```

### 2-3. 변경 사항 요약

| 변경 | 이전 | 이후 | 사유 |
|---|---|---|---|
| "온보딩" 그룹 해체 | 싱글턴 그룹 (1항목) | "회원" 그룹에 통합 | 신규 회원 체크리스트는 회원 관리의 하위 단계 |
| "학사"+"활동" 통합 | 2개 그룹 (19항목) | "학술" 1개 그룹 (14항목) | `academic/*` URL 분할 해소; 학사/활동 구분은 임의적 |
| 문의/피드백 분리 | "회원/문의"에 혼합 (11항목) | "운영" 그룹으로 이동 | 문의/피드백은 회원 CRUD가 아닌 커뮤니케이션 |
| 관리 도구 접힘 | 회원 그룹에 평면 나열 | 접히는 서브섹션 | 일회성 배치/마이그레이션 유틸리티를 일상 메뉴에서 분리 |
| AI 포럼 이동 | 모니터링 그룹 | 시스템 그룹 | AI 포럼 운영은 모니터링이 아닌 시스템 관리 |
| 업무철 복원 | orphaned (사이드바 미등록) | "홈" 그룹에 추가 | command-routes.ts에 이미 등록, 대시보드 위젯에서 링크됨 |
| 콘텐츠·아카이브 합산 | 2개 그룹 (17항목) | 1개 그룹 + 서브섹션 2개 | 발행/저작물이라는 공통 관심사 |

---

## 3. 권한 모델 개선안

### 3-1. 현행 (2-flag 방식)

```typescript
// layout.tsx:37, 43 -- 두 개의 독립 boolean
interface NavItem { adminOnly?: boolean; }
interface NavGroup { presidentOnly?: boolean; }
```

### 3-2. 제안: 단일 minRole 체계

```typescript
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  minRole?: UserRole;  // 생략 시 그룹의 minRole 상속, 그것도 없으면 'staff'
}

interface NavGroup {
  label: string;
  items: NavItem[];
  minRole?: UserRole;
  subsections?: {
    label: string;
    items: NavItem[];
    minRole?: UserRole;
    collapsed?: boolean;
  }[];
}
```

**필터 로직**:

```typescript
// 현행 layout.tsx:344-347 대체
const visibleGroups = NAV_GROUPS
  .filter(g => isAtLeast(user, g.minRole ?? "staff"))
  .map(g => ({
    ...g,
    items: g.items.filter(i => isAtLeast(user, i.minRole ?? g.minRole ?? "staff")),
    subsections: g.subsections?.map(s => ({
      ...s,
      items: s.items.filter(i => isAtLeast(user, i.minRole ?? s.minRole ?? g.minRole ?? "staff")),
    })).filter(s => s.items.length > 0),
  }))
  .filter(g => g.items.length > 0 || (g.subsections?.length ?? 0) > 0);
```

**장점**:
- `ROLE_HIERARCHY`(permissions.ts:6-15)의 숫자 비교를 그대로 활용
- 향후 새 역할(예: `editor`) 추가 시 hierarchy만 수정하면 메뉴 필터 자동 반영
- 그룹·서브섹션·항목 3단계에서 일관된 상속 체인

---

## 4. 구현 리스크 분석

### 4-1. URL 경로 변경이 불필요한 이유

| 항목 | 설명 |
|---|---|
| 사이드바는 순수 UI | NAV_GROUPS 배열의 그룹 소속만 바꾸면 됨 (layout.tsx:224-342) |
| URL은 파일시스템 라우팅 | Next.js App Router에서 `src/app/console/*/page.tsx` 경로가 URL을 결정 |
| 기존 리다이렉트 패턴 존재 | `transition/page.tsx`, `settings/org-chart/page.tsx`가 이미 리다이렉트 stub 사용 |
| 북마크/딥링크 보존 | URL 불변이므로 기존 링크 깨짐 없음 |

**결론**: Phase 1은 URL 변경 없이 메뉴 재배치만으로 구현 가능. 리스크 최소.

### 4-2. pathname.startsWith 활성 감지 개선

현행 로직(layout.tsx:75):
```typescript
const isActive = pathname === item.href || 
  (item.href !== "/console" && pathname.startsWith(item.href));
```

**문제**: `/console/academic/seminars/create`를 방문하면 "학술활동 대시보드"(`/console/academic/manage`)는 매칭되지 않지만, `/console/academic`을 접두사로 공유하는 다른 항목이 있으면 잘못 하이라이트될 수 있다.

**해결**: 새 구조에서 "학사"와 "활동"이 "학술"로 통합되므로, 같은 `academic/*` 접두사를 가진 항목들이 같은 그룹에 속하게 되어 이 문제가 자연 해소된다.

### 4-3. 추가 변경 필요 지점

| 파일 | 변경 내용 | 난이도 |
|---|---|---|
| `layout.tsx` NAV_GROUPS | 그룹 재배치 + subsections 구조 | 중 |
| `layout.tsx` SidebarGroup | subsections 접힘 UI 추가 | 중 |
| `layout.tsx` 모바일 탭바 | 그룹 구분자 반영 | 저 |
| `command-routes.ts` | `/console/todos` 이미 등록, 변경 불필요 | 없음 |

### 4-4. Phase 2 (선택적, 향후): URL 정규화

URL 경로를 사이드바 그룹과 일치시키려면:

```
/console/members/*       <- directory, potential-members 등 이동
/console/academic/*      <- courses, graduation 등 이동  
/console/content/*       <- posts, newsletter 등 이동
/console/operations/*    <- inquiries, feedback, fees 등 이동
```

**필요 작업**: 
- 라우트 디렉토리 이동
- 리다이렉트 stub 생성 (기존 패턴 활용)
- 내부 Link href 전수 검색·교체
- command-routes.ts 업데이트

**추천**: Phase 1 배포 후 사용성 검증 -> 필요 시 Phase 2 진행.

---

## 5. NAV_GROUPS 설정 파일 분리 제안

현재 layout.tsx(414줄)에 혼합된 관심사:

| 관심사 | 줄 범위 | 제안 분리 파일 |
|---|---|---|
| 내비게이션 설정 (NavGroup[]) | 224-342 | `console-nav-config.ts` |
| 배지 카운트 쿼리 (7개 useQuery) | 154-213 | `useConsoleBadges.ts` |
| UI 컴포넌트 (SidebarGroup, ReviewQueueBanner) | 52-142 | layout.tsx에 유지 |
| Shell 레이아웃 | 145-413 | layout.tsx에 유지 |

**효과**: 메뉴 구조 변경이 설정 파일만 수정하면 되는 구조. 테스트 용이.

---

## 6. 트레이드오프

| 옵션 | 장점 | 단점 |
|---|---|---|
| **A. 사이드바 재배치만** (권장, Phase 1) | URL 깨짐 없음; 즉시 UX 개선; 설정만 변경 | URL과 그룹 불일치는 내부적으로 존속 (사용자에게는 미노출) |
| **B. URL + 사이드바 전면 개편** | 경로-그룹 완전 일치; 깨끗한 아키텍처 | 높은 구현 리스크; 리다이렉트 stub 필요; 링크 전수 감사 필요 |
| **C. 현행 유지** | 리스크 없음 | 인지 부하 증가; 새 기능 배치 기준 불명; 학사/활동 구분 점점 모호 |

---

## 7. 코드 근거 (References)

| 파일:줄 | 내용 |
|---|---|
| `src/app/console/layout.tsx:224-342` | NAV_GROUPS 정의 (9그룹, ~50항목) |
| `src/app/console/layout.tsx:344-347` | visibility 필터 (presidentOnly + adminOnly) |
| `src/app/console/layout.tsx:75` | `pathname.startsWith` 활성 상태 감지 |
| `src/app/console/layout.tsx:409` | Layout AuthGuard: staff/president/admin/sysadmin |
| `src/app/console/layout.tsx:154-213` | 배지 카운트 useQuery 7개 |
| `src/lib/permissions.ts:6-15` | ROLE_HIERARCHY (guest 0 ~ sysadmin 6) |
| `src/app/console/academic/seminars/layout.tsx:17-24` | SUB_TABS 서브 내비 패턴 |
| `src/app/console/settings/layout.tsx:9-44` | SETTINGS_GROUPS 그룹드 서브탭 |
| `src/app/console/transition/page.tsx:3` | 리다이렉트 stub 패턴 |
| `src/app/console/settings/org-chart/page.tsx:4` | 리팩토링 잔존 리다이렉트 |
| `src/components/layout/command-routes.ts:171` | `/console/todos` 커맨드 팔레트 등록 |
| `src/app/console/members/page.tsx:8` | 중복 페이지 레벨 AuthGuard |
| `src/app/console/applicant-link-by-studentid/page.tsx:330` | 중복 페이지 레벨 AuthGuard |

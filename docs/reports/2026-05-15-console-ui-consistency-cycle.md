# 사이클 보고서 — 운영 콘솔 UI 통일성 점검·개선

- **날짜**: 2026-05-15
- **모드**: 자율 PM 모드
- **트리거**: "운영 콘솔 작업 UI 통일성이 제대로 안 됐다 — 세미나 페이지는 하위 탭이
  헤더 위, handover는 헤더 아래. 왜 통일성 작업이 안 됐는지 확인하고 개선해줘"

---

## 1. 개요

운영 콘솔 페이지마다 **하위 네비게이션과 페이지 헤더의 세로 순서**가 제각각이라는
지적을 받고 원인을 조사·수정했다. 추가로 콘솔 전반을 점검해 헤더 누락·비표준 헤더를
함께 표준화했다.

---

## 2. 근본 원인

하위 네비게이션이 **두 가지 다른 구조**로 존재:

| 패턴 | 위치 | 순서 |
|------|------|------|
| A. `layout.tsx`의 route 기반 `<nav>` | `layout.tsx`가 `{children}` **위에** nav 렌더 | nav → 헤더 ❌ |
| B. `page.tsx`의 `<Tabs>` | 페이지가 `ConsolePageHeader` 다음 `<Tabs>` | 헤더 → nav ✅ |

이전 콘솔 통일 작업은 `ConsolePageHeader` **컴포넌트**와 카드 스타일을 표준화했지만,
하위 nav가 `layout.tsx`에 있는 섹션은 nav가 페이지를 물리적으로 감싸 구조상 헤더보다
먼저 렌더된다. "하위 nav를 헤더 위/아래 어디 둘지"라는 **레이아웃 구조 차원의 결정**이
없었던 것이 핵심.

---

## 3. 수정 내역

코드베이스 자체 표준(`handover`·`insights`가 쓰는 **섹션 헤더 → 하위 nav → 콘텐츠**)으로 통일.

| 대상 | 변경 |
|------|------|
| `academic/seminars/layout.tsx` + `AdminSeminarTab` | 레이아웃이 `ConsolePageHeader`("세미나 관리")를 nav 위에 소유, 자식 컴포넌트의 중복 헤더 제거 |
| `settings/layout.tsx` + 11개 섹션 컴포넌트 | 레이아웃이 `ConsolePageHeader`("홈페이지 설정")를 nav 위에 소유, 11개 섹션의 개별 헤더 제거 (섹션별 `<Section title>`은 유지) |
| `academic-admin/Dashboard` | 헤더가 아예 없던 학술활동 대시보드에 `ConsolePageHeader` 추가 (`/console/academic`·`/manage`·`/academic-admin` 3경로 공통) |
| `ai-forum/page.tsx` | 커스텀 `<header>`(`text-3xl` + 비표준 pill) → `ConsolePageHeader` |
| `roadmap/page.tsx` | 커스텀 `<header>`(`text-3xl` + 비표준 pill) → `ConsolePageHeader` |

검증: `<Tabs>` 기반 페이지(`handover`·`archive`·`courses`·`research`·
`portfolio-verification`·`insights`)는 모두 이미 헤더 → nav 순서로 정상.

### 3-2. 콘솔 전반 기능 점검 (추가)

- 사이드바 nav 37개 링크 전수 검증 → 전부 실제 라우트 존재, dead link 없음.
- 코드 이슈 마커(`TODO`/`FIXME`/`@ts-ignore`) 점검 → 콘솔·운영 영역 0건 (양호).
- **`AdminMemberTab` 자동 승인 실패 은폐 수정**: 자동 승인 루프가 `catch {}`로
  개별 실패를 조용히 삼켜, 운영진이 "자동 승인 완료 N명"만 보고 실패를 인지 못 하던
  문제. 수동 일괄 승인은 실패를 보고하는데 자동 경로만 누락 → 실패 카운트를 토스트에
  노출하도록 통일.

---

## 4. Commits

| 해시 | 메시지 |
|------|--------|
| `bfdb5ffa` | fix: 운영 콘솔 하위 nav ↔ 헤더 순서 통일 + 헤더 표준화 (19파일) |
| `abe0d523` | docs: console UI consistency 사이클 보고서 commit 해시 기입 |
| `81c05a9b` | fix: AdminMemberTab 자동 승인 실패 은폐 수정 |
| `9915801c` | fix: members/[id] 회원 관리 헤더를 ConsolePageHeader 로 전환 |

---

## 5. 검수 URL

- 세미나 관리: https://yonsei-edtech.vercel.app/console/academic/seminars (헤더 → 탭 순서)
- 사이트 설정: https://yonsei-edtech.vercel.app/console/settings
- 학술활동 대시보드: https://yonsei-edtech.vercel.app/console/academic/manage
- AI 포럼 운영: https://yonsei-edtech.vercel.app/console/ai-forum
- 로드맵 관리: https://yonsei-edtech.vercel.app/console/roadmap
- 회원 상세: https://yonsei-edtech.vercel.app/console/members → 회원 클릭

---

## 6. 상세 페이지 헤더 검토 결과

- `members/[id]` — "회원 관리" h1 + 액션 → `ConsolePageHeader`로 전환 (완료).
- `labs/new` — 단순 폼 페이지의 "새 실험 등록" h1. 폼 페이지 맥락상 현 상태 허용, 보류.
- `card-news/[seriesId]` — `<h1>{series.title}</h1>`는 **엔티티 제목**(시리즈 이름)이지
  섹션 헤더가 아님 → 그대로 유지가 정상.
- `handover/report` — `{/* 인쇄 헤더 */}` 블록의 h1은 **인쇄 출력용** 헤더 →
  그대로 유지가 정상.

## 7. 잔여 작업

- `admin/*` ↔ `console/*` ↔ `academic-admin/*` 다중 라우트(같은 컴포넌트 N경로)
  정리는 별도 계획 사이클 권장.

---

## 8. 교훈

- **컴포넌트 통일 ≠ 레이아웃 구조 통일**: `ConsolePageHeader`라는 컴포넌트를
  표준화해도, 그것이 `layout.tsx`에 있느냐 `page.tsx`에 있느냐에 따라 렌더 순서가
  갈린다. UI 통일은 "어떤 컴포넌트를 쓰는가"뿐 아니라 "어디서 렌더되는가"까지 봐야 함.
- Next.js `layout.tsx`는 항상 `page.tsx`를 감싸므로, 레이아웃의 요소는 페이지 헤더보다
  먼저 렌더된다. 섹션 공통 헤더는 레이아웃이 소유하는 것이 자연스럽다.

---

## 9. 2차 — 사용자 추가 지적 + 회귀 수정

운영진이 "프로젝트·스터디·대외 학술대회, 신청자 학번 연동, 연락망, 회원검증 헤더가
다 다르다"고 추가 지적. 정밀 점검 결과 **1차 작업에서 도입된 회귀 1건 포함** 4개
구조적 원인 확인:

### 원인
1. **공유 컴포넌트의 맥락 무지 (회귀)**: `ActivityList`가 `settings/*`(레이아웃 헤더 O)와
   `academic/*`(레이아웃 헤더 X) 양쪽에서 쓰이는데, 1차 작업 시 settings 맥락만 보고
   `ConsolePageHeader`를 제거 → `academic/projects·studies·external` 페이지가 작은
   `text-base` h2만 남는 회귀 발생.
2. **공개/admin 페이지의 콘솔 re-export**: `console/directory`(공개 `/directory`),
   `console/members/audit`(`admin/user-audit`)가 자체 헤더 변형·컨테이너를 가진 페이지를
   그대로 re-export → 콘솔 셸과 이중 컨테이너·헤더 변형 불일치.
3. **일회성 유틸 페이지의 `p-6` 복붙**: `applicant-link-by-studentid`,
   `inject-spring-2026-schedule`, `migrate-teacher-affiliation`가 모두 `space-y-6 p-6`
   루트 — 콘솔 레이아웃이 이미 패딩을 제공하는데 중복.
4. **콘솔 페이지 셸 표준 미강제**: `<div space-y-6>` + `ConsolePageHeader` 관례를
   강제하는 메커니즘이 없어 페이지마다 제각각.

### 수정 (커밋 `f4332334`)
- `ActivityList` → `ConsolePageHeader` 복원 (회귀 수정).
- `settings/layout.tsx` 학술활동 그룹에서 projects/studies/external 제거 — academic
  콘솔이 정식 위치. `settings/projects·studies·external` 라우트는 `/console/academic/*`
  로 redirect (북마크 보존).
- `console/directory` → `/directory` redirect (공개 페이지가 자체 완결 — 이중 셸 제거).
- `admin/user-audit` 루트 컨테이너 `mx-auto max-w-5xl px-4 py-10` → `space-y-6`.
  (`admin/layout.tsx`가 `/console` redirect이므로 이 페이지는 `console/members/audit`
  re-export 경로로만 렌더됨 — 자체 컨테이너는 순수 중복.)
- `applicant-link-by-studentid`·`inject-spring-2026-schedule`·
  `migrate-teacher-affiliation` 루트 `space-y-6 p-6` → `space-y-6`.

### 3차 추가 — academic/external/[id] 하위 점검
- `academic-admin/external/[id]/workbook` 커스텀 `text-xl font-bold` h1 + 액션 행 →
  `ConsolePageHeader`(actions) 로 통일. (`/console/academic/external/[id]/workbook`
  re-export 경로 자동 반영.)
- `console/academic/external/[id]/program` 헤더 누락 → `ConsolePageHeader`
  ("학술대회 프로그램 편집", 활동명 description) 추가.
- 검증: 콘솔 페이지 ~80개 헤더 사용 전수 grep — 나머지(`labs`·`grad-life/*`·`popups`·
  `agents`·`card-news`·`steppingstone`·`academic-calendar`·`alumni-mapping` 등)는 모두
  컴포넌트 위임 또는 직접 `ConsolePageHeader` 사용으로 정상. `handover/report`(인쇄용)·
  `card-news/[seriesId]`·`labs/[id]`·`academic/*/[id]`(엔티티 제목)·`labs/new`(폼)은 의도된
  비표준 — 유지.

### 4차 — 회원 영역(mypage) 헤더 표준화
- 콘솔에서 일반 서비스로 점검을 확장. dashboard·research·network·notices·gallery·
  calendar 는 모두 `PageHeader` 사용으로 정상이나, **mypage 영역 5개 컴포넌트가 커스텀
  h1(`text-2xl font-bold`)을 사용**해 다른 회원 페이지보다 작고 평범한 헤더로 보이던 드리프트.
- 변환:
  - `MyPageView` 메인 마이페이지 — 커스텀 h1 → `PageHeader`(icon=User, actions=로그아웃/읽기전용)
  - `MyActivitiesView` 내 학회활동 — 손으로 흉내낸 아이콘+h1+백링크 → `PageHeader`(actions=백링크)
  - `MyResearchView` 내 연구활동 — 동일 패턴 → `PageHeader` (print-hide 보존)
  - `mypage/card` 모바일 명함 — 커스텀 h1 → `PageHeader`(icon=CreditCard)
  - `mypage/portfolio` 학술 포트폴리오 — 이미 손으로 PageHeader 흉내내던 구조 → 정식 `PageHeader`
- 효과: 회원이 보는 마이페이지가 dashboard·research 등 다른 회원 페이지와 동일한 헤더 크기·
  아이콘 박스 스타일로 통일 (desktop `text-2xl sm:text-3xl lg:text-4xl`).

### 교훈 (추가)
- **"전수 점검"의 함정**: 1차에서 `ConsolePageHeader` 사용 여부와 `text-3xl` 패턴만 보고
  "전수 점검 완료"라고 했으나, 실제로는 각 페이지가 *일관된 헤더를 렌더하는지*를 검증하지
  않았다. 패턴 grep ≠ 실제 렌더 결과 검증.
- **공유 컴포넌트를 수정할 땐 모든 호출부의 레이아웃 맥락을 확인**해야 한다. `ActivityList`
  는 두 라우트 트리에서 쓰였고, 한쪽 맥락만 보고 고치면 다른 쪽이 깨진다.

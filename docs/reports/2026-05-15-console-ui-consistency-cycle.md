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

---

## 5. 검수 URL

- 세미나 관리: https://yonsei-edtech.vercel.app/console/academic/seminars (헤더 → 탭 순서)
- 사이트 설정: https://yonsei-edtech.vercel.app/console/settings
- 학술활동 대시보드: https://yonsei-edtech.vercel.app/console/academic/manage
- AI 포럼 운영: https://yonsei-edtech.vercel.app/console/ai-forum
- 로드맵 관리: https://yonsei-edtech.vercel.app/console/roadmap

---

## 6. 잔여 작업

- 상세·폼 페이지의 비표준 헤더 표준화 검토: `members/[id]`("회원 관리" h1),
  `labs/new`("새 실험 등록" h1), `card-news/[seriesId]`, `handover/report` — 상세
  페이지는 엔티티 제목 표시 등 맥락이 달라 일괄 적용 전 개별 판단 필요.
- `admin/*` ↔ `console/*` ↔ `academic-admin/*` 다중 라우트(같은 컴포넌트 N경로)
  정리는 별도 계획 사이클 권장.

---

## 7. 교훈

- **컴포넌트 통일 ≠ 레이아웃 구조 통일**: `ConsolePageHeader`라는 컴포넌트를
  표준화해도, 그것이 `layout.tsx`에 있느냐 `page.tsx`에 있느냐에 따라 렌더 순서가
  갈린다. UI 통일은 "어떤 컴포넌트를 쓰는가"뿐 아니라 "어디서 렌더되는가"까지 봐야 함.
- Next.js `layout.tsx`는 항상 `page.tsx`를 감싸므로, 레이아웃의 요소는 페이지 헤더보다
  먼저 렌더된다. 섹션 공통 헤더는 레이아웃이 소유하는 것이 자연스럽다.

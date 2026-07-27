# /profile/[id] SSR 렌더 크래시 진단·수정

작성: 2026-07-28 · 범위: 회원 프로필 페이지 Server Components render throw (digest 2354080519)

## 요약 (결론)

- **표면 증상**: `/profile/[id]` 접속 시 "An error occurred in the Server Components render" → `app/error.tsx` 트립 → 페이지 전체 붕괴.
- **근본원인 클래스**: 레거시/부분 저장된 `users/{uid}` 문서의 프로필 필드가 **누락이 아니라 잘못된 타입**(문자열 배열 자리에 객체, 문자열 자리에 숫자/Timestamp 등)으로 들어올 때, 자식 컴포넌트의 `.map`/`.split`/`.trim`/`.length` 접근이 렌더 중 throw. 이 저장소에서 반복된 크래시 클래스(커밋 `9668d1cb` "`.slice is not a function`", MEMORY 마이페이지 `weakConceptIds.length`)와 동일.
- **수정 전략**: owner 를 정규화하는 **단일 공유 지점** `withGraduateDefaults` 에서 타입을 한 번에 강제. 이 함수는 SSR `initialOwner` 와 CSR refetch **양쪽**에서 owner 에 적용되므로 모든 소비 컴포넌트가 한 번에 보호됨(seminar-normalize 선례).

## 조사 결과 (정적 분석)

### 1. `getProjectedProfile` (src/lib/public-profile.ts)
- 투영은 **raw 문서 전체에서 HARD_SECRET 6개만 삭제**하고 반환 → 배열 필드(researchInterests·socials·recentPapers·onboardingBadges·mentorTopics 등)는 문서에 있으면 그대로 통과, 없으면 부재. **필드 값의 타입 정규화는 전혀 없음**. → 손상/레거시 타입이 그대로 클라이언트 렌더로 유입.

### 2. `withGraduateDefaults` (src/lib/profile-visibility.ts)
- 기존엔 `university`/`graduateSchool`/`graduateMajor` 3개 문자열만 기본값 채움. 배열·기타 문자열 필드는 **무정규화**.

### 3. 자식 컴포넌트 12종 렌더 경로 점검
- SSR 시점 `viewer = null`(zustand 초기 user=null 확인). 이때:
  - **일반 회원 owner** → `canAccessProfilePage` = `"blocked"` → 차단 카드(`owner.name`만) 렌더 → 안전.
  - **staff/president owner** → `"staff-public-only"` → `ProfileHeader`·`ProfileBio`·`ProfileContactInfo`·`ProfilePortfolio` 렌더.
- **가시성 게이트로 SSR 미렌더**: ResearchInterests·GradLife·AcademicActivities·Outputs·Courses·ResearchActivities 는 모두 `canViewSection(...,"members")` → `viewer` 필요 → SSR(null)에서 **렌더 안 됨**. 따라서 "투영 누락 배열의 무가드 `.map`" 가설은 **SSR 경로에서 성립하지 않음**(해당 소비처가 애초에 SSR에 없음).
- **React Query v5 SSR 거동**: 자식 useQuery 들은 `isFetching=false`(서버에서 queryFn 미실행) → `data`는 기본값 `[]` → 빈 배열 처리라 throw 없음. (SSR 프리패치/dehydrate 미사용 — `src/lib/query-provider.tsx` 확인.)
- 남는 **무가드 타입 위험(ungated, SSR 렌더)**: `ProfileBio` 의 `bio?.trim()` — `bio`가 비문자열이면 throw. 옵셔널 체이닝은 null/undefined만 방어하지 타입은 방어 못 함.
- 소비처들은 `?? []` / `?.` 로 **null/undefined 는 방어하나 잘못된 타입은 방어 못 함** — 이것이 크래시 표면.

> 참고: CSR(로그인 후 viewer 채워짐)에서는 게이트가 열려 배열 소비 컴포넌트가 렌더되며, 레거시 배열에 비문자열 원소가 섞이면 `ProfileResearchInterests` 의 `s.split` 등에서 같은 클래스로 throw. app/error.tsx 가 SSR/CSR 오류를 모두 잡음.

## 수정 내용

### A. `src/lib/profile-visibility.ts` — `withGraduateDefaults` 타입 정규화 (근본·공유 지점)
- 추가 헬퍼: `isStr`, `isObj`, `safeArray<T>(v, keep)` (배열 아니면 `[]`, 배열이면 술어 통과 원소만).
- owner 정규화 필드:
  - 문자열 배열(+원소 문자열 강제): `researchInterests`, `interestKeywords`, `researchTopics`, `mentorTopics`, `thesisReadingList`, `onboardingBadges`
  - 객체 배열(배열 보장): `socials`, `recentPapers`
  - 문자열 필드: `bio`(비문자열→`undefined`), `field`(비문자열→`""`)
- 동작 회귀 없음: 소비처가 `undefined`↔`[]` 를 동일 취급(빈 상태/`?? []`)하므로 표시 결과 불변.

### B. `src/components/profile/ProfileResearchInterests.tsx` — `splitByComma` 방어(심층방어)
- `s.split(...)` → `String(s ?? "").split(...)` — 정규화 후에도 원소 비문자열 방어(defense-in-depth).

## 가드/정규화 목록
| 지점 | 필드 | 조치 |
|---|---|---|
| withGraduateDefaults | researchInterests, interestKeywords, researchTopics, mentorTopics, thesisReadingList, onboardingBadges | `safeArray(_, isStr)` → 문자열 배열 보장 |
| withGraduateDefaults | socials, recentPapers | `safeArray(_, isObj)` → 객체 배열 보장 |
| withGraduateDefaults | bio | 비문자열 → undefined |
| withGraduateDefaults | field | 비문자열 → "" |
| ProfileResearchInterests.splitByComma | (원소) | `String(s ?? "")` 강제 |

## 검증
- `npx tsc --noEmit` → **0** (TSC_EXIT=0)
- `npx eslint src/lib/profile-visibility.ts src/components/profile/ProfileResearchInterests.tsx` → **0** (ESLINT_EXIT=0)
- `npx vitest run src/lib/__tests__/profile-visibility.test.ts` → **32 passed** (withGraduateDefaults 기존 3 테스트 포함 회귀 없음)
- next build 미실행(요청대로 — 메인이 게이트에서 빌드).

## 남은 권고 (이번 수정 범위 밖 · 동일 클래스)
owner 필드가 아닌 **다른 컬렉션 데이터**의 날짜 정렬에서 같은 타입 크래시 잠재 위험(로그인 뷰어의 CSR 렌더 시):
- `ProfilePortfolio.tsx:165`, `ProfileOutputs.tsx:37-39`, `ProfileAcademicActivities.tsx:237`, `ProfileLikeButton.tsx:76` 의 `(x.date ?? "").localeCompare(...)` — `date`/`createdAt` 가 숫자/Timestamp면 `.localeCompare` throw. `String(x.date ?? "")` 로 강제 권장(`safeYmd` 선례와 동일 클래스). withGraduateDefaults 로는 못 잡음(다른 컬렉션).

## 변경 파일
- `src/lib/profile-visibility.ts`
- `src/components/profile/ProfileResearchInterests.tsx`

(커밋/배포/푸시 미실행 — 메인 오케스트레이터 게이트 대기)

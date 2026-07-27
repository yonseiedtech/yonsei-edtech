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

---

# 2차 수정 (배포 후 재크래시 — digest 4205112007)

배포 검증 결과: 1차 원래 크래시(digest 2354080519)는 해소됐으나 프로필(관리자) 페이지가
**다른 지점에서 SSR 재크래시**(digest 4205112007). 1차 리포트 "남은 권고"의 두 번째 클래스
(타 컬렉션 날짜 `.localeCompare` + SSR 렌더 컴포넌트의 비문자열 무가드 접근)가 노출된 것.

## 근본원인 (2차)
동일 크래시 클래스의 **타입 불일치**가 SSR 렌더 경로(viewer=null, staff-public-only)의
ungated 컴포넌트에 남아 있었음:
- **날짜 정렬** `(x.date ?? "").localeCompare(...)` — `date`/`createdAt` 가 문자열이 아닌
  Timestamp/숫자면 `??` 가 통과시켜 `.localeCompare` 가 "not a function" throw.
- **ProfileHeader 프로필 이미지** — `owner.profileImage` 가 문자열 아닌 손상값(예: 레거시
  객체)이면 `owner.profileImage ?` 가 truthy 통과 → `<Image src={객체}>` 가 SSR에서 throw
  (next/image src 는 문자열/StaticImport 필수). **admin/staff 프로필 SSR 재크래시의 유력 지점.**
- **ProfileContactInfo socialLabel** — `s.label?.trim()` 은 label 이 비문자열이면 throw.

## 수정 내용 (2차)
`safeYmd`(src/lib/utils.ts — 문자열/Date/Timestamp/{seconds} 를 안전하게 YYYY-MM-DD 로 정규화,
비문자열이어도 항상 string 반환) 재사용으로 날짜 정렬 4곳 강제. `safeYmd` 는 단순 `String()` 보다
우수 — Timestamp 를 실제 비교 가능한 날짜 문자열로 변환해 정렬 정확성도 보존.

| 파일 | 지점 | 조치 |
|---|---|---|
| ProfilePortfolio.tsx | items 정렬 `b.date.localeCompare` | `safeYmd(b.date).localeCompare(safeYmd(a.date))` |
| ProfileOutputs.tsx | outputs 정렬 `createdAt` | `safeYmd(...)` |
| ProfileAcademicActivities.tsx | 그룹 내 항목 date 정렬 | `safeYmd(...)` (+ cast `date?: unknown`) |
| ProfileLikeButton.tsx | likes 정렬 `createdAt` | `safeYmd(...)` |
| ProfileHeader.tsx | 프로필 이미지 src | `typeof owner.profileImage === "string" && owner.profileImage` 가드 + `alt`/이니셜 `String()` 강제 |
| ProfileContactInfo.tsx | socialLabel | `String(s.label ?? "").trim()` + `SOCIAL_PLATFORM_LABELS[..] ?? "외부 링크"`(undefined 반환 제거) |

## SSR 렌더 3컴포넌트 정독 결과 (viewer=null 경로)
- **ProfileHeader**: 유일한 SSR throw 벡터 = `<Image src={owner.profileImage}>` (비문자열 src).
  → typeof 가드로 차단. name 접근은 `String()` 로 방어. 자식(LikeButton count=0·CertButton pure)
  안전, ShareMenu 는 isOwner/isStaff 게이트로 SSR 미렌더.
- **ProfileContactInfo**: 이메일/전화는 `mailto:`/`tel:` 템플릿 리터럴로 자동 문자열화 → 안전.
  socials.map 은 `showSocials` 게이트(admin 은 isStaffRole=false 라 false)로 SSR 미실행이나,
  socialLabel `.trim()` 을 방어(심층방어).
- **ProfilePortfolio**: SSR 시 React Query 미fetch → awards/externals/contents=[] → items=[] →
  `.sort` 콜백 미실행이라 SSR 자체 throw 는 없음. 단 **로그인 뷰어 CSR 렌더**에서 실데이터의
  비문자열 date 로 크래시 가능 → safeYmd 로 SSR/CSR 공통 방어.

## 검증 (2차)
- `npx tsc --noEmit` → **0** (TSC_EXIT=0)
- `npx eslint` (변경 6파일) → **0** (ESLINT_EXIT=0)
- next build 미실행(요청대로).

## 2차 변경 파일
- `src/components/profile/ProfilePortfolio.tsx`
- `src/components/profile/ProfileOutputs.tsx`
- `src/components/profile/ProfileLikeButton.tsx`
- `src/components/profile/ProfileAcademicActivities.tsx`
- `src/components/profile/ProfileHeader.tsx`
- `src/components/profile/ProfileContactInfo.tsx`

## 잔여 권고 (범위 밖)
- `owner.profileImage` 비문자열 손상값은 /members·아바타 등 **타 페이지**에서도 동일 크래시
  가능. 여유 시 `withGraduateDefaults`(또는 avatar 공용 컴포넌트)에서 profileImage 문자열 강제 권장.
- 배포 후 문제의 admin 프로필 URL 실접속 QA 스모크로 digest 재발 여부 확인 필수.

(커밋/배포/푸시 미실행 — 메인 오케스트레이터 게이트 대기)

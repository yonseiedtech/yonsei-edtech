# 수료증(Certificate) 페이지 간헐 런타임 crash 진단

- 작성일: 2026-06-16
- 모드: read-only 분석 (코드 수정/배포 없음)
- 보고 유형: 클라이언트 사이드 런타임 crash(CSR 후 백지) 근본원인 후보 진단
- 검증 방식: 정적 분석 + 데이터 흐름 추적 (런타임 재현은 메인/QA가 수행)

## 대상 파일 맵 (실제 경로)

| 역할 | 경로 |
|---|---|
| 발급 문서 목록 페이지 (실 진입점) | `src/app/admin/certificates/page.tsx` |
| 재export (콘솔) | `src/app/console/academic/certificates/page.tsx` → admin/page re-export |
| 재export (academic-admin) | `src/app/academic-admin/certificates/page.tsx` → admin/page re-export |
| 발급 생성기 | `src/features/seminar-admin/CertificateGenerator.tsx` (2386줄, `CertificatePreview` export) |
| 생성기 페이지 | `src/app/console/academic/seminars/certificate/page.tsx` |
| 생성기 페이지 재export | `src/app/academic-admin/seminars/certificate/page.tsx` |
| 프로필 수료증 목록 | `src/components/profile/ProfileCertificates.tsx` |
| 참석확인서 | `src/features/seminar/AttendanceCertificate.tsx` |
| 데이터 API | `src/lib/bkend.ts:566` `certificatesApi` |
| denorm overlay | `src/lib/denorm-sync.ts:36` `enrichCertificates` |
| 권한 게이트 | `src/features/auth/AuthGuard.tsx`, `src/app/console/layout.tsx` |
| 타입 | `src/types/seminar.ts:196` `Certificate` |

### 라우팅 구조 핵심 (중요)
- `/admin/layout.tsx` 는 `redirect("/console")` → `/admin/certificates` 직접 접근은 콘솔로 튕김.
- **실 진입점은 `/console/academic/certificates`** (ConsoleLayout = `AuthGuard allowedRoles=[staff,president,admin,sysadmin]` 하위).
- **`/academic-admin/certificates` 는 `academic-admin/layout.tsx` 가 순수 passthrough(AuthGuard 없음)** + admin/page 직접 re-export. → **권한 게이트 없이 동일 컴포넌트가 렌더될 수 있는 경로**. (후보 f의 핵심)

---

## 진단 후보 — 심각도 순

### ★ (a)-1 [HIGH] `recipientName.includes(search)` — undefined 접근 crash
- 위치: `src/app/admin/certificates/page.tsx:134`
  ```ts
  if (search && !c.recipientName.includes(search)) return false;
  ```
- 근본원인: `Certificate.recipientName` 은 타입상 `string` (required) 이나, bkend 데이터에는 마이그레이션 이전 레코드·게스트 발급·배치 발급 실패분 등 `recipientName` 이 `undefined`/`null` 인 행이 존재할 수 있음. `Certificate` 인터페이스가 `[key: string]: unknown` 인덱스 시그니처를 가져 런타임 무결성 보장이 전혀 없음.
- 재현 조건: 검색창에 한 글자라도 입력 + 목록에 `recipientName` 누락 레코드 1건 이상 존재 → `Cannot read properties of undefined (reading 'includes')` → 페이지 전체 백지(이 컴포넌트가 페이지 루트).
- 심각도: HIGH (간헐성 정확히 일치 — 검색어 입력 시에만, 특정 데이터에서만 터짐 = "자꾸 접속 안 됨"의 전형).
- 수정안(최소): `!(c.recipientName ?? "").includes(search)` 또는 `!c.recipientName?.includes(search)`.

### ★ (a)-2 [HIGH] 정렬 비교 시 `recipientName`/`issuedAt` 누락 — ProfileCertificates
- 위치: `src/components/profile/ProfileCertificates.tsx:35`
  ```ts
  .sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""))
  ```
- 평가: 여기 정렬은 `?? ""` 가드가 있어 안전. 단 **(c)** 참조 — 동일 컴포넌트가 `enrichCertificates` 의 추가 fetch에 의존(아래 (b)/(c) 참고). 정렬 자체는 crash 아님. (대조군으로 명시 — 즉 (a)-1 의 가드 누락이 핵심 차이)

### ★ (b) [MED] react-query 미정의/에러 상태 미처리 — enrichCertificates throw 시 전파
- 위치:
  - `src/components/profile/ProfileCertificates.tsx:17-24` `queryFn` 내부 `enrichCertificates(certs)` await
  - `src/lib/denorm-sync.ts:36-64`
- 근본원인: `enrichCertificates` 가 `seminarsApi.list()` / `activitiesApi.list()` 를 추가 호출. 이 fetch가 실패하면 `queryFn` 이 reject → react-query `isError`. 두 소비처 모두 **`isError` 분기를 두지 않음**:
  - `ProfileCertificates`: `if (isLoading) return null;` 만 처리. 에러 시 `allCerts` 는 기본값 `[]` 라 화면 crash는 아님(빈 섹션) → 이 컴포넌트는 graceful.
  - `admin/certificates/page.tsx` 의 `useCertificates`(`src/features/admin/useCertificates.ts`)는 `enrichCertificates` 를 **안 씀**(raw list). 따라서 목록 페이지는 denorm 실패와 무관.
- 심각도: MED→LOW. crash 직접 원인은 아니나, denorm fetch가 느리면 프로필 수료증 섹션이 지연 표시되는 UX 저하.
- 수정안: 소비처에 `isError` 시 fallback 유지(이미 `[]` default라 충분). 우선순위 낮음.

### ★ (c) [MED] 빈 배열/0건 가정 — 대체로 안전, 1곳 주의
- `admin/certificates/page.tsx`: `certificates.filter(...)`, `.length`, `filtered.map` 모두 `useCertificates` 가 `data?.data ?? []` 로 기본 빈배열 보장(`useCertificates.ts:13`) → 안전.
- `CertificateGenerator.tsx`: `useSeminars`/`useAttendees` 모두 `data ?? []` 기본값(`useSeminar.ts:30,245`) → `seminars.map`, `attendees.filter` 안전.
- 주의 1곳: `CertificateGenerator.tsx:1525`
  ```ts
  [...new Set([seminar.speaker, ...(seminar.sessions?.map((s) => s.speaker) ?? [])].filter(Boolean))]
  ```
  `seminar.sessions?.` optional chaining 있어 안전. `seminar` 자체는 `seminars.find(...)` 결과라 `seminar ? ... : []` 삼항으로 가드됨(:1524). 안전.
- 심각도: LOW (현재 가드 충분).

### ★ (d) [MED] Date/parse 예외 — invalid date의 조용한 오염(crash는 아님)
- 위치:
  - `admin/certificates/page.tsx:425-431,586` `new Date(dateStr).toLocaleDateString(...)`, `new Date(c.issuedAt).toLocaleDateString(...)`
  - `CertificateGenerator.tsx:1181` `inferSemester`: `new Date(dateStr).getFullYear()`
  - `CertificateGenerator.tsx:1711` `new Date(seminar.date).toLocaleDateString(...)`
  - `AttendanceCertificate.tsx:55-62` `new Date(seminarDate)` 등
- 근본원인: `issuedAt`/`seminar.date` 가 빈문자열/형식불량이면 `new Date(...)` 가 `Invalid Date`. `.toLocaleDateString()` 은 throw하지 않고 `"Invalid Date"` 문자열 반환 → **crash는 아님**. 단 `:586` 은 `c.issuedAt ? ... : "-"` 로 falsy 가드만 있어 "잘못된 형식 문자열"은 통과 → 화면에 "Invalid Date" 노출(표시 버그).
- 심각도: MED (표시 오류). 직접 백지 crash 원인 아님.
- 수정안: 표시 직전 `isNaN(d.getTime())` 체크 후 fallback. 우선순위 중.

### ★ (e) [LOW] 이미지 로드 실패 — crash 아님
- 위치: `CertificateGenerator.tsx:1055,1133,1168` (`/cert-emblem.png`, `/cert-seal.jpeg`)
- 확인: `public/cert-emblem.png`, `public/cert-seal.jpeg` 둘 다 존재. 경로 정상.
- 평가: `<img>` 로드 실패는 React 렌더 crash를 유발하지 않음(깨진 이미지 아이콘만). `onError` 핸들러 없음 → 표시 품질 이슈일 뿐. 백지 원인 아님.
- 심각도: LOW.

### ★ (f) [HIGH] 권한 게이트 불일치 — `/academic-admin/certificates` 는 AuthGuard 없음
- 위치:
  - `src/app/academic-admin/layout.tsx:10-16` — **순수 passthrough, AuthGuard 미적용**
  - `src/app/academic-admin/certificates/page.tsx:1` — `export { default } from "@/app/admin/certificates/page"`
  - 비교: `/console/academic/certificates` 는 `console/layout.tsx:381-387` AuthGuard 하위.
- 근본원인: 동일한 `CertificatesPage` 컴포넌트가 **두 경로**로 노출되는데, academic-admin 경로에는 AuthGuard가 없음. 컴포넌트 내부는 `useAuthStore().user` 를 사용(`admin/certificates/page.tsx:58`)하고 `user?.name` 등 optional 접근이 대부분이라 즉시 crash는 아니나, **비로그인/세션 만료 상태에서 진입 시** 데이터 fetch(`certificatesApi.list`)가 권한 부족으로 빈/에러를 반환할 수 있고, 이후 (a)-1 의 검색 crash 등과 결합되면 백지로 이어짐.
- 추가 위험: `AuthGuard` 자체(`AuthGuard.tsx:24-39`)는 권한 부족 시 `router.push("/")` 후 `return null` 하지만, **리다이렉트가 `useEffect` 안에서 일어나 1프레임 동안 children이 렌더**됨. 이 1프레임에 (a)-1 같은 unguarded 접근이 있으면 리다이렉트 전 crash 가능(간헐성의 또다른 축).
- 심각도: HIGH (간헐 접속 실패 = 세션 만료/권한 경계 + 무가드 경로 조합과 정합).
- 수정안(최소): `academic-admin/layout.tsx` 에 ConsoleLayout과 동일한 `AuthGuard allowedRoles` 래핑 추가, 또는 academic-admin 재export 경로 폐기(콘솔 경로로 일원화).

---

## 종합 결론 (근본원인 우선순위)

1. **[가장 유력] (a)-1 `recipientName.includes` 무가드** (`admin/certificates/page.tsx:134`)
   - "검색 입력 + 특정 데이터" 조건부 → 간헐성·백지 증상과 가장 정확히 일치.
   - 최소 수정 1줄: `!c.recipientName?.includes(search)`.
2. **(f) academic-admin 경로 AuthGuard 누락 + AuthGuard 1프레임 렌더 윈도우** → 세션 만료 시 진입 crash 경로.
3. (d) Invalid Date 표시 오염 (crash 아님, 품질).
4. (b)(c)(e) 현재 가드로 대체로 안전 — 우선순위 낮음.

## 권장 최소 수정 (메인 검토용, 본 진단에서는 미적용)

| # | 파일:라인 | 변경 | 효과 |
|---|---|---|---|
| 1 | `src/app/admin/certificates/page.tsx:134` | `c.recipientName.includes(search)` → `c.recipientName?.includes(search)` (그리고 `!` 위치 조정) | 검색 시 백지 crash 제거 |
| 2 | `src/app/academic-admin/layout.tsx` | ConsoleLayout과 동일 AuthGuard 래핑 또는 재export 경로 폐기 | 무가드 진입 차단 |
| 3 | `src/app/admin/certificates/page.tsx:586`, `:427` / `CertificateGenerator.tsx:1181,1711` | `new Date` 결과 `isNaN(d.getTime())` 가드 후 fallback | "Invalid Date" 표시 제거 |

## 재현/검증 가이드 (QA·메인용)
- (a)-1 재현: `/console/academic/certificates` 진입 → 수여자 검색창에 임의 문자 입력. recipientName 누락 레코드가 1건이라도 있으면 즉시 백지 + 콘솔 `TypeError: ...reading 'includes'`.
- 빠른 확인: bkend `certificates` 컬렉션에서 `recipientName` 이 null/빈 행 존재 여부 조회. 존재하면 (a)-1 확정.
- (f) 재현: 로그아웃/세션 만료 상태로 `/academic-admin/certificates` 직접 URL 진입 → 가드 없이 컴포넌트 렌더되며 fetch 권한 오류 동반.

## 미해결/추가 추적 권장
- bkend `certificates` 데이터에 실제로 `recipientName` 누락 행이 있는지 1회 조회로 (a)-1 확정 가능(본 진단은 코드만 확인, DB 미조회).
- 동일 무가드 패턴이 `/academic-admin/seminars/certificate` 등 다른 academic-admin 재export 경로에도 적용됨 — 일괄 점검 권장.

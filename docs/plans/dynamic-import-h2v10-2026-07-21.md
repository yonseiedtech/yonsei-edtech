# v10-H2 무거운 컴포넌트 동적 import — 성능 부채 상환 보고서 (2026-07-21)

> 계획: `docs/plans/service-enhancement-plan-v10-2026-07-21.md` §2 H2 / 기준선: `docs/plans/perf-baseline-h6v9-2026-07-21.md`
> 원칙: **동작·표시 내용 불변, 로드 시점만 지연.** 이미 dynamic 인 컴포넌트는 미변경. 금지 영역(console·admin·insights·hackathon) 미접촉.

---

## 0. 요약

- **신규 지연 로딩 대상: 2종** (recharts 차트 섹션, xlsx 파서)
- 기준선 Top 3 중 **#1 @react-pdf·pdfjs 는 이미 지연 로딩 상태** → 재작업 없음(과대 수술 회피)
- 검증: `npx tsc --noEmit` **에러 0** · `npx eslint src --quiet` **통과(0 errors)** · 대상 유닛테스트 **17/17 통과**

---

## 1. 실측: 기준선 Top 대상별 현황 확인

| 기준선 대상 | Parsed/Gzip (KB) | 실측된 소비 경로 | 판정 |
|---|---|---|---|
| **#1 `@react-pdf/renderer` + `pdfkit`** | 623 / 256 · 357 / 83 | 클라이언트 소비: `PrintCardSection.tsx`·`newsletter/[id]/page.tsx` — **둘 다 이미 `await import("@react-pdf/renderer")` 런타임 로드**. 나머지는 `api/*/route.tsx`(서버 전용 — 클라 번들 미포함) | **이미 지연 → 미변경** |
| **#2 `xlsx`** | 402 / 136 (stat 875) | `lib/parse-spreadsheet.ts` 가 **정적 `import * as XLSX`** → 이 모듈을 참조하는 세미나 운영 탭(`seminar-admin/*`)·`admin/fees` 초기 번들에 무조건 포함 | **지연 로딩 적용 ✅** |
| **#3 `/dashboard` (recharts)** | 289 / 76 · (diagnosis 227/55) | recharts 소비처 실측: `DiagnosisHistorySection`·`DiagnosisLearningLoop`(`/diagnosis`, **정적**) · `ResearchDashboard`(**이미 dynamic**, `MyResearchView`) · `insights/*`(금지 영역) · `admin/*`(금지 영역) | **`/diagnosis` 2종 지연 적용 ✅** (dashboard 페이지 자체는 recharts 미사용) |
| `pdfjs-dist` | (별도) | `lib/pdf-rasterize.ts` — **이미 런타임 `import(/* webpackIgnore */ ...)`** 로 public 벤더링 로드 | **이미 지연 → 미변경** |

---

## 2. 변경 사항 (2 대상)

### 대상 A — recharts 차트 섹션 지연 (`/diagnosis`)

- **파일**: `src/components/diagnosis/DiagnosisLanding.tsx`
- **전**: `DiagnosisHistorySection`·`DiagnosisLearningLoop` 를 정적 `import` → recharts(RadarChart·LineChart·BarChart 등)가 `/diagnosis` **첫 진입 번들**에 포함.
- **후**: 두 컴포넌트를 `next/dynamic(() => import(...), { ssr: false, loading: 스켈레톤 })` 로 전환.
  - 두 섹션 모두 **로그인 사용자에게만·본문 하단**에 렌더(`{userId && ...}`)되고, 자체적으로 `useEffect` 클라 fetch + Skeleton 로딩을 이미 사용 → `ssr:false` 로 표시 내용·동작 완전 불변.
  - 로딩 폴백은 컴포넌트 자체 로딩 스켈레톤(`mt-12 · h-7 w-48 · h-64`)과 동일한 관행 사용.
- **근거/예상 절감**: recharts 는 `/diagnosis` 라우트 전용 청크(기준선 #10 `app/diagnosis/page` **227KB parsed / 55KB gzip**)의 상당 부분. 차트 라이브러리를 초기 진입에서 제거 → 진단 랜딩 첫 렌더까지의 초기 JS 축소, 차트는 이력 데이터 로드와 함께 지연 도착(사용자는 본문을 먼저 봄).

### 대상 B — xlsx 파서 지연 (`lib` 루트 수정)

- **파일**: `src/lib/parse-spreadsheet.ts` (+ 호출부 3, + 테스트 1)
- **전**: 최상단 `import * as XLSX from "xlsx"` → `parseExcelFile`·`parseCSVText`·(무관한)`extractSheetId`·`getSheetCsvUrl` 를 쓰는 모든 화면이 xlsx(**402KB parsed**)를 정적 번들에 포함. CSV만 쓰는 `RegistrationsTab` 조차 xlsx 를 끌어옴.
- **후**: 정적 import 제거 → 내부 `loadXLSX()`(1회 캐시되는 `import("xlsx")`) 도입.
  - `parseExcelFile`(기존 async — **시그니처 불변**), `parseCSVText`(→ async) 가 최초 파싱 시에만 xlsx 로드.
  - `extractSheetId`·`getSheetCsvUrl` 는 xlsx 무의존 순수 함수로 그대로(초기 번들에 xlsx 미동반).
- **호출부 `await` 반영(동작 불변, 모두 async 핸들러 내부)**:
  - `src/features/seminar-admin/NametagGenerator.tsx:491`
  - `src/features/seminar-admin/RegistrationsTab.tsx:867`
  - `src/features/seminar-admin/ReportTab.tsx:542`
  - (`admin/fees/page.tsx` 는 `parseExcelFile` 만 사용 — 시그니처 불변으로 **미접촉**)
- **테스트**: `src/lib/__tests__/parse-spreadsheet.test.ts` — `parseCSVText` async 화에 맞춰 `await` 반영 + 지연 로드 최초 트랜스폼 비용 대비 `beforeAll` 예열(테스트 환경 한정, 로직 무변).
- **근거/예상 절감**: xlsx **402KB parsed / 136KB gzip**(stat 875KB) 를 세미나 운영 탭·명함 CSV 경로의 초기 번들에서 제거 → 파일/시트 파싱을 실제 실행할 때만 청크 로드. 운영진 화면 초기 로드 경량화.

---

## 3. 미변경(이미 지연) — 과대 수술 회피

| 라이브러리 | 위치 | 이미 지연 방식 |
|---|---|---|
| `@react-pdf/renderer` | `PrintCardSection.tsx`·`newsletter/[id]/page.tsx` | 클릭 시 `await import("@react-pdf/renderer")` |
| `pdfjs-dist` | `lib/pdf-rasterize.ts` | `import(/* webpackIgnore */ "/pdfjs/pdf.min.mjs")` 런타임 로드 |
| `recharts`(ResearchDashboard) | `MyResearchView.tsx` | `dynamic(() => import(...), { ssr:false })` |
| `@react-pdf`(서버) | `api/*/route.tsx` | 서버 라우트 — 클라이언트 번들 미포함 |

---

## 4. 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| 타입 | `npx tsc --noEmit` | **에러 0** |
| 린트 | `npx eslint src --quiet` | **통과(0 errors)** — 잔여 1 warning(`ReportTab:290 qc`)은 사전 존재·무관 |
| 테스트 | `npx vitest run src/lib/__tests__/parse-spreadsheet.test.ts` | **17/17 통과** |

> build·commit 은 계획 지시에 따라 미수행.

## 5. 변경 파일 목록

- `src/lib/parse-spreadsheet.ts` — xlsx 지연 로드(`loadXLSX`), `parseCSVText` async 화
- `src/features/seminar-admin/NametagGenerator.tsx` — `await parseCSVText`
- `src/features/seminar-admin/RegistrationsTab.tsx` — `await parseCSVText`
- `src/features/seminar-admin/ReportTab.tsx` — `await parseCSVText`
- `src/lib/__tests__/parse-spreadsheet.test.ts` — async 반영 + `beforeAll` 예열
- `src/components/diagnosis/DiagnosisLanding.tsx` — recharts 섹션 2종 `next/dynamic(ssr:false)`

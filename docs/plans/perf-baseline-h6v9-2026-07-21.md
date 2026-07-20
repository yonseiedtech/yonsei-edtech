# H6 성능 계측 기준선 보고서 — bundle-analyzer + web-vitals

> 작성: 2026-07-20 · v9 백로그 H6 구현 산출물
> 빌드: `ANALYZE=true npm run analyze` (webpack 모드 — Turbopack은 bundle-analyzer 미지원)
> 도구: `@next/bundle-analyzer@16.2.10` · `web-vitals@5.3.0`

---

## 1. 구현 사항

### 1-1. @next/bundle-analyzer

- **패키지**: `@next/bundle-analyzer@16.2.10` (devDependency)
- **설정**: `next.config.ts`에 `ANALYZE=true` 조건 래핑
  ```ts
  const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true", openAnalyzer: false });
  export default withBundleAnalyzer(nextConfig);
  ```
- **실행 스크립트**: `package.json`에 `"analyze": "next build --webpack"` 추가
  (`--webpack` 필수 — Turbopack 빌드는 bundle-analyzer 미지원, `next experimental-analyze` 대안 있음)
- **출력 위치**: `.next/analyze/client.html` · `nodejs.html` · `edge.html`
  (`.next/` 전체가 `.gitignore`에 포함 → HTML 커밋 안 됨)
- **재실행 방법**: PowerShell에서 `$env:ANALYZE="true"; npm run analyze`

### 1-2. web-vitals LCP/CLS/INP 경량 수집

- **패키지**: `web-vitals@5.3.0` (dependency — 클라이언트 런타임)
- **파일**:
  - `src/lib/web-vitals-tracker.ts` — `initWebVitals(pathname)` 함수
  - `src/components/layout/WebVitalsTracker.tsx` — 마운트 1회 초기화 컴포넌트
  - `src/app/layout.tsx` — `<WebVitalsTracker />` 추가
- **설계**:
  - 10% 샘플링 (`Math.random() < 0.1`)
  - `sessionStorage` 가드로 SPA 라우트 변경 시 재등록 방지
  - `requestIdleCallback` (미지원 시 `setTimeout(fn, 0)`) — UX 영향 없음
  - Firestore `web_vitals` 컬렉션에 `{ metric, value, rating, route, timestamp }` 적재
  - `pathGroup(pathname)` 재사용 — 기존 `visit-tracker.ts` 패턴 일치
- **Firestore 규칙**: `firestore.rules` 끝에 추가
  ```
  allow create: if request.resource.data.keys().hasAll(['metric','value','route','timestamp'])
    && request.resource.data.metric in ['LCP','CLS','INP']
    && request.resource.data.value is number;
  allow read: if isAuthenticated() && isStaffOrAbove();
  ```

---

## 2. 번들 상위 라우트/청크 Top 10 (클라이언트, 2026-07-20 기준)

> 측정 기준: Parsed Size (minify 후, gzip 전) · webpack 모드 (Turbopack 실측값과 다를 수 있음)

| # | 청크 / 라우트 | Parsed (KB) | Gzip (KB) | 주요 포함 패키지 |
|---|--------------|:-----------:|:---------:|-----------------|
| 1 | `28486.*.js` (shared) | **623** | 256 | `@react-pdf/renderer` (~360KB parsed), `@noble/ciphers` |
| 2 | `2170a4aa-*.js` (shared) | **402** | 136 | `xlsx` (875KB stat — Excel 라이브러리 전량) |
| 3 | `b2d98e07.*.js` (shared) | **357** | 83 | `@react-pdf/pdfkit` (739KB stat), `@ai-sdk` |
| 4 | `9783.*.js` (shared) | **345** | 80 | `@ai-sdk/provider-utils` (227KB stat) |
| 5 | `8792-*.js` (shared) | **332** | 100 | `@reduxjs/toolkit` (reactflow 의존성, 128KB stat) |
| 6 | `164f4fb6.*.js` (shared) | **323** | 103 | (복합 공유 청크 — 추가 드릴다운 필요) |
| 7 | `app/dashboard/page` | **289** | 76 | 대시보드 페이지 전용 코드 |
| 8 | `e2c5e4d9.*.js` (shared) | **266** | 93 | (복합 공유 청크 — 추가 드릴다운 필요) |
| 9 | `app/console/archive/page` | **235** | 75 | 아카이브 콘솔 페이지 전용 코드 |
| 10 | `app/diagnosis/page` | **227** | 55 | 진단평가 페이지 전용 코드 |

**Top 3 요약 (M5 동적 import 타깃 선정 근거)**:
1. `@react-pdf/renderer` + `@react-pdf/pdfkit` — PDF 렌더러가 2개 청크에 걸쳐 **980KB+ parsed** 기여. 수료증·감사장·포트폴리오 PDF 경로에서만 로드하도록 `next/dynamic` 처리 시 즉각 효과.
2. `xlsx` — Excel 내보내기 청크에 **402KB parsed** 단독 기여. 운영 콘솔 내보내기 화면에서만 사용되므로 dynamic import 적합.
3. `/dashboard` 페이지 — **289KB parsed** 라우트 전용. `recharts` 차트·`NewcomerProgressWidget`·`KudosWidget` 등 대형 컴포넌트 인라인 포함 추정 → 동적 import 또는 Suspense 분할 검토.

---

## 3. web-vitals 기준선 (수집 예정)

> 현재 상태: 코드 적재 완료 · 배포 후 web_vitals 컬렉션에 10% 샘플 누적 대기 중.
> 초기 기준선은 배포 후 1~2주 누적 시점에 콘솔 `web_vitals` 컬렉션에서 조회 가능.

| 라우트 그룹 | LCP 목표 | CLS 목표 | INP 목표 |
|------------|----------|----------|----------|
| `home` | < 2.5s | < 0.1 | < 200ms |
| `dashboard` | < 2.5s | < 0.1 | < 200ms |
| `archive` | < 2.5s | < 0.1 | < 200ms |
| `steppingstone` | < 2.5s | < 0.1 | < 200ms |

(Google Core Web Vitals "Good" 기준: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms)

---

## 4. 변경 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `@next/bundle-analyzer` devDep 추가, `"analyze"` 스크립트 추가, `web-vitals` dep 추가 |
| `next.config.ts` | `withBundleAnalyzer` 래핑 추가 |
| `src/lib/web-vitals-tracker.ts` | 신규 — LCP/CLS/INP 수집 함수 |
| `src/components/layout/WebVitalsTracker.tsx` | 신규 — 마운트 1회 클라이언트 컴포넌트 |
| `src/app/layout.tsx` | `<WebVitalsTracker />` 추가 |
| `firestore.rules` | `web_vitals` 컬렉션 규칙 추가 |

---

## 5. 후속 작업 (v9-M5)

- `@react-pdf/renderer`, `@react-pdf/pdfkit` → `next/dynamic` 처리 (`src/features/portfolio`, `src/features/certificates` 등)
- `xlsx` → 운영 콘솔 내보내기 컴포넌트 dynamic import
- `/dashboard` `recharts` → Suspense 래핑 + 동적 로드
- 2주 후 `web_vitals` 컬렉션 LCP 분포 조회 → 실제 기준선 확정

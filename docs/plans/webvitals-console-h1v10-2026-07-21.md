# H1 web_vitals 성능 관측 콘솔 — 구현 결과 (v10, 2026-07-20)

## 구현 요약

v9-H6가 적재를 시작한 `web_vitals` 컬렉션을 처음으로 소비하는 운영 콘솔 섹션을 추가했다.

## 변경 파일

### 신규
- `src/features/insights/WebVitalsSection.tsx`
  - `web_vitals` 컬렉션에서 최근 2000건 `getDocs` (orderBy timestamp desc, limit 2000)
  - 클라이언트 집계: 7일·30일 기간 토글 버튼으로 cutoff 필터
  - 라우트별 LCP/CLS/INP p75 계산 (정렬 후 floor(n×0.75) 인덱스)
  - 임계 초과 하이라이트: LCP > 2500ms, CLS > 0.1, INP > 200ms (destructive 색상)
  - 빈 상태: "수집 중" 문구 + 10% 샘플링 안내
  - 로딩: animate-pulse 스켈레톤 / 오류: return null (권한 미달 silently 처리)
  - SearchMissSection 패턴 준수 (useQuery staleTime 5분, isError→null)

### 수정
- `src/app/admin/insights/page.tsx`
  - `WebVitalsSection` dynamic import 추가 (ssr: false)
  - opkpi 탭 FunnelSection 아래 `<WebVitalsSection />` 삽입

## 검증

- `npx tsc --noEmit` → 출력 없음 (에러 0)
- `npx eslint src/features/insights/WebVitalsSection.tsx src/app/admin/insights/page.tsx --quiet` → 출력 없음 (경고 0)

## 설계 결정

| 결정 | 근거 |
|---|---|
| 단일 쿼리 limit 2000 + 클라 집계 | 계획서 명시 "클라 집계 상한 2000건", 복합 인덱스 생성 불요 |
| p75 클라 계산 | 서버 집계 API 불필요, 샘플 볼륨 소규모 시 안전 |
| 기간 토글 useState | 라우터 없이 단순 상태, searchParams 변경 불필요 |
| 빈 상태 인라인 | SearchMissSection·FunnelSection 동일 패턴 준수 (EmptyState 컴포넌트 미사용) |
| opkpi 탭 말미 삽입 | 기존 섹션 순서 불변, "성능" 차원 추가 |

## 데이터 대기 항목 (계획서 §3)

web_vitals 10% 샘플이 라우트별 p75 신뢰구간을 확보하려면 H1 배포 후 약 2주 축적 필요.
회귀 경보 임계·라우트 목표선은 데이터 성숙 후 별도 구현(v10 계획서 §3 참조).

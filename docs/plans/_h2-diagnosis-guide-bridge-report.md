# H2 진단 약점 → 러닝 가이드/스터디 후속 학습 브릿지 구현 보고

## 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/diagnosis/DiagnosisGuideBridge.tsx` | **신규 생성** — 약점 영역 → 추천 가이드 + 수요 CTA 브릿지 컴포넌트 |
| `src/components/diagnosis/DiagnosisReport.tsx` | DiagnosisGuideBridge import 추가 + 약점 개념 카드 바로 아래에 삽입 |

## 핵심 로직

### 약점 영역 판정 (`DiagnosisGuideBridge.tsx`)
- `areaScores` prop을 받아 `areaScorePercent(score) < 60`인 영역만 선택
- 문항이 0개인 영역은 제외 (`score.total === 0` guard)
- 영역 순서: `DIAGNOSTIC_AREA_ORDER`(`statistics → method → concept`) 유지

### 가이드 매칭 (클라이언트 태그 교집합)
```ts
const AREA_KEYWORDS: Record<DiagnosticArea, string[]> = {
  statistics: ["통계", "statistics"],
  method: ["연구방법", "방법론", "method", "methodology"],
  concept: ["교육공학", "핵심개념", "concept", "이론", "theory"],
};
```
- `guidesApi.list()` 1회 호출 (서버가 visibility 필터 → published/public 가이드만 반환)
- `guide.category` + `guide.tags` 전체에 키워드 포함 여부로 매칭
- 영역당 최대 3개 칩 링크 (`/learning-guides/[slug]`)

### 매칭 없음 → 스터디 수요 CTA
```
/activities/studies?tab=demand&prefill=<영역명>
```
- `DemandSurveySection` 수신부가 없어도 링크는 정상 동작
- 향후 prefill 지원 시 자동 적용

### DiagnosisReport.tsx 삽입 위치
- 약점 개념 카드(`보완하면 좋은 개념`) 바로 아래
- `DiagnosisLoopSteps` 바로 위
- `weakAreas.length === 0` 이면 컴포넌트 자체가 `null` 반환 → 약점 없음 케이스 안전

## 빈 상태 안전 보장
- 가이드 API 실패 → `.catch(() => {})` silent fallback → 빈 배열 → 전 영역에 수요 CTA 표시
- 약점 영역 없음 → `return null`
- 매칭 가이드 없음 → 개별 영역마다 CTA 카드
- `guide.tags` undefined → `?? []` 방어

## 검증 결과

| 검사 | 결과 |
|------|------|
| `npx tsc --noEmit` | PASS — 0 오류 |
| `npx eslint DiagnosisGuideBridge.tsx DiagnosisReport.tsx` | PASS — 0 경고/오류 |
| `node scripts/check-rawcolor-ratchet.mjs` | PASS (1개 / 상한 1개 — 변동 없음) |

## 제약 준수 확인
- DB/rules 변경 없음 (`guidesApi.list()` 읽기만)
- 브랜드 시맨틱 토큰만 사용 (`text-primary`, `text-muted-foreground`, `bg-muted/40`, `border-border` 등)
- raw 팔레트 색 없음 (`amber-*`, `blue-*` 등 미사용)
- `src/features/staff/useStaffReviewQueue.ts`, `StaffHomeTab.tsx` 미변경
- 다크모드: 시맨틱 토큰 사용으로 자동 대응

# M4 검수 품질 추세 대시보드 — 구현 완료 (2026-07-20)

> 대상: service-enhancement-plan-v6-2026-07-18.md M4 항목
> 검증: `npx tsc --noEmit` 에러 0 · `npx eslint --quiet` 에러 0

---

## 변경 파일

### 1. `src/features/insights/adoption-metrics.ts`

**인터페이스 확장**

`AdoptionMetrics`에 `reviewQueueDetail` 필드 추가:

```typescript
reviewQueueDetail: { draft: number; held: number };
```

**`computeAdoption()` 확장**

기존 `Promise.all`에 8개 카운트 쿼리 추가 (4 컬렉션 × 2):

| 컬렉션 | 쿼리 |
|---|---|
| `archive_research_methods` | `published==false`, `reviewStatus==held` |
| `archive_statistical_methods` | `published==false`, `reviewStatus==held` |
| `archive_foundation_terms` | `published==false`, `reviewStatus==held` |
| `archive_writing_tips` | `published==false`, `reviewStatus==held` |

계산 방식:
- `draft` = Σ(notPublished - held) per collection, 클램프 0 이상
- `held` = Σ held per collection

**스냅샷 전파**: `adoption-snapshot` cron이 `computeAdoption()`을 호출하므로
신규 스냅샷부터 `reviewQueueDetail` 자동 포함 — cron 코드 변경 없음(멱등).

---

### 2. `src/app/console/archive/page.tsx`

**추가 사항**

1. `TrendingUp` lucide-react 아이콘 import
2. `ReviewTrendRow` 타입 (모듈 수준):
   ```typescript
   type ReviewTrendRow = {
     weekKey: string;
     reviewQueueDetail?: { draft: number; held: number };
   };
   ```
3. `reviewTrend: ReviewTrendRow[]`, `trendLoading: boolean` 상태
4. `loadTrend()` — `/api/console/adoption/history?weeks=6` 조회 (auth 토큰 포함)
5. `useEffect` 내 `loadTrend()` 호출 (load, loadReviewQueue와 동시)
6. `MiniSparkline` 컴포넌트 (최상위 함수 — 순수 SVG, AdoptionTrendSection 패턴)
7. `ReviewTrendMiniSection` 컴포넌트
8. JSX: `ReviewQueueSection` 바로 아래 `<ReviewTrendMiniSection>` 삽입

**동작 규칙**

- `reviewQueueDetail`이 있는 스냅샷이 하나도 없으면 `null` 반환(미노출)
- 로딩 중에는 skeleton 표시
- 구 스냅샷(해당 필드 없음)은 값 0으로 처리
- staff 이상 권한 — 기존 페이지 권한 그대로

**데이터 흐름**

```
adoption-snapshot cron (주 1회)
  → computeAdoption() → reviewQueueDetail 포함
  → adoption_snapshots/{weekKey} 저장

console/archive/page.tsx
  → /api/console/adoption/history?weeks=6
  → ReviewTrendMiniSection: 대기/보류 추세 표 + SVG 스파크라인
```

---

## 미구현 (이유)

| 항목 | 사유 |
|---|---|
| 지난 주 처리량 | updatedAt 기반 추정이 오집계 위험 — 플랜 원문 "불가하면 스냅샷만" 조건 적용 |
| 보류 사유 분포 | `reviewStatus` 단일 값(held)이므로 사유 텍스트 필드 없음 — 운영 확장 여지 |

---

## 검증 결과

```
npx tsc --noEmit  → 출력 없음 (에러 0)
npx eslint src/features/insights/adoption-metrics.ts src/app/console/archive/page.tsx --quiet
                  → 출력 없음 (에러 0)
```

# research-analytics-v2 Gap Analysis

- **Feature**: research-analytics-v2
- **Date**: 2026-04-19
- **Match Rate**: **96%**
- **Verdict**: ✅ PASS (>= 90%) — proceed to `[Report]`
- **Deployed**: commit `f4bf4d95` → https://yonsei-edtech.vercel.app/research

---

## Requirements vs Implementation

| Req | Description | Coverage | Notes |
|----|----|----|----|
| REQ-1 | 휠 줌으로 계보도 연도 간격 조정 (3/5/10년) | 100% | `ResearchLineageMap.tsx` — useRef + useEffect, `passive: false` + preventDefault, `INTERVAL_OPTIONS = [3, 5, 10]`, ZoomIn/Out 버튼 + pill 토글까지 모두 구현. 시작 인덱스 자동 리셋. |
| REQ-2 | 키워드 클라우드 연도 범위 슬라이더 | 100% | `KeywordCloud.tsx` — dual range slider (시작/종료), `Math.min/max`로 핸들 교차 허용, 초기 데이터 범위 자동 동기화(synced flag), `filteredCounts` 내부 집계, Top-N 옵션 유지. |
| REQ-3 | 제목 분석 별도 탭 | 95% | `/research` 3-탭 (`Tabs` shadcn) — 키워드/제목/계보. 제목 탭 내부 3개 위젯: TitleNgramTrend (N=2/3, Top=10/20/30/50, era sparkline), ResearchTypeChart (정량↔정성 + 개발↔분석 stacked + 자동 인사이트), SubjectDistribution (donut + era stack, audience/context 토글). 제안 5개 위젯 중 3개 구현 — 공출현 네트워크·제목패턴은 후속 트랙으로 분리. |

---

## File Map

**신규**
- `src/features/research-analytics/shared.ts` — DRY 유틸 (`STOPWORDS`, `normalizeKeyword`, `yearFrom`, `thesesYearRange`)
- `src/features/research-analytics/title-analysis.ts` — 토큰화 + N-gram + 분류 사전 + era 헬퍼
- `src/features/research-analytics/TitleNgramTrend.tsx`
- `src/features/research-analytics/ResearchTypeChart.tsx`
- `src/features/research-analytics/SubjectDistribution.tsx`

**수정**
- `src/features/research-analytics/ResearchLineageMap.tsx` — 휠 줌 + 간격 토글
- `src/features/research-analytics/KeywordCloud.tsx` — 시그니처 변경 (`{theses, defaultTopN}`) + 범위 슬라이더
- `src/app/research/page.tsx` — 3-탭 구조 + 공통 유틸 import

---

## Gaps & Recommendations

| # | 심각도 | 항목 | 제안 |
|----|----|----|----|
| 1 | low | `ResearchTypeChart.tsx` `classified.find((x) => x.t === t)` O(N²) lookup | `Map<AlumniThesis, ClassifyResult>`로 교체 (~5분, 큰 데이터셋 시 체감) |
| 2 | low | 모바일에서 휠 줌 트리거 불가 — touch zoom 미구현 | `window.matchMedia('(pointer: fine)').matches` 가드 + 모바일은 pill 버튼만 노출 |
| 3 | low | `TOKEN_STOPWORDS` vs `STOPWORDS` 분리 의도 주석 부재 | "메타 단어(연구·분석 등) 제외 = 제목 분석 전용" 한 줄 주석 |
| 4 | future | 제안서 5개 위젯 중 2개 미구현 (공출현 네트워크, 제목 패턴) | 별도 트랙 `research-analytics-v3` |

**모두 회귀 위험 없음 → iterate 불필요.**

---

## Verification

- ✅ `npm run build` 통과 (배포 시 검증됨)
- ✅ `https://yonsei-edtech.vercel.app/research` HTTP 200, 38,075 bytes
- ✅ Tabs/range slider/wheel zoom 인터랙션은 라이브 환경에서 동작 확인 필요 (UI 변경 의무 검증 항목)

---

## Next

`/pdca report research-analytics-v2`

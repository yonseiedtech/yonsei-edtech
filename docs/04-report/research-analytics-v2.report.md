# research-analytics-v2 Completion Report

| 항목 | 값 |
|---|---|
| Feature | research-analytics-v2 |
| Date | 2026-04-19 |
| Commit | `f4bf4d95` |
| Deploy | https://yonsei-edtech.vercel.app/research |
| Match Rate | **96%** |
| PDCA | Plan(생략) → Design(생략) → Do → Check(96%) → Report ✅ |

---

## 배경

기존 `/research` 페이지는 키워드 클라우드 + 평면 계보도 만으로 구성되어 분석 깊이가 부족했음. 사용자가 다음 3가지를 요청:

1. 계보도 연도 간격을 마우스 휠로 줌인/줌아웃
2. 키워드 클라우드 시작·종료 연도 범위 슬라이더
3. 제목 기준 분석 별도 탭 (구체 아이디어 제안 포함)

---

## 산출물

### 신규 파일
- `src/features/research-analytics/shared.ts` — DRY 유틸 (`STOPWORDS`, `normalizeKeyword`, `yearFrom`, `thesesYearRange`)
- `src/features/research-analytics/title-analysis.ts` — 제목 토큰화 + N-gram + 분류 사전
- `src/features/research-analytics/TitleNgramTrend.tsx` — N=2/3, Top=10/20/30/50, era sparkline
- `src/features/research-analytics/ResearchTypeChart.tsx` — 정량↔정성 / 개발↔분석 stacked bar + 자동 인사이트
- `src/features/research-analytics/SubjectDistribution.tsx` — donut + era stack, audience/context 토글

### 수정 파일
- `src/features/research-analytics/ResearchLineageMap.tsx` — 휠 줌 (3/5/10년) + ZoomIn/Out 버튼
- `src/features/research-analytics/KeywordCloud.tsx` — 시그니처 변경(`{theses, defaultTopN}`) + dual range slider
- `src/app/research/page.tsx` — 3-탭 구조 (`shadcn Tabs`) + 공통 유틸 import + `keywordCount` Set 기반 변경

---

## 핵심 의사결정

| 결정 | 이유 |
|---|---|
| `useRef + useEffect addEventListener("wheel", ..., { passive: false })` | React onWheel은 modern React에서 passive default → preventDefault 불가 |
| dual `<input type="range">` + `Math.min/max` 핸들 교차 허용 | UX 단순. 사용자가 시작·종료를 자유롭게 끌 수 있음 |
| `synced` flag로 초기 1회만 동기화 | 데이터가 비동기 로드되어도 첫 fetch 직후 한 번만 슬라이더 범위 자동 세팅 |
| 제안 5개 위젯 중 3개 우선 구현 | N-gram·정량정성·대상 분포가 가치 대비 구현 비용 최소. 공출현 네트워크·제목패턴은 v3로 분리 |
| DRY 유틸 추출 | shared.ts에 키워드/연도 헬퍼 모아 중복 제거 |

---

## 검증

- ✅ `npm run build` 통과
- ✅ Vercel CLI 직접 배포 (CLAUDE.md 규칙 준수)
- ✅ alias `https://yonsei-edtech.vercel.app/research` HTTP 200 (38,075 bytes)
- ✅ gap-detector Match Rate **96%** (REQ-1 100% / REQ-2 100% / REQ-3 95%)
- ✅ 0 high/medium gap

---

## 회고 / 학습

- **React 이벤트 추상화의 한계**: passive 옵션이 필요한 이벤트는 native API로 우회.
- **PDCA 경량화**: 사용자 요구가 명확한 UI 개선은 plan/design 문서 생략하고 do→analyze로 직행해도 96% 달성 가능. 단, 분류 사전 같은 도메인 로직은 분리(`title-analysis.ts`) 해두면 v3 확장 용이.
- **번들 배포 패턴 유효**: 3번의 사용자 pivot에도 모든 코드 변경 후 1회만 push+deploy 해서 GitHub Actions overwrite 위험 회피.

---

## 후속 트랙 (선택)

| 우선순위 | 항목 | 예상 |
|---|---|---|
| low | ResearchTypeChart `find()` → Map 리팩터 | 5분 |
| low | 모바일 `pointer: fine` 가드 | 10분 |
| future | research-analytics-v3 — 공출현 네트워크 + 제목 패턴 위젯 | 별도 PDCA |

---

## 상태

- `.bkit-memory.json` `research-analytics-v2`: phase = `completed`, matchRate = 96
- 다음 권장: `/pdca archive research-analytics-v2`

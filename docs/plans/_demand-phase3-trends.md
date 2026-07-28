# 수요조사 Phase 3 · H4 학기 간 트렌드 구현 기록

> 구현일: 2026-07-29
> 대상: `src/features/demand/DemandRetroSection.tsx` (단일 파일, 신규 유틸/컬렉션 없음)
> 제안서 근거: `docs/plans/_demand-survey-enhancement.md` 2.2.3 / Phase 3 H4
> 상태: 구현 완료 · tsc 0 · eslint 0 (커밋/배포는 메인 게이트)

---

## 1. 무엇을 만들었나 (H4. 학기 간 트렌드)

기존 `DemandRetroSection`은 **단일 학기**(선택된 지난 학기 보드 1개)의 수요·개설
숫자와 미개설 상위 5건만 보여줬다. 여기에 **여러 학기(최대 6)를 가로지르는 트렌드
섹션**을 추가했다. 기존 회고 뷰(학기 선택 탭 + 요약 카드 + 미개설 상위)는 **그대로 보존**,
트렌드 섹션을 상단에 추가하는 방식으로 회귀 없이 확장.

추가된 시각화 2종:

1. **학기별 수요·개설 추이** — 학기별 수요 총건수(`수요`)와 개설건수(`개설`)를
   그룹 바 차트로. 최근 N개 학기(존재하는 보드 수만큼, ≤6)를 시간순(오래된→최신)으로 표시.
2. **분야별 수요 비중 변화** — `demandPref.domain` 기준 학기별 분포를 **스택 바**로.
   미입력은 "미분류"로 집계. 데이터가 실제 존재하는 분야만 스택에 포함(레전드 간결화).

트렌드 섹션은 **지난 학기 보드가 2개 이상일 때만** 렌더(`boards.length >= 2`).
1개 이하면 학기 간 비교가 무의미하므로 기존 회고 뷰만 노출(무회귀).

트렌드 섹션 하단에 "학기별 상세 회고" 구분 헤더를 두어 기존 단일 학기 회고로 자연스럽게 연결.

## 2. 다학기 조회 방식

- **소스**: 기존 `boards` 쿼리(`demand-retro-boards`)가 이미 "실제 존재하는 지난 학기
  보드"만 `{ key, board }[]`로 확보한다. 이를 재사용.
- **신규 쿼리 `demand-retro-trend`**: 확보된 보드 각각에 대해
  `commQuestionsApi.listByBoard(board.id)`를 **`Promise.all` 병렬 조회**.
  보드 수가 최대 6개로 적어 N+1이 허용 범위(제안서 조건과 일치).
- **방어**: 개별 보드 조회 실패 시 `.catch(() => ({ data: [] }))`로 빈 배열 폴백,
  결과 접근은 전부 `?? []`. 빈 보드·조회 실패가 차트를 깨뜨리지 않음.
- **queryKey**: `["demand-retro-trend", boards의 board.id join]` — 보드 구성이 바뀌면 자동 갱신.
- 선택 학기 상세 조회(`demand-retro-questions`)와는 별도 쿼리(중복 fetch 1건 허용,
  관심사 분리로 기존 회고 로직 무손상).

## 3. 집계 (순수 useMemo)

- `countSeries`: `chronoSort(boards.map(key))` 후 학기별 `{ label, 수요, 개설 }`.
  개설 판정은 기존 `stageOf(q) === "opened"` 재사용.
- `activeDomains`: 전 학기 질문을 훑어 실제 등장한 분야 집합 → `DOMAIN_OPTIONS` 순서 +
  마지막에 "미분류". (`useDemandCampaign.ts`의 공유 `DOMAIN_OPTIONS` import — 라벨 단일 소스)
- `domainSeries`: 학기별로 `activeDomains` 각 분야 카운트. `DOMAIN_OPTIONS`에 없는/미입력
  domain은 "미분류" 버킷.
- **Date 순수성**: 학기 키는 상위 `pastKeys`(마운트 시 `useMemo`, `currentSemesterKey`/
  `listSemesterKeys` 1회 고정)에서 파생. 정렬은 사전식(`"YYYY-N"` 형식이라 곧 시간순)
  순수 함수 `chronoSort`. 렌더 중 `Date.now()` 직접 호출 없음.

## 4. 차트 방식 / 색상 (raw color 미도입)

- **라이브러리**: 프로젝트 기존 의존성 `recharts@^3.8.1` 재사용(신규 의존성 0).
  참고 관례: `src/app/admin/analytics/page.tsx`(recharts + 시맨틱 토큰), `OperationalKpiSection`.
- **색상**: 전부 시맨틱/CAT CSS 변수 토큰 —
  `var(--color-cat-1..6)`, `var(--color-border)`, `var(--color-muted-foreground)`.
  raw hex/Tailwind 팔레트 미사용 → rawcolor 래칫(CEILING=1) 무영향.
  "미분류" 스택만 중립색(`--color-muted-foreground`)으로 구분, 나머지는 CAT 순환.
- **반응형**: `ResponsiveContainer`(width 100%) + 바깥 `overflow-x-auto` 래퍼 +
  `minWidth={280}`으로 좁은 화면에서 가로 스크롤(본문 가로 스크롤 방지).
- **다크모드**: CAT/보더/muted 토큰이 라이트·다크 자동 대응(globals.css 정의).

## 5. 규율 준수

- 방어 가드: `?? []`, 보드 조회 실패 catch, `enabled: boards.length > 0`, 보드 <2 시 트렌드 미렌더.
- 접근성: 로딩 스피너 `role="img"` + `aria-label`, 아이콘 `aria-hidden`.
- 기존 회고(단일 학기 요약·미개설 상위·joinCounts)는 **코드·동작 무변경**.
- 건드리지 않은 파일: DemandSurveySection · StudyLaunchPanel · console/demand/page.tsx · comm-board.ts (병렬 executor 담당 H2/H3).

## 6. 검증 결과

```
cd C:\work\yonsei-edtech
npx tsc --noEmit        → tsc_exit=0   (전체 프로젝트 타입 에러 0)
npx eslint src/features/demand/DemandRetroSection.tsx → eslint_exit=0 (0 error / 0 warning)
```

- next build은 지침대로 미실행(메인 게이트에서 수행).
- 런타임 스모크는 배포 후 메인 QA 패스 권장(빌드 통과 ≠ 런타임 정상):
  `/console/demand` 학기 회고 탭에서 지난 학기 보드 ≥2일 때 두 차트 렌더 확인.

## 7. 변경 파일

- `src/features/demand/DemandRetroSection.tsx` — recharts import + CAT_COLORS/domainColor/chronoSort
  헬퍼, `demand-retro-trend` 쿼리, countSeries/activeDomains/domainSeries useMemo,
  트렌드 섹션 JSX(그룹 바 + 스택 바) 추가.

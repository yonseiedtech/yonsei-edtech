# 수요조사 콘솔 집계 Phase 2 (M2·M3·M7) 구현 기록

> 구현일: 2026-07-28
> 대상 파일: `src/app/console/demand/page.tsx` (단일 파일 변경, 유틸 재사용)
> 회원 화면 파일(`DemandSurveySection.tsx`)은 미변경 — 병렬 executor 담당

---

## 1. 배치 결정

기존 모드 탭(`수요조사 캠페인` / `현재 수요` / `지난 학기 회고`)에 **4번째 탭 `집계·인사이트`(`view="insights"`)** 를 신설했다.

- 이유: `현재 수요` 탭은 이미 요약·퍼널·세미나 상위·개설 후 전환·목록으로 밀도가 높다. 히트맵·시간대·캠페인 대시보드를 여기에 더 얹으면 과밀해진다. 시각화 전용 탭으로 분리해 스캔성을 확보했다.
- 목록 재사용 요건 충족: 히트맵 셀 클릭 시 `cellFilter` 상태를 세팅하고 `setView("current")` 로 이동 → `현재 수요` 탭의 기존 목록이 그대로 필터링된다(신규 목록 UI 미복제). 목록 상단에 `분야 × 난이도` 해제 칩을 노출.

카드 구성(insights 탭 위→아래): KPI 3카드 → 캠페인 주제별 수요(M2-1) → 분야×난이도 히트맵(M2-2) → 시간대 겹침(M3) → 캠페인 결과 대시보드(M7).

---

## 2. 데이터 집계 로직

공용 소스:
- `questions`: `commQuestionsApi.listByBoard(board.id)` (현재 학기 보드, 기존 쿼리 재사용).
- `joinCounts`: **신규 쿼리** `commLikesApi.countsByType("demand-join")` → `Record<questionId, 참여의사수>`. 단일 호출(N+1 없음), `DemandSurveySection`·`DemandRetroSection` 과 동일 패턴.
- `campaign`: `useDemandCampaign(useEffectiveSemesterKey())` → 현재 학기 캠페인.

정규화 헬퍼(모듈 스코프): `normDomain/normDifficulty/normTime` — `demandPref` 값이 옵션 집합(`DOMAIN_OPTIONS`/`DIFFICULTY_OPTIONS`/`TIME_OPTIONS`)에 없거나 미입력이면 `"미분류"`.

### M2-1 캠페인 주제별 (topicId)
- `campaign.topics` 각 topic + `미분류(__none__)` 행.
- topic 행 = `campaignTopicId === topic.id` 인 수요. 미분류 = `campaignTopicId` 부재 또는 현재 캠페인에 없는 id(자유 입력·이월).
- 행별 `count`(건수) / `likes`(likeCount 합) / `joins`(joinCounts 합). 캠페인 topics 가 없으면 카드 숨김(`topicRows.length > 1` 가드).

### M2-2 분야 × 난이도 매트릭스
- 행 = `DOMAIN_OPTIONS + 미분류`, 열 = `DIFFICULTY_OPTIONS(입문/중급/심화/무관) + 미분류`.
- 각 수요를 `normDomain × normDifficulty` 셀에 +1.
- **값 있는 행/열만** 노출(`activeDomains`/`activeDiffs`)로 과밀 방지.
- 셀 색 강도 = `heatClass(count, matrixMax)` — `bg-primary/10~/40`(시맨틱 토큰 + opacity, raw color 미도입). 0 셀은 `bg-muted/20`·비활성.
- 셀 클릭 → `setCellFilter({domain,difficulty})` + `setFilterTab("all")` + `setView("current")`.

### M3 시간대 겹침
- `TIME_OPTIONS(오전/오후/저녁/무관) + 미분류` 중 **수요 있는 슬롯만**.
- 슬롯별 `count`(수요 건수) / `joins`(참여 의사 합).
- `joins >= JOIN_THRESHOLD(3)` → `성사 가능` 배지 + "이 시간대로 개설하면 N명 참여 가능" 인사이트. 정족수 상수는 `DemandSurveySection` 의 `JOIN_THRESHOLD=3` 과 동일 값을 재선언(미export 상수, 회원 파일 미변경 위해).
- 참여 인원은 슬롯 내 질문들의 joinCounts 합(연인원 근사) — 한 회원이 복수 수요에 참여 시 중복 가능. 콘솔 인사이트 수준에서 허용, 기존 `joinTotal` 집계와 동일 관례.

### M7 캠페인 결과 대시보드
- `campaign` 없으면 안내 문구(점선 카드)만, 대시보드 숨김(현행 정책 유지).
- 헤더: 제목 · 상태 배지(진행중/마감/초안) · 기간(startDate~endDate).
- KPI: 등록 수(응답=총 수요) · 주제 집중도(`campaignTopicId` 보유 비율 %) · 개설 전환(opened/전체).
- 일별 등록 추이: `campaign.startDate~endDate` 각 날짜별 `createdAt` 카운트 미니 바. `daysBetweenYmd` 로 기간 산출(0~90일 가드), 날짜 생성은 `startDate` ms 기준 useMemo 내 순수 계산(Date.now 미사용).
- insights 탭 상단 KPI 3카드(총 수요/정족수 도달/개설 전환)는 캠페인 유무와 무관하게 항상 노출.

전체 집계는 단일 `insights = useMemo(..., [questions, joinCounts, campaign])` 로 계산(렌더 순수성 유지).

---

## 3. 규율 준수
- 방어 가드: `questions ?? []`, `joinCounts[id] ?? 0`, `campaign?.topics ?? []`, optional chaining 전반.
- Date 순수성: 일별 추이·날짜 계산은 모두 `useMemo` 내 데이터(캠페인 날짜)에서 파생. `new Date()`(Date.now)는 렌더 경로에 없음(CSV export 핸들러의 기존 `new Date()` 만 유지).
- raw color 미도입: 히트맵/바 강도는 `bg-primary/10~/40`, `bg-success/*`, `bg-muted/*` 시맨틱 토큰 + opacity. `heatClass` 는 리터럴 클래스만 반환(Tailwind JIT 인식).
- 회귀 없음: CSV·요약·퍼널·세미나 상위·개설 후 전환·목록 로직 미변경. `filtered` 에 `cellFilter` 조건만 추가(기존 presenter 필터·정렬 보존).

## 4. 검증 결과
- `npx tsc --noEmit` (PowerShell): **0 errors**.
- `npx eslint src/app/console/demand/page.tsx`: **0 errors / 0 warnings**.
- next build: 미실행(지시대로 금지).

## 5. 변경 요약 (파일:영역)
- `page.tsx` imports: lucide 아이콘 6종 + `useDemandCampaign`/옵션 상수/`daysBetweenYmd`/`useEffectiveSemesterKey` 추가.
- `page.tsx` 모듈 스코프: `JOIN_THRESHOLD`, `UNCLASSIFIED`, `normDomain/normDifficulty/normTime`, `heatClass` 추가.
- `page.tsx` 컴포넌트: `view` 유니온에 `insights` 추가, `cellFilter` 상태, `joinCounts` 쿼리, `insights` 집계 memo, `filtered` 에 cellFilter 반영.
- `page.tsx` 렌더: 모드 탭 `집계·인사이트` 추가, insights 탭 렌더 블록(KPI·M2·M3·M7), current 탭 목록 상단 cellFilter 칩.

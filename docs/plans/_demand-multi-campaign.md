# 수요조사 복수 캠페인 지원 — 배열 모델 구현 기록

> 구현일: 2026-07-29
> 근거: `_demand-campaign-strategy.md`(5.3 복수 캠페인·ADR-2 저장구조), `_demand-phase4-campaign.md`(후속 범위)
> 범위: 같은 학기 내 복수 캠페인(라운드) 운영. 하위호환 최우선(레거시 단일 캠페인 무손실).
> 제외: 캠페인 결과 스냅샷 저장(전략 4.4), L6 전환 시 운영진 알림(병렬 L3).

---

## 결정: 단일 키 배열 모델 (ADR-2 키 확장 `{round}` 대신)

`site_settings` 키 `demand_campaign:{semester}` **값을 `DemandCampaign[]` 배열**로 저장한다.
키를 `{semester}:{round}` 로 확장하는 방식(전략 5.3 장기안) 대신 단일 키 배열을 택한 이유:

- 레코드 1건 조회로 학기 전체 캠페인을 로드 → 소비처(회고 이월·대시보드)가 배열을 그대로 재사용.
- 학기당 JSON 크기 2~5KB × 소수 라운드 = 여전히 선형·소용량(전략 5.7).
- 마이그레이션 무비용: 레거시 단일 객체를 `[1건]` 로 래핑만 하면 됨(신규 rules·컬렉션 없음).

---

## 변경 파일

| 파일 | 역할 |
|------|------|
| `src/features/demand/useDemandCampaign.ts` | 배열 모델 핵심 — 타입·파싱·활성판정·훅·mutation·헬퍼 |
| `src/features/demand/DemandCampaignEditor.tsx` | 콘솔 편집 — 라운드 목록/추가/삭제 + 선택 캠페인 편집(L5·L6 대상=선택) |
| `src/features/demand/DemandSurveySection.tsx` | 회원 — `resolveActiveCampaign` 로 활성 1건 선택 후 배너·칩·마감 적용 |
| `src/app/console/demand/page.tsx` | 콘솔 대시보드 — 라운드 선택 드롭다운(2개+), 선택/활성 캠페인 기준 M7·L3 |
| `src/features/demand/DemandRetroSection.tsx` | L2 이월 — 배열 upsert 로 저장(다른 라운드 보존) |

신규 컬렉션·필드·rules 변경 없음. `comm-board.ts` 무변경(`demandPref.campaignTopicId` 그대로 재사용).

---

## 데이터 모델 (useDemandCampaign.ts)

### 타입 확장
`DemandCampaign` 에 `id: string`(배열 upsert/편집/삭제 키) + `round?: number`(1,2…) 추가.
기존 필드(semester·title·description·topics·startDate·endDate·status·updatedBy·updatedAt) 유지.

### 하위호환 파싱 (`loadCampaigns`)
`siteSettingsApi.getByKey` 값 `JSON.parse` 결과에 따라:
- **배열** → 각 항목 `normalizeCampaign` 정규화 → `DemandCampaign[]`.
- **객체(레거시 단일)** → `[normalizeCampaign(obj, semester, 0)]` 로 1건 래핑.
- **파싱 실패/부재** → `[]` (기존과 동일한 안전 폴백, `console.warn`).

`normalizeCampaign(raw, semester, index)`:
- `id` = `raw.id` 있으면 유지, 없으면 `legacy-{semester}-{index+1}` (**안정 부여** — 매 로드 동일 id 로 churn 방지).
- `round` = `raw.round` 있으면 유지, 없으면 `index+1`.
- 나머지 필드는 기존 방어 기본값(topics 배열 가드, status 기본 draft 등) 그대로.

### 활성 판정 `resolveActiveCampaign(campaigns, todayYmd)` (순수)
- `status==="active"` **이고** 종료일 미경과(진행/예정)인 캠페인만 후보(`daysBetweenYmd(today, end) < 0` 제외).
- 후보 중 **round 큰 순 → startDate 최신 → updatedAt 최신** 1건. 없으면 `null`.
- `resolveCampaignPhase` 는 **단일 캠페인 대상 그대로 유지**. 소비처가 활성 1건을 먼저 고른 뒤 phase 판정.

### 보조 헬퍼
- `pickActiveOrLatest(campaigns, today)` — 활성 우선, 없으면 최신(round·기간) 1건. 콘솔 대시보드·회고 이월의 기본 표시용.
- `upsertCampaign(campaigns, c)` — id 일치 시 교체, 없으면 추가(불변).
- `makeCampaignId()` — 라운드 고유 id(crypto/Date 폴백, 이벤트/mutation 전용).

### 훅
- `useDemandCampaigns(semesterKey)` → `{ campaigns, recordId, today, isLoading }`. `today` 는 `useMemo` 로 마운트 1회 고정(렌더 순수성).
- `useUpdateDemandCampaigns()` — `{ recordId, campaigns, semesterKey }` 로 배열 전체 저장(recordId 있으면 update, 없으면 create).
- **기존 단수 `useDemandCampaign`/`useUpdateDemandCampaign` 제거** — 모든 호출부(4곳)를 배열 훅으로 전환. 단수 mutation 은 배열을 단일 객체로 덮어써 데이터를 잃는 footgun 이라 존치하지 않음(데이터 하위호환은 파싱이 담당).

---

## 콘솔 편집 UI (DemandCampaignEditor.tsx)

- **라운드 목록**: `campaigns` round 오름차순 칩("N차" + 상태 배지) + 미저장 신규는 "미저장" 표기. 칩 클릭 = 편집 대상 전환.
- **라운드 추가**: `handleAddRound` — `makeCampaignId()` + `max(round)+1` 로 빈 `pendingNew` 생성·선택. 저장 전까지 배열 미반영(폼 편집 → 저장 시 append).
- **라운드 삭제**: `handleRemoveRound` — 미저장 신규는 폐기, 저장분은 `confirm` 후 배열에서 제거·저장.
- **선택 캠페인 편집**: 기존 폼(제목·설명·기간·주제·상태) 유지. 저장 시 선택 캠페인의 `id`·`round` 승계(신규는 새 id·round=1) → `upsertCampaign` → 배열 전체 저장.
- **폼 동기화**: `selected` identity(`semester::recordId::id::updatedAt`) 변화 시 서버 값으로 재설정(render-safe "이전 값 저장" 패턴). `selected` = pendingNew(선택 시) ?? 배열 find ?? 활성/최신.
- **L5(지난 학기 불러오기)**: 소스를 `pickActiveOrLatest(prevCampaigns)` 로 산정. 주제 `makeCampaignTopic` 재발급·기간 초기화·draft 리셋 — **선택된 폼** 대상(기존 동작 유지).
- **L6(정족수 일괄 전환)**: `scanQuorumTargets`·`bulkConvertMutation`·`runBulkConvert` 로직 무변경. 마감 저장 시 자동 실행 판정은 **선택 캠페인의 직전 status**(`prevStatus`) 기준.

---

## 소비처 반영

### 회원 (DemandSurveySection.tsx)
- `useDemandCampaigns` → `resolveActiveCampaign(campaigns, today)` 로 **활성 1건** 선택(변수명 `campaign` 유지 → JSX 무변경).
- `resolveCampaignPhase(activeCampaign, today)` 로 배너·D-day·주제칩·기간마감 적용.
- **활성 캠페인 없으면**(closed/ended/none) `resolveCampaignPhase(null)` → `isOpen=true, isVisible=false` → **현행 자유 등록**(무회귀, ADR-3 종료 후 자유 등록 재개와 일치).

### 콘솔 대시보드 (console/demand/page.tsx)
- `useDemandCampaigns` + `selectedCampaignId` state. `campaign` = 선택분 우선, 미선택 시 `pickActiveOrLatest`.
- **라운드 선택 드롭다운**(`campaigns.length >= 2` 일 때만) — 캠페인 탭 + M7 대시보드 헤더에 노출.
- M7(주제별 수요·집중도·일별 추이)·L3(캠페인 시작 알림)·`state.daysLeft` 모두 선택/활성 캠페인 기준. L1 미처리(`staleDemands`)는 `today` 만 사용해 무영향.

### 회고 이월 (DemandRetroSection.tsx)
- `useDemandCampaigns` → `pickActiveOrLatest` 로 현재 캠페인 판정. 미개설 상위 주제 추가 시 `upsertCampaign(campaigns, next)` 로 **다른 라운드 보존**하며 저장. 캠페인 부재 시 `makeCampaignId()` 로 draft 스켈레톤 생성.

---

## 하위호환 검증 (설계 기준)

| 시나리오 | 동작 |
|----------|------|
| 레거시 단일 객체 저장분 로드 | `[{id:"legacy-{sem}-1", round:1, ...}]` 로 래핑 → 노출·편집 정상 |
| 레거시 편집 후 저장 | 배열 JSON 으로 전환(마이그레이션). id/round 안정 유지 |
| 레거시 status=active | `resolveActiveCampaign` 이 그대로 활성 반환 → 배너 무회귀 |
| 캠페인 부재(`[]`) | 활성 null → 자유 등록. 대시보드 "캠페인 미설정" 안내 유지 |
| campaignTopicId 참조 | topic.id 는 `makeCampaignTopic` 유일 발급 → 라운드 간 충돌 없음. 기존 참조 유지 |

---

## 규율 준수

- **방어 가드**: 파싱(배열/객체/실패 분기)·null·배열 가드. 버튼 `disabled`(saveMutation.isPending·scanning) 중복 실행 방지.
- **Date 순수성**: `today` 는 훅 `useMemo` 1회 고정 후 `resolveActiveCampaign`/`pickActiveOrLatest` 에 주입. 렌더 경로 `Date.now`/`crypto` 없음(`makeCampaignId`·`new Date().toISOString()` 은 이벤트/mutation 내부만).
- **raw color 미도입**: 시맨틱 토큰(primary·muted·border·accent·destructive)만 사용.
- **무회귀**: 등록·집계·퍼널·L5/L6·회고 로직은 활성/선택 캠페인 기준으로 재배선만. `notify.ts`·`NotificationType` 무변경.

## 검증 결과

- `cd C:\work\yonsei-edtech; npx tsc --noEmit` → **0 errors** (exit 0)
- `npx eslint useDemandCampaign.ts DemandCampaignEditor.tsx DemandSurveySection.tsx DemandRetroSection.tsx console/demand/page.tsx` → **exit 0 (0 errors / 0 warnings)**
- next build 미실행(지침). PowerShell 실행.

## 후속(범위 밖)

- 캠페인 결과 스냅샷 저장(전략 4.4) — closed 전환 시 집계 동결.
- L6 일괄 전환 시 운영진 알림(병렬 L3, notify.ts).
- 캠페인 간 비교 지표(전략 4.2) — 라운드별 응답률·집중도 비교 뷰.

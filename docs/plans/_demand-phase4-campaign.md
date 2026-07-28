# 수요조사 Phase 4 캠페인 운영 자동화 — L2 / L5 / L6 구현 기록

> 구현일: 2026-07-29
> 근거: `_demand-campaign-strategy.md`(L2·L5·L6, ADR-2), `_demand-survey-enhancement.md`(2.6.3·2.6.4)
> 범위: 캠페인 템플릿 복제 · 학기 전환 수요 이월 · 캠페인 종료 시 정족수 일괄 전환
> 제외: 복수 캠페인(`{round}`), 운영진 알림(notify, 병렬 L3 담당), `console/demand/page.tsx`·`notify.ts` (병렬 L1/L3 담당)

---

## 변경 파일

| 파일 | 역할 |
|------|------|
| `src/features/demand/useDemandCampaign.ts` | 공용 헬퍼 `makeCampaignTopic()` 추가 (L5·L2 공용) |
| `src/features/demand/DemandCampaignEditor.tsx` | L5(지난 학기 캠페인 불러오기) + L6(정족수 일괄 전환) |
| `src/features/demand/DemandRetroSection.tsx` | L2(미개설 상위 수요 → 다음 캠페인 주제 이월) |

신규 컬렉션·필드·rules 변경 없음. 기존 인프라(site_settings 캠페인 JSON, comm_questions/comm_likes) 재사용.

---

## L5. 캠페인 템플릿 복제

- **위치**: `DemandCampaignEditor` 헤더 우측 "지난 학기 캠페인 불러오기" 버튼.
- **소스**: `shiftSemesterKey(effectiveKey, -1)` 로 직전 학기 키 산정 → `useDemandCampaign(prevKey)` 로 로드.
  - `prevKey` 는 `useMemo` 로 고정(shiftSemesterKey 순수 함수). `prevKey ?? ""` 로 훅 `enabled` 게이트(빈 키면 미조회).
- **동작(`handleLoadPrev`)**:
  - 지난 학기 캠페인 없으면 `toast.error` 후 중단. 버튼은 `disabled={prevLoading || !prevCampaign}`.
  - 현재 편집 내용(title/description/topics)이 있으면 `window.confirm` 으로 덮어쓰기 확인.
  - 주제는 `makeCampaignTopic(label, domain)` 으로 **새 id 를 발급해 복제**(교차 학기 topicId 혼동 방지).
  - 제목·설명 프리필. **기간(start/end)은 비우고**, 상태는 `draft` 로 초기화(운영진 재설정 유도). toast 로 복제 건수·기간 재설정 안내.

---

## L2. 학기 전환 수요 이월 — 방식 (a) 채택

전략 문서 제시 2안 중 **(a) DemandRetroSection 미개설 상위 카드 → "다음 캠페인 주제로 추가" 버튼**을 채택.
(a)는 운영진이 회고 화면에서 검증된 미개설 수요를 건별로 선별해 이월하므로, 일괄 포함(b)보다 주제 편향·노이즈가 적다.

- **대상**: `stats.unopened` (개설되지 못한 상위 5건, 관심순).
- **이월처**: `useEffectiveSemesterKey()` 의 현재 학기 `demand_campaign` topics.
  - 현재 캠페인이 있으면 append, 없으면 최소 draft 스켈레톤(`{학기} 스터디 수요조사`) 생성 후 append.
- **중복 방지**: 현재 캠페인 topic 라벨을 `trim().toLowerCase()` 집합으로 정규화(`currentTopicLabels`). 동일 라벨이면 버튼 `추가됨` 비활성 + 클릭 시 `toast.info`.
- **domain 승계**: 수요의 `demandPref.domain` 이 `DOMAIN_OPTIONS` 에 속하면 topic.domain 으로 승계, 아니면 "".
- **저장**: `useUpdateDemandCampaign()` (recordId 있으면 update, 없으면 create). `updatedBy`/`updatedAt` 스탬프.
- **H4 트렌드 회귀 없음**: 기존 집계(countSeries·domainSeries·activeDomains) 로직 무변경, 미개설 카드에 액션 행만 추가.

---

## L6. 캠페인 종료 시 정족수 달성 수요 일괄 전환

- **트리거 2경로**:
  1. **자동**: `handleSave` 에서 `status==="closed"` 이고 직전 저장 상태(`campaign?.status`)가 closed 가 아니면 → 저장 성공(`onSuccess`) 직후 `runBulkConvert(true)` 실행.
  2. **수동**: 편집기 하단 "정족수 달성 수요 검토전환" 버튼(`runBulkConvert(false)`).
- **대상 산정(`scanQuorumTargets`)**:
  - 보드 = `commBoardsApi.listByContext("demand", \`demand-${semesterKey}\`)` (effective 학기 스코프).
  - `commQuestionsApi.listByBoard(board.id)` + `commLikesApi.countsByType("demand-join")` 병렬 조회.
  - 필터: `status(부재→"collecting")==="collecting"` **AND** `joinCount ≥ JOIN_THRESHOLD(3)`.
- **확인 다이얼로그**: 마감 경로 → "마감하면 회원 등록이 중단됩니다. 정족수 달성 N건을 개설 검토 대기로 전환합니다"; 수동 경로 → N건 전환 확인. 대상 0건이면 수동 경로만 `toast.info`.
- **전환(`bulkConvertMutation`)**: 대상별 `commQuestionsApi.update(id, { demandPref: { ...pref, status: "reviewing", statusHistory: appendStatusHistory(pref, "reviewing", user?.id) } })`.
  - Phase 3 `appendStatusHistory` 재사용(중복 status 연속 미기록). 전환 건수 toast.
  - `["demand-questions"]`·`["demand-joins"]` 쿼리 무효화(회원 화면 DemandSurveySection 반영).
- **알림 금지 준수**: notify 호출·수정 없음(병렬 L3 담당). 일괄 update 자체만 수행.

---

## 규율 준수

- **방어 가드**: 보드/캠페인 부재, 빈 body, 파싱 등 널 가드. 버튼 disabled 로 중복 실행 방지(`scanning`·`isPending`).
- **Date 순수성**: `shiftSemesterKey`/라벨은 `useMemo`. `new Date().toISOString()`·`makeCampaignTopic` 의 crypto/Date 폴백은 이벤트 핸들러·mutation 내부에서만 호출(렌더 중 없음).
- **raw color 미도입**: 시맨틱 토큰(primary·success·muted·border·accent)만 사용.
- **무회귀**: 기존 캠페인 편집(폼 identity 동기화)·회고 집계·H4 트렌드 로직 불변, 액션만 추가.

## 검증 결과

- `npx tsc --noEmit` → **0 errors** (exit 0)
- `npx eslint useDemandCampaign.ts DemandCampaignEditor.tsx DemandRetroSection.tsx` → **0 errors / 0 warnings** (exit 0)
- next build 미실행(지침).

## 후속(범위 밖)

- 복수 캠페인(`demand_campaign:{semester}:{round}`) 지원(전략 5.3).
- L6 전환 시 운영진 알림(병렬 L3, notify.ts).
- 캠페인 결과 스냅샷 저장(전략 4.4).

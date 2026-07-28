# 수요조사 캠페인 + 제안서 Phase 1 핵심 구현 기록

> 구현일: 2026-07-28
> 범위: 관리자 수요조사 캠페인 설정 + 제안서 Phase 1 핵심(구조화 필드·유사 수요 안내·수요 편집)
> 상태: 구현 완료 (tsc 0 / eslint 0). 커밋/배포는 메인 게이트 대기.
> 기준 제안서: `docs/plans/_demand-survey-enhancement.md`

---

## 1. 변경 파일

| 파일 | 성격 | 내용 |
|------|------|------|
| `src/types/comm-board.ts` | 수정 | `CommQuestion.demandPref` 에 구조화 옵셔널 필드 추가 (domain·difficulty·preferredTime·campaignTopicId) |
| `src/features/demand/useDemandCampaign.ts` | 신규 | 캠페인 데이터모델·훅·단계 판정 순수함수·선호 옵션 상수 |
| `src/features/demand/DemandCampaignEditor.tsx` | 신규 | 콘솔 캠페인 편집 카드 (staff+, 콘솔 레이아웃 게이트) |
| `src/features/demand/DemandSurveySection.tsx` | 수정 | 회원 반영(배너·D-day·주제 칩·상세 선호 아코디언·유사 수요·수요 편집·기간 마감) |
| `src/app/console/demand/page.tsx` | 수정 | 콘솔 상단 모드 탭에 "수요조사 캠페인" 추가 |

신규 컬렉션 없음. comm_questions 스키마 마이그레이션 없음(demandPref 는 자유형 JSON — 신규 필드 부재=무관).

---

## 2. 데이터 모델

### 2.1 캠페인 — site_settings 학기 스코프 (useOrgChart 패턴 재사용)

`useOrgChart`(org_chart:{semester}) / `useCurrentSemester` 와 동일하게 **site_settings 단일 키에 JSON 저장**을 채택했다. 신규 컬렉션 도입보다 기존 학기 스코프 설정 패턴과 일관.

- **키**: `demand_campaign:{YYYY-1|2}` (`demandCampaignKey(semesterKey)`)
- **값**(JSON 직렬화):

```ts
interface DemandCampaign {
  semester: string;                 // "YYYY-1" | "YYYY-2"
  title: string;
  description?: string;
  topics: { id: string; label: string; domain?: string }[];  // 사전 정의 스터디 주제
  startDate: string;                // YYYY-MM-DD
  endDate: string;                  // YYYY-MM-DD
  status: "draft" | "active" | "closed";
  updatedBy?: string;
  updatedAt?: string;
}
```

- 로드 시 **방어 파싱**(JSON.parse try/catch → 실패 시 캠페인 없음 폴백, useOrgChart 방어 파싱과 동일 사상).
- 저장은 `useUpdateDemandCampaign` — recordId 있으면 update, 없으면 create. 저장 후 `["site_settings","demand_campaign"]` 프리픽스 무효화.
- 학기 스코프: 콘솔·회원 모두 `useEffectiveSemesterKey()` 로 현재 학기 캠페인을 로드 → override 미설정 시 `currentSemesterKey()` 와 동일하여 무회귀.

### 2.2 구조화 선호 필드 (제안서 2.1.1)

`demandPref` 에 옵셔널 추가(모두 선택):

```ts
demandPref?: {
  // 기존: format, note, status, leaderId, ..., statusNote
  domain?: string;          // 교육공학 하위 분야
  difficulty?: string;      // 난이도
  preferredTime?: string;   // 선호 시간대
  campaignTopicId?: string; // 등록 시 선택한 캠페인 사전 주제 id
}
```

옵션 상수(`useDemandCampaign.ts` 에서 export, 등록·편집·캠페인 주제 공용):
- `DOMAIN_OPTIONS`: 교수설계 · 학습분석 · 에듀테크 · HRD/평생교육 · 교육평가 · 연구방법론 · 기타
- `DIFFICULTY_OPTIONS`: 입문 · 중급 · 심화 · 무관
- `TIME_OPTIONS`: 오전 · 오후 · 저녁 · 무관

---

## 3. 기간 마감 로직 (순수 함수)

렌더 순수성을 위해 오늘(YYYY-MM-DD)은 훅에서 `useMemo` 로 1회 고정(`todayYmdKst`, KST 앵커 — currentSemesterKey 와 동일 기준)하고, 단계 판정은 순수 함수 `resolveCampaignPhase(campaign, todayYmd)` 로 계산한다.

```
resolveCampaignPhase 반환: { phase, daysLeft, isOpen, isVisible }
```

| 캠페인 상태 | phase | isOpen(등록) | isVisible(배너) |
|-------------|-------|--------------|-----------------|
| 없음 | none | true (현행 자유 등록) | false |
| draft | none | true (현행 자유 등록) | false (회원 비노출) |
| active · today < startDate | upcoming | true | true |
| active · start ≤ today ≤ endDate | active | true | true (D-day 노출) |
| active · today > endDate | ended | **false (마감)** | true |
| closed | ended | **false (마감)** | true |

- `daysLeft = daysBetweenYmd(today, endDate)` — active/upcoming 이고 종료일 유효 시. D-day 표기: >0 → "마감까지 D-N", 0 → "오늘 마감".
- **캠페인 없음/초안 시 현행(자유 등록) 그대로** — 무회귀 보장.

---

## 4. 콘솔 UI (`/console/demand`)

- 상단 모드 탭에 **"수요조사 캠페인"** 신설(기존 "현재 수요" / "지난 학기 회고" 앞). staff+ 는 콘솔 레이아웃 AuthGuard 로 이미 게이트.
- `DemandCampaignEditor` 카드:
  - 제목(필수·80자) · 설명(300자) · 시작/종료일(date input) · 상태 칩(초안/진행/마감, 상태별 안내 문구)
  - **사전 스터디 주제**: 라벨(60자) + 분야 select 행을 추가/삭제. 저장 시 빈 라벨 제거·trim.
  - 저장 검증: 제목 필수, 종료일 ≥ 시작일.
  - 폼 동기화는 `useEffect` 대신 **렌더 중 안전 리셋(React "이전 값 저장" 패턴)** — identity(semester::recordId::updatedAt) 변경 시 서버 값으로 재설정. `react-hooks/set-state-in-effect` 경고 회피.

---

## 5. 회원 화면 반영 (`DemandSurveySection`)

- **배너**: 활성 캠페인(isVisible) 시 상단에 제목·설명·**남은 기간 D-day** 배지·진행 기간 노출. 마감 시 "마감됨" 배지 + muted 스타일.
- **주제 칩**: 캠페인 topics 를 등록 폼 상단 "추천 주제" 칩으로 제시 → 클릭 시 body 프리필 + topic.domain 자동 채움 + campaignTopicId 기록. 자유 입력도 유지(입력 시 campaignTopicId 해제).
- **상세 선호 아코디언**(2.1.1): 기본 접힘 "상세 선호"(분야·난이도·시간대 3-select). 등록·편집 폼 공용 `PrefSelects` 컴포넌트(2회 사용).
- **유사 수요 안내**(2.1.2): body 입력 중(≥2자) 기존 같은 유형 항목과 부분 문자열 양방향 매칭 → 상위 3건 "관심으로 합류" CTA(클라이언트, 신규 API 없음. 기존 interestMutation 재사용).
- **수요 편집**(2.5.2): 등록자 본인·status=collecting 항목에 연필 버튼 → 인라인 편집 폼(body·형태·메모·구조화필드). status 등 기타 demandPref 는 spread 로 보존. 검토 진입(비-collecting) 항목은 편집 버튼 미노출.
- **기간 마감**: `!isOpen` 이면 등록 폼 대신 "수요조사가 마감되었습니다" 안내(잠금 아이콘). **관심·참여 반응은 계속 허용**.
- 구조화 필드는 항목 카드에 배지로 표시(domain·difficulty≠무관·preferredTime≠무관).

---

## 6. 규율 준수

- **방어 가드**: 캠페인 JSON 방어 파싱, 옵셔널 체이닝, topics 배열 가드.
- **raw color 미도입**: 시맨틱 토큰만(primary·muted·foreground·destructive·success·border·accent·input·background).
- **Date 순수성**: 오늘 값 `useMemo` 1회 고정 후 순수 함수에 주입. 렌더 중 `new Date()`/`Date.now()` 직접 호출 없음. 편집기 폼 리셋도 useEffect setState 대신 렌더 중 리셋 패턴.
- **마이그레이션 불필요**: demandPref 자유형 JSON — 신규 필드 부재=무관. 기존 등록·집계·개설 파이프라인 회귀 없음.
- **update 안전성**: `dataApi.update` 가 undefined 를 deep strip → 편집 시 값 비우면 해당 필드 map 에서 제거(의도된 동작).

---

## 7. 검증 결과

| 검증 | 명령 | 결과 |
|------|------|------|
| 타입 | `npx tsc --noEmit` | **0 (EXIT 0)** |
| 린트 | `npx eslint <변경 5파일>` | **0 problems (0 error, 0 warning)** |

- next build 미실행(.next lock 회피 — 규율 준수).
- 런타임 스모크(배너·마감·편집·유사 매칭)는 배포 후 QA 패스에서 확인 권장.

---

## 8. 후속(범위 밖 — 이 작업 미포함)

- 콘솔 domain×difficulty 히트맵·시간대 겹침 분석(Phase 2 M2·M3) — 구조화 필드 데이터가 쌓인 뒤.
- CSV 내보내기에 구조화 필드 열 추가(경미).
- 정족수 자동 전환·알림 확장·클러스터링·statusHistory 리드타임(Phase 1 Q2/Q4·Phase 3).
- 캠페인 종료 시 미개설 상위 수요 다음 학기 이월(Phase 4 L2).

# 수요조사 Phase 4 — L1(미처리 수요 리마인더) · L3(캠페인 알림) 구현 기록

> 작업일: 2026-07-29
> 담당: executor (병렬 트랙 — L2/L5/L6 은 별도 executor)
> 건드리지 않은 파일(병렬 담당): `DemandCampaignEditor.tsx` · `useDemandCampaign.ts`(읽기만) · `DemandRetroSection.tsx`

---

## L1. 미처리 수요 리마인더 (콘솔)

**위치**: `src/app/console/demand/page.tsx` — "현재 수요" 탭 최상단 카드("미처리 수요").

**정의**: `demandPref.status === "collecting"` 이면서 `createdAt` 이 **STALE_DAYS(14일)** 이상 경과한 수요.

**동작**:
- 건수 배지(warning 토큰) + 경과일 내림차순 목록(주제 · 참여수(demand-join) · "N일 경과" 뱃지).
- 0건이면 긍정 상태(success 토큰) "14일 이상 방치된 수집중 수요가 없습니다."
- 목록 항목 클릭 시: `filterTab='all'` + `cellFilter=null` 리셋 후 하단 목록의 해당 행(`id="demand-row-{q.id}"`)으로 `scrollIntoView`(smooth·center). 별도 스크롤 앵커를 각 `<tr>` 에 부여.

**Date 순수성**: 경과일은 `staleDemands` useMemo 내부에서 파생. `today` 는 `useDemandCampaign` 훅이 `useMemo` 로 마운트 시 1회 고정한 KST 값을 재사용 → 렌더 경로에 `Date.now()`/`new Date()` 없음. 경과일 계산은 기존 `daysBetweenYmd(created, today)` 재사용.

**신규 상수**: `STALE_DAYS = 14` (모듈 스코프, JOIN_THRESHOLD 옆).

---

## L3. 캠페인 알림

### 판단: 콘솔 수동 트리거(fan-out) 채택

- **범위**: 캠페인 오픈 알림은 공지·세미나 등록·일정 투표 개시(`notifyGatheringPollStarted`)와 동일한 **전체 공지성 이벤트**다. 따라서 기존 `fanOut`(승인 회원 전체, ≤500) 패턴을 재사용한다.
- **과알림/오발송 방지**: 자동 발송이 아니라 **콘솔(console/demand)의 운영진 수동 트리거**로만 호출. 오발송을 막기 위해 버튼 → 확인 단계(inline confirm, notifications page `showDeleteConfirm` 패턴과 동일 스타일) → 발송의 2단계.
- **대안 검토**: "최근 활동 회원/이번 학기 등록자만" 축소 fan-out 도 가능하나, (a) 캠페인 오픈은 아직 등록하지 않은 회원에게 알리는 것이 목적이라 등록자 한정은 취지에 반하고, (b) 수동 트리거라 운영진이 발송 시점을 통제하므로 전체 공지가 적절. 기존 공지성 알림과의 일관성도 확보.

### 마감 임박 / 결과 알림 — 이번 범위 제외

- 시간 기반(cron)이 필요하므로 이번 구현에서 **제외**. 콘솔 D-day 표시(기존 M7 캠페인 결과 대시보드의 `startDate ~ endDate` · `daysLeft`)로 대체.
- notify 함수 골격도 두지 않음(YAGNI). cron 도입 시 `notifyDemandCampaignOpen` 패턴을 복제하면 됨.

### 구현 상세

**`src/features/notifications/notify.ts`**:
```ts
export function notifyDemandCampaignOpen(campaignTitle: string, daysLeft: number | null)
```
- `fanOut("demand_campaign_open", "수요조사가 시작되었습니다", "…(마감 D-N). 원하는 스터디·세미나 주제를 등록해 주세요.", "/activities/studies")`
- `daysLeft >= 0` 일 때만 "(마감 D-N)" 접미. 링크는 회원 수요 등록 화면(`/activities/studies` — DemandSurveySection 렌더 위치).

**`src/app/console/demand/page.tsx`** — 로컬 컴포넌트 `CampaignOpenNotifier`:
- "수요조사 캠페인" 탭에서 `campaign` 존재 시 편집기 위에 렌더(편집기는 미수정 — 병렬 담당).
- `campaign.status === "active"` 일 때만 발송 버튼 활성. `state.daysLeft` 를 D-day 로 전달.
- 발송 후 toast(sonner) + "발송 완료 (HH:MM)" 표시.

### NotificationType 확장 (3곳 Record 완결)

`operations.ts` 에 `"demand_campaign_open"` 추가 후 3곳 완결:
1. `src/types/operations.ts` — 유니온 멤버 추가.
2. `src/app/mypage/notifications/page.tsx` — `TYPE_ICONS`(📣) · `TYPE_LABELS`("수요조사 캠페인").
3. `src/features/notifications/NotificationBell.tsx` — `TYPE_ICONS`(📣).

### 편집기 연동(후속)

- 현재는 콘솔 수동 트리거만. `DemandCampaignEditor` 의 상태 전환(draft→active 저장) 시점에 자동으로 `notifyDemandCampaignOpen` 을 호출하는 연결은 **편집기 담당 executor 의 후속 과제**. notify 함수는 export 되어 있어 호출부만 추가하면 됨.

---

## 검증

- `npx tsc --noEmit` — **0 errors** (PowerShell).
- `npx eslint`(변경 5파일: console/demand/page.tsx, notify.ts, NotificationBell.tsx, mypage/notifications/page.tsx, operations.ts) — **0 errors**.
- raw color 미도입(warning/success/primary/muted 시맨틱 토큰만). Date 순수성 유지. fan-out 은 수동 트리거+확인 단계로 과발송 차단.

## 변경 파일

- `src/types/operations.ts` — NotificationType 에 `demand_campaign_open`.
- `src/app/mypage/notifications/page.tsx` — TYPE_ICONS/TYPE_LABELS 완결.
- `src/features/notifications/NotificationBell.tsx` — TYPE_ICONS 완결.
- `src/features/notifications/notify.ts` — `notifyDemandCampaignOpen` 추가.
- `src/app/console/demand/page.tsx` — L1 미처리 수요 섹션 + `staleDemands` useMemo + `STALE_DAYS` + `CampaignOpenNotifier` + 테이블 행 스크롤 앵커.

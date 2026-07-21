# H4 시즌 준비 체크리스트 공유 저장 — v13 구현 보고서

> 작성일: 2026-07-21  
> 대상 파일: `src/app/console/page.tsx` (`UpcomingSeasonCard` 컴포넌트)  
> 검증: `npx tsc --noEmit` 에러 0 · `eslint --quiet` 에러 0

---

## 배경

v12-H1에서 구현된 `UpcomingSeasonCard`의 수동 체크 항목이 `localStorage`에 저장되어 운영진 간 상태 공유가 불가했다. H4 목표는 `site_settings` Firestore 컬렉션으로 이전해 공유 상태를 보장하는 것.

---

## 구현 내용

### 1. site_settings 저장 키 구조

| 이벤트 | site_settings key | 예시 항목 |
|---|---|---|
| 해커톤 | `season_checklist_hackathon` | `board_notice`, `judge_assign`, `console_ready` |
| 후기 개강 | `season_checklist_semester` | `onboarding`, `welcome_post` |

각 항목의 저장 구조:
```ts
type ChecklistEntry = { done: boolean; by: string; at: string };
type ChecklistData = Record<string, ChecklistEntry>;
// site_settings.value = JSON.stringify(ChecklistData)
```

### 2. 읽기 (useQuery)

- `siteSettingsApi.getByKey(key)` → bkend REST API 경유 (`filter[key]` 파라미터)
- `staleTime: 30_000` (30초) — 간단한 fetch 방식, onSnapshot 불필요
- 두 이벤트 독립 쿼리: `["site_settings", HACKATHON_CHK_KEY]`, `["site_settings", SEMESTER_CHK_KEY]`

### 3. 쓰기 (useMutation)

```ts
// 체크 시
newChecks[itemKey] = { done: true, by: currentUser?.name ?? "운영진", at: new Date().toISOString() }
// 체크 해제 시
delete newChecks[itemKey]

// recordId 있으면 update, 없으면 create (idempotent)
recordId ? siteSettingsApi.update(recordId, payload) : siteSettingsApi.create(payload)
```

onSuccess 시 `qc.invalidateQueries`로 즉시 갱신.

### 4. localStorage 마이그레이션 (1회)

- `useRef(false)` 플래그로 마운트 당 1회만 실행
- 키 패턴: `yedu_season_chk_{eventKey}_{itemKey}` === `"1"` 이면 Firestore로 업로드
- Firestore 기존 값이 있으면 스킵 (server-wins)
- 업로드 후 `qc.invalidateQueries`로 최신화 (localStorage 키는 삭제하지 않아도 무해)

### 5. UI — 체크 소표기

```tsx
{item.auto === null && checkEntry?.done && (
  <span className="text-[10px] text-muted-foreground">
    {checkEntry.by} · {new Date(checkEntry.at).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
  </span>
)}
```

예: "김대경 · 7/21"

### 6. 자동 판정 확대

| 항목 | 신호 | 구현 |
|---|---|---|
| 온보딩 시퀀스 활성 | `cron_runs` kind=`newcomer-activation-sequence` 최근 7일 성공 | `/api/console/cron-runs` fetch → `onboardingAuto` |
| 아이디어 보드 공지 | `comm_boards/comm_questions` hackathon 게시글 ≥ 1 | Firestore `getDocs` → `boardNoticeAuto` |
| 학사정보 캠페인 활성 | `academic_status_campaign` 활성 OR 개강 D-14~D+14 | `isCampaignLive` + 자동 범위 체크 |
| 가입 승인 큐 비움 | pendingMemberCount === 0 | 기존 `pendingData.total` 재사용 |
| 2학기 학사일정 등록 | calendarData entries에 2026-second 존재 | 기존 calendarData 재사용 |

---

## 검증 결과

```
npx tsc --noEmit     → 출력 없음 (에러 0)
eslint --quiet       → 출력 없음 (에러 0)
```

---

## 영향 범위

- 수정 파일: `src/app/console/page.tsx` (UpcomingSeasonCard 함수, L109~L659)
- 신규 Firestore 문서: `site_settings/{auto-id}` (key=`season_checklist_hackathon` / `season_checklist_semester`)
- bkend API: `siteSettingsApi.getByKey`, `.create`, `.update` (기존 메서드 재사용, 신규 없음)
- 제외: `src/features/handover/**` (변경 없음)

---

## 미배포 상태

`npm run build · git commit` 은 메인이 게이트에서 일괄 처리.

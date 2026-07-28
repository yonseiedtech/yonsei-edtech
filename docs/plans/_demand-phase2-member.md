# 수요조사 Phase 2 회원·알림 (M4·Q2·M6) 구현 기록

> 구현일: 2026-07-28
> 대상: 회원 수요조사 경험 고도화 (콘솔 집계는 별도 executor 담당 — 본 작업 미포함)
> 상태: 구현 완료 · tsc/eslint 0 · 미배포(메인 게이트 대기)

---

## 1. 범위

`_demand-survey-enhancement.md` / `_demand-campaign-strategy.md` Phase 2 중 회원·알림 3종:

| # | 항목 | 요지 |
|---|------|------|
| M4 | "내 수요" 추적 뷰 | 등록·반응한 수요를 스코프 필터로 모아 보고, 각 항목에 파이프라인 스테퍼·개설 활동 바로가기 |
| Q2 | 정족수 자동 전환 | 참여할래요로 JOIN_THRESHOLD(3) 도달 시 collecting → reviewing 자동 전환 |
| M6 | 정족수 도달 운영진 알림 | 위 자동 전환 시점에 staff+ 운영진 인앱 알림 (전환 1회만) |

**콘솔 파일(`src/app/console/demand/page.tsx`)은 미변경** — 병렬 executor 작업 영역이라 접촉하지 않음.

---

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `src/features/demand/DemandSurveySection.tsx` | M4 스코프 토글·mineItems·DemandStepper·스테퍼 렌더 / Q2 joinMutation 자동 전환 / M6 알림 호출 |
| `src/features/notifications/notify.ts` | `getStaffMemberIds()` 헬퍼 + `notifyDemandQuorumReached()` (M6) |
| `src/types/operations.ts` | NotificationType 유니온에 `demand_quorum_reached` 추가 (하위호환) |
| `src/app/mypage/notifications/page.tsx` | 신규 타입 TYPE_ICONS(🔥)·TYPE_LABELS(수요 정족수) — 망라 Record 완결 |
| `src/features/notifications/NotificationBell.tsx` | 신규 타입 TYPE_ICONS(🔥) — 망라 Record 완결 |

> 알림 타입은 세 곳이 `Record<NotificationType, string>`(망라형)이라 유니온 확장 시 세 맵 모두 항목을 추가해야 tsc가 통과한다. `useNotifications.ts`는 `Partial<Record<…>>`라 추가 불필요(생략).

---

## 3. M4 — "내 수요" 추적 뷰

### 스코프 토글
- 상태 필터 위에 `전체 보기 / 내 수요` 라운드 버튼 2종(각 count 표기). 기본 `all`.
- `scope: DemandScope("all"|"mine")` 상태 추가.

### 내 수요 판정 (`mineItems`)
등록자 본인이거나 관심/참여로 반응한 항목:
```
q.authorId === user.id
|| likedSet.has(`question__${q.id}`)      // 관심있어요
|| likedSet.has(`demand-join__${q.id}`)   // 참여할래요
```
기존 `likedSet`(commLikesApi.listMineSet) 재사용 — 신규 쿼리 없음.

### 필터 합성 (`visible`)
`base = scope==="mine" ? mineItems : kindItems` → 그 위에 기존 statusFilter 적용. 두 필터 직교 결합.

### 스테퍼 (`DemandStepper`)
- 단계: 수집중 → 검토중 → 모임장 → 설계중 → 개설됨 (`DEMAND_STEPS` / `STEP_INDEX`).
- `scope==="mine"` 카드에서만 렌더(기본 목록 시각 부담 회피).
- done=CheckCircle2·success, active=번호·primary, todo=번호·muted. 시맨틱 토큰만 사용(raw color 미도입).
- `declined`는 STEP_INDEX -1 → "보류된 수요입니다." 별도 표기.
- `status==="opened" && pref.linkedActivityId` 이면 `/activities/studies/{linkedActivityId}` 바로가기 링크.

### 빈 상태
`scope==="mine" && mineItems.length===0` 시 "내 수요가 아직 없습니다" 안내로 분기.

---

## 4. Q2 — 정족수 자동 전환

`joinMutation`을 `questionId: string` → `q: CommQuestion` 인자로 변경(호출부 `joinMutation.mutate(q)`).

```
const added = await commLikesApi.togglePlain(user.id, DEMAND_JOIN, q.id, user.name);
if (added && resolveStatus(q) === "collecting") {
  const nextCount = (joinCounts[q.id] ?? 0) + 1;   // added=true → 미집계였으므로 +1
  if (nextCount >= JOIN_THRESHOLD) {
    await commQuestionsApi.update(q.id, { demandPref: { ...(q.demandPref ?? {}), status: "reviewing" } });
    try { await notifyDemandQuorumReached(q.body ?? "", meta.demandType); } catch {}
  }
}
```

### 중복 전환 방지
- `resolveStatus(q) === "collecting"` 가드 → 이미 reviewing 이상이면 전환·알림 미발생.
- `added` 가 true(신규 참여)일 때만 계산 → 참여 취소(false)는 전환 트리거 안 됨.
- 전환 후 status가 reviewing이 되므로 재클릭해도 가드에 걸려 재전환·재알림 없음.
- 방어: `q.demandPref ?? {}` 스프레드로 기존 pref 보존, `q.body ?? ""` 널가드.
- `nextCount` 계산은 렌더 밖 mutation 내부 — 순수성 영향 없음.

onSuccess에 `demand-questions` 무효화 추가 → 전환된 상태가 즉시 목록에 반영.

---

## 5. M6 — 정족수 도달 운영진 알림

`notify.ts`:
```
async function getStaffMemberIds(): Promise<string[]>  // staff·president·admin·sysadmin role별 조회 후 dedup
export async function notifyDemandQuorumReached(topic, demandType)  // staff 전원에 create() fan-out
```
- 조회는 `profilesApi.list({ "filter[approved]":"true", "filter[role]":<role> })` → `/api/members/basic`(로그인 회원 누구나 role 필터 조회 가능, 연락처는 서버가 마스킹). 일반 회원이 참여 반응을 눌러도 운영진 id 확보 가능.
- 알림 문구: `"{스터디|세미나} 수요 "{주제 40자}"이(가) 개설 정족수에 도달해 검토 대기로 전환되었습니다."`, 링크 = 유형별 수요 탭(`/activities/studies` · `/seminars`).
- 과알림 방지: 자동 전환 1회 시점(호출부 collecting 가드)에서만 호출. `create()`는 기존 try/catch로 실패해도 메인 흐름 비블로킹.
- 알림 문서 생성은 기존 notifyComment 등과 동일하게 클라이언트에서 타 사용자 대상 create 하는 검증된 패턴.

---

## 6. 검증

| 항목 | 명령 | 결과 |
|------|------|------|
| 타입 | `npx tsc --noEmit` | EXIT 0 (에러 0) |
| 린트 | `npx eslint <변경 5파일>` | EXIT 0 (에러 0) |
| 디버그 잔여 | grep console.log/debugger/TODO (DemandSurveySection) | 없음 |

- next build는 지침대로 미실행.
- 회귀 무접촉: 등록 폼·유사수요·수요편집·캠페인 배너·상태전환 로직 미변경(스코프/스테퍼/joinMutation 인자만 확장).

---

## 7. 잔여·후속

- 런타임 스모크(브라우저 접속·참여 3회 → reviewing 전환·운영진 벨 알림 확인)는 배포 후 메인 게이트에서 QA.
- 세미나 스테퍼는 leader/designing 단계를 쓰지 않지만(collecting→reviewing→opened) opened 시 전 단계 done 처리라 시각 왜곡 없음 — 필요 시 유형별 스텝 분기는 후속 개선 여지.
- 동시 다발 참여의 극단적 경합 시 알림 중복 가능성은 이론상 존재하나(현 규모 무시 가능), collecting 가드로 전환 자체는 idempotent.

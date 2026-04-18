# Plan — `member-bulk-approval`

- **Date**: 2026-04-18
- **Stage**: 3 P1 묶음 2/4 (master plan `bright-sparking-cerf.md`)
- **Author**: auto-mode
- **Estimated**: 0.5일 (master plan 3일 추정 대비 대폭 축소 — 기존 인프라 발견)

## 1. 목표

운영자가 승인 대기 회원 중 **수동 검토 필요** 회원을 다수 골라 한 번에 승인할 수 있게 한다 (체크박스 + 일괄 승인 버튼).

## 2. 기존 인프라 (재사용)

`src/features/admin/AdminMemberTab.tsx` 안에 이미 다음이 구현되어 있다:

| 기능 | 위치 |
|---|---|
| 자동 승인 토글 (localStorage) | L107-117 (`autoApprove`) |
| 자동 승인 규칙 평가 (`evaluateSignup`/`partitionPending`) | L101-105 + `src/lib/auth/approval-rules.ts` |
| 자동 승인 가능자 일괄 승인 버튼 | L142-163 (`handleBulkApprove`) — `qualifyingPending`만 처리 |
| 자동 승인 자동 처리 (토글 ON 시) | L122-140 |
| 위험도별 색상 + 사유 배지 | L548-577 |
| 단건 승인 (회원 상세 페이지에서) | `/console/members/[id]` |
| 가입 거절 / 복구 | L613-652 (거절 탭) |
| `notifyMemberApproved` 알림 | `src/features/notifications/notify.ts` |
| `profilesApi.approve(id)` | bkend API |

**모두 그대로 재사용한다.**

## 3. Gap (신규 작업)

### 3a. State

`AdminMemberTab.tsx`에 추가:
```ts
const [selectedPending, setSelectedPending] = useState<Set<string>>(new Set());
function togglePendingSelect(id: string) { ... }
```

### 3b. UI — 승인 대기 탭

각 대기 회원 카드 (L558 `<div className={cn("flex items-start justify-between rounded-xl border p-4", riskColor)}>`):
- 좌측 상단에 체크박스 추가 (CheckSquare/Square)
- 클릭 시 `togglePendingSelect(u.id)`

대기 헤더 (L529-544):
- 자동 승인 가능자 개수 라인 옆에 "전체 선택" 토글
- `selectedPending.size > 0` 일 때 "선택 {n}명 승인" 버튼 추가
  - `handleApproveSelected()` 호출

### 3c. Handler

```ts
async function handleApproveSelected() {
  if (selectedPending.size === 0) return;
  if (!confirm(`선택된 ${selectedPending.size}명을 일괄 승인하시겠습니까?`)) return;
  setBulkApproving(true);
  let ok = 0, fail = 0;
  for (const id of selectedPending) {
    const u = truePending.find((p) => p.id === id);
    if (!u) continue;
    try {
      await profilesApi.approve(u.id);
      await notifyMemberApproved(u.id, u.name);
      ok++;
    } catch { fail++; }
  }
  setBulkApproving(false);
  setSelectedPending(new Set());
  if (fail === 0) toast.success(`${ok}명 승인 완료`);
  else toast.warning(`승인: ${ok}명 / 실패: ${fail}명`);
  logAudit({ action: "회원 일괄 승인", category: "role", detail: `${ok}건 승인 (수동 선택)`, ... });
}
```

### 3d. Audit log

기존 `logAudit` 활용 (L195 패턴) — `action: "회원 일괄 승인"`, `detail: "{ok}건"`.

## 4. Out of scope (본 사이클 제외)

- 일괄 거절 (악성 가입 폭주 시 유용하나 우선순위 낮음 — 다음 iteration)
- CSV 일괄 가입 처리 (이미 회원 추가 다이얼로그 존재)
- 승인 시 역할 일괄 지정 (현재 모두 `member`로 승인 — `evaluateSignup` 결과 기반)

## 5. Validation

- [ ] `npx tsc --noEmit` + `npm run build` 통과
- [ ] 체크박스 클릭 → selected state 정확히 토글
- [ ] 헤더 "전체 선택" → 모든 truePending 선택/해제
- [ ] "선택 N명 승인" 버튼 → 정확히 선택된 회원만 승인됨 (자동 가능자 + 수동 검토 필요 모두 가능)
- [ ] 승인 후 selection 초기화
- [ ] 부분 실패 시 toast.warning + audit log 기록
- [ ] 기존 "자동 승인 가능 N명 일괄 승인" 버튼 회귀 없음

## 6. Files to touch

- `src/features/admin/AdminMemberTab.tsx` — state + handler + UI (약 50 lines 추가)
- (없음) — API/타입/별도 파일 변경 없음

## 7. Deployment

CLAUDE.md 규칙대로 단일 `git push` + 단일 `npx vercel --prod`.

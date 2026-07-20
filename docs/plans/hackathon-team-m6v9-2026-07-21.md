# M6-v9 해커톤 팀 확정 표면 구현 보고서 (2026-07-20)

> 백로그: service-enhancement-plan-v9-2026-07-21.md § M6 "해커톤 팀 확정 표면 — 아이디어 보드에서 팀으로"

---

## 1. 구현 범위

### 핵심 문제 (v9 계획서 실측)
- 참가 신청(아이디어 보드 = `comm_boards/comm_questions`) + "팀 참여 희망" 슬롯까지만 존재.
- **팀을 실제로 확정·조회하는 표면이 없어** 당일 팀 편성 혼선 위험.
- 참가자가 "누구와 한 팀인지" 알 방법 없음.

### 구현된 흐름
1. 아이디어 카드("팀원 찾는 중")에 **합류 희망** 버튼 → `hackathon_team_joins` 결정적 docId upsert/delete
2. 카드에 **합류자 명단 칩** 실시간 표시 (contextId 기준 일괄 로딩 — N+1 회피)
3. 아이디어 작성자 카드에 **"팀 확정 → 제출 폼 이동"** 버튼 → `CustomEvent("hackathon:prefill")` + `sessionStorage` 로 HackathonSubmissions 제출 폼 프리필
4. HackathonSubmissions가 이벤트/sessionStorage 를 수신 → 폼 자동 열기 + teamName/members 프리필
5. **팀 현황 뷰** (HackathonTeamView) — 확정 팀 + 합류 희망 진행 중 항목 한눈에 표시

---

## 2. 수정/생성 파일

| 파일 | 종류 | 변경 내용 |
|---|---|---|
| `src/types/hackathon.ts` | 수정 | `HackathonTeamJoin` 인터페이스 추가 |
| `src/lib/bkend.ts` | 수정 | `HackathonTeamJoin` import + `hackathonTeamJoinsApi` 추가 |
| `src/features/hackathon/HackathonBoard.tsx` | 수정 | 합류 희망 쿼리·토글·칩 + "팀 확정" 버튼·핸들러 |
| `src/features/hackathon/HackathonSubmissions.tsx` | 수정 | `useEffect` prefill 연결 (`CustomEvent` + `sessionStorage`) + `id="hackathon-submission"` 앵커 |
| `src/features/hackathon/HackathonTeamView.tsx` | 신규 | 팀 현황 뷰 (확정 팀 목록 + 합류 희망 진행 중) |
| `src/app/hackathon/page.tsx` | 수정 | `HackathonTeamView` import + "팀 현황" 섹션 삽입 |
| `firestore.rules` | 수정 | `hackathon_team_joins` 규칙 블록 추가 (`hackathon_judgings` 아래) |

---

## 3. 신규 컬렉션

### `hackathon_team_joins`

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | `string` | `${questionId}_${userId}` (결정적) |
| `questionId` | `string` | `comm_question` id (아이디어 카드) |
| `userId` | `string` | 합류 희망 표시 회원 uid |
| `userName` | `string` | 표시 이름 (denorm) |
| `contextId` | `string` | `HACKATHON_CONTEXT_ID` — 회차별 일괄 조회용 |
| `createdAt` | `string?` | 생성 시각 |

**Firestore Rules:**
- `read/list`: `isAuthenticated()` — 팀 현황 뷰에서 전체 조회
- `create`: 본인 uid 강제 + docId 결정적 패턴 검증
- `update`: `false` (토글은 delete+create)
- `delete`: 본인 uid 강제

---

## 4. 팀 확정 프리필 연결 메커니즘

### HackathonBoard → HackathonSubmissions 통신
```
아이디어 작성자가 "팀 확정 → 제출 폼 이동" 클릭
  → sessionStorage.setItem("hackathon_prefill", JSON.stringify({teamName:"", members:"본인, 합류자1, ..."}))
  → window.dispatchEvent(CustomEvent("hackathon:prefill", {detail: {teamName, members}}))
  → document.getElementById("hackathon-submission").scrollIntoView()
  → HackathonSubmissions 의 window 이벤트 리스너가 수신
  → setForm({teamName, members}) + setEditing(true)
```

**이중 안전망:**
- 같은 페이지: `CustomEvent` 즉시 수신
- 탭 이동/리로드: `sessionStorage` 잔여분 mount 시 복원

---

## 5. 검증

- `npx tsc --noEmit` → **exit code 0** (에러 0건)
- `npx eslint src/features/hackathon/ src/app/hackathon/page.tsx src/lib/bkend.ts src/types/hackathon.ts --quiet` → **출력 없음** (에러 0건)

---

## 6. 외부 의존 잔여 (운영진 정책)

| 항목 | 상태 |
|---|---|
| 팀 편성 규칙 (최대 인원, 최소 인원) | 운영진 정책 확정 후 `config.ts` 상수 추가 |
| 팀 확정 마감 (신청 마감 != 팀 확정 마감) | 운영진 결정 |
| 합류 희망 취소 허용 여부 | 현재 허용(delete), 정책 변경 시 rules 수정 |

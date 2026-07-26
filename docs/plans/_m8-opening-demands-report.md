# M8: 운영진 홈 개설 대기 수요 미니 리스트

구현일: 2026-07-27

## 변경 파일

### 신규: `src/features/staff/useOpeningDemands.ts`
- `useOpeningDemands(enabled: boolean): OpeningDemandItem[]` 훅 신설
- `OPENING_STAGES = {"reviewing", "leader", "designing"}` 동일 필터 사용
- `commBoardsApi.listByContext("demand", currentDemandContextId())` → `commQuestionsApi.listByBoard(board.id)` 패턴 재사용 (useStaffReviewQueue 와 동일)
- `presenter === "스터디 희망"` + 개설 단계 필터 → 공감순·최신순 정렬 → 상위 5건 반환
- `retry: false, enabled` 패턴 준수
- 반환 타입: `{ id, body, status: OpeningDemandStage, likeCount }`

### 수정: `src/features/staff/StaffHomeTab.tsx`
- lucide-react `TrendingUp`, `Heart` 추가 (순수 import 추가)
- `useOpeningDemands`, `OpeningDemandStage` import 추가
- 모듈 수준 상수 `OPENING_STAGE_LABELS`, `OPENING_STAGE_BADGE` 추가 (브랜드 시맨틱 토큰만)
- `openingDemands = useOpeningDemands(!!user)` 훅 호출 추가
- "처리 대기" 아래, "내 할당 업무" 위에 "개설 대기 수요" 섹션 추가
  - 0건 시 섹션 전체 숨김 (조건부 렌더)
  - 상위 3건: 단계 뱃지 + 주제(body) + 공감수
  - 링크: `/console/demand`

## 보존된 기존 로직
- `useStaffReviewQueue` 반환값 및 `reviewPending` 렌더: 무변경
- `useStaffUiStore.setFocusProjectId` + 내 할당 업무 onClick: 무변경
- DB/Firestore rules: 무변경

## 검증 결과
- `npx tsc --noEmit` → 0 errors
- `npx eslint useOpeningDemands.ts StaffHomeTab.tsx` → 0 warnings/errors
- `node scripts/check-rawcolor-ratchet.mjs` → PASS (1/1, 변동 없음)

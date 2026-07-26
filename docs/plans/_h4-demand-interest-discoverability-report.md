# v16 H4 — 참여자 수요 상태 추적 + 수요조사 발견성 구현 보고

## 수정 파일

| 파일 | 유형 | 변경 내용 |
|---|---|---|
| `src/features/mypage/DemandInterestCard.tsx` | 신규 | 마이페이지 "내가 관심 밝힌 수요" 위젯 |
| `src/components/mypage/MyPageView.tsx` | 수정 | import + JSX 1줄 추가 |
| `src/components/layout/command-routes.ts` | 수정 | 라우트 2개 + ClipboardList icon import 추가 |
| `src/components/layout/Header.tsx` | 수정 | 학술 활동 nav에 "수요조사" 링크 추가 |

---

## (A) DemandInterestCard 핵심 로직

### 데이터 흐름
1. `commLikesApi.listMineSet(userId)` → `Set<"${targetType}__${targetId}">` 반환
2. `question__<id>` 및 `demand-join__<id>` prefix 항목에서 질문 id 추출 (Set으로 중복 제거)
3. `commBoardsApi.listByContext("demand", currentDemandContextId())` → 현재 학기 보드 획득
4. `commQuestionsApi.listByBoard(board.id)` → 전체 수요 질문 목록
5. 질문 id와 교집합 필터 → 최신순 정렬 → 최대 5개
6. 반응한 항목 없으면 `return null` (마이페이지 밀도 관리)

### 링크 결정 로직
- `demandPref.status === "opened"` AND `demandPref.linkedActivityId` 존재 → `/activities/studies/${linkedActivityId}`
- 그 외 → `/activities/studies?tab=demand`

### 단계 뱃지
콘솔(`src/app/console/demand/page.tsx`)의 `STAGE_LABELS` / `STAGE_BADGE` 상수를 로컬 복사해 동일한 매핑 적용.

---

## (B) 발견성 진입점

### command-routes.ts 추가
- `r:demand-survey` — "스터디·세미나 수요조사" → `/activities/studies?tab=demand`, group "학술 활동", visibility "auth", icon `ClipboardList`
- `r:learning-guides` — "러닝 가이드" → `/learning-guides`, group "연구 · 아카이브", visibility "auth", icon `BookOpen`
- `r:diagnosis`(진단평가)는 이미 등록됨 → 추가 생략

### Header.tsx 추가
- "학술 활동" 드롭다운 > "스터디" 바로 아래에 `{ href: "/activities/studies?tab=demand", label: "수요조사" }` 추가

---

## 검증 결과

| 검증 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx eslint DemandInterestCard.tsx` | PASS (0 warnings, 0 errors) |
| `npx eslint command-routes.ts Header.tsx` | PASS (0 warnings) |
| MyPageView.tsx ESLint | 기존 경고 1개(line 291 `Date.now()` pre-existing) |
| `node scripts/check-rawcolor-ratchet.mjs` | PASS (1개 / 상한 1개 — 변동 없음) |

---

## 활동 링크 경로 확인
- 개설된 스터디 직접 링크: `/activities/studies/${linkedActivityId}` — `MyActivityHub.tsx:132`, `MyPageView.tsx:955` 에서 동일 패턴 확인
- 수요조사 탭 링크: `/activities/studies?tab=demand` — `DiagnosisGuideBridge.tsx:112` 패턴 확인

## 제약 준수 확인
- DB/Firestore rules 무수정 (읽기 API만 사용)
- `bkend.ts` 무수정
- 브랜드 시맨틱 토큰만 사용 (`bg-muted`, `text-muted-foreground`, `text-primary`, `bg-primary/10`, `bg-success/10`, `text-success`)
- raw 팔레트색 없음 → rawcolor ratchet PASS
- 커밋/배포 없음

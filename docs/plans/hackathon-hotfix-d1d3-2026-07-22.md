# 해커톤 핫픽스 보고서 — D-1·D-3 (2026-07-22)

> 작성: executor (코드 수정 전용) · git add/commit/push·빌드·배포는 메인 오케스트레이터 게이트
> 근거: `docs/plans/hackathon-rehearsal-h1v13-2026-07-21.md` §2 · `docs/plans/service-gap-pm-2026-07-22.md` GAP-A

---

## 1. 변경 파일 목록

| 파일 | 변경 성격 |
|---|---|
| `src/features/hackathon/HackathonBoard.tsx` | D-1: phase 게이트 추가 (신규 import 2개 + 상수 2줄 + ternary 분기 1개) |
| `src/app/console/hackathon/page.tsx` | D-3: staff 전용 제출물 삭제 (Trash2 import + deleteMutation + 버튼 UI) |

---

## 2. D-1 — 접수 마감 후 참가 신청 폼 노출 차단

### 변경 내용

**`src/features/hackathon/HackathonBoard.tsx`**

1. `Lock` 아이콘 lucide-react import 추가
2. `useHackathonOps` 훅 import 추가 (`./useHackathonOps`)
3. 컴포넌트 상단에 `phase` + `registrationOpen` 계산 추가:
   ```ts
   const { phase } = useHackathonOps();
   const registrationOpen = phase === "registration";
   ```
4. `!myEntry` 분기에 phase 게이트 삽입:
   - `!registrationOpen` → `<section>` 마감 안내 표시 ("참가 접수가 마감되었습니다")
   - `registrationOpen` → 기존 신청 폼 그대로

### Phase 게이트 동작표

| phase | myEntry 없음 (미신청자) | myEntry 있음 (신청자) | 아이디어 보드 열람 | 합류 희망 버튼 |
|---|---|---|---|---|
| `registration` | 참가 신청 폼 노출 (현행 유지) | 완료 카드 + 수정/삭제 | 유지 | 유지 |
| `submission` | "접수 마감" 안내로 대체 | 완료 카드 그대로 | 유지 | 유지 |
| `judging` | "접수 마감" 안내로 대체 | 완료 카드 그대로 | 유지 | 유지 |
| `awards` | "접수 마감" 안내로 대체 | 완료 카드 그대로 | 유지 | 유지 |

- `phase`는 `useHackathonOps` 훅이 `resolveHackathonPhase(override)` 를 통해 수동 오버라이드 우선·날짜 기준 자동 폴백으로 결정함 — 콘솔 단계 전환도 즉시 반영됨.
- 아이디어 보드 목록 (`<section>` 아래 ul)·합류 희망 표시는 모든 phase에서 동일하게 유지.

---

## 3. D-3 — 콘솔 심사 탭 제출물 삭제

### 변경 내용

**`src/app/console/hackathon/page.tsx`**

1. `Trash2` 아이콘 lucide-react import 추가
2. `JudgingCard` 내부에 `deleteSubmission` useMutation 추가:
   - `judgings` 배열(해당 제출물의 심사 기록 전체) 순회 → `hackathonJudgingsApi.delete(submission.id, j.judgeId)` (권한 없는 항목은 `try/catch` 스킵)
   - `hackathonSubmissionsApi.delete(submission.id)` 로 제출물 삭제
3. `handleDeleteSubmission` 함수 — `window.confirm("제출물과 연결된 심사 기록이 함께 삭제됩니다. 계속할까요?")` 확인 후 mutation 실행
4. 카드 헤더 우측 점수 영역 옆에 `<Trash2>` 버튼 추가 (destructive 호버, disabled during pending)

### 삭제 캐스케이드 동작

```
[확인 다이얼로그]
  ↓ 확인
[for each judging in judgings]
  → hackathonJudgingsApi.delete(submissionId, judgeId)   ← try/catch (권한 분기)
[hackathonSubmissionsApi.delete(submissionId)]
[onChanged() → React Query 캐시 무효화]
```

---

## 4. Firestore rules 판정

### hackathon_submissions (delete)
```
allow delete: if isAuthenticated()
  && (resource.data.ownerId == request.auth.uid || isStaffOrAbove());
```
- **staff 삭제 허용** — 추가 rules 수정 불필요.

### hackathon_judgings (delete)
```
allow delete: if isStaffOrAbove()
  && (resource.data.judgeId == request.auth.uid || isAdmin());
```
- **비admin staff는 자기 심사 기록만 삭제 가능** (타 심사위원 기록은 admin만).
- 현 코드: `try/catch` 로 권한 없는 항목을 건너뛰고 제출물 삭제 진행.
- 실전 운영(오제출 정리)에서 여러 심사위원 기록이 남아 있으면 admin이 삭제하거나 아래 rules 수정 필요.

#### 권고 rules 수정안 (메인 적용)

```diff
  match /hackathon_judgings/{docId} {
    allow read, list: if isStaffOrAbove();
    allow create, update: if isStaffOrAbove()
      && request.resource.data.judgeId == request.auth.uid
      && docId == request.resource.data.submissionId + '_' + request.auth.uid;
-   allow delete: if isStaffOrAbove()
-     && (resource.data.judgeId == request.auth.uid || isAdmin());
+   allow delete: if isStaffOrAbove();
  }
```

변경 근거: 삭제는 리허설·오제출 정리용 운영 액션으로, create/update 와 달리 다른 심사위원 기록 삭제도 staff가 수행해야 하는 경우가 있음. create/update 의 `judgeId == uid` 강제는 유지되므로 위조 위험 없음.

---

## 5. 검증 결과

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 에러 0건 |
| `npx eslint --quiet HackathonBoard.tsx page.tsx` | 에러 0건 |
| 신규 컬렉션 | 없음 |
| raw 색상 | 없음 (시맨틱 토큰만 사용) |
| 기존 해커톤 표면 재구성 | 없음 (D-1·D-3 2건만 변경) |

---

*파일: `docs/plans/hackathon-hotfix-d1d3-2026-07-22.md` · 작성 2026-07-22 · 코드 수정 전용(git·빌드·배포는 메인 게이트)*

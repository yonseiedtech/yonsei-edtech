# 교수설계 마법사 작성자 추적 구현 보고서 — v13-M2 (2026-07-21)

> 근거: `service-enhancement-plan-v13-2026-07-21.md §M2` · `portfolio-coverage-m2v12-2026-07-21.md §2-3`

---

## 1. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/lib/bkend.ts` | `activityParticipationsApi.recordDesign` 메서드 추가 |
| `src/features/activities/StudyCurriculumWizard.tsx` | `useAuthStore` + `activityParticipationsApi` import, `handleSave()` 에 recordDesign 호출 추가 |
| `src/lib/portfolio-autofill.ts` | `AutofillSourceKind`에 `"curriculum_design"` 추가, `AutofillInput.designParticipations` 옵셔널 필드 추가, `buildPortfolioCandidates`에 source 5 블록 추가 |
| `src/components/profile/PortfolioAutofillDialog.tsx` | `activityParticipationsApi`, `activitiesApi` import 추가, `openDialog` fetch 확장(참여 조회+활동 조회), `buildPortfolioCandidates` 호출에 `designParticipations` 전달, 안내 문구 갱신 |

---

## 2. docId 관례 판단

### 기존 관례 (`bkend.ts` `recordAuto`)
```
${userId}__seminar__${seminarId}   → 세미나 참여
${userId}__activity__${activityId} → 활동 참여자/리더
```
- 이중 밑줄(`__`) + 타입 인자 + 대상 id 구조

### 이번 채택 docId
```
${userId}__design__${activityId}
```
- `__design__` 타입으로 기존 `__activity__`(참여자/리더) 키와 충돌 없이 분리
- 한 사람이 같은 활동에 참여자이면서 설계자일 수 있으므로 반드시 별도 키 필요

---

## 3. Firestore rules 판단

`firestore.rules` `activity_participations` 규칙:
```
allow create: if isAuthenticated() && (
  request.resource.data.userId == request.auth.uid
  || isStaffOrAbove()
  || (activityId 존재 && 활동 리더)
);
```

설계자 레코드는 `userId == request.auth.uid` 조건을 만족하므로 **rules 수정 불필요**.

---

## 4. 멱등 방식

- `recordDesign` 내부에서 `getDoc` 후 `existing.exists() → return` 조기 종료
- 마법사를 여러 번 저장해도 activity_participations 레코드는 1건 유지
- 포트폴리오 자동적재 측의 멱등: `sourceRef = curriculum:design:{activityId}` (isAlready 검사)

---

## 5. 소급 불가 안내

`PortfolioAutofillDialog` 안내 문구에 명시:
> "교수설계 산출은 마법사를 신규 저장한 시점부터 추적됩니다(과거 저장분 소급 불가)."

---

## 6. 포트폴리오 후보 스키마

| 필드 | 값 |
|---|---|
| `sourceRef` | `curriculum:design:{activityId}` |
| `sourceKind` | `"curriculum_design"` |
| `sourceKindLabel` | `"교수설계 산출"` |
| `type` | `"community"` |
| `role` | `"교수설계"` |
| `organization` | `"연세교육공학회"` |
| `title` | `{활동명} — 교수설계 ({모형명, ...})` 또는 `교수설계 산출` |
| `date` | `""` (마법사 저장 시각을 startedAt으로 기록하나 autofill 표시는 공란) |

---

## 7. 검증

- ESLint (`--quiet`) 4개 파일: 에러 0
- `npx tsc --noEmit`: 검사 중 (배경 실행)
- 신규 컬렉션: 0 (`activity_participations` 재사용)
- rawcolor ratchet: 변경 없음 (raw 색상 추가 없음)

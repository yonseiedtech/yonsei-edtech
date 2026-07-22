# 해커톤 운영 결정 X1 — 외부/졸업생 심사위원 + 참가자 투표 (2026-07-22)

## 개요

사용자 결정: "심사단은 외부인원 혹은 졸업생으로 선정 + 참가자 투표도 반영"

구현 범위:
1. **외부/졸업생 심사위원 접근** — staff 아닌 회원 계정으로 채점 가능
2. **참가자 응원 투표** — 로그인 회원이 산출물에 1표 투표 (토글)

---

## 변경 파일

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/hackathon.ts` | `HackathonSubmissionVote` 인터페이스 추가 |
| `src/lib/bkend.ts` | `hackathonJudgesApi`, `hackathonSubmissionVotesApi`, `hackathonJudgingsApi.listMineByContext` 추가 |
| `src/features/hackathon/HackathonJudgingScoreForm.tsx` | **신규** — 공용 루브릭 채점 폼 컴포넌트 |
| `src/app/console/hackathon/page.tsx` | 심사위원 관리 블록(admin 전용) + 투표 집계 배지 추가; `HackathonJudgingScoreForm` 재사용 |
| `src/features/hackathon/HackathonSubmissions.tsx` | 응원 투표 토글 버튼 + 집계 표시 추가 |
| `src/app/hackathon/judge/page.tsx` | **신규** — 심사위원 전용 채점 페이지 |

---

## 1. 심사위원 명단 저장 — site_settings/hackathon_judges

### 구조

```
컬렉션: site_settings
docId:  hackathon_judges  (결정적 — Firestore rules get() 경로 성립을 위해 필수)
필드:
  key:       "hackathon_judges"
  judgeIds:  string[]   (uid 배열 — JSON 문자열 아닌 직접 필드)
```

### hackathon_ops 패턴과의 차이

| | hackathon_ops | hackathon_judges |
|---|---|---|
| docId | 랜덤 (siteSettingsApi.create) | 결정적 "hackathon_judges" (dataApi.upsert) |
| value 저장 방식 | `value: JSON.stringify({...})` | `judgeIds: string[]` 직접 배열 |
| 이유 | rules 접근 불필요 | rules `get().data.judgeIds` 직접 접근 필요 |

`dataApi.upsert("site_settings", "hackathon_judges", { key, judgeIds })` 로 저장하므로,
`siteSettingsApi.getByKey("hackathon_judges")` 로도 조회 가능(key 필드 일치).

---

## 2. 심사위원 전용 페이지 — /hackathon/judge 접근 흐름

```
GET /hackathon/judge
  ↓
로그인 여부 확인 (useAuthStore)
  ↓ 비로그인 → "로그인 필요" 안내 + 로그인 버튼
  ↓
hackathonJudgesApi.get() → site_settings/hackathon_judges 조회
  ↓ uid 미포함 → "심사위원 권한 없음" 안내 + 운영진 문의 메시지
  ↓
hackathonSubmissionsApi.listByContext(contextId) → 산출물 목록
hackathonJudgingsApi.listMineByContext(contextId, judgeId) → 기존 채점 (rules 개정 후)
  ↓
각 산출물 + HackathonJudgingScoreForm 렌더
  → 채점 저장 → hackathon_judgings upsert (rules 개정 후 가능)
```

콘솔 AuthGuard(staff 전용) 를 우회하는 별도 라우트. 페이지 자체에서 judgeIds 검사.

---

## 3. 투표 멱등성

- `hackathon_submission_votes` 컬렉션
- docId = `${submissionId}_${userId}` (결정적)
- `hackathonSubmissionVotesApi.vote()` → `dataApi.upsert(...)` → Firestore setDoc(merge)
- 동일 사용자가 동일 제출물에 중복 클릭해도 1개 문서만 존재
- `hackathonSubmissionVotesApi.unvote()` → docId 삭제

UI: 버튼 토글 — voted 상태면 취소, 아니면 투표. `aria-pressed` 상태 제공.

---

## 4. Firestore Rules 수정안 (보고서 전문 — 직접 수정 금지, 운영진 적용 필요)

### 4-A. hackathon_judgings — 외부 심사위원 채점 허용

현재:
```firestore-security-rules
match /hackathon_judgings/{docId} {
  allow read, list: if isStaffOrAbove();
  allow create, update: if isStaffOrAbove()
    && request.resource.data.judgeId == request.auth.uid
    && docId == request.resource.data.submissionId + '_' + request.auth.uid;
  allow delete: if isStaffOrAbove()
    && (resource.data.judgeId == request.auth.uid || isAdmin());
}
```

변경안:
```firestore-security-rules
match /hackathon_judgings/{docId} {
  // 운영진: 전체 열람. 외부 심사위원: 본인 심사 기록만 단건 get.
  allow get: if isStaffOrAbove()
    || (isAuthenticated() && resource.data.judgeId == request.auth.uid);
  // 운영진: 전체 목록. 외부 심사위원: judgeIds 포함자만 목록 열람.
  allow list: if isStaffOrAbove()
    || (isAuthenticated()
      && request.auth.uid in get(/databases/$(database)/documents/site_settings/hackathon_judges).data.judgeIds);
  // 채점 저장: 운영진 또는 judgeIds 포함자 — judgeId==uid·docId 규칙 유지.
  allow create, update: if (isStaffOrAbove()
    || (isAuthenticated()
      && request.auth.uid in get(/databases/$(database)/documents/site_settings/hackathon_judges).data.judgeIds))
    && request.resource.data.judgeId == request.auth.uid
    && docId == request.resource.data.submissionId + '_' + request.auth.uid;
  // 삭제: 운영진만 (본인 기록은 본인, admin은 전체)
  allow delete: if isStaffOrAbove()
    && (resource.data.judgeId == request.auth.uid || isAdmin());
}
```

> **get() 경로 성립 조건**: `site_settings/hackathon_judges` docId 가 결정적 문자열이어야 함.
> 위 구현에서 `dataApi.upsert("site_settings", "hackathon_judges", ...)` 로 결정적 docId 보장.
> 만약 기존 `hackathon_judges` 설정이 랜덤 docId 로 저장된 이력이 있다면 해당 문서 삭제 후 재저장.

### 4-B. hackathon_submission_votes — 참가자 투표

신규 규칙 추가 (`hackathon_team_joins` 규칙 다음):

```firestore-security-rules
// ─── 해커톤 참가자 응원 투표 (X1) ───
// doc id = `${submissionId}_${userId}` (결정적 — 멱등 upsert).
// 1인 1제출물 1표. 본인 문서만 생성/삭제. 집계는 인증 사용자 전체 열람.
match /hackathon_submission_votes/{docId} {
  allow read, list: if isAuthenticated();
  allow create: if isAuthenticated()
    && request.resource.data.userId == request.auth.uid
    && docId == request.resource.data.submissionId + '_' + request.auth.uid;
  allow update: if false;  // 토글은 delete+create (upsert 덮어쓰기 허용 불필요)
  allow delete: if isAuthenticated()
    && resource.data.userId == request.auth.uid;
}
```

---

## 5. 운영 안내

- **외부인원 심사위원**: 사이트 가입(회원가입) 후, 운영진이 콘솔 → 심사 탭 → "심사위원 관리"에서 검색해 추가. 지정 즉시 `/hackathon/judge` 접근 가능.
- **졸업생 심사위원**: 동일 절차. 가입 시 역할(alumni) 무관하게 judgeIds 포함 여부로만 판단.
- **투표 마감**: `awards` phase 진입 후 투표 버튼 비활성(집계만 표시). 수동 오버라이드로 phase를 awards로 설정하면 즉시 마감.
- **합산 공식**: 심사 점수와 참가자 투표는 별도 표기. 합산 방식은 운영진 결정 사항(미구현).

# 해커톤 비회원(게스트) 참가 신청 설계 문서
> 작성: 2026-07-23 | 구현 브랜치: master (미배포, 메인 게이트 대기)

---

## 1. 게스트 마커 컨벤션

### 기존 codebase 관례 실측
| 컨텍스트 | authorId | 게스트 식별 필드 |
|---|---|---|
| comm_questions (seminar Q&A) | 없음(필드 자체 누락) | `guestName?: string` |
| comm_answers | 없음 | `guestName?: string` |
| networking_rsvps | 없음 | `isGuest?: boolean`, `guestName?: string` |
| seminar_registrations | 없음 | `isGuest?: boolean` |

### 해커톤 게스트 신청 컨벤션 (채택)
```
authorId   : (필드 없음 — 누락)
authorName : 입력 이름 (표시용)
guestName  : 입력 이름 (기존 comm 관례와 동일)
guestEmail : 입력 이메일 (선택 — 가입 시 자동 연결 키)
```

- `authorId` 부재 + `guestName` 존재 → 게스트 카드로 판정
- 가입 후 연결 시: `authorId = uid` 로 채우고 `guestEmail` 은 `FieldValue.delete()` 로 제거 (PII 최소화)

---

## 2. 링커 설계

### 2-1. 신규 API 라우트: `/api/auth/link-guest-hackathon`
```
POST /api/auth/link-guest-hackathon
Authorization: Bearer <idToken>
Body: {}
```

**처리 흐름**
1. `requireAuth` 로 uid 확인
2. `users/{uid}.email` 조회 (토큰 폴백)
3. `comm_questions` where `contextId == HACKATHON_CONTEXT_ID && guestEmail == email` 쿼리
4. `authorId` 없는 문서 → batch: `authorId = uid`, `guestEmail = FieldValue.delete()`, `updatedAt` 갱신
5. 결과 `{ linked: N }` 반환

**멱등성**: `authorId` 이미 있으면 skip → 중복 호출 안전.

### 2-2. `linkGuestHackathonApps` (guestLinker.ts 추가)
기존 `linkGuestApplicants` 패턴 그대로 답습:
- `auth.currentUser?.getIdToken()` 취득 → `fetch("/api/auth/link-guest-hackathon", { POST })` 위임
- Admin SDK 필요 이유: `comm_questions.update` rule 이 `resource.data.authorId == request.auth.uid` 를 요구하므로 게스트 문서(authorId 없음)는 클라이언트 SDK 로 업데이트 불가

### 2-3. `runAllGuestLinkers` 반환 타입 확장
```ts
// Before
{ attendees, applicants, certificates }

// After
{ attendees, applicants, certificates, hackathon }
```

`runSignupFlow.ts` 의 총계 토스트도 `result.hackathon.linked` 포함 업데이트.

---

## 3. 게스트 신청 API: `/api/hackathon/guest-apply`

```
POST /api/hackathon/guest-apply
Body: {
  boardId: string,       // 해커톤 보드 doc id
  guestName: string,     // 필수
  guestEmail?: string,   // 선택
  body: string,          // 1~140자
  presenter: string,     // 팀 참여 희망
  hackathonSurvey?: { ... }
}
```

- **인증 불필요** — Admin SDK 로 직접 `comm_questions` 에 write
- 스팸 방어: IP rate-limit 5회/5분
- 보드 존재·open·contextId 검증 (board 없음/closed/잘못된 contextId → 4xx)
- 설문 필드는 허용 목록(aiLiteracy, vibeCoding, tools, strengths)만 통과

### 왜 Admin SDK 경유인가?
해커톤 보드는 `allowGuest: false` 로 프로비저닝되어 있어 Firestore rule 의 `commBoardWritable` 을 통과하지 못한다. 기존 보드를 `allowGuest: true` 로 수정하려면 owner 또는 staff 권한이 필요하고, 모든 방문자가 호출하는 `ensureHackathonBoard` 에서 업데이트는 불가. Admin SDK 서버 라우트로 우회하는 방식이 가장 clean.

---

## 4. Firestore rules 수정안

### 현재 `comm_questions` create 규칙
```
allow create: if commBoardWritable(request.resource.data.boardId)
  && (!('authorId' in request.resource.data)
      || request.resource.data.authorId == request.auth.uid);

function commBoardWritable(boardId) {
  return exists(...)
    && commBoardData(boardId).status == 'open'
    && (commBoardData(boardId).allowGuest == true || isAuthenticated());
}
```

현재 해커톤 보드 `allowGuest: false` → 비인증 클라이언트 create **불가**.

### 최소 완화안 (현재 구현에서는 불필요 — Admin SDK 우회 채택)
만약 클라이언트 직접 쓰기로 변경하고 싶다면 board 를 `allowGuest: true` 로 수정 + 아래 rule 추가 가드:

```js
// comm_questions create 에 추가: 해커톤 게스트 조건
function isHackathonGuestCreate() {
  return commBoardData(request.resource.data.boardId).contextType == 'hackathon'
    && !isAuthenticated()
    && !('authorId' in request.resource.data)
    // guestName 필수 (스팸 방어 최소)
    && 'guestName' in request.resource.data
    && request.resource.data.guestName is string
    && request.resource.data.guestName.size() > 0
    && request.resource.data.guestName.size() <= 30
    && request.resource.data.body.size() <= 140;
}

allow create: if (commBoardWritable(request.resource.data.boardId)
  && (!('authorId' in request.resource.data)
      || request.resource.data.authorId == request.auth.uid))
  || isHackathonGuestCreate();
```

**현재 구현에서는 이 rules 변경 불필요** — 게스트 신청은 Admin SDK 서버 라우트(`/api/hackathon/guest-apply`)를 사용하므로 rules 를 우회한다.

### `comm_questions` update (게스트 수정 가능성)
```
allow update: if
  (count-only changes ...)
  || (isAuthenticated() && (
    resource.data.authorId == request.auth.uid   // ← 게스트 문서는 authorId 없음
    || ownerId == auth.uid
    || isStaffOrAbove()
  ));
```

`resource.data.authorId == request.auth.uid` 가 게스트 문서(authorId 없음)에서 항상 false → **게스트는 클라이언트로 수정 불가**.
Admin SDK 서버 라우트를 추가하면 가능하지만, 신원 확인 수단(인증 없음)이 없어 임의 삭제 위험. **"게스트는 수정 불가 · 운영진 문의" 단순화** 채택이 적절.

---

## 5. 1인 1신청 근사 (비회원)

| 방법 | 설명 |
|---|---|
| `localStorage.setItem("hackathon_guest_app_id", docId)` | 신청 직후 저장 |
| 재방문 시 `useEffect(() => setGuestAppId(localStorage.getItem(GUEST_APP_KEY)), [])` | 복원 |
| `entries.find(e => e.id === guestAppId)` | myEntry 판정 |

한계: 같은 브라우저에서만 식별 가능. 다른 브라우저/디바이스에서는 재신청 가능 → UI에 "같은 브라우저에서만 내 신청을 확인할 수 있습니다" 안내 표시.

---

## 6. 콘솔 CSV·집계

게스트 신청도 `comm_questions` 컬렉션에 동일하게 저장됨. `commQuestionsApi.listByBoard(board.id)` 로 전체 entries 를 가져오는 기존 집계 로직에 게스트 신청이 **자동 포함** — 별도 변경 없음. `authorId` 없음으로 게스트 식별 가능(필요 시 CSV 컬럼 추가 가능).

---

## 7. 변경 파일 목록

| 파일 | 변경 내용 |
|---|---|
| `src/types/comm-board.ts` | `CommQuestion.guestEmail?: string` 추가 |
| `src/app/api/hackathon/guest-apply/route.ts` | 신규 — Admin SDK 게스트 신청 |
| `src/app/api/auth/link-guest-hackathon/route.ts` | 신규 — Admin SDK 가입 연결 |
| `src/lib/guestLinker.ts` | `linkGuestHackathonApps` 추가, `runAllGuestLinkers` 반환 타입 확장 |
| `src/features/auth/signup-steps/runSignupFlow.ts` | hackathon 연결 건수 포함 토스트 |
| `src/features/hackathon/HackathonBoard.tsx` | 게스트 CTA+폼, 게스트 myEntry, 게스트 배지, 좋아요/합류 게스트 힌트 |

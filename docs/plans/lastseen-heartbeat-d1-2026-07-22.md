# D1 수정 보고서 — 레거시 회원 lastLoginAt 서버 폴백 (heartbeat)

- 일자: 2026-07-22
- 관련 감사: `docs/plans/members-lastseen-audit-2026-07-22.md` §6 D1(b)
- 변경 파일 2개: `src/app/api/auth/heartbeat/route.ts` (신규), `src/features/auth/AuthProvider.tsx` (수정)

---

## 1. 문제 배경

CSV 임포트 등으로 추가된 레거시 회원은 Firestore `users` 컬렉션의 **doc id ≠ Firebase UID**.
`firestore.rules:74`의 `isOwner(userId)` 조건(`request.auth.uid == userId`)이 영구 거부하므로,
클라이언트 SDK `profilesApi.update(merged.id, {lastLoginAt})` 호출이 항상 실패한다.
결과: 콘솔 "최근 접속"이 수개월 전으로 고정, `user_activity_logs`와 완전 괴리.

---

## 2. 매칭 순서 (heartbeat 3단계)

```
토큰 검증(verifyIdToken)
  → uid, email 추출
        │
        ▼
① db.collection("users").doc(uid).get()   — 정상 회원(doc id == uid) 빠른 반환
        │ 없으면
        ▼
② .where("uid", "==", uid).limit(2)       — 레거시 회원이 uid 필드를 별도 보유
        │ 없으면
        ▼
③ .where("email", "==", tokenEmail).limit(2) — CSV 임포트 최종 폴백(소문자 비교)
        │
        ▼
matchedRef.update({ lastLoginAt: now })
```

- 각 단계에서 매칭 즉시 진행 (불필요한 쿼리 skip).
- 다중 매칭 시 첫 1건만 갱신 + `console.warn` 경고.

---

## 3. 보안 경계

| 항목 | 설계 |
|---|---|
| 토큰 검증 | `getAdminAuth().verifyIdToken()` — Firebase 서명 검증 |
| 본인 문서만 | 탐색 조건이 `token.uid` 또는 `token.email` 기준 — 임의 대상 불가 |
| requireAuth 미사용 이유 | `verifyAuth`가 `users.doc(uid)` 직접 조회 → 레거시 회원은 문서 미존재 → null → 401 |
| Rate limit | 클라이언트 실패 시에만 호출(하루 최대 1회/사용자) — 별도 스로틀 불필요 |
| 임퍼소네이션 | AuthProvider의 기존 `isImpersonating` 분기 안에서만 동작 — 폴백도 해당 분기 외부에서 호출되지 않음 |

---

## 4. 폴백 흐름도 (AuthProvider)

```
onAuthStateChanged
  └─ if (!isImpersonating)
       └─ try localStorage
            └─ if (today !== storedKey)
                 └─ profilesApi.update(merged.id, {lastLoginAt})
                      ├─ .then(() => localStorage.setItem(k, today))  // 성공: D3 유지
                      └─ .catch((e) => {
                           console.warn(...)                           // 진단 로그
                           firebaseUser.getIdToken()
                             .then(idToken => fetch("/api/auth/heartbeat", {POST, Bearer idToken}))
                             .then(res => { if (res.ok) localStorage.setItem(k, today) })  // 폴백 성공 시만 마킹
                             .catch(() => {})                          // 폴백 실패 → warn 만
                         })
```

- **정상 회원 경로 무변경**: 클라이언트 write 성공 시 heartbeat 미호출.
- **D3 원칙 유지**: 폴백 성공 시에만 `localStorage.setItem` → 실패 시 당일 재시도 보존.

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 0 오류 |
| `eslint --quiet` (두 파일) | 0 오류/경고 |
| 신규 컬렉션 | 없음 |
| raw 색상 추가 | 없음 |

# 콘솔 회원관리 "최근 접속"(lastLoginAt) 정확성 감사

- 일자: 2026-07-22
- 범위: `/console/members` 표시 계층 → 기록 계층 → firestore.rules → 활동 텔레메트리 교차검증 (코드 실측, 읽기 전용)
- **판정: 부분 반영** — 세션 유지 재방문도 갱신되지만, ① 레거시(doc id ≠ uid) 회원 영구 미갱신 ② UTC 기준 1일 1회 스로틀로 최대 24h+ 지연 ③ 실패 시 당일 재시도 억제의 3가지 누락 시나리오 존재.

---

## 1. 추적 다이어그램 (이벤트 → 쓰기 위치 → 필드 → 표시)

```
[이벤트]                          [쓰기 위치]                                   [필드]              [표시]
─────────────────────────────────────────────────────────────────────────────────────────────────────────────
페이지 로드/세션 복원              AuthProvider.tsx:58-78                        users.lastLoginAt ──► /console/members
(onAuthStateChanged fire)          profilesApi.update(merged.id,{lastLoginAt})       │                AdminMemberTab.tsx
  · 명시 로그인 O                  · localStorage `last-login-ymd-{id}`              │                :585(카드) :688(테이블)
  · 자동 로그인(세션유지) O          UTC-날짜 1일 1회 스로틀                          │                formatLastLogin() :77-88
  · 임퍼소네이션 X (의도적 스킵)   · 클라이언트 SDK updateDoc (Admin 경로 없음)      │                (뷰어 로컬 tz, 분 단위 표기)
  · 레거시 doc id≠uid → rules 거부                                                   │
                                                                                     ├──────────────► WeeklyOperationsSummary.tsx:224
                                                                                     ├──────────────► computeMemberMetrics.ts:180 (점수에서는 제외)
                                                                                     └──────────────► /api/admin/insights/nudge/route.ts:147

대시보드 방문(1h 스로틀)           app/dashboard/page.tsx:153-163                users.lastVisitAt ─► adoption-metrics.ts:128-129 (WAU/MAU)
                                   profilesApi.update({lastVisitAt})                                  NewPostsBadge.tsx (새 글 기준)

모든 페이지 내비게이션             VisitTracker.tsx → visit-tracker.ts           user_activity_logs ► admin/analytics (회원별 접속 이력)
(로그인 회원, 30s 스로틀)          trackUserActivity() :149-180                  (addDoc, append)
                                   trackVisit() → daily_visits (집계)            daily_visits
```

핵심: **"최근 접속" 표시 필드는 `users.lastLoginAt` 단일 필드이며, 쓰기 위치는 전체 코드베이스에서 `AuthProvider.tsx` 단 한 곳**(64-65행, 75행 폴백)이다. 서버(Admin SDK)·Cloud Functions·cron 등 다른 갱신 경로는 없다(전수 grep 확인).

---

## 2. 표시 계층 (정확)

- 진입: `src/app/console/members/page.tsx` → `AdminMemberTab` (AuthGuard admin/sysadmin).
- 데이터 소스: `useMembers`/`useAllMembers` (`src/features/member/useMembers.ts`) → `profilesApi.list` → **`/api/members/basic`** (Admin SDK 서버 투영, `src/app/api/members/basic/route.ts`). staff 이상 요청은 `lastLoginAt` 포함 전 필드 반환(HARD_SECRET 4종만 제거) — 표시 계층에서의 필드 소실 없음. Firestore `Timestamp`도 `serialize()`로 ISO 변환 처리(24-34행).
- 포맷: `AdminMemberTab.tsx:77-88 formatLastLogin` — `new Date(iso)`를 **뷰어 브라우저 로컬 시간대**로 `yy년mm월dd일(요일) hh:mm` 렌더. KST 관리자 기준 정확. UTC 오프셋 하드코딩 없음 → 시간대 버그 없음.
- 정렬: `AdminMemberTab.tsx:354` 기본 `lastLoginAt desc`, 380행에서 미보유 회원은 `0`(epoch) 처리 → 항상 맨 아래. 정렬 로직 정상.
- "N일 전" 계산은 members 탭에는 없음(절대시각 표기). 인사이트 쪽 `daysSince`(WeeklyOperationsSummary.tsx:43-48 등)는 `floor((now-t)/86_400_000)` — 달력일이 아닌 24h 단위 경과일이라 KST 자정 경계에서 ±1일 오차 가능하나, 이는 표시 관례 수준(결함 아님).
- 주의: `useMembers` fetch `limit: 500` (useMembers.ts:19) — 회원 500명 초과 시 누락. 현재 규모에선 비활성 리스크.

**결론: 표시 계층은 저장된 값을 정확히 보여준다. 문제는 저장된 값 자체의 최신성이다.**

## 3. 기록 계층 (`AuthProvider.tsx:53-78`)

```
onAuthStateChanged → 프로필 조회(uid 직접 → email 폴백) → merged.id 확정
→ if (!isImpersonating):
     k = `last-login-ymd-${merged.id}`; today = toISOString().slice(0,10)  // ★UTC 날짜
     if (localStorage[k] !== today):
        localStorage[k] = today                                            // ★쓰기 성공 전에 선(先)마킹
        profilesApi.update(merged.id, { lastLoginAt: ISO now })            // 클라 updateDoc
          .catch(console.warn)                                             // ★실패해도 k 롤백 없음
```

- `onAuthStateChanged`는 **명시 로그인뿐 아니라 세션 복원(자동 로그인) 시에도 발화** → "세션 유지" 재방문·모바일/PWA 재방문도 원칙적으로 갱신 대상 (누락 시나리오 ①②는 기본적으로 커버됨).
- 다만 스로틀 때문에 실질 갱신 주기는 "브라우저별 UTC-하루 1회". 기기별 localStorage가 분리되므로 다기기 사용자는 기기마다 각각 1회 → 오히려 최신성에 유리.
- 임퍼소네이션 세션은 의도적으로 스킵(22-29행) — 관리자 대리접속이 회원 접속으로 오인되지 않게 하는 올바른 설계.
- 시크릿 모드 등 localStorage 불가 시 75행 폴백이 스로틀 없이 매 발화마다 갱신 — 정상.

## 4. 누락 시나리오 판정

| # | 시나리오 | 판정 | 근거 |
|---|---|---|---|
| ① | 세션 유지 재방문(명시 로그인 없음) | **갱신됨** (단, UTC-하루 1회 정밀도) | onAuthStateChanged가 세션 복원에도 발화 |
| ② | 모바일/PWA 재방문 | **갱신됨** (①과 동일 경로·동일 정밀도) | 동일 AuthProvider 경유 |
| ③ | 갱신 실패의 조용한 무시 | **부분 결함 D3** | 실패 시 `console.warn`만 남고 스로틀 키가 이미 마킹되어 **당일 내 재시도 억제**. 탭 조기 종료로 write 유실 시에도 동일 |
| ④ | rules가 쓰기 차단 | **결함 D1 (최대 원인)** | `firestore.rules:74` `allow update: if isOwner(userId)` — 레거시 CSV 임포트 회원은 doc id ≠ Firebase uid → **영구 거부**. 코드 주석(AuthProvider.tsx:55-57)도 인지. `lastLoginAt` 자체는 `noSensitiveFieldChange()`(role/approved만 검사) 통과라 정상 uid 회원은 문제 없음 |
| ⑤ | 서버/클라 경로 혼재 | 혼재 없음(클라 단일 경로) — 단 **읽기는 Admin(서버), 쓰기는 클라**라는 비대칭이 D1을 만든다 | 전수 grep: `lastLoginAt` 쓰기는 AuthProvider 1곳 |

추가 결함 **D2 (UTC 스로틀 경계)**: 스로틀 키 날짜가 `toISOString().slice(0,10)` = **UTC 날짜**. KST 기준 00:00~08:59 재방문은 전날과 같은 UTC 날짜라 갱신 스킵 → 예: 월 10:00 KST 접속(기록) 후 화 08:00 KST 재접속해도 표시값은 "월 10:00" 유지. 표기가 분 단위(`hh:mm`)라 정밀해 보이지만 실제 정밀도는 "약 하루", 최대 지연 ~33시간. 프로젝트에 이미 `todayYmdKst()`(lib/dday)가 있는데 여기만 UTC를 사용.

## 5. 활동 신호 교차검증 (구조적 괴리 여부)

세 신호의 갱신 조건이 서로 다르므로 괴리는 구조적으로 필연:

| 신호 | 갱신 조건 | 스로틀 | 레거시 id 회원 |
|---|---|---|---|
| `users.lastLoginAt` (콘솔 표시) | 모든 페이지의 세션 확립 | UTC-하루 1회 | **영구 미갱신** |
| `users.lastVisitAt` (WAU/MAU) | **대시보드 방문만** | 1시간 | 동일하게 rules 거부 |
| `user_activity_logs` | 모든 페이지 내비게이션 | 30초/그룹 | **정상 기록** (addDoc, 소유권 검사 무관) |

- 최대 괴리 케이스: 레거시 회원 — activity_logs에는 매일 접속 흔적이 있는데 콘솔 "최근 접속"은 `-` 또는 수개월 전 고정. `computeMemberMetrics.ts:5` 주석("lastLoginAt이 부정확/누락되는 경우 다수 — 접속 점수 제거")이 이 괴리를 이미 실증.
- 경미 괴리: 대시보드를 안 거치는 회원은 `lastVisitAt`이 `lastLoginAt`보다 오래됨(반대 지표인데 이름은 유사) — adoption-metrics(WAU/MAU)가 실제 접속을 과소집계.
- 2026-07-19 세션의 "백필 dry-run 6문서/12 id" 결과와 일치 — 레거시 대상은 소수지만 실재.

## 6. 결함 목록 및 수정안

| ID | 파일:라인 | 원인 | 수정안 | 규모 |
|---|---|---|---|---|
| D1 | `src/features/auth/AuthProvider.tsx:64-65` + `firestore.rules:74` | 클라 updateDoc이 isOwner(docId==uid) 전제 → 레거시 doc id≠uid 회원 영구 미갱신 | (a) 대기 중인 id 백필(doc id=uid 정합화) 적용 — 근본 해결. (b) 또는 `/api/auth/heartbeat` 서버 라우트(verifyAuth→Admin SDK로 email/uid 매칭 doc 갱신)로 쓰기 경로를 서버로 이동 | a=S(백필 준비됨) / b=M |
| D2 | `AuthProvider.tsx:61` | 스로틀 키가 UTC 날짜(`toISOString().slice(0,10)`) → KST 00~09시 재방문 미반영, 표시 정밀도 최대 ~33h 지연 | `todayYmdKst()` 사용으로 교체(1줄). 정밀도를 더 올리려면 날짜 대신 "6h 경과 시 갱신"(lastVisitAt 패턴, dashboard/page.tsx:158-161 참조) | S |
| D3 | `AuthProvider.tsx:62-72` | 스로틀 키 선마킹 후 write → 실패/탭 종료 시 당일 재시도 억제 | `.then`에서 성공 시에만 setItem, `.catch`에서 removeItem 롤백 | S |
| D4(개선) | `AdminMemberTab.tsx:688` | 저장 정밀도(하루)와 표기 정밀도(분) 불일치 → 운영진 오독 | 툴팁/캡션으로 "하루 1회 기록" 명시, 또는 D2 해결 후 유지 | S |

## 7. 종합 판정

**부분 반영.** 정상 uid 회원(대다수)은 세션 유지·모바일 포함 "마지막으로 사이트를 연 날"이 UTC-하루 정밀도로 반영된다. 그러나 (1) 레거시 doc id≠uid 회원은 rules 거부로 영구 미반영(코드가 스스로 인정하는 기지 결함, 백필 대기 중), (2) UTC 날짜 스로틀로 KST 아침 접속이 최대 하루 이상 뒤늦게 보이며, (3) 쓰기 실패 시 당일 재시도가 억제된다. 표시·정렬·시간대 렌더링 자체는 정확하다. 우선 조치는 D1(a) 백필 적용 + D2 1줄 수정.

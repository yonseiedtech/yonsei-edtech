# yonsei-edtech 버그 수정 계획

**날짜**: 2026-03-28
**범위**: 전체 코드베이스 보안/안정성 점검
**발견 이슈**: 총 28건 (CRITICAL 6 / HIGH 8 / MEDIUM 10 / LOW 4)

---

## Phase 1: CRITICAL (즉시 수정 필수) — 6건

### C1. reviews API 인증 없음
- **파일**: `src/app/api/reviews/route.ts:4`
- **문제**: POST 핸들러에 인증 없음. 익명 사용자가 `seminar_reviews` 컬렉션에 임의 데이터 쓰기 가능. `authorId`/`authorName`을 요청 본문에서 직접 받아 사용자 위장 가능.
- **수정**: `requireAuth(req, "member")` 추가. authorId/authorName을 인증 토큰에서 추출.
- **검증**: 인증 없이 POST 요청 시 401 반환 확인.

### C2. parse-excel API 인증/제한 없음
- **파일**: `src/app/api/parse-excel/route.ts:4`
- **문제**: 인증 없음, 레이트 리밋 없음, 파일 크기 제한 없음. 대용량 XLSX 업로드로 서버 메모리 소진 가능.
- **수정**: `requireAuth` 추가 (최소 "member"). 파일 크기 10MB 제한. `checkRateLimit` 추가.
- **검증**: 인증 없이 요청 시 401, 10MB 초과 시 413 반환 확인.

### C3. sheets API SSRF 취약점
- **파일**: `src/app/api/sheets/route.ts:10-11`
- **문제**: `url.includes("docs.google.com")` 검증이 `http://evil.com/?foo=docs.google.com` 등으로 우회 가능. 내부 네트워크 스캔에 악용 가능.
- **수정**: `new URL(url)` 파싱 후 `hostname.endsWith(".google.com")` 검증. 인증 추가.
- **검증**: 우회 URL 시도 시 400 반환 확인.

### C4. Firebase API 키 하드코딩
- **파일**: `src/lib/firebase.ts:6-12`
- **문제**: Firebase config가 소스에 직접 하드코딩. 키 로테이션 시 코드 변경+배포 필요.
- **수정**: `NEXT_PUBLIC_FIREBASE_*` 환경변수로 이동. `.env.local` 및 Vercel 환경변수 설정.
- **검증**: 환경변수 미설정 시 적절한 에러 출력, 설정 시 정상 동작 확인.

### C5. 이메일 템플릿 HTML 인젝션
- **파일**: `src/app/api/email/approval/route.ts:44`, `src/app/api/email/password-reset/route.ts:41`
- **문제**: `name`, `link` 변수가 HTML에 이스케이프 없이 삽입. XSS/HTML 인젝션 가능.
- **수정**: HTML 특수문자 이스케이프 함수 추가 (`<`, `>`, `&`, `"`, `'`). 모든 사용자 입력값에 적용.
- **검증**: `<script>alert(1)</script>` 등의 이름으로 테스트 시 이스케이프 확인.

### C6. QR 체크인 Firestore 실패 시 롤백 없음
- **파일**: `src/features/seminar/seminar-store.ts:69-76`
- **문제**: 낙관적 업데이트 후 Firestore 쓰기 실패 시 로컬 상태만 "체크인 완료"로 남음. 새로고침하면 미체크인으로 복원. `checkinBySelfInfo`(114-120)도 동일.
- **수정**: `.catch()` 에서 로컬 상태를 `checkedIn: false`로 롤백 + 사용자에게 실패 토스트 표시.
- **검증**: 네트워크 차단 상태에서 체크인 시도 → 롤백 + 에러 메시지 확인.

---

## Phase 2: HIGH (조속히 수정) — 8건

### H1. 미승인 사용자 인증 우회 창
- **파일**: `src/features/auth/LoginForm.tsx:31-39`, `src/lib/api-auth.ts`
- **문제**: 미승인 사용자가 로그인 → approved 체크 → 로그아웃 사이에 유효한 Firebase 토큰 보유. 이 토큰으로 서버 API 호출 가능.
- **수정**: `verifyAuth`에서 `approved` 상태도 확인. 미승인 시 null 반환.
- **검증**: 미승인 계정으로 API 직접 호출 시 401 반환 확인.

### H2. press-release seminar.date NaN 전파
- **파일**: `src/app/api/ai/press-release/route.ts:48`
- **문제**: `seminar.date`가 undefined/null이면 `Invalid Date` → `NaN` → 모든 분기 실패 → 항상 "세미나 종료" 톤 선택.
- **수정**: `seminar.date` 유효성 검증. 무효 시 400 에러 반환.
- **검증**: date 없이 요청 시 400 반환 확인.

### H3. 비밀번호 재설정 이메일 미발송 시 성공 반환
- **파일**: `src/app/api/email/password-reset/route.ts:55-60`
- **문제**: Resend 미설정 시 이메일 미발송이지만 `{ sent: true }` 반환.
- **수정**: `{ sent: false, reason: "Email service not configured" }` 반환.
- **검증**: RESEND_API_KEY 미설정 시 sent: false 확인.

### H4. firebaseUser.email 비null 단언
- **파일**: `src/features/auth/AuthProvider.tsx:21`
- **문제**: `firebaseUser.email!` — 이메일 없는 인증(전화, 익명) 시 null이 프로필 조회로 전달.
- **수정**: `if (firebaseUser.email)` 가드 추가.
- **검증**: 이메일 없는 인증 시 크래시 없이 정상 처리 확인.

### H5. toggleAll 필터되지 않은 목록 선택
- **파일**: `src/features/seminar-admin/RegistrationsTab.tsx:882-885`
- **문제**: `toggleAll()`이 필터링된 목록 대신 전체 `registrations` 사용. 보이지 않는 항목까지 선택됨.
- **수정**: `registrations` → `filteredRegistrations` 변경.
- **검증**: 필터 적용 후 전체 선택 시 필터된 항목만 선택 확인.

### H6. QuestionManager 필터 로직 오류
- **파일**: `src/features/seminar-admin/RegistrationsTab.tsx:276`
- **문제**: `startsWith` 체크가 `.some()` 내부에 있어 `nq`에 무관하게 평가됨. 우연히 동작하지만 의미적 오류.
- **수정**: `NO_QUESTION.includes(trimmed) || trimmed.startsWith(...)` 패턴으로 변경.
- **검증**: 기존 필터링 결과와 동일 출력 확인.

### H7. dataApi 임의 컬렉션명 허용
- **파일**: `src/lib/bkend.ts:158,182,190,205,229`
- **문제**: `table` 파라미터가 검증 없이 `collection(db, table)`에 전달. Security Rules 의존.
- **수정**: 허용 컬렉션 화이트리스트 추가.
- **검증**: 허용되지 않은 컬렉션명으로 요청 시 에러 발생 확인.

### H8. Excel 확인 버튼 disabled 조건 괄호 누락
- **파일**: `src/features/seminar-admin/RegistrationsTab.tsx:1180`
- **문제**: 연산자 우선순위로 인해 의도와 다른 동작 가능성. 현재는 우연히 동작.
- **수정**: 명시적 괄호 추가: `disabled={registering || (!fieldMapping["이름"] && !Object.values(fieldMapping).includes("name"))}`.
- **검증**: 이름 매핑 없이 확인 버튼 비활성화 확인.

---

## Phase 3: MEDIUM (개선 권장) — 10건

| # | 파일 | 문제 | 수정 |
|---|------|------|------|
| M1 | `ai/poster/route.ts`, `ai/press-release/route.ts` | 입력 길이 제한 없음 | `.slice()` 트렁케이션 추가 |
| M2 | `reviews/route.ts:27` | rating 범위 미검증 | 1~5 범위 검증 |
| M3 | `ai/chat/route.ts:12,33` | MAX_MESSAGE_LENGTH 미사용 | 개별 메시지 길이 검증 |
| M4 | `TimelineTab.tsx:212-218` | 메모 변경 시 키스트로크마다 Firestore 쓰기 | 500ms 디바운스 |
| M5 | `seminar-store.ts:33-41` | loadAttendees가 전체 배열 교체 | seminarId별 머지 또는 문서화 |
| M6 | `RegistrationsTab.tsx:675-689` | 벌크 작업 순차 실행 + 부분 실패 | Promise.allSettled 또는 배치 API |
| M7 | `NametagGenerator.tsx:435` | description undefined 시 크래시 | 옵셔널 체이닝 추가 |
| M8 | `ai-client.ts:18` | PII(email, uid) 프로덕션 로그 | NODE_ENV 체크 또는 제거 |
| M9 | `bkend.ts:60-66` | parseSort 필드명 미검증 | 정렬 가능 필드 화이트리스트 |
| M10 | `AuthProvider.tsx:13-14` | initialized 플래그 레이스 컨디션 | useRef로 구독 상태 추적 |

---

## Phase 4: LOW (선택적) — 4건

| # | 파일 | 문제 | 수정 |
|---|------|------|------|
| L1 | email routes | 이메일 엔드포인트 레이트 리밋 없음 | checkRateLimit 추가 |
| L2 | `TimelineTab.tsx:603-605` | 템플릿 정렬 후 인덱스 불일치 | id 기반 편집/삭제 |
| L3 | `bkend.ts:34-40` | saveTokens/clearTokens 빈 함수 | 제거 또는 @deprecated |
| L4 | `bkend.ts:202` | serializeDoc 비null 단언 | 존재 확인 추가 |

---

## 수정 순서 권장

1. **Phase 1 (CRITICAL)** → 보안 취약점 우선 (C1~C3 → C5 → C4 → C6)
2. **Phase 2 (HIGH)** → 인증 우회(H1) → 데이터 무결성(H2~H4) → UI 버그(H5~H8)
3. **Phase 3~4** → 안정성 개선

## 수정 작업량 예상

- Phase 1: 6개 파일, ~100줄 변경
- Phase 2: 8개 파일, ~80줄 변경
- Phase 3: 10개 파일, ~60줄 변경
- Phase 4: 4개 파일, ~20줄 변경

---

## Acceptance Criteria

- [ ] 모든 CRITICAL 이슈 수정 후 빌드 성공
- [ ] 인증 없는 API 엔드포인트에 `requireAuth` 적용 확인
- [ ] SSRF 우회 URL 테스트 통과
- [ ] 이메일 템플릿 HTML 이스케이프 적용 확인
- [ ] QR 체크인 실패 시 롤백 동작 확인
- [ ] Firebase config 환경변수 이동 완료
- [ ] `npm run build` 성공
- [ ] Vercel 배포 후 주요 기능 동작 확인

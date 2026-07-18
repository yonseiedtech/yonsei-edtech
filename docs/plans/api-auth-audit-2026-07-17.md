# API 서버측 권한 감사 (v5-M7)

- 감사일: 2026-07-18
- 범위: `src/app/api/**/route.ts(x)` 전수 (읽기 전용, 코드 미수정)
- 인증 코어: `src/lib/api-auth.ts`(`verifyAuth`/`requireAuth`), `src/lib/permissions.ts`(`ROLE_HIERARCHY`), `src/lib/cron-auth.ts`(`verifyCronAuth`)

## 0. 인증 인프라 요약 (실측)

- `verifyAuth(req)` — `Authorization: Bearer <Firebase ID Token>` 검증 → `users/{uid}` 문서 조회 → **문서 없거나 `approved===false` 면 null**(화이트리스트 방식). 역할 기본값 `member`.
- `requireAuth(req, minRole="member")` — 미인증 401, 역할 미달 403. `ROLE_HIERARCHY`: guest0 < member1 < alumni/advisor2 < staff3 < president4 < admin5 < sysadmin6.
- `verifyCronAuth(req)` — `CRON_SECRET` 을 `timingSafeEqual` 로 상수시간 비교. 미설정 시 false(fail-closed).
- 다수 공개/게스트 라우트는 `checkRateLimit`(IP 또는 uid) + 화이트리스트 투영 + 서버측 재검증으로 보완.

전반적으로 **성숙한 보안 태세**. 과거 Sprint 69 / QA-v2·v3 / codex-H7 / HIGH-1·3 등 다회차 하드닝 흔적이 코드 주석·로직에 뚜렷하며, 명백한 인증 누락(취약) 엔드포인트는 발견되지 않음.

---

## 1. 전수 표

판정: OK(적절) / 취약(서버측 인증 부재·오설정) / 확인필요(설계 의도 확인 권장)

### 1-1. cron (24개 — 전부 GET, `verifyCronAuth` 게이트)

| 경로 | 메서드 | 검증 | 판정 |
|---|---|---|---|
| cron/seminar-reminder | GET | verifyCronAuth | OK |
| cron/newsletter-publisher | GET | verifyCronAuth | OK |
| cron/ai-forum-tick | GET | verifyCronAuth | OK |
| cron/loyalty-snapshot | GET+POST | verifyCronAuth(양쪽) | OK |
| cron/semester-advance | GET+POST | verifyCronAuth(양쪽) | OK |
| cron/activity-status | GET | verifyCronAuth | OK |
| cron/study-assignment-reminder | GET | verifyCronAuth | OK |
| cron/push-token-cleanup | GET | verifyCronAuth | OK |
| cron/archive-seed-sync | GET | verifyCronAuth | OK |
| cron/external-recruitment-reminder | GET | verifyCronAuth | OK |
| cron/seminar-push-reminder | GET | verifyCronAuth | OK |
| cron/study-session-reminder | GET | verifyCronAuth | OK |
| cron/seminar-push-review-request | GET | verifyCronAuth | OK |
| cron/flashcard-review-reminder | GET | verifyCronAuth | OK |
| cron/lecture-review-todos | GET | verifyCronAuth | OK |
| cron/push-class-reminder | GET | verifyCronAuth | OK |
| cron/semester-start-reminder | GET | verifyCronAuth | OK |
| cron/deadline-reminder | GET | verifyCronAuth | OK |
| cron/seminar-status | GET | verifyCronAuth | OK |
| cron/seminar-review-request | GET | verifyCronAuth | OK |
| cron/notifications-cleanup | GET | verifyCronAuth | OK |
| cron/compexam-reminder | GET | verifyCronAuth | OK |
| cron/weekly-digest | GET | verifyCronAuth | OK |
| cron/networking-reminder | GET | verifyCronAuth | OK |

전 24개 라우트가 `verifyCronAuth` import + 핸들러 진입부 호출(grep 실측: 파일당 2회, GET+POST 파일은 3회). CRON_SECRET 미설정 시 fail-closed. **판정 OK**.

### 1-2. 관리자/운영 (admin·console·notify·email·certificates·parse·migrate)

| 경로 | 메서드 | 검증 | 판정 |
|---|---|---|---|
| admin/impersonate | POST | requireAuth `president` | OK |
| admin/impersonate/revert | POST | verifyIdToken + 원본관리자 role∈{president,admin,sysadmin} 재검증 | OK |
| admin/reset-password | POST | requireAuth `staff` | OK |
| admin/migrate-applicants | POST | requireAuth `admin` | OK |
| admin/archive-crosslink-backfill | POST | requireAuth `admin` | OK |
| admin/audit-users | GET | 인라인 assertAdmin (role==='admin') | OK |
| admin/insights/nudge | POST | 인라인 assertAdmin (role==='admin') | OK |
| admin/ai-forum/advance | POST | verifyAuth + allowedRoles(staff↑) + rate-limit | OK |
| admin/roadmap/seed | POST | verifyAuth + allowedRoles(staff↑) | OK |
| admin/seed-board-content | POST | verifyAuth + allowedRoles(staff↑) | OK |
| console/potential-members | GET | requireAuth `staff` | OK |
| console/adoption | GET | requireAuth `staff` | OK |
| notify/fanout | POST | requireAuth `staff` (전회원 알림, 본인 제외) | OK |
| email/approval | POST | requireAuth `staff` | OK |
| email/inquiry-reply | POST | requireAuth `staff` | OK |
| email/password-reset | POST | requireAuth `staff` | OK |
| email/newsletter | POST | requireAuth `staff` | OK |
| certificates/pdf | POST | requireAuth `staff` | OK |
| certificates/email | POST | requireAuth `staff` | OK |
| certificates/batch | POST | requireAuth `staff` | OK |
| parse-excel | POST | requireAuth `staff` | OK |
| reviews/migrate | GET | requireAuth `admin` | OK |

위험도 높은 액션(마이그레이션=admin, 비밀번호 재설정=staff, 임퍼소네이션=president, 전회원 fanout=staff)의 권한 수준이 액션 위험도에 부합. **판정 OK**.

### 1-3. AI 생성 (비용 남용 표면)

| 경로 | 메서드 | 검증 | 판정 |
|---|---|---|---|
| ai/press-release | POST | requireAuth `staff` | OK |
| ai/poster | POST | requireAuth `staff` | OK |
| ai/inquiry-reply | POST | requireAuth `staff` | OK |
| ai/semester-report | POST | requireAuth `staff` | OK |
| ai/conference-extract | POST | requireAuth `staff` | OK |
| ai/agent-workflow | POST | requireAuth `staff` | OK |
| ai/yonsei-agent | POST | requireAuth `member` | OK |
| ai/chat | POST | verifyAuth(비로그인 401 차단) + rate-limit 30/60s | OK |
| sheets | GET | requireAuth `member` + `*.google.com` 도메인 제한(SSRF 가드) | OK |

익명 LLM 남용 벡터 차단됨(ai/chat 는 QA-v3 결정으로 비로그인 401). **판정 OK**.

### 1-4. 회원 자원 (본인 소유권 검증)

| 경로 | 메서드 | 검증 | 판정 |
|---|---|---|---|
| me/export | GET | requireAuth, `uid`로 본인 데이터만 수집 | OK |
| me/applications | GET | requireAuth, `a.userId===uid` 필터 | OK |
| push/register | POST | requireAuth `member`, 저장 userId=토큰 uid(body 미신뢰) | OK |
| push/unregister | POST | requireAuth `member`, 본인 토큰만 삭제 | OK |
| posts/[id]/vote | POST+GET | requireAuth, voteRef=`votes/{auth.uid}` | OK |
| posts/new-count | GET | requireAuth | OK |
| networking/rsvp | POST | requireAuth, body에 userId 없음(토큰 귀속) | OK |
| reviews/cert-no | GET | requireAuth `member` | OK |
| diagnosis/peer-stats | GET | requireAuth `member` | OK |
| conference/[programId]/roundup | GET | requireAuth + reflection 있는 plan만 투영 | OK |
| conference/[programId]/my-schedule/pdf | GET | requireAuth, `userId≠본인 && <staff`이면 403 (IDOR 수정됨) | OK |
| activities/[id]/my-application | GET | requireAuth (본인 신청 조회) | OK |
| auth/link-guest-applicants | POST | requireAuth, 매칭키(학번·이메일)를 body 아닌 `users/{uid}` 프로필에서 취득 → 타인 이력 탈취 차단 | OK |
| seminars/waitlist-notify | POST | requireAuth + 대상이 실제 참가자인지 서버 검증 + 제목 서버조회 + 중복 차단 | OK |
| activities/reflections | GET | verifyAuth + 본인/staff/리더 외 내용 REDACT(리더 판정은 문서 activityId 기준) | OK |

body의 userId를 신뢰하지 않고 토큰 uid로 귀속·소유권 검증. IDOR 방어 확인. **판정 OK**.

### 1-5. 활동 신청 (회원·게스트 공용)

| 경로 | 메서드 | 검증 | 판정 |
|---|---|---|---|
| activities | GET | 공개 목록 | OK |
| activities | POST | requireAuth `staff` | OK |
| activities | PATCH | requireAuth + join/leave는 본인만(staff 대행), 일반수정 staff↑ | OK |
| activities | DELETE | requireAuth `staff` | OK |
| activities/[id]/apply | POST | verifyAuth 선택 — 회원은 프로필값 강제·editKey 본인/staff만, 게스트는 자기보고 | OK |

PATCH의 join/leave 타인 강제참여·탈퇴 차단(codex-H7), editKey 게스트 자기수정 경로 제거(HIGH-1). **판정 OK**.

### 1-6. 공개/게스트 엔드포인트 (인증 불필요 — 설계상 공개)

| 경로 | 메서드 | 보완장치 | 판정 |
|---|---|---|---|
| chatbot | GET | 공개 인사말 문자열만 | OK |
| stats/advisors | GET | count만 반환, 개인정보 없음, CDN 캐시 | OK |
| calendar/public.ics | GET | 공개 세미나(취소 제외)만, PII 없음 | OK |
| calendar/me.ics | GET | 추측불가 `calendarToken` 이 자격증명 | OK |
| networking/availability-tally | GET | 슬롯별 카운트만(이름·학번 미노출) + rate-limit | OK |
| networking/rsvp-guest | POST+GET+DELETE | rate-limit + 이벤트 재검증 + 추측불가 manageToken + 트랜잭션 | OK |
| networking/availability-guest | POST | rate-limit + poll·마감 재검증 + 후보슬롯 화이트리스트 + 멱등 upsert | OK |
| activities/[id]/application-lookup | POST | rate-limit + 이름+학번 정확일치 + 비-PII 화이트리스트 투영 | OK |
| auth/guest-history-preview | GET | rate-limit + 제목·날짜·종류만(PII 미반환) | OK |
| auth/check-username | GET | rate-limit(enumeration 완화) + 가입여부 boolean | OK |
| auth/resolve-email | GET | rate-limit + 이메일 마스킹(raw 미반환) | OK |
| auth/auto-approve | POST | verifyIdToken(본인) + 가입 60분 이내만 + 자동승인 규칙 + 감사로그 | OK |
| auth/forgot-password/verify | POST | zod + 응답통일(401) + 타이밍 균일화 | OK |
| auth/forgot-password/answer | POST | zod + PBKDF2 + rate-limit(30분5회) + 1.5s 지연 + 응답통일 | OK |
| comm/notify-answer | POST | rate-limit + 알림 생성만(민감 write 없음) + self-notify 스킵 | OK |
| newsletter/[id]/pdf | GET | `status==='published'` 만 다운로드 허용 | OK |

공개 표면 모두 rate-limit·화이트리스트 투영·enumeration 완화로 방어. **판정 OK**.

### 1-7. 회원 명단/프로필 (민감 데이터 GET)

| 경로 | 메서드 | 검증 | 판정 |
|---|---|---|---|
| members/basic | GET | verifyAuth 필수 + HARD_SECRET(securityAnswerHash·calendarToken 등) 삭제 + 비-staff는 연락처·username 삭제 | OK |
| members/directory | GET | verifyAuth 필수 + contactVisibility 서버강제 + studentId는 staff만 | OK |
| networking/roster | GET | verifyAuth + 요청자가 attending 회원이어야 열람 + 동의(showInAttendeeList)+비게스트만 | OK |
| profile/[id]/public | GET | verifyAuth 선택 + `getProjectedProfile` 로 secret 전면 배제·via 컨텍스트 투영 | OK |
| reviews | GET | published만 공개 반환 | OK |
| reviews | POST | verifyOptionalAuth + 회원 authorId≠토큰uid면 403 + authorRole 서버결정 + 연사토큰 검증 | 확인필요 |
| reviews | PATCH | verifyOptionalAuth + 회원후기 uid 일치 강제, 게스트후기 authorId 일치 | OK |
| seminars/[id]/speaker-token | GET+POST | requireAuth `staff` | OK |
| profile/[id]/certificate | GET | 본인판=본인/staff만, `?public=true`=인증 불필요 | 확인필요 |

---

## 2. 확인필요 항목 — 근거 및 권고

명백한 "취약"(서버 인증 부재로 즉시 악용 가능)은 없음. 아래 2건은 **설계 의도 확인·심층 방어 권장** 수준.

### (A) profile/[id]/certificate — `?public=true` 익명 포트폴리오 다운로드
- 파일: `src/app/api/profile/[id]/certificate/route.tsx:52-84, 199`
- 근거:
  - `?public=true` 경로는 인증 검사를 건너뛴다(`route.tsx:66-77` 의 인증 블록이 `if (!publicOnly)` 로 감싸짐).
  - 인증 여부와 무관하게 `line 79-84` 에서 `activity_participations`·`awards`·`external_activities`·`content_creations` 를 대상 사용자(id) 기준으로 로드 → **프로필 ID만 알면 임의 회원의 활동·수상·대외활동·콘텐츠 이력이 담긴 PDF를 비로그인으로 생성 가능**.
  - `line 63` `const user = { id, ...userSnap.data() }` 로 **전체 user 문서**(email·phone·studentId·securityAnswerHash·birthDate 등 포함)를 `bundle.user` 에 담아 PDF 컴포넌트에 전달. 실제 PDF 바이트로의 유출 여부는 `ProfileCertificatePdfDocument` 템플릿이 `publicOnly` 플래그로 어떤 필드를 렌더하는지에 전적으로 의존.
- 권고:
  1. `?public=true` 브랜치에서 `bundle.user` 에 화이트리스트(name·publicTitle 등)만 담고 secret/연락처 필드를 **렌더 전에 제거**해 "컴포넌트가 안 그리니 괜찮다"는 암묵 의존을 제거.
  2. 익명 포트폴리오 공개가 의도라면 대상 사용자의 공개 동의 플래그(예: portfolio 공개 opt-in)를 서버에서 확인하는 것을 검토.

### (B) reviews POST — 게스트가 운영진 이름으로 후기 작성 시 "운영진 후기" 자동 분류
- 파일: `src/app/api/reviews/route.ts:232-266, 314`
- 근거:
  - `line 232` 로 인증 회원의 authorId 위장은 차단됨(OK).
  - 그러나 **비로그인 게스트**는 `authorName` 을 자유 입력 가능하고, `line 255-266` 이 그 이름으로 `users` 를 조회해 staff/president/admin 이면 `resolvedType="staff"`·`authorRole` 설정. 결과적으로 게스트가 특정 운영진의 실명으로 후기를 올리면 **"운영진 후기"로 표기**될 수 있음(authorId 는 `guest_${authorName}` 로 저장되어 실 계정 탈취는 아님 — 표시상 사칭).
- 권고: staff-role 자동 분류를 **인증된 본인(authorId===auth.uid)일 때만** 적용하도록 좁히면 표시상 사칭 표면 제거.

---

## 3. 요약

- 전수 감사 라우트: 92개 route 파일(cron 24 + 비-cron 68), mutation 핸들러 및 민감 GET 모두 실측.
- **취약(서버측 인증 부재·오설정): 0건.** cron 24개는 `verifyCronAuth`(timingSafeEqual, fail-closed) 전수 게이트. 관리자/삭제/승인/역할변경/마이그레이션은 staff~admin~president로 위험도에 부합. 회원 자원은 토큰 uid 귀속으로 IDOR 방어(과거 codex-H7·HIGH-1·QA-v3 하드닝 반영).
- **확인필요: 2건** — (A) profile/[id]/certificate `?public=true` 익명 포트폴리오·전체 user 문서 로드, (B) reviews POST 게스트의 운영진 실명 후기 자동 "운영진" 분류. 둘 다 심층 방어·설계 확인 권장 수준(즉시 악용 심각도 낮음).

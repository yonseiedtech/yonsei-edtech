# H5 가입 승인 대기 가시화 + 미처리 신청 운영 넛지 구현 보고서

> 계획: service-enhancement-plan-v9-2026-07-21.md H5 항목  
> 구현일: 2026-07-20  
> 검증: `npx tsc --noEmit` 에러 0 · `npx eslint src --quiet` 경고 0

---

## 구현 항목

### 1. 신청자 측 — 승인 대기 화면 가시화 (`src/app/signup/page.tsx`)

**변경 전**: "가입 신청 완료" + "승인까지 1~2일" 단문 안내만 표시.

**변경 후**:
- **3단계 진행 표시**: 접수됨(완료·amber) → 검토 중(진행 중·amber 테두리) → 승인 완료(대기·muted)
- **구체적 안내 목록**: 수동 확인 절차·평균 1~2 영업일·승인 완료 시 로그인 가능
- **문의 경로**: `yonsei.edtech@gmail.com` 링크 명시 (처리 지연 시)
- 기존 "로그인 페이지로" 버튼 유지, `safeNext` 안내 텍스트 유지

### 2. 운영진 측 — 미처리 신청 일별 cron 넛지 (`src/app/api/cron/pending-signup-nudge/route.ts`)

신규 cron 핸들러:
- Firestore `users.approved == false` 조회 → `rejected=true` 제외 → 대기 건수 집계
- 3일(STALE_DAYS) 초과 건수를 별도 집계해 알림 본문에 포함
- admin·sysadmin·president·staff 역할 운영진에게 인앱 알림 fan-out
- **dedup**: `push_logs/{pending_signup_nudge_{adminId}_{YYYY-MM-DD}}` — 일 1회 상한
- `withCronLog` 래퍼로 `cron_runs` 관측성 확보
- 신규 컬렉션 없음 — 기존 `push_logs`·`notifications` 재사용

알림 예시:
- 제목: "미처리 가입 신청 3건"
- 본문: "가입 신청 3건 (3일 초과 1건)이 처리 대기 중입니다. 회원 관리에서 승인해주세요."
- 링크: `/console/members`

### 3. vercel.json 스케줄 등록

```json
{ "path": "/api/cron/pending-signup-nudge", "schedule": "0 23 * * *" }
```

(UTC 23:00 = KST 08:00, 매일 아침)

### 4. 운영 콘솔 — 미처리 가입 신청 배지 (`src/app/console/academic/applications/page.tsx`)

- `usePendingMembers` 훅으로 실시간 대기 건수 조회
- 대기 건수 > 0 시 ConsolePageHeader 아래에 amber 배너 표시
  - "미처리 가입 신청 N건" 배지 + 안내 텍스트
  - `/console/members` 클릭 링크
- 대기 0건이면 배너 미노출 (조건부 렌더)

### 5. 회원 관리 — 대기 경과일 표시 (`src/features/admin/AdminMemberTab.tsx`)

- `waitDays(u.createdAt)` 헬퍼 함수 추가 (ISO → 경과일 계산)
- 승인 대기 탭 각 카드에 "N일 대기" 배지 추가
  - 0일: 미표시
  - 1~2일: amber 스타일
  - 3일+: red 스타일 (STALE 임계)
- **오래된 순 정렬 토글** 추가: 최신 순 ↔ 오래된 순 전환 버튼 (pendingSortOldest state)

### 6. 알림 타입 맵 확장

- `src/types/operations.ts`: `"pending_signup_nudge"` NotificationType 추가
- `src/features/notifications/NotificationBell.tsx`: TYPE_ICONS에 `"👤"` 추가
- `src/app/mypage/notifications/page.tsx`: TYPE_ICONS + TYPE_LABELS 에 이미 반영(linter 자동 패치)

---

## 수정 파일 목록

| 파일 | 변경 유형 |
|---|---|
| `src/app/signup/page.tsx` | 수정 — 수동 승인 대기 UI 가시화 |
| `src/app/api/cron/pending-signup-nudge/route.ts` | **신규** — 운영진 일별 넛지 cron |
| `vercel.json` | 수정 — cron 스케줄 1건 추가 |
| `src/app/console/academic/applications/page.tsx` | 수정 — 미처리 가입 신청 배너 |
| `src/features/admin/AdminMemberTab.tsx` | 수정 — 경과일 배지 + 정렬 토글 |
| `src/types/operations.ts` | 수정 — NotificationType 추가 |
| `src/features/notifications/NotificationBell.tsx` | 수정 — TYPE_ICONS 항목 추가 |

---

## 외부 의존 (미구현 — 운영진 결정 후 보완)

- 실제 승인 SLA(목표 처리시간)가 확정되면 signup/page.tsx "평균 1~2 영업일" 문구 조정
- 알림 발송 대상 확대(예: 카카오채널·이메일)는 발송 정책 확정 후 cron에 훅 추가
- cron 실행 주기 조정(현재 일 1회) 및 조용한 시간대 정책 확정 시 schedule 수정

---

## 검증 결과

- `npx tsc --noEmit`: **0 errors**
- `npx eslint src --quiet`: **0 warnings/errors** (수정 파일 전체)

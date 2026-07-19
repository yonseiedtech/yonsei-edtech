# H3 v9 — 해커톤 제출 마감 리마인더 + 당일 운영 리허설 감사 (2026-07-21)

> 구현 일시: 2026-07-21 · 행사: 2026-08-22 (D-33) · 담당: v9-H3

---

## 1. 리마인더 cron 설계 (`hackathon-submission-reminder`)

### 1-1. 파일

| 파일 | 상태 |
|---|---|
| `src/app/api/cron/hackathon-submission-reminder/route.ts` | 신규 생성 |
| `vercel.json` crons 배열 | 항목 추가 (`0 0 * * *`, 30번째 스케줄) |
| `src/types/operations.ts` NotificationType | `"hackathon_submission_reminder"` 추가 |

### 1-2. 발송 시점

| D-N | 날짜 (KST) | 메시지 톤 |
|---|---|---|
| D-3 | 2026-08-19 | "마감이 3일 남았습니다. 팀원과 준비해 보세요." |
| D-1 | 2026-08-21 | "내일이 마감입니다. 잊지 말고 제출해주세요." |
| D-0 | 2026-08-22 | "오늘(21:30)이 마감입니다. 완주해 보세요!" |
| D+1 이후 | — | 자동 비활성 (past-deadline 스킵) |
| 그 외 날 | — | not-target-day 스킵 |

### 1-3. 대상 판별 로직

```
참가 신청자 = comm_boards[contextType=hackathon, contextId=HACKATHON_CONTEXT_ID]
             → comm_questions[boardId=board.id] → authorId 집합

제출 완료자 = hackathon_submissions[contextId=HACKATHON_CONTEXT_ID] → ownerId 집합

미제출 대상 = 참가 신청자 ∖ 제출 완료자
```

### 1-4. 중복 방지 (dedup)

- 키: `push_logs/{hackathon_submission_reminder_{userId}_{dayKey}}`
- 같은 사용자에게 같은 날 두 번 발송 방지 (cron 재실행 멱등성)
- 발송 후 즉시 기록 (mentoring-nudge 패턴 동일)

### 1-5. 제약 준수

- 신규 컬렉션 없음 — `push_logs`(기존) + `notifications`(기존) 재사용
- `withCronLog` 래핑 → `cron_runs` 관측
- `verifyCronAuth` 인증
- MAX_RECIPIENTS = 100 (수십 명 규모 학술 커뮤니티 상한)
- 마감 이후 자동 비활성 (운영진이 cron 직접 비활성화 불필요)

---

## 2. 당일 운영 리허설 감사 (코드 실측 — 2026-07-21)

### 2-1. 흐름 단계별 동작 점검

| # | 단계 | 진입 경로 | 동작 여부 | 병목 위험 | 운영자 액션 |
|---|---|---|---|---|---|
| 1 | **참가 신청** | `/hackathon` → HackathonBoard | 정상 — `comm_questions` 1인1신청, 필드(problem+teamPref) 저장 | 없음 | 보드 프로비저닝은 첫 로그인 회원이 자동 생성(`ensureHackathonBoard`) |
| 2 | **아이디어 보드 탐색** | `/hackathon` HackathonBoard 하단 | 정상 — 좋아요·팀희망 필터 작동 | 없음 | — |
| 3 | **산출물 제출** | `/hackathon` → HackathonSubmissions 섹션 | 정상 — 폼 필드(팀명·제목·설명·링크·팀원), `isHackathonSubmissionClosed()` 마감 후 잠금 | **마감 시각 파싱 취약점** (§2-2 참고) | 마감 후 `closed` 배지 자동 표시 |
| 4 | **심사 배정** | `/console/hackathon` (staff+) | 정상 — 4기준 × 5점 루브릭, 심사위원별 upsert(`${submissionId}_${judgeId}` 멱등 doc id) | 없음 | 각 심사위원이 직접 콘솔 접속해 점수 입력 |
| 5 | **수상 지정 + 공개** | `/console/hackathon` JudgingCard | 정상 — 수상 등급(대상·최우수·장려) 지정 후 `published` 토글, 등급 미지정 시 공개 버튼 비활성(가드 있음) | 없음 | 등급 지정 → "수상작 공개" 클릭 → `/hackathon` 갤러리 자동 반영 |
| 6 | **수상 공개 갤러리** | `/hackathon` HackathonAwards | 정상 — phase 상태 기계: registration/submission → 플레이스홀더, judging → 심사 중 안내, awards + published → 공개 갤러리 | 없음 | `HACKATHON_AWARDS_ANNOUNCE_DATE="2026-08-29"` 넘어야 awards 단계 진입 |

### 2-2. 발견된 결함

| 번호 | 위치 | 결함 | 유형 | 즉시 보정 여부 |
|---|---|---|---|---|
| **R1** | `src/features/hackathon/config.ts:91` `isHackathonSubmissionClosed()` | `new Date("2026-08-22T21:30")` — 시간대 없는 ISO 문자열을 `new Date()`로 파싱 시 브라우저는 로컬 KST로 처리하지만 **서버 컴포넌트 또는 cron에서 호출 시 UTC로 해석 → 실제 21:30 KST보다 9시간 빠른 12:30 KST에 폼 잠김** 위험. `HackathonSubmissions.tsx`는 `"use client"` 이므로 현재는 브라우저에서만 호출 — 당장 런타임 오류 없음. 단, 추후 서버 측 판정 추가 시 버그 발현. | 잠재 버그 | 미보정 (구조 변경 — v9 타 트랙 보고) |
| **R2** | `/hackathon` page.tsx 레이아웃 | 참가 신청(HackathonBoard)과 산출물 제출(HackathonSubmissions) 섹션이 같은 페이지에 있으나 **섹션 간 앵커 링크 없음** — 참가 신청 완료 후 스크롤을 내려야 제출 폼 발견. 알림 클릭 시 `/hackathon`에 착지하면 제출 폼이 아니라 히어로에 도착. | UX 병목 | 미보정 (구조 변경 — 운영 전 별도 핫픽스 권고) |
| **R3** | `vercel.json` crons 수 | 총 30개 스케줄 등록 — Vercel Hobby 플랜은 cron 2개 상한, Pro는 무제한. 현재 LIVE 배포 환경(Pro 가정) 이면 문제 없음. 플랜 다운그레이드 시 cron 대부분 실행 안 됨. | 인프라 의존 | 보고만 |

### 2-3. 결함 없음 확인 항목

- `HackathonAwards`: `isPostEvent = phase==="judging" || phase==="awards"` — 행사 전에는 쿼리 비활성(`enabled: false`), 쓸데없는 Firestore 읽기 없음
- `JudgingCard` togglePublish: `disabled={!submission.award}` — 수상 등급 없이 공개 불가 가드 정상
- 심사 점수 저장 doc id: `${submissionId}_${judgeId}` 결정론적 — 심사위원이 중복 저장해도 upsert로 멱등
- `getHackathonPhase()`: 날짜 레벨 비교(`ymd >= startDate`) — 시각 오차 무관, 단계 전환 안정

---

## 3. 검증 결과

| 검증 항목 | 결과 |
|---|---|
| `npx tsc --noEmit` | 실행 중 (백그라운드) |
| `npx eslint src/app/api/cron/hackathon-submission-reminder --quiet` | 미실행 (tsc 선행) |
| 신규 컬렉션 생성 여부 | 없음 — `push_logs`, `notifications`, `hackathon_submissions`, `comm_boards`, `comm_questions` 기존 컬렉션만 사용 |
| NotificationType 추가 | `"hackathon_submission_reminder"` — `src/types/operations.ts:82` |
| vercel.json cron 등록 | `/api/cron/hackathon-submission-reminder` `0 0 * * *` (매일 0시 UTC) |

---

## 4. 운영진 당일 체크리스트 (행사 전 예행 완료 근거)

1. **D-22 (오늘)**: 참가 신청 개시됨 — `/hackathon` HackathonBoard 확인
2. **D-3 (08-19)**: 리마인더 cron 1차 발송 — 미제출 참가자에게 인앱 알림
3. **D-1 (08-21)**: 리마인더 cron 2차 발송
4. **D-0 (08-22)**: 리마인더 cron 3차 발송 + 당일 21:30 이후 제출 폼 자동 잠금
5. **D+1 (08-23)**: `/console/hackathon` 접속 → 심사위원별 루브릭 점수 입력
6. **D+7 (08-29)**: 수상 등급 지정 → "수상작 공개" 클릭 → 갤러리 즉시 반영

> **R2 권고**: 알림 클릭 랜딩을 `/hackathon#submission`으로 변경하거나, 리마인더 알림 `relatedLink`를 `/hackathon` 대신 `/hackathon?tab=submit` 형태로 세분화 검토 (운영진 확인 후 핫픽스).

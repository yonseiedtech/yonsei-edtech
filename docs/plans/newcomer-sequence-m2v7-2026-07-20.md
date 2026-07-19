# 신입 첫 2주 자동 활성화 시퀀스 — v7-M2 구현 명세 (2026-07-20)

> 구현 파일: `src/app/api/cron/newcomer-activation-sequence/route.ts`  
> 실행 주기: 매일 09:00 KST (`vercel.json` schedule `0 0 * * *`)  
> 대상: 현재 학기 코호트(`cohortKeyOf === currentSemesterKey`) 승인 회원  
> 기준일: `users.createdAt` (가입일 KST 기준)

---

## 1. 시퀀스 단계 표

| 단계 | D+N | 알림 제목 | 링크 | 스킵 조건 (퍼널 데이터) |
|------|-----|-----------|------|------------------------|
| d1 | D+1 | 환영합니다! 첫 걸음을 내딛어 볼까요? | `/mypage/edit` | `user.bio` 있음 **AND** `researchInterests + interestKeywords` 1개 이상 |
| d3 | D+3 | 온보딩 체크리스트를 아직 시작하지 않으셨나요? | `/steppingstone/onboarding` | `guide_progress.completedItems` 1건 이상 |
| d7 | D+7 | 내 연구 준비도를 확인해 보세요 | `/diagnosis` | `user_activity_logs` `funnelType=diagnostic` `path=ui:diagnostic/complete` 기록 |
| d10 | D+10 | 교육공학 아카이브를 둘러보셨나요? | `/archive` | `archive_favorites` 1건 이상 |
| d14 | D+14 | 학회와 함께한 첫 2주, 어떠셨나요? | `/steppingstone/onboarding` | 없음 (항상 발송 — 첫 2주 회고) |

---

## 2. 발송 판정 흐름

```
매일 09:00 KST
  ↓
users(approved=true) 전체 조회
  → cohortKeyOf === currentSemesterKey 필터 (현재 학기 신입만)
  ↓
각 STEPS(d1/d3/d7/d10/d14)
  → createdAt 기준 isoToKstYmd + diffYmd 계산
  → dayOffset 일치하는 신입만 추출
  ↓
중복 방지: push_logs/newcomer_seq_{userId}_{step} 존재 여부
  → 이미 있으면 dup++ 스킵
  ↓
스킵 조건 체크 (단계별 퍼널 데이터 조회, 30개씩 in chunk)
  → 완료자 skipSet 에 추가
  ↓
최종 발송 대상(afterDupCheck - skipSet)
  → fanOutNotificationAdmin (인앱 notifications, 항상)
  → sendPushToUsers (웹푸시, fire-and-forget)
  → push_logs 기록 (sent++ 카운트)
```

---

## 3. 중복 발송 방지 규칙

- **레코드 id**: `newcomer_seq_{userId}_{step}` (예: `newcomer_seq_abc123_d7`)
- **컬렉션**: `push_logs` (기존 flashcard-review-reminder 동일 패턴)
- **보장**: 단계당 사용자 1회. cron 장애·재실행에도 중복 없음.
- **필드**: `kind`, `userId`, `step`, `semKey`, `sentAt`

---

## 4. 알림 채널

| 채널 | 방식 | 실패 시 |
|------|------|---------|
| 인앱 notifications | `fanOutNotificationAdmin` (배치 500) | 조용히 warn 로그 (메인 흐름 비차단) |
| 웹푸시 | `sendPushToUsers` | try/catch fire-and-forget, 인앱 알림은 이미 적재 |

- 알림 타입: `newcomer_sequence` (NotificationType 신규 추가)
- 메타데이터: `{ sequenceStep: "d1"|…|"d14", semKey: "YYYY-1"|"YYYY-2" }`
- quiet hours: `sendPushToUsers → filterRecipientsByPreference` 내부에서 자동 준수

---

## 5. 퍼널 데이터 소비 상세

### D+1 (프로필 완성 스킵)
- 소스: `users` 문서 직접 확인 (추가 쿼리 없음)
- 조건: `bio.trim().length > 0` AND `(researchInterests.length + interestKeywords.length) >= 1`

### D+3 (온보딩 시작 스킵)
- 소스: `guide_progress` 컬렉션, `userId in [...]` 쿼리
- 조건: `completedItems` 키 1개 이상

### D+7 (진단 완료 스킵)
- 소스: `user_activity_logs` 컬렉션, `userId in [...]` + `funnelType=diagnostic` 쿼리
- 조건: `path === "ui:diagnostic/complete"` (logDiagnosticEvent("complete") 적재값)

### D+10 (아카이브 즐겨찾기 스킵)
- 소스: `archive_favorites` 컬렉션, `userId in [...]` 쿼리
- 조건: 1건 이상

### D+14 (회고 — 스킵 없음)
- 이유: 첫 2주 마무리 안내는 완료 여부와 무관하게 발송이 의미 있음

---

## 6. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/api/cron/newcomer-activation-sequence/route.ts` | **신규** — 시퀀스 cron 핸들러 |
| `src/types/operations.ts` | `NotificationType`에 `newcomer_sequence` 추가 |
| `src/app/mypage/notifications/page.tsx` | `TYPE_ICONS`, `TYPE_LABELS` 맵에 `newcomer_sequence` 추가 |
| `src/features/notifications/NotificationBell.tsx` | `TYPE_ICONS` 맵에 `newcomer_sequence` 추가 |
| `vercel.json` | `newcomer-activation-sequence` cron 등록 (`0 0 * * *`) |

---

## 7. 검증 결과

- `npx tsc --noEmit`: 에러 0
- `npx eslint src --quiet` (수정 파일 범위): 경고 0

---

## 8. 미구현 / 외부 의존

- 신입 코호트 원천 정확도(`enrollmentYear/enrollmentHalf` 입력 완성도)는 운영진 데이터 입력에 의존
- 푸시 발송 허용률 계측은 v7-M3(다이제스트 추적)과 동일 트랙에서 별도 처리
- 온보딩 페이지 "다음 안내 예정" 소표기 — v7 계획 문서에 명시 없어 과설계 방지 원칙에 따라 미구현

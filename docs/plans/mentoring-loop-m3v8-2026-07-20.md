# M3 멘토링 실사용 루프 점검·강화 — v8 구현 보고서 (2026-07-20)

> 계획: `service-enhancement-plan-v8-2026-07-20.md` M3 항목  
> 범위: `/mentoring`·`mentor-stats`·`notify-question` 기반 표면 실측 → 갭 보정

---

## 1. 실측 루프 표

| # | 루프 단계 | 기존 구현 | 갭 판정 |
|---|---|---|---|
| 1 | 신입 가입 | `newcomer-activation-sequence` D+1~14 넛지(프로필·온보딩·진단·아카이브·2주 회고) | **멘토링 특화 넛지 없음** |
| 2 | 질문 작성 | `/mentoring` Q&A 완비 (v5-M2) — 분야 태그·QuestionComposer·미답변 재부상 3일 | 정상 |
| 3 | 멘토 알림 | `notify-question` — 분야 tag 있는 질문만 해당 분야 멘토(mentorOpen=true)에게 인앱 알림, 일 3회 상한 | 정상 |
| 4 | 멘토 답변·채택 | `QuestionItem` 답변·채택, `mentor-stats` 이력 집계 | 정상 |
| 5 | 운영 관측 (즉시) | `adoption-metrics` `mentoring.questions/answers/resolved` | **미매칭 신입 수·응답률 부재** |
| 6 | 추세화 (주간) | `AdoptionTrendSection` — "멘토링 질문" 스파크라인 | **미매칭 신입 시리즈 부재** |
| 7 | 능동 개선 | `SuggestedActionsSection` — 멘토링 신호 미연결 | 외부의존(알림 정책) 범위로 보류 |

---

## 2. 갭 보정 내역

### 갭 ①: 미매칭 신입 수·응답률 미산출

**파일**: `src/features/insights/adoption-metrics.ts`

- `AdoptionMetrics.mentoring` 블록에 2개 필드 추가:
  - `unmatchedNewcomers: number` — 현재 학기 코호트(cohortKeyOf === currentSemesterKey) 중 멘토링 질문 미작성 회원 수 (-1 = 집계 실패 센티널)
  - `responseRate: number | null` — 답변 있는 질문(answerCount > 0) / 전체 질문 × 100 (null = 질문 없음)
- 기존 멘토링 보드 순회 루프에서 `askerIds`(Set)와 `mWithAnswers` 병행 집계
- `users` 전체 읽기 → `cohortKeyOf` 필터 → 미매칭 집계 (수십 명 규모 — 허용)
- 실패 시 내부 try/catch로 `-1` 센티널 유지, 전체 집계 비차단

**파일**: `src/features/insights/AdoptionSection.tsx`

- "멘토링 질문 / 답변 / 채택" 기존 Stat 유지
- "멘토링 미참여 신입" Stat 추가 (현재 학기, 질문 미작성)
- "멘토링 응답률" Stat 추가 (%, 질문 없으면 "—")

**파일**: `src/features/insights/AdoptionTrendSection.tsx`

- `SERIES`에 `mentoringUnmatched` (멘토링 미참여 신입) 시리즈 추가
- 구버전 스냅샷 필드 없음 → `?? -1` 폴백으로 "—" 표시

---

### 갭 ②: 미참여 신입 주간 멘토링 넛지 cron 없음

**신규 파일**: `src/app/api/cron/mentoring-nudge/route.ts`

| 항목 | 내용 |
|---|---|
| 스케줄 | 월요일 03:00 UTC (12:00 KST) — `vercel.json` 추가 |
| 트리거 패턴 | `withCronLog("mentoring-nudge", _handler)` — M6 cron 관측성 자동 적재 |
| 중복 방지 | `push_logs/mentoring_nudge_{userId}_{weekKey}` — 주 1회 보장 |
| 스킵 조건 | (a) 현재 학기 신입 0명 (b) mentorOpen=true 멘토 0명 (c) 전원 이미 질문 작성 (d) 주간 dedup |
| 알림 타입 | `mentoring_nudge` (신규 `NotificationType`, `NotificationBell`·`notifications/page` 동기화) |
| 발송 상한 | `MAX_RECIPIENTS = 50` — 규모 안전장치 |
| 재사용 패턴 | `cohortKeyOf`·`currentSemesterKey`(semester.ts), `fanOutNotificationAdmin`(notifications-bridge), `push_logs` dedup(newcomer-activation-sequence 동일 패턴) |
| 신규 컬렉션 | 없음 — `push_logs` 기존 컬렉션 재사용 |

**수정 파일**: `src/types/operations.ts`

- `NotificationType` union에 `"mentoring_nudge"` 추가

**수정 파일**: `vercel.json`

- `{ "path": "/api/cron/mentoring-nudge", "schedule": "0 3 * * 1" }` 추가

---

## 3. 수정하지 않은 파일 (계획 준수)

- `weekly-digest` — 수정 금지 (방금 수정됨)
- `content-draft-generator` — 수정 금지 (방금 수정됨)
- `features/kudos` — 수정 금지
- `dashboard` 위젯·`mypage/research/tools` — 수정 금지

---

## 4. 검증

```
npx tsc --noEmit    → 0 errors
npx eslint src --quiet → 0 warnings (--quiet)
```

수정 파일 목록:
- `src/types/operations.ts`
- `src/features/insights/adoption-metrics.ts`
- `src/features/insights/AdoptionSection.tsx`
- `src/features/insights/AdoptionTrendSection.tsx`
- `src/app/mypage/notifications/page.tsx`
- `src/features/notifications/NotificationBell.tsx`
- `vercel.json`

신규 파일:
- `src/app/api/cron/mentoring-nudge/route.ts`
- `docs/plans/mentoring-loop-m3v8-2026-07-20.md` (본 문서)

---

## 5. 기대 효과

1. **관측 완결**: adoption 스냅샷이 "미참여 신입 수"와 "응답률"을 추세화해 멘토링이 실제 가동 중인지 운영진이 숫자로 판단 가능
2. **능동 연결**: 주 1회 넛지로 멘토링을 한 번도 쓰지 않은 신입을 /mentoring으로 안내 — 표면은 있으나 발견 안 된 상태 해소
3. **과알림 방지**: 주간 dedup + mentorOpen 0명 스킵 + 이미 참여한 신입 제외 3단 방어

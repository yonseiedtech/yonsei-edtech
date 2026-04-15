# 자동화 고도화 작업 진행 상황

> 최종 업데이트: 2026-04-13
> 원본 제안서: `C:\Users\rlaeo\.claude\plans\refactored-floating-spring.md`

## ✅ 완료된 작업

### Phase 1 — Quick Win (회비 제외)
- **수료증·감사장 일괄 발급**
  - `src/app/api/certificates/batch/route.ts` (신규)
  - `src/app/admin/certificates/page.tsx` 에 "일괄 발급" 버튼 + Dialog
- **가입 승인 룰 엔진**
  - `src/lib/auth/approval-rules.ts` (신규, `evaluateSignup`, `partitionPending`)
  - `src/features/admin/AdminMemberTab.tsx` 승인 대기 탭에 배지/일괄 승인 버튼
  - **자동 승인 토글** 추가 (localStorage 영속, 규칙 통과자 자동 승인)
- **뉴스레터 예약 발송**
  - `NewsletterIssue` 에 `publishAt?: string` 필드
  - `src/features/admin/AdminNewsletterTab.tsx` "예약 발송" 체크박스 + datetime-local
  - `src/app/api/cron/newsletter-publisher/route.ts` (cron, Vercel Hobby 제한으로 일 1회 `0 0 * * *`)

### 기타 개선
- **세션 타이머 버그 수정**: `src/features/auth/useSessionTimer.ts` — 로그인 시 `lastActivity`를 현재 시각으로 리셋 (stale 타임스탬프로 즉시 로그아웃되던 버그)
- **세션 표시 HH:MM:SS** 포맷
- **메인 페이지 인터랙티브**: `src/components/home/InteractiveWrap.tsx` — ScrollProgressBar + InteractiveBackdrop + Reveal
- **홍보게시판 흰박스** 정합: `src/components/home/PromotionPreview.tsx`
- **연사 인터랙티브 카드**: `src/components/home/GuestSpeakersSection.tsx` (260×360 세로 카드, 3D tilt, 가로 스크롤)

### Task B — 관리자/운영진 메뉴 통합
- **`/console` 통합 셸** 신설: `src/app/console/layout.tsx` + `src/app/console/page.tsx`
  - 6그룹 사이드바: 일일 운영 / 학술활동 / 회원 / 인수인계 / 인사이트 / 시스템
  - 역할별 가시성 (president+ 전용 그룹 분리)
- **Thin re-export 페이지 19개** (`src/app/console/**/page.tsx`) — 기존 `/admin/*`, `/staff-admin/*` 페이지 재사용
- **리다이렉트** (`next.config`): `/admin/*` & `/staff-admin/*` → `/console/*` (307)
- **Header 네비** `/console` 링크로 변경

### Vercel 인프라 정리
- `yonseiedtechs-projects` 계정의 중복 프로젝트 삭제 (실패 이메일 원인)
- 단일 배포 경로 확정: `kimdaekyoungs-projects` + `npx vercel --prod`

---

## ⏳ 미작업 (Task C — 자동화 퀵윈 5종)

우선순위 순서. 각각 ≤1일 공수 예상.

### 3) 문의 LLM 자동초안
- **목적**: 미답변 문의에 LLM이 초안 답변 생성해 관리자 검토 큐에 적재
- **신규**: `src/app/api/inquiries/draft/route.ts`
- **수정**: `src/app/admin/inquiries/page.tsx` — "AI 초안 생성" 버튼
- **재사용**: 기존 `api/ai/inquiry-reply` 라우트 (이미 LLM 연동됨)

### 4) 세미나 D-3 체크리스트 자동화
- **목적**: 세미나 시작 3일 전에 To-Do 항목 자동 생성 (장소/발표자 확인, 공지 발송)
- **신규**: `src/app/api/cron/seminar-checklist/route.ts`
- **수정**: `vercel.json` cron 추가
- **재사용**: 기존 `api/cron/seminar-reminder` 패턴

### 5) 리뷰 미작성 자동 넛지
- **목적**: 세미나 참석자 중 48h 내 리뷰 미작성자에게 알림
- **신규**: `src/app/api/cron/review-nudge/route.ts`
- **재사용**: `features/notifications/notify.ts` fan-out

### 6) 승인대기 SLA 알람
- **목적**: 승인 대기 48h 초과 시 운영진 알림 + 대시보드 뱃지
- **신규**: `src/app/api/cron/pending-sla/route.ts`
- **수정**: `src/app/console/page.tsx` 뱃지

### 7) 감사로그 주간 다이제스트
- **목적**: 매주 월요일 회장에게 주요 액션 요약 이메일
- **신규**: `src/app/api/cron/audit-digest/route.ts`
- **재사용**: 기존 `features/audit/*` + 이메일 라우트

---

## ⏳ 미작업 (Phase 2/3 — 원본 제안서)

### Phase 2
- 세미나 운영 워크플로우 엔진 (12단계 칸반: `lib/workflow/seminar-pipeline.ts`)
- 회장단 인수인계 위저드 자동화 (6-step 위저드 + PDF 리포트)
- 운영진 KPI 임계 알림 (`lib/kpi/thresholds.ts`)

### Phase 3
- AI 운영 비서 v2 (회원 추천 / 위험 회원 식별 / 학기 회고 자동)
- 대외 홍보 자동 파이프라인 (보도자료 + SNS + 블로그 멀티채널)
- 공급망 CRM (연사/스폰서/교수 매칭)

### 제외 (사용자 명시)
- **회비(Payments) 자동 매칭** — 당분간 구현 보류

---

## 다음 세션 시작 가이드

1. 이 문서 먼저 읽기: `C:\work\yonsei-edtech\docs\AUTOMATION_PROGRESS.md`
2. 원본 제안서 참조: `C:\Users\rlaeo\.claude\plans\refactored-floating-spring.md`
3. 기본 명령:
   - "Task C 진행해줘" → 자동화 퀵윈 5종 일괄 또는 개별 구현
   - "Phase 2 시작해줘" → 세미나 워크플로우 엔진부터
4. 배포는 반드시 `npx vercel --prod` (kimdaekyoungs 계정). GitHub Actions 배포 금지.
5. 로그인 재수행 필요 여부: `vercel whoami` 체크 후 kimdaekyoung이 아니면 `vercel login`.

---

## 운영 중 주의사항

- **뉴스레터 예약 발송**: Hobby 플랜 제한으로 일 1회(00:00)만 실행. 분·시간 단위 예약 정확도 원하면 Pro 업그레이드.
- **자동 승인 토글**: 브라우저 localStorage 기반이라 관리자별로 설정이 분리됨. 팀 공용 설정 원하면 site-settings로 이관 필요.
- **`/admin/*`, `/staff-admin/*` 원본 파일**: 삭제하지 않고 `/console/*`에서 re-export로 재사용 중. 삭제 시 `/console/*`도 깨짐.

# 색상 부채 상환 라운드 5

**날짜:** 2026-07-20  
**범위:** `src/app/console/`, `src/components/admin/`, `src/features/admin/`  
**baseline 전후:** 390 → 347 파일 (43개 제거)

---

## 치환 규칙 (라운드 3·4 동일)

| 원본 팔레트 | 시맨틱 토큰 |
|---|---|
| emerald | success |
| blue / sky / indigo | info |
| amber / orange | warning |
| rose / red | destructive |
| violet / purple | cat-5 |
| slate | muted / muted-foreground |
| dark: 변형 | 제거 (CSS var 자동 적응) |
| teal, cyan, yellow, green, pink, fuchsia, gray, zinc, neutral, stone | 유지 |

---

## 수정 파일 목록 (이번 라운드)

### src/components/admin/
- `StatusBadge.tsx` — ROLE_COLORS rose→destructive, blue/sky→info, slate→muted

### src/features/admin/
- `AdminGreetingTab.tsx` — 삭제 버튼 red→destructive
- `AdminInquiryTab.tsx` — 상태 배지 amber→warning
- `HandoverSection.tsx` — PRIORITY_COLORS red/amber→destructive/warning
- `AdminPostTab.tsx` — 카테고리 색상 amber/emerald→warning/success
- `AdminTodoTab.tsx` — STATUS_CONFIG slate/blue→muted/info; PRIORITY_CONFIG red/amber/blue→destructive/warning/info
- `AdminSeminarTab.tsx` — STATUS_COLORS blue/amber/red→info/warning/destructive
- `AdminMemberTab.tsx` — ROLE_COLORS; 행/카드 상태; 배지; 위험도 색상
- `settings/ActivityList.tsx` — 삭제 버튼 red→destructive
- `settings/FieldsSection.tsx` — amber/emerald 레이블
- `settings/HistorySection.tsx` — red→destructive
- `settings/OrgChartEditor.tsx` — red→destructive
- `settings/PastPresidentsSection.tsx` — red→destructive

### src/app/console/
- `agent-board/page.tsx` — COLUMNS/STAGE_COLOR/배지 emerald/rose/blue→success/destructive/info
- `agent-workflows/page.tsx` — STAGE_STATUS_META; statusColor; 진행바; 오류 패널
- `alumni-mapping/page.tsx` — bg-emerald-50→bg-success/5
- `ai-forum/page.tsx` — STATUS_LABEL slate/amber/emerald→muted/warning/success
- `courses/page.tsx` — text-emerald→text-success
- `feedback/page.tsx` — STATUS_COLORS; CATEGORY_COLORS
- `academic/external/[id]/workbook/page.tsx` — red 오류 레이블→destructive
- `graduation/page.tsx` — emerald 배지→success
- `handover/report/page.tsx` — PRIORITY_COLORS red/amber→destructive/warning
- `research/page.tsx` — emerald 칩→success
- `research/journal/page.tsx` — red/blue 카드 테두리→destructive/info
- `research/[userId]/page.tsx` — emerald 배지→success
- `steppingstone/page.tsx` — amber 박스→warning
- `academic/seminars/[id]/page.tsx` — STATUS_META blue/slate/red→info/muted/destructive; 진행바 amber→warning
- `archive/foundation-terms/page.tsx` — emerald/rose 배지→success/destructive
- `archive/research-methods/page.tsx` — emerald/rose 배지→success/destructive
- `archive/statistical-methods/page.tsx` — emerald/rose 배지→success/destructive
- `archive/writing-tips/page.tsx` — emerald/rose 배지→success/destructive
- `archive/review-queue/page.tsx` — badgeClass sky/violet/emerald/amber→info/cat-5/success/warning
- `archive/page.tsx` — info 박스/warning 박스/배지 전체
- `applicant-link-by-studentid/page.tsx` — amber/blue/rose 박스→warning/info/destructive
- `cron-logs/page.tsx` — stale 배너; KIND_LABELS; 결과 카운트
- `journal/page.tsx` — StatCard amber/violet; 이슈 상태; 미배정 배지
- `labs/page.tsx` — STATUS_COLOR draft/testing/feedback/approved
- `labs/[id]/page.tsx` — 삭제 버튼 red→destructive
- `members/[id]/page.tsx` — ROLE_COLORS; 거절/대기 배지; 승인 박스
- `members/migrate-teacher-affiliation/page.tsx` — emerald 배지→success
- `networking/page.tsx` — 미게시/비공개 배지; 대기자/노쇼 카운트; 체크인 버튼; 결제 상태
- `onboarding-checklist/page.tsx` — info 박스; 삭제 버튼; 오류; accentClass; PriorityBadge
- `portfolio-verification/page.tsx` — 승인/거절 버튼; 카운트 배지
- `potential-members/page.tsx` — 점수 클래스; info/success/error 박스
- `roadmap/page.tsx` — 접근 거부 박스 amber→warning; 게시 배지 emerald→success
- `layout.tsx` — 사이드바 배지 red→destructive; ReviewQueueBanner amber→warning
- `page.tsx` — StatCard colors; 대기/모니터링/봉사/세션/과제물 카드
- `academic/applications/page.tsx` — 가입 신청 배너 amber→warning; StatCard 색상
- `academic/external/[id]/session-analytics/page.tsx` — StatCard emerald/amber/blue; 진행바; 별점
- `academic/external/[id]/volunteers/AvailabilityTimeGrid.tsx` — 부족/여유 범례; 슬롯 셀 rose/emerald→destructive/success
- `academic/external/[id]/volunteers/VolunteerCard.tsx` — 비회원 배지 amber→warning; 체크박스/저장 버튼 emerald→success
- `academic/external/[id]/volunteers/page.tsx` — StatCard; 비회원 배지; 배정됨 배지
- `academic/external/[id]/volunteers/volunteer-utils.ts` — ROLE_COLORS 6종 전체
- `academic/external/[id]/speakers/AssignmentDialog.tsx` — 체크박스; violet/amber/rose 섹션 박스
- `academic/external/[id]/speakers/SpeakerCard.tsx` — 비회원 배지; 체크박스; violet/amber/rose 역할 태그
- `academic/external/[id]/speakers/page.tsx` — StatCard violet/rose/emerald; 비회원 배지; 배정됨 배지
- `academic/external/[id]/reviews/page.tsx` — StatCard amber/emerald/blue; 별점 text-amber→text-warning

---

## 검증 결과

| 항목 | 결과 |
|---|---|
| baseline 재생성 | 347개 파일 (390 → 347, -43) |
| `npx tsc --noEmit` | exit 0 (오류 없음) |
| `npx eslint src --quiet` | exit 0 (오류 없음) |

---

## 제외 항목 (의도적 유지)

- `AdminNewsletterTab.tsx` — 뉴스레터 에디터 색상 프리셋 (기능적 색상 선택, 시맨틱 아님)
- `roadmap/page.tsx` COLOR_KEYS 배열 — 사용자 선택 색상 프리셋 문자열 (CSS 클래스 아님)
- teal, cyan, yellow, green, pink, fuchsia, gray, zinc, neutral, stone — 규칙상 유지

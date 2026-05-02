# Daily Engagement Initiative (Sprint 51 ~ 56)

> 대학원 재학생이 **수업 전 · 수업 후 · 일상 자투리 시간**에 자주 들어와 활동하도록, 6개 스프린트로 점진 고도화한다.

- **시작**: 2026-05-02
- **목표**: DAU·주간 방문 횟수·후기/댓글 작성 수 의미 있는 상승
- **전제**: 정보 인프라(세미나·이메일·인앱 알림)는 이미 견고함 → **인터랙션 루프, 재호출 트리거, 소셜 시그널**의 공백을 채운다.

---

## 0. 진단 요약 (선행 분석)

| 시나리오 | 현재 점수 | 핵심 공백 |
|---|---|---|
| A. 수업 30분 전 모바일 진입 | 6/10 | 카운트다운/Next Action 신호 부재, 모바일 폰트·터치 영역 부족 |
| B. 수업 직후 후기·정리 | 5/10 | 세미나 후기 루프는 완벽하나 **정규 강의 후기·노트 루프 부재** |
| C. 자투리 시간 모바일 빠른 확인 | 4/10 | 푸시 알림 0종, 동료 활동 피드 0건, PWA 설치 후 재호출 트리거 없음 |

**전략**: 강의 사이클 인터랙션(P0) → 푸시·이메일 재호출(P1) → 소셜·게임화(P2) 순으로 쌓는다.

---

## 1. 스프린트 로드맵

| # | Sprint | 포커스 | 주요 산출물 | 우선순위 | 예상 공수 |
|---|---|---|---|---|---|
| 51 | 즉시 UX 개선 | A 시나리오 | NextActionBanner + 모바일 폰트/터치 sweep | P0 | S |
| 52 | 강의 후기 루프 | B 시나리오 | course_todo `lecture-review` 유형 + 인라인 한 줄 후기 + course_reviews 자동 연동 | P0 | M |
| 53 | Web Push 인프라 | C 시나리오 | FCM web push 토큰 등록 + 3종 알림(수업 30분 전 · 출석 마감 · 댓글) | P1 | L |
| 54 | 주간 다이제스트 이메일 | C 시나리오 | 매주 월 09:00 cron, 미참여 회원 포함 도달 | P1 | M |
| 55 | 활동 피드 (미니 소셜) | C 시나리오 | Dashboard "동료의 최근 활동" + visibility 토글 | P1 | M |
| 56 | 학습 스트릭/잔디밭 | 게임화 | MyPage 365일 활동 그리드 + 마일스톤 토스트 | P2 | M |

> S = ≤1d, M = 2~3d, L = 4d+
>
> ※ 초기 후보였던 "챗봇 데일리 어시스턴트", "강의별 주간 디스커션 룸"은 본 이니셔티브에서 제외(추후 별도 검토).

---

## 2. 스프린트별 상세

### Sprint 51 — 즉시 UX 개선
**목표**: 모바일 1차 인상에서 "지금 뭘 해야 하는가"가 즉각 보이게 한다.
- `components/home/NextActionBanner.tsx` 신설
  - 다음 일정(수업/세미나/마감 todo)까지 D-counter, 카드 CTA(강의계획서·체크리스트)
  - sticky 배너로 dashboard 상단 배치 (Bell 토글 적용)
- 모바일 sweep
  - Calendar `text-[10px]` → `text-xs`
  - 터치 영역 ≥44×44 보장 (회원관리·courses CourseRow 포함)
  - DailyClassTimelineWidget 가로 스크롤 또는 모바일 카드 폴백
- **Acceptance**: 모바일 Lighthouse "Tap targets" 통과, 신규 NextActionBanner 표시 e2e 시나리오 1건

---

### Sprint 52 — 강의 후기 루프
**목표**: 세미나에만 있는 후기 사이클을 "정규 강의"로 확장.
- `course_todo` schema에 `kind: 'lecture-review' | 'assignment'` 추가 (기존 데이터 호환)
- 매주 강의 종료 시각 +30분 cron → 수강자에게 `lecture-review` todo 자동 생성
- `MyTodosWidget` 수업 탭에 한 줄 후기 인라인 입력 → `course_reviews`로 자동 적재
- `/courses` 강의 카드의 후기 평균/최근 후기 표시 부분과 자동 연동(이미 컬렉션 존재)
- **Acceptance**: 강의 종료 후 todo 생성 → 한 줄 입력 → /courses 탭에서 후기 노출 e2e

---

### Sprint 53 — Web Push 인프라
**목표**: PWA 설치자에게 푸시로 다시 끌어오는 채널 확보.
- FCM web push 활성화: `firebase` SDK 그대로 활용, `lib/push.ts` 신설
- 토큰 등록: 회원 가입/로그인 시 권한 요청 (한 번만 dismissible)
- Cloud Function 또는 vercel cron 3종 첫 alert
  1. 수업 30분 전 (수강·청강 등록자)
  2. 활동 출석 체크 마감 임박 D-1
  3. 본인 글에 댓글 달림
- 실패 토큰 정리 cron(주 1회)
- **Acceptance**: 데스크톱 Chrome + Android Chrome 두 환경에서 푸시 수신 확인, 실패 처리 로직 단위 테스트

---

### Sprint 54 — 주간 다이제스트 이메일
**목표**: attendeeIds 기반 개별 알림에 도달하지 못하는 미참여자 회복.
- 매주 월 09:00 KST cron
- 콘텐츠: 신규 세미나 5개 + 인기 글 3개 + 추천 활동 3개 (룰 기반)
- 수신 동의 토글: profile.notificationPrefs.weeklyDigest (default true, 미설정 시 첫 발송 후 1회 안내)
- email_logs 중복 방지 로직 그대로 재사용
- **Acceptance**: dry-run 모드로 본인 1명 테스트 발송 후 검증, unsubscribe 링크 정상 동작

---

### Sprint 55 — 활동 피드 (미니 소셜)
**목표**: 동료의 최근 활동을 보여 "남이 하니 나도" 동기 부여.
- Dashboard 섹션 "동료의 최근 활동" (최근 7일, 10건)
- 표시 항목: "○○가 X 세미나 후기 작성", "△△가 Y 스터디 모집", "□□가 Z 글 작성"
- profile-visibility.ts에 `feedOptIn` 토글 추가, default true (운영진은 항상 노출)
- 클릭 시 해당 콘텐츠로 이동
- **Acceptance**: visibility opt-out 설정 시 피드 미노출 검증, 페이징 cursor

---

### Sprint 56 — 학습 스트릭/잔디밭
**목표**: 누적 활동을 시각화해 심리적 유인 부여.
- MyPage 홈 상단 GitHub식 365일 그리드
- 가중치: 세미나 출석 +10, 후기 작성 +5, 글 작성 +5, 타이머 30분 +3, 댓글 +1
- 연속 출석 streak 카운터 (주 단위)
- 마일스톤 토스트: 5주 streak / 월 10건 활동 / 학기 100점 등
- **Acceptance**: 임의 사용자 데이터로 그리드 렌더링 검증, streak 계산 단위 테스트

---

## 3. 운영 규칙

- **PDCA**: 각 스프린트 = `/pdca plan` → `/pdca design` → `/pdca do` → `/pdca analyze` → `/pdca report` 1사이클
- **커밋 규칙**: Sprint N 완료 시 단일 commit, 메시지에 `[Sprint N]` 접두사
- **WORK_LOG.md** 업데이트 + MEMORY.md `project_yonsei_*_2026_*.md` 항목 추가 (한 줄 인덱스)
- **배포**: 각 스프린트 완료 즉시 `npx vercel --prod` (CLI 직접 배포, GitHub Actions 사용 금지)
- **테스트**: 각 스프린트 acceptance 항목 1건 이상 e2e 또는 수동 검증

---

## 4. 다음 액션

- Sprint 51부터 순차 시작
- 각 스프린트 시작 전 사용자 confirm
- 변경/우선순위 조정 자유


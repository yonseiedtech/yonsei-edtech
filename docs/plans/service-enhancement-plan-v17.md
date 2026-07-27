# 연세교육공학회 서비스 고도화 백로그 v17 — "운영 자동화 · 연결 측정 · 여정 완주" (2026-07-27)

> 작성: 수석 서비스 플래너 (코드 실측 기반 · 채팅 인터뷰 없음)
> 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app)
> 실측 일자: 2026-07-27
> 직전 완료 흐름(v16 전량 LIVE): 개설 대기 수요 자동감지(운영진 홈 4번째 처리대기원 · `useStaffReviewQueue`·`useOpeningDemands`) · 진단약점→가이드/스터디 브릿지(`DiagnosisGuideBridge`) · 러닝가이드 이어읽기(`ContinueReadingCard`·`/api/guide-progress?mine=true`) · 참여자 수요 상태추적+발견성(`DemandInterestCard`·Header/command-routes 진입점) · 가이드 상호참조(`GuideRelated`) · 콘솔 개설 전환집계 · rawcolor 라운드5 · ESLint 263→212 · deadcode 26→13

---

## 0. 재제안 금지선 · 기술 부채 게이트 (실측 갱신값)

### 0-1. 기술 부채 래칫 (2026-07-27 실측)

| 지표 | 현재 CEILING | 스크립트 | v16 대비 |
|---|---|---|---|
| ESLint warning | **212** | `scripts/check-eslint-warning-ratchet.mjs:33` (`const CEILING = 212`) | 263→212 (v16-M1 완료) |
| raw color 파일 | **1** (`design-tokens.ts` 만 허용) | `scripts/check-rawcolor-ratchet.mjs` | 유지 |
| knip deadcode | **13** (`scripts/deadcode-baseline.json`) | `scripts/check-deadcode-ratchet.mjs` | 26→13 (v16-M2 완료) |

> 배포 게이트: 세 래칫 전량 PASS + `tsc` + `build`(prebuild=rawcolor+warning ratchet) + 배포 후 QA 스모크(운영진 홈·수요조사 탭·러닝 가이드 서재/뷰어·마이페이지·진단 결과). 배포는 `npm run deploy:vercel`(토큰). 신규 기능은 **DB/rules 무변경 우선**, 불가피할 때만 firestore.rules 명시 변경 후 배포. **신규 eslint 경고 0 · 시맨틱 토큰(`var(--color-*)`/`cat-*`/`text-*` 등)만.**

### 0-2. v16 완료로 간주 (재제안 금지)

- **개설 대기 수요 자동감지** — `useStaffReviewQueue.ts`(4번째 집계원 `개설 대기 수요` · `href:/console/demand`) · `useOpeningDemands.ts`(홈 미니리스트 상위 5건). H1·M8 LIVE.
- **진단→가이드/스터디 브릿지** — `components/diagnosis/DiagnosisGuideBridge.tsx`·`DiagnosisReport.tsx`. H2 LIVE.
- **러닝가이드 이어읽기** — `features/mypage/ContinueReadingCard.tsx`·`/api/guide-progress?mine=true`. H3 LIVE.
- **참여자 수요 상태추적+발견성** — `features/mypage/DemandInterestCard.tsx`·`command-routes.ts`·Header 진입점. H4 LIVE.
- **가이드 상호참조** — `features/learning-guides/GuideRelated.tsx`. M6 LIVE.
- **콘솔 개설 후 전환집계 · 운영진 홈 딥링크 · rawcolor 라운드5 · 종강 후 수업 표시 가드**(`TodaySummaryCard`·`NextActionBanner`). LIVE.

### 0-3. v16 이월·데이터 대기 (v17 재배치)

- **v16-L2 수요조사 학기 회고**: 미착수 → v17 **M6** (학기 경계 데이터 대기 유지, 뷰 골격만 선착수 가능)
- **v16-L3 img→Image 잔여**: 미확인 → v17 **L1**
- **v16-L4 논문 여정 진행률 시각화**: 미착수 → v17 **L2**
- **8~10월 이벤트 데이터 도래 항목**(cron 임계경보·web_vitals 목표선·kudos 리더보드·개설 전환율 기준선·해커톤 회고): §6 데이터 대기 유지

---

## 1. v17 핵심 명제

> v16까지 서비스는 **연결(Weave)**을 끝냈다 — 진단·가이드·수요·스터디가 서로를 참조하고, 회원은 마이페이지에서 자기가 남긴 관심을 회수한다. 그러나 실측하면 세 가지가 비었다. **(1) 운영진의 반복 수작업이 자동화되지 않았다.** 리마인더 cron은 25종+ 있지만(§실측) *발송 대상이 확정된 후*의 알림일 뿐, 운영의 첫 병목인 **"다음 모임/스터디/세미나를 언제 할지 정하기(일정조율)"**는 회원 대상 `NetworkingPoll`(when2meet 캘린더 히트맵)이 이미 완성돼 있음에도 **운영진 내부·프로젝트·스터디 일정 잡기에는 재사용되지 못한다**(이벤트 타입이 개강/종강/정기/수시/MT/기타 6종의 사교 행사 전용). **(2) v16이 심은 연결고리가 실제로 쓰이는지 측정할 표면이 없다.** 진단→가이드 클릭, 가이드 완독률, 수요→개설 전환은 각각의 페이지에 흩어져 있고, `console/insights`·retention/adoption/loyalty cron이 있음에도 "연결 KPI 한 장"이 없어 다음 기획 근거가 감(感)에 의존한다. **(3) 회원 여정이 단계별로만 완결되고 완주가 유도되지 않는다.** 온보딩·진단·학습·활동이 각 위젯으로 존재하나, "여기까지 왔고 다음은 이것"이라는 완주 넛지가 통합돼 있지 않다. v17의 각도를 **"운영 자동화(Automate) · 연결 측정(Measure) · 여정 완주(Complete)"** 로 잡는다. **핵심은 이미 만든 자산(NetworkingPoll·cron·insights·여정 위젯)의 재사용/봉합이며, 대부분 DB/rules 무변경 — 옵셔널 필드 1개·기존 집계 쿼리·라우트 파라미터로 해결된다.**

### 1-1. v17 실측 갭 (2026-07-27 기준)

| # | 렌즈 | 실측된 갭 | 근거(파일) |
|---|---|---|---|
| ① | **일정조율 자산의 운영진 미재사용** | `NetworkingPoll`(캘린더 히트맵·게스트 투표·자동/수동 확정)이 사교 행사(`NetworkingEventType` 6종)에만 묶여, 운영진 내부회의·프로젝트·스터디 다음 회차 일정 잡기에 못 쓴다. 운영진은 카톡/수기로 일정을 조율한다 | `features/networking/NetworkingPoll.tsx` · `types/networking.ts:6,27` · `app/console/networking/page.tsx` |
| ② | **v16 연결고리 사용 측정 부재** | 진단→가이드 클릭·가이드 완독률·수요→개설 전환이 각 페이지에 흩어짐. `console/insights`·retention/adoption cron 있으나 "연결 KPI 한 장" 없음 → 기획 근거가 감에 의존 | `app/console/insights/*` · `api/cron/analytics-retention`·`adoption-snapshot`·`loyalty-snapshot` · v16 브릿지 컴포넌트들 |
| ③ | **회원 여정 완주 넛지 분산** | 온보딩·진단·학습·활동이 각 위젯으로만 존재. "온보딩→진단→가이드→활동 완주율"과 다음 단계 유도가 통합 안 됨 | `dashboard/NewcomerProgressWidget`·`DiagnosisReadinessWidget`·`InactivityCoachingCard`·`ContinueReadingCard` 산재 |
| ④ | **리마인더 cron 관제 부재** | 리마인더/넛지 cron 25종+(`study-session-reminder`·`seminar-reminder`·`networking-reminder`·`mentoring-nudge`·`deadline-reminder` 등)이 개별 실행. 운영진이 "무엇이 언제 누구에게 발송됐는지" 한 화면에서 못 본다 | `app/api/cron/*`(25종+) · `console/cron-logs` 존재하나 발송 결과 집계 뷰 부재 |
| ⑤ | **참석/출석 관리 수기** | 세미나·스터디 회차 출석 확인이 자동 표면화 안 됨(RSVP는 있으나 실제 출석 체크·노쇼 추적 부재). networking `AttendeeRoster`는 사교 행사 전용 | `features/networking/AttendeeRoster.tsx`·`StaffAttendeeManager.tsx`(사교 전용) · study/seminar 출석 미표면 |
| ⑥ | **ESLint 감축 정체 위험** | 212로 낮췄으나 신학기 대량 커밋 전 추가 상환 없으면 재상승. 상위 집중 규칙(`no-explicit-any`·`no-array-index-key`·잔여 exhaustive-deps 억제) 미해소 | `check-eslint-warning-ratchet.mjs:33` CEILING=212 |
| ⑦ | **deadcode 잔여 13건** | CEILING=13은 회귀 차단이지 감축이 아님. push/notify 예약 export 판단 후 안전 삭제 여지 | `deadcode-baseline.json`(13건) |
| ⑧ | **exhaustive-deps 안전성 미검토** | 억제 주석으로 통과한 `react-hooks/exhaustive-deps`가 stale closure/누락 리페치 잠재 결함 가능. 안전 검토 안 됨 | 전역 억제 주석 산재 |
| ⑨ | **가이드 완독→활동 전환 약함** | `GuideRelated`가 관련 칩은 걸었으나 "완독 직후" 다음 행동(관련 스터디 수요·세미나) 유도가 약함. 완독=리텐션 정점인데 회수 미흡 | `learning-guides/GuideRelated.tsx` · 완독 시점 CTA |
| ⑩ | **LCP/이미지 최적화 잔여** | `@next/next/no-img-element` 억제 잔존 파일로 LCP 손해 가능. 고빈도 노출 이미지 우선 전환 필요 | v16-L3 이월 |

---

## 2. 고도화 백로그 (v17 · 16항목)

---

### High (즉시 착수 · 운영 자동화/측정 직결 · 외부 의존 없음)

---

**H1. 운영진 일정조율 투표 — `NetworkingPoll`/availability 재사용 (갭① · 운영 자동화 핵심 · ★강제 항목)**
- **문제/기회**: 회원용 `NetworkingPoll`(캘린더 when2meet 히트맵·게스트 투표·자동/수동 확정·`/gatherings/poll/[id]` 공유·`/api/networking/availability-tally` 게스트 집계)이 완성돼 있으나, 이벤트 타입이 사교 행사 6종(`opening|closing|regular|casual|mt|other`) 전용이라 **운영진 내부회의·프로젝트 미팅·스터디 다음 회차·세미나 후보일 잡기에 재사용되지 못한다**. 운영의 첫 병목("언제 모일지")이 여전히 수기 조율이다. 이미 만든 자산을 운영진 콘솔로 확장하면 신규 데이터모델·UI 없이 즉시 일정조율 자동화가 가능하다.
- **개선안**:
  1. `NetworkingEvent`에 **옵셔널·하위호환 `internal?: boolean`** 추가(미설정=false → 기존 사교 행사와 100% 동일 동작). true면 공개 `/gatherings` 목록·`MyGatheringsStrip`에서 필터링 제외(운영진만 보이는 내부 조율).
  2. 콘솔(`console/networking`)에 "운영진 일정조율" 섹션 — `EventEditorForm`에 `internal` 토글 + poll 기간/시간대 입력 재사용. 생성 즉시 `NetworkingPoll`을 `canEdit=true`로 임베드(공유 링크는 기존 `/gatherings/poll/[id]` 그대로 → 운영진끼리 URL 공유 투표).
  3. (선택) 프로젝트/스터디 연결: `internal` 이벤트에 `linkedProjectId`(옵셔널) 부여 시 `StaffProjectsTab`·개설 스터디 상세에서 "다음 회차 일정조율" 진입점 노출.
  4. 목록 필터는 **읽기 측 방어 우선**(공개 조회 쿼리에서 `internal!==true` 필터) — rules 변경 없이 노출 차단. 민감정보 아님(후보 날짜뿐)이라 rules 변경 불필요.
- **영향 파일**: `src/types/networking.ts`(옵셔널 필드) · `src/features/networking/EventEditorForm.tsx`(토글) · `src/app/console/networking/page.tsx`(내부 조율 섹션) · `src/app/gatherings/page.tsx`·`src/features/networking/MyGatheringsStrip.tsx`(공개 목록 `internal` 필터) · (재사용, 무변경) `NetworkingPoll.tsx`·`networking-utils.ts`·`/api/networking/availability-*`
- **제약**: **DB/rules 무변경**(옵셔널 필드는 스키마리스 Firestore에 하위호환·공개 필터는 읽기 측) · 시맨틱 토큰만 · 신규 eslint 경고 0
- **검증**: 콘솔에서 `internal` 조율 이벤트 생성 → 공개 `/gatherings`·마이페이지에 미노출 확인 · 운영진이 poll 응답·확정 동작 확인 · 공유 링크 `/gatherings/poll/[id]` 로 다른 운영진 투표 확인 · 기존 사교 행사(`internal` 미설정) 회귀 없음 확인
- **복잡도**: **M**

---

**H2. v16 연결고리 전환·리텐션 측정 대시보드 (갭② · 연결 측정 핵심)**
- **문제/기회**: v16이 심은 연결고리(진단→가이드, 가이드 이어읽기/완독, 수요→개설, 참여자 상태추적)가 실제로 쓰이는지 측정할 "한 장"이 없다. `console/insights`·`analytics-retention`/`adoption-snapshot`/`loyalty-snapshot` cron이 데이터를 쌓고 있으나 v16 연결 KPI로 집계되지 않아 다음 기획이 감에 의존한다. 측정 없이는 v18 우선순위를 못 정한다.
- **개선안**:
  1. `console/insights`에 "연결 지표(Weave KPI)" 패널 신규 — (a) 러닝 가이드 진행/완독: `guide_progress` 집계로 시작 N·완독 M·완독률 (b) 수요→개설 전환: demand 보드 `status` 분포(collecting→reviewing→designing→opened)·개설 후 실참여(v16 M4 집계 재사용) (c) 진단 후속행동: 진단 완료 대비 가이드/수요 CTA 클릭(초기엔 진단 완료 수·약점 태그 분포만, 클릭 이벤트는 X2 로깅 도입 후)
  2. 기존 스냅샷 cron 산출물(`adoption-snapshot`·`loyalty-snapshot`) 재활용 — 신규 cron 없이 읽기 집계 우선. 표본 미달 시 "데이터 부족" 레이블.
  3. 숫자는 절대값+비율(전환율) 병기, 시맨틱 색 뱃지(양호/주의).
- **영향 파일**: `src/app/console/insights/analytics/**` 또는 신규 `insights/weave/page.tsx` · `src/features/learning-guides/api.ts`(집계 헬퍼 읽기 재사용) · demand 조회 재사용 · (읽기) `api/cron/adoption-snapshot` 산출 컬렉션
- **제약**: DB/rules 무변경(읽기 집계) · 운영진 전용 표면 · 시맨틱 토큰만 · eslint 0 · 클릭 이벤트 로깅은 X2(외부 의존)로 분리
- **검증**: 가이드 진행 데이터 있는 상태에서 완독률 정확 표시 · 수요 status 분포가 실제 보드와 일치 · 표본 0에서 "데이터 부족" 안전 표시
- **복잡도**: **M**

---

**H3. 회원 여정 완주 넛지 통합 — 온보딩→진단→학습→활동 (갭③ · 여정 완주)**
- **문제/기회**: 온보딩(`NewcomerProgressWidget`)·진단(`DiagnosisReadinessWidget`)·학습(`ContinueReadingCard`)·비활동 코칭(`InactivityCoachingCard`)이 각 위젯으로만 존재해, 회원이 "여정 어디에 있고 다음이 무엇인지"를 한눈에 못 본다. 단계별 완결은 되나 완주가 유도되지 않아 중도 이탈이 방치된다.
- **개선안**:
  1. 대시보드에 "나의 여정" 통합 스텝퍼 위젯 1개 — 4단계(가입/프로필 완성 → 진단 완료 → 가이드 학습 시작 → 활동(스터디·세미나·수요) 참여) 각 완료 여부를 기존 소스로 판정(프로필 approved·진단 결과 존재·`guide_progress` 존재·participants/likes 존재).
  2. 미완 단계에 단일 다음행동 CTA(진단 안 했으면 "3분 진단하기" → `/diagnosis`, 진단했으면 "약점 가이드 보기" 등). 기존 위젯을 대체가 아니라 **오케스트레이션**(중복 위젯은 접힘/보조로 강등).
  3. 완주자에겐 "멘토 되기·수요 남기기" 등 활동 심화 CTA(리텐션 상향).
- **영향 파일**: 신규 `src/features/dashboard/JourneyStepperWidget.tsx` · 판정 소스: `useUserDiagnostics.ts`·`ContinueReadingCard` 로직·profiles·activities 읽기 재사용 · `DashboardCommandCenter.tsx`·`widget-visibility.ts`(배치)
- **제약**: DB/rules 무변경(판정은 기존 데이터 읽기) · 시맨틱 토큰만 · eslint 0 · 신입/재학/졸업생 롤별 단계 정의 분기(기존 `JourneyGreetingHeader` 패턴 참조)
- **검증**: 신규 계정에서 단계 순차 완료 시 스텝퍼 진척 확인 · 각 단계 CTA 딥링크 착지 · 완주 계정에서 심화 CTA 노출 · 롤별(신입/졸업생) 단계 문구 적절성
- **복잡도**: **M~L**

---

**H4. ESLint warning 212→170 추가 상환 (갭⑥ · 기술부채)**
- **문제**: 212로 낮췄으나 신학기 대량 커밋 전 추가 상환이 없으면 재상승. 상위 집중 규칙(`@typescript-eslint/no-explicit-any`·`react/no-array-index-key`·잔여 exhaustive-deps 억제)이 누적 위험.
- **개선안**: `npx eslint --format json` 파일별 분류 → 상위 10개 집중. 목록형 key 안정화(고유 id)·`any`→구체 타입·불필요 억제 주석 제거. 기능 무변경 리팩터.
- **영향 파일**: ESLint 결과 상위 파일(착수 시 재측정 — 여러 기능 영역 분산이라 병렬 가능)
- **제약**: 기능 무변경 · CEILING 212→170 갱신(`gen-eslint-warning-baseline` 재실행) · 시맨틱 토큰 무관
- **검증**: `npm run lint` 경고 ≤170 · ratchet PASS · `tsc`·`build` 통과
- **복잡도**: **M**

---

### Medium (1~2 스프린트 · 운영 효율·연결 심화·품질)

---

**M1. knip deadcode 13→8 감축 (갭⑦ · v16-M2 승계)**
- **문제**: CEILING=13 유지. 회귀 차단일 뿐 감축 아님. push/notify 예약 export 판단 후 안전 삭제 여지.
- **개선안**: `deadcode-baseline.json` 13건 각 export `grep -r` 무참조 확인 → 확실한 미참조만 삭제. **동적 import·알림 정책 재개 대비 push/notify export는 애매하면 보존**(X3 알림 정책과 연동). `gen-deadcode-baseline.mjs` 재실행 → ceiling 8.
- **영향 파일**: 삭제 대상(baseline 명세) · `scripts/deadcode-baseline.json`
- **제약**: 삭제 전 무참조 grep 증거 필수 · 기능 무변경
- **검증**: `npm run lint:deadcode` current ≤8 · `tsc`·`build` 통과 · 삭제 export 무참조 grep
- **복잡도**: **S~M**

---

**M2. 리마인더 cron 통합 관제 뷰 (갭④ · 운영 자동화)**
- **문제**: 리마인더/넛지 cron 25종+(`study-session-reminder`·`seminar-reminder`·`networking-reminder`·`mentoring-nudge`·`deadline-reminder`·`compexam-reminder`·`weekly-digest` 등)이 개별 실행돼, 운영진이 "무엇이 언제 누구에게 몇 건 발송됐는지"를 한 화면에서 못 본다. `console/cron-logs`가 실행 로그는 보이나 리마인더 도메인별 발송 집계가 아니다.
- **개선안**: `console/cron-logs` 또는 신규 `console/insights/reminders` 에 리마인더 관제 패널 — cron-runs 로그를 리마인더 계열로 그룹핑(최근 실행 시각·성공/실패·발송 건수). 실패·미실행(watchdog) 경보 하이라이트. 기존 `api/console/cron-runs`·`cron-runs/trend` 재사용.
- **영향 파일**: `src/app/console/cron-logs/**` 또는 신규 · (읽기) `api/console/cron-runs`
- **제약**: DB/rules 무변경 · 운영진 전용 · 임계경보 값은 §6 데이터 대기(8월 초 분포)와 연동
- **검증**: 최근 리마인더 cron 실행 결과가 도메인별로 정확 집계 · 실패 건 강조 표시
- **복잡도**: **M**

---

**M3. 세미나·스터디 회차 출석 관리 표면 (갭⑤ · 운영 효율)**
- **문제**: RSVP·참가 명단은 있으나 실제 **회차별 출석 체크·노쇼 추적**이 자동 표면화 안 됨. networking `AttendeeRoster`/`StaffAttendeeManager`는 사교 행사 전용. 운영진이 스터디/세미나 출석을 수기 집계한다.
- **개선안**: 콘솔 스터디/세미나 상세(`console/academic/studies/[id]`·`academic/seminars/registrations`)에 회차 출석 체크 표면 — 참가자 목록에 출석/결석 토글(기존 participants 문서에 회차별 출석 필드 옵셔널 append, 하위호환) + 출석률 요약. **가급적 기존 컬렉션에 옵셔널 필드**로 저장, 신규 컬렉션 회피.
- **영향 파일**: `src/app/console/academic/studies/[id]/**` · `src/app/console/academic/seminars/registrations/**` · activities/participants 조회 재사용
- **제약**: 옵셔널 필드 하위호환 우선 · 신규 컬렉션 필요 시 rules 명시 변경 후 배포(별도 게이트) · 시맨틱 토큰만
- **검증**: 회차 출석 토글 저장/집계 정확 · 기존 참가 데이터 회귀 없음
- **복잡도**: **M** (신규 컬렉션 불가피하면 **M~L** + rules 게이트)

---

**M4. 러닝가이드 완독→활동 전환 심화 (갭⑨ · 연결 심화 · H2 측정과 짝)**
- **문제**: `GuideRelated`가 관련 칩은 걸었으나 "완독 직후"의 다음 행동 유도가 약하다. 완독=리텐션 정점인데 회수가 미흡.
- **개선안**: 가이드 뷰어 마지막 페이지(완독 트리거) 도달 시 "완독 축하 + 다음 행동" 카드 — 관련 스터디 수요 남기기(prefill 재사용)·관련 세미나·다음 추천 가이드(카테고리 인접). 완독 뱃지는 이어읽기(v16 H3)와 일관.
- **영향 파일**: `src/app/learning-guides/[slug]/page.tsx`(완독 지점) · `src/features/learning-guides/GuideRelated.tsx`·`api.ts` 읽기 재사용 · demand prefill(v16 H2/H4 재사용)
- **제약**: DB/rules 무변경 · 시맨틱 토큰만 · 완독 판정은 기존 `guide_progress` progress===100
- **검증**: 가이드 완독 시 축하 카드+다음행동 CTA 노출·딥링크 착지 · 미완독 시 미노출
- **복잡도**: **S~M**

---

**M5. raw color 라운드6 + exhaustive-deps 안전검토 (갭⑧ · 품질)**
- **문제**: rawcolor CEILING=1 유지 중이나 잔여 raw hex 재측정 필요. 별개로 억제된 `react-hooks/exhaustive-deps`가 stale closure/누락 리페치 잠재 결함일 수 있으나 안전 검토 안 됨.
- **개선안**: (a) `gen-rawcolor-baseline.mjs` 재실행 → 잔존 파일 시맨틱 토큰 교체(없으면 종료 처리). (b) exhaustive-deps 억제 지점 목록화 → 각 지점 "의도적 1회 실행 vs 실제 버그" 분류, 버그성만 수정(기능 검증 동반). **전량 수정 아님 — 위험 지점만.**
- **영향 파일**: rawcolor 대상(측정 후) · exhaustive-deps 억제 상위 파일
- **제약**: rawcolor CEILING=1 유지 · exhaustive-deps 수정은 각 건 런타임 검증 필수(무분별 deps 추가 금지) · 라이트/다크 스모크
- **검증**: rawcolor ratchet PASS(≤1) · 수정한 effect의 리페치/상태 동작 눈확인 · 회귀 없음
- **복잡도**: **M**

---

**M6. 수요조사 학기 회고 뷰 (갭 · v16-L2 승계 · 운영 효율)**
- **문제**: 학기별 demand 보드(`demand-{YYYY}-{1|2}`)가 분리 저장되나, 지난 학기 수요·개설 전환 회고 뷰가 없어 다음 학기 기획 근거가 없다.
- **개선안**: `console/demand` 에 지난 학기 회고 탭 — 학기별 수요 건수·개설 전환율·미개설 상위 주제(다음 학기 재점화 후보). 집계만(읽기). 골격은 선착수, 실데이터는 학기 경계(9월/2월) 도래 시 검증.
- **영향 파일**: `src/app/console/demand/**` · demand 조회 재사용
- **제약**: DB/rules 무변경 · 한 학기 사이클 완료 데이터 대기(§6)
- **복잡도**: **S~M**

---

### Low (여유 시 · 경량 개선 · 데이터 대기)

---

**L1. img→Image 잔여 전환 (갭⑩ · v16-L3 승계 · LCP)**
- `@next/next/no-img-element` 억제 잔여 파일 재측정 → 고빈도 노출(히어로·카드 썸네일) 우선 `next/image` 전환. PDF·data URL 컨텍스트는 억제 유지+사유 주석.
- **영향 파일**: 착수 시 `eslint --rule` 재측정 대상 · **복잡도 M**

---

**L2. 논문 여정 진행률 시각화 (v16-L4 승계)**
- 마이페이지 논문 여정 4단계(계획서→설계→작성→보고서) 퍼널 진행률 바 + 현재 위치 강조. H3 여정 스텝퍼와 시각 일관.
- **영향 파일**: `src/features/steppingstone/**` · `src/app/mypage/research/**` · **복잡도 S~M**

---

**L3. 접근성 스윕 — 신규 v16/v17 위젯 (품질)**
- v16 신규(DemandInterestCard·ContinueReadingCard·DiagnosisGuideBridge)·H1~H3 위젯 대상 a11y 점검(대비·aria-label·키보드·터치타깃 44px). 색만으로 상태 구분하는 뱃지에 텍스트/아이콘 병기.
- **영향 파일**: v16/v17 신규 위젯 · **복잡도 S**

---

## 3. 즉시 착수 Top 5 (병렬 편성안 · 파일 영역 비중복)

| 트랙 | 항목 | 파일 영역 | 착수 |
|---|---|---|---|
| **트랙 A** | **H1** 운영진 일정조율 투표(NetworkingPoll 재사용) | `types/networking.ts`·`features/networking/EventEditorForm`·`app/console/networking`·`app/gatherings/page` | 즉시 (핵심) |
| **트랙 B** | **H2** 연결고리 측정 대시보드 | `app/console/insights/**` · learning-guides/demand 읽기 | 즉시 (A와 독립) |
| **트랙 C** | **H3** 여정 완주 스텝퍼 | `features/dashboard/JourneyStepperWidget`(신규) · dashboard 배치 | 즉시 (A·B와 독립) |
| **트랙 D** | **H4** ESLint 212→170 | ESLint 상위 파일(기능 영역 분산) | 즉시 (독립 리팩터) |
| **트랙 E** | **M4** 가이드 완독→활동 전환 | `app/learning-guides/[slug]/page`·`GuideRelated` | 즉시 (A·C·D와 독립, B와 측정 짝) |

> **병렬 규칙:**
> - H1은 `app/gatherings/page.tsx`·`MyGatheringsStrip.tsx` 공개 필터를 건드리므로 networking 영역 단독 트랙. `NetworkingPoll.tsx`는 **무변경 재사용**(회귀 위험 최소).
> - H2·M4는 러닝가이드 읽기를 공유하나 파일이 다름(insights vs learning-guides 뷰어) → 병렬. H2 완독률 집계와 M4 완독 CTA는 **완독 판정 기준(`progress===100`)을 H2에서 먼저 확정**하고 M4가 참조.
> - H3(대시보드 신규 위젯)는 기존 위젯 로직을 **읽기 재사용**만 → 파일 신규라 병렬 안전. 배치(`widget-visibility.ts`·`DashboardCommandCenter`) 합류 시 순차.
> - **M1(deadcode)은 H4(eslint) 완료 후 착수** 권장(파일 겹침 가능).
> - **배포 게이트**: `tsc`·`build`·rawcolor(≤1)·ESLint ratchet(≤170 갱신 시)·deadcode ratchet 전량 PASS + QA 스모크(운영진 홈·수요조사 탭·러닝가이드 서재/뷰어·마이페이지·진단 결과·**+콘솔 일정조율·insights 연결지표**).
> - **rules 변경 주의**: H1은 rules 무변경(읽기 필터). **M3만** 신규 컬렉션 불가피 시 firestore.rules 명시 변경 후 별도 배포 게이트.

---

## 4. 수치 목표 요약

| 지표 | 현재(2026-07-27) | v17 목표 | 핵심 항목 |
|---|---|---|---|
| ESLint warning | CEILING=212 | **CEILING=170** (42건↓) | H4 |
| knip deadcode | CEILING=13 | **CEILING=8** (5건↓) | M1 |
| raw color 파일 | CEILING=1 | **유지(≤1)** | M5 |
| 일정조율 자산 활용 | 사교 행사 6종 전용 | **운영진 내부/프로젝트/스터디 재사용** | H1 |
| v16 연결고리 측정 | 페이지별 분산·미집계 | **연결 KPI 한 장(완독률·전환율)** | H2 |
| 회원 여정 완주 유도 | 위젯 분산 | **통합 스텝퍼+다음행동 CTA** | H3 |
| 리마인더 운영 가시성 | cron 개별 실행 | **도메인별 발송 관제** | M2 |
| 출석 관리 | 수기 | **회차 출석 체크 표면** | M3 |
| 완독 리텐션 회수 | 관련 칩만 | **완독 직후 다음행동 CTA** | M4 |

---

## 5. 외부 의존 (운영진 결정 필요 — 별도 트랙)

| 항목 | 의존 대상 | 코드 연결 |
|---|---|---|
| **X1: 러닝가이드 신규 콘텐츠 발행**(온보딩 외 주제 확대) | 운영진 콘텐츠 저작·검수 | CMS 준비됨 — H2 측정 품질·M4 전환 품질은 발행 가이드 수에 비례 |
| **X2: 연결 클릭 이벤트 로깅 도입 여부** | 운영진 데이터 정책(개인정보·저장량) | H2 정밀 전환율(진단→가이드 실클릭)은 경량 이벤트 로깅 필요. 미도입 시 H2는 상태분포·완독률 등 서버 집계만으로 시작 |
| **X3: 개설/일정조율 알림 채널 정책**(push/email quiet-hours·수신자) | 운영진 알림 정책 | 현재 인앱 notify만 — 채널 확대는 정책 확정 후(M1 push/notify export 보존 판단과 연동) |
| **X4: 신학기 수요조사·일정조율 캠페인** | 운영진 콘텐츠 발행 | H1 일정조율·v16 발견성 진입점에서 직접 운용 — 코드 준비됨 |
| **X5: 세미나/스터디 출석 데이터 정책**(신규 컬렉션 여부) | 운영진·데이터모델 판단 | M3 옵셔널 필드 우선. 회차 출석을 정식 컬렉션으로 원하면 rules 설계 후(architect 협업) |
| **X6: Firestore 정기 백업 GCP 스케줄** | GCP 설정 | 장기 carryover(v15~이월) |

---

## 6. 데이터 대기 항목 (도래 시 전환)

| 항목 | 의존 데이터 | 재평가 시점 |
|---|---|---|
| **cron 임계경보 값**(M2 경보선) | 리마인더 cron 성공률/발송량 2개월 분포 | 8월 초 |
| **web_vitals 목표선**(v15-M4 이월) | 라우트별 p75 2개월 누적 | 8월 초 |
| **kudos 리더보드**(v15-M5 이월) | 해커톤·개강 kudos N≥50 | 9월 이후 |
| **개설 후 전환율 기준선**(H2 심화) | 개설 스터디 다수·참여 실데이터 | 개설 3건+ 누적 후 |
| **수요조사 학기 회고**(M6 실데이터) | 한 학기 수요·개설 사이클 완료 | 학기 경계(9월/2월) |
| **해커톤 회고 집계**(v15-L3 이월) | 8/22 행사 실데이터 | 8/22 이후 |
| **여정 완주율 벤치마크**(H3 튜닝) | 신학기 신입 코호트 여정 데이터 | 9월 개강 후 |

---

## 7. 진행 로그 (2026-07-27 갱신)

- **High H1~H4 · Medium M1/M2/M4/M6 · Low L1~L3**: 전량 LIVE.
- **핫픽스(사용자 리포트) — /mypage 로드 실패 크래시**: 근본원인=레거시 진단문서 `weakConceptIds` 필드 누락→`undefined.length` TypeError→`error.tsx` route boundary가 페이지 전체 붕괴(SSR 200/클라만). 옵셔널 가드 + 신규 `WidgetBoundary`(class ErrorBoundary)로 overview 개인 위젯 전부 격리 + `Date.now` purity 해소(ESLint ratchet **149→148**). 3커밋 LIVE(bd2f3c85·f81e2c2a·d132b203). 상세 `docs/plans/_mypage-load-error-debug.md`.
- **M5 (rawcolor 라운드6)**: **여지 없음 확정**. rawcolor ratchet은 raw Tailwind 팔레트(`bg-red-500` 등) 파일 수를 세며 이미 CEILING=1(design-tokens.ts 의도적 잔존)로 라운드1~10에서 347→1 완전 상환. 잔여 hex 리터럴(569건/70파일)은 PDF·canvas·차트·OG·이메일 등 Tailwind 스코프 밖 불가피 색상이라 대상 아님.
- **M5 (exhaustive-deps 안전검토)**: 진행 중 — 억제 46파일 감사(`docs/plans/_exhaustive-deps-audit-2026-07-27.md`). High(stale/리페치 누락)만 선별 후 배치 수정 예정.
- **부가 감사 — 런타임 크래시 스윕**: /mypage 크래시와 같은 클래스(fetch 데이터 무가드 접근)를 전 페이지 정적 스윕(`docs/plans/_runtime-crash-sweep-2026-07-27.md`). High 발견 시 옵셔널 가드/WidgetBoundary 배치 적용.
- **잔여 백로그**: **M3(출석 관리)** = X5(운영진 세미나/스터디 출석 데이터 정책·신규 컬렉션 여부) 결정 대기 → 별도 트랙. 두 감사 결과 반영 후 planner 재소환하여 v18 편성.

---

*파일: `docs/plans/service-enhancement-plan-v17.md` | 생성: 2026-07-27 | 다음 재검토: exhaustive-deps·크래시 스윕 배치 수정 완료 후 planner 재소환(v18) + 8월 이벤트 데이터 도래 시*

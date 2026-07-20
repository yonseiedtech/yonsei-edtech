# 연세교육공학회 차기 라운드 고도화 백로그 v13 — "실전 리허설과 약속 이행 — D-32 해커톤·D-42 개강을 '한 번 걸어보고' 맞이한다: 종단 리허설 · 사후 파이프라인 · 공유 체크리스트 · 부분완료 소진" (2026-07-21)

> 작성: 수석 서비스 플래너 (자율 분석 · 대화형 인터뷰 없음 · 코드·git 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, **세션 누적 56회 배포 — v6~v12 7개 라운드 전량 소진**)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · **임박 이벤트: 에듀테크 해커톤 2026-08-22 (D-32) · 2026 후기 개강 09-01 (D-42)** — 8월은 실전 운영의 달
> 실측 근거(2026-07-21 git/grep/node 직접 실측): `git log`(v12 배포: `3ed0f180`·`a20c2336`·`ac9c2322`·`58dfad1b`) · `git status`(작업트리 클린, `.claude/settings.local.json`만 untracked) · v12 계획서 + 구현 보고서 10종 · **rawcolor ratchet PASS(347/상한 347 — `node scripts/check-rawcolor-ratchet.mjs` 직접 실행)** · `EmptyState` 사용 **133파일** vs ad-hoc 빈 상태(EmptyState 미사용) **~213파일** · TODO/FIXME **37건** · `SemesterKickoffBanner.tsx:26`·`VacationModeCard.tsx:53` **관례일 하드코딩 잔존(C-1 미보정)** · `lib/semester.ts:61~71` **cohortKeyOf createdAt 폴백 잔존(C-5 미보정)** · `HackathonAwards.tsx` **archive 링크 0건** · `HackathonSubmissions.tsx:55` **members: string(콤마 문자열)** · `console/page.tsx` 시즌 체크리스트 **localStorage per-browser(`yedu_season_chk_*`)**.

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE·미변경 확정)

### 0-1. v6~v11 라운드 + 벤치마크 전량 (재제안 금지)
v6 H1~H6·M1·M2·M6·L1~L3, v7 13종, v8 High 6·Medium 6, v9 H1~H6·M1~M6, v10 H1~H6·M1~M6·신규 3종, v11 H1~H6·M1~M6·신규(대내 학술대회 일반화·`/console/org`) — v7~v12 계획서 §0에 커밋 해시로 확정. **전부 재제안 금지.**

### 0-2. v12 라운드 (오늘까지 배포 · **재제안 절대 금지**)

| v12 항목 | 산출물(실측·LIVE) | 커밋 | 상태 |
|---|---|---|---|
| **H1** 개강 D-day 운영 카운트다운 | `console/page.tsx` `UpcomingSeasonCard` — 해커톤 D-32·개강 D-42 역산 + 자동 3종/수동 5종 체크리스트 | `3ed0f180` | LIVE |
| **H2** cron 안정성 추세 리더 | `api/console/cron-runs/trend` + `cron-logs` kind별 성공률 시계열 스파크라인 | `3ed0f180` | LIVE |
| **H3** 인수인계 내구성 감사 → 공백 핫픽스 | `handover/OverviewView.tsx` 직책별 준비도 표식 2건 (+색상 토큰 보정 `a20c2336`) | `3ed0f180` | LIVE |
| **H4** 여정 상시 진입 | `MyPageView.tsx` wrapped 학기말 게이트 해방 — 시즌/진행 중/신입 3분기 | `3ed0f180` | LIVE |
| **H5** 개강 재활성화 동선 감사 + **A-1·B-1~B-4 보정** | `AcademicStatusView` enrollmentStatus 동기화(A급)·리마인더 역할 필터·courses 개강 윈도 신학기 승격·캠페인 autoLive+졸업생 제외·digest 스킵 완화 | `3ed0f180` | LIVE |
| **M3** 학사일정↔시즌 카드 자동 연동 · **M4** 인수인계 리포트 직책별 자동 채움 | `ac9c2322` | | LIVE |
| **M1** 빈 상태 라운드3(**부분** — 콘솔 아카이브 5p·콘솔 연구 2p·admin·인사이트) · **M2** 포트폴리오 자동적재 확장(멘토링 kudos·해커톤 ownerId) · **M6** whats-new 개강 재노출(`lib/whats-new-meta.ts`) | `58dfad1b` | | LIVE |

**위 항목은 전부 재제안 금지.** 특히:
- **시즌 카운트다운 카드(v12-H1)의 카드·역산·항목 구성** 재제안 금지 — v13-H4는 그 체크 상태의 **저장 계층(공유화)·자동 판정 확대**만 다룬다(카드 재구성 아님).
- **cron 추세 리더(v12-H2)** 완결 — v13은 **임계 경보(v12-M5 이월)**만.
- **wrapped 상시 진입(v12-H4)·포트폴리오 자동적재 소스 3종(v12-M2)** 재제안 금지 — v13-H2·M2는 M2v12 보고서가 **명시적으로 남긴 커버리지 구멍**(팀원 문자열·마법사 작성자 미추적)만.
- **H5v12 감사의 A-1·B-1~B-4 보정** 완료(`reactivation-fix-2026-07-21.md`) — v13-H5는 **C급 잔여(C-1·C-3·C-5·C-6 일부)**만.

### 0-3. 상주 인프라 (재제안 금지 — 활용만)
측정(`visit-tracker`·funnel·`search_misses`·`adoption/loyalty-snapshot`·`web_vitals`) · 관측(`withCronLog`/`cron_runs`·`cron-watchdog`·**추세 리더**) · 관계(`kudos` 관계 확장·`weekly_goal_records`·`digest`) · 신학기(`newcomer-activation-sequence`·`pending-signup-nudge`·`semester-start-reminder`·`AcademicStatusCampaignGate` autoLive·`api/email/approval`) · 행사(`hackathon_submissions`/`judgings`·`hackathon_ops` override·`HackathonDdayConsole`·팀 뷰·phase 타임라인) · 성장(`useSemesterWrapped` 상시·`portfolio` 자동적재) · 인수인계(`handover_docs`·리포트 자동 채움) · 시즌(`UpcomingSeasonCard`·`academic-calendar` 연동·whats-new 재노출).

---

## 1. v13 핵심 명제

> **일곱 라운드가 기능·측정·소비·리허설·수확·연결·준비도를 쌓았고, v12로 "앞을 보는 창"까지 깔렸다. 그러나 실측하면 8월 실전을 앞두고 네 가지가 비어 있다. (a) 해커톤 표면은 라운드별로 따로 만들어져(v8 타임라인→v9 팀→v10 당일 콘솔→v11 첫 사용→v12 D-day 카드) 참가자·운영자가 접수→제출→심사→수상을 처음부터 끝까지 걸어본 종단 리허설이 한 번도 없고, (b) config가 "결과물은 학회 아카이브로 남습니다"(`config.ts` awards 설명)라고 약속하나 수상→아카이브/포트폴리오 파이프는 0건(`HackathonAwards.tsx` archive 링크 0 · `HACKATHON_PORTFOLIO_HINT`="직접 추가해" 수동 안내뿐)이며 팀원은 콤마 문자열(`HackathonSubmissions.tsx:55`)이라 자동적재가 팀 대표만 커버하고, (c) 시즌 준비 체크리스트는 localStorage per-browser라 운영진끼리 서로 다른 체크 상태를 보며(공유·감사 불가), (d) H5v12 감사가 남긴 C급(개강일 기준 이원화·휴학 문구·8월 가입 신입 코호트 오산정)과 빈 상태 라운드3 잔여(~213파일)·3라운드째 이월된 L 항목들이 부분완료로 쌓여 있다.** v13은 각도를 **"리허설 · 이행 · 공유 · 소진(Rehearse · Fulfill · Share · Drain)"** 으로 잡는다 — 만든 것을 실전 전에 한 번 걸어보고(리허설), 화면이 한 약속을 코드로 이행하고(파이프라인), 운영 상태를 개인 브라우저에서 팀으로 올리고(공유), 부분완료·이월분을 소진한다. **신규 컬렉션 0 · 기존 자산 재사용 100% · LLM 무의존(전량 규칙 기반)** — High 5 중 감사형 2건(H1·H3), 구현형도 전량 기존 컬렉션·site_settings 재사용.

### 1-1. 실측된 v13 4대 갭 (렌즈별 출발점)

| # | 렌즈 | 실측된 갭 | 근거(2026-07-21) |
|---|---|---|---|
| ① | **해커톤 종단 리허설** | 표면은 다 있으나 **접수→제출→심사→수상 전 단계를 이어 걸어본 이력이 0** — 각 단계가 다른 라운드에서 개별 구축·개별 검증됐고, phase 전환기 정합(제출 마감`isHackathonSubmissionClosed` × ops override × 팀 프리필 × 심사 입력 × 수상 갤러리)은 미검증. `resolveHackathonPhase`(수동 override)로 **오늘이라도 단계를 앞당겨 리허설 가능**한데 안 했다. | `features/hackathon/config.ts:180~196`(override 존재) · 단계별 산출 커밋이 v8~v12에 분산 · 종단 감사 보고서 부재(docs/plans 전수) |
| ② | **사후 파이프라인(약속 이행)** | **"수상작이 발표되고 학회 아카이브로 남습니다"는 화면 약속일 뿐 코드 경로가 없다** — `HackathonAwards.tsx`에 archive 연결 0건(grep), `HACKATHON_PORTFOLIO_HINT`(config `:98`)는 "직접 추가해" 수동 안내. 자동적재(v12-M2)도 `members: string` 콤마 문자열(`HackathonSubmissions.tsx:55,76`) 때문에 **팀 대표(ownerId)만** 커버 — M2v12 보고서 §2-2가 "팀원 ID 저장 시 확장 가능"으로 명시 유보. | `HackathonAwards.tsx`(archive 0) · `config.ts:97~99` · `portfolio-coverage-m2v12-2026-07-21.md` §2-2·§2-3 |
| ③ | **운영 상태의 공유성** | **시즌 준비 체크리스트 수동 5종이 localStorage per-browser** (`yedu_season_chk_{event}_{item}`) — 운영진 A가 체크해도 B에겐 미체크로 보임. 협업 체크리스트가 개인 메모 수준이라 "준비 완료" 판정을 신뢰할 수 없고 당일까지 어긋난다. 자동 판정도 3종뿐(접수 오픈·학사일정·승인 큐) — 온보딩 시퀀스·공지 게시 등은 기존 신호로 자동 판정 가능한데 수동. | `dday-console-h1v12-2026-07-21.md`(localStorage 키 패턴 명시) · `console/page.tsx` `SeasonItem` |
| ④ | **부분완료·이월 부채** | (a) H5v12 C급 잔존: **C-1** 배너·방학카드 관례일 하드코딩(`SemesterKickoffBanner.tsx:26`·`VacationModeCard.tsx:53` — cron은 실개강일 참조, 개강 9/2+면 D-day 어긋남), **C-3** 휴학자에 "수강 등록" 유도, **C-5** `cohortKeyOf` createdAt 폴백(`lib/semester.ts:70` — **8월 가입 신입이 "2026-1"로 오산정** → 9/1 신입 온보딩 분기·코호트 표면 제외); (b) 빈 상태 라운드3 **부분 완료**(58dfad1b 커밋 메시지 "세션 중단 수용") — ad-hoc **~213파일** 잔존; (c) L2·L3·L4 **3라운드째 이월**. | grep 실측(§상단) · `58dfad1b` 커밋 메시지 · v11·v12 §Low |

### 1-2. 실측된 정리·잔여 부채 (⑤ 자유 발굴)

| 구분 | 실측 | 판정 |
|---|---|---|
| **빈 상태 라운드3 잔여** | `EmptyState` 133파일 vs ad-hoc(EmptyState 미사용) ~213파일 — v12-M1이 콘솔 위주 수렴 후 회원 대면 롱테일 잔존 | **정리 → M1** |
| **마법사 산출 작성자 미추적** | `curriculumDesign`에 작성자 userId 없음 → 포트폴리오 자동적재 제외(M2v12 §2-3이 `activity_participations` role 기록을 권고로 명시) | **구현 → M2** |
| **cron 임계·web_vitals 목표선** | v12-M5·v10-H1 확장 — 8월초 데이터 도래 **임박**(v13 실행 기간 내 해제 예상) | **M3·M4 (착수 시점 명시)** |
| **depcheck/ts-prune 상시화** | v10-H6 일회 실행 후 도구 상시화 3라운드 이월 — 데드코드 회귀 감지 게이트 없음(rawcolor ratchet 패턴 재사용 가능) | **승격 → M5** |
| **색상 부채 라운드6** | ratchet PASS(347/347) — 상한은 고정됐으나 **감축은 2라운드째 0** (v8-M4 411→390 이후 라운드5에서 355→347) | **승격 → M6** |
| **whats-new addedAt 하드코딩** | `lib/whats-new-meta.ts` `WHATS_NEW_ADDED_DATES` 21건 수동 목록 — 배포마다 수동 갱신 의존(v13 배포분 누락 시 "N개 신기능" 과소 표시) | **경량 → L3** |

---

## 2. 고도화 백로그 (v13 · 15항목)

> 형식: **[우선순위 · 제목 · 문제/근거 → 제안 구현 → 규모 S(<1주)/M(1~2주)/L(3주+) · 신규 컬렉션 · 리스크]**
> **감사·리허설형 = H1·H3 (2건)** · 구현형 = H2·H4·H5 (전량 기존 컬렉션·site_settings 재사용 · **신규 컬렉션 0 · LLM 무의존**)
> **High = 외부 의존 없음(코드·감사만으로 완결)** 항목만 배치.

### High (즉시 착수 · 외부의존 없음 · 8월 실전 직결)

**H1. 해커톤 종단 리허설 — 접수→제출→심사→수상 전 단계를 D-32에 미리 걸어본다 (렌즈① · 감사형 · 시의성 최상)**
- 문제/근거: 해커톤 표면이 5개 라운드에 걸쳐 개별 구축·개별 검증됐다 — 타임라인(v8-H6)·팀 확정(v9-M6 `HackathonTeamView`)·당일 콘솔(v10-H3 `HackathonDdayConsole`)·첫 사용(v11-H1)·D-day 카드(v12-H1). 그러나 **참가자·운영자 양측이 registration→submission→judging→awards를 이어서 걸어본 종단 리허설 이력이 0**(docs/plans 전수 — 단계별 보고서뿐). phase 전환기 정합이 미검증: 제출 마감(`isHackathonSubmissionClosed`, `config.ts:91~95`) × ops override(`resolveHackathonPhase`, `:191~196`) × 팀 확정→제출 프리필(`HackathonSubmissions.tsx:91~103` CustomEvent) × 심사 입력(`hackathon_judgings`) × 수상 갤러리(`HackathonAwards.tsx`) × 비회원/게스트 유입 경로. override가 있으므로 **오늘이라도 단계를 앞당겨 전 구간 리허설 가능**하다.
- 제안 구현: **(1) 운영자 리허설 스크립트** — `console/hackathon`에서 `hackathon_ops.phase`를 registration→submission→judging→awards로 순차 전환하며, 각 단계에서 회원 표면(`/hackathon` 허브·팀 뷰·제출 폼·갤러리)과 콘솔 표면(`HackathonDdayConsole` 체크리스트·현황 요약)을 테스트 데이터로 실주행. **(2) 감사 산출** — 단계 전환마다 [기대 vs 실제] 표(전환 시 잔존 배너·마감 배지 정합·빈 상태·프리필 동작·심사율 집계·수상 표시)를 `docs/plans/hackathon-rehearsal-h1v13-*.md`로 기록. **(3) 발견 결함만 경량 핫픽스**(문구·조건·빈 상태·링크 — 로직 재설계 금지). 리허설 후 override를 null로 복원(자동 폴백 재개)하는 절차를 스크립트에 명시.
- 규모: **S~M** · 신규 컬렉션: **불필요** · 리스크: 리허설 중 override를 프로덕션에 켠 채 방치하면 실사용자에게 가짜 단계 노출 — **리허설 창을 짧게 잡고 복원 단계를 체크리스트 마지막에 강제**. 테스트 제출물은 title 접두사(`[리허설]`)로 표기 후 삭제.

**H2. 해커톤 사후 파이프라인 — "아카이브로 남습니다" 약속 이행 + 팀원 크레딧 (렌즈② · 구현)**
- 문제/근거: `config.ts` awards 단계 설명("수상작이 발표되고 **학회 아카이브로 남습니다**")·`HACKATHON_EVENT.highlights`("결과물은 학회 아카이브로 남겨…")가 화면 약속인데 **이행 코드가 0** — `HackathonAwards.tsx`에 archive 링크·적재 경로 없음(grep 0건), `HACKATHON_PORTFOLIO_HINT`(`:98`)는 "마이페이지에서 **직접 추가**해" 수동 안내뿐. 자동적재(v12-M2)는 `hackathon_submissions.ownerId`만 커버 — `members`가 콤마 문자열(`HackathonSubmissions.tsx:55` `members: string`, `:76` `join(", ")`)이라 **팀원은 userId 매핑 불가**(M2v12 §2-2 명시 유보). 행사 다음 주(8/29 수상 발표)면 이 갭이 실사용자 불만으로 현실화된다.
- 제안 구현: **(1) 팀원 크레딧** — 제출 폼(`HackathonSubmissions.tsx`)에 팀원을 `profiles` 검색 선택으로 담는 `memberIds: string[]` 필드 추가(기존 `members` 문자열은 표시·하위호환 유지, `hackathon_submissions` 문서 필드 추가일 뿐 신규 컬렉션 아님). 멘토링·팀 뷰의 기존 회원 선택 UI 패턴 재사용. **(2) 자동적재 확장** — `lib/portfolio-autofill.ts`의 해커톤 소스를 `ownerId ∪ memberIds` 로 확장(sourceRef `hackathon:submission:{id}` 멱등 유지, role은 대표/팀원 구분). **(3) 수상→기록 반자동** — awards 단계에서 수상작 카드에 "포트폴리오에 수상 이력 추가" 1클릭 버튼(기존 `external_activities` 적재 경로 재사용, type="award") + 운영진용 "아카이브 산출물로 등록" 딥링크(기존 아카이브 등록 폼에 제목·URL 프리필 쿼리로 이동 — 자동 발행 아님, 검수는 운영진). config의 HINT 문구를 실제 버튼 존재에 맞게 갱신.
- 규모: **M** · 신규 컬렉션: **불필요**(`hackathon_submissions` 필드 추가 + `external_activities` 재사용) · 리스크: memberIds 선택 UI가 제출 마찰을 높일 수 있음 — 선택 사항(optional)으로 두고 문자열 입력 병행. 팀원 자동적재는 본인 확인 없이 이력이 생기므로 **자동적재 다이얼로그의 기존 "후보 제안→사용자 확인" 흐름을 반드시 경유**(무단 적재 금지).

**H3. 신학기 유입 종단 리허설 — 가입→승인→첫 로그인→첫 활동 + 8월 가입 코호트 보정 (렌즈①④ · 감사→구현)**
- 문제/근거: 신입 파이프 구성요소는 전부 LIVE(가입 4단계 `SignupMultiStep`(약관 1단계, v10 신규②)·`pending-signup-nudge`·승인 이메일 `api/email/approval`·`newcomer-activation-sequence` cron·`NewcomerProgressWidget`·steppingstone 온보딩)지만, **약관 개편 이후 전 구간을 새 계정으로 이어 걸어본 리허설이 없다**(v11-M4는 링크 정합·발송 현황 점검에 그침). 게다가 **C-5 잔존**: `cohortKeyOf`(`lib/semester.ts:61~71`)가 enrollmentYear/Half 미입력 시 createdAt 폴백 — **8월(=전기) 가입 신입이 "2026-1" 코호트로 오산정**되어 `semester-start-reminder`의 9/1 신입 온보딩 분기(H5v12 감사 1-1)·코호트 kudos·코호트 표면에서 제외된다. 8월은 정확히 신입 가입이 몰리는 달이라 v13 기간에 실제로 터지는 버그다.
- 제안 구현: **(1) 리허설** — 테스트 계정으로 가입(약관→계정→학적→선택)→운영진 승인(콘솔 큐·승인 이메일 수신·착지 URL)→첫 로그인(온보딩·신입 위젯·첫 진단 CTA)→첫 활동(스터디 신청 or 진단 완료)을 실주행하고 단계별 [마찰·빈 상태·오문구] 표 기록. **(2) C-5 보정** — `cohortKeyOf` 폴백에 "다음 학기 개강 30일 전(8/2~) 가입이면 다음 학기 코호트" 보정 규칙 추가(`lib/semester.ts` 1함수 + 기존 테스트 파일에 케이스 추가 — `lib/semester.ts` 테스트 존재 실측). **(3) 발견 결함 경량 핫픽스**(승인 이메일 문구·착지, 온보딩 순서, 빈 상태 CTA).
- 규모: **S~M** · 신규 컬렉션: **불필요** · 리스크: cohort 산정 변경은 기존 회원 코호트 표시에 소급 영향 — **enrollmentYear/Half 미입력자 한정 폴백**이라 영향 범위 좁음을 테스트로 고정. 테스트 계정은 리허설 후 삭제(orphan 정리 스크립트 `delete-orphan-auth.mjs` 기존 존재).

**H4. 시즌 준비 체크리스트 공유화·자동 판정 확대 — 개인 메모를 팀 운영 상태로 (렌즈③ · 구현 · v12-H1 소비 완결)**
- 문제/근거: v12-H1 `UpcomingSeasonCard`의 수동 체크 5종(아이디어 보드 공지·심사위원 배정·당일 콘솔 점검·온보딩 시퀀스 확인·환영 게시글)이 **localStorage per-browser**(`yedu_season_chk_{eventKey}_{itemKey}`, `dday-console-h1v12` 보고서 명시) — 운영진 A가 체크해도 B·C에겐 미체크. 여러 명이 나눠 준비하는 시즌 운영에서 "완료" 상태가 공유·감사되지 않아 이중 작업 또는 누락이 생긴다. 자동 판정도 3종뿐 — "온보딩 시퀀스 활성화"는 `cron_runs`(kind=newcomer-activation-sequence 최근 성공)로, "아이디어 보드 공지 게시"는 comm_boards hackathon 컨텍스트 공지글 존재로, "학사정보 캠페인 활성"(H5v12 B-3 보정안 ①의 잔여 — 콘솔 경고 배지 미구현)은 `isCampaignLive`로 **기존 신호만으로 자동 판정 가능**한데 수동/부재다.
- 제안 구현: **(1) 공유 저장** — 체크 상태를 localStorage에서 `site_settings`(key=`season_checklist_2026H2` 등, v10-H3 `hackathon_ops`와 동일 패턴)로 이전: 체크 시 `{itemKey: {done, by, at}}` 기록 → 카드에 "OO님이 8/1 체크" 표시(감사 가능). 마이그레이션: 기존 localStorage 값은 최초 1회 병합 업로드. **(2) 자동 판정 확대** — `SeasonItem`의 auto 판정에 ① 온보딩 시퀀스: `cron_runs` 최근 7일 성공 존재(`api/console/cron-runs` 기존 응답 재사용), ② 보드 공지: comm_boards hackathon 컨텍스트 공지 존재 count, ③ 신규 항목 "학사정보 캠페인 활성": `isCampaignLive || autoLive` 판정 + 미활성 시 딥링크(`/console/settings/academic-status`). **(3)** 체크리스트 항목 정의는 코드 상수 유지(문안 확정은 §4 외부 의존이나, 현행 문안 그대로 저장 계층만 교체하면 의존 없음).
- 규모: **S~M** · 신규 컬렉션: **불필요**(`site_settings` 재사용) · 리스크: site_settings 동시 쓰기 경합 — 항목 단위 merge 쓰기로 완화. 자동 판정 오탐(cron 성공≠시퀀스 의미상 정상) — 자동 항목에 "신호 기준" 툴팁 병기.

**H5. 개강 정합 잔여 마감 — H5v12 감사 C급 소진 (렌즈④ · 구현 · S급 묶음)**
- 문제/근거: H5v12 감사에서 A·B급은 전량 보정됐으나(`reactivation-fix-2026-07-21.md`) **C급이 잔존**한다(실측 재확인): **C-1** `SemesterKickoffBanner.tsx:26`·`VacationModeCard.tsx:53`이 관례일(3/1·9/1) 하드코딩 — 같은 목적의 cron(`semester-start-reminder`)은 `academic_calendar` 실개강일을 참조하므로, 실제 개강이 9/2 이후면 **알림 날짜와 배너 윈도·방학 D-day 카운트가 서로 어긋난다**(운영진이 학사일정을 등록할수록 어긋남이 드러나는 역설). **C-3** 배너가 휴학(on_leave) 회원에게도 "수강과목 등록" 유도 — A-1 보정으로 enrollmentStatus 신뢰도가 올라간 지금이 분기 적기. **C-6 잔여** weekly-digest에 개강 임박 신호 부재(B-4 보정으로 방학 발송은 살았으나 D-day 블록 없음).
- 제안 구현: **(1) C-1** — 배너·방학카드가 `useAcademicCalendar`(v12-M3에서 콘솔 카드에 이미 쓴 훅)의 해당 학기 `semesterStart`를 우선 참조, 미등록 시 관례일 폴백(cron `:31~44`와 동일 규칙 — 기준일 산정 함수를 `lib/semester.ts`에 공용화해 3곳 일원화). **(2) C-3** — `SemesterKickoffBanner`에서 `enrollmentStatus === "on_leave"`면 문구·CTA를 "복학을 준비 중이라면 학사정보를 최신화해 주세요"(`/mypage/academic-status` 착지)로 분기. **(3) C-6** — `weekly-digest`에 개강 D-14 이내일 때만 상단 한 줄 "개강 D-N — 시간표를 미리 확인하세요" 블록 추가(기존 개강일 산정 재사용, 발송 정책 변경 없음 — 기존 수신자에게 블록 1개 추가일 뿐이라 외부 의존 아님).
- 규모: **S** · 신규 컬렉션: **불필요** · 리스크: 개강일 산정 공용화 시 3곳(배너·카드·cron)의 폴백 동작 회귀 — 기존 `lib/semester.ts` 테스트에 실개강일/폴백 케이스 추가로 고정.

### Medium (1~2 스프린트)

**M1. 빈 상태 라운드3 완결 — 세션 중단 잔여 소진 (렌즈④ · 정리 · v12-M1 후속)**
- 문제/근거: v12-M1이 "세션 재시작으로 **부분 완료**"(커밋 `58dfad1b` 메시지)로 콘솔 위주만 수렴 — 실측 ad-hoc(EmptyState 미사용) **~213파일** 잔존(`EmptyState` 사용은 133파일). 특히 회원 대면 롱테일(멘토링·게시판 서브·검색 결과·프로필 서브·gatherings)이 미수렴.
- 제안 구현: empty-state-r2·m3v9 보고서의 잔여 목록 + 신규 grep으로 **회원 대면 고빈도 상위 ~20파일**을 이번 라운드 상한으로 확정(전량 소진 시도 금지 — 세션 중단 재발 방지), `EmptyState`(compact/actionHref) 배치 치환. 순수 표현 치환·로직 불변 규율 유지.
- 규모: **M** · 신규 컬렉션: **불필요** · 리스크: 없음(표현 계층). 상한제로 "부분 완료" 재발 자체를 계획에 내재화.

**M2. 교수설계 마법사 산출 작성자 추적 — 자동적재 커버리지 마지막 구멍 (렌즈② · 구현 · M2v12 권고 이행)**
- 문제/근거: `StudyCurriculumWizard`가 `activities.curriculumDesign`에만 저장하고 작성자 userId를 기록하지 않아 **포트폴리오 자동적재에서 제외**(M2v12 보고서 §2-3이 "`activity_participations`에 role 기록" 권고 명시). 설계라는 유의미한 학술 활동이 개인 기록에 안 남는다.
- 제안 구현: 마법사 저장 시 기존 `activity_participations` 컬렉션에 `{activityId, userId, role:"designer"}` upsert(멱등 — 활동당 1건) → `portfolio-autofill.ts`에 소스 5(설계 산출: type="community", role="교수설계", 활동명·모형 라벨) 추가. `PortfolioAutofillDialog` fetch 확장.
- 규모: **S~M** · 신규 컬렉션: **불필요**(`activity_participations` 재사용 — M2v12 권고안 중 신규 컬렉션 없는 쪽 채택) · 리스크: 과거 저장분은 작성자 소급 불가(신규 저장부터) — 다이얼로그 안내 문구에 명시.

**M3. cron 열화 경보 임계 (v12-M5 이월 · 데이터 8월초 도래 — v13 기간 내 착수)**
- 문제/근거: v12-H2 추세 리더 LIVE — 성공률 하락의 **자동 경보 임계**만 잔여. 임계선은 분포 관찰 필요(v12 §3 "8월 중순 임계 산정").
- 제안 구현: 8월 초 `api/console/cron-runs/trend` 실데이터로 kind별 성공률 분포 확인 → 임계(예: 최근 14일 성공률 < 80% && 직전 구간 대비 -15%p) 하회 시 `cron-logs` 배지 + 콘솔 랜딩 pending 큐 합류(v11-H3 큐 패턴 재사용). 알림 "발송"은 §4 외부 의존으로 분리 — 이번엔 콘솔 내 표식까지.
- 규모: **S** · 신규 컬렉션: **불필요** · 리스크: 임계 오경보 — 초기엔 배지만(발송 없음)으로 보수 운영.

**M4. web_vitals 라우트 목표선·회귀 표식 (v10-H1 확장 · 8월초 재평가 도래)**
- 문제/근거: `web_vitals` 10% 샘플이 v9-H6부터 축적, 소비 화면(`WebVitalsSection`·`admin/insights`)은 v10-H1 LIVE — **라우트별 p75 목표선·회귀 감지 표식**이 없어 숫자만 보인다. 8월초면 축적 2개월로 기준선 산정 가능.
- 제안 구현: 8월 초 실데이터로 라우트별 p75 기준선 산정 → `WebVitalsSection`에 목표선(Core Web Vitals 권장치: LCP 2.5s·CLS 0.1·INP 200ms) 대비 상태색 + 직전 2주 대비 악화 라우트 배지. 읽기 전용 표현 계층.
- 규모: **S~M** · 신규 컬렉션: **불필요** · 리스크: 샘플 10%라 저트래픽 라우트 노이즈 — 표본 N 미달 라우트는 "표본 부족" 표시.

**M5. depcheck/ts-prune 상시화 + 데드코드 게이트 (렌즈④ · 유지비 · 3라운드 이월 승격)**
- 문제/근거: v10-H6가 일회 실행으로 28파일 삭제 후, **도구 상시화(L3)가 v10→v11→v12 3라운드 연속 이월** — 데드코드 회귀를 감지할 게이트가 없다. rawcolor는 ratchet 게이트(`check-rawcolor-ratchet.mjs`)로 잠갔는데 데드코드는 무방비.
- 제안 구현: `package.json`에 `lint:deadcode` 스크립트(depcheck + ts-prune, 허용 목록 파일) 추가 + rawcolor 패턴을 본떠 `scripts/check-deadcode-ratchet.mjs`(미사용 export 수 상한 고정·초과 시 FAIL) 작성, 배포 전 게이트 체인에 편입. 초기 baseline은 현 상태로 고정(정리 강제 아님 — 회귀만 차단).
- 규모: **S** · 신규 컬렉션: **불필요** · 리스크: ts-prune 오탐(동적 import·타입 전용) — 허용 목록으로 흡수, FAIL은 증가분에만.

**M6. 색상 부채 라운드6 — ratchet 상한 실질 인하 (렌즈④ · 정리 · 2라운드 정체 해소)**
- 문제/근거: ratchet PASS(347/347)로 **회귀는 막았으나 감축이 2라운드째 0** — 상한 고정은 현상 유지 장치일 뿐. 347파일의 raw 팔레트는 다크모드·브랜드 정합의 잠재 결함원.
- 제안 구현: 회원 대면 고빈도 영역(대시보드·마이페이지 잔여·해커톤·게시판) 위주 raw 색상 → 시맨틱 토큰 전환 라운드(목표 347→\<330), 완료 후 `gen-rawcolor-baseline.mjs` 재생성으로 **상한을 실측치로 인하 고정**(라운드5와 동일 절차).
- 규모: **M** · 신규 컬렉션: **불필요** · 리스크: 다크모드 시각 회귀 — 전환 후 대상 화면 라이트/다크 스모크 필수(검증 규율).

### Low (여유 시)

**L1. 단축키 상시 힌트 (발견성 · v8→v12 4라운드 carryover · S)** — 커맨드 팔레트(Cmd+K)·핵심 액션에 단축키 툴팁 병기. 신규 컬렉션 불필요. 리스크 없음.
**L2. reduced-motion 자동 스모크 (품질 · carryover · S)** — `scripts/a11y-smoke.mjs`에 `prefers-reduced-motion` 위반 체크 추가. 리스크 없음.
**L3. whats-new addedAt 갱신 절차화 (유지비 · S)** — `WHATS_NEW_ADDED_DATES` 하드코딩 21건이 배포마다 수동 갱신 의존(v13 배포분 누락 시 개강 배너 "N개 신기능" 과소 표시) → whats-new 페이지 항목 정의와 meta 목록을 단일 소스로 통합(페이지 항목 배열에서 addedAt을 derive)해 이중 관리 제거. 신규 컬렉션 불필요.
**L4. TODO/FIXME 트리아지 라운드2 (유지비 · S)** — 잔존 37건을 [즉시 해소/이슈화/의도적 유지] 3분류, 즉시 해소분만 처리(v10-H6 패턴).

---

## 3. 데이터 축적 대기 항목 (수집 진행 중 · 착수 시점 재평가)

> **v13 재평가 핵심: cron 임계(M3)·web_vitals 목표선(M4)이 8월초 도래 — v13 실행 기간 내 "대기→착수" 전환 예정.** 라운드 중반 재확인 후 착수한다.

| 대기 항목 | 의존 데이터 | v12 판정 | **v13 재평가(2026-07-21)** |
|---|---|---|---|
| **cron 열화 경보 임계** (M3) | trend reader 배포 후 성공률 분포 | 8월 중순 | **8월 초~중순 착수 — v13 라운드 내 소화**(M3 배치) |
| **web_vitals 목표선·회귀 표식** (M4) | 라우트별 p75 (v9-H6부터 축적) | 8월초 재평가 | **8월 초 착수 — v13 라운드 내 소화**(M4 배치) |
| **kudos 리더보드·주차 추이** | v11-H2 관계 확장 후 볼륨 | 9월초 | **9월초 유지** — 8월 유입·해커톤 kudos 볼륨 관찰 후 (v14 후보) |
| **funnel 전환 개선 실험** | funnel baseline 볼륨 | 9월초 | **9월초 유지**(8월 신입 유입 후, v14 후보) |
| **loyalty/adoption 코호트 추이** | 학기 경계 1회전 | 가을 학기 중 | **가을 학기 중 유지** |
| **콘텐츠 노후 임계 튜닝** (v11-H4 확장) | `lastReviewedAt` 분포 | 8월 하순 | **8월 하순 유지** — 검토 큐 운영 피드백 필요(운영진 사용 전제 → 반쯤 외부 의존) |
| **해커톤 실전 데이터 회고** (신규) | 8/22 실행사 submissions·judgings·visit | — | **8월 말 신규 편성** — 행사 후 참가·제출·심사 실데이터로 v14 회고·개선 백로그 입력 |

---

## 4. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| **네이버 서치어드바이저 검증 코드** | 사용자(계정 소유자) 발급 대기 — 코드 준비 완료 상태 |
| **해커톤 심사 기준(루브릭)·심사위원 배정·당일 체크인 정책** (H1 리허설이 표면 검증까지, 기준 확정은 운영진) | 운영진 이벤트 운영 확정 |
| **해커톤 수상작의 아카이브 "발행" 검수** (H2는 등록 딥링크·프리필까지 — 실제 발행 판단은 운영진) | 운영진 콘텐츠 검수 |
| **시즌 체크리스트 항목·문안 확정** (H4는 현행 문안 유지·저장 계층만 교체) | 운영진 시즌 운영 정의 |
| **cron 열화·수동 큐 경보의 알림 "발송" 정책** (M3는 콘솔 표식까지 — quiet-hours·빈도) | 푸시/알림 발송 정책 합의 |
| **휴면 회원 아웃바운드 넛지** (H5v12 C-4 — 빈도·문안) | 푸시 정책 + 운영진 문안 |
| **신입 환영 게시글·개강 공지 콘텐츠 작성** (시즌 체크리스트의 콘텐츠 항목) | 운영진 콘텐츠 발행 |
| `analytics-retention` cron **스케줄 활성화** | 개인정보 보존 정책 확정 |
| Sentry 등 **에러 리포팅 연동** (v9-H2 확장) | 외부 계정·비용 승인 |
| Firestore 정기 export/백업 · 세미나 라이브 다시보기 (carryover) | GCP 스케줄러/GCS · 저작권 |
| 커뮤니티 nav **재구성 승인** (v11-H5 후속) | 운영진 정보구조 판단 |

---

## 5. 즉시 착수 Top 5 (병렬 편성안 — 파일 영역 비중복)

1. **H1 해커톤 종단 리허설(S~M · 감사형 · D-32 최우선)** — override 활용 전 단계 실주행 + 결함 핫픽스. `features/hackathon/**`(읽기 중심)·`console/hackathon`. 트랙 A.
2. **H2 해커톤 사후 파이프라인(M · 구현)** — memberIds·자동적재 확장·수상 1클릭. `HackathonSubmissions.tsx`·`HackathonAwards.tsx`·`lib/portfolio-autofill.ts`. 트랙 A 후속(H1 리허설에서 결함 확정 후 착수 — 같은 파일 영역이므로 **순차**).
3. **H3 신학기 유입 종단 리허설 + C-5 보정(S~M · 감사→구현)** — 가입~첫 활동 실주행. `lib/semester.ts`·signup·steppingstone(읽기 중심). 트랙 B.
4. **H4 시즌 체크리스트 공유화·자동 판정(S~M · 구현)** — localStorage→site_settings. `app/console/page.tsx` 단독. 트랙 C.
5. **H5 개강 정합 잔여 마감(S · 구현)** — C-1·C-3·C-6. `features/dashboard/SemesterKickoffBanner.tsx`·`VacationModeCard.tsx`·`api/cron/weekly-digest`. 트랙 D.

> **병렬 편성(파일 영역 비중복)**:
> - 트랙 A(해커톤): **H1 리허설 → H2 파이프라인** — `features/hackathon/**` (동일 영역 · 반드시 순차)
> - 트랙 B(신입): **H3 유입 리허설·C-5** — `lib/semester.ts`·signup 표면 (H5와 `lib/semester.ts` 공용화 겹침 주의 — C-1 공용화는 H5에서만 수행, H3은 `cohortKeyOf` 함수 한정)
> - 트랙 C(운영 공유): **H4 체크리스트** — `console/page.tsx` 단독
> - 트랙 D(개강 정합): **H5 C급 마감** — dashboard 배너·digest cron
> - 품질 정리(상시): **M1 빈 상태(상한 20파일)·M6 색상 라운드6** — 표현 계층, 타 트랙 파일과 근접 시 순차
> - 8월 초 데이터 도래 시: **M3 cron 임계·M4 web_vitals 목표선** 착수
> M2·M5·L1~L4는 여유 시. **배포 게이트: tsc·build·rawcolor ratchet(+M5 이후 deadcode ratchet) 통과 + 배포 후 QA 스모크(해커톤 허브·콘솔 랜딩·마이페이지) 필수.**

---

## 6. 참고 파일 (절대경로 · 실측 2026-07-21)

- `C:\work\yonsei-edtech\src\features\hackathon\config.ts`(`:91~95` 제출 마감·`:97~99` PORTFOLIO_HINT 수동 안내·`:180~196` ops override → H1·H2) / `HackathonSubmissions.tsx`(`:55` `members: string` 콤마 문자열·`:91~103` 프리필 → H2) / `HackathonAwards.tsx`(archive 링크 0 → H2) / `HackathonDdayConsole.tsx`·`HackathonTeamView.tsx`(H1 리허설 대상·재구성 금지)
- `C:\work\yonsei-edtech\src\lib\portfolio-autofill.ts`(`:191~207` 해커톤 ownerId 한정 → H2) / `docs\plans\portfolio-coverage-m2v12-2026-07-21.md`(§2-2 팀원 유보·§2-3 마법사 권고 → H2·M2)
- `C:\work\yonsei-edtech\src\lib\semester.ts`(`:61~71` cohortKeyOf createdAt 폴백 → H3-C5 · 개강일 공용화 → H5-C1) / `src\app\api\email\approval\route.ts`·`src\app\api\cron\pending-signup-nudge`·`newcomer-activation-sequence`(H3 리허설 대상)
- `C:\work\yonsei-edtech\src\app\console\page.tsx`(`UpcomingSeasonCard`·`yedu_season_chk_*` localStorage → H4) / `docs\plans\dday-console-h1v12-2026-07-21.md`(수동 5종·자동 3종 명세)
- `C:\work\yonsei-edtech\src\features\dashboard\SemesterKickoffBanner.tsx`(`:26` 관례일 하드코딩 → H5-C1·C3) / `VacationModeCard.tsx`(`:53` → H5-C1) / `src\app\api\cron\weekly-digest\route.ts`(→ H5-C6) / `docs\plans\reactivation-audit-h5v12-2026-07-21.md`(C급 원 목록)·`reactivation-fix-2026-07-21.md`(A·B급 보정 완료 증거)
- `C:\work\yonsei-edtech\src\components\ui\empty-state.tsx`(133파일 사용 vs ad-hoc ~213파일 → M1) / `src\features\activities\StudyCurriculumWizard.tsx`(작성자 미기록 → M2) / `src\app\api\console\cron-runs\trend\route.ts`(→ M3) / `src\features\insights\WebVitalsSection.tsx`(→ M4)
- `C:\work\yonsei-edtech\scripts\check-rawcolor-ratchet.mjs`·`gen-rawcolor-baseline.mjs`(347/347 PASS → M6·M5 게이트 패턴) / `src\lib\whats-new-meta.ts`(`WHATS_NEW_ADDED_DATES` 21건 하드코딩 → L3)
- 부채 실측: rawcolor **347**(상한 347·감축 2라운드 정체) · `EmptyState` **133** / ad-hoc **~213** · TODO/FIXME **37** · L2·L3·L4 **3~4라운드 이월**

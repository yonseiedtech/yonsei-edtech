# 연세교육공학회 차기 라운드 고도화 백로그 v13 — "rawcolor 전소 이후 · ESLint 품질 2단계 · 해커톤 D-32 완주 · 개강 D-42 실주행 — 색상 부채 CEILING 1 달성을 기점으로 다음 품질 전선을 열고, 두 대형 이벤트를 코드가 아닌 실제 운영으로 완주한다" (2026-07-21)

> 작성: 수석 서비스 플래너 (자율 분석 · 대화형 인터뷰 없음 · 코드·git 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, **세션 누적 배포 — v6~v14 일부 포함**)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · **임박 이벤트: 에듀테크 해커톤 2026-08-22 (D-32) · 2026 후기 개강 09-01 (D-42)**
> 실측 근거(2026-07-21 git/grep/Read 직접 실측): HEAD=`769b8d6b` · `git log`(v13 2차: `fecd9df1`·`c17f105c`·`17f680f1`·`81efb594` / v14 부분: `47261730`·`f6304ddc`·`5d707077`·`3d40811e`·`2d4d3e82`·`3f189db7`·`83b24cb9`·`47424b8f`·`e44e9b0b` + 색상 라운드8~10 다수) · **rawcolor ratchet CEILING 1/1 (design-tokens.ts 1건 의도적 잔존·`769b8d6b`)** · **knip deadcode 59/59 (93→59·`3d40811e`)** · `eslint.config.mjs` 실측(react-hooks 신규 5종 warn·no-console warn·no-unescaped-entities warn — **합계 400 warnings / 0 errors** · `npm run lint` 직접 실행 결과) · `eslint-rawcolor-baseline.mjs` 1파일(design-tokens.ts만 잔존) · `git status` 클린.

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE·미변경 확정)

### 0-1. v6~v13 라운드 전량 (재제안 금지)

v6 H1~H6·M1·M2·M6·L1~L3 / v7 13종 / v8 High 6·Medium 6 / v9 H1~H6·M1~M6 / v10 H1~H6·M1~M6·신규 3종 / v11 H1~H6·M1~M6·신규(대내 학술대회·`/console/org`) / v12 H1~H6·M1~M6 / **v13 전항목** — 커밋 해시 확정분 전부 재제안 금지.

v13 완료 항목 요약 (`fecd9df1`·`c17f105c`·`17f680f1`·`81efb594`):

| 항목 | 산출물 | 커밋 |
|---|---|---|
| H1 해커톤 종단 감사·팀뷰 버그 | boardId prop 제거·팀원 모집 섹션 정상화 | `fecd9df1` |
| H2 해커톤 사후 파이프라인 | memberIds·자동적재 ownerId∪memberIds·수상→포트폴리오 1클릭·아카이브 딥링크 | `81efb594` |
| H3/C5 신학기 유입 코드 보정 | cohortKeyOf 8월 보정·effectiveSemesterStart 3곳 공용화 | `81efb594` |
| H4 시즌 체크리스트 공유화 | localStorage→site_settings·체크자·시각·auto 판정 3종 | `81efb594` |
| H5 개강 정합 C급 마감 | 관례일→실개강일 공용화·휴학자 분기·digest D-14 블록 | `81efb594` |
| M1 빈 상태 라운드3 완결 | 회원 대면 19파일 25건 EmptyState 수렴 | `81efb594` |
| M2 마법사 작성자 추적 | activity_participations upsert·자동적재 소스5 | `81efb594` |
| M5 knip 데드코드 ratchet | baseline 93·lint:deadcode·check-deadcode-ratchet.mjs | `81efb594` |
| M6 raw 색상 라운드6 | design-tokens.ts 14상수·19파일·ratchet 347→322 | `c17f105c` |
| L3 whats-new 단일소스 | FEATURE_DATES에서 addedAt 자동 생성·수동 배열 제거 | `fecd9df1` |
| L4 TODO 트리아지 | diagnostic.ts 3건 의도적 유지 확정 | `fecd9df1` |
| 대내 학술대회 CRUD | site_settings internal_conferences | `81efb594` |
| 업무수행철 wiki 통합 | 복수 직책 태그·검색·작성/수정 분리 | `17f680f1` |

### 0-2. v14 완료 항목 (재제안 절대 금지)

v14 계획서(`docs/plans/v14-backlog-2026-07-21.md`) 대비 실측 완료분:

| v14 항목 | 산출물(실측·LIVE) | 커밋 |
|---|---|---|
| **H1** hackathonTag 영역 필터·배지 | `hackathonTag:"idea"/"team-wanted"` 선택·HackathonBoard 필터 탭 | `3f189db7` |
| **H1** 팀뷰 백링크 | 팀 등록 `ideaPostId` 연결·팀 카드 "원본 아이디어" 링크 | `f6304ddc` |
| **H2** 참가 현황 카운터·제출 D-day | 허브 상단 "N팀 참가 중" 뱃지·submission D-day amber/red | `f6304ddc`·`5d707077` |
| **H2** CSV 내보내기 | 운영진 참가자 명단 CSV 내보내기 | `47261730` |
| **H3(v14)** 아이디어 수정·삭제 | comm_boards 해커톤 글 작성자 수정·삭제 | `47261730` |
| **H5(v14)** 시즌 체크리스트 딥링크 | SeasonItem href·/board/write 연결 보정 | `f6304ddc`·`83b24cb9` |
| **M3(v14)** 수상 발표 운영 체크리스트 | UpcomingSeasonCard awards 항목·절차 가이드 | `2d4d3e82` |
| **M4(v14) → 초과 달성** | 색상 라운드7~10 연속 — rawcolor CEILING 322→**1** | 다수(색상 라운드 커밋) |
| **M5(v14)** knip 두 번째 감축 | deadcode ratchet 93→**59** (-34 unused exports/files) | `3d40811e` |
| **L1(partial)** WritingPaperEditor 단축키 | Ctrl+S 저장·kbd 힌트 (한 컴포넌트 한정) | `e44e9b0b` |
| error boundary 5개 추가 | activities·collab·root·mypage·hackathon 에러 경계 확충 | `47424b8f` |
| cron await 버그 수정 | await logCronRun — Vercel freeze 시 promise 유실 방지 | `1667a080` |

**위 항목 전부 재제안 금지.**

### 0-3. v14 미완 이월 항목 (v14 계획서에 있으나 미구현 — v13 new로 승격)

| v14 미완 항목 | 미구현 근거 | v13 배치 |
|---|---|---|
| **H4(v14)** 신입 온보딩 종단 리허설 | 코드 보정(H3/C5) 완료, **테스트 계정 실주행 0회** — 리허설 보고서 부재 | **H2** |
| **H3(v14)** cron 임계 경보 게이트 | 데이터 대기(8/1~5) — v14 계획서에 "8/1~5 착수" 명시 | **H4** |
| **H2(v14)** pinned 공지 인라인 표시 | 5d707077 커밋 메시지에 카운터·D-day만 명시 — pinned 공지 노출 미확인 | **H3 내 포함** |
| **M1(v14)** web_vitals 목표선 | 데이터 대기(8/1~5) | **M1** |
| **M2(v14)** kudos 리더보드 | 볼륨 대기(9/1 이후) | **M4** |
| **M6(v14)** 해커톤 실전 회고 집계 뷰 | 8/22 행사 이후 데이터 필요 | **M3** |
| **L2(v14)** funnel 전환 개선 | 9/15 이후 신입 유입 funnel 필요 | **L2** |
| **L3(v14)** loyalty/adoption 코호트 | 10월 이후 | **L3** |

### 0-4. 상주 인프라 (재제안 금지 — 활용만)

색상 시스템(`design-tokens.ts` 1건 의도적 잔존·`eslint-rawcolor-baseline.mjs` 1파일·rawcolor 게이트 CEILING 1) · 데드코드 ratchet(knip 59·`check-deadcode-ratchet.mjs`) · 측정(`visit-tracker`·funnel·`search_misses`·`adoption/loyalty-snapshot`·`web_vitals`) · 관측(`withCronLog`/`cron_runs`·`cron-watchdog`·추세 리더) · 관계(`kudos`·`weekly_goal_records`·`digest`) · 신학기(`newcomer-activation-sequence`·`pending-signup-nudge`·`semester-start-reminder`·`cohortKeyOf` 보정 완료) · 행사(`hackathon_submissions`/`judgings`·`hackathon_ops`·팀뷰·pinned 공지·D-day 허브) · 성장(`useSemesterWrapped` 상시·포트폴리오 자동적재 ownerId∪memberIds) · 인수인계(`handover_docs`·리포트 자동 채움) · 시즌(`UpcomingSeasonCard`·site_settings 공유 체크리스트·whats-new 단일소스).

---

## 1. v13 핵심 명제

> **raw color CEILING이 347에서 1로 수렴됐다(design-tokens.ts 1건은 의도적·불변). 9라운드·300커밋에 걸쳐 만든 "색상 시맨틱 토큰 전환"이 완료됐고, deadcode ratchet도 59로 낮아졌다. 이 두 ratchet이 코드베이스 품질의 하한을 잠근 지금, 다음 전선이 보인다: 398개의 ESLint warnings이다.** eslint.config.mjs 실측 결과, 이 398건은 `react-hooks` 신규 5종(set-state-in-effect·purity·preserve-manual-memoization·refs·immutability — 배포 차단 방지로 warn 완화, 실제 109건 추정)·`no-console`(console.log 다수)·`react/no-unescaped-entities`(JSX 특수문자 미이스케이프)가 주류다. rawcolor처럼 ratchet으로 잠근 뒤 점진 해소할 수 있는 구조. 동시에 **D-32 해커톤과 D-42 개강은 코드가 아니라 실제 운영 실주행으로 완주해야 한다** — v14가 확보한 인프라(팀 매칭·D-day 허브·수상 파이프·체크리스트·cohort 보정·digest D-14)는 모두 "코드로 준비됐으나 실제로 걸어본 적 없는" 상태다. v13은 각도를 **"전소 이후 전선 전환(Next Frontier) · 실전 완주(Execution) · 품질 2단계(ESLint)"** 로 잡는다.

### 1-1. 실측된 v13 3대 명제

| # | 명제 | 실측 근거(2026-07-21) |
|---|---|---|
| ① | **rawcolor 전소 → ESLint가 다음 품질 전선** | CEILING 1/1(769b8d6b) · eslint.config.mjs react-hooks 5종 warn·no-console warn · `npm run build` 0 errors · **400 warnings 잔존** — 분석·트리아지·ratchet 부재 |
| ② | **D-32 해커톤: 인프라 완비, 실전 실주행 0회** | v14 H1 tag/필터·H2 카운터/D-day · M3 수상 체크리스트 LIVE — 그러나 **pinned 공지 인라인·합류 숏컷 결과 미확인** · ops 종단 리허설(접수→제출→심사→수상) 보고서 없음 |
| ③ | **D-42 개강: 코드 보정 완료, 테스트 계정 실주행 0회** | v13-H3/C5 cohort 보정 · H5 개강 정합 완료 — **`NewcomerProgressWidget`·승인 이메일·착지 URL 실경로 검증 없음** · 8월 신입 가입 몰리기 전 D-14(8/18) 이전 실주행 필요 |

### 1-2. 실측된 기술 부채 현황

| 부채 | 현재 | 게이트 | v13 목표 |
|---|---|---|---|
| **raw color** | **1** (의도적) | CEILING 1 고정 | 완료 — 재제안 금지 |
| **knip unused** | **59** | ratchet 59 | **<40** (M2 두 번째 감축) |
| **ESLint warnings** | **400** | 없음 | 트리아지 후 ratchet 고정 + 즉시 해소 배치 (H1) |
| **빈 상태(ad-hoc)** | 완결 (v13-M1) | — | 완료 |
| **TODO/FIXME** | ~37건 (의도적) | — | 완료 (v13-L4) |
| **단축키 힌트** | WritingPaperEditor 1곳 partial | — | L1 — 나머지 확대 |

---

## 2. 고도화 백로그 (v13 · 14항목)

> **High = 외부 의존 없이 코드·감사만으로 완결 · 8월 실전 직결** · 감사형 = H2·H3(일부) (2건) · 구현형 = H1·H3(일부)·H4 (3건, 신규 컬렉션 0)
> **신규 컬렉션 0 · LLM 무의존 · 기존 자산·ratchet 패턴 재사용 100%**

### High (즉시 착수 · 외부의존 없음 · ROI 높음)

---

**H1. ESLint warnings 400 트리아지 + ratchet 게이트 + 즉시 해소 배치 — rawcolor 전소 이후 다음 품질 전선 개막**

- 문제/근거: `eslint.config.mjs` 실측에서 400 warnings의 주류는 세 그룹 — **(A) react-hooks 신규 5종**(set-state-in-effect·purity·preserve-manual-memoization·refs·immutability)이 109건 추정: 배포 차단 방지로 error→warn 완화됐으나 **React Compiler 없이 무조건 끄면 진짜 버그를 놓칠 수 있어 재검토 필요**. **(B) `no-console`**: 다수 console.log — 운영 로깅용이 아닌 디버그 잔재. **(C) `react/no-unescaped-entities`**: JSX 내 `'`, `"`, `>` 미이스케이프 — 렌더에는 무해하나 품질 노이즈. rawcolor가 ratchet으로 잠긴 지금 이 398건이 "다음 기술 부채 전선"이다. ratchet 없이 방치하면 신규 유입으로 숫자만 늘어난다.
- 제안 구현: **(1) 분류 감사(무코드)** — `npm run lint 2>&1 | grep warning` 출력을 규칙별로 집계해 (A)·(B)·(C) 건수 확정 + 오탐(의도적 패턴) vs 진짜 문제 분리. **(2) 즉시 해소 배치** — (B) console.log → console.warn 또는 삭제(순수 디버그 잔재), (C) no-unescaped-entities HTML entity 치환(순수 코스메틱 · 로직 불변). **(3) ratchet 게이트** — rawcolor ratchet 패턴(`scripts/check-rawcolor-ratchet.mjs`) 그대로 복제해 `scripts/check-eslint-warning-ratchet.mjs` 작성: `npm run lint --max-warnings 0 2>&1 | grep "([0-9]+ warnings)"` 건수 파싱 → 현 해소 후 값으로 상한 고정 → 초과 시 prebuild FAIL. **(4) react-hooks 5종 재검토** — 109건 중 진짜 위험(effect 내 비동기 setState)을 식별하고 위험 케이스는 eslint-disable-next-line 주석으로 명시화(암묵적 warn 방치 탈피). 전량 해소가 아닌 **"감사 → 분류 → ratchet 잠금"** 까지가 이 라운드 범위.
- 기대효과: 400건 무방비 방치 → "건수 파악 + 하한 잠금"으로 전환. console.log 정화로 프로덕션 로그 노이즈 절감. rawcolor ratchet 확장 → ESLint 품질 게이트 2단계 완성.
- 참고 파일: `C:\work\yonsei-edtech\eslint.config.mjs`(규칙 구성·warn 목록) · `scripts/check-rawcolor-ratchet.mjs`(ratchet 패턴) · `scripts/gen-rawcolor-baseline.mjs`(baseline 재생성 패턴)
- 규모: **S** (감사·ratchet) + **S~M** (즉시 해소 배치) · 신규 컬렉션: **불필요** · 리스크: react-hooks 109건을 error로 올리면 빌드 차단 — 이번 라운드는 warn 유지·위험 케이스 명시화만. ratchet은 해소 후 값으로만 고정(강제 감축 없음).

---

**H2. 신입 온보딩 종단 리허설 + 발견 결함 핫픽스 — D-42, 코드 아닌 실경로를 걷는다 (감사형 · v14-H4 이월)**

- 문제/근거: v13-H3/C5에서 `cohortKeyOf` 8월 가입→다음 학기 코호트 보정·`effectiveSemesterStart` 3곳 공용화가 완성됐고, H5에서 개강 정합 C급이 마감됐다. 그러나 **테스트 계정으로 "가입→승인→첫 로그인→첫 활동"을 이어 걸어본 이력이 없다**(v13·v14 모든 보고서에 리허설 보고서 부재 확인). 코드 보정은 됐으나 승인 이메일 문구·착지 URL·`NewcomerProgressWidget` 표시 타이밍·스터디 신청 진입 마찰이 실측된 게 아니다. **개강 2주 전(8/18)이 경계선** — 이 날 이후엔 발견 결함을 교정할 여유가 없다.
- 제안 구현: **(1) 테스트 계정 실주행** — 가입 4단계(약관→계정→학적→선택) · 운영진 콘솔 승인 · 승인 이메일 수신·착지 URL 검증 · 첫 로그인(`NewcomerProgressWidget` 표시 여부·온보딩 배너·시즌 체크리스트 자동 판정) · 첫 활동(진단평가 시작 또는 스터디 신청). **(2) 리허설 산출** — 단계별 [기대 vs 실제] 표를 `docs/plans/newcomer-rehearsal-h2v13-{date}.md`로 기록. **(3) 발견 결함 경량 핫픽스** — 문구 오타·CTA 착지 오류·빈 상태 누락 등 표현 계층만(로직 재설계 금지). **(4) 테스트 계정 삭제** — 리허설 완료 후 `delete-orphan-auth.mjs`(기존 스크립트)로 삭제.
- 착수 기한: **8월 18일 이전 필수** (개강 D-14)
- 참고 파일: `src/app/(auth)/signup/` · `src/app/api/email/approval/route.ts` · `src/features/dashboard/NewcomerProgressWidget.tsx` · `src/lib/semester.ts` · `src/app/api/cron/newcomer-activation-sequence/` · `scripts/delete-orphan-auth.mjs`
- 규모: **S** (리허설) + S~M (발견 결함 규모에 따라 추가) · 신규 컬렉션: **불필요** · 리스크: 프로덕션에서 테스트 계정 알림 수신자 노출 → 테스트 전용 이메일 사용(기존 패턴)·리허설 직후 삭제 절차 체크리스트 마지막에 강제.

---

**H3. 해커톤 D-32 실전 최종 점검 — pinned 공지 인라인 + 합류 숏컷 완결 + ops 종단 리허설 (D-32 직결 · 감사→구현)**

- 문제/근거: v14-H1·H2 구현으로 hackathonTag 필터·팀뷰 백링크·참가 카운터·D-day 강조가 LIVE다. 그러나 **(a) pinned 공지 인라인 표시**: `5d707077` 커밋 메시지("참가 현황 카운터 + D-day 강조")에 pinned 공지 미언급 — `/hackathon` 허브 상단 공지 노출 미확인. **(b) 합류 신청 숏컷**: v14-H1 계획의 (3)번 항목("아이디어 글 하단 → 팀 합류 신청 버튼 → register?teamName 프리필")이 구현 커밋(`3f189db7`="hackathonTag 영역 태그 선택·배지·필터탭"만)에서 누락 개연. **(c) ops 종단 리허설**: 운영자가 registration→submission→judging→awards를 실데이터로 한 번 걸어본 이력이 없음(`hackathon_ops.phase` override 활용 안 함). 8/22까지 D-32 — 이 세 가지가 실전 전 마지막 점검이다.
- 제안 구현: **(1) 코드 감사** — `src/app/hackathon/page.tsx`에 pinned 공지 인라인 블록이 있는지 직접 확인; 없으면 `comm_boards` hackathon 컨텍스트 `pinned:true` 최신 1건 인라인 표시 추가(기존 boards API 재사용, 없을 때 빈 상태 처리). **(2) 합류 숏컷 코드 감사** — `HackathonBoard.tsx` 아이디어/team-wanted 게시글에 "이 팀 합류 신청" 버튼 존재 여부 확인; 없으면 추가(`/hackathon/register?teamName=` 프리필 · v14-H1 계획대로). **(3) ops 종단 리허설(감사형)** — `hackathon_ops.phase` override로 registration→submission→judging→awards 순차 전환하며 각 단계에서 회원 표면·콘솔 표면 실주행 + [기대 vs 실제] 표 기록. 리허설 후 override null 복원(복원 단계를 체크리스트 마지막에 명시). 테스트 제출물 `[리허설]` 접두사 후 삭제.
- 참고 파일: `src/app/hackathon/page.tsx` · `src/features/hackathon/HackathonBoard.tsx` · `src/features/hackathon/HackathonPhaseTimeline.tsx` · `src/features/hackathon/config.ts`(`:91~95` 제출 마감·`:191~196` ops override) · `src/app/console/hackathon/page.tsx`
- 규모: **S** (감사 + 발견 결함 핫픽스) · 신규 컬렉션: **불필요** · 리스크: ops override 프로덕션 켠 채 방치 시 실사용자에게 가짜 단계 노출 → **리허설 창을 30분 이내로 잡고 복원 절차 체크리스트 강제**.

---

**H4. cron 임계 경보 게이트 — 8/1~5 데이터 도래 후 즉시 착수 (v14-H3 이월 · 데이터 대기)**

- 문제/근거: v12-H2 cron 추세 리더가 LIVE로 성공률 스파크라인을 제공하지만 **임계 미달 시 자동 경보가 없다**. 8/22 해커톤은 `hackathon-submission-reminder`·`newcomer-activation-sequence`·`pending-signup-nudge` cron이 최대 부하를 받는 시기. cron 하나가 조용히 실패하면 참가자·신입이 알림을 못 받는다. **임계 산정에 필요한 trend 데이터가 8/1~5에 도래** — v14 계획서에 "8/1~5 착수"로 명시된 항목.
- 제안 구현: **(1) 데이터 확인** — 8/1~5 `api/console/cron-runs/trend` 실데이터로 kind별 성공률 분포 확인. **(2) 임계 산정** — 14일 이동 평균 < 80% && 직전 7일 대비 -15%p 동시 충족 시 경보(hackathon-submission-reminder는 90%로 엄격). **(3) 콘솔 배지 구현** — 임계 하회 kind 발생 시 콘솔 랜딩 "cron 이상 N건" pending 배지(v11-H3 큐 패턴 재사용). `withCronLog`·`cron_runs` 재사용, 신규 컬렉션 없음. 경보 발송(push/email)은 §4 외부 의존 — 이번 라운드는 콘솔 배지까지.
- 착수 시점: **8월 1~5일 (데이터 도래 확인 후 즉시)**
- 참고 파일: `src/app/api/console/cron-runs/trend/route.ts` · `src/app/console/page.tsx`(pending 큐 배지) · `src/features/insights/CronLogsSection.tsx`
- 규모: **S** · 신규 컬렉션: **불필요** · 리스크: 일시 실패 오경보 → 14일+7일 이중 조건·초기 배지 전용(발송 없음) 보수 운영.

---

### Medium (1~2 스프린트 · 파일 영역 독립)

---

**M1. web_vitals 라우트 목표선·회귀 표식 — 2개월 누적 기준선 수확 (v14-M1 이월 · 8/1~5 착수)**

- 문제/근거: `web_vitals` 10% 샘플이 v9-H6부터 축적, `WebVitalsSection`·`admin/insights`가 LIVE이나 목표선·회귀 감지 없이 수치 나열. **8/1~5 = 2개월 누적으로 라우트별 p75 기준선 산정 가능** — v14 계획에도 명시된 착수 시점.
- 제안 구현: 8/1~5 실데이터로 라우트별 p75 확인 → `WebVitalsSection`에 Core Web Vitals 권장치(LCP 2.5s·CLS 0.1·INP 200ms) 대비 상태색 + 직전 2주 대비 악화 라우트 배지. 표본 N 미달 라우트는 "표본 부족" 레이블(읽기 전용 표현 계층).
- 착수 시점: **8/1~5** (H4와 동시 착수 가능 · 파일 영역 독립)
- 참고 파일: `src/features/insights/WebVitalsSection.tsx` · `src/app/admin/insights/page.tsx`
- 규모: **S** · 신규 컬렉션: **불필요** · 리스크: 저트래픽 라우트 노이즈 → N 미달 표시 완화.

---

**M2. knip deadcode 59→<40 두 번째 실질 감축 — ratchet 상한 인하**

- 문제/근거: v13-M5에서 baseline 93 고정, v14-M5에서 93→**59**(-34)로 첫 감축 완료. 두 번째 감축 라운드를 진행하면 ratchet 상한을 <40으로 인하할 수 있다. rawcolor처럼 ratchet을 "회귀 방지 + 점진 감축"의 두 바퀴로 운영할 구조가 완성된다.
- 제안 구현: `npm run lint:deadcode` 결과에서 안전 삭제 상위 20~25건(미참조 타입·유틸 함수·미사용 컴포넌트 export) 제거 → `check-deadcode-ratchet.mjs` 상한 재생성(59→<40). ts-prune 오탐(동적 import·타입 전용) 허용 목록 정교화.
- 참고 파일: `scripts/check-deadcode-ratchet.mjs` · `knip.json`
- 규모: **S~M** · 신규 컬렉션: **불필요** · 리스크: 동적 import 대상 삭제 시 런타임 오류 → 삭제 전 grep 교차 확인 필수.

---

**M3. 해커톤 실전 회고 집계 뷰 — 8/22 이후 즉시 수확 (v14-M6 이월)**

- 문제/근거: v13-H2에서 수상→포트폴리오·아카이브 파이프가 완성됐으나, 행사 전체 지표(참가 신청·팀 확정·제출·심사율·수상·포트폴리오 자동적재)를 한 화면에서 볼 집계 뷰가 없다. 8/22 이후 데이터가 채워지면 즉시 분석 가능하도록 쿼리를 미리 준비한다.
- 제안 구현: `/console/hackathon` 심사 탭에 "행사 결과 요약" 섹션(참가 신청 N건·팀 확정 N팀·제출 N건·심사율·수상 N건·포트폴리오 자동적재 N건). 전량 기존 컬렉션 집계(신규 쿼리만 추가). 8/22 이후 데이터 채워지면 자동 완성(읽기 전용).
- 착수: **8/15 이후** (제출 데이터 누적 후 쿼리 준비) → **8/22 이후** (결과 데이터 자동 표시)
- 참고 파일: `src/app/console/hackathon/page.tsx` · `src/lib/bkend.ts`
- 규모: **S** · 신규 컬렉션: **불필요** · 리스크: 없음(읽기 전용 집계).

---

**M4. kudos 리더보드 위젯 — 해커톤·개강 참여 모멘텀 (v14-M2 이월 · 9/1 이후 볼륨 확인)**

- 문제/근거: v11-H2에서 kudos 관계 확장 완료. 해커톤·개강으로 kudos 볼륨이 최고조 예정이지만 학회 전체 기여 순위·주차 추이가 공개 표면에 없어 상호 인정의 사회적 압력이 작동하지 않는다.
- 제안 구현: `/dashboard` 또는 `/mypage`에 "이번 달 kudos TOP 5" 위젯 + 본인 순위 강조. 주차 집계(`kudos.created_at` 7일 버킷). `display_name` 사용.
- 착수 조건: **9/1 이후 kudos 누적 N≥50 확인 후**
- 참고 파일: `src/app/dashboard/page.tsx` · `src/features/kudos/` · `src/lib/bkend.ts`
- 규모: **S~M** · 신규 컬렉션: **불필요** · 리스크: 볼륨 부족 시 리더보드 무의미 → 착수 전 count 확인.

---

**M5. 개강 시즌 신입 실시간 운영 관측 — 승인 처리 속도·넛지 발송 현황 가시화 (신규)**

- 문제/근거: 개강 후 신입 가입이 몰리면 운영진은 **"지금 미처리 신청이 몇 건인지·넛지가 발송됐는지·신입 중 첫 활동한 비율이 얼마인지"를 한 화면에서 볼 수 없다**. v11-H3 처리 대기 큐에 신청 배지는 있지만 **신입 전용 집계(승인 SLA·넛지 발송 이력·코호트별 첫 활동률)** 부재. 개강 2주간(9/1~9/14)이 신입 전환의 황금 창이다.
- 제안 구현: 콘솔 랜딩(`console/page.tsx`) 또는 `/console/academic/applications` 상단에 "신입 온보딩 현황 미니 대시보드" — ① 미처리 승인 N건·평균 대기 시간 ② D+1/3/7/10/14 넛지 발송 이력(kind=newcomer-activation-sequence `cron_runs` 최근 5건) ③ 최근 승인 신입 중 첫 활동(진단/스터디/아카이브 방문) 비율. 전량 기존 컬렉션 집계(`users`·`cron_runs`·`user_activity_logs` 또는 `visit_logs`). 신규 컬렉션 없음.
- 참고 파일: `src/app/console/page.tsx` · `src/app/console/academic/applications/page.tsx` · `src/app/api/console/cron-runs/route.ts`
- 규모: **S~M** · 신규 컬렉션: **불필요** · 리스크: 첫 활동률 집계를 어느 컬렉션 기준으로 할지 정의 필요(visit_logs 또는 activity_participations) → 콘솔 display에 집계 기준 명시.

---

### Low (여유 시 · carryover)

**L1. 단축키 힌트 확대 (발견성 · 8라운드 이월 · S)** — WritingPaperEditor Ctrl+S partial 구현 완료(`e44e9b0b`). 나머지 핵심 버튼(저장·제출·대화상자·커맨드 팔레트 Cmd+K) `<kbd>` tooltip 병기 확대. **경고: v13에서도 미구현 시 백로그에서 영구 삭제 검토 (v8부터 8라운드 이월).**

**L2. funnel 전환 개선 실험 (9/15 이후 · M)** — 개강 후 신입 N≥30 유입 시 funnel 병목 라우트 특정 → 개선 가설 1건 착수. 착수 조건: 9/15 이후. (v14-L2 이월)

**L3. loyalty/adoption 코호트 기준선 (10월 이후 · S+M)** — `adoption/loyalty-snapshot` cron 1회전(약 3개월) 후 코호트별 retention 기준선 산정 → 개선 구현. 착수 조건: 10월 이후. (v14-L3 이월)

---

## 3. 데이터 축적 대기 항목 (착수 시점 재평가)

| 대기 항목 | 의존 데이터 | v13 재평가(2026-07-21) | 배치 |
|---|---|---|---|
| **cron 임계 경보 (H4)** | trend 2개월 성공률 분포 | **8/1~5 착수** — v14에서 이미 착수 예고 | H4 |
| **web_vitals 목표선 (M1)** | 라우트별 p75 2개월 누적 | **8/1~5 착수** — v14에서 이미 착수 예고 | M1 |
| **kudos 리더보드 (M4)** | 해커톤·개강 kudos 볼륨 N≥50 | **9/1 이후** | M4 |
| **해커톤 실전 회고 (M3)** | 8/22 행사 실데이터 | **8/22 이후 즉시** | M3 |
| **funnel 전환 개선 (L2)** | 개강 후 신입 유입 funnel | **9/15 이후** | L2 |
| **loyalty/adoption 코호트 (L3)** | 학기 경계 1회전 | **10월 이후** | L3 |

---

## 4. 외부 의존 항목 (운영진 결정·인프라 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| **네이버 서치어드바이저 검증 코드** | 사용자(계정 소유자) 발급 대기 — 코드 수신 즉시 반영 가능 (S) |
| **해커톤 심사위원 배정·심사 루브릭·외부 심사위원 여부** | 운영진 이벤트 기획 확정 |
| **해커톤 수상작 아카이브 "발행" 검수** | 운영진 콘텐츠 검수 (코드는 딥링크 프리필까지 준비됨) |
| **cron 임계 경보 "발송" 정책** (H4는 콘솔 배지까지) | 푸시/알림 발송 정책 합의 |
| **신입 승인 SLA·담당·처리 기한** (H2 리허설 기반 보완 가능) | 운영진 합의 |
| **개강 시즌 콘텐츠 작성** (환영 공지·스터디 모집·신입 환영 게시글) | 운영진 콘텐츠 발행 |
| **kudos 리더보드 공개 범위·명칭 표시 정책** (M4 착수 전) | 운영진 개인정보·운영 정책 확인 |
| `analytics-retention` cron **스케줄 활성화** | 개인정보 보존 정책 확정 |
| Sentry 등 **에러 리포팅 연동** (v9-H2 에러 경계 확장) | 외부 계정·비용 승인 |
| Firestore 정기 export/백업 · 세미나 라이브 다시보기 (carryover) | GCP 스케줄러/GCS · 저작권 |

---

## 5. 즉시 착수 Top 5 (병렬 편성안 · 파일 영역 비중복)

| 트랙 | 항목 | 파일 영역 | 착수 |
|---|---|---|---|
| **트랙 A** | **H1 ESLint 트리아지·ratchet·해소 배치** | `scripts/check-eslint-warning-ratchet.mjs`(신규) · 프로젝트 전역(console.log 정화·entities 치환) | 즉시 |
| **트랙 B** | **H3 해커톤 점검 — pinned 공지·합류 숏컷·ops 리허설** | `src/app/hackathon/page.tsx` · `HackathonBoard.tsx` (읽기→발견 결함만 소규모 수정) | 즉시 (트랙 A와 파일 영역 독립) |
| **트랙 C** | **H2 신입 온보딩 종단 리허설** | 읽기 중심 감사 · 발견 결함 시 signup·newcomer 계층만 수정 | 즉시 (D-42 기한 8/18) |
| **트랙 D** | **M2 knip 59→<40 두 번째 감축** | `scripts/check-deadcode-ratchet.mjs` · 삭제 대상 unused export 파일들 | 즉시 (표현 계층 · 타 트랙 독립) |
| **트랙 E(데이터 대기)** | **H4 cron 임계 · M1 web_vitals 목표선** | `src/app/api/console/cron-runs/trend/route.ts` · `WebVitalsSection.tsx` | 8/1~5 데이터 도래 후 즉시 |

> **병렬 규칙:**
> - 트랙 A·B·C·D는 파일 영역 비중복 → **4트랙 동시 launch 가능.**
> - 트랙 A(ESLint 정화)가 광역 파일 접촉 — 다크모드 무관하지만 동일 tsx 파일 편집 시 타 트랙과 순차 확인.
> - 트랙 E는 8/1~5 신호 확인 후 자동 해제 → launch.
> - M3·M4·M5는 시차 배치(M3: 8/15, M4: 9/1, M5: 9/1 이후).
> - **배포 게이트: tsc·build·rawcolor ratchet(CEILING 1)·deadcode ratchet(59, M2 후 <40) + H1 이후 ESLint warning ratchet 추가 + 배포 후 QA 스모크(해커톤 허브·콘솔 랜딩·마이페이지·신규 가입 폼) 필수.**

---

## 6. 참고 파일 (절대경로 · 실측 2026-07-21)

- `C:\work\yonsei-edtech\eslint.config.mjs` — react-hooks 5종 warn·no-console·no-unescaped-entities 규칙 구성 (**H1 트리아지 출발점**)
- `C:\work\yonsei-edtech\eslint-rawcolor-baseline.mjs` — **1파일(design-tokens.ts)만 잔존** (rawcolor CEILING 1 증거)
- `C:\work\yonsei-edtech\scripts\check-rawcolor-ratchet.mjs` · `gen-rawcolor-baseline.mjs` — ESLint warning ratchet 패턴 참조 (**H1-3번 신규 ratchet 작성 기반**)
- `C:\work\yonsei-edtech\scripts\check-deadcode-ratchet.mjs` · `knip.json` — **deadcode ratchet 59 고정** (M2 상한 인하 목표)
- `C:\work\yonsei-edtech\src\app\hackathon\page.tsx` — pinned 공지 인라인 표시 여부 확인 (**H3-1번**)
- `C:\work\yonsei-edtech\src\features\hackathon\HackathonBoard.tsx` — 합류 신청 숏컷 존재 여부 확인 (**H3-2번**)
- `C:\work\yonsei-edtech\src\features\hackathon\config.ts` (`:91~95` 제출 마감 · `:191~196` ops override) — **H3-3번 리허설 도구**
- `C:\work\yonsei-edtech\src\features\dashboard\NewcomerProgressWidget.tsx` · `src\lib\newcomer-sequence.ts` — **H2 리허설 검증 대상**
- `C:\work\yonsei-edtech\src\app\api\email\approval\route.ts` · `src\app\api\cron\newcomer-activation-sequence\` — **H2 실주행 검증**
- `C:\work\yonsei-edtech\src\app\api\console\cron-runs\trend\route.ts` · `src\features\insights\CronLogsSection.tsx` — **H4·M1 데이터 도래 시 착수**
- `C:\work\yonsei-edtech\src\app\console\page.tsx` — pending 큐 배지 패턴 (**H4 경보 배지 재사용**) · M5 신입 운영 관측 추가 위치
- `C:\work\yonsei-edtech\src\app\console\hackathon\page.tsx` — **M3 회고 집계 뷰 추가 위치**
- `C:\work\yonsei-edtech\src\features\insights\WebVitalsSection.tsx` · `src\app\admin\insights\page.tsx` — **M1 목표선 표식 추가 위치**

---

*파일: `docs/plans/service-enhancement-plan-v13.md` | 생성: 2026-07-21 | HEAD: `769b8d6b` | rawcolor CEILING: 1/1 | deadcode ratchet: 59/59 | ESLint warnings: 400/0 | 다음 재검토: 8/22 해커톤 실전 데이터 확보 후 v14(재검토) 또는 v15 편성*

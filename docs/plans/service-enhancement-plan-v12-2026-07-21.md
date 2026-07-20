# 연세교육공학회 차기 라운드 고도화 백로그 v12 — "시즌을 코앞에 둔 준비도 · 성장의 가시화 · 이제야 수확 가능한 축적 데이터 · 인수인계 내구성 — D-40 실전 앞에서 기존 자산을 '앞으로 보는 창'으로" (2026-07-21)

> 작성: 수석 서비스 플래너 (자율 분석 · 대화형 인터뷰 없음 · 코드·git 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, **53번째 배포 — v6·v7·v8·v9·v10·v11 6개 라운드 전량 소진**)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · **임박 이벤트: 에듀테크 해커톤 2026-08-22 (D-32) · 2026 후기 개강 09-01 (D-42)**, 8~9월 신입 유입·온보딩 시즌
> 실측 근거(2026-07-21 git/grep/ls/Read 직접 실측): `git log`(v11 배포: `b7cf52ea`·`cde9e031`·`3048736e`·`bef81d01`·`77a46ee9`) · `git status`(작업트리 클린 — 미배포분 0, `.claude/settings.local.json`만 untracked) · v11 계획서 + 구현 보고서 21종 · **기반 자산 실존 확인**: `SemesterWrappedView.tsx`·`useSemesterWrapped.ts`(학기 결산) · `console/handover`(업무노트)·`OrgChartEditor.tsx`(직책별 handover 메모·`handover_docs` role 연결) · `console/academic-calendar/page.tsx`(479줄) · `cron-logs/page.tsx`(cron_runs kind별 소비) · `mypage/portfolio/page.tsx`(630줄·자동적재) · 부채 실측: `next/dynamic` **8건**(v10-H2 유지) · TODO/FIXME **37건**(유지) · cron **32 디렉토리** · rawcolor ratchet 상한 **347 고정** · ad-hoc 빈 상태 **~330파일**(광의 grep)/`EmptyState` **110곳**.

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE·미변경 확정)

### 0-1. v6~v10 라운드 + 벤치마크 전량 (재제안 금지)
v6 H1~H6·M1·M2·M6·L1~L3, v7 13종, v8 High 6·Medium 6, v9 H1~H6·M1~M6, v10 H1~H6·M1~M6·신규 3종, 벤치마크 전량 — v7~v11 계획서 §0에 커밋 해시로 확정. **전부 재제안 금지.**

### 0-2. v11 라운드 (오늘까지 배포 · **재제안 절대 금지**)

| v11 항목 | 산출물(실측·LIVE) | 커밋 | 상태 |
|---|---|---|---|
| **H1** 신규 기능 첫 사용 온보딩 | 교수설계 마법사·해커톤 팀 첫 사용 발견성 핫픽스(EmptyState CTA·힌트·dismiss) | `3cd80a5d` | LIVE |
| **H2** kudos 관계 확장 | `KudosInlineButton`·`KudosSendBlock`·`useKudosSend` — 코호트 밖(멘토·스터디원·팀원) 응원 경로 | `3cd80a5d` | LIVE |
| **H3** 운영진 처리 대기 통합 큐 | `console/page.tsx` pending에 **포트폴리오 검증(external+awards)·미매핑 졸업논문·콘텐츠 초안** 집계+딥링크(`oldestElapsedLabel`) | `3cd80a5d` | LIVE |
| **H4** 콘텐츠 신선도 리뷰 루프 | 아카이브 stale 후보·검토 큐·`lastReviewedAt`·정적 가이드 검토일 | `3cd80a5d` | LIVE |
| **H5** 커뮤니티·피어 동선 감사 | 크로스링크·nav 핫픽스(커뮤니티 동선 8건) | `3048736e` | LIVE(감사) |
| **H6** 신규 기능 자동화 완성도 감사 | 수동 단계 전수·분류 → 자동화 R1~R4 고위험 수정 | `3cd80a5d`·`3048736e` | LIVE(감사) |
| **M1~M6** 빈상태·kudos↔멘토링·마법사 소비 심화·신입 시퀀스·OG 잔여·whats-new 자동 최신성 | 각 LIVE(마법사 설계 요약 카드·대시보드 회차 목표·M5 메타·M6 신선도) | `cde9e031`·`b7cf52ea` | LIVE |
| **신규** 대내 학술대회 일반화·운영진 설정 독립 메뉴(`/console/org`)·편집 학기 연동 | `3048736e` | LIVE |

**위 항목은 전부 재제안 금지.** 특히:
- **kudos 관계 확장(v11-H2)·처리 대기 통합 큐(v11-H3)·콘텐츠 신선도 루프(v11-H4)**는 완결 — v12에서 재제안하지 않는다. v12-H2(cron 추세)는 별개 데이터원(cron_runs)이고, v11-H3의 pending 큐(회원·포트폴리오·논문·초안)와도 무관.
- **교수설계 마법사 첫 사용/소비(v11-H1·M3)**·**whats-new 자동 최신성(v11-M6)** 재제안 금지. v12는 그 위의 **개강 시즌 노출 연계**만.
- **운영진 설정 독립 메뉴(`/console/org`)** 재제안 금지 — v12-H3은 그 안 OrgChart의 **인수인계 완성도 감사**만(재구성 아님).

### 0-3. 상주 인프라 (재제안 금지 — 활용만)
측정(`visit-tracker`·funnel·`search_misses`·`adoption-snapshot`·`loyalty-snapshot`·`web_vitals`) · 관측(`withCronLog`/`cron_runs`·`cron-watchdog`) · 관계(`kudos`(**관계 확장 완료**)·`weekly_goal_records`·`digest`) · 정리(`analytics-retention`·`notifications-cleanup`) · 신학기(`newcomer-activation-sequence`·`pending-signup-nudge`·`semester-start-reminder`) · 행사(`hackathon_*`) · **성장 서사(`useSemesterWrapped`·`MyGrowthWidget`·`mypage/portfolio`)** · **인수인계(`console/handover`·`handover_docs`·`OrgChartEditor` handover 메모)** · **개강(`SemesterKickoffBanner` D-7~D+14 회원 배너·`console/academic-calendar`)**.

---

## 1. v12 핵심 명제

> **여섯 라운드가 "만들고(v6) → 측정·개선(v7) → 소비 완결·정리(v8) → 리허설·신뢰(v9) → 수확·상환·실행(v10) → 첫 사용·연결·신선도(v11)"를 끝냈다. 그 결과 서비스에는 시즌 운영(`academic-calendar`·`SemesterKickoffBanner`), 회원 성장 서사(`useSemesterWrapped`·`portfolio`·`MyGrowthWidget`), 축적 데이터 인프라(`cron_runs`·`web_vitals`·`kudos`), 운영 인수인계(`handover`·`OrgChart` handover 메모)까지 자산이 이미 다 깔렸다. 그러나 이들은 하나같이 "지금·과거를 기록"할 뿐, (a) 8/22 해커톤·9/1 개강까지 남은 준비를 '앞으로 역산해 보여주는' 운영자 창이 없고, (b) 성장 서사는 학기말 게이트에 갇혀 정작 유입기(8~9월)엔 회원이 자기 성장을 볼 수 없으며, (c) 수 주간 쌓인 `cron_runs`가 "kind별 최신값"으로만 소비돼 추세·열화가 안 보이고, (d) 인수인계 자산은 있으나 '직책별 업무노트 공백·최신성'을 점검할 완결성 뷰가 없다."** v12는 각도를 **"준비도 · 성장 가시화 · 축적 수확 · 인수인계 내구성(Readiness · Growth-visibility · Harvest · Continuity)"** 로 바꾼다 — 기록형 자산을 **"앞으로 보는 창·상시 보는 창·추세로 보는 창·공백을 보는 창"** 으로 전환한다. **신규 컬렉션 0 · 기존 자산 재사용 100% · 표현/집계 계층 우선** — 6 High 중 감사형 2건(H3·H5), 나머지도 전량 기존 컬렉션 재사용, 신규 표면 최소.

### 1-1. 실측된 v12 4대 갭 (렌즈별 출발점)

| # | 렌즈 | 실측된 갭 | 근거(2026-07-21) |
|---|---|---|---|
| ① | **개강 D-40 운영 캘린더** | **다가오는 시즌 이벤트를 운영자에게 역산해 보여주는 창이 없다** — `SemesterKickoffBanner`는 **회원 대상**(개강 D-7~D+14 재활성화 배너)이고, `HackathonDdayConsole`은 **당일 전용**이며, 콘솔 랜딩(`console/page.tsx`)엔 미래지향 카운트다운·준비 체크리스트가 **0건**(`grep 'D-\|카운트다운\|해커톤\|upcoming' console/page.tsx` = 랜딩 pending 집계만, 다가오는 이벤트 역산 없음). 오늘 D-32(해커톤)·D-42(개강)인데 "남은 준비"가 한 화면에 없다. | `SemesterKickoffBanner.tsx:6`(D-7~D+14·회원·`role!=='alumni'`) · `console/page.tsx`(pending 집계만·upcoming 이벤트 카운트다운 없음) · `console/academic-calendar/page.tsx`(479줄 존재하나 랜딩과 미연결) |
| ② | **축적 데이터 착수 도래분** | **수 주치 `cron_runs`가 "kind별 최신값"으로만 소비돼 추세·열화가 안 보인다** — `cron-logs/page.tsx`는 kind별 **최신 실행 + 연속 실패 배너**만 표시(`:246` "cron_runs · kind별 최신"). v7-M6 이후 수 주 축적됐고 v11 §3이 "**8월초 재확인 후 착수**"로 유보했으나, 오늘 7/21 시점 이미 수 주치 이력 확보 → **추세 리더(kind별 성공률 시계열) 착수 가능 시점 도래**. | `cron-logs/page.tsx:158~178`(kind별 최신만·시계열 없음) · v11 §3(cron 추세 "8월초 재확인") · `cron_runs` v7-M6부터 축적 |
| ③ | **회원 성장 서사** | **성장 서사가 학기말 게이트에 갇혀 유입기(8~9월)엔 안 보인다** — `SemesterWrappedView`는 `isWrappedSeason()`=**종료일 45일 이내에만** 노출(`useSemesterWrapped.ts:77~81`). 후기(09-01~이듬해 02월) 학기는 **1월까지 wrapped가 안 뜬다** → 8~9월 신입·복귀 회원이 "내가 이만큼 했다/할 것이다"를 볼 상시 창이 없다. `MyGrowthWidget`·`portfolio`는 상시나 "학기 서사" 프레이밍과 분리. | `useSemesterWrapped.ts:77`(`daysLeft<=45`) · `getSemesterBounds`(후기 종료 이듬해 02월) · `MyPageView.tsx:684`(wrapped 진입 `isWrappedSeason()` 게이트) |
| ④ | **운영 인수인계 내구성** | **인수인계 자산은 있으나 '직책별 공백·최신성'을 점검할 완결성 뷰가 없다** — `console/handover`(업무노트)·`OrgChartEditor`의 직책별 handover 메모·`handover_docs`(role 연결)가 다 있으나, **어느 직책에 업무노트가 0건인지·인수 메모가 비었는지·마지막 갱신이 언제인지를 한 화면에서 점검한 이력이 없다**. 운영진 교체 시즌(개강 전후)에 공백이 조용히 남는다. | `OrgChartEditor.tsx:135~152`(직책별 `handover_docs` count·딥링크는 있으나 공백 경고·전체 커버리지 뷰 없음) · `handover/report/page.tsx`(239줄·자동 채움 범위 미확인) |

### 1-2. 실측된 정리·잔여 부채 (⑤ 자유 발굴)

| 구분 | 실측 | 판정 |
|---|---|---|
| **빈 상태 라운드3** | ad-hoc "아직 없음/없습니다/등록된 …없" **~330파일**(광의 grep) vs 공용 `EmptyState` **110곳**. v9-M3·v10-M1·v11-M1이 고빈도만 수렴, 롱테일 잔존. | **정리 → M1** |
| **포트폴리오 자동적재 커버리지** | `mypage/portfolio`가 "연구·진단·수료증·잔디 자동 적재"(`:272`) 표방하나 `autoCollected:false` 기본(`:205`) — kudos·마법사 설계 산출·해커톤 결과 등 신규 자산 미적재 개연. | **감사→확장 → M2**(H4 상보) |
| **academic-calendar↔랜딩 연결** | `console/academic-calendar`(479줄) 독립 존재, 콘솔 랜딩 카운트다운과 미연결. | **연결 → M3**(H1 상보) |
| **handover report 자동 채움** | `handover/report/page.tsx`(239줄)에 임기 중 활동 요약 자동 반영 범위 미확인. | **감사→심화 → M4**(H3 상보) |
| **개강 시즌 whats-new 노출** | v11-M6 자동 최신성 위에 개강 재활성 배너(`SemesterKickoffBanner`)와 whats-new 연계 미확인. | **연결 → M6** |

---

## 2. 고도화 백로그 (v12 · 15항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+) → 유형(감사/구현/정리)]**
> **감사·검증형 = H3·H5 (2건)** · **구현형 = H1·H2·H4 (3건, 전량 기존 컬렉션 재사용·신규 컬렉션 0)** — 신규 표면 최소 원칙 준수.
> **High = 외부 의존 없음(코드·감사만으로 완결 가능)** 항목만 배치.

### High (즉시 착수 · 외부의존 없음 · ROI 높음)

**H1. 개강 D-day 운영 준비 카운트다운 — 콘솔 랜딩에 8/22 해커톤·9/1 개강까지 '남은 준비'를 역산 (렌즈① · 감사→구현 · 시의성 최상)**
- 문제: 다가오는 시즌 이벤트를 **운영자에게 역산해 보여주는 창이 없다**. `SemesterKickoffBanner`(`:6`)는 회원 대상 재활성 배너(개강 D-7~D+14, `role!=='alumni'` 한정)이고 `HackathonDdayConsole`은 당일 전용이라, 콘솔 랜딩(`console/page.tsx`)엔 "쌓인 것(pending)"만 보이고 "**앞으로 남은 준비**"가 없다. 오늘 해커톤 D-32·개강 D-42인데 준비 상황을 한눈에 볼 수 없다.
- 제안: 콘솔 랜딩 상단에 **"다가오는 시즌" 카운트다운 카드** — (1) 임박 이벤트(개강 09-01·해커톤 08-22)를 D-day로 표시(`getSemesterBounds`·기존 이벤트 정의 재사용), (2) 각 이벤트별 **준비 체크리스트를 역산**(예: 해커톤 = 신청 오픈·팀 모집·심사위원 배정·당일 콘솔 점검 / 개강 = 신입 승인 큐·온보딩 시퀀스 발화·학사일정 갱신), (3) 완료/미완료를 **기존 count 쿼리로 자동 판정 가능한 항목만 자동 체크**(나머지는 운영진 수동 체크·`dismiss`/로컬 저장). **신규 컬렉션 없음** — 정적 이벤트·체크 정의 + 기존 집계. 체크 항목 문안 확정은 §4 외부 의존.
- 기대효과: 8~9월 실전 준비가 **한 화면에서 앞으로 보이게** 됨 → 준비 누락 방지, "쌓인 것"만 보던 콘솔에 **미래지향 축** 추가. `academic-calendar`·`HackathonDdayConsole`과 상보(당일 이전~당일 연속).
- 난이도: **S~M** · **감사→구현** · **시의성 최상(D-32/D-42)**

**H2. cron 안정성 추세 리더 — 수 주치 `cron_runs`를 kind별 성공률 시계열로 (렌즈② · 구현 · 데이터 착수 도래)**
- 문제: 수 주치 `cron_runs`가 **"kind별 최신값"으로만 소비돼 추세·열화가 안 보인다** — `cron-logs/page.tsx`(`:246` "cron_runs · kind별 최신")는 kind별 최근 실행 + 연속 실패 배너만 표시. v7-M6 이후 수 주 축적됐고 v11 §3이 "8월초 재확인 후 착수"로 유보했으나, **오늘 7/21 이미 수 주치 이력 확보 → 추세 리더 착수 가능 시점 도래**(§3 재평가 참조).
- 제안: `cron-logs` 페이지에 **kind별 최근 N일(예: 14/30일) 성공률 추세** — 스파크라인 또는 성공/실패 카운트 막대 + 성공률% + **열화 감지 표식**(직전 구간 대비 성공률 하락 시 배지). 기존 `/api/console/cron-runs` 응답 확장 또는 신규 집계 엔드포인트(읽기 전용, 기존 `cron_runs` 컬렉션 재사용, **신규 컬렉션 없음**). 정책성 **임계 경보(알림 발송)는 §4 외부 의존**으로 분리 — 이번엔 reader(가시화)만.
- 기대효과: 침묵하던 cron 열화를 **추세로 조기 포착** → 8월 실전 전 안정성 사각 제거. v9-M1 stale 감지(순간)·v7-M6 연속실패(최근)에 **시계열 축** 추가로 관측 3종 완성.
- 난이도: **M** · **구현**

**H3. 인수인계 내구성 감사 → 직책별 공백 핫픽스 — 운영진 교체 시즌 대비 (렌즈④ · 감사형)**
- 문제: 인수인계 자산(`console/handover` 업무노트·`OrgChartEditor` 직책별 handover 메모·`handover_docs` role 연결)은 있으나 **'직책별 공백·최신성'을 점검할 완결성 뷰가 없다** — `OrgChartEditor.tsx:135~152`는 각 직책의 `handover_docs` count·딥링크는 주나, **어느 직책이 업무노트 0건인지·인수 메모가 비었는지·마지막 갱신이 언제인지를 한눈에 보는 커버리지 뷰가 없다**. 개강 전후 운영진 교체 시 공백이 조용히 남는다.
- 제안: **무코드 워크스루 감사** — (1) 현 조직도의 모든 직책 × (업무노트 유무·건수·최신 갱신일·인수 메모 유무)를 지도화, (2) 공백 직책(노트 0건·메모 공백·N개월 미갱신)을 식별, (3) 발견 결함만 **경량 핫픽스** — OrgChart/handover 화면에 **직책별 '인수인계 준비도' 표식**(노트 0건 경고 배지·미갱신 표시 등, 기존 `handover_docs` count 재사용, 신규 컬렉션 없음). 임기/후임 연결 정책은 §4 외부 의존.
- 기대효과: 운영 지식이 **교체 시즌에도 유실되지 않는 내구성** 확보 → "운영자 없이 도는" 완성도의 사람-지식 축 보강. v11-H3(처리 대기 큐)·v11-H6(자동화 감사)가 놓친 **인수인계 공백 가시성** 확보.
- 난이도: **S~M** · **감사형(무코드 + 발견 결함 핫픽스)**

**H4. 회원 성장 서사 상시 진입 — 학기말 게이트 밖에서도 "나의 여정" (렌즈③ · 구현 · 8월 유입 시의성)**
- 문제: 성장 서사가 **학기말 게이트에 갇혀 유입기(8~9월)엔 안 보인다** — `SemesterWrappedView`는 `isWrappedSeason()`=종료일 45일 이내에만 노출(`useSemesterWrapped.ts:77~81`, `MyPageView.tsx:684` 게이트). 후기 학기는 종료가 이듬해 02월이라 **1월까지 wrapped가 안 뜬다** → 8~9월 신입·복귀 회원이 자기 성장·목표를 볼 상시 창이 없다.
- 제안: 마이페이지에 **상시 "나의 여정 요약" 경량 진입** — 기존 `useSemesterWrapped` 집계(학습일수·스트릭·활동점수·완독 논문 등) 재사용하되 **시즌 밖에선 축소형 카드**(진행 중 학기의 현재까지 누적 + "학기 말 전체 결산 예정" 안내), 시즌엔 기존 full wrapped 유지. 신입에겐 "**첫 학기 목표**" 프레이밍(누적 0에서 시작 동기). **재구현 아님 — 기존 wrapped 집계의 상시 소비 경로 추가**, 신규 컬렉션 없음.
- 기대효과: 성장 가시화가 **유입기에도 회원을 붙잡음** → 8월 신규·복귀 리텐션·소속감. wrapped 투자를 4개월 게이트에서 해방(연중 소비).
- 난이도: **M** · **구현**

**H5. 개강 시즌 회원 재활성화 동선 감사 → 갭 핫픽스 — 방학→개강 전환기 여정 검증 (렌즈①③ · 감사형)**
- 문제: `SemesterKickoffBanner`(개강 D-7~D+14 회원 배너)는 있으나 **방학→개강 전환기 회원 여정 실경로 감사 이력이 없다** — 휴면 회원이 개강 윈도 진입 시 실제로 무엇을 보고/놓치는지(신규 기능 재노출·미완 진단·복귀 유도·wrapped 상시 진입(H4))가 미검증. 신입 승인~첫 2주(v11-M4)와 별개로 **기존 회원의 개강 재활성** 경로가 감사된 적 없다.
- 제안: **무코드 워크스루 감사** — (1) 개강 윈도(D-7~D+14) 진입 시 회원 역할별(재학·휴면·졸업생)로 보이는 표면·배너·넛지를 지도화, (2) 놓치는 재활성 기회(미완 진단·미열람 신규 기능·H4 성장 서사 미노출) 식별, (3) 발견 결함만 경량 핫픽스(배너 문안·링크·노출 조건). H1(운영자 준비)·H4(회원 성장)와 상보(회원 관점 검증).
- 기대효과: 개강 시즌 **휴면 회원 복귀 경로 보증** → 8~9월 재활성 극대화. 큰 재구조화 없이 배너·링크·조건만으로 회수.
- 난이도: **S~M** · **감사형(무코드 + 발견 결함 핫픽스)**

### Medium (1~2 스프린트)

**M1. 빈 상태 라운드3 — ad-hoc 롱테일 → EmptyState 수렴 (유지비 부채 ⑤ · 정리 · v11-M1 후속)**
- 문제: 공용 `EmptyState`(110곳)가 있는데도 ad-hoc "아직 없음/없습니다/등록된 …없" 빈 상태가 **~330파일**(광의 grep) 잔존 — v9-M3·v10-M1·v11-M1이 고빈도만 수렴, 롱테일·저빈도 잔존.
- 제안: **개강 유입기 노출 라우트 우선**(신입 대시보드·마이페이지·게시판 롱테일) ad-hoc → `EmptyState` 배치 수렴, 빈 상태에 **다음 행동 CTA**(H4 성장 진입·H1 준비 유도와 상보). 순수 표현 치환·로직 불변.
- 기대효과: 빈 상태 일관성 + 유입기 CTA 강화·유지비 절감.
- 난이도: **M** · **정리**

**M2. 포트폴리오 자동적재 커버리지 확장 (렌즈③ · 감사→구현 · H4 상보)**
- 문제: `mypage/portfolio`가 "연구·진단·수료증·잔디 자동 적재"(`:272`) 표방하나 `autoCollected:false` 기본(`:205`) — kudos 받은 인정·마법사 설계 산출·해커톤 결과 등 **신규 자산이 자동 적재에서 누락** 개연.
- 제안: 자동적재 소스 감사 후 **누락 자산 소규모 편입**(받은 kudos·완료 스터디 설계·해커톤 참가), 기존 자동적재 파이프 재사용. 감사→저위험 확장.
- 기대효과: 포트폴리오가 실제 성장을 온전히 반영 → H4 성장 서사와 데이터 일치.
- 난이도: **S~M** · **구현(감사 포함)**

**M3. academic-calendar ↔ 콘솔 랜딩 연결 (렌즈① · 구현 · H1 상보)**
- 문제: `console/academic-calendar`(479줄)가 독립 존재하나 콘솔 랜딩 카운트다운(H1)과 미연결 — 학사일정을 별도 열어야 다가오는 일정 파악.
- 제안: H1 카운트다운 카드에서 academic-calendar로 딥링크·다가오는 학사 항목 요약 반영. 기존 데이터 재사용.
- 기대효과: 준비 캘린더 단일 진입점.
- 난이도: **S** · **구현**

**M4. handover report 자동 채움 심화 (렌즈④ · 구현 · H3 상보)**
- 문제: `handover/report/page.tsx`(239줄)에 임기 중 활동 요약(처리 건수·발행·이벤트 등) 자동 반영 범위 미확인 — 인수인계 리포트가 수동 작성에 의존하면 공백.
- 제안: H3 감사 결과 기반, 리포트에 **기존 집계(처리 대기 해소·발행·이벤트 운영) 자동 요약 슬롯** 추가. 기존 컬렉션 count 재사용.
- 기대효과: 인수인계 문서 작성 부하↓·완결성↑.
- 난이도: **S~M** · **구현**

**M5. cron 추세 열화 경보 임계 (렌즈② · H2 확장 · 데이터 8월초)**
- 문제: H2 reader가 추세를 보여주면, 성공률 하락 **임계 자동 경보**는 별도 — 임계선은 데이터 분포 관찰 후.
- 제안: H2 배포·수 주 관찰 후 kind별 성공률 임계 산정 → 경보 표식/알림. **§3 데이터 대기(8월초 재평가)**.
- 난이도: **S** · **구현(데이터 대기)**

**M6. 개강 시즌 whats-new 재노출 연계 (렌즈① · 구현 · H5 상보)**
- 문제: v11-M6 whats-new 자동 최신성 위에, 개강 재활성 배너(`SemesterKickoffBanner`)·H4 성장 진입과 whats-new(신규 기능 소식) 연계 미확인 — 휴면 복귀 회원에 "그동안 생긴 것" 재노출 경로 부족.
- 제안: 개강 윈도 진입 회원에 whats-new 미열람 신규 항목 경량 재노출(기존 whats-new 소스 재사용). H5 감사 결과 반영.
- 난이도: **S~M** · **구현**

### Low (여유 시 · carryover)

**L1. 색상 부채 라운드6 (정리 · M · 구현)** — ratchet(347) 하에서 잔존 raw 팔레트 단조 감축.
**L2. 단축키 상시 힌트 (발견성 · v8→v11 carryover · S)** — 핵심 액션에 단축키 툴팁 병기.
**L3. `depcheck`/`ts-prune` npm script 상시화 (유지비 · v11-L3 carryover · S)** — 미사용 회귀 조기 감지.
**L4. reduced-motion 자동 스모크 (품질 · carryover · S)** — axe 스모크에 모션 체크 추가.

---

## 3. 데이터 축적 대기 항목 (수집 진행 중 · 착수 가능 시점 **재평가**)

> **v12 재평가 핵심: `cron_runs`가 "착수 가능"으로 승격됐다.** (v11에서 "8월초 재확인"이었으나 오늘 7/21 수 주치 이력 확보 → **reader(H2) 즉시 착수**, 임계 경보만 8월초로 잔류.)

| 대기 항목 | 의존 데이터 | v11 판정 | **v12 재평가(2026-07-21)** |
|---|---|---|---|
| **cron 안정성 추세 리더** | `cron_runs` kind별 수 주치 이력 | 8월초 재확인 후 착수 | **✅ 착수 가능 — H2로 즉시 승격**(수 주치 확보) |
| **cron 열화 경보 임계** (H2 확장) | H2 reader 배포 후 성공률 분포 | — | H2 배포+수 주 관찰 후 — **8월 중순 임계 산정**(M5) |
| **web_vitals 회귀 경보 임계·라우트 목표선** (v10-H1) | `web_vitals` 10% 샘플 라우트별 p75 | ~2주 축적·8월초 | **8월초 재평가 유지**(v10-H1 배포 후 2주 도래 근접) |
| **kudos 리더보드·주차 추이** (v11-H2 확장) | `kudos` **관계 확장 후** 볼륨 | H2 후 9월초 | **9월초 유지** — v11-H2 방금 배포, 8월 유입 후 볼륨 관찰 필요 |
| **funnel 전환 개선 실험** | `user_activity_logs` funnel baseline | 9월초 | **9월초 유지**(8월 신입 유입 후) |
| **loyalty/adoption 코호트 추이** | `loyalty-snapshot`·학기 경계 | 가을 학기 중 | **가을 학기 중 유지**(신학기 코호트 1회전 후) |
| **콘텐츠 노후 임계 튜닝** (v11-H4 확장) | `updatedAt`/`lastReviewedAt` 분포 | 1개월 후 | **8월 하순 재평가**(v11-H4 배포 후 운영 피드백) |

---

## 4. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| **개강 준비 체크리스트 항목·문안 확정**(H1 — 무엇을 준비 완료로 볼지) | 운영진 시즌 운영 정의 |
| **cron 열화 경보 임계·발송 정책**(H2/M5 — 성공률 몇 %가 경보인가·quiet-hours) | 운영진 관측 정책 + 알림 발송 합의 |
| **인수인계 임기·후임 연결 규칙**(H3 — 임기 만료·후임 지정 정책) | 운영진 조직 운영 규정 |
| **인수인계 SLA·담당**(H3/M4 — 공백 직책 처리 책임·기한) | 운영진 합의 |
| **개강 재활성 넛지 발송**(H5/M6 — 휴면 회원 리마인더 빈도·문안) | 푸시/알림 발송 정책 |
| 해커톤 **당일 체크인·심사 기준·심사위원 배정**(v10-H3 후속) | 운영진 이벤트 운영 |
| 수동 큐 **넛지 발송(cron)·SLA**(v11-H3 후속) | 푸시 정책 + 승인 담당 |
| **콘텐츠 노후 임계·검토 주기**(v11-H4 — 몇 개월이면 stale) | 운영진 콘텐츠 정책 |
| 커뮤니티 nav **재구성 승인**(v11-H5 — 멘토링/피어 편입) | 운영진 정보구조 판단 |
| `analytics-retention` cron **스케줄 활성화** | 개인정보 보존 정책 |
| Sentry 등 **에러 리포팅 연동**(v9-H2 확장) | 외부 계정·비용 승인 |
| Firestore 정기 export/백업 · 세미나 라이브 다시보기 (carryover) | GCP 스케줄러/GCS · 저작권 |

---

## 5. 즉시 착수 Top 5 (병렬 편성안 — 파일 영역 비중복)

1. **H1 개강 D-day 운영 준비 카운트다운(S~M · 감사→구현 · 시의성 최상)** — 콘솔 랜딩 미래지향 축. `app/console/page.tsx`·`features/dashboard`(카운트다운 카드). 트랙 A.
2. **H2 cron 안정성 추세 리더(M · 구현 · 데이터 착수 도래)** — 수 주치 cron_runs 시계열. `app/console/cron-logs/page.tsx`·`app/api/console/cron-runs`. 트랙 B(콘솔 내 다른 서브·H1과 파일 비중복).
3. **H4 회원 성장 서사 상시 진입(M · 구현 · 8월 유입 시의성)** — wrapped 게이트 해방. `features/mypage`·`components/mypage/MyPageView.tsx`. 트랙 C.
4. **H3 인수인계 내구성 감사(S~M · 감사형)** — 직책별 공백 지도+핫픽스. `features/admin/settings/OrgChartEditor.tsx`·`console/handover`. 트랙 D.
5. **H5 개강 재활성화 동선 감사(S~M · 감사형)** — 무코드 감사 트랙, 항상 병행. 트랙 E.

> **병렬 편성(파일 영역 비중복 → 5트랙 동시)**:
> - 트랙 A(준비도): **H1 카운트다운 · M3 academic-calendar 연결** — `app/console/page.tsx`·`features/dashboard`·`console/academic-calendar` (H1 후 M3 순차)
> - 트랙 B(축적 수확): **H2 cron 추세 리더 · M5 열화 임계(데이터 8월초)** — `console/cron-logs`·`api/console/cron-runs` (독립·콘솔 다른 서브)
> - 트랙 C(성장 가시화): **H4 성장 상시 진입 · M2 포트폴리오 커버리지** — `features/mypage`·`components/mypage`·`mypage/portfolio` (독립)
> - 트랙 D(인수인계): **H3 내구성 감사 · M4 report 자동 채움** — `features/admin/settings`·`console/handover` (H3 후 M4 순차)
> - 트랙 E(감사·무코드 병행): **H5 개강 재활성 감사** — 코드 무수정(발견 결함만 소규모 핫픽스), 항상 병행
> - 품질 정리: **M1 빈 상태 라운드3 · M6 whats-new 연계** — 표현 계층(H4/H1 CTA와 상보, 파일 근접 시 순차)
> L1~L4는 여유 시.

---

## 6. 참고 파일 (절대경로 · 실측 2026-07-21)
- `C:\work\yonsei-edtech\src\app\console\page.tsx`(pending 집계만·**upcoming 카운트다운 없음** → H1) / `src\features\dashboard\SemesterKickoffBanner.tsx`(`:6` 회원·D-7~D+14) / `src\features\hackathon\HackathonDdayConsole.tsx`(당일 전용·재제안 금지) / `src\app\console\academic-calendar\page.tsx`(479줄 → M3)
- `C:\work\yonsei-edtech\src\app\console\cron-logs\page.tsx`(`:246` **kind별 최신만·시계열 없음** → H2) / `src\app\api\console\cron-runs\route.ts`(응답 확장 → H2)
- `C:\work\yonsei-edtech\src\features\mypage\useSemesterWrapped.ts`(`:77~81` `isWrappedSeason` **45일 게이트** → H4) / `SemesterWrappedView.tsx`(재사용·재구현 금지) / `src\components\mypage\MyPageView.tsx`(`:684` wrapped 진입 게이트 → H4) / `src\app\mypage\portfolio\page.tsx`(`:205` `autoCollected:false`·`:272` 자동적재 문구 → M2)
- `C:\work\yonsei-edtech\src\features\admin\settings\OrgChartEditor.tsx`(`:135~152` 직책별 `handover_docs` count·**공백 커버리지 뷰 없음** → H3) / `src\app\console\handover\report\page.tsx`(239줄·자동 채움 범위 → M4) / `src\app\console\handover\page.tsx`(업무노트)
- `C:\work\yonsei-edtech\src\components\ui\empty-state.tsx`(공용·110곳 vs **ad-hoc ~330파일** → M1) / `src\app\whats-new\page.tsx`(v11-M6 자동 최신성 위 개강 연계 → M6)
- 부채 실측: `next/dynamic` **8건**(유지) · TODO/FIXME **37건**(유지) · cron **32 디렉토리** · rawcolor ratchet 상한 **347 고정** · `EmptyState` **110곳** / ad-hoc **~330파일**

# 연세교육공학회 차기 라운드 고도화 백로그 v10 — "축적의 첫 수확과 유지비 상환 — 쌓인 텔레메트리를 화면으로, 미뤄둔 부채를 정리로, 8월 실전의 마지막 공백을 메운다" (2026-07-21)

> 작성: 수석 서비스 플래너 (자율 분석 · 대화형 인터뷰 없음 · 코드·문서 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, **44번째 배포 — v6·v7·v8·v9 4개 라운드 전량 소진**)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · **다음 큰 이벤트: 에듀테크 해커톤 2026-08-22 (D-33)**, 8~9월 신입 유입·온보딩 시즌
> 실측 근거(2026-07-21 grep/ls/find 직접 실측): `git log`(v9 배포: `9c934818`·`b025a190`·`d7be83be`·`eea5c7a7`·`39846141`·`1ea1eaaf`) · `git status`(작업트리 클린 — 미배포분 0, `.claude/settings.local.json`만 untracked) · v9 계획서 + v6~v8 계획서 · cron(**32 디렉토리 = vercel.json 32 스케줄, 전량 등록**)·`error.tsx` **14개**·`global-error.tsx` **1개(존재)**·perf 툴(**web-vitals·@next/bundle-analyzer·axe-core 전부 설치 확인**)·`eslint-rawcolor-baseline.mjs`(**398 파일** — v9 390에서 +8 회귀)·`next/dynamic` 사용 **0건**·ad-hoc 빈 상태 **79파일**·`prefers-reduced-motion` **7파일**·TODO/FIXME/deprecated **144건** 실측.

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE·미변경 확정)

### 0-1. v6·v7·v8 라운드 + 벤치마크 전량 (재제안 금지)
v6 H1~H6·M1·M2·M6·L1~L3, v7 13종, v8 High 6·Medium 6, 벤치마크 전량 — v7·v8·v9 계획서 §0에 커밋 해시로 확정. **전부 재제안 금지.**

### 0-2. v9 라운드 (오늘까지 배포 · **재제안 절대 금지**)

| v9 항목 | 산출물(실측·LIVE) | 상태 |
|---|---|---|
| **H1** 신규 계정 온보딩 워크스루 감사 | 실경로 감사(무코드)·발견 결함 핫픽스 편입 | LIVE(감사) |
| **H2** 라우트 에러 경계 확충 + global-error | `error.tsx` **4→14개**(dashboard·hackathon·archive·console·seminars·board·gatherings·diagnosis·mentoring·steppingstone 추가) + **`global-error.tsx` 신규** | LIVE |
| **H3** 해커톤 마감 리마인더 + 당일 리허설 감사 | `api/cron/hackathon-submission-reminder`(D-3·D-1·당일) + 운영 흐름 리허설 감사 | LIVE |
| **H4** v7/v8 지표 정확성 교차검증 감사 | 0분모·타임존·센티널·픽셀편향 감사(codex) | LIVE(감사) |
| **H5** 가입 승인 대기 가시화 + 운영 넛지 | signup 안내 카피 보강 + `api/cron/pending-signup-nudge`(미처리 신청 통지) | LIVE |
| **H6** 성능 계측 기준선 | `@next/bundle-analyzer`(ANALYZE 조건)·`web-vitals` LCP/CLS/INP **10% 익명 샘플→`web_vitals` 컬렉션 적재** | LIVE |
| **M1** cron-watchdog stale 감지 완결 | `vercel.json` 주기 대조로 침묵 cron 경보 + 콘솔 stale 배지 | LIVE |
| **M2** /networking 404 | **"조치 불요" 판정 — 실 트래픽 인입처 없음으로 리다이렉트 미생성 (여전히 404, 의도된 미조치)** | 판정완료(무조치) |
| **M3** 빈 상태 표준화 | 고빈도 **12파일** ad-hoc → 공용 `EmptyState` 수렴 | LIVE |
| **M4** a11y 심화 | 전역 reduced-motion + `axe-core` 스모크 스크립트 + critical 위반 소규모 보정 | LIVE |
| **M5** 무거운 의존성 동적 import | **H6 측정 선행 후행으로 계획 — `next/dynamic` 실사용 0건 확인 = 미구현(v10 승계)** | 미구현 |
| **M6** 해커톤 팀 확정 표면 | 아이디어 합류 희망(멱등 upsert)·합류자 칩·팀 확정→제출 프리필·`HackathonTeamView` | LIVE |

**위 항목 중 LIVE·판정완료는 재제안 금지.** 특히 **v9-M2 `/networking` 404는 "조치 불요"로 종결됐으므로 v10에서 리다이렉트/페이지 생성을 재제안하지 않는다**(명명 혼선 완화는 M5 문서화로만 다룸). **v9-M5 동적 import는 계획만 되고 미구현이므로 v10-H2로 정식 승격**(재제안 아님).

### 0-3. 상주 인프라 (재제안 금지 — 활용만)
측정(`visit-tracker`·`user_activity_logs` funnel·`search_misses`·`adoption-snapshot`·`loyalty-snapshot`·**`web_vitals`(신규·소비 미구현)**)·관측(`withCronLog`/`cron_runs`·`cron-watchdog` 실패+stale)·관계(`kudos`·`weekly_goal_records`·`digest_opens`/`clicks`)·정리(`analytics-retention`·`notifications-cleanup`)·신학기(`newcomer-activation-sequence`·`pending-signup-nudge`·`mentoring-nudge`)·행사(`hackathon_submissions`/`judgings`·`hackathon-submission-reminder`).

---

## 1. v10 핵심 명제

> **네 라운드가 "만들고(v6) → 측정·개선(v7) → 소비 완결·정리(v8) → 실전 리허설·품질·신뢰(v9)"를 끝냈다. 그 결과 (a) v9가 깐 텔레메트리(`web_vitals`)는 수집만 되고 소비 화면이 0이며, (b) v9가 측정 도구를 설치했으나 그 데이터로 실제 최적화한 코드는 0(`next/dynamic` 0건)이고, (c) 유지비 부채(색상 baseline 회귀 398·ad-hoc 빈 상태 79·reduced-motion 7파일·TODO 144)가 상환되지 않은 채 누적됐다.** v10은 각도를 **"수확·상환·실행(Harvest · Amortize · Execute)"** 로 바꾼다 — (1) **쌓이기 시작한 데이터를 운영 화면으로 수확**하고, (2) v9가 깔아둔 계측 기준으로 **미뤄둔 성능·품질 부채를 실제로 상환**하며, (3) 8월 실전의 **유일하게 남은 공백(해커톤 당일 운영 실행 화면)** 을 메우고, (4) **콘텐츠·연구 도구의 실사용 마찰**을 감사해 깊이를 더한다. **신규 표면 최소·기존 완성도 우선 원칙 유지** — 6 High 중 감사형 2건(H5·H6), 정리·상환형 3건(H2·H4 + M 다수).

### 1-1. 실측된 "미수확·미상환" 4종 (v10의 출발점)

| # | 각도 | 실측된 갭 | 근거(2026-07-21) |
|---|---|---|---|
| ① | **8월 실전 마지막 공백** | v9가 공개 페이지(H6)·마감 리마인더(H3)·팀 확정(M6)까지 완성했으나 **당일 운영 실행 화면이 없다** — 체크인/출석·심사 배정 실행 UI grep **0건**(`features/hackathon`에 checkin 컴포넌트 없음, 심사배정 exec UI 없음). 리허설(v9-H3)은 흐름을 "걸어봤을 뿐" 운영진이 당일 클릭할 실행 화면은 부재. | `ls features/hackathon`(Awards·Board·Cta·Timeline·Submissions·TeamView·config — **checkin/judging-assign 없음**). `grep 체크인\|checkin\|심사 배정` exec UI 0 |
| ② | **축적 데이터 첫 수확** | v9-H6가 `web_vitals`(LCP·CLS·INP 10% 샘플)를 적재 시작했으나 **소비 화면이 0** — `grep web_vitals src/features src/app` **0건**. 수집만 되고 아무도 보지 못하는 텔레메트리. `funnel`·`search_misses`·`loyalty`는 이미 소비 화면 존재(`FunnelSection`·`SearchMissSection`·`LoyaltyTrendSection`), **`web_vitals`만 미수확**. | `web-vitals-tracker.ts:28` `addDoc(collection(db,"web_vitals"))`. 소비: `console`·`features/insights` 어디에도 없음 |
| ③ | **미뤄둔 성능 상환** | v9-H6가 `@next/bundle-analyzer`를 설치했으나 **그 측정으로 최적화한 코드는 0** — `next/dynamic` 사용 **0건**. `framer-motion` **18파일**·`xlsx` 9·`@react-pdf/renderer` 9·`recharts` 6·`pdfjs-dist` 1이 전부 정적 번들. 신입 첫 진입(대시보드·아카이브) LCP 저하 상존. | `grep -rl next/dynamic src` **0** · 무거운 의존성 사용 파일 수 실측 |
| ④ | **유지비 부채 누적** | 색상 baseline **398**(v9 라운드4로 390까지 줄였으나 **+8 회귀** — 신규 파일이 raw 색상 재유입, **ratchet 없어 회귀가 자유롭게 늘어남**). ad-hoc 빈 상태 **79파일**(v9-M3가 12건만 수렴). `prefers-reduced-motion` **7파일뿐**(framer-motion 18파일 대비 무방비). TODO/FIXME/deprecated **144건** 미분류. | `eslint-rawcolor-baseline.mjs` 398 · `grep 아직 없\|등록된.*없` 79 · `grep prefers-reduced-motion` 7 · TODO 144 |

### 1-2. 실측된 정리·잔여 부채 (⑤ 자유 발굴)

| 구분 | 실측 | 판정 |
|---|---|---|
| **유사 명명 4중 표면** | `/network`(협업 그래프)·`api/networking`·`console/networking`·`networking_events`/`_rsvps`/`_availability` 컬렉션이 공존하나 역할 구분이 코드·nav에 문서화 안 됨. `/networking`(단수) 404는 "조치 불요" 종결. | **문서화만 → M5**(코드 이동 없음) |
| **아카이브 개념·연구도구 마찰** | `ArchiveConceptRecommend`·`useConceptIndex`·`ConceptLinkedText`·`/mypage/research/tools` 존재하나 **실사용 마찰(빈 결과·딥링크·개념 품질) 감사 이력 없음**. | **감사→핫픽스 → H5** |
| **OG·메타 커버리지** | v9-L4가 감사로만 남김(정정은 후속). 신규 라우트 OG/alt 누락 미정정. | **정정 실행 → M6** |
| **의존성·데드코드** | TODO 144·미사용 export·잠재 미사용 의존성(`depcheck` 미설치) 감사 이력 없음. | **감사→안전 제거 → H6** |

---

## 2. 고도화 백로그 (v10 · 16항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+) → 유형(감사/구현/정리)]**
> **감사·검증형(코드 무수정 또는 감사 후 소규모 핫픽스) = H5·H6 (2건)** · **정리·상환형 = H2·H4·M1·M2·M5·M6 (6건)** · **신규 소비 표면 = H1·H3·M3·M4 (4건, 전량 기존 컬렉션 재사용·신규 컬렉션 최소)** — 신규 표면 최소 원칙 준수.
> **High = 외부 의존 없음(코드·감사만으로 완결 가능)** 항목만 배치.

### High (즉시 착수 · 외부의존 없음 · ROI 높음)

**H1. `web_vitals` 성능 관측 콘솔 — 수집만 되고 아무도 못 보는 데이터를 화면으로 (축적 데이터 첫 수확 ② · 구현)**
- 문제: v9-H6가 `web-vitals-tracker.ts`로 LCP·CLS·INP를 10% 익명 샘플링해 **`web_vitals` 컬렉션에 적재하기 시작**했으나, **소비 화면이 0건**이다(`grep web_vitals src/features src/app` = 0). `funnel`(`FunnelSection`)·`search_misses`(`SearchMissSection`)·`loyalty`(`LoyaltyTrendSection`)는 이미 콘솔 소비 화면이 있는데 **`web_vitals`만 수집→저장→방치**. 데이터가 쌓여도 운영진이 성능을 볼 창구가 없다.
- 제안: 운영 콘솔(`console/insights` 또는 신규 `console/performance`)에 **web_vitals 소비 화면** 구축 — 라우트별 LCP/CLS/INP 분포(p75·p90), 최근 N일 추이, 임계 초과 라우트 하이라이트. 기존 `insights` 조회 패턴·차트 컴포넌트 재사용, 신규 컬렉션 없음. **빈 데이터에 graceful**(EmptyState·"수집 중" 표기)하게 구축해 데이터가 얕은 초기에도 안전. **회귀 경보 임계·라우트 목표선은 데이터 성숙 후**(§3-데이터대기).
- 기대효과: 8월 유입 전 성능 상태를 운영진이 처음으로 볼 수 있게 됨, v9-H6 투자 회수, H2 최적화 타깃의 정량 근거.
- 난이도: **M** · **구현**

**H2. 무거운 컴포넌트 동적 import — 측정만 하고 안 고친 성능 부채 상환 (미뤄둔 성능 상환 ③ · 구현 · v9-M5 정식 승격)**
- 문제: v9-H6가 `@next/bundle-analyzer`를 설치했으나 **그 측정으로 최적화한 코드가 0** — `next/dynamic` 사용 **0건**. `framer-motion`(**18파일**)·`xlsx`(9)·`@react-pdf/renderer`(9)·`recharts`(6)·`pdfjs-dist`(1)가 전부 정적 번들에 포함돼 신입 첫 진입(대시보드·아카이브) 초기 JS·LCP를 부풀린다. v9-M5가 "H6 측정 선행"으로 미룬 뒤 미구현으로 남았다 — **선행 조건(측정 도구)은 이미 충족**.
- 제안: `ANALYZE=1` 번들 리포트로 라우트별 상위 번들 1회 확정 후, **뷰어성·차트성 무거운 컴포넌트를 `next/dynamic`(ssr:false·로딩 스켈레톤)로 지연 로드** — PDF 뷰어(`@react-pdf`·`pdfjs`)·엑셀(`xlsx`)·차트(`recharts`)·무거운 애니메이션 우선. 순수 로딩 전략 변경(로직·표현 불변). H1 소비 화면과 병행해 최적화 전/후 LCP 대조 가능.
- 기대효과: 초기 번들 축소·LCP 개선·8월 유입 첫인상 개선, 측정→개선 루프 완결.
- 난이도: **M** · **구현**

**H3. 해커톤 당일 운영 실행 콘솔 — 리허설한 흐름을 실제로 클릭할 화면 (8월 실전 마지막 공백 ① · 구현 · D-33)**
- 문제: v9가 공개 페이지(H6)·마감 리마인더 cron(H3)·팀 확정(M6)까지 완성했으나, **당일 운영진이 클릭할 실행 화면이 없다** — `features/hackathon`에 체크인/출석 컴포넌트 없음, 심사 배정(`hackathon_judgings`) 실행 UI grep **0건**. v9-H3는 흐름을 "걸어본" 감사였을 뿐 실행 표면은 미구축. 당일(08-22) 제출 마감→심사 배정→수상 발표를 운영진이 수동·즉흥으로 처리하게 됨.
- 제안: 운영 콘솔에 **해커톤 당일 실행 탭** — (1) 제출 목록 현황(제출/미제출 팀·타임스탬프), (2) 심사 배정(`hackathon_judgings` 생성·심사위원↔제출 매핑), (3) 수상 published 토글(기존 `HackathonAwards` 기계 재사용). **기존 `hackathon_submissions`/`judgings` 컬렉션 재사용, 신규 컬렉션 없음**. 체크인이 정책상 필요하면 최소 출석 체크만(운영진 규칙은 §3). 행사 종료 후 자연 비활성.
- 기대효과: 당일 운영진이 즉흥 대신 준비된 화면으로 진행, 심사·발표 누락 방지, D-33 시의성.
- 난이도: **M** · **구현** · **시의성 최상(D-33)** (심사 기준·체크인 정책은 §3 외부 의존)

**H4. 색상 부채 라운드5 + baseline ratchet 게이트 — 회귀를 영구 차단하고 감축 (유지비 부채 ④ · 정리+게이트)**
- 문제: 색상 baseline이 **398**로 v9 라운드4(390) 대비 **+8 회귀** — 신규 파일이 raw 팔레트를 재유입시켰다. 근본 원인은 **ratchet(래칫) 없음**: baseline 파일이 "허용 목록"일 뿐 신규 raw 색상 추가를 막지 못해 부채가 자유롭게 늘어난다. board·leaderboard·seminars·gatherings 등 잔존.
- 제안: (1) 고빈도 라우트 우선 raw 팔레트 → 시맨틱 토큰 배치 마이그레이션(순수 치환·로직 불변, 398→~330 목표). (2) **핵심: baseline ratchet 게이트** — CI/lint에서 baseline 파일 수를 초과하는 신규 raw 색상 도입 시 실패시켜 **회귀를 영구 차단**(색상 게이트가 "줄어들기만" 하도록). 신규 표면 없음.
- 기대효과: 부채 감축 + **다시 늘지 않는 구조**(v6~v9 4라운드 색상 작업의 지속성 확보), 다크모드·브랜드 일관성.
- 난이도: **M** · **정리+게이트**

**H5. 아카이브 개념·연구도구 실사용 마찰 감사 → 핫픽스 — 콘텐츠 깊이 (콘텐츠·연구 도구 ③ · 감사형)**
- 문제: `ArchiveConceptRecommend`·`useConceptIndex`·`ConceptLinkedText`·`ConceptMentionsInMyRecords`·`/mypage/research/tools`(연구 여정 도구 허브)가 구현돼 있으나 **실사용 마찰(개념 추천 빈 결과·딥링크 도착지·개념 병기 정확성·도구 카드 실작동)에 대한 감사 이력이 없다**. v9는 신입 온보딩(H1)·지표(H4)는 감사했으나 **콘텐츠·연구 도구의 실경로는 미감사**. 회원이 실제로 겪는 개념 탐색·연구 도구 진입의 끊김이 미검증.
- 제안: **코드 무수정 워크스루 감사** — (1) 개념 추천/병기가 빈 결과·오매칭·잘못된 딥링크를 내지 않는지 대표 개념 표본으로 추적, (2) `/research/tools` 각 도구 카드의 도착지·빈 상태·로그인 경계 확인, (3) 개념↔아카이브↔내 기록 크로스링크 정합성 점검. 발견 결함만 별도 소규모 핫픽스 항목화(codex 병행 가능).
- 기대효과: 콘텐츠·연구 도구 실동작 보증, "구현됨 ≠ 회원이 매끄럽게 씀" 사각 제거, 아카이브 자산 가치 실현.
- 난이도: **S~M** · **감사형(무코드 + 발견 결함 핫픽스)**

**H6. 의존성·데드코드 정리 감사 — 장기 유지비 상환 (유지비 부채 ④ · 감사형)**
- 문제: TODO/FIXME/deprecated **144건**이 미분류로 누적됐고, 잠재 미사용 의존성·미사용 export에 대한 감사 이력이 없다(`depcheck` 미설치). 4개월+ 고속 개발(21+배포·32 cron)로 죽은 경로·중복 유틸이 쌓였을 개연.
- 제안: **감사 후 안전 제거** — (1) `depcheck`/`ts-prune`(devDep 1회) 또는 grep 기반으로 미사용 의존성·미사용 export 후보 산출, (2) TODO 144건을 "즉시 처리/이슈화/무해 삭제"로 분류, (3) **명백히 안전한 것만 제거**(참조 0 확인된 export·의존성), 모호한 것은 표로 남겨 후속. tsc/build 통과로 검증. 위험 회피 우선.
- 기대효과: 번들·유지비 감소, 신규 기여자 인지부하 감소, 리팩토링 안전판.
- 난이도: **M** · **감사형(감사 + 검증된 안전 제거)**

### Medium (1~2 스프린트)

**M1. 빈 상태 라운드2 — ad-hoc 79파일 → EmptyState 수렴 (유지비 부채 ④ · 정리 · v9-M3 후속)**
- 문제: 공용 `EmptyState`(95곳 사용)가 있는데도 **ad-hoc "아직 없음/등록된 ~ 없음" 빈 상태가 79파일에 잔존**(v9-M3가 고빈도 12건만 수렴). 톤·여백·CTA 불일치.
- 제안: 신입 노출·고빈도 라우트(board·mentoring·gatherings·seminars·research) 우선으로 ad-hoc → `EmptyState` 배치 수렴(순수 표현 치환·로직 불변). 전량 아닌 우선순위 배치.
- 기대효과: 빈 상태 일관성·신입 인상 개선·유지비 절감.
- 난이도: **M** · **정리**

**M2. reduced-motion 전역 확대 — framer-motion 18파일 방어 (유지비 부채 ④ · 구현 · v9-M4 잔여)**
- 문제: `prefers-reduced-motion` 준수 **7파일뿐**인데 `framer-motion` 애니메이션은 **18파일**. v9-M4가 전역 CSS 수준은 손댔으나 컴포넌트 모션 다수가 여전히 모션 민감 사용자에게 무방비.
- 제안: 공통 모션 래퍼/훅(`useReducedMotion`)으로 framer-motion 애니메이션 일괄 가드, Tailwind `motion-reduce:` 유틸 확대. 로직 무변경.
- 기대효과: 접근성 심화·모션 민감 사용자 배려.
- 난이도: **S~M** · **구현**

**M3. 운영 주간요약·cron 안정성 축적 지표 심화 (축적 데이터 수확 ② · 구현 · 일부 데이터 대기)**
- 문제: `WeeklyOperationsSummary`·`cron_runs`(v7-M6)·`cron-watchdog`(v8·v9)가 데이터를 쌓고 있으나, **cron 안정성 추세(kind별 성공률·평균 지연·연속 실패 이력)를 한 화면에서 소비하는 심화 뷰가 없다**(cron-logs는 최신 실행 나열 위주).
- 제안: `console/cron-logs`에 kind별 성공률·지연 추세 요약 섹션 추가(기존 `cron_runs` 재사용). **의미 있는 추세는 수 주 축적 필요 → 화면은 지금 구축·해석 임계는 데이터 성숙 후**(§3).
- 기대효과: cron 신뢰성 가시화·조용한 열화 조기 감지.
- 난이도: **M** · **구현(일부 데이터 대기)**

**M4. kudos 성숙 표면 — 리더보드·추이 (축적 데이터 수확 ② · 구현 · 데이터 대기)**
- 문제: `kudos`(v8-H2·H5)가 대시보드/마이페이지 위젯까지 왔으나, **누적 데이터 기반 리더보드·주차 추이 등 "성숙 소비" 표면이 없다**. 데이터가 얕을 때 만들면 빈 화면.
- 제안: kudos 누적 추이·이번 주 하이라이트 경량 표면(기존 `kudos` 컬렉션 재사용). **데이터가 유의미하게 쌓인 뒤 착수**(§3) — 그전엔 대기.
- 기대효과: 관계·인정 루프 강화·활성 유지.
- 난이도: **S~M** · **구현(데이터 대기)**

**M5. 유사 명명 표면 문서화 — network/networking 4중 구분 (자유 발굴 ⑤ · 문서 · v9-L2 승격)**
- 문제: `/network`(협업 그래프)·`api/networking`·`console/networking`·`networking_events`/`_rsvps`/`_availability` 컬렉션이 공존하나 역할 구분이 코드·nav·README에 없어 유지보수 혼선. `/networking`(단수)=404는 "조치 불요" 종결(재제안 금지).
- 제안: 각 표면의 역할·진입점을 nav 라벨·README/주석으로 명확화. **코드 이동 없음**(구조 변경은 회귀 위험 대비 실익 낮음).
- 기대효과: 명명 혼선 완화·유지보수 인지부하 감소.
- 난이도: **S** · **문서**

**M6. OG·메타·alt 커버리지 정정 — v9-L4 감사 후속 실행 (콘텐츠 깊이 ③ · 구현)**
- 문제: v9-L4가 신규 라우트(hackathon·research/tools·steppingstone 하위)의 OG 이미지·메타·`alt` 누락을 감사로만 남겼고 정정은 후속으로 미룸.
- 제안: 감사 표 기반으로 누락 OG/메타/alt 정정(공유 카드·SEO·접근성). 표현 계층 한정.
- 기대효과: 공유 시 카드 품질·검색 노출·이미지 접근성 개선.
- 난이도: **S** · **구현**

### Low (여유 시 · carryover)

**L1. 단축키 상시 힌트 (발견성 · v8-L3→v9-L1 carryover · S · 구현)** — 핵심 액션 버튼에 단축키 툴팁 병기.

**L2. `depcheck`/`ts-prune` devDep 상시화 (유지비 · S · 구현)** — H6 감사에서 도입한 도구를 npm script로 상시화해 미사용 회귀 조기 감지.

**L3. 색상 부채 라운드6 (정리 · M · 구현)** — H4 라운드5 이후 잔존 raw 팔레트 지속 감축(ratchet 하에서 단조 감소).

**L4. reduced-motion 자동 스모크 (품질 · S · 구현)** — M2 확대 후 axe 스모크에 모션 체크 추가.

---

## 3. 데이터 축적 대기 항목 (수집은 진행 중 · 착수 가능 시점 명시)

> v9가 깐 텔레메트리가 유의미하게 쌓이기 전 구현하면 빈 화면·오해석 위험. **화면(reader) 구축은 지금 가능하나, 임계·경보·추세 해석은 아래 시점 이후 착수.**

| 대기 항목 | 의존 데이터 | 착수 가능 시점 |
|---|---|---|
| **web_vitals 회귀 경보 임계·라우트 목표선** (H1 확장) | `web_vitals` 10% 샘플이 라우트별 p75 신뢰구간 확보 | H1 소비 화면 배포 후 **~2주 축적**(대표 라우트별 수십 샘플 이상) |
| **cron 안정성 추세 해석·열화 경보** (M3 확장) | `cron_runs` kind별 수 주치 이력 | v7-M6(cron_runs) 배포 후 이미 수 주 경과 가능 — **1주 내 재확인 후 착수** |
| **kudos 리더보드·주차 추이** (M4) | `kudos` 누적이 리더보드로 의미 있을 볼륨 | 활동량 관찰 후 — **8월 유입기 이후 재평가** |
| **funnel 전환 개선 실험** | `user_activity_logs` funnel 이벤트 baseline 볼륨 | 8월 신입 유입으로 볼륨 확보 후 — **9월 초 재평가** |
| **loyalty/adoption 코호트 추이** | `loyalty-snapshot`·학기 경계 데이터 | 신학기 코호트 1회전 후 — **가을 학기 진행 중 재평가** |

---

## 4. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| 해커톤 **당일 체크인 정책·심사 기준·심사위원 배정 규칙**(H3) | 운영진 이벤트 운영·심사 기준 확정 |
| `analytics-retention` cron **스케줄 활성화**(v9에서 편입·현재 정책 대기) | 개인정보 보존 정책상 삭제 주기 확정 |
| academic-admin 디렉토리 **최종 삭제**(v8-H4 단계 4·21 스텁) | 운영진 "정본 표면" 최종 승인 + 실 도달성 확인 |
| 신입 승인 **SLA·담당·주기**(v9-H5 후속) | 운영진 승인 담당자·목표 처리시간 합의 |
| 넛지·리마인더 **발송 정책**(quiet-hours·빈도·주체) | 푸시/알림 발송 정책 합의 |
| H4·H6 감사에서 발견될 **정책성 판단**(지표 정의·데드코드 제거 승인) | 운영진 판단 |
| Sentry 등 **에러 리포팅 연동**(v9-H2 확장) | 외부 서비스 계정·비용 승인 |
| `/networking` 리다이렉트(**"조치 불요" 종결 — 실 트래픽 발생 시에만 재검토**) | 실 인입 발생 여부 |
| Firestore 정기 export/백업 · 세미나 라이브 다시보기 (carryover) | GCP 스케줄러/GCS · 장표 저작권 |

---

## 5. 즉시 착수 Top 5 (병렬 편성안 — 파일 영역 비중복)

1. **H1 web_vitals 성능 관측 콘솔(M · 구현)** — 수집만 되고 소비 0인 텔레메트리를 화면으로. `features/insights`(신규 섹션)·`console`. 트랙 A.
2. **H2 무거운 컴포넌트 동적 import(M · 구현)** — 측정만 하고 안 고친 성능 부채 상환. 무거운 컴포넌트 파일·뷰어. 트랙 B(H1과 파일 비중복).
3. **H3 해커톤 당일 운영 실행 콘솔(M · 구현 · D-33)** — 유일 잔여 실전 공백. `features/hackathon`·`console/hackathon`. 트랙 C.
4. **H4 색상 라운드5 + baseline ratchet 게이트(M · 정리)** — 회귀 영구 차단 + 감축. 광역 파일 + `eslint-rawcolor-baseline.mjs`/lint 설정. 트랙 D(광역·단독).
5. **H6 의존성·데드코드 정리 감사(M · 감사형)** — 무코드 감사 트랙, 항상 병행. 트랙 E.

> **병렬 편성(파일 영역 비중복 → 5트랙 동시)**:
> - 트랙 A(데이터 수확): **H1 web_vitals 콘솔 · M3 cron 추세 · M4 kudos** — `features/insights`·`console/insights`·`console/cron-logs` (H1 배포 후 M3/M4 순차, insights 공유)
> - 트랙 B(성능 상환): **H2 동적 import** — 무거운 컴포넌트 래핑·뷰어 컴포넌트 (독립)
> - 트랙 C(실전 실행): **H3 해커톤 당일 콘솔** — `features/hackathon`·`console/hackathon` (독립)
> - 트랙 D(색상·게이트): **H4 라운드5 + ratchet · L3 라운드6** — 광역 raw 색상 + eslint 설정 (광역 단독, 위 트랙과 시차)
> - 트랙 E(감사·무코드 병행): **H5 아카이브/연구도구 감사 · H6 deps/deadcode 감사** — 코드 무수정(발견 결함만 소규모 핫픽스), 항상 병행
> - 품질 정리: **M1 빈 상태 · M2 reduced-motion · M6 OG 정정** — `components/ui`·표현 계층 (H4 색상과 파일 근접 시 순차)
> M5(명명 문서화)·L1·L2·L4는 여유 시.

---

## 6. 참고 파일 (절대경로 · 실측 2026-07-21)
- `C:\work\yonsei-edtech\src\lib\web-vitals-tracker.ts`(`:28` `web_vitals` 컬렉션 적재·**소비 화면 0** → H1) / `src\components\layout\WebVitalsTracker.tsx`
- `C:\work\yonsei-edtech\src\features\insights\`(`FunnelSection`·`SearchMissSection`·`LoyaltyTrendSection` 존재 vs **web_vitals 소비 없음** → H1 / `WeeklyOperationsSummary`·`cron` 추세 → M3)
- (동적 import 대상) `framer-motion` **18파일**·`xlsx` 9·`@react-pdf/renderer` 9·`recharts` 6·`pdfjs-dist` 1 — `grep next/dynamic src` **0건** → H2
- `C:\work\yonsei-edtech\src\features\hackathon\`(Awards·Board·Cta·Timeline·Submissions·TeamView·config — **checkin/judging-assign exec UI 없음** → H3)
- `C:\work\yonsei-edtech\eslint-rawcolor-baseline.mjs`(**398 파일** — v9 390→+8 회귀·**ratchet 없음** → H4)
- `C:\work\yonsei-edtech\src\features\archive\ArchiveConceptRecommend.tsx`·`useConceptIndex.ts` / `src\components\archive\ConceptLinkedText.tsx`·`ConceptMentionsInMyRecords.tsx` / `src\app\mypage\research\tools\page.tsx`(**실사용 마찰 미감사** → H5)
- `package.json`(**web-vitals·@next/bundle-analyzer·axe-core 설치완료**·`depcheck`/`ts-prune` 미설치 → H6·L2) / TODO·FIXME·deprecated **144건** → H6
- `C:\work\yonsei-edtech\src\components\ui\empty-state.tsx`(공용·95곳 vs **ad-hoc 79파일** → M1)
- `prefers-reduced-motion` **7파일** vs framer-motion 18파일 → M2
- `src\app\network`·`src\app\api\networking`·`src\app\console\networking`(**4중 명명·문서화 없음** → M5) / `/networking` 단수 = **404 "조치 불요" 종결(재제안 금지)**
- `C:\work\yonsei-edtech\src\app\api\cron\`(**32 디렉토리 = vercel.json 32 스케줄 전량 등록**) / `console\cron-logs\page.tsx`(`cron_runs` 소비·추세 미심화 → M3)

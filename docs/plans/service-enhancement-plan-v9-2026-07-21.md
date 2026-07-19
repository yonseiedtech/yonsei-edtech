# 연세교육공학회 차기 라운드 고도화 백로그 v9 — "실전 리허설과 워크스루 — 배포 통과 ≠ 실동작, 실제로 걸어보고 실전을 예행한다" (2026-07-21)

> 작성: 수석 서비스 플래너 (자율 분석 · 대화형 인터뷰 없음 · 코드·문서 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, **38번째 배포 — v8 백로그(High 6·Medium 6) 전량 소진**)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · **다음 큰 이벤트: 에듀테크 해커톤 2026-08-22 (D-33, 참가접수 개시일 = 오늘 2026-07-20)**, 8~9월 신입 유입·온보딩 시즌
> 실측 근거(2026-07-20 grep/ls/curl 직접 실측): `git log`(v8 4배포: `6706bd26`·`e291bef1`·`93b4dfb3`·`dae67f53`) · `git status`(작업트리 클린 — 미배포분 0) · v8 계획서 + 2026-07-20 구현/감사 보고서 10종 · `src/app`(**313 page.tsx**)·cron(**30 디렉토리 / vercel.json 스케줄 29 → `analytics-retention` 미등록=휴면 확정**)·`error.tsx` **4개**·`global-error.tsx` **0**·`loading.tsx` 8·`eslint-rawcolor-baseline.mjs`(**390 파일**)·`package.json`(axe·bundle-analyzer·web-vitals·lighthouse **전무**) 실측, 그리고 신입 유입 경로·해커톤 참가자 경로·지표 집계 로직 직접 추적.

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE·미변경 확정)

### 0-1. v6 라운드 + 벤치마크 전량 (재제안 금지)
v6 H1~H6·M1·M2·M6·L1~L3, 벤치마크 H1~H6·M1~M5 — v7 계획서 §0-1 표에 커밋 해시로 확정. **전부 재제안 금지.**

### 0-2. v7 라운드 13종 전량 (재제안 금지)
인사이트 액션화(`SuggestedActionsSection`)·adoption 지표 완성·보존 cron(`analytics-retention`)·대시보드 배치 fetch(`useUserDiagnostics`)·학습 kudos·콘텐츠 갭 대시보드·해커톤 운영(제출/심사)·신입 활성화 시퀀스(`newcomer-activation-sequence`)·다이제스트 추적(`/r/digest*`)·검수 품질 추세·모바일 경험·cron 관측성(`withCronLog`/`cron_runs`)·색상 라운드3 — v8 계획서 §0-2 표에 확정. **재제안 금지.**

### 0-3. v8 라운드 High 6 + Medium 6 (오늘 배포 · **재제안 절대 금지**)

| v8 항목 | 산출물(실측·LIVE) | 상태 |
|---|---|---|
| **H1** cron 실패 능동 경보 | `api/cron/cron-watchdog` — 연속 2회+ 실패 kind 감지→admin 알림(`refId` 일 1회 dedup) | LIVE (단 **stale 감지는 명시 생략** → v9-M1) |
| **H2** kudos 표면 완성 | `features/kudos/*`(공통 추출) + `KudosWidget`(대시보드)·`ReceivedKudosHistory`(마이페이지) | LIVE |
| **H3** 콘텐츠 갭→초안·다이제스트 | `content-draft-generator` 세미나 Q&A 블록(`contentGapSource:"seminar_qna"`) + `weekly-digest` 운영진 갭 하이라이트 | LIVE |
| **H4** academic-admin IA 정리 | 인바운드 링크 교체·역결합 5건 이관·**21 redirect 스텁**(단계 1~3) | LIVE (단 **단계 4 디렉토리 삭제는 유예** → 외부 의존) |
| **H5** 신입 첫 2주 진행 위젯 | `NewcomerProgressWidget`(4단계)·`newcomer-sequence.ts` 판정 유틸 | LIVE (단 **실계정 워크스루·quiet-hours는 미완** → v9-H1·M1) |
| **H6** 해커톤 공개 완성 | `HackathonPhaseTimeline`(D-day·스테퍼)·`HackathonCtaBanner`·`HackathonAwards` 단계 기계 | LIVE (단 **제출 마감 리마인더·당일 운영·팀 확정 부재** → v9-H3·M6) |
| **M1** 논문 도구 통합 허브 | `/mypage/research/tools`(연구 여정 5단계 21도구 카드)·Header·MyResearchView 링크 | LIVE |
| **M2** 라우트 회귀 감사 | 109 라우트 curl 실측(500 0건·**404 1건=`/networking`**) — `route-regression-audit-m2v8` | LIVE (감사) (`/networking` 404 미조치 → v9-M2) |
| **M3** 멘토링 루프 강화 | adoption `unmatchedNewcomers`·`responseRate` + `api/cron/mentoring-nudge`(주1회) | LIVE |
| **M4** 색상 라운드4 | baseline **411→390** (마이페이지·아카이브 트리) | LIVE |
| **M5** digest 성과→타이밍 환류 | `DigestStatsSection` 주차 추이·CTR·타이밍 권장안 | LIVE |
| **M6** cron_runs 보존 편입 | `analytics-retention`에 `cron_runs` 90일 삭제 추가(스케줄은 휴면) | LIVE |

**위 12종은 재제안 금지.** v9는 이들을 **다시 만들지 않고**, 배포는 통과했으나 **실동작이 미검증인 사각**(실계정 워크스루·에러 경계·지표 정확성·행사 당일)을 메운다.

### 0-4. v8 Low(L1~L4)는 **미구현** → v9에서 승격 (재제안 아님)
v8 L1(a11y axe)·L2(번들 analyzer)·L3(단축키 힌트)·L4(명명 문서화)는 Low로 남아 **구현되지 않았다**(`package.json` grep으로 axe·bundle-analyzer 전무 확인). v9는 이 carryover를 **품질 심화 테마의 정식 항목으로 승격**한다(H6·M4·L1·L2).

### 0-5. 상주 인프라 (재제안 금지 — 활용만)
측정(`visit-tracker`·`funnel`·`search-miss`·`adoption-snapshot`·`loyalty-snapshot`)·관측(`withCronLog`/`cron_runs`·`cron-watchdog`)·관계(`kudos`·`weekly_goal_records`·`digest_opens`/`clicks`)·정리(`analytics-retention`·`notifications-cleanup`)·신학기(`newcomer-activation-sequence`·`mentoring-nudge`·`hackathon_submissions`/`judgings`).

---

## 1. v9 핵심 명제

> **네 라운드(v6 확장·증명 → v7 측정→개선 루프 → v8 소비 완결·정리)가 "만들고, 쓰이게 하고, 정리"를 끝냈다. 그러나 실측하면 "배포·빌드는 통과했으나 실제로 걸어본 적 없는" 사각이 넷 남아 있다.** v9는 각도를 **"실전 리허설(rehearsal)과 워크스루(walkthrough)"** 로 바꾼다 — (1) **8/22 해커톤 당일**을 실 데이터로 예행하고, (2) **신규 계정 관점**에서 가입→승인→첫 2주를 실제로 걸어 끊기는 곳을 찾고, (3) **품질(에러 경계·성능 계측·a11y·빈 상태)** 을 심화하며, (4) v7·v8이 깔아둔 **지표의 정확성**을 코드로 교차검증한다. **신규 표면은 최소, 감사·검증형(코드 무수정) 비중을 대폭 상향**(High 6 중 2건·Medium 6 중 1건·전체 16항목 중 감사형 5건 ≈ 31%).

### 1-1. 실측된 "미검증 사각" 4종 (v9의 출발점)

| # | 각도 | 실측된 사각 | 근거(2026-07-20) |
|---|---|---|---|
| ① | **행사 직전 실전** | 해커톤 공개는 완성(H6)됐으나 **제출 마감 리마인더 cron 0건**·**팀 확정 표면 없음**(아이디어 보드+팀 희망 슬롯까지만)·**당일 운영/체크인 화면 없음**. 참가 접수는 오늘 개시. | `ls api/cron \| grep hackathon` **0건**. `features/hackathon`에 checkin/팀확정 grep 0. `config.ts:8` "참가 신청=comm_boards 아이디어 보드" |
| ② | **신입 유입 시뮬** | H5 신입 위젯은 코드로만 구현 — **실계정 워크스루 미수행**(kudos-newcomer 보고서 line 97 "배포 후 게이트에서 필요"). 가입 후 **수동 승인 대기 중 가시성 0**(신청자는 언제 승인될지 모름). quiet-hours 가드 미반영. | `signup/page.tsx:90` "수동 승인 대기 흐름", `:99` "가입 신청 완료" 화면만. 승인=`console/academic/applications` |
| ③ | **품질 심화** | **에러 경계 4개뿐**(activities·collab·root·mypage), **global-error.tsx 0** → dashboard·hackathon·archive·console·seminars·board·gatherings 등에서 런타임 예외 시 흰 화면 위험. **성능 계측 전무**(bundle-analyzer·web-vitals·lighthouse 미설치). 빈 상태 **ad-hoc 54파일**(EmptyState 컴포넌트 있으나 미수렴). reduced-motion **8곳만** 준수. | `find error.tsx` 4 · `global-error.tsx` 없음 · `package.json` grep 0 · `grep "아직 없\|등록"` 54파일 · `prefers-reduced-motion` 8 |
| ④ | **데이터 신뢰** | v7·v8이 깐 지표(`adoption-snapshot`의 멘토링·미매칭 신입·응답률, digest CTR, `loyalty-snapshot`, `cron_runs`)의 **집계 정확성이 교차검증된 적 없음** — 0분모·타임존(KST/UTC)·센티널(-1)·픽셀 편향·`cohortKeyOf` 학기 경계 위험. | `adoption-metrics.ts`(261L) `unmatchedNewcomers`=full users read+`cohortKeyOf` 필터, `responseRate`=answerCount>0/전체. digest CTR=클릭/열람(픽셀 차단 편향). 검증 코드 0 |

### 1-2. 실측된 정리·잔여 부채 (⑤ 자유 발굴)

| 구분 | 실측 | 판정 |
|---|---|---|
| **`/networking` 404** | v8-M2 감사가 발견(`route-regression-audit-m2v8`)했으나 **미조치**. `src/app/networking/page.tsx` 미존재. 북마크·구링크 인입 시 흰 404. | **핫픽스 대상 → M2** |
| **cron-watchdog stale 감지** | v8-H1이 "연속 실패"만 감지, **stale(예상 실행 창 침묵)은 명시 생략**(cron-watchdog 보고서 line 34). 조용히 죽어 재시도조차 안 되는 cron은 미탐지. | **완결 대상 → M1** |
| **색상 baseline 390** | 라운드4로 411→390. board·leaderboard·seminars 등 잔존. | **라운드5 → L3** |
| **academic-admin 21 스텁·디렉토리 잔존** | 단계 1~3 완료, **단계 4(디렉토리 삭제·robots·BottomNav 가드 정리)는 유예**. | **외부 의존(운영진 정본 승인)** |

---

## 2. 고도화 백로그 (v9 · 16항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+) → 유형(감사/구현)]**
> **감사·검증형(코드 무수정) = H1·H4·M2 일부·L4 (총 5건 ≈ 31%)** · **정리·회귀 방지 = M2·M3·L2·L3 (4건)** — 신규 표면 최소 원칙 준수.
> **High = 외부 의존 없음(코드·감사만으로 완결 가능)** 항목만 배치.

### High (즉시 착수 · 외부의존 없음 · ROI 높음)

**H1. 신규 계정 온보딩 end-to-end 워크스루 감사 — 코드가 아니라 실경로를 걷는다 (신입 시뮬 ② · 감사형)**
- 문제: v8-H5 `NewcomerProgressWidget`·H2 kudos 위젯·M2 넛지 시퀀스는 **코드로만 구현**되고 실계정 관점 워크스루는 "배포 후 게이트 필요"로 미뤄졌다(kudos-newcomer 보고서 line 97). 신입이 실제로 겪는 **가입 → (수동 승인 대기) → 첫 로그인 → 대시보드 위젯 노출/미노출 경계 → 딥링크 → 빈 상태**가 한 번도 연속 검증된 적 없다. `NewcomerProgressWidget`는 신입 창(14일)·코호트·전단계완료에 따라 null 렌더하는데 **경계 오작동 시 신입이 빈 대시보드를 보게 됨**.
- 제안: **코드 무수정 워크스루 감사** — (1) 신입 4단계(프로필→진단→첫 아카이브→첫 인사) 위젯의 노출/미노출 경계를 코호트·가입일·완료 플래그 조합으로 코드 추적+가능하면 QA 계정 렌더 확인, (2) 각 단계 딥링크가 실제 도착지·빈 상태로 정상 렌더되는지 curl/브라우저 확인, (3) `steppingstone/onboarding` 첫 접점 카피·CTA·빈 상태 점검, (4) M2 넛지 D+1/3/7/10/14 스킵 판정과 위젯 판정(`newcomer-sequence.ts`)의 **일치 여부** 대조. 발견 결함만 별도 핫픽스 항목화. codex/qa-tester 병행.
- 기대효과: 8월 유입 전 신입 첫 경험의 실동작 보증, "빌드 통과 ≠ 신입이 본 화면" 사각 제거.
- 난이도: **S~M** · **감사형(무코드)**

**H2. 라우트 에러 경계 확충 + global-error — 예외 시 흰 화면 방어 (품질 ③ · 구현)**
- 문제: `error.tsx`가 **4개뿐**(activities·collab·root·mypage)이고 **`global-error.tsx`가 없다**. dashboard·hackathon·archive·console·seminars·board·gatherings·steppingstone·mentoring·diagnosis 등 고빈도·신입 노출 라우트 그룹에서 런타임 예외(null·undefined·fetch 실패)가 나면 **루트 error.tsx 또는 프레임워크 기본 흰 화면**으로 떨어진다 — 8월 유입 성수기에 치명적.
- 제안: 고위험 라우트 그룹별 `error.tsx` 추가(재시도 버튼·홈 복귀·문의 링크가 있는 일관된 에러 UI 공통 컴포넌트 1개 재사용) + 루트 `global-error.tsx` 추가(레이아웃 자체가 죽는 경우 방어). 시맨틱 토큰만 사용해 색상 baseline 무영향. Sentry 등 외부 리포팅은 붙이지 않음(외부 의존 회피 — 로깅은 `console.error`로 시작).
- 기대효과: 조용한 런타임 예외가 전체 페이지를 삼키지 않음, 회원 이탈 방어, 8월 신뢰성.
- 난이도: **S~M** · **구현**

**H3. 해커톤 제출 마감 리마인더 + 당일 운영 리허설 감사 — D-33 실전 예행 (행사 직전 실전 ① · 구현+감사)**
- 문제: v8-H6가 공개 페이지(D-day·타임라인·CTA·갤러리)를 완성했으나 **참가자를 마감으로 이끄는 능동 알림이 없다** — `ls api/cron | grep hackathon` **0건**. 참가 신청(아이디어 보드)은 했으나 **제출(`hackathon_submissions`) 안 한 팀에게 마감 임박 알림 부재**. 또한 제출 마감(08-22T21:30)→심사 배정→수상 발표(08-29)의 **당일 운영 흐름이 실 데이터로 예행된 적 없음**.
- 제안: (1) `api/cron/hackathon-submission-reminder`(신규 경량, 마감 D-3·D-1·당일) — 참가 신청(comm_boards hackathon)은 했으나 `hackathon_submissions` 미제출인 팀/개인에게 1건 알림(`withCronLog` 관측·`push_logs` 주기 dedup·`mentoring-nudge` 패턴 재사용, 신규 컬렉션 없음). (2) **당일 운영 리허설 감사**(무코드) — 운영진 콘솔에서 제출 목록→심사 배정(`hackathon_judgings`)→수상 published→공개 갤러리 전환이 실 데이터로 끊김 없이 도는지 워크스루, 발견 결함 항목화. 행사 종료 후 cron 자동 비활성(마감일 지나면 스킵).
- 기대효과: 제출률·행사 완주율 상승, 8/22 당일 운영진이 "이미 걸어본" 흐름으로 진행, 신입에게 "지금 제출" 명확한 앵커.
- 난이도: **M** · **구현+감사** · **시의성 최상(D-33)**

**H4. v7/v8 지표 정확성 교차검증 감사 — 깔아둔 숫자를 믿을 수 있게 (데이터 신뢰 ④ · 감사형 · codex)**
- 문제: v7·v8이 다수 지표를 깔았으나(`adoption-snapshot`의 멘토링·`unmatchedNewcomers`·`responseRate`, digest CTR/열람률, `loyalty-snapshot`, `cron_runs` 집계) **정확성이 교차검증된 적 없다**. 실측 위험: `responseRate`=answerCount>0/전체(0분모 처리?), digest CTR=클릭/열람(**이미지 차단 픽셀 편향** — M5 보고서도 인정), `unmatchedNewcomers`=full users read+`cohortKeyOf`(**학기 경계·미승인 회원 포함 여부**), `weekKey`/`currentWeekKey` **타임존(KST vs UTC)**, 센티널 `-1`이 UI에서 "0"으로 오독될 위험.
- 제안: **코드 무수정 감사(codex 독립 검증 병행)** — 각 지표의 정의·엣지케이스(0분모·타임존·센티널·픽셀 편향·미승인 회원)를 코드로 재현해 스냅샷 값과 대조, 정의 모호·오집계 지점을 표로 산출. 정정이 코드 문제면 별도 핫픽스 항목화, 정의 문제면 외부 의존(운영진 판단)으로 분리.
- 기대효과: 운영진이 대시보드 숫자를 근거로 의사결정할 수 있는 신뢰 확보, 잘못된 넛지(오집계 기반 발송) 예방.
- 난이도: **M** · **감사형(무코드·codex)**

**H5. 가입 승인 대기 가시화 + 미처리 신청 운영 넛지 — 유입 깔때기 첫 병목 (신입 시뮬 ② · 구현)**
- 문제: 가입은 **수동 승인 대기**(`signup/page.tsx:90` "수동 승인 대기 흐름", `:99` "가입 신청 완료" 화면)인데 **신청자는 승인 상태·예상 시점을 알 수 없고**, 운영진(`console/academic/applications`)이 **미처리 신청을 능동 통지받지 못한다** → 승인 지연 시 신입이 첫 로그인도 못 하고 이탈. 유입 깔때기의 **가장 앞 병목**인데 가시성이 0.
- 제안: (1) "가입 신청 완료" 화면에 **승인 절차 안내·예상 소요·문의 경로** 카피 보강(빈 약속 금지 — 운영 실측 SLA 반영 여지 남김). (2) `console/academic/applications`에 **미처리 신청 N건 배지** + 운영진 주기 넛지(기존 알림/`withCronLog` cron 재사용, 임계 초과 시 1건 요약). 신규 컬렉션 없음. (실 승인 SLA·담당 확정은 외부 의존 §3.)
- 기대효과: 유입 첫 병목 해소, 승인 지연 이탈 감소, 운영진 처리 누락 방지.
- 난이도: **S~M** · **구현**

**H6. 성능 계측 기준선 확보 — bundle-analyzer + web-vitals(LCP) (품질 심화 ③ · 구현 · v8-L2 승격)**
- 문제: 성능 계측이 **전무**(`package.json`에 `@next/bundle-analyzer`·`web-vitals`·`lighthouse` grep 0). `recharts`·`pdfjs-dist`·`xlsx`·`@react-pdf`·`framer-motion` 등 무거운 의존성이 어느 라우트 번들을 부풀리는지, 실제 LCP가 얼마인지 **측정 기준선이 없다** → 8월 유입 전 성능 최적화의 근거 부재.
- 제안: (1) `@next/bundle-analyzer` 1회 측정 → 라우트별 번들 상위 리포트 산출(측정만·최적화는 M5로 분리). (2) `web-vitals` 경량 수집(LCP·CLS·INP)을 `visit-tracker` 인프라에 실어 대표 라우트 기준선 확보(신규 컬렉션 최소·기존 텔레메트리 재사용). 두 도구 모두 dev/측정용 — 런타임 회원 경험 무변경.
- 기대효과: 성능 개선의 정량 근거 확보, M5 동적 import의 타깃 선정, LCP 회귀 조기 감지.
- 난이도: **M** · **구현**

### Medium (1~2 스프린트)

**M1. cron-watchdog stale(침묵) 감지 완결 — 조용히 죽은 cron까지 (데이터 신뢰 ④ · 구현 · v8-H1 잔여)**
- 문제: v8-H1 watchdog은 **연속 실패만** 감지(cron-watchdog 보고서 line 34 "stale 감지는 vercel.json 파싱 복잡으로 생략"). **실행 자체가 안 되어 `cron_runs`에 기록조차 없는(침묵)** cron은 미탐지 — 가장 위험한 조용한 실패를 놓친다.
- 제안: cron-parser 외부 의존 없이 **`vercel.json`의 kind별 스케줄을 코드 상수 맵(kind→예상 최대 간격)으로 1회 하드코딩**해, `cron_runs` 최신 실행이 예상 간격×2를 넘긴 kind를 stale 경보에 추가. 기존 watchdog 알림·dedup 재사용, 신규 컬렉션 없음.
- 기대효과: 관측→행동 완결의 마지막 조각, 8월 성수기 cron 신뢰성.
- 난이도: **S~M** · **구현**

**M2. /networking 404 핫픽스 + 인입 링크 감사 (자유 발굴 ⑤ · 구현·정리)**
- 문제: v8-M2 감사가 발견한 **`/networking` 404**(소스 없음)가 미조치. 유사 라우트 `/network`(협업 그래프)·`/console/networking`(운영 콘솔) 존재. 구링크·북마크·오타 인입 시 흰 404.
- 제안: `/networking` → `/network`(또는 실 트래픽 확인 후 적정 대상) redirect 스텁 + 코드베이스 내 `/networking` 하드코딩 링크 grep 감사(있으면 정정). 저위험 단일 파일.
- 기대효과: 인입 유실 제거, 명명 혼선 완화.
- 난이도: **S** · **구현**

**M3. 빈 상태 일관성 표준화 — ad-hoc 54파일 → EmptyState 수렴 (품질 ③ · 정리)**
- 문제: 공통 `EmptyState`(`components/ui/empty-state.tsx`, 82곳 사용)가 있는데도 **ad-hoc "아직 없음/등록" 빈 상태가 54파일에 잔존** → 톤·여백·CTA 불일치, 신입이 빈 화면마다 다른 인상을 받음.
- 제안: 고빈도·신입 노출 라우트(대시보드·아카이브·마이페이지·board·mentoring) 우선으로 ad-hoc 빈 상태를 `EmptyState`로 배치 수렴(순수 표현 치환·로직 불변). 전량 아닌 우선순위 배치.
- 기대효과: 빈 상태 일관성, 신입 인상 개선, 유지비 절감.
- 난이도: **M** · **구현(정리)**

**M4. a11y 심화 — axe 스모크 게이트 + reduced-motion 준수 (품질 ③ · 구현 · v8-L1 승격)**
- 문제: `aria-` 사용은 343파일로 넓으나 **자동 a11y 검사 게이트 없음**(axe 미설치)이고, **`prefers-reduced-motion` 준수 8곳뿐** — `framer-motion` 애니메이션 다수가 모션 민감 사용자에게 무방비.
- 제안: (1) 핵심 라우트 `axe-core` CI 스모크(경고 수준, 색상 게이트와 동일 패턴). (2) 전역 `prefers-reduced-motion` 존중(공통 모션 래퍼/Tailwind `motion-reduce:` 유틸 적용) 확대. 코드 로직 무변경.
- 기대효과: 접근성 기준선 확보, 모션 민감 사용자 배려, 품질 게이트 실효성↑.
- 난이도: **M** · **구현**

**M5. 무거운 의존성 라우트 동적 import — H6 측정 기반 최적화 (품질 ③ · 구현·성능 · v8-L2 잔여)**
- 문제: `recharts`·`pdfjs-dist`·`xlsx`·`@react-pdf`·`framer-motion`이 초기 번들에 정적 포함되면 신입 첫 진입(대시보드·아카이브) LCP 저하.
- 제안: **H6 측정 리포트로 타깃 확정 후** 무거운 컴포넌트 라우트별 `next/dynamic` 지연 로드(차트·PDF·엑셀 뷰어). H6 선행·M5 후행(순차 의존).
- 기대효과: 초기 번들 축소·LCP 개선, 8월 유입 첫인상 개선.
- 난이도: **M** · **구현**

**M6. 해커톤 팀 확정 표면 — 아이디어 보드에서 팀으로 (행사 직전 실전 ① · 구현)**
- 문제: 참가 신청=아이디어 보드(comm_boards hackathon)+"팀 참여 희망" 슬롯까지만(`HackathonBoard.tsx`) — **팀을 실제로 확정·조회하는 표면이 없다**. 참가자가 서로 공감(좋아요)은 하나 "누구와 한 팀인지" 관리 부재 → 당일 팀 편성 혼선 위험.
- 제안: **신규 컬렉션 최소** — 아이디어 보드 위에 "팀 확정" 경량 표면(팀명·팀원 목록·모집 마감 토글)을 기존 `hackathon_submissions`/보드 필드 재사용으로 구현하거나, 최소 팀 목록 뷰 제공. 팀 확정 규칙은 운영진 정책 확정 후 반영(외부 의존 일부).
- 기대효과: 당일 팀 편성 명확화, 참가자 팀빌딩 실동작 지원.
- 난이도: **M** · **구현** (규칙은 §3 외부 의존)

### Low (여유 시 · carryover)

**L1. 단축키 상시 힌트 (발견성 · v8-L3 carryover · S · 구현)** — 팔레트 코치는 있으나 주요 액션 버튼에 단축키 툴팁 병기 없음. 핵심 버튼에 툴팁 병기.

**L2. 유사 명명 표면 문서화 (정리 · v8-L4 carryover · S · 문서)** — `network`/`networking`(M2로 404 해소)·`board`/`comm-board`의 역할·진입점을 nav 라벨·README로 명확화(코드 이동 없음).

**L3. 색상 부채 라운드5 — baseline 390→~330 (정리 · M · 구현)** — board·leaderboard·seminars·gatherings 등 잔존 raw 팔레트 시맨틱 토큰 배치 마이그레이션. 순수 치환·로직 불변.

**L4. OG·메타·이미지 커버리지 감사 (품질 · S · 감사형)** — 신규 라우트(hackathon·research/tools·steppingstone 하위)의 OG 이미지·메타 태그·`alt` 텍스트 커버리지 감사, 누락 표 산출(정정은 후속).

---

## 3. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| academic-admin 디렉토리 **최종 삭제**(v8-H4 단계 4·21 스텁·robots·BottomNav 가드) | 운영진의 "어느 표면을 정본으로" 최종 승인 + 실 도달성 확인 |
| `analytics-retention` cron **스케줄 활성화**(현재 휴면·코드만 준비) | 개인정보 보존 정책상 로그·`cron_runs` 삭제 주기 확정 |
| 신입 승인 **SLA·담당·주기**(H1·H5) | 운영진 승인 담당자·목표 처리시간 합의 |
| 해커톤 제출 마감 리마인더·팀 확정 규칙·심사·수상 정책(H3·M6) | 운영진 이벤트 운영·팀 편성 규칙·심사 기준 |
| 신입 넛지·승인 넛지·마감 리마인더 **발송 정책**(H3·H5·M1) | 푸시/알림 발송 주체·빈도·조용시간 합의 |
| H4 감사에서 발견될 **지표 정의 확정**(예: responseRate 분모·미승인 회원 포함) | 운영진 판단 |
| M2 `/networking` 리다이렉트 대상 | 실 트래픽 인입처 확인(있다면) |
| Sentry 등 **에러 리포팅 연동**(H2 확장) | 외부 서비스 계정·비용 승인 |
| Firestore 정기 export/백업 · 세미나 라이브 다시보기 (carryover) | GCP 스케줄러/GCS · 장표 저작권 |

---

## 4. 즉시 착수 Top 5 (병렬 편성안 — 파일 영역 비중복)

1. **H1 신규 계정 워크스루 감사(S~M · 감사형)** — 코드 무수정. 신입 실경로 검증. 트랙 C(무코드) — 언제든 병행. `qa-tester`/codex.
2. **H2 라우트 에러 경계 확충(S~M · 구현)** — 독립 신규 파일. `src/app/*/error.tsx`·`global-error.tsx`. 품질 즉효.
3. **H3 해커톤 마감 리마인더 + 당일 리허설(M · 구현+감사)** — D-33 시의성 최상. `api/cron/hackathon-submission-reminder`·`features/hackathon`.
4. **H4 지표 정확성 교차검증 감사(M · 감사형·codex)** — 코드 무수정. `features/insights` read-only. codex 독립 검증.
5. **H5 승인 대기 가시화 + 운영 넛지(S~M · 구현)** — 유입 첫 병목. `app/signup`·`console/academic/applications`.

> **병렬 편성(파일 영역 비중복 → 4트랙 동시)**:
> - 트랙 A(품질 구현): **H2 에러 경계 · H6 성능 계측 · M3 빈 상태 · M4 a11y** — `src/app/*/error.tsx`·`components/ui`·`package.json`(H6·M4 package.json 공유 → 순차)
> - 트랙 B(신입·실전 구현): **H5 승인 가시화 · H3 마감 리마인더 · M6 팀 확정 · M2 networking** — `app/signup`·`console`·`api/cron`·`features/hackathon`
> - 트랙 C(감사·무코드 병행): **H1 워크스루 · H4 지표 검증(codex) · L4 OG 감사** — 코드 무수정, 항상 병행
> - 트랙 D(광역·시차): **M5 동적 import(H6 선행) · L3 색상 라운드5** — 광역 파일 접촉, 위 트랙과 시차 단독
> M1(watchdog stale)은 트랙 A/B와 소스 공유 적어 독립. L1·L2는 여유 시.

---

## 5. 참고 파일 (절대경로 · 실측 2026-07-20)
- `C:\work\yonsei-edtech\src\app\error.tsx`·`activities\error.tsx`·`collab\error.tsx`·`mypage\error.tsx` (**에러 경계 4개뿐·global-error 없음** → H2)
- `C:\work\yonsei-edtech\src\features\dashboard\NewcomerProgressWidget.tsx` / `src\lib\newcomer-sequence.ts` (신입 위젯·판정 유틸 — **실계정 워크스루 미수행** → H1)
- `C:\work\yonsei-edtech\src\app\signup\page.tsx` (`:90` 수동 승인 대기·`:99` 신청 완료 — **승인 가시성 0** → H5) / `src\app\console\academic\applications\page.tsx` (승인 처리 → H5)
- `C:\work\yonsei-edtech\src\app\api\cron\` (30 디렉토리·**hackathon 리마인더 0건** → H3 / vercel.json 29 스케줄·`analytics-retention` 미등록 휴면)
- `C:\work\yonsei-edtech\src\features\hackathon\HackathonBoard.tsx`·`config.ts` (참가=아이디어 보드+팀 희망 슬롯·**팀 확정 표면 없음** → M6) / `HackathonSubmissions.tsx`·`HackathonAwards.tsx` (당일 운영 리허설 → H3)
- `C:\work\yonsei-edtech\src\features\insights\adoption-metrics.ts` (261L·`unmatchedNewcomers` full users read·`responseRate` → H4) / `DigestStatsSection.tsx` (CTR 픽셀 편향 → H4)
- `C:\work\yonsei-edtech\src\app\api\cron\cron-watchdog\route.ts` (`:19` **stale 감지 생략** → M1)
- `C:\work\yonsei-edtech\src\components\ui\empty-state.tsx` (공통 컴포넌트·82곳 사용 vs **ad-hoc 54파일** → M3)
- `C:\work\yonsei-edtech\package.json` (**axe·@next/bundle-analyzer·web-vitals·lighthouse 전무** → H6·M4·L2)
- `C:\work\yonsei-edtech\eslint-rawcolor-baseline.mjs` (**390 파일** → L3)
- `C:\work\yonsei-edtech\src\app\networking\` (**미존재 = 404** → M2) / `route-regression-audit-m2v8-2026-07-20.md` §6-1

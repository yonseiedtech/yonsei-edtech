# 연세교육공학회 차기 라운드 고도화 백로그 v7 — "관찰에서 액션으로, 골격에서 운영으로" (2026-07-20)

> 작성: 수석 서비스 플래너 (자율 분석·대화형 인터뷰 없음, 코드·문서 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, 28번째 배포)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · 다음 큰 이벤트: **해커톤 2026-08-22**, 8~9월 신입 온보딩 시즌
> 실측 근거: `git log --since=2026-07-17`(30커밋), v6 계획서, 2026-07-19 구현 보고서 7종, `docs/plans/benchmark-ux-analysis-2026-07-18.md`, 그리고 `src/` 라우트(310 page.tsx)·cron(26종)·컬렉션 직접 grep/ls.

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE)

### 0-1. v6 + 벤치마크 라운드는 대부분 소진 (git log 30커밋 실측)

| 트랙 | 커밋 | 반영(재제안 금지) |
|---|---|---|
| v6 H1 | `e4d49d23` | 채택 지표 시계열 — `api/cron/adoption-snapshot` **신설 확인**, `adoption_history` 적재 |
| v6 H2 | `2bb4eaec` | 회원 Wrapped — `/mypage/wrapped/page.tsx` **신설 확인** |
| v6 H3 | `9ce244c9` | 주간목표 연속·추세·회고 — `weekly_goal_records` 컬렉션 신설 |
| v6 H4 | `8b95804c` | 멘토링 활성화 장치(멘토 알림·미답변·평판) |
| v6 H5 | `2bb4eaec` | 세미나→아카이브 자산화 |
| v6 H6 | `eef6b21e` | 해커톤 허브 — `/hackathon/page.tsx`(156줄)·`features/hackathon/*` **신설 확인** |
| v6 M1 | `2c531734` | 신입 코호트·버디·신입 리마인드 — `cohortKeyOf`·`CohortSection` |
| v6 M2 | `9ce244c9` | 온보딩·진단 퍼널 측정 — `funnel-telemetry.ts`·`FunnelSection.tsx`·`funnelType` 필드 |
| v6 M6 | `9ce244c9` | 검색 실패 zero-result — `search_misses` 컬렉션·`SearchMissSection` |
| 벤치 H1 | `eef6b21e` | 커맨드 팔레트 코치 — `CommandPaletteCoach.tsx` 신설 |
| 벤치 H2 | `afa3f0ea`/`eef6b21e` | 잔디 쉼표(streak freeze) — `lib/streak-freeze.ts` 신설 |
| 벤치 H3 | `2bb4eaec` | 리더보드 분해 — `/leaderboard` 코호트·백분위(`cohort`/`myCohortRanked`) 확인 |
| 벤치 H4 | `e4d49d23` | unlinked mentions·브랜드 킷 |
| 벤치 H5 | `f28ddcf0`/`eef6b21e` | 브랜드 킷 — `studio-utils.ts` `BRAND_COLORS`/`BRAND_ASSETS` |
| 벤치 H6 | `8b95804c` | 알림 조용한 시간·타이밍(quiet hours) |
| 벤치 M1 | `715c8236` | 읽기 컬렉션 기반 추천 |
| 벤치 M2 | `eef6b21e`/`f28ddcf0` | 매직 리사이즈 — `studio-utils.ts` `resizePages()` |
| 벤치 M4 | `715c8236` | 연구 템플릿 갤러리 |
| 벤치 M5 | `706a2daa` | 세미나 원페이지 RSVP(캘린더 1클릭·참여 현황·리마인더) |
| 대형 | `f28ddcf0`·`b55a7697`·`19befefa` | 조직 연동·타임라인 템플릿·모임 상세 분리·학사정보 캠페인·설정 개편·인쇄 명함 |

또한 **v5까지 소진분**(잔디·주간목표 루프·진단↔학습↔증명 단일 루프·암기카드 SM-2·이론 가계도·크로스링크 양방향·검색 인덱스 사전계산·PWA(`InstallPromptBanner`·`ServiceWorkerRegister`·`push.ts`)·세미나 라이브 콘솔·`.ics` 구독 피드·GlobalSearch)와 **오늘 구현 7종**(운영진 설정 학기별화·자문위원·명함 인쇄·주간목표 루프·검색미스·퍼널·코호트·백필)은 **전부 재제안 금지**.

### 0-2. 상주 측정 인프라 (재제안 금지 — 활용만)
- `src/lib/visit-tracker.ts` → `daily_visits`·`user_activity_logs`
- `src/lib/funnel-telemetry.ts` → `user_activity_logs`(`funnelType` = onboarding|diagnostic)
- `src/lib/search-miss-tracker.ts` → `search_misses`(query·count·lastAt)
- `src/app/api/cron/adoption-snapshot/route.ts` → `adoption_history`(주간 채택 시계열)
- `src/app/api/cron/loyalty-snapshot/route.ts` → 로열티 시계열
- `weekly_goal_records`(주간목표 판정·회고)·`cohortKeyOf`(코호트 파생)

**v7의 핵심 명제: 지난 라운드들이 "측정 인프라와 신규 루프의 골격"을 다 깔았다. v7은 이 데이터를 (1) 관찰용 차트에서 자동 액션으로 전환하고, (2) 신규 골격을 운영 단계로 끌어올리며, (3) 데이터가 쌓이며 커진 비용·성능·부채를 상환한다.**

---

## 1. v6 잔여 항목 승계 판정 (실측 재검증)

| v6 항목 | 실측 | 승계 여부 |
|---|---|---|
| **M3 대시보드 배치 fetch** | `src/app/dashboard/page.tsx` 배치 로더 **없음**, `features/dashboard/` 위젯 **8종 각각 개별 fetch**(`DailyClassTimeline`·`DiagnosisReadiness`·`MyAcademicActivities`·`MyGrowth`·`MyTodos`·`NewMemberChecklist`·`ProfileSide`·`RecentPosts`) | **승계 유효** → v7 H4 |
| **M4 검수 품질 추세** | `reviewQueueStats`/`avgWaitTime` grep **0건**, `adoption-snapshot`은 `diagnosticsCompleted30d`만 담고 검수·멘토링·주간목표·암기카드 **미집계** | **승계 유효** → v7 H2에 흡수 |
| **M5 색상 부채** | `eslint-rawcolor-baseline.mjs` = **454 파일**(v6 시점 446 → **8 증가·회귀**). 게이트로 신규 유입은 차단되나 재고 상환 정체 | **승계 유효** → v7 M4 |
| **M7 다이제스트 열람/CTA 추적** | `weekly-digest/route.ts`에 `open`/`click`/`/r/`/redirect **없음**, `digest_events` 컬렉션 부재 | **승계 유효** → v7 M3 |
| **L1 a11y 자동 게이트** | `package.json`에 `axe` **미설치** | **승계 유효** → v7 L1 |
| **L2 번들 사이즈 측정** | `@next/bundle-analyzer` **미설치** | **승계 유효** → v7 L2 |
| **L3 시드 후보 발굴 워크플로** | 자동 제안 경로 없음(`archive-seed.ts` 수동) | **승계 유효** → v7 H6에 흡수·확장 |
| 벤치 M3 kudos(학습 활동) | `kudos`/응원 = `InterviewResponseReactions`(인터뷰 보드 한정)만, 학습 활동(잔디·목표·완독) 사회적 강화 **없음** | **승계 유효** → v7 H5 |
| 벤치 L2 단축키 상시 힌트 | 팔레트 코치는 있으나 버튼별 단축키 툴팁 병기 미착수 | **승계 유효** → v7 L3 |

---

## 2. 관점별 신규 진단 (탐색 렌즈 6종)

### 렌즈 ① 8~9월 신학기 실전 운영 (해커톤 8/22·신입 유입)
- **해커톤 허브가 "게시판 골격"에 머묾** — `src/app/hackathon/page.tsx`(156줄)·`features/hackathon/HackathonBoard.tsx`는 `comm-board` 기반 팀빌딩/아이디어 보드. **산출물 제출 슬롯·심사 루브릭·수상작 아카이브 연계·D-day 카운트다운의 운영 흐름**이 얕다. 8/22 한 달 앞, 이벤트를 "보드"에서 "운영 도구"로 완성할 시점.
- **신입 첫 2주 활성화가 수동** — `CohortSection`(우리 기수)·`semester-start-reminder`(신입 온보딩 분기)는 있으나, **신입 개인의 첫 2주 진행을 단계별로 자동 촉진**(프로필→진단→첫 아카이브→첫 인사)하는 시퀀스가 없다. `onboarding-evaluator`는 판정만, 촉진 트리거 없음.

### 렌즈 ② 축적 데이터의 2주차 소비 (관찰 → 자동 액션)
- **퍼널 데이터가 admin 차트에만 소비됨** — `FunnelSection.tsx`는 이탈 지점을 **콘솔에서 보여주기만** 한다. 이탈 회원 개인에게 **자동 넛지**(진단 시작 후 미완료자·온보딩 중단자에게 재개 알림)로 연결되는 경로가 없다. 데이터가 행동으로 환류되지 않음.
- **`search_misses`가 콘솔 표(Top 20)에서 멈춤** — 검색 실패는 곧 **콘텐츠 갭 신호**인데, 이를 아카이브 시드 후보·검수 큐로 자동 투입하는 워크플로가 없다(v6 L3 미착수). 운영진이 표를 보고 수동 판단해야 함.
- **`adoption_history`가 admin 전용** — 주간 채택 시계열이 쌓이기 시작했으나 **회원 본인이 자기 성장 추세를 보는 화면**은 Wrapped(스냅샷)뿐. 시계열의 리텐션 레버 미활용.

### 렌즈 ③ 모바일 / PWA 경험
- **PWA는 설치·SW·푸시 인프라까지 됐으나 모바일 네이티브감 부족** — `InstallPromptBanner`·`ServiceWorkerRegister`·`push.ts` 존재. 그러나 **모바일 하단 탐색(bottom tab)·오프라인 아카이브 읽기 캐시·푸시 구독 활성화 유도**가 약하다. 310 라우트의 깊은 IA를 모바일 한 손 조작으로 평평하게 하는 장치 부재.
- **푸시 구독 전환 미측정** — `PushPermissionPrompt`는 있으나 허용률·재요청 타이밍이 데이터로 관리되지 않음.

### 렌즈 ④ 성능·비용 (Firestore 읽기/저장)
- **대시보드 진입 = 8개 독립 읽기 워터폴** — `dashboard/page.tsx` 하위 위젯 8종 개별 fetch(v6 M3 잔존). 회원 방문마다 다중 읽기.
- **적재 전용 컬렉션에 보존 정책(TTL) 없음** — `daily_visits`·`search_misses`·`user_activity_logs`(+`funnelType` 이벤트)는 **무한 증가**. cron 중 정리 작업은 `notifications-cleanup`·`push-token-cleanup` **2종뿐**, 방문·활동·검색 로그 정리 cron 부재 → 시간이 갈수록 컬렉션 스캔·집계 읽기 비용 증가(퍼널 집계는 `limit(500)` 클라이언트 필터라 오래되면 최근 데이터를 놓칠 위험도).
- **번들 사이즈 미측정** — `recharts`·`pdfjs-dist`·`xlsx`·`framer-motion`·`@react-pdf` 등 무거운 의존성의 라우트별 코드분할 여지 미확인(analyzer 미설치).

### 렌즈 ⑤ 콘텐츠 성장 파이프라인
- **콘텐츠 갭 신호가 분산** — `search_misses`(못 찾은 것)·세미나 자산(H5)·졸업논문 프로필·아카이브 시드 후보가 **한 곳에 모이지 않아** 운영진이 "다음에 뭘 만들지"를 데이터로 결정 못 함. `content-draft-generator`·`newsletter-publisher` cron은 발행 자동화만 담당.
- **저방문 콘텐츠 재노출 소재 부족** — 저널·갤러리·card-news 산출물이 발행 후 재순환 경로가 약함(매직 리사이즈는 제작 단계 지원, 재노출 큐레이션은 별개).

### 렌즈 ⑥ 미답 영역 (자유 발굴)
- **학습 활동 사회적 강화(kudos) 부재** — 반응은 인터뷰 보드 한정(`InterviewResponseReactions`). 코호트·멘토 관계 안에서 "이번 주 목표 달성·논문 완독"에 **가벼운 응원**을 보내는 양성 전용 장치 없음(벤치 M3 미착수). 고립된 대학원 연구의 정서적 지지 레버 미사용.
- **검수 품질 운영이 스냅샷** — 검수 큐 영속화(v5)는 됐으나 처리량·평균 대기·보류 사유 **추세**가 없어(M4) 병목 조기 발견 불가.
- **cron 관측성 얕음** — `/console/cron-logs` 페이지는 있으나, 26종 cron의 **실패 시 능동 알림·공통 로깅 헬퍼**(`cron_logs`/`logCronRun` grep 0건)가 없어 조용한 실패(다이제스트·리마인더 누락)를 사후에야 발견.
- **a11y 자동 게이트 부재** — 색상 게이트(prebuild)는 있으나 접근성 회귀 방지 자동 검사 없음(L1).

---

## 3. 고도화 백로그 (v7 · 15항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+)]**

### High (즉시 착수 · 외부의존 없음 · ROI 높음)

**H1. 운영 인사이트 액션화 — 퍼널 이탈·검색실패·비활성 코호트를 "제안된 액션"으로 (데이터 소비)**
- 문제: `src/features/insights/FunnelSection.tsx`·`SearchMissSection.tsx`는 이탈·검색실패를 **콘솔 차트로 보여주기만** 한다. 데이터→행동 환류 경로 0.
- 제안: 콘솔 인사이트에 **"제안된 운영 액션" 카드 큐** — (1) 진단 시작 후 미완료·온보딩 중단 회원 목록에 "재개 리마인드 발송"(기존 `notification-orchestrator`·`sendPushToUsers` 재사용) 버튼, (2) `search_misses` Top 항목에 "아카이브 시드 후보로 승격"(v5 review-queue 재사용) 버튼, (3) 비활성 코호트에 코칭 넛지. 신규 컬렉션 없이 상주 데이터 조합.
- 기대효과: 측정→개선 루프 완성, 8월 신입 온보딩을 데이터로 즉시 개선, 운영진 의사결정 마찰↓.
- 난이도: **M**

**H2. adoption-snapshot 지표 완성 + 검수 품질 추세 (증명 · M4 흡수)**
- 문제: `src/app/api/cron/adoption-snapshot/route.ts`가 `diagnosticsCompleted30d`만 담고 **멘토링·검수 처리량·주간목표·암기카드 복습을 미집계**. 검수 품질 추세(v6 M4)도 별도 부재.
- 제안: (1) `adoption_history` 문서에 `mentoring`(질문/답변/채택)·`reviewQueue`(처리/대기/평균대기/보류사유)·`weeklyGoals`(설정/달성)·`flashcards`(복습 세션) 블록 추가, (2) `AdoptionSection`에 4주 추세 스파크라인 + 검수 품질 카드. 오늘까지 배포한 신규 루프의 사용을 단일 KPI로 증명.
- 기대효과: "새 루프가 실제 쓰이는가"를 숫자로 증명, 개강 전후 비교, 검수 병목 조기 발견.
- 난이도: **M**

**H3. 적재 컬렉션 보존 정책 cron — Firestore 비용 방어 (성능·비용)**
- 문제: `daily_visits`·`search_misses`·`user_activity_logs`(+`funnelType`)가 **무한 증가**. 정리 cron은 `notifications-cleanup`·`push-token-cleanup` 2종뿐. 시간 경과에 따라 스캔·집계 읽기 비용 증가, `limit(500)` 집계가 오래된 데이터에 밀릴 위험.
- 제안: `api/cron/analytics-retention` 신설 — 원시 이벤트(`user_activity_logs`·`daily_visits`)는 N일(예: 90일) 초과분 배치 삭제, 삭제 전 **주간 집계 요약**(이미 `adoption_history`/`loyalty-snapshot` 패턴)으로 롤업 보존. `search_misses`는 count 누적이라 유지하되 오래된 lastAt 저빈도 항목 정리.
- 기대효과: 읽기/저장 비용 상한, 집계 정확도 유지, 데이터가 쌓일수록 커지는 비용 곡선 억제.
- 난이도: **S**

**H4. 대시보드 위젯 배치 fetch 통합 (성능 · v6 M3 승계)**
- 문제: `src/app/dashboard/page.tsx` 하위 **8개 위젯 각각 개별 fetch** → 진입 시 워터폴·중복 읽기.
- 제안: 대시보드 상위 로더에서 공통 컬렉션 병렬 배치 후 Context/prop 분배, `queryClient.prefetchQuery`로 위젯 재사용. 저변동 소스는 긴 `staleTime`. (H3 보존정책과 파일 영역 분리.)
- 기대효과: 대시보드 초기 로드·Firestore 읽기 절감(고빈도 화면이라 비용 임팩트 큼).
- 난이도: **M**

**H5. 학습 활동 kudos — 코호트 한정 응원 (사회적 강화 · 벤치 M3 승계)**
- 문제: 반응이 인터뷰 보드 한정(`InterviewResponseReactions.tsx`). 잔디·주간목표 달성·완독 등 학습 활동에 대한 가벼운 사회적 강화 없음.
- 제안: **코호트/멘토 관계 안에서** "이번 주 목표 달성·논문 완독"에 응원(kudos) 1클릭(양성 전용·순위/비교 아님). 알림은 opt-in·요약형(벤치 H6 quiet hours 재사용). 수십 명 규모라 **팔로우 피드 아닌 코호트 한정**으로 소음 방지. `post-reaction` 타입·코호트(`cohortKeyOf`) 재사용.
- 기대효과: 관계성(자기결정성) 충족, 고립된 연구의 정서적 지지, 과잉 게이미피케이션 없이 리텐션.
- 난이도: **M**

**H6. 콘텐츠 갭 대시보드 + 시드 후보 자동 제안 (콘텐츠 성장 · v6 L3 승계·확장)**
- 문제: 콘텐츠 갭 신호(`search_misses`·세미나 자산·졸업논문 프로필·미연결 개념)가 분산돼 "다음에 뭘 만들지"를 데이터로 결정 못 함.
- 제안: 콘솔에 **"콘텐츠 갭" 통합 뷰** — 검색 실패 Top·미연결 개념 언급(벤치 H4 unlinked mention 데이터)·세미나 우수 Q&A를 **아카이브 시드 후보로 자동 집계**, 1클릭으로 검수 큐 투입(H1과 액션 공유). `content-draft-generator` cron과 연계해 초안 자동 생성 트리거.
- 기대효과: 아카이브 확장의 수작업 의존 해소, 콘텐츠 우선순위의 데이터 근거화.
- 난이도: **M**

### Medium (1~2 스프린트)

**M1. 해커톤 허브 운영 완성 — 산출물 제출·심사 루브릭·수상작 아카이브 (신학기 · 시의성)**
- 문제: `src/app/hackathon/page.tsx`(156줄)·`HackathonBoard.tsx`는 팀빌딩/아이디어 **보드 골격**. 산출물 제출 슬롯·심사 루브릭·수상작 아카이브 연계·D-day 흐름 얕음.
- 제안: 산출물 링크 제출 슬롯 + (선택) 심사 루브릭 점수판 + 수상작을 아카이브/포트폴리오로 이관. 기존 `comm-board`·포트폴리오 패턴 재사용. (루브릭·심사위원 확정은 §4 외부의존.)
- 기대효과: 8/22 이벤트를 온라인에서 완결, 산출물 자산화, 오프라인 앵커.
- 난이도: **M**

**M2. 신입 첫 2주 자동 활성화 시퀀스 (신학기 · 퍼널 데이터 소비)**
- 문제: `CohortSection`·`semester-start-reminder`는 있으나 신입 개인의 **첫 2주 단계별 촉진**(프로필→진단→첫 아카이브→첫 인사)이 자동화되지 않음. `onboarding-evaluator`는 판정만.
- 제안: 온보딩 퍼널 이벤트(`funnelType=onboarding`)를 트리거로, 미완료 단계에 D+2/D+5/D+9 맞춤 넛지(quiet hours 준수). H1 액션 큐와 로직 공유.
- 기대효과: 8월 신입 초기 활성·리텐션, 이탈 지점 자동 개입.
- 난이도: **M**

**M3. 다이제스트 열람·CTA 클릭 추적 (증명 · v6 M7 승계)**
- 문제: `weekly-digest/route.ts`에 열람/클릭 계측 없음(`digest_events` 부재).
- 제안: 이메일 링크에 리다이렉트 카운터(`/r/digest?...`) → 열람·클릭 집계, 문구·시점 A/B 근거. (발송 정책은 §4.)
- 기대효과: 알림 효과 증명, 벤치 H6 타이밍 최적화와 결합.
- 난이도: **S~M**

**M4. 색상 부채 상환 라운드 (기술 기반 · v6 M5 승계)**
- 문제: `eslint-rawcolor-baseline.mjs` = **454 파일**(446→454 회귀). 재고 상환 정체 → 다크모드 정합 부채.
- 제안: baseline을 라우트 단위 배치로 시맨틱 토큰 마이그레이션 후 제거, 454→380 라운드. 고빈도 화면(대시보드·아카이브·마이페이지·leaderboard) 우선.
- 기대효과: 다크모드 일관성, baseline 축소로 게이트 실효성↑.
- 난이도: **M**

**M5. 모바일 경험 개선 — 하단 탐색·오프라인 아카이브 읽기·푸시 유도 (모바일/PWA)**
- 문제: PWA 인프라는 있으나(`InstallPromptBanner`·`ServiceWorkerRegister`·`push.ts`) 모바일 한 손 조작·오프라인 읽기·푸시 구독 전환이 약함.
- 제안: 모바일 하단 탐색(핵심 5도구) + 아카이브 상세 SW 캐시(오프라인 읽기) + `PushPermissionPrompt` 재요청 타이밍 최적화·허용률 계측.
- 기대효과: 모바일 회원의 접근성·재방문, 깊은 IA를 한 손 조작으로 평평하게.
- 난이도: **M**

**M6. cron 관측성 — 공통 로깅 헬퍼 + 실패 알림 (운영 안정성)**
- 문제: `/console/cron-logs` 페이지는 있으나 공통 로깅 헬퍼·실패 능동 알림 부재(`cron_logs`/`logCronRun` grep 0). 26종 cron의 조용한 실패를 사후 발견.
- 제안: 공통 `logCronRun(name, status, meta)` 헬퍼로 `cron_logs` 표준 적재 + 실패 시 운영진 알림(기존 notifications 재사용). 다이제스트·리마인더 누락 조기 감지.
- 기대효과: 운영 신뢰성, 조용한 실패로 인한 회원 경험 저하 차단.
- 난이도: **S~M**

### Low (여유 시 · carryover)

**L1. a11y 자동 감사 게이트 (품질 · v6 L1 승계)**
- 문제: 색상 게이트는 있으나 접근성 자동 검사 없음(`axe` 미설치).
- 제안: 핵심 라우트 axe-core CI 스모크(경고 수준) 게이트. 난이도: **S**

**L2. 번들 사이즈 측정·코드분할 라운드 (기술 · v6 L2 승계)**
- 문제: `@next/bundle-analyzer` 미설치. `recharts`·`pdfjs-dist`·`xlsx`·`@react-pdf`·`framer-motion` 무거움.
- 제안: analyzer 1회 측정 → 무거운 의존성 라우트별 동적 import. 난이도: **M**

**L3. 단축키 상시 힌트 (발견성 · 벤치 L2 승계)**
- 문제: 팔레트 코치는 있으나 주요 버튼·메뉴에 단축키 툴팁 병기 없음.
- 제안: 핵심 액션 버튼에 단축키 툴팁 병기로 키보드 조작 학습 유도. 난이도: **S**

---

## 4. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| 해커톤 심사 루브릭·심사위원·수상 정책(M1) | 운영진 이벤트 기획·심사 기준 확정 |
| 다이제스트/넛지/kudos 푸시 발송(H1·M2·M3·H5) | 푸시 발송 정책·빈도·발송 주체 합의 |
| kudos·코호트 노출 범위(H5) | 회원 동의·프라이버시 정책 |
| 신입 코호트 원천 정확도(M2) | 입학 학기(`enrollmentYear/Half`) 입력 완성도·갱신 담당 |
| 콘텐츠 갭 → 발행(H6) | 시드 후보의 실제 집필·검수는 운영진/기자 |
| Firestore 정기 export/백업(v5-L1 carryover) | GCP 스케줄러/GCS 버킷·권한 |
| 세미나 라이브 다시보기(v5-M6 carryover) | 장표 원본 보관·저작권 동의 |
| 데이터 보존 기간(H3) | 개인정보 보존 정책상 삭제 주기 확정 |

---

## 5. 즉시 착수 Top 5 (병렬 편성안 — 파일 영역 비중복)

1. **H2 adoption 지표 완성 + 검수 추세(M)** — 오늘까지 배포한 신규 루프의 사용 증명. 이후 모든 판정의 KPI 토대. `api/cron/adoption-snapshot`·`features/insights/AdoptionSection`.
2. **H1 운영 인사이트 액션화(M)** — 측정→개선 루프 완성, 8월 온보딩 즉시 개선. `features/insights`(FunnelSection·SearchMissSection)·`notification-orchestrator`.
3. **H4 대시보드 배치 fetch(M)** — 고빈도 화면 성능·비용. `app/dashboard`·`features/dashboard/*Widget`.
4. **H5 학습 kudos(M)** — 관계성 리텐션 레버, 독립 신규 표면. `features/board`(post-reaction)·`cohortKeyOf`.
5. **H3 보존 정책 cron(S)** — 데이터 증가에 따른 비용 상한. 독립 신규 cron. `api/cron/analytics-retention`.

> **병렬 편성(파일 영역 비중복 → 4트랙 동시)**:
> - 트랙 A(측정/콘솔): **H2 · H1 · H6** — `api/cron`·`features/insights`
> - 트랙 B(대시보드/성능): **H4 · H3** — `app/dashboard`·`features/dashboard`·`api/cron/analytics-retention`
> - 트랙 C(관계/보드): **H5 · M6** — `features/board`·`lib`(cron 로깅)
> - 트랙 D(신학기 신규): **M1 해커톤 · M2 신입 시퀀스** — `app/hackathon`·`features/onboarding`
> M4(색상 상환)·M5(모바일)은 광역 파일 접촉 → 위 트랙과 시차를 두고 단독 진행.

---

## 참고 파일 (절대경로 · 실측)
- `C:\work\yonsei-edtech\src\app\api\cron\adoption-snapshot\route.ts` (`diagnosticsCompleted30d`만 — 검수·멘토링·목표·암기카드 미집계)
- `C:\work\yonsei-edtech\src\features\insights\FunnelSection.tsx` / `SearchMissSection.tsx` (관찰 차트만 — 액션 환류 없음)
- `C:\work\yonsei-edtech\src\app\dashboard\page.tsx` + `src\features\dashboard\*Widget.tsx` (위젯 8종 개별 fetch — v6 M3 잔존)
- `C:\work\yonsei-edtech\src\lib\visit-tracker.ts` / `src\lib\search-miss-tracker.ts` (적재 전용 — 보존 정책 cron 부재)
- `C:\work\yonsei-edtech\src\app\api\cron\` (26 cron — 정리 2종·adoption 지표 부분·다이제스트 추적 없음)
- `C:\work\yonsei-edtech\src\app\api\cron\weekly-digest\route.ts` (열람/클릭 추적 없음 — v6 M7 잔존)
- `C:\work\yonsei-edtech\src\features\board\InterviewResponseReactions.tsx` (반응 인터뷰 한정 — 학습 kudos 부재)
- `C:\work\yonsei-edtech\src\app\hackathon\page.tsx`(156줄) / `src\features\hackathon\HackathonBoard.tsx` (보드 골격 — 산출물 제출·심사 얕음)
- `C:\work\yonsei-edtech\eslint-rawcolor-baseline.mjs` (454 파일 — 446→454 회귀)
- `C:\work\yonsei-edtech\src\components\pwa\InstallPromptBanner.tsx` / `ServiceWorkerRegister.tsx` / `src\lib\push.ts` (PWA 인프라 — 모바일 네이티브감·오프라인 읽기 여지)
- `C:\work\yonsei-edtech\src\app\console\cron-logs\page.tsx` (관측 표면 — 공통 로깅·실패 알림 부재)
- `package.json` (`axe`·`@next/bundle-analyzer` 미설치 — L1·L2)

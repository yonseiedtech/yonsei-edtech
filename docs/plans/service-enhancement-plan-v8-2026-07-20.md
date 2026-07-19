# 연세교육공학회 차기 라운드 고도화 백로그 v8 — "소비 완결과 정리 — 깔아둔 인프라를 끝까지 쓰고, 8월 실전을 준비한다" (2026-07-20)

> 작성: 수석 서비스 플래너 (자율 분석 · 대화형 인터뷰 없음 · 코드·문서 실측만) · 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app, **34번째 배포 — v7 백로그 전량 소진**)
> 회원: 교육공학 전공 대학원생·졸업생 수십 명 규모 학술 커뮤니티 · **다음 큰 이벤트: 에듀테크 해커톤 2026-08-22 (D-33)**, 8~9월 신입 유입·온보딩 시즌
> 실측 근거: `git log`(v7 9배포), v7 계획서 + 2026-07-20 구현 보고서 9종, `src/` 라우트(**312 page.tsx**)·cron(**28종**)·컬렉션·`eslint-rawcolor-baseline.mjs`(**411 파일**) 직접 grep/ls, 그리고 핵심 소비 경로 5종 직접 추적(cron_runs 알림·content-draft 연결·kudos 표면·academic-admin 링크·newcomer quiet-hours).

---

## 0. 재제안 금지선 (실측 — 오늘까지 LIVE)

### 0-1. v6 라운드 전량 (재제안 금지)
v6 H1~H6·M1·M2·M6·L1~L3, 벤치마크 H1~H6·M1~M5는 v7 계획서 §0-1 표에 커밋 해시와 함께 확정 — **전부 재제안 금지**. (adoption-snapshot·Wrapped·주간목표 루프·멘토링 활성화·해커톤 허브 골격·코호트/버디·퍼널 텔레메트리·검색미스·커맨드 팔레트·streak freeze·리더보드 코호트·브랜드 킷·quiet hours·읽기 추천·매직 리사이즈·연구 템플릿·세미나 RSVP·조직 연동·타임라인 템플릿·인쇄 명함 등.)

### 0-2. v7 라운드 전량 (오늘 배포 9종 — **재제안 절대 금지**)

| v7 항목 | 산출물(실측) | 상태 |
|---|---|---|
| **H1** 인사이트 액션화 | `src/features/insights/SuggestedActionsSection.tsx` — 3소스(퍼널·검색미스·비활성코호트)→규칙 판정→딥링크 액션 큐 | LIVE |
| **H2** adoption 지표 완성 | `adoption-snapshot`에 멘토링·검수·주간목표·암기카드 블록 + 추세 스파크라인 | LIVE |
| **H3** 보존 정책 cron | `api/cron/analytics-retention` — `user_activity_logs`(180일)·`daily_visits`(180일)·`search_misses`(365일) 배치 삭제 + dry-run | LIVE |
| **H4** 대시보드 배치 fetch | `diagnosticResultsApi` 4중 호출 → `useUserDiagnostics` 공통 훅 통합(read 4→1) | LIVE |
| **H5** 학습 kudos | `src/types/kudos.ts` + `kudos` 컬렉션 + `CohortSection`(온보딩) 응원 1클릭 | LIVE(온보딩 표면만) |
| **H6** 콘텐츠 갭 대시보드 | `src/app/console/archive/content-gaps/page.tsx` — 검색실패·세미나 Q&A·졸업논문 미등록 변인 3블록 + 1클릭 검수 큐 투입 | LIVE |
| **M1** 해커톤 운영 완성 | `hackathon_submissions`·`hackathon_judgings` 2컬렉션 + 산출물 제출·심사 루브릭·수상작 | LIVE |
| **M2** 신입 활성화 시퀀스 | `api/cron/newcomer-activation-sequence` — D+1/3/7/10/14 단계 넛지(퍼널 데이터 스킵 판정) | LIVE |
| **M3** 다이제스트 추적 | `/r/digest`·`/r/digest-open` 리다이렉트/픽셀 + `DigestStatsSection` + `digest_link_clicks`·`digest_opens` | LIVE |
| **M4** 검수 품질 추세 | `adoption-metrics.ts` `reviewQueueDetail`(draft·held) + 추세 카드 | LIVE |
| **M5** 모바일 경험 | BottomNav 더보기 활성표시 결함 수정 + 아카이브 상세 오프라인 캐시 + 설치 유도 | LIVE |
| **M6** cron 관측성 | `src/lib/cron-observability.ts` `withCronLog` + 28 cron 래핑 + `cron_runs` 적재 + `cron-runs` 조회 API + 콘솔 연속실패 배너 | LIVE |
| 색상 라운드3 | 대시보드 트리 시맨틱 토큰 마이그레이션 → baseline 454→**411** | LIVE |

**위 13종은 재제안 금지.** v8은 이들의 **"소비 완결(consumption)"과 "정리(cleanup)"** 를 다룬다 — 신규 표면 남발이 아니라 **이미 만든 것을 끝까지 쓰이게** 하는 라운드.

### 0-3. 상주 인프라 (재제안 금지 — 활용만)
- 측정: `visit-tracker`·`funnel-telemetry`·`search-miss-tracker`·`adoption-snapshot`·`loyalty-snapshot`
- 관측: `cron-observability`(`withCronLog`/`cron_runs`)·`cron-runs` 조회 API·콘솔 배너
- 관계/증명: `kudos`·`weekly_goal_records`·`cohortKeyOf`·`digest_opens`/`digest_link_clicks`
- 정리: `analytics-retention`·`notifications-cleanup`·`push-token-cleanup`
- 신학기: `newcomer-activation-sequence`·`semester-start-reminder`·`hackathon_submissions`/`hackathon_judgings`

---

## 1. v8 핵심 명제

> **지난 세 라운드(v6 확장·증명, v7 측정→개선 루프·신학기 골격)가 인프라를 다 깔았다. 그러나 실측 결과 "깔았지만 끝까지 쓰이지 않는" 소비 미완 지점이 다섯 군데 확인됐다.** v8은 (1) 이 인프라들을 **관측 표면에서 능동 동작으로** 완결하고, (2) **8/22 해커톤·8월 신입 첫 접점**을 실전 품질로 끌어올리며, (3) 네 라운드가 쌓아 올린 **표면 중복·부채·회귀 위험을 정리**한다. **항목의 40%(6/15)를 정리·회귀 방지에 배정** — 신규 표면은 최소화한다.

### 1-1. 실측된 "소비 미완" 5종 (v8의 출발점)

| # | 인프라(만든 것) | 실측된 소비 미완 | 근거 |
|---|---|---|---|
| ① | cron 관측성(M6) | `cron_runs` 적재·조회·**콘솔 배너까지만**. 실패 시 **능동 알림 없음** — 운영진이 콘솔을 열어야만 발견(수동). | `cron-observability.ts`·`cron-runs/route.ts`에 `notif`/`alert`/`sendPush`/`orchestrat` grep **0건** |
| ② | 콘텐츠 갭(H6) ↔ 초안 생성 | `content-draft-generator`는 **종료 세미나만** 읽어 카드뉴스·학회보 초안 생성. `search_misses`·콘텐츠 갭 신호와 **연결 안 됨**. H6 페이지는 **수동 1클릭**만. | `content-draft-generator/route.ts`에 `content-gaps`/`search_miss` grep **0건** |
| ③ | 학습 kudos(H5) | `kudos` 컬렉션·타입 완비. 그러나 표면은 **온보딩 `CohortSection` 한 곳**뿐 — 고빈도 화면(대시보드·마이페이지)에 **받은 응원·보내기 표면 부재**. v7-H5 보고서가 "대시보드 표면 후속" 명시. | `grep kudos`: `CohortSection`·`notify`·타입만. 대시보드/마이페이지 위젯 **0건** |
| ④ | `cron_runs` 컬렉션 | 28 cron이 매 실행마다 적재 → **무한 증가**. `analytics-retention`(H3) 보존 대상에 **미포함**. | `analytics-retention/route.ts`에 `cron_runs` grep **0건** |
| ⑤ | newcomer 시퀀스(M2) quiet-hours | v7-M2 계획은 "quiet hours 준수" 명시했으나 구현 cron에 **quiet-hours 가드 없음**(고정 09:00 발송이라 시간대는 무난하나 회원별 조용시간 설정 미반영). | `newcomer-activation-sequence/route.ts`에 `quiet` grep **0건** |

### 1-2. 실측된 "표면 중복·부채" (정리 대상)

| 구분 | 실측 | 판정 |
|---|---|---|
| **`academic-admin/*` ↔ `console/*` 이중 운영** | `academic-admin/` **12+ 페이지**(seminars·studies·projects·external·certificates…), 모두 **6/15 이전 미변경**. 그러나 **`/academic-admin` 링크 18곳 + BottomNav 잔존** → 여전히 도달 가능. `console/*`(신규 운영 콘솔)과 **병렬 관리 표면 중복** | **IA 혼선·유지비 — 정리 대상** |
| **색상 부채 baseline 411** | v7 라운드3로 454→411(대시보드 트리). 여전히 411 파일에 raw 팔레트 잔존 → 다크모드 정합 부채 | **상환 정체 — 라운드4** |
| **장기 미방문 라우트 180건** | 312 라우트 중 **132건만** 6/15 이후 수정 → **180 라우트가 6/15 이전 정지**(activities·board·about·academic-admin 대량). 그간의 스키마·API 변경에 대한 **런타임 회귀 미검증** | **QA 스모크 감사 대상** |
| `network`/`networking`·`board`/`comm-board` | 실측 결과 **기능이 다름**(network=협업 그래프·추천 / networking=모임 이벤트, board=인터뷰·자유게시 / comm-board=Q&A 월). 데드코드 아님 | **명명 정합·문서화만** |
| `axe`·`@next/bundle-analyzer` 미설치 | v6·v7 L1·L2 carryover | **품질 게이트 미완** |

---

## 2. 고도화 백로그 (v8 · 15항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+)]**
> **정리·회귀 방지 항목 = H4·M2·M4·M6·L2·L4 (6/15 = 40%)** — 신규 표면 최소화 원칙 준수.

### High (즉시 착수 · 외부의존 없음 · ROI 높음)

**H1. cron 실패 능동 경보 — 관측을 알림으로 완결 (소비 미완 ① · 운영 안정성)**
- 문제: M6가 `cron_runs` 적재·조회·콘솔 연속실패 배너까지 만들었으나 **능동 알림이 없다**(`cron-observability.ts`·`cron-runs/route.ts` `notif`/`sendPush` grep 0). 다이제스트·리마인더 cron이 조용히 죽어도 **운영진이 콘솔을 열어야만** 발견 → 회원 경험 저하가 방치될 위험.
- 제안: `api/cron/cron-watchdog`(1일 1회, 신규 경량) — `cron_runs`를 kind별로 스캔해 **연속 2회+ 실패 또는 "예상 실행 창을 넘긴 침묵(stale)"** kind를 감지, 운영진에게 **1건 요약 알림**(기존 `notify`·`notification-orchestrator` 재사용, 중복 억제: 동일 kind·동일 실패군 하루 1회). 신규 컬렉션 없음.
- 기대효과: 관측→행동 소비 완결, 조용한 실패의 사후 발견 제거, 8월 성수기 cron 신뢰성.
- 난이도: **S**

**H2. kudos 대시보드·마이페이지 표면 완성 — 만든 관계 레버를 고빈도 화면으로 (소비 미완 ③ · 리텐션)**
- 문제: `kudos` 컬렉션·타입은 완비됐으나 표면이 **온보딩 `CohortSection` 한 곳**뿐. 온보딩은 신입이 초기에만 보는 화면이라 **응원 루프가 가동 안 됨**. 대시보드·마이페이지에 "이번 주 받은 응원"·"동기에게 응원 보내기" 표면 부재(v7-H5 보고서 명시 후속).
- 제안: (1) **대시보드**에 "받은 응원" 미니 위젯(이번 주 받은 kudos 수·발신자 아바타, 0건이면 빈 상태) + (2) **마이페이지/리더보드 코호트 뷰**에서 활동 있는 동기에게 응원 1클릭(기존 `CohortSection` 로직 재사용). 순위·비교 없이 양성 전용·주 1회 자연 제한 유지.
- 기대효과: 관계성(자기결정성) 레버가 실제 가동, 고립된 대학원 연구의 정서적 지지, 과잉 게이미피케이션 없는 재방문.
- 난이도: **M**

**H3. 콘텐츠 갭 → 초안·다이제스트 연결 — 신호를 산출로 (소비 미완 ② · 콘텐츠 성장)**
- 문제: H6 콘텐츠 갭 뷰(`content-gaps/page.tsx`)는 신호 집계 + **수동 1클릭 검수 큐 투입**까지만. `content-draft-generator`는 **종료 세미나만** 소비(`content-gaps`/`search_miss` grep 0) → 검색 실패·세미나 우수 Q&A가 **초안으로 자동 연결 안 됨**. 운영진이 매번 콘솔을 열어 판단해야 함.
- 제안: (1) `content-draft-generator`에 **세미나 우수 Q&A 블록**(H6와 동일 소스: `comm_boards` seminar contextType의 채택·좋아요 질문)을 초안 소스로 추가 — 결정적·AI 미사용 유지, 멱등 docId. (2) 주 1회 **"이번 주 콘텐츠 갭 요약"** 을 운영진 알림/다이제스트로 발송(검색 실패 Top·미등록 변인 수) → 콘솔을 안 열어도 갭이 도착. 신규 컬렉션 없음.
- 기대효과: 콘텐츠 갭 신호가 **산출(초안·알림)로 환류**, 아카이브 확장의 수작업 의존 완화.
- 난이도: **M**

**H4. academic-admin ↔ console 이중 운영 정리 — IA 통합 감사 (정리 · 유지비)**
- 문제: `academic-admin/*` **12+ 페이지**가 6/15 이전 정지 상태이나 **`/academic-admin` 링크 18곳 + BottomNav 잔존**으로 여전히 도달 가능. 신규 `console/*`와 **병렬 운영 표면 중복** → 운영진 IA 혼선, 두 곳을 함께 유지하는 부채, 스키마 변경 시 한쪽만 갱신되는 회귀 위험.
- 제안: (1) `academic-admin/*` 각 라우트의 **console 대응 여부 감사표** 작성(대응 있음→리다이렉트/링크 제거, 대응 없음→console로 이관 또는 유지 확정). (2) BottomNav·헤더의 `/academic-admin` 진입점을 **단일 운영 콘솔로 수렴**. **삭제 전 도달성·권한 실측**(운영진만 쓰는지) 후 단계적 정리 — 파괴적 제거는 감사 결과 확정 후.
- 기대효과: 운영 IA 단일화, 유지비·회귀 위험 절감, 신규 운영진 학습곡선 완화.
- 난이도: **M**

**H5. 8월 신입 첫 접점 품질 — 가입→온보딩 첫 흐름 + 첫 2주 진행 위젯 (신학기 실전 · 유입)**
- 문제: `newcomer-activation-sequence`(M2)는 **가입 이후 D+N 넛지**만 담당 — 신입이 **처음 보는 화면(가입 직후 랜딩·온보딩 진입)** 의 품질과 대시보드 상의 **개인 첫 2주 진행 가시화**가 비어 있다. 신입은 자기 진행 단계를 한눈에 못 봄. (M2 cron은 quiet-hours 미반영 — 소비 미완 ⑤.)
- 제안: (1) **대시보드 신입 진행 위젯** — 프로필→진단→첫 아카이브→첫 인사 4단계 체크리스트(퍼널 데이터 재사용, `NewMemberChecklist` 확장) + 다음 액션 딥링크. (2) 가입 직후 랜딩(`/steppingstone/onboarding`) 첫 접점 카피·CTA·빈 상태 QA. (3) M2 cron에 회원 quiet-hours 존중 가드 추가(소비 미완 ⑤ 보정).
- 기대효과: 8월 신입 초기 활성·리텐션, 첫 접점 이탈 감소, 개인 진행의 자기 주도적 완주.
- 난이도: **M**

**H6. 해커톤 공개 페이지 실전 완성 — D-day·제출 마감·수상작 갤러리 (신학기 실전 · 시의성 D-33)**
- 문제: M1이 제출(`hackathon_submissions`)·심사(`hackathon_judgings`)·수상 **운영 도구**를 만들었으나, **공개·참가자 대면 흐름**(D-day 카운트다운·제출 마감 상태 표시·수상작 공개 갤러리·신입 첫 접점으로서의 해커톤 안내)이 얕다. 8/22까지 D-33 — 참가 유도·당일 운영 표면을 완성할 시점.
- 제안: 해커톤 허브 공개 페이지에 (1) **D-day 카운트다운 + 단계별 상태**(참가 접수→제출 마감→심사→수상 발표) 타임라인, (2) `published` 수상작 **공개 갤러리**(M1 필드 재사용), (3) 대시보드/홈에서 해커톤 **참가 CTA 배너**(마감 전 노출). 기존 컬렉션·포트폴리오 패턴 재사용, 신규 컬렉션 없음.
- 기대효과: 8/22 이벤트 온라인 완결, 참가율·산출물 자산화, 신입에게 "지금 참여할 것" 명확한 앵커.
- 난이도: **M**

### Medium (1~2 스프린트)

**M1. 논문 도구 통합 허브 — 흩어진 연구 도구를 한 진입점으로 (회원 대면 가치 · 표면 재조직)**
- 문제: 논문·연구 지원 표면이 **분산**돼 발견성 낮음 — `archive/citation-guide`·`archive/literature-review-guide`·`archive/paper-guide`·읽기 타이머(`paper_reading_logs`)·`board/paper-review`·`mypage/research/papers`가 서로 연결 없이 흩어짐. 회원이 "논문 쓸 때 뭘 쓰지"를 한눈에 못 봄.
- 제안: **신규 표면 최소** — 기존 도구를 묶는 **논문 도구 허브**(마이페이지/연구 하위 진입점) 1개로 citation·literature·paper 가이드·읽기 타이머·내 논문을 카드로 재조직 + 크로스링크. 신규 기능이 아니라 **기존 산출물의 발견성 정리**.
- 기대효과: 연구 여정 지원 도구의 발견성·회원 대면 가치, 흩어진 표면 정합.
- 난이도: **M**

**M2. 장기 미방문 라우트 런타임 회귀 감사 (정리 · 회귀 방지)**
- 문제: 312 라우트 중 **180건이 6/15 이전 정지**(activities·board·about·academic-admin 대량). 그간 스키마·API·컬렉션 변경이 다수 있었으나 이 라우트들의 **런타임 정상 여부 미검증**(빌드 통과 ≠ 런타임 정상 — null·undefined·optional chaining·fetch 실패 위험).
- 제안: 미방문 라우트 스모크 감사표 — 대표 30~40 라우트 실제 접속·콘솔 에러·빈 데이터 렌더 확인, 발견 결함 핫픽스. codex/qa-tester 병행. (academic-admin은 H4와 함께 처리.)
- 기대효과: 조용한 런타임 회귀 제거, 8월 유입 전 사이트 신뢰성 확보.
- 난이도: **M**

**M3. 멘토링 실사용 루프 점검·강화 (회원 대면 가치 미답)**
- 문제: `/mentoring`·`mentor-stats`는 있으나(v6-H4) **실제 매칭·대화 발생 여부가 데이터로 관리되지 않고**, 신입↔멘토 연결을 촉진하는 능동 넛지가 약함. 멘토링이 "표면은 있으나 가동은 미지".
- 제안: (1) 멘토링 활동 지표를 adoption 스냅샷 재사용으로 추세화(미매칭 신입 수·응답률), (2) 미매칭 신입에게 코호트/관심사 기반 멘토 추천 넛지(H1 액션 큐·`collaborator-match` 재사용). 신규 컬렉션 최소.
- 기대효과: 멘토링 골격의 실사용 전환, 신입 초기 관계 형성.
- 난이도: **M**

**M4. 색상 부채 라운드4 — baseline 411→~340 (정리 · 기술 기반)**
- 문제: `eslint-rawcolor-baseline.mjs` **411 파일** 잔존. 라운드3(대시보드)에 이어 고빈도 화면 상환 정체 → 다크모드 정합 부채.
- 제안: 라우트 단위 배치로 시맨틱 토큰 마이그레이션 후 baseline 재생성(411→~340). **아카이브·마이페이지·리더보드·board** 우선(고빈도·신입 노출). 순수 클래스 치환·로직 불변.
- 기대효과: 다크모드 일관성, baseline 축소로 게이트 실효성↑.
- 난이도: **M**

**M5. digest 성과 → 발송 타이밍 환류 (소비 완결 · 증명)**
- 문제: M3가 `digest_opens`·`digest_link_clicks`를 적재·표시(`DigestStatsSection`)까지 했으나 **관찰에서 멈춤** — 열람률·클릭 데이터가 발송 시점·문구 결정으로 환류되지 않음(quiet hours 타이밍과 미결합).
- 제안: digest 성과 데이터를 요일·시간대별 열람률로 집계해 **발송 타이밍 추천**(quiet-hours 로직과 결합) + 저성과 문구 플래그. 신규 컬렉션 없음, 기존 데이터 소비만.
- 기대효과: 알림 효과 실증→개선 루프 완결, 다이제스트 도달·클릭 향상.
- 난이도: **S~M**

**M6. cron_runs 보존 정책 편입 — 관측 컬렉션의 무한 증가 방어 (정리 · 비용)**
- 문제: 28 cron이 매 실행마다 `cron_runs` 적재 → **무한 증가**하나 `analytics-retention`(H3) 보존 대상에 **미포함**(`analytics-retention/route.ts` `cron_runs` grep 0). 관측 인프라 스스로가 비용 부채가 됨.
- 제안: `analytics-retention`에 `cron_runs`(예: 90일 초과 삭제, 삭제 상한 유지) 추가. dry-run·삭제 금지 목록 패턴 그대로. H1 watchdog의 stale 판정 창(최근 데이터)은 보존.
- 기대효과: 관측 컬렉션 비용 상한, 조회 API 성능 유지.
- 난이도: **S**

### Low (여유 시 · carryover)

**L1. a11y 자동 감사 게이트 (품질 · v6·v7 L1 carryover)**
- 문제: 색상 게이트는 있으나 접근성 자동 검사 없음(`axe` 미설치).
- 제안: 핵심 라우트 axe-core CI 스모크(경고 수준). 난이도 **S**.

**L2. 번들 사이즈 측정·코드분할 (기술 · v6·v7 L2 carryover · 정리)**
- 문제: `@next/bundle-analyzer` 미설치. `recharts`·`pdfjs-dist`·`xlsx`·`@react-pdf`·`framer-motion` 무거움.
- 제안: analyzer 1회 측정 → 무거운 의존성 라우트별 동적 import. 난이도 **M**.

**L3. 단축키 상시 힌트 (발견성 · 벤치 L2 carryover)**
- 문제: 팔레트 코치는 있으나 주요 버튼에 단축키 툴팁 병기 없음.
- 제안: 핵심 액션 버튼 단축키 툴팁 병기. 난이도 **S**.

**L4. 유사 명명 표면 정합 문서화 (정리 · 혼선 방지)**
- 문제: `network`/`networking`·`board`/`comm-board`는 기능이 다르나(협업그래프/모임, 인터뷰·자유게시/Q&A월) 명명 유사로 운영진·개발 혼선 소지.
- 제안: 각 표면의 역할·진입점을 nav 라벨·README로 명확화(코드 이동 없음·저위험). 난이도 **S**.

---

## 3. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| 해커톤 심사위원·수상 정책·D-day 문구(H6) | 운영진 이벤트 기획·심사 기준·수상작 공개 동의 |
| 신입 넛지·kudos·콘텐츠갭 알림 발송(H1·H2·H3·H5·M3) | 푸시/알림 발송 정책·빈도·발송 주체 합의 |
| academic-admin 라우트 제거·이관 확정(H4) | 운영진의 "어느 표면을 정본으로" 결정 + 실제 사용 여부 확인 |
| 콘텐츠 갭 초안의 실제 집필·검수·발행(H3) | 운영진/기자의 집필·검수 |
| 신입 코호트 원천 정확도(H5·M3) | 입학 학기(`enrollmentYear/Half`) 입력 완성도·갱신 담당 |
| 데이터 보존 기간(M6·H3) | 개인정보 보존 정책상 `cron_runs`·로그 삭제 주기 확정 |
| Firestore 정기 export/백업 (carryover) | GCP 스케줄러/GCS 버킷·권한 |
| 세미나 라이브 다시보기 (carryover) | 장표 원본 보관·저작권 동의 |

---

## 4. 즉시 착수 Top 5 (병렬 편성안 — 파일 영역 비중복)

1. **H1 cron 실패 능동 경보(S)** — 관측→알림 소비 완결, 8월 성수기 신뢰성 토대. 독립 신규 cron. `api/cron/cron-watchdog`·`lib/cron-observability`·`notify`.
2. **H2 kudos 대시보드 표면(M)** — 만든 관계 레버 가동. 독립 위젯. `features/dashboard`·`mypage`·`kudos`.
3. **H6 해커톤 공개 완성(M)** — D-33 시의성 최상. 독립 표면. `app/hackathon`·`features/hackathon`.
4. **H4 academic-admin 정리 감사(M)** — IA 중복 상환. 독립 감사·라우트. `app/academic-admin`·`components/layout`.
5. **M6 cron_runs 보존 편입(S)** — 관측 컬렉션 비용 방어. 단일 파일. `api/cron/analytics-retention`.

> **병렬 편성(파일 영역 비중복 → 4트랙 동시)**:
> - 트랙 A(관측/cron): **H1 · M6 · H3(초안 cron)** — `api/cron`·`lib/cron-observability`
> - 트랙 B(대시보드/관계): **H2 · H5(신입 진행 위젯)** — `features/dashboard`·`mypage`·`onboarding`
> - 트랙 C(신학기 표면): **H6 해커톤 · M1 논문 도구 허브** — `app/hackathon`·`archive`·`mypage/research`
> - 트랙 D(정리/감사): **H4 academic-admin · M2 미방문 라우트 감사** — `app/academic-admin`·QA 스모크
> M4(색상 라운드4)·L2(번들)는 광역 파일 접촉 → 위 트랙과 시차를 두고 단독 진행. M3(멘토링)·M5(digest 환류)는 트랙 A/B와 소스 공유하므로 순차.

---

## 5. 참고 파일 (절대경로 · 실측)
- `C:\work\yonsei-edtech\src\lib\cron-observability.ts` / `src\app\api\console\cron-runs\route.ts` (적재·조회까지 — **능동 알림 grep 0** → H1)
- `C:\work\yonsei-edtech\src\app\api\cron\content-draft-generator\route.ts` (**종료 세미나만** 소비 — content-gaps/search_miss 미연결 → H3)
- `C:\work\yonsei-edtech\src\types\kudos.ts` / `src\features\onboarding\CohortSection.tsx` (kudos 표면 **온보딩 1곳만** → H2)
- `C:\work\yonsei-edtech\src\app\academic-admin\` (12+ 페이지·**링크 18곳+BottomNav 잔존**, 6/15 이전 정지 — console 중복 → H4)
- `C:\work\yonsei-edtech\src\app\api\cron\newcomer-activation-sequence\route.ts` (**quiet-hours 가드 grep 0** → H5)
- `C:\work\yonsei-edtech\src\app\api\cron\analytics-retention\route.ts` (**cron_runs 미포함** → M6)
- `C:\work\yonsei-edtech\src\app\hackathon\page.tsx` / `src\features\hackathon\*` (제출·심사 운영은 됨·**공개 D-day/갤러리 얕음** → H6)
- `C:\work\yonsei-edtech\src\app\archive\citation-guide\ · literature-review-guide\ · paper-guide\` + `src\app\mypage\research\papers\` (분산 → M1 허브)
- `C:\work\yonsei-edtech\eslint-rawcolor-baseline.mjs` (**411 파일** → M4)
- `C:\work\yonsei-edtech\src\features\insights\DigestStatsSection.tsx` (관찰까지만 — 타이밍 환류 부재 → M5)
- `package.json` (`axe`·`@next/bundle-analyzer` 미설치 → L1·L2)

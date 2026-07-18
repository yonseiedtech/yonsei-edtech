# 연세교육공학회 차기 라운드 고도화 백로그 v6 — "확장과 증명" (2026-07-18)

> 작성: 수석 서비스 플래너 (자율 분석) · 대상: yonsei-edtech (Next.js 16.1.6 + Firestore, LIVE https://yonsei-edtech.vercel.app)
> 회원: 교육공학전공 대학원생·졸업생 · 다음 큰 이벤트: **해커톤 2026-08-22**, 8월 신입 온보딩 시즌
> 실측 근거: `git log --since=2026-07-17` **14커밋**(스프린트1~3 + v5 라운드1~5 + 보안 핫픽스 2건 + 색상 lint 게이트) 및 변경·인접 파일 실독.

---

## 0. 재제안 금지선 (실측 — 오늘까지 반영분)

`git log --since=2026-07-17` 14커밋 확인:

| 커밋 | 반영 |
|---|---|
| `9b7182b5` 스프린트1 | 아카이브 랜딩 재편·크로스링크·`/archive/my`·리스트 정합화 |
| `592f1f0a` 스프린트2 | 설계→논문 import·진단 루프 위젯·암기카드 전 타입 |
| `bedcf078` 스프린트2후반 | digest 학습 제안·세미나 후기→지도노트 환류 |
| `914c54c5` 스프린트3 | 온보딩 통합·개인화 QuickLinks·졸업생 멘토 채널·통합 검수 큐 |
| `51a23179` M4·M5 | 잔디 비활성 코칭·공동연구 진입 상시화 |
| `3a730049` M6·L3·L4 | 콘솔 경로 통합 리다이렉트·발견성 소품 |
| `ac1cc086` v4-G6 | **raw 팔레트 신규 유입 차단 ESLint 게이트**(baseline 446 파일 제외) |
| `989bf347` v5 R1 | 크로스링크 양방향 동기화·검수 큐 영속화·PWA 활성화 |
| `38e23523` v5 R2 | 아카이브 리스트 ISR 프리패치+커서·졸업논문 프로필 되먹임 |
| `d15801c9` v5 R3 | 학기 캘린더 위젯·감사로그 커버리지 표준화 |
| `b27ddf4b` v5 R4 | **주간 목표 루프**·**멘토링 Q&A 보드** |
| `9c49498a` v5 M7 | 공개 포트폴리오 PDF 화이트리스트·게스트 운영진 사칭 차단(보안) |
| `ffa2ee80` v5 R5 | 검색 인덱스 사전계산·신규 컴포넌트 a11y |
| `064f32af` v5 M4 | 목록 화면 React Query 캐시 이관 |

**v5의 자율 실행분(H1~H5, M1~M8 대부분)은 소진.** 남은 외부의존(M6 라이브 다시보기·L1 백업)은 §3에만 유지, 재제안 금지.

또한 **이미 존재하는 측정 인프라는 재제안하지 않는다**(실측):
- `src/lib/visit-tracker.ts` → `daily_visits`(방문·순방문·시간대·경로 그룹) + `user_activity_logs`(회원별 페이지 이력)
- `src/features/research/editor-telemetry.ts` → `ui:editor/*` 가상경로 텔레메트리
- `src/app/api/console/adoption/route.ts` + `src/features/insights/AdoptionSection.tsx` → **staff용 기능 채택률 스냅샷**(active7d/30d·research·community·notif readRate·streak_events)
- `src/features/insights/MemberReportView.tsx`(admin이 개별 회원 리포트 조회) · `src/app/api/cron/loyalty-snapshot`(로열티 시계열)

v6은 이 인프라가 **아직 담지 못한 지평**을 다룬다.

---

## 1. 관점별 문제 진단 (탐색 렌즈 6종)

### 렌즈 ① 측정·증명 (있는 인프라의 사각)
- **채택률 스냅샷이 v5 신규 루프를 미포함** — `adoption/route.ts`는 papers·reports·models·matrix·reading·sessions·posts·comments·notif·streak_events만 집계. **진단 완료·암기카드 복습·주간목표 설정/달성·멘토링 Q&A·검수 큐 처리량**은 신설 루프인데 KPI에 없다 → "새로 만든 루프가 쓰이는가"를 증명 못 함.
- **스냅샷이 point-in-time, 추세 미적재** — `adoption`은 60초 캐시 즉석 집계일 뿐, `loyalty-snapshot`처럼 **주간 시계열로 적재하는 cron이 없다**(`api/cron/` 24종에 adoption 없음). 개강 전후·기능 출시 전후 증감을 못 본다.
- **회원 본인용 가치 리포트 부재** — `MemberReportView`는 admin 인사이트(운영진이 남을 봄). 회원이 **자기 발자취/기여를 보는 "나의 학회 리포트(Wrapped)"** 가 없다 → 리텐션·자긍심 레버 미사용.

### 렌즈 ② 신규 루프 심화 2주차 (골격→운영)
- **주간목표: 개인 카드만, 집계·연속·회고 없음** — `weekly-goal.ts`·`WeeklyGoalCard.tsx`는 개인 판정만. 목표 **연속 달성(goal streak)·주차별 달성률 추세·회고 축적**이 없어 습관 형성 서사가 끊긴다. `weekly-digest`도 개인 리포트뿐, 코호트 대비·순위 없음.
- **멘토링: 보드는 있으나 활성화 장치 0** — `src/app/mentoring/page.tsx`는 질문 작성/필터/채택뿐. **질문 시 멘토 알림·미답변 질문 노출·분야별 멘토 매칭·상담 후기/평판·멘토 이력 태그**가 없어 졸업생이 볼 이유가 약하다. `MENTORING_TOPICS` 분야 태그만 존재.
- **검수 품질 추세 부재** — v5에서 검수 큐 영속화(reviewStatus)는 됐으나, **처리량·평균 대기시간·보류 사유의 시계열 추세** 대시보드가 없어 품질 운영이 스냅샷에 머문다.

### 렌즈 ③ 콘텐츠 성장 파이프라인
- **세미나 자산이 후기에 갇힘** — `src/app/seminars/[id]/page.tsx`는 연사/운영진/참석자 **후기 3종만**. 세미나 장표·우수 Q&A·라이브 설문이 아카이브 개념/방법으로 **자산화되는 경로가 전무**(grep "세미나→아카이브" 0건). 세미나마다 지식이 휘발.
- **아카이브 시드가 수동 단발** — `archive-seed.ts`는 콘솔 "기본 시드 불러오기" 버튼. `archive-seed-sync` cron은 있으나, **신규 시드 후보 발굴→검수 큐 투입 워크플로**가 없어 확장이 운영진 수작업에 의존.
- **해커톤(2026-08-22) 지원 도구 전무** — grep "해커톤/hackathon" **0건**. 팀 빌딩·아이디어 보드·일정·산출물 제출·심사 도구가 없다. 한 달 앞으로 다가온 이벤트의 서비스 연계 공백.

### 렌즈 ④ 학기 전환 대비 (8월 신입 시즌)
- **코호트(기수) 개념 부재** — `SemesterKickoffBanner`·`NewMember*` 위젯·`semester-start-reminder` cron은 있으나, **신입을 "코호트"로 묶는 데이터·화면이 없다**(grep "코호트/cohort" 0건). 동기 그룹·버디 매칭·코호트 진행률·오리엔테이션 시퀀스 미연계.
- **온보딩 퍼널 전환 미측정** — `onboarding-checklist-seed`·`onboarding-evaluator` 존재하나, **각 단계 완료율·이탈 지점**을 집계하는 경로가 없어 8월 신입 온보딩을 데이터로 개선할 수 없다.

### 렌즈 ⑤ 기술 기반 다음 단계
- **대시보드 위젯 배치 fetch 미통합(v5-L3 잔존)** — `src/app/dashboard/page.tsx`는 직접 fetch 0이나, `MyGrowthWidget`·`RecentPostsWidget`·`MyAcademicActivitiesWidget` 등 **각 위젯이 개별 useQuery**. 대시보드 진입 시 다수 독립 읽기 = Firestore 비용·워터폴.
- **색상 부채 baseline 446 파일** — `eslint-rawcolor-baseline.mjs` = 446개 예외 파일(게이트로 신규 유입은 차단됨). 상환(마이그레이션)이 정체 → 다크모드 정합·유지보수 부채.
- **번들 사이즈 미측정** — analyzer 미설치. `recharts`·`pdfjs-dist`·`xlsx`·`framer-motion` 등 무거운 의존성의 라우트별 코드분할·동적 import 최적화 여지 미확인.

### 렌즈 ⑥ 미답 영역 (자유 발굴)
- **검색 실패 분석 부재** — 사전계산 검색 인덱스(v5 R5)는 있으나, **회원이 무엇을 검색했는데 못 찾았는지**(zero-result query)를 기록하지 않아 콘텐츠 갭을 못 본다.
- **다이제스트 열람/클릭 추적 없음** — `weekly-digest` 발송하나 열람률·CTA 클릭이 무측정 → 알림 효과 증명 불가.
- **a11y 자동 게이트 부재** — 색상 게이트(prebuild)는 있으나 접근성(axe 등) 자동 검사 게이트가 없어 신규 컴포넌트 회귀 위험.

---

## 2. 고도화 백로그 (16항목)

> 형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S(<1주)/M(1~2주)/L(3주+)]**

### High (즉시 착수 · ROI 높음 · 외부의존 없음)

**H1. 채택률 스냅샷을 v5 신규 루프로 확장 + 주간 시계열 적재 (증명)**
- 문제: `src/app/api/console/adoption/route.ts`가 진단·암기카드·주간목표·멘토링·검수 처리량을 미집계. `api/cron/`에 adoption 시계열 적재 cron 없음(추세 판정 불가).
- 제안: (1) adoption 응답에 `diagnostics`(완료 수)·`flashcards`(복습 세션)·`weeklyGoals`(설정/달성)·`mentoring`(질문/답변/채택)·`reviewQueue`(처리/대기) 블록 추가, (2) `api/cron/adoption-snapshot` 신설 — 주 1회 `adoption_history/{weekKey}` 문서로 적재, (3) `AdoptionSection`에 4주 추세 스파크라인.
- 기대효과: "오늘 만든 14배포가 실제로 쓰이는가"를 숫자로 증명, 개강/출시 전후 비교, KPI 단일 소스 완성.
- 난이도: **M**

**H2. 회원 가치 리포트 "나의 학회 발자취"(Wrapped) (증명·리텐션)**
- 문제: `MemberReportView`는 admin 전용. 회원이 자기 기여·성장을 보는 화면이 없다.
- 제안: `/mypage/report`(회원 본인) — 이미 상주하는 `useGradActivityData`(잔디)·`user_activity_logs`·진단/읽기/집필 기록을 재사용해 "이번 학기 읽은 논문 N편·잔디 N일·목표 달성 N주·아카이브 기여 N건·멘토링 N건" 요약 카드 + 공유 이미지(OG). 신규 fetch 최소.
- 기대효과: 자긍심·리텐션 레버, SNS 공유 유입, 기존 admin 리포트 로직 재사용으로 저비용.
- 난이도: **M**

**H3. 주간목표 연속·추세·회고 루프 심화 (루프 2주차)**
- 문제: `weekly-goal.ts`·`WeeklyGoalCard.tsx`는 개인 단발 판정만. goal streak·주차 추세·회고 축적 없음.
- 제안: `weekly_goal_records/{userId}/{weekKey}` 경량 기록(목표·달성·회고 한 줄) → 카드에 "연속 달성 N주"·최근 6주 미니 바 + `weekly-digest`에 회고 프롬프트. (달성 판정은 기존 잔디 소스 유지.)
- 기대효과: 습관 서사 연결, 코칭→행동→회고 완결, 다이제스트 열람 동기.
- 난이도: **M**

**H4. 멘토링 활성화 장치 — 멘토 알림·미답변 노출·매칭 (루프 2주차)**
- 문제: `src/app/mentoring/page.tsx`는 질문/채택뿐, 졸업생이 볼 유인·미답변 처리·매칭 없음.
- 제안: (1) 질문 등록 시 해당 분야(`MENTORING_TOPICS`) 멘토 토글 켠 졸업생에게 알림(기존 `notifications`·`notification-orchestrator` 재사용), (2) "미답변 질문" 상단 고정 + 답변 요청 넛지, (3) 멘토 프로필에 답변 수·채택률·분야 태그(평판). 신규 컬렉션 없이 `comm_boards` 확장.
- 기대효과: 졸업생 재참여, 질문 회수율↑, 재학생 신뢰.
- 난이도: **M**

**H5. 세미나 → 아카이브 자산화 파이프라인 (콘텐츠 성장)**
- 문제: `src/app/seminars/[id]/page.tsx`는 후기 3종만. 장표·우수 Q&A·설문이 아카이브로 안 남음(자산화 경로 0).
- 제안: 세미나 상세에 "지식 자산" 섹션 + 콘솔에서 우수 Q&A/핵심 개념을 **아카이브 개념/방법 검수 큐로 승격**(1클릭 → v5 review-queue 재사용). 라이브 장표는 세미나-아카이브 크로스링크.
- 기대효과: 세미나 지식 휘발 방지, 아카이브 시드 자연 확장, 불참자 열람.
- 난이도: **M**

**H6. 해커톤 2026-08-22 지원 도구 (콘텐츠 성장·시의성)**
- 문제: 해커톤 관련 코드 0건. 한 달 앞 이벤트의 서비스 공백.
- 제안: `/hackathon` 경량 허브 — 팀빌딩 보드(모집·합류)·아이디어 제출·일정 D-day·산출물 링크 제출·(선택) 심사 루브릭. 기존 `comm_boards`·`networking` 패턴 재사용으로 스캐폴딩 최소.
- 기대효과: 이벤트 참여·발견성, 산출물 아카이브화 연계, 오프라인 이벤트의 온라인 앵커.
- 난이도: **M** (콘텐츠·일정은 운영진 입력 — §3)

### Medium (1~2 스프린트)

**M1. 8월 신입 코호트 장치 (학기 전환)**
- 문제: 코호트 개념 0건. 신입을 기수로 묶는 데이터·화면·버디 없음.
- 제안: `cohort`(가입 기수/학기) 파생 필드 + `/onboarding` 코호트 진행률·동기 명단·버디 추천(같은 코호트·분야). `semester-start-reminder` cron에 신입 시퀀스 연동.
- 기대효과: 신입 소속감·초기 활성, 8월 시즌 리텐션.
- 난이도: **M**

**M2. 온보딩·진단 퍼널 전환 측정 (증명·미답)**
- 문제: `onboarding-evaluator`·`onboarding-checklist-seed` 있으나 단계 완료율·이탈 지점 미집계.
- 제안: 온보딩/진단 단계 진입·완료 이벤트를 `user_activity_logs` 가상경로(`ui:onboarding/*`)로 적재(editor-telemetry 패턴 재사용) → 콘솔에 퍼널 차트.
- 기대효과: 8월 신입 온보딩을 데이터로 개선, 이탈 지점 규명.
- 난이도: **S~M**

**M3. 대시보드 위젯 배치 fetch 통합 (성능·v5-L3 잔존)**
- 문제: `dashboard/page.tsx` 하위 `MyGrowthWidget`·`RecentPostsWidget`·`MyAcademicActivitiesWidget` 등 다수가 개별 `useQuery` → 진입 시 워터폴·중복 읽기.
- 제안: 대시보드 상위 로더에서 공통 컬렉션 병렬 배치 후 Context/prop 분배, React Query `queryClient.prefetch`로 위젯 재사용. 자주 안 바뀌는 소스는 긴 staleTime.
- 기대효과: 대시보드 초기 로드·Firestore 읽기 절감.
- 난이도: **M**

**M4. 검수 품질 추세 대시보드 (루프 2주차·운영)**
- 문제: v5 검수 큐 영속화는 됐으나 처리량·대기시간·보류사유 시계열이 없음.
- 제안: 검수 처리 이벤트를 주간 집계(H1 adoption-snapshot에 병합 또는 별도) → 콘솔에 "주간 처리량·평균 대기·보류 사유 분포" 추세.
- 기대효과: 품질 운영 가시화, 검수 병목 조기 발견.
- 난이도: **S~M**

**M5. 색상 부채 상환 라운드 (기술 기반)**
- 문제: `eslint-rawcolor-baseline.mjs` = **446 파일** 예외. 게이트로 신규 유입은 막혔으나 재고 정체 → 다크모드 정합 부채.
- 제안: baseline을 배치(라우트 단위)로 시맨틱 토큰 마이그레이션 후 baseline에서 제거, 목표 446→350 라운드. 고빈도 화면(대시보드·아카이브·마이페이지) 우선.
- 기대효과: 다크모드 일관성, baseline 축소로 게이트 실효성↑.
- 난이도: **M**

**M6. 검색 실패(zero-result) 분석 (미답·발견성)**
- 문제: 검색 인덱스(v5 R5)는 있으나 무결과 질의 미기록 → 콘텐츠 갭 미가시.
- 제안: 전역검색 zero-result 질의를 `search_misses`에 경량 적재(익명·throttle) → 콘솔에 "많이 찾았지만 없는 것" Top N.
- 기대효과: 아카이브 시드 우선순위 근거, 콘텐츠 갭 규명.
- 난이도: **S**

**M7. 다이제스트 열람·CTA 클릭 추적 (증명)**
- 문제: `weekly-digest` 발송하나 열람/클릭 무측정.
- 제안: 이메일 내 링크에 UTM/리다이렉트 카운터(`/r/digest?...`) → 열람·클릭 집계. (푸시/발송 정책은 §3.)
- 기대효과: 알림 효과 증명, 문구·시점 A/B 근거.
- 난이도: **S~M**

### Low (여유 시 · carryover)

**L1. a11y 자동 감사 게이트 (품질)**
- 문제: 색상 게이트는 있으나 접근성 자동 검사 없음.
- 제안: 핵심 라우트 axe-core CI 스모크(경고 수준) 게이트. 난이도: **S**

**L2. 번들 사이즈 측정·코드분할 라운드 (기술)**
- 문제: analyzer 미설치, `recharts`·`pdfjs-dist`·`xlsx`·`framer-motion` 무거움.
- 제안: `@next/bundle-analyzer` 1회 측정 → 무거운 의존성 라우트별 동적 import. 난이도: **M**

**L3. 아카이브 시드 후보 발굴 워크플로 (콘텐츠 성장)**
- 문제: `archive-seed.ts` 수동 단발, 확장이 수작업 의존.
- 제안: 검색 실패(M6)·세미나 자산(H5)·졸업논문 프로필을 시드 후보로 검수 큐에 자동 제안. 난이도: **M**

---

## 3. 외부 의존 항목 (운영진 결정·인프라·콘텐츠 필요 — 코드만으로 불가)

| 항목 | 의존 |
|---|---|
| 해커톤 콘텐츠·일정·심사 기준(H6) | 운영진 이벤트 기획·심사위원·루브릭 확정 |
| 다이제스트/멘토 푸시 발송(H4·M7) | 푸시 발송 정책·발송 주체 합의 |
| 멘토링 후기 공개 범위(H4) | 졸업생 동의·공개 정책 |
| 신입 코호트 원천(M1) | 기수/입학 학기 데이터 소스·갱신 담당 |
| Firestore 정기 export/백업(v5-L1 carryover) | GCP 스케줄러/GCS 버킷·권한 |
| 세미나 라이브 다시보기(v5-M6 carryover) | 장표 원본 보관 정책·저작권 동의 |
| 학기 캘린더 원천(v5-M3 후속) | 대학원 공식 학사일정 데이터 소스 |

---

## 4. 즉시 착수 Top 5 (권장 순서 · 병렬 편성)

1. **H1 채택률 스냅샷 확장 + 시계열(M)** — 오늘까지 14배포한 신규 루프의 사용 증명. "증명"의 토대이자 이후 모든 항목의 판정 기준. `api/console/adoption` + 신규 cron.
2. **H2 회원 가치 리포트 Wrapped(M)** — 축적 데이터의 리텐션 전환. `MemberReportView` 로직 재사용, 독립 영역. `mypage` 트랙.
3. **H4 멘토링 활성화 장치(M)** — v5 멘토 보드의 명시적 공백(유인·미답변) 해소. `mentoring`+`comm_boards` 트랙.
4. **H5 세미나→아카이브 자산화(M)** — 콘텐츠 성장의 핵심. `seminars`+`console/archive/review-queue` 트랙.
5. **H6 해커톤 허브(M)** — 8/22 시의성. 독립 신규 라우트로 병렬 가능(단 콘텐츠는 운영진 대기 — 스캐폴딩 선행).

> **병렬 편성(파일 영역 비중복 → 4트랙 동시)**:
> - 트랙 A(측정/콘솔): H1 · M4 · M2 — `api/console/adoption`·`api/cron`·`features/insights`
> - 트랙 B(마이페이지/루프): H2 · H3 — `mypage`·`features/dashboard`
> - 트랙 C(멘토링/세미나/아카이브): H4 · H5 — `mentoring`·`seminars`·`console/archive`
> - 트랙 D(신규 라우트): H6 해커톤 — `/hackathon`(독립)
> M3(대시보드 배치)·M5(색상 상환)는 광역 파일 접촉 → 위 트랙과 시차를 두고 단독 진행.

---

## 참고 파일 (절대경로 · 실측)
- `C:\work\yonsei-edtech\src\app\api\console\adoption\route.ts` (채택률 스냅샷 — v5 루프 미포함·시계열 미적재)
- `C:\work\yonsei-edtech\src\features\insights\AdoptionSection.tsx` / `MemberReportView.tsx` (admin 전용 — 회원용 리포트 부재)
- `C:\work\yonsei-edtech\src\features\research\editor-telemetry.ts` (ui:* 가상경로 텔레메트리 패턴 — 퍼널 측정 재사용 근거)
- `C:\work\yonsei-edtech\src\lib\weekly-goal.ts` / `src\features\dashboard\WeeklyGoalCard.tsx` (개인 판정만·추세/연속 없음)
- `C:\work\yonsei-edtech\src\app\mentoring\page.tsx` (Q&A 보드만·활성화 장치 없음)
- `C:\work\yonsei-edtech\src\app\seminars\[id]\page.tsx` (후기 3종만·아카이브 자산화 경로 없음)
- `C:\work\yonsei-edtech\src\lib\archive-seed.ts` (수동 시드 버튼) / `src\app\api\cron\archive-seed-sync`
- `C:\work\yonsei-edtech\src\app\dashboard\page.tsx` + `src\features\dashboard\*Widget.tsx` (위젯 개별 fetch — v5-L3 잔존)
- `C:\work\yonsei-edtech\eslint-rawcolor-baseline.mjs` (446 파일 예외) / `eslint.config.mjs` (색상 게이트)
- `C:\work\yonsei-edtech\src\lib\semester.ts` (학기 추정 — 코호트 개념 없음) / `src\lib\onboarding-evaluator.ts`
- `C:\work\yonsei-edtech\src\app\api\cron\` (24 cron — adoption 시계열·다이제스트 추적 없음)

# 연세교육공학회 UX 관점 서비스 갭 분석 + 고도화 백로그 (2026-07-17)

> 대상 `C:\work\yonsei-edtech` (Next.js 16 + Firestore/bkend, LIVE https://yonsei-edtech.vercel.app) · **읽기·기획 전용**(코드 수정·배포 없음)
>
> 관점: **UX(페르소나별 여정·발견성·연결·환류)**. 코드 정밀 파이프라인 갭은 `service-enhancement-plan-v4-2026-07-13.md`가 다루므로, 본 문서는 **사람이 서비스를 통과하는 흐름에서 끊기는 지점**에 집중한다.
>
> 실측 방법: `src/app` 라우트 303개 전수(Glob), `Header.tsx` IA, 주요 허브(dashboard·mypage·steppingstone·diagnosis 연결부) Read + `grep`. LIVE 기능·이미 반영된 개선은 "완료"로 전제하고 재제안하지 않는다.
>
> 전제(중복 제안 금지): 세미나 라이브 콘솔·일정투표 3중버그·ESLint 게이트, v4-0713 이후 **이미 반영 확인**된 항목 — ① `ResearchJourneyGuide.tsx`가 theory-map·terminology·program-development·method-finder·statistical-methods 등 아카이브 자산 딥링크(라인 164~181), ② `NextActionBanner` `DiscoveryKind`에 `design` 추가(라인 135), ③ `DiagnosticWeakConceptPath`가 약점 개념→`/archive/concept/{id}` 링크(라인 165~272). 아카이브 상세 UX는 별도 트랙 분석 중이므로 "타 기능 연결 갭"만 다룬다.

---

## 0. 기능 지도 (실측 — src/app 라우트 303개 기준)

### 0-1. 회원용(비콘솔) 도메인 지도

| 도메인 | 주요 라우트 | 성격 |
|---|---|---|
| **학회소개** | `/about`(greeting·fields·history·leadership) | 공개 홍보(비로그인 노출) |
| **대학원 생활(인지디딤판)** | `/steppingstone`(onboarding·current-student·conference·thesis-defense·program-development), `/courses`, `/mypage/calendar` | 학기 로드맵 허브 |
| **학술활동** | `/activities`(projects·studies·external+weeks·workbook·roundup·review), `/seminars`(+ live·lms·checkin·present·review·speaker-review·host), `/calendar` | 참여형 활동 |
| **연구활동** | `/mypage/research`(+papers), `/diagnosis`, `/collab`(+chapters·contributions·meetings·milestones·publish), `/research`, `/research-model`, `/alumni/thesis`, `/archive`(개념·변인·측정도구·연구방법·통계·용어·이론지도·글쓰기·APA·인용·method/research-finder) | 논문 준비 핵심 |
| **학습 도구** | `/flashcards`, `/leaderboard`, `/progress-meetings`, `/mypage/notes` | 학습 루프·잔디 |
| **커뮤니티** | `/notices`, `/board/*`(free·interview·paper-review·promotion·resources·update·seminar), `/boards/[boardId]`(present·wall), `/studio`, `/ai-forum`, `/feedback`, `/contact`, `/help` | 소통·콘텐츠 |
| **네트워킹** | `/gatherings`(+poll·p/[token]), `/members`, `/directory`, `/network`, `/profile` | 관계·모임 |
| **더보기** | `/newsletter`(+magazine), `/card-news`, `/gallery`, `/journal`(issues·articles) | 저방문 콘텐츠 |
| **개인 홈** | `/dashboard`(위젯 14종·드래그편집·프리셋), `/mypage`(overview·card·activities·research·settings), `/mypage/portfolio`, `/whats-new`, `/labs` | 개인화 진입점 |

### 0-2. 운영진용 콘솔 지도

`/console` 하위 대형: `academic`(seminars 9뷰·projects·studies·external·certificates), `members`, `insights`(analytics·semester·user-activity), `settings`(15종), `grad-life`(thesis-defense·positions), `handover`, `transition`, `roadmap`, `journal`, `newsletter`, `card-news`, `todos`, `inquiries`, `popups`, `agents`/`agent-workflows`, `audit-log`, `directory`, `labs`, `steppingstone`, `academic-calendar`, `portfolio-verification`, 일회성(`inject-spring-2026-schedule`·`migrate-applicants`). + `/admin/*`, `/academic-admin/*` 이중 경로 잔존.

### 0-3. 관측된 IA 특징 (`Header.tsx`)
- 1차 메뉴 6개(학회소개·대학원생활·학술활동·연구활동·커뮤니티·더보기) + 로그인 전/후 `visibility` 분기 + 유저 드롭다운(대시보드·마이페이지·새기능·실험실·콘솔).
- **핵심 도구가 드롭다운 2~3뎁스에 매몰**: `/diagnosis`·`/flashcards`·`/collab`은 "연구활동" 드롭다운 안, `/leaderboard`·`/progress-meetings`는 어느 1차 메뉴에도 없음(직접 URL/위젯으로만 도달).

---

## 1. 페르소나별 여정 갭 (4 페르소나)

### (a) 신입 재학생 — 1학기 · "여기서 뭘 해야 하죠?"

**여정**: 가입 → `/dashboard`(미니멀 프리셋 자동 적용, `dashboard/page.tsx:179`) → `NewMemberOnboardingCard`/`NewMemberChecklistWidget`/`NewMemberWelcomeBanner`(3종 병존) → `/steppingstone/onboarding`(체크리스트 + 교내 IT 서비스).

- **JG-a1. 온보딩 표면이 4곳으로 분산·중복.** 대시보드에 `NewMemberOnboardingCard`+`NewMemberWelcomeBanner`+`NewMemberChecklistWidget` 3종이 동시 조건부 노출되고(`dashboard/page.tsx:496·619·624`), 별도로 `/steppingstone/onboarding` 트랙이 존재. 신입은 "정본 온보딩"이 어디인지 알 수 없다. 각 표면의 완료 상태가 서로 연동되는지 불명.
- **JG-a2. 온보딩 콘텐츠가 데이터 의존 — 빈 상태 위험.** `/steppingstone/onboarding`은 `guideItemsApi` 미등록 시 "아직 등록된 가이드 항목이 없습니다"를 그대로 노출(`onboarding/page.tsx:406`). 신입의 첫 핵심 여정이 운영진 콘텐츠 발행에 걸려 있어, 미발행 시 첫인상이 빈 화면.
- **JG-a3. "연구 첫 걸음"으로의 안내 부재.** 신입에게 서비스 정체성("연구 성장 동반자")의 관문인 `/diagnosis`(연구 준비도 진단)를 **첫 방문 동선에서 능동 제안하지 않음**. 진단은 "연구활동" 드롭다운 2뎁스에 있고, 신입 온보딩 체크리스트가 진단으로 유도하는지 미보장. 신입 여정이 "학사 정착"에서 멈추고 "연구 준비"로 이어지지 않음.
- **JG-a4. 위젯 과밀 잔재.** 미니멀 프리셋(3위젯)은 가입 30일·저장 레이아웃 없는 신규만. 그 외 신규는 8위젯(다이어트 후)로 여전히 스크롤이 길다. 첫 세션에서 "무엇부터"의 시선 고정이 약함.

### (b) 논문학기 재학생 — "설계·집필·심사를 한 흐름으로"

**여정**: `/mypage/research` → `/diagnosis`(약점 진단) → 연구 여정(주제→문헌→보고서→설계→계획서→집필→심사) → `/collab`(공동연구) → `/steppingstone/thesis-defense`(심사 연습).

- **JG-b1. 설계→계획서·논문 이어쓰기가 "복사"에서 끊김(핵심).** v4-0713 G②와 동일 — `ResearchDesignEditor`의 산출물이 `copyDraft`(클립보드)만 지원, 계획서·논문 에디터로 실제 import 경로 0건. **UX 관점 재확인**: 사용자는 여정을 "이어지는 한 흐름"으로 기대하나 실제론 단계마다 복사·붙여넣기·재편집을 수동 반복. 여정 UI가 연속성을 약속하지만 데이터는 단절.
- **JG-b2. 진단→학습→재진단 루프의 "학습" 구간이 반쪽.** `DiagnosticWeakConceptPath`가 약점 개념→`/archive/concept/{id}`는 링크하나, **해당 약점으로 암기카드 자동 생성·이론 가계도 진입**의 원클릭이 없음(`/flashcards`·`/archive/theory-map` 딥링크 grep 0건 in DiagnosticWeakConceptPath). "무엇을 볼지"는 알려주나 "어떻게 반복 학습할지"의 도구 연결이 끊김.
- **JG-b3. 세미나·스터디 참여가 연구 산출로 환류 안 됨.** 세미나 후기(`/seminars/[id]/review`)·스터디 주차노트(`activities/.../weeks`)가 `/mypage/research`·지도노트·포트폴리오로 흐르지 않음. 학습 활동과 연구 기록이 별도 사일로.
- **JG-b4. 공동연구 진입 문턱.** `/collab/new`는 이미 연구를 시작한 사람용. "협업자를 찾는" 초입(잠재 협업자 탐색→제안)이 `topic-explorer`에만 부분 존재하고 여정 상 상시 진입점이 약함.

### (c) 졸업생 — "졸업 후에도 남을 이유"

**여정**: 로그인 → `/dashboard`에서 `AlumniHomeWidgets`(동문활동·논문추천·아카이브 8종) → 소비 중심.

- **JG-c1. 졸업생이 "소비자"로만 설계됨(최우선 리텐션 갭).** `AlumniHomeWidgets.tsx` 3섹션 모두 **읽기 전용**(활동 보기·논문 보기·아카이브 열람). 졸업생이 학회에 *기여*할 능동 채널이 0건 — 멘토링·논문 리뷰어·인터뷰·특강이 없다. `grep mentor` 결과 전용 매칭 기능 없음(부수 참조 5건뿐). 졸업생 학위논문은 **DB 소스로만** 쓰이고, 본인은 그 DB에 능동 참여할 이유가 없음.
- **JG-c2. 재학생↔졸업생 가치 교환 부재.** 논문학기 재학생의 최대 니즈(선배 조언·심사 경험담·리뷰)와 졸업생의 잠재 공급이 **연결되는 표면이 없음**. `/board/interview`(인터뷰 게시판)가 있으나 졸업생을 능동 초대·매칭하지 않음.
- **JG-c3. 졸업 시점 이탈 방어 없음.** 재학→졸업 전환 시 학사 위젯이 사라지고(`isAlumni` 분기) 남는 것은 소비형 3위젯. "졸업생 전용 정체성/역할"의 재부여가 없어 자연 이탈.

### (d) 운영진 — "수동 순회의 총합"

**여정**: `/console` → 도메인별 개별 관리 페이지 순회.

- **JG-d1. 아카이브 검수가 8개 컬렉션 개별 순회.** `/console/archive/*`가 concepts·variables·measurements·research-methods·statistical-methods·foundation-terms·writing-tips 등 컬렉션마다 별도 CRUD. 미검수(`published=false`) 통합 큐 부재 → 시드 확대(개념 86·문항 201종) 후 운영 부담 급증(v4 M2와 동일, UX상 재확인).
- **JG-d2. 콘텐츠 발행이 신입 여정의 병목.** JG-a2와 연동 — 온보딩 가이드 항목·학기 로드맵을 운영진이 수동 등록해야 신입 화면이 채워짐. 시즌성 콘텐츠(개강·학술대회)의 발행 리마인드·템플릿이 약함.
- **JG-d3. 콘솔 IA 비대·이중 경로.** `/console`·`/admin`·`/academic-admin` 3중 경로 잔존 + 일회성 라우트(`inject-spring-2026-schedule`·`migrate-applicants`). 신임 운영진 인수인계(`/console/handover`) 있으나 "무엇이 오늘 급한가"의 단일 우선순위 뷰는 `StaffPriorityPanel`(승인·문의)로 국한.

---

## 2. 서비스 갭 도출 — 6개 렌즈

### ① 발견성 — 핵심 도구가 IA 심층·위젯에 매몰
- 진단·암기카드·공동연구는 "연구활동" 드롭다운 2뎁스, 리더보드·진행미팅은 1차 메뉴 부재. **여정 진입점(대시보드 QuickLinks 6칸)이 고정 링크**(`QuickLinks.tsx:11`)라 개인 단계(신입 vs 논문학기)에 따라 바뀌지 않음.
- `whats-new`가 신기능 발견 유일 경로에 가까움 — 능동 넛지(`NextActionBanner`)는 4종(`diagnostic·flashcard·design·portfolio`)으로 확장됐으나 theory-map·terminology·program-development 미포함.

### ② 연결(사일로) — 학습·활동·연구가 각자 저장, 환류 없음
- 세미나/스터디(활동) → 연구 기록(mypage/research) 단절(JG-b3).
- 진단(약점) → 암기카드/이론지도(학습 반복) 원클릭 단절(JG-b2).
- 설계 → 계획서/논문(집필) 데이터 단절(JG-b1).
- 졸업생(공급) ↔ 재학생(수요) 채널 단절(JG-c2).

### ③ 여정상 빈 단계
- 신입: "학사 정착" → "연구 첫 걸음" 사이 브리지 없음(JG-a3).
- 논문학기: "협업자 탐색" 상시 진입점 약함(JG-b4).
- 졸업생: "기여 역할" 부여 단계 자체가 없음(JG-c1/c3).

### ④ 데이터 환류 부재 — 쌓이나 되돌아오지 않음
- `weekly-digest` cron이 신규 학습 자산(design·theory·terminology)으로 재유입시키지 않음(grep 4건 = 대부분 무관).
- 잔디·타이머·진단 결과가 개인 코칭("이번 주 비활성 영역")으로 능동 환류 안 됨.
- 세미나 후기·활동 반성이 포트폴리오/성장 지표로 자동 집계 약함.

### ⑤ 운영 수동 부담
- 아카이브 통합 검수 큐 부재(JG-d1), 콘텐츠 발행 병목(JG-d2), 콘솔 이중경로(JG-d3).

### ⑥ 온보딩 표면 파편화
- 신입 온보딩 4표면 병존·중복·연동 불명(JG-a1), 콘텐츠 빈 상태 위험(JG-a2).

---

## 3. 고도화 프로젝트 백로그

형식: **[문제(근거 파일·라우트) → 제안 → 기대효과 → 난이도 S<1주 / M 1~2주 / L 3주+]**. 이미 반영된 v4 항목(여정 딥링크·design 넛지·약점→개념 링크)은 제외.

### High (즉시 착수·ROI 높음·외부의존 없음)

**H1. 설계→계획서·논문 실제 이어쓰기(import)**
- 문제: `ResearchDesignEditor` 산출물이 `copyDraft` 클립보드 전용, `WritingPaperEditor`/`ResearchProposalEditor`로 import 0건(v4 G②, JG-b1). 여정 UI는 연속을 약속하나 데이터 단절.
- 제안: 계획서·논문 에디터에 "연구 설계에서 연구방법 가져오기" 버튼 → `buildResearchMethodDraft(design)` 결과를 해당 섹션에 실제 삽입(복사 아님). 최신 설계 감지·재삽입/병합 안내.
- 기대효과: 논문 준비 페르소나의 핵심 파이프라인 완결. 서비스 정체성 직결.
- 난이도: **M**

**H2. 진단→학습→재진단 단일 루프 "학습" 구간 완성**
- 문제: `DiagnosticWeakConceptPath`가 개념 링크(`:165~272`)까지만, 약점→암기카드 자동 생성·이론 가계도 진입 원클릭 없음(JG-b2).
- 제안: 약점 개념 카드에 "이 개념 암기카드 만들기"(`flashcardsApi` 시드)·"이론 가계도에서 보기"(`/archive/theory-map#concept`) 액션 추가. 재진단→`LearningEffectCard`까지 하나의 순환으로 시각화.
- 기대효과: "무엇을+어떻게 반복학습"의 도구 연결로 리텐션 루프 완성. 오늘 신규 이론지도·용어사전을 루프에 편입.
- 난이도: **M**

**H3. 졸업생 기여 채널 — 멘토링/리뷰어 1차 매칭**
- 문제: `AlumniHomeWidgets` 전부 읽기 전용, 멘토 전용 기능 0건(JG-c1/c2). 졸업생이 기여할 표면 없음.
- 제안: (코드 자율 범위) 졸업생 프로필에 "멘토 가능 분야·오픈 여부" 토글 + 재학생용 "선배에게 질문/조언 요청" 채널(기존 `/mypage/messages`·`comm_boards` 재사용). 매칭 정책·개인정보 범위는 §4 외부의존.
- 기대효과: 졸업생 리텐션 레버 + 논문학기 재학생 최대 니즈 충족. 재학↔졸업 가치 교환 개통.
- 난이도: **M** (기능 골격) — 운영 정책은 외부의존

**H4. 신입 온보딩 표면 통합 + 빈 상태 방어**
- 문제: 온보딩 4표면 병존(`dashboard/page.tsx:496·619·624` + `/steppingstone/onboarding`), 콘텐츠 미발행 시 빈 화면(`onboarding/page.tsx:406`)(JG-a1/a2).
- 제안: 대시보드 온보딩을 단일 카드로 수렴(중복 3종 정리), 완료 상태를 `guideProgress`와 공유. `/steppingstone/onboarding` 빈 상태에 **정적 기본 체크리스트 폴백**(가입·프로필·진단·세미나·아카이브) 내장 → 발행 전에도 완결.
- 기대효과: 신입 첫인상 안정·중복 제거. 콘텐츠 병목 해소.
- 난이도: **S~M**

**H5. 신입 "연구 첫 걸음" 브리지**
- 문제: "학사 정착"→"연구 준비" 여정 브리지 없음, 진단이 능동 제안 안 됨(JG-a3).
- 제안: 온보딩 체크리스트 마지막 단계로 "연구 준비도 진단 1회" 고정 + `StageRecommendationPanel`(이미 존재)이 신입 단계에서 진단·아카이브 입문을 첫 추천 행동으로 노출. NextActionBanner에 `theory`/`terminology` 미열람 넛지 추가.
- 기대효과: 신입의 서비스 정체성 조기 체험 → 조기 리텐션.
- 난이도: **S~M**

**H6. 개인화 QuickLinks / 단계별 진입점**
- 문제: 대시보드 `QuickLinks` 6칸 고정(`QuickLinks.tsx:11`), 페르소나·학기 단계 무관 동일(발견성 ①).
- 제안: `getUserPersona`·현재 학기 단계 기반으로 QuickLinks·NextAction을 단계별 세트로 교체(신입=진단·온보딩·아카이브 / 논문학기=설계·집필·심사연습 / 졸업생=멘토·아카이브·논문DB).
- 기대효과: 매일 보는 첫 화면이 개인 여정에 정렬 → 핵심 도구 발견성 상승.
- 난이도: **M**

### Medium (1~2개월)

**M1. 활동→연구 환류 (세미나·스터디 → 포트폴리오·지도노트)**
- 문제: 세미나 후기·주차노트가 연구 기록으로 안 흐름(JG-b3).
- 제안: 세미나 참석/후기·스터디 완료 시 "포트폴리오에 추가"·"지도노트로 메모" 액션. 성장 지표(`MyGrowthWidget`)에 활동 반영.
- 난이도: **M**

**M2. 아카이브 통합 검수 큐**
- 문제: 8컬렉션 개별 CRUD 순회(JG-d1, v4 M2).
- 제안: `/console/archive`에 `published=false` 통합 리스트·일괄 승인/반려. 기존 미검수 배지 카운트 재사용.
- 난이도: **M**

**M3. weekly-digest 개인화 재유입 블록**
- 문제: 다이제스트가 신규 자산으로 재유입 안 함(환류 ④).
- 제안: "이번 주 학습 제안"(미응시 진단·미열람 이론지도·미착수 설계·비활성 잔디 영역) 개인화 블록. H2·H5 발견성 로직 재사용.
- 난이도: **S~M**

**M4. 잔디 비활성 영역 자동 코칭**
- 문제: 잔디·타이머 데이터가 코칭으로 환류 안 됨(환류 ④).
- 제안: 최근 N일 비활성 영역(읽기·복습·집필) 감지 → 대시보드/알림으로 "가벼운 다음 한 걸음" 제안.
- 난이도: **M**

**M5. 공동연구 진입점 상시화**
- 문제: 협업자 탐색 상시 진입점 약함(JG-b4).
- 제안: 연구 여정·`/collab` 랜딩에 "비슷한 주제 연구자·잠재 협업자" 카드(기존 `topic-explorer-logic` 재사용) + 제안 보내기.
- 난이도: **M**

**M6. 콘솔 IA 정리 + 이중 경로 폐기**
- 문제: `/console`·`/admin`·`/academic-admin` 3중 경로·일회성 라우트 잔존(JG-d3).
- 제안: `/admin`·`/academic-admin` → `/console` 통합 리다이렉트, 일회성 마이그레이션 라우트 폐기, 운영 "오늘 할 일" 단일 대시 확장.
- 난이도: **M~L**

### Low (여유 시 / carryover)

**L1. 대형 폼 모바일·성능 리팩터** — `ResearchDesignEditor`(1,294줄)·`SemesterRoadmap`(611줄) 서브컴포넌트 분할 + 모바일 아코디언 기본 접힘 + 다이얼로그 lazy. (S~M)

**L2. 색상 부채 번들3 + ESLint 재생산 차단** — raw 팔레트 7,075곳, hotspot `ActivityDetail.tsx`(233)·`ResearchReportInterview.tsx`(122) 치환 + lint 규칙. (M)

**L3. 저방문 콘텐츠 재활성** — `/journal`·`/gallery`·`/card-news` "더보기" 강등 상태. 여정 문맥(세미나 후 카드뉴스·졸업 후 갤러리)에서 재노출. (S)

**L4. 리더보드·진행미팅 IA 편입** — 1차 메뉴 부재 라우트를 커뮤니티/대학원생활에 노출. (S)

---

## 4. 외부 의존 항목 (운영진 결정·콘텐츠·동의 필요 — 코드만으로 불가)

| 항목 | 막힌 이유 | 필요한 결정 |
|---|---|---|
| 졸업생 멘토링·리뷰어 매칭(H3 운영) | 졸업생 참여 의사·매칭 동의·개인정보 노출 범위 | 졸업생 모집·동의 절차, 매칭 정책 |
| 온보딩/학기 로드맵 콘텐츠 발행(H4/JG-d2) | `guideItems` 항목 미등록 시 빈 화면 | 정본 콘텐츠 작성·발행(운영진) |
| journal 편집위 운영 | 편집 규정 미확정(콘솔 조회만) | 편집위원회 운영 규정 |
| 아카이브 인용 벌크 검증(RISS/KCI) | 외부 API/저작권 | 데이터 접근 방식 승인 |
| 진단 적응형 동적 문항 | LLM 출제 정확성 검증 책임 | 출제 품질 게이트 정책(codex 교차검증) |

---

## 5. 로드맵 (2~3 스프린트 묶음)

**스프린트 A — "연구 파이프라인·루프 완결" (논문학기 가치 직결)**
- H1(설계→집필 import) → L1(같은 파일 리팩터 연쇄) → H2(진단→학습 루프).
- 이유: 서비스 정체성("연구 성장 동반자")의 핵심 단절 3건을 한 묶음으로. H1·L1은 동일 파일군이라 연쇄 효율.

**스프린트 B — "발견성·온보딩·개인화" (신입/전체 리텐션)**
- H4(온보딩 통합·빈상태) → H5(연구 첫걸음 브리지) → H6(개인화 진입점) → M3(digest 재유입) → M4(잔디 코칭).
- 이유: H4·H5·H6·M3가 발견성/단계 로직을 공유하므로 함께 설계. 신입 첫인상 + 전체 재유입 동시 개선.

**스프린트 C — "졸업생 재참여·운영 효율" (리텐션 장기·운영 부담)**
- H3(졸업생 기여 채널, 골격) + M5(협업 진입) + M2(검수 큐) + M6(콘솔 정리) + L2(색상 부채).
- 이유: H3는 §4 외부의존(운영 정책)과 병행 — 코드 골격 선행 후 정책 확정 시 활성. 운영 부담(M2·M6)은 독립 병렬 가능.

> 착수 권고: 스프린트 A의 **H1**을 최우선(끊긴 중간 고리·최소비용 최대ROI). 발견성 로직(H4·H5·H6·M3)은 공유 설계로 묶어 중복 방지. H3·M2·M6은 회원 동선과 파일 영역이 달라 병렬 착수 가능.

---

## 참고 파일 (절대경로, 실측)
- IA: `src/components/layout/Header.tsx`(PUBLIC_NAV 6그룹·visibility 분기)
- 신입 온보딩: `src/app/dashboard/page.tsx:496·619·624`(3표면), `src/app/steppingstone/onboarding/page.tsx:406`(빈상태)
- 진단 루프: `src/components/mypage/DiagnosticWeakConceptPath.tsx:165~272`(개념 링크만), `src/features/diagnosis/learning-loop.ts`, `src/features/mypage/LearningEffectCard.tsx`
- 파이프라인: `src/lib/research-design-draft.ts`(buildResearchMethodDraft), `src/features/research/ResearchDesignEditor.tsx`(copyDraft 전용), `WritingPaperEditor.tsx`, `ResearchProposalEditor.tsx`
- 여정 딥링크(이미 반영): `src/features/research/ResearchJourneyGuide.tsx:164~181`
- 발견성 넛지: `src/features/dashboard/NextActionBanner.tsx:135`(DiscoveryKind 4종), `src/features/dashboard/QuickLinks.tsx:11`(고정 6칸)
- 졸업생: `src/features/dashboard/AlumniHomeWidgets.tsx`(읽기 전용 3섹션), `grep mentor`=전용기능 0건
- 운영: `src/app/console/archive/*`(8컬렉션 개별), `/admin`·`/academic-admin` 이중 경로, `src/app/console/inject-spring-2026-schedule`·`migrate-applicants`(일회성)
- 환류: `src/app/api/cron/weekly-digest/route.ts`(신규자산 미참조)

> 본 문서는 UX 관점 갭 분석 산출물(2026-07-17). 코드 변경 없음. v4-0713(파이프라인 코드 관점)의 **사람 여정 보완판**으로, 페르소나별 끊김·사일로·환류 부재·온보딩 파편화에 집중.

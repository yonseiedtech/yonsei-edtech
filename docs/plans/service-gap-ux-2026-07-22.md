# UX 갭 분석 — yonsei-edtech
> 실측 기준: 2026-07-22 코드 분석 (src/app 라우트 299+개, Header/BottomNav/Footer, 주요 feature flows)  
> 분석가: 시니어 UX 디자이너 (정보구조·플로우·사용성·접근성)  
> 범위: 비주얼 제외, 코드 실측 기반 기능적 UX 갭만 기술

---

## 분석 프레임 요약

| 영역 | 발견 건수 |
|---|---|
| 정보구조 — 라벨·중복·고아 | 6건 |
| 핵심 플로우 마찰 | 5건 |
| 패턴 일관성 | 4건 |
| 접근성·모바일 | 3건 |
| **합계** | **18건** |

---

## 1. 정보구조: 내비 멘탈모델 정합

### IA-1 — BottomNav "연구활동" 탭 목적지 불일치 [심각도: HIGH]

**파일 근거:** `src/components/layout/BottomNav.tsx` L47–53, `src/app/research/page.tsx` (학회 전체 연구 분석), `src/app/mypage/research/page.tsx` (개인 연구 여정)

**문제:** BottomNav의 "연구활동" 탭이 `/research`(학회 전체의 연구 트렌드 분석·시각화)로 이동한다. 그러나 사용자가 "내 연구활동"을 기대하는 멘탈모델과 충돌한다. 개인 연구 여정(`/mypage/research`)은 Header "연구 활동 > 나의 연구 > 내 연구활동·논문 여정"으로만 접근 가능하다. 또한 BottomNav의 `matchPrefixes`가 `/research`만 포함하여 `/archive`, `/diagnosis`, `/mypage/research` 방문 시 "연구활동" 탭이 비활성 상태가 된다 — 사용자는 어떤 탭에 있는지 알 수 없다.

**개선안:**
- BottomNav "연구활동" 탭의 href를 `/mypage/research`로 변경하고 라벨을 "내 연구"로 수정
- 또는 탭 라벨을 "연구실"로 변경하고 섹션 허브 페이지(개인 연구 + 아카이브 진입 통합)로 연결
- matchPrefixes에 `/mypage/research`, `/archive`, `/diagnosis`, `/collab` 추가

---

### IA-2 — `/dashboard`가 모바일 1차 탭에 없음 [심각도: HIGH]

**파일 근거:** `src/components/layout/BottomNav.tsx` L37–68 (ITEMS 배열), `MORE_ITEMS` L72–84

**문제:** 로그인 사용자의 핵심 허브인 대시보드(`/dashboard`)가 BottomNav 1차 탭에 없고 "더보기" 시트(2차) 맨 위에 있다. 모바일에서 대시보드 접근에 2탭이 필요하다. 반면 데스크탑 UserDropdown에서는 대시보드가 첫 항목이다. 모바일·데스크탑 간 접근 계층이 역전되어 있다.

현재 BottomNav 1번 탭 "디딤판"(`/steppingstone`)은 가이드 인덱스 페이지이며 매일 방문할 성격이 아니다. matchPrefixes에 `/dashboard`, `/`가 포함되어 있어 로그인 홈(`/`) 접속 시에도 "디딤판" 탭이 활성화된다 — 시맨틱 오류.

**개선안:**
- BottomNav 1번 탭을 "홈"(href: `/dashboard`, icon: `LayoutDashboard`)으로 교체
- "디딤판"은 2번 탭 또는 "더보기" 시트로 이동 (일주일에 1~2회 방문 성격)
- 현재 matchPrefixes의 `/` 제거

---

### IA-3 — `/directory` 메뉴 진입점 전무 [심각도: HIGH]

**파일 근거:** `docs/architecture/surface-naming-map.md` L58–60 ("헤더 직접 메뉴 없음 — command palette 또는 직접 URL")

**문제:** 회원 연락망 페이지(`/directory`)가 Header, BottomNav, Footer 어디에도 직접 링크가 없다. command palette 또는 직접 URL 입력으로만 접근 가능하다. command palette 자체가 고급 사용자 기능이므로 일반 회원의 발견 가능성은 사실상 0%이다.

**개선안:**
- Footer "학회소개" 섹션 하단에 "회원 연락망" 링크 추가 (낮은 비용, 즉시 개선)
- 또는 BottomNav "더보기" 시트의 `MORE_ITEMS`에 추가 (`Users` 아이콘 이미 import됨 — L19)

---

### IA-4 — "더보기" 라벨이 두 표면에서 다른 콘텐츠를 지칭 [심각도: MEDIUM]

**파일 근거:** `src/components/layout/Header.tsx` L189–199 (더보기 NavGroup: 학회보·카드뉴스·갤러리·연구지·관계망 5건), `src/components/layout/BottomNav.tsx` L72–84 (MORE_ITEMS: 대시보드·진단평가·캘린더·세미나·대내학술대회·아카이브·리더보드·뉴스레터·카드뉴스·회원·도움말 11건)

**문제:** 데스크탑 Header의 "더보기" 메뉴(5개 저방문 기능)와 모바일 BottomNav의 "더보기" 시트(11개 2차 기능)가 거의 겹치지 않는다. 뉴스레터/카드뉴스만 공통. 사용자가 한 기기에서 "더보기"에 있다고 학습한 기능을 다른 기기에서 찾지 못한다. 또한 "더보기" 시트의 11개 아이템을 3열 그리드 + 11px 폰트로 표시하면 모바일에서 터치 타깃 밀도가 과도하게 높아진다.

**개선안:**
- 두 표면의 "더보기" 콘텐츠를 동일하게 맞추거나 명확히 다른 라벨 사용
- BottomNav 더보기 시트는 최대 6~8개로 제한; 나머지는 마이페이지로 위임

---

### IA-5 — `/hackathon` 고아 페이지 [심각도: MEDIUM]

**파일 근거:** `src/app/hackathon/page.tsx` 존재 확인, Header `PUBLIC_NAV`에 미포함, BottomNav `MORE_ITEMS`에 미포함, `src/app/dashboard/page.tsx` L75 (`HackathonCtaBanner` import — 조건부 노출)

**문제:** 해커톤 참가 페이지(`/hackathon`)가 Header·BottomNav·Footer 어디에도 진입 경로가 없다. 대시보드 배너(`HackathonCtaBanner`)만이 유일한 진입 경로이며, 배너가 닫힌 후나 행사 기간 외에는 사실상 orphan page가 된다. 사용자가 "이번 해커톤 페이지 어디 있지?"를 검색할 방법이 없다.

**개선안:**
- 행사 기간 중 BottomNav 더보기 시트 또는 Header "학술 활동"에 조건부 항목 추가
- `/activities/internal` 페이지와 크로스링크로 연결

---

### IA-6 — Footer "수료증 확인" 링크가 tab 파라미터 의존 [심각도: LOW]

**파일 근거:** `src/components/layout/Footer.tsx` L9–12 (`MEMBER_SHORTCUTS` 배열: `/mypage/activities?tab=certificates`, `/mypage/activities?tab=activities`)

**문제:** Footer 회원 전용 바로가기가 `?tab=` 쿼리 파라미터에 의존한다. URL 공유 시 탭 상태가 유지되지 않을 수 있고, 딥링크 가능성이 불확실하다. 또한 "내 활동(`?tab=activities`)"과 "수료증(`?tab=certificates`)"이 서로 다른 링크로 분리되어 있어 마이페이지 구조를 예측하기 어렵다.

**개선안:**
- 각 탭을 독립 경로(`/mypage/certificates`, `/mypage/activities`)로 분리하거나
- 탭 파라미터 딥링크가 실제로 동작하는지 QA 확인 후 유지

---

## 2. 핵심 플로우 마찰

### FLOW-1 — 가입 완료 → 첫 경험 경로 불일치 [심각도: HIGH]

**파일 근거:** `src/app/signup/page.tsx` L68–79 (자동승인 완료 카드)

**문제:** 자동승인 완료 화면에서 "로그인 후 인지디딤판에서 학기별 로드맵·재학생 가이드를 안내해 드립니다"라고 설명하지만, "바로 시작하기" 버튼의 `href`는 `safeNext || "/dashboard"` — 대시보드로 이동한다. 사용자가 기대하는 목적지(인지디딤판)와 실제 목적지(대시보드)가 다르다. 대시보드에서 인지디딤판으로 추가 클릭이 필요하다.

또한 수동승인 대기 흐름에서 "처리가 지연되면 이메일로 문의" 안내가 있으나, 승인 완료 알림 수단(이메일 알림 여부)에 대한 설명이 없다. 사용자가 언제 다시 로그인을 시도해야 하는지 모른다.

**개선안:**
- 자동승인 완료 버튼 href를 `/steppingstone/onboarding`으로 변경하거나 버튼 문구를 "대시보드에서 시작하기"로 수정하여 기대를 일치시킴
- 수동승인 대기 화면에 "승인 완료 시 이메일 알림이 발송됩니다" 명시

---

### FLOW-2 — 진단평가 완료 후 학습 루프 단절 [심각도: HIGH]

**파일 근거:** `src/app/diagnosis/page.tsx` L429–431 (`setPhase("report")`), `src/components/diagnosis/DiagnosisReport` (파일명 확인, 내용 미열람)

**문제:** 진단평가 리포트(약점 개념 목록 + 준비도 점수)가 표시된 후, 다음 행동을 명확히 유도하는 CTA가 코드에서 확인되지 않는다. 오답 암기카드(`wrongItems`) 데이터는 생성되지만 이를 즉시 복습 세션으로 연결하는 버튼이 리포트 표면에 있는지 불명확하다. 진단 → 아카이브 탐색 링크는 있으나, 진단 → 스페이스드 리피티션(복습 스케줄) 또는 진단 → 잔디 기록으로의 자동 연결이 코드에서 확인되지 않는다.

추가로 진단평가(`/diagnosis`)의 진입 경로가 4곳(Header, Archive 페이지 CTA, BottomNav 더보기 시트, 대시보드 위젯)으로 분산되어 있지만, 진단 완료 후 어느 경로로 복귀할지 컨텍스트가 없다(뒤로가기 = 아카이브 버튼만 존재).

**개선안:**
- 진단 리포트에 "오답 암기카드 바로 복습하기" 주요 CTA 명시(wrongItems가 있을 때)
- "다음에 할 일" 섹션에 단계별 행동(아카이브 탐색 → 복습 → 재진단) 가이드 삽입
- 리포트 상단 뒤로가기를 진입 경로별로 컨텍스트 aware하게 처리 또는 홈 버튼 추가

---

### FLOW-3 — 스터디 참여 플로우 5단계 이상 [심각도: MEDIUM]

**파일 근거:** `src/app/activities/studies/page.tsx`, `src/app/activities/studies/[id]/page.tsx`, `src/app/activities/studies/[id]/weeks/page.tsx`, `src/app/activities/studies/[id]/weeks/[week]/page.tsx`

**문제:** 모바일에서 스터디 실제 콘텐츠(특정 주차 자료)에 접근하려면 최소 5탭이 필요하다:
1. BottomNav "학술활동" → `/activities`
2. "스터디" 카드 클릭 → `/activities/studies`
3. 특정 스터디 선택 → `/activities/studies/[id]`
4. "회차별 자료" → `/activities/studies/[id]/weeks`
5. 특정 회차 선택 → `/activities/studies/[id]/weeks/[week]`

현재 참여 중인 스터디의 최신 회차에 대한 단축 경로가 대시보드나 마이페이지에서 확인되지 않는다. 매주 반복적으로 접근하는 사용자에게 인지적 부담이 크다.

**개선안:**
- 대시보드 `myAcademicActivities` 위젯에 "이번 주 스터디" 바로가기 추가
- 마이페이지 activities 탭에 "내가 참여 중인 스터디 최신 회차" 카드 추가
- 스터디 [id] 페이지에서 "최신 회차 바로가기" CTA 상단 배치

---

### FLOW-4 — 논문 도구 연속 사용 흐름 없음 [심각도: MEDIUM]

**파일 근거:** `src/app/mypage/research/tools/page.tsx` 존재 확인, Header L147–161 (연구 활동 > 나의 연구 섹션: 4개 항목)

**문제:** 논문 도구가 여러 경로에 분산되어 있다:
- `/mypage/research/tools` — 논문 도구 모아보기
- `/archive` — 아카이브 (개념·변인·측정도구)
- `/archive/method-finder` — 통계방법 추천 마법사
- `/archive/research-finder` — 연구방법 마법사
- `/archive/paper-guide` — 논문 쓰기 가이드
- `/diagnosis` — 연구 준비도 진단

각 도구 사용 후 "다음 도구"로 자연스럽게 이동하는 흐름이 없다. 예를 들어 research-finder 완료 → 선택된 연구방법의 statistical-method 추천 → 해당 측정도구 아카이브로 이어지는 체이닝이 없다. 사용자는 매번 뒤로가기 → 허브 → 새 도구를 선택해야 한다.

**개선안:**
- `/mypage/research/tools` 페이지를 "연구 여정 스텝" 형태로 재구성 (연구 목적 선택 → 방법 추천 → 측정도구 → 아카이브 순서로 선형 가이드)
- 각 도구 완료 시 "다음 단계" CTA 삽입

---

### FLOW-5 — 모임·행사(`/gatherings`) 발견 경로가 로그인 전용 헤더뿐 [심각도: MEDIUM]

**파일 근거:** `src/components/layout/Header.tsx` L116–120 (`gatherings` 링크가 `visibility: "auth"` 그룹인 "대학원 생활" 내 "구성원·네트워크" 섹션에 위치), `src/components/layout/Footer.tsx` (gatherings 링크 없음), BottomNav `MORE_ITEMS` (gatherings 없음)

**문제:** `/gatherings`(모임·행사 참여, RSVP, 게스트 투표 포함)는 비로그인 접근도 가능한 표면(게스트 RSVP `/gatherings/poll`)임에도 Header에서 로그인 후에만 노출된다. 게다가 데스크탑 드롭다운 3단계 중 가장 하단에 위치("대학원 생활" 드롭다운 → "구성원·네트워크" 섹션 → "모임·행사"). 모바일에서는 BottomNav "더보기"에도 없어 사실상 숨겨진 기능이다.

**개선안:**
- BottomNav `MORE_ITEMS`에 "모임·행사" 추가 (`Calendar` 또는 `Users` 아이콘)
- Footer에 "다가오는 행사" 링크 추가
- 또는 "학술 활동" 헤더 그룹(visibility: "both")에 "모임·행사" 이동

---

## 3. 패턴 일관성

### CONS-1 — `/board` vs `/boards` 이중 라우트 [심각도: HIGH]

**파일 근거:** `docs/architecture/surface-naming-map.md` L68–71 ("URL 단수 `/board`이지만", "`/board`(복수 없음)와 `/boards`(복수 있음) 구분"), `src/app/board/`, `src/app/boards/[boardId]/wall/page.tsx`, `src/app/boards/[boardId]/present/page.tsx`

**문제:** 게시판 라우트가 `/board/{category}` (단수, 카테고리별 정적 경로)와 `/boards/[boardId]` (복수, 동적 slug)로 분리되어 있다. 대시보드 공지사항 위젯이 `href="/board/${n.id}"`로 링크를 생성하는데(dashboard/page.tsx L307), 이 패턴은 단수 라우트(`/board/category`)와 혼동될 수 있다. 실제 게시글 상세 경로가 어느 쪽인지 코드 외에서 알 방법이 없다.

**개선안:**
- 두 라우트의 역할을 팀 내 공식 문서화 (surface-naming-map.md에 board 섹션 추가)
- 대시보드 링크 패턴을 실제 동작하는 라우트로 정규화
- 장기: 단일 라우트 패턴으로 통합

---

### CONS-2 — 모바일 로그아웃 버튼 중복 [심각도: MEDIUM]

**파일 근거:** `src/components/layout/Header.tsx` L568–574 (모바일 프로필 카드 내 로그아웃 버튼), L638–644 (모바일 메뉴 하단 로그아웃 버튼)

**문제:** 모바일 햄버거 메뉴 내에 로그아웃 버튼이 2개다. 상단 프로필 카드 우측(`<LogOut size={16} />`)과 메뉴 리스트 맨 하단(`<LogOut size={15} />`)에 각각 존재한다. 기능은 동일하며 둘 다 `logout()`을 호출한다. 사용자가 의도치 않게 로그아웃을 탭할 위험이 증가하고 UI에 노이즈가 생긴다.

**개선안:**
- 상단 프로필 카드의 로그아웃 아이콘 버튼 제거, 하단 명시적 텍스트 버튼만 유지
- 또는 상단 카드에 로그아웃 제거하고, 로그아웃은 항상 메뉴 최하단에만 노출

---

### CONS-3 — 헤더 sectionLabel에 이모지 혼용 [심각도: LOW]

**파일 근거:** `src/components/layout/Header.tsx` L103 (`sectionLabel: "🌱 필수 — 학기별 로드맵"`), L108 (`sectionLabel: "학사 도구"`), L113 (`sectionLabel: "구성원·네트워크"`)

**문제:** "대학원 생활" 드롭다운의 첫 번째 sectionLabel에만 이모지(`🌱`)가 사용된다. 다른 모든 sectionLabel(학사 도구, 구성원·네트워크, 📖 나의 연구)은 이모지를 사용하지 않거나 일부만 사용한다. `📖 나의 연구`도 이모지 사용. 일관성이 없으며 특히 스크린리더에서 이모지가 읽혀 노이즈가 발생할 수 있다.

**개선안:**
- sectionLabel의 이모지 전량 제거 후 텍스트만 사용
- 또는 강조가 필요한 항목에만 Lucide 아이콘을 일관된 방식으로 사용

---

### CONS-4 — 마이페이지 sub-route 14개 중 내비게이션 노출 없음 [심각도: MEDIUM]

**파일 근거:** `src/app/mypage/` Glob 결과 — 20개 파일: activities, research, calendar, notes, data-export, dashboard-settings, wrapped, academic-status, research/tools, messages, portfolio, notifications, calendar-sync, research/papers/[id]

**문제:** 마이페이지(`/mypage`)의 하위 경로가 14개 이상이지만, `/mypage/page.tsx`가 어떤 탭 구조로 이를 노출하는지 코드에서 확인하지 못했다. 단, BottomNav "마이" 탭이 `/mypage`를 가리키며 matchPrefixes는 `/mypage`, `/profile`만 포함한다. `/mypage/dashboard-settings`, `/mypage/data-export`, `/mypage/wrapped` 같은 유틸리티 페이지의 발견 경로가 불명확하다. 대시보드 빈 위젯 상태(EmptyState)가 `/mypage/dashboard-settings`를 가리키는데, 이 페이지로의 다른 진입점이 없으면 사실상 hidden이다.

**개선안:**
- `/mypage` 허브에 하위 페이지 인덱스 또는 사이드바 네비게이션 추가
- dashboard-settings 접근 경로를 대시보드 편집 버튼에서도 추가 제공

---

## 4. 접근성·모바일

### A11Y-1 — BottomNav "더보기" 시트 터치 타깃 밀도 [심각도: MEDIUM]

**파일 근거:** `src/components/layout/BottomNav.tsx` L195–218 (3열 그리드, text-[11px], 11개 아이템)

**문제:** "더보기" 바텀시트가 3열 그리드로 11개 아이템을 표시하며 텍스트 크기가 11px이다. 각 아이템의 실제 터치 영역은 `px-2 py-3`(8px + 12px 상하) 기준으로 WCAG 2.5.5 권장 44px에 미달할 가능성이 높다. 특히 한국어 텍스트 특성상 작은 폰트에서 가독성이 떨어진다. 11개 아이템 중 대시보드, 캘린더, 세미나는 다른 1차 탭의 matchPrefixes에 이미 포함되어 있어 중복이다.

**개선안:**
- 3열 → 2열 그리드로 변경, 아이템을 6~8개로 축소
- 각 아이템의 py를 최소 `py-4`(16px)로 증가시켜 터치 영역 44px 이상 확보
- 텍스트 크기 최소 12px으로 상향

---

### A11Y-2 — 데스크탑 드롭다운 hover + click 이중 트리거 [심각도: LOW]

**파일 근거:** `src/components/layout/Header.tsx` L264–270 (`onMouseEnter/Leave`로 hover, `onClick`으로 toggle), L229–246 (외부 클릭 닫기)

**문제:** 드롭다운이 마우스오버(150ms 딜레이)와 버튼 클릭 두 방식으로 모두 동작한다. 터치 지원 노트북(터치스크린 Windows)에서 touchstart가 mouseover로 해석되어 예상치 못한 동작이 발생할 수 있다. 또한 hover로 열린 메뉴에서 다른 nav 항목으로 이동할 때 150ms 딜레이 중 의도치 않게 다른 메뉴가 열릴 수 있다.

**개선안:**
- pointer media query(`pointer: coarse`)로 터치 기기에서는 click만 사용하도록 분기
- 또는 hover를 제거하고 click 전용으로 통일 (키보드 접근성 이미 구현되어 있음)

---

### A11Y-3 — 아카이브 페이지 모바일 롱폼 스크롤 후 위로가기 없음 [심각도: LOW]

**파일 근거:** `src/app/archive/page.tsx` — 7개 major 섹션(start, dictionary, library, guides, tools), 각 섹션에 다수 아이템, `ArchiveSubNav` 스티키 내비 (id별 앵커 링크)

**문제:** 아카이브 페이지가 매우 긴 단일 스크롤 페이지이며, 스티키 섹션 내비(`ArchiveSubNav`)가 섹션 간 이동을 지원하지만 "맨 위로" 버튼이 없다. 모바일에서 페이지 하단(도구·그래프 섹션)까지 스크롤한 사용자가 검색창(상단)으로 돌아가려면 긴 스크롤이 필요하다. BottomNav는 `sm:hidden`이므로 모바일에서 표시되고, 네비 탭 클릭 시 라우트 이동은 되지만 같은 페이지 상단으로 즉시 이동하는 버튼이 없다.

**개선안:**
- 스크롤 300px 이상 시 floating "맨 위로" 버튼 표시 (`ScrollToTopOnNav.tsx` 이미 존재 — 이를 활용)
- 또는 `ArchiveSubNav`에 "처음으로" 앵커 추가

---

## 5. 심각도 Top 10 종합

| 순위 | ID | 플로우·표면 | 문제 요약 | 심각도 |
|---|---|---|---|---|
| 1 | IA-1 | BottomNav "연구활동" 탭 | href가 개인 연구가 아닌 학회 분석뷰 — 라벨·목적지 불일치 | HIGH |
| 2 | IA-2 | BottomNav 1번 탭 | 대시보드가 2차 "더보기"에만 존재 — 핵심 허브 접근 2탭 필요 | HIGH |
| 3 | IA-3 | `/directory` | Header·BottomNav·Footer 진입점 전무 — 발견 불가 | HIGH |
| 4 | FLOW-1 | 가입 완료 → 첫 경험 | "인지디딤판 안내" 약속 후 대시보드 이동 — 기대·현실 불일치 | HIGH |
| 5 | CONS-1 | `/board` vs `/boards` | 두 라우트 공존, 대시보드 링크가 잘못된 패턴일 가능성 | HIGH |
| 6 | FLOW-2 | 진단 완료 후 루프 | 오답 암기카드·복습 스케줄 연결 CTA 불명확 — 학습루프 단절 | HIGH |
| 7 | IA-4 | "더보기" 라벨 | 데스크탑·모바일에서 다른 콘텐츠 — 크로스 기기 멘탈모델 충돌 | MEDIUM |
| 8 | FLOW-3 | 스터디 참여 | 최신 회차까지 5탭 — 매주 방문하는 핵심 플로우 과도한 깊이 | MEDIUM |
| 9 | CONS-2 | 모바일 로그아웃 | 같은 화면에 로그아웃 버튼 2개 — 의도치 않은 탭 위험 | MEDIUM |
| 10 | A11Y-1 | BottomNav 더보기 시트 | 11개 아이템 3열·11px 폰트 — 터치 타깃 밀도 과다 | MEDIUM |

---

## 부록: 추가 발견 (low priority)

- `IA-5`: `/hackathon` 고아 페이지 (행사 기간 외 진입 불가) — MEDIUM
- `CONS-3`: sectionLabel 이모지 혼용 — LOW
- `CONS-4`: 마이페이지 14개 서브 경로 중 진입 불명확 항목 다수 — MEDIUM
- `FLOW-4`: 논문 도구 도구 간 연속 흐름 없음 — MEDIUM
- `FLOW-5`: `/gatherings` 모바일 발견 경로 전무 — MEDIUM
- `A11Y-2`: hover+click 이중 드롭다운 트리거 — LOW
- `A11Y-3`: 아카이브 롱폼 모바일 "맨 위로" 버튼 없음 — LOW
- `IA-6`: Footer 탭 파라미터 딥링크 신뢰성 — LOW

---

*생성: 2026-07-22 | 분석 대상: C:\work\yonsei-edtech (Next.js 16, src/app 299+ 라우트)*

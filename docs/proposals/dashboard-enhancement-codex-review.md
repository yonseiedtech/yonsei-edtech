# 대시보드 개선 심층 분석

## TL;DR

1. **첫 화면 정보 우선순위를 재정렬해야 한다.** 현재 `/dashboard`는 헤더, 신규 배너, 학기 Hero, 다음 액션, 오늘의 수업, 할 일, 통계, 공지/캘린더, 포트폴리오, 학습 보조, 피드, 운영 알림 순서로 길게 이어진다(`src/app/dashboard/page.tsx:119`, `src/app/dashboard/page.tsx:124`, `src/app/dashboard/page.tsx:174`, `src/app/dashboard/page.tsx:179`, `src/app/dashboard/page.tsx:194`, `src/app/dashboard/page.tsx:253`, `src/app/dashboard/page.tsx:312`, `src/app/dashboard/page.tsx:330`). 모바일에서는 "오늘 처리할 것"보다 Hero/설명/학습 보조/피드가 과하게 많은 면적을 차지한다.
2. **데이터 조회는 React Query 병렬성이 있지만 중복 fetch와 클라이언트 필터 비용이 크다.** 같은 수업/세미나/활동 데이터가 `DashboardPage`, `NextActionBanner`, `DailyClassTimelineWidget`, `MyTodosWidget`, `TodayTodosPopup`에서 별도 query key 또는 별도 API로 다시 조회된다(`src/app/dashboard/page.tsx:89`, `src/features/dashboard/NextActionBanner.tsx:162`, `src/features/dashboard/DailyClassTimelineWidget.tsx:376`, `src/features/dashboard/MyTodosWidget.tsx:132`, `src/features/dashboard/TodayTodosPopup.tsx:103`). 특히 작성자 프로필과 과목명 매핑은 `Promise.all` 기반 N+1 성격이 남아 있다(`src/features/dashboard/PeerActivityFeed.tsx:139`, `src/features/dashboard/MyTodosWidget.tsx:175`).
3. **페르소나 분기는 있으나 충분히 다르지 않다.** 학사 위젯은 alumni/advisor에서 숨기지만(`src/features/dashboard/widget-visibility.ts:38`), 운영진/졸업생/자문위원에게도 학습 보조, AI 포럼, 피드가 동일하게 내려간다(`src/app/dashboard/page.tsx:312`, `src/app/dashboard/page.tsx:330`). 역할별 홈 목적이 다른데 레이아웃은 대부분 공통이다.

## 1. 정보 계층

현재 페이지는 인증 후 `DashboardContent` 안에서 모든 위젯을 클라이언트 렌더링한다(`src/app/dashboard/page.tsx:86`, `src/app/dashboard/page.tsx:433`). 최상단에는 이름/역할/글쓰기/세미나/운영 콘솔 CTA가 있고(`src/app/dashboard/page.tsx:131`, `src/app/dashboard/page.tsx:136`, `src/app/dashboard/page.tsx:149`, `src/app/dashboard/page.tsx:157`), 바로 아래에 신규 회원 배너와 학기 Hero가 온다(`src/app/dashboard/page.tsx:162`, `src/app/dashboard/page.tsx:165`).

우선순위상 가장 강한 정보는 `TermBriefHero`다. 이 컴포넌트는 학기 라벨, 학기차, 학사일정 진행률 slot, `인지디딤판 열기` CTA를 가진다(`src/components/dashboard/TermBriefHero.tsx:47`, `src/components/dashboard/TermBriefHero.tsx:54`, `src/components/dashboard/TermBriefHero.tsx:60`, `src/components/dashboard/TermBriefHero.tsx:79`, `src/components/dashboard/TermBriefHero.tsx:95`). 그 다음 `NextActionBanner`가 24시간 이내 가장 가까운 수업/세미나/todo 한 건만 노출한다(`src/features/dashboard/NextActionBanner.tsx:4`, `src/features/dashboard/NextActionBanner.tsx:44`, `src/features/dashboard/NextActionBanner.tsx:285`, `src/features/dashboard/NextActionBanner.tsx:289`).

문제는 위젯 순서가 "오늘의 실행"과 "장기 학습 보조"를 모두 강하게 보여준다는 점이다. 오늘의 수업과 나의 할 일은 섹션 3에 있어 비교적 위에 있지만(`src/app/dashboard/page.tsx:179`, `src/app/dashboard/page.tsx:181`, `src/app/dashboard/page.tsx:186`), 통계 카드와 공지/세미나 캘린더가 그 아래에 이어지고(`src/app/dashboard/page.tsx:194`, `src/app/dashboard/page.tsx:253`), `오늘의 5분 회고`, AI 포럼, 다시 보기 추천은 별도 섹션으로 다시 강조된다(`src/app/dashboard/page.tsx:312`, `src/app/dashboard/page.tsx:319`, `src/app/dashboard/page.tsx:323`). 따라서 첫 방문자는 "오늘 당장 할 것", "학기 로드맵", "커뮤니티 탐색"의 위계를 한눈에 구분하기 어렵다.

개선 방향은 상단을 `긴급 액션`, `오늘 일정`, `오늘 할 일` 3요소로 압축하고, 학기 Hero는 진행률과 디딤판 CTA만 남기는 것이다. 공지/세미나/학회보/피드는 아래로 내리거나 사용자 설정에 따라 접히는 구조가 맞다.

## 2. 위젯 구성, 노이즈, 가치 균형

가치가 높은 위젯은 `NextActionBanner`, `DailyClassTimelineWidget`, `MyTodosWidget`, 운영진 관리 알림이다. `NextActionBanner`는 수업, 세미나, todo 후보를 시간순으로 정렬해 1건만 노출한다(`src/features/dashboard/NextActionBanner.tsx:225`, `src/features/dashboard/NextActionBanner.tsx:250`, `src/features/dashboard/NextActionBanner.tsx:267`, `src/features/dashboard/NextActionBanner.tsx:285`). `DailyClassTimelineWidget`은 수업 종료 후 메모/할 일/다음주 수업 형태 변경까지 이어지는 실제 행동을 만든다(`src/features/dashboard/DailyClassTimelineWidget.tsx:1135`, `src/features/dashboard/DailyClassTimelineWidget.tsx:1161`, `src/features/dashboard/DailyClassTimelineWidget.tsx:1174`, `src/features/dashboard/DailyClassTimelineWidget.tsx:1190`, `src/features/dashboard/DailyClassTimelineWidget.tsx:1204`). 운영진 알림은 승인 대기와 미답변 문의를 직접 콘솔로 연결한다(`src/app/dashboard/page.tsx:390`, `src/app/dashboard/page.tsx:399`, `src/app/dashboard/page.tsx:412`).

노이즈 가능성이 큰 위젯은 학습 보조 3종과 피드다. `DailyReflectionPrompt`는 매일 다른 회고를 생성하고 글쓰기 URL로 보낸다(`src/features/dashboard/DailyReflectionPrompt.tsx:78`, `src/features/dashboard/DailyReflectionPrompt.tsx:99`, `src/features/dashboard/DailyReflectionPrompt.tsx:134`). `SpacedRepetitionWidget`은 게시글과 세미나 후기를 1/7/14/30일 간격으로 다시 보여준다(`src/features/dashboard/SpacedRepetitionWidget.tsx:38`, `src/features/dashboard/SpacedRepetitionWidget.tsx:74`, `src/features/dashboard/SpacedRepetitionWidget.tsx:109`). `AIForumLiveWidget`은 Firestore 결과가 비면 데모 토론을 fallback으로 보여준다(`src/features/dashboard/AIForumLiveWidget.tsx:37`, `src/features/dashboard/AIForumLiveWidget.tsx:51`, `src/features/dashboard/AIForumLiveWidget.tsx:61`). 이들은 학습적 의도는 강하지만, 사용자가 수업/과제/승인 처리를 위해 들어온 상황에서는 본문 중간을 차지하는 추가 탐색 노이즈가 될 수 있다.

통계 카드도 가치가 제한적이다. `내 글`, `신청 세미나`, `예정 세미나`, `최신 학회보`는 단순 count 또는 최신 호수이고(`src/app/dashboard/page.tsx:197`, `src/app/dashboard/page.tsx:204`, `src/app/dashboard/page.tsx:230`, `src/app/dashboard/page.tsx:237`), 실제 다음 행동의 맥락은 `NextActionBanner`와 `MyTodosWidget`이 더 잘 제공한다. 통계 카드는 접거나 개인 요약 패널로 축소하는 편이 낫다.

## 3. 퍼소나별 동선

현재 페르소나 분기는 역할 기반 위젯 숨김으로 일부 구현되어 있다. `widget-visibility`는 `academicCalendar`, `dailyClassTimeline`, `myTodos`, `comprehensiveExam`, `myAcademicActivities`를 학생 전용으로 정의하고(`src/features/dashboard/widget-visibility.ts:14`, `src/features/dashboard/widget-visibility.ts:30`), alumni/advisor에는 숨긴다(`src/features/dashboard/widget-visibility.ts:38`, `src/features/dashboard/widget-visibility.ts:40`). 페이지는 이 함수를 통해 학사일정, 오늘의 수업, 할 일, 학술활동, 종합시험을 조건부 렌더링한다(`src/app/dashboard/page.tsx:168`, `src/app/dashboard/page.tsx:182`, `src/app/dashboard/page.tsx:187`, `src/app/dashboard/page.tsx:298`).

학부생/석사/박사 구분은 Hero 문구에만 반영된다. `TermBriefHero`는 `academicLevel`이 doctoral/masters이면 박사과정/석사과정 라벨을 보여주고, alumni도 라벨링한다(`src/components/dashboard/TermBriefHero.tsx:41`, `src/components/dashboard/TermBriefHero.tsx:42`, `src/components/dashboard/TermBriefHero.tsx:44`). 하지만 실제 위젯 구성은 학부생/대학원생 간 차이가 없다. 반면 `ComprehensiveExamCountdown`은 대학원생에게 더 강한 의미가 있는 기능인데 모든 재학생에게 같은 조건으로 노출된다(`src/app/dashboard/page.tsx:305`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:42`).

운영진은 `isStaff`로 승인 대기/미답변 문의, 운영 콘솔 버튼, 운영진 todo 탭이 추가된다(`src/app/dashboard/page.tsx:88`, `src/app/dashboard/page.tsx:149`, `src/app/dashboard/page.tsx:211`, `src/app/dashboard/page.tsx:391`, `src/features/dashboard/MyTodosWidget.tsx:1124`, `src/features/dashboard/MyTodosWidget.tsx:1144`). 다만 관리 알림이 페이지 최하단에 있어 모바일에서는 운영진의 핵심 업무가 늦게 보인다(`src/app/dashboard/page.tsx:390`).

제안: 학부생은 수업/세미나/신규 가이드 중심, 대학원생은 연구보고서/종합시험/학술대회 중심, 운영진은 승인/문의/운영 업무 중심, 졸업생은 세미나/뉴스레터/동문 피드 중심으로 기본 위젯 순서를 다르게 둔다.

## 4. 모바일 UX와 스크롤 비용

모바일 레이아웃은 대부분 단일 컬럼으로 쌓인다. 최상위 컨테이너는 `py-8 sm:py-14` 여백을 갖고(`src/app/dashboard/page.tsx:119`), 헤더 섹션은 `mt-6 sm:mt-8`로 시작한다(`src/app/dashboard/page.tsx:125`). `TermBriefHero`는 `p-6 sm:p-10`, `flex-col` 기반이라 모바일에서 큰 블록이 된다(`src/components/dashboard/TermBriefHero.tsx:47`, `src/components/dashboard/TermBriefHero.tsx:52`, `src/components/dashboard/TermBriefHero.tsx:57`, `src/components/dashboard/TermBriefHero.tsx:78`).

`MyTodosWidget`은 모바일 탭 오버플로를 인지하고 `overflow-x-auto whitespace-nowrap`를 적용했다(`src/features/dashboard/MyTodosWidget.tsx:1123`, `src/features/dashboard/MyTodosWidget.tsx:1126`, `src/features/dashboard/MyTodosWidget.tsx:1127`). 추가 Dialog도 모바일에서는 카테고리 picker로 단계화한다(`src/features/dashboard/MyTodosWidget.tsx:1311`, `src/features/dashboard/MyTodosWidget.tsx:1378`, `src/features/dashboard/MyTodosWidget.tsx:1381`). 이 부분은 모바일 배려가 좋다.

반대로 `DailyClassTimelineWidget`의 주간 뷰는 `overflow-x-auto`와 `min-w-[640px]` 그리드를 사용한다(`src/features/dashboard/DailyClassTimelineWidget.tsx:1672`, `src/features/dashboard/DailyClassTimelineWidget.tsx:1674`). 주간 시간표에는 적합하지만, 모바일 첫 화면에서 핵심 정보를 빠르게 훑는 용도에는 비용이 크다. 모바일 기본은 `NextActionBanner` + 오늘 수업 한 줄 리스트 + 오늘 마감 todo 요약으로 접고, 상세 시간표는 펼치기/탭으로 보내는 것이 낫다.

## 5. 데이터 조회와 성능

대시보드는 client component에서 여러 React Query가 동시에 시작된다. 최상위는 게시글, 세미나, 학회보, 운영진 데이터 훅을 호출한다(`src/app/dashboard/page.tsx:89`, `src/app/dashboard/page.tsx:90`, `src/app/dashboard/page.tsx:91`, `src/app/dashboard/page.tsx:93`, `src/app/dashboard/page.tsx:94`). 운영진 전용 데이터는 `enabled: isStaff`로 일반 회원 쿼리를 막는다(`src/app/dashboard/page.tsx:92`, `src/features/member/useMembers.ts:71`, `src/features/member/useMembers.ts:87`, `src/features/inquiry/useInquiry.ts:7`, `src/features/inquiry/useInquiry.ts:15`).

기본 Firestore 래퍼는 `dataApi.list`가 `parseFilters`, `parseSort`, `limit`를 QueryConstraint로 변환한 뒤 `query(collection(db, table), ...constraints)`와 `getDocs`를 호출한다(`src/lib/bkend.ts:86`, `src/lib/bkend.ts:109`, `src/lib/bkend.ts:230`, `src/lib/bkend.ts:242`, `src/lib/bkend.ts:248`). 게시글과 세미나는 각각 limit 기반으로 가져온다(`src/features/board/useBoard.ts:27`, `src/features/board/useBoard.ts:30`, `src/features/board/useBoard.ts:31`, `src/features/seminar/useSeminar.ts:14`, `src/features/seminar/useSeminar.ts:18`).

중복 조회가 가장 큰 위험이다. 세미나는 `useSeminars`에서 200건을 가져오고(`src/features/seminar/useSeminar.ts:18`), `NextActionBanner`도 `seminarsApi.list({ limit: 50 })`를 별도 query key로 다시 호출한다(`src/features/dashboard/NextActionBanner.tsx:204`, `src/features/dashboard/NextActionBanner.tsx:206`, `src/features/dashboard/NextActionBanner.tsx:207`). 수업 todo는 `NextActionBanner`, `TodayTodosPopup`, `MyTodosWidget`, `DailyClassTimelineWidget`에서 같은 `['my-course-todos', userId]` key를 쓰는 곳도 있지만(`src/features/dashboard/NextActionBanner.tsx:163`, `src/features/dashboard/TodayTodosPopup.tsx:103`, `src/features/dashboard/MyTodosWidget.tsx:133`, `src/features/dashboard/DailyClassTimelineWidget.tsx:483`), staleTime이 60초/1분으로 짧고 화면 진입 직후 여러 컴포넌트가 같은 데이터를 소비한다.

N+1 패턴도 남아 있다. `PeerActivityFeed`는 raw feed의 authorIds마다 `profilesApi.get(uid)`를 `Promise.all`로 호출한다(`src/features/dashboard/PeerActivityFeed.tsx:132`, `src/features/dashboard/PeerActivityFeed.tsx:139`, `src/features/dashboard/PeerActivityFeed.tsx:143`, `src/features/dashboard/PeerActivityFeed.tsx:146`). 이미 `profilesApi.getMany`가 30개 단위 batch를 제공한다고 주석화되어 있으므로(`src/lib/bkend.ts:343`, `src/lib/bkend.ts:345`, `src/lib/bkend.ts:354`), 여기부터 바꾸는 것이 효과적이다. 과목명 매핑도 todoCourseIds마다 `courseOfferingsApi.get(id)`를 병렬 호출한다(`src/features/dashboard/MyTodosWidget.tsx:175`, `src/features/dashboard/MyTodosWidget.tsx:189`, `src/features/dashboard/MyTodosWidget.tsx:192`, `src/features/dashboard/TodayTodosPopup.tsx:153`, `src/features/dashboard/TodayTodosPopup.tsx:157`, `src/features/dashboard/TodayTodosPopup.tsx:160`).

## 6. 빈 상태와 신규 사용자 안내

신규 회원 온보딩은 가입 후 7일 이내에만 배너를 보여주고 localStorage로 닫힘을 기억한다(`src/features/dashboard/NewMemberWelcomeBanner.tsx:3`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:14`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:15`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:44`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:48`). CTA는 `인지디딤판`으로 연결된다(`src/features/dashboard/NewMemberWelcomeBanner.tsx:85`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:90`). 이 흐름은 명확하다.

빈 상태도 여러 위젯에 있다. 학사일정 미등록 시 운영진에게 입력 안내를 한다(`src/features/dashboard/AcademicCalendarProgress.tsx:69`, `src/features/dashboard/AcademicCalendarProgress.tsx:77`, `src/features/dashboard/AcademicCalendarProgress.tsx:79`). 내 학술활동이 없으면 스터디/프로젝트/대외활동 CTA를 제공한다(`src/features/dashboard/MyAcademicActivitiesWidget.tsx:81`, `src/features/dashboard/MyAcademicActivitiesWidget.tsx:84`, `src/features/dashboard/MyAcademicActivitiesWidget.tsx:88`). 종합시험 계획이 없으면 응시 계획 등록 CTA를 제공한다(`src/features/dashboard/ComprehensiveExamCountdown.tsx:116`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:119`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:123`). 할 일 탭은 비어 있을 때 간단한 문구를 보여준다(`src/features/dashboard/MyTodosWidget.tsx:1177`, `src/features/dashboard/MyTodosWidget.tsx:1182`, `src/features/dashboard/MyTodosWidget.tsx:1241`, `src/features/dashboard/MyTodosWidget.tsx:1247`).

약점은 신규 사용자가 "처음 무엇을 등록해야 대시보드가 살아나는지"를 한 번에 알기 어렵다는 점이다. 빈 상태가 위젯별로 흩어져 있고, 수업 수강/학술활동 참여/종합시험 계획/알림 설정을 순서화한 체크리스트가 없다. 신규 회원 배너는 디딤판으로 보내지만(`src/features/dashboard/NewMemberWelcomeBanner.tsx:81`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:86`), 대시보드 내부에서 첫 세팅 완료율을 보여주지는 않는다.

## 7. 개인화 가능성

현재 개인화는 일부 localStorage 수준이다. `NextActionBanner`는 사용자별 `hiddenUntil` 키로 오늘 숨김을 저장한다(`src/features/dashboard/NextActionBanner.tsx:42`, `src/features/dashboard/NextActionBanner.tsx:127`, `src/features/dashboard/NextActionBanner.tsx:147`). `TodayTodosPopup`은 팝업 표시 여부를 localStorage/sessionStorage로 관리한다(`src/features/dashboard/TodayTodosPopup.tsx:40`, `src/features/dashboard/TodayTodosPopup.tsx:67`, `src/features/dashboard/TodayTodosPopup.tsx:78`). `DailyClassTimelineWidget`은 시간표 view mode와 시간 범위를 브라우저에 저장한다(`src/features/dashboard/DailyClassTimelineWidget.tsx:199`, `src/features/dashboard/DailyClassTimelineWidget.tsx:217`, `src/features/dashboard/DailyClassTimelineWidget.tsx:232`, `src/features/dashboard/DailyClassTimelineWidget.tsx:1274`).

하지만 위젯 순서, 접힘 상태, 관심사 필터는 없다. 페이지는 고정된 섹션 순서를 그대로 렌더링한다(`src/app/dashboard/page.tsx:124`, `src/app/dashboard/page.tsx:174`, `src/app/dashboard/page.tsx:179`, `src/app/dashboard/page.tsx:194`, `src/app/dashboard/page.tsx:253`, `src/app/dashboard/page.tsx:297`, `src/app/dashboard/page.tsx:312`, `src/app/dashboard/page.tsx:330`). 따라서 졸업생은 세미나/학회보/동문 피드를 위로 올릴 수 없고, 운영진은 승인/문의/운영 업무를 최상단으로 끌어올릴 수 없다.

추천은 `dashboard_preferences` 또는 user profile의 `dashboardPrefs`에 widget order, collapsed widgets, 관심 카테고리, 피드 노출 여부를 저장하는 것이다. 이미 피드 opt-in은 사용자 프로필의 `notificationPrefs.feedOptIn`을 읽는다(`src/features/dashboard/PeerActivityFeed.tsx:11`, `src/features/dashboard/PeerActivityFeed.tsx:147`, `src/features/dashboard/PeerActivityFeed.tsx:150`, `src/features/dashboard/PeerActivityFeed.tsx:236`), 같은 패턴으로 대시보드 개인화를 확장할 수 있다.

## 8. 알림, D-day, 승인대기, CTA 품질

CTA 품질은 전반적으로 좋다. `NextActionBanner`는 클릭 전체가 목적지로 이동하고, `오늘 하루 숨기기`도 제공한다(`src/features/dashboard/NextActionBanner.tsx:327`, `src/features/dashboard/NextActionBanner.tsx:330`, `src/features/dashboard/NextActionBanner.tsx:378`, `src/features/dashboard/NextActionBanner.tsx:386`). 푸시 권한 프롬프트는 지원 여부, 권한 상태, 14일 dismiss를 확인하고 버튼 CTA를 제공한다(`src/features/dashboard/PushPermissionPrompt.tsx:67`, `src/features/dashboard/PushPermissionPrompt.tsx:73`, `src/features/dashboard/PushPermissionPrompt.tsx:78`, `src/features/dashboard/PushPermissionPrompt.tsx:144`, `src/features/dashboard/PushPermissionPrompt.tsx:153`). 실제 등록은 `/api/push/register`로 fetch한다(`src/lib/push.ts:7`, `src/lib/push.ts:103`).

D-day 계열은 종합시험 위젯이 가장 명확하다. planned/applied 상태 중 가장 가까운 시험을 골라 D-day를 표시한다(`src/features/dashboard/ComprehensiveExamCountdown.tsx:57`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:61`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:91`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:109`). 다만 대표 시작일이 학기 시작일 근사치라 실제 종합시험 일자와 다를 수 있다(`src/features/dashboard/ComprehensiveExamCountdown.tsx:20`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:21`). 시험 일자가 별도 필드로 생기면 정확도 개선이 필요하다.

운영진 CTA는 중복된다. 상단 통계 카드에 승인 대기/미답변 문의가 있고(`src/app/dashboard/page.tsx:211`, `src/app/dashboard/page.tsx:215`, `src/app/dashboard/page.tsx:221`), 최하단 관리 알림에도 같은 정보가 다시 나온다(`src/app/dashboard/page.tsx:391`, `src/app/dashboard/page.tsx:399`, `src/app/dashboard/page.tsx:412`). 운영진에게는 중복보다 최상단 집중 패널이 더 낫다.

## 9. 타 영역 연계 접점

대시보드는 이미 여러 영역으로 연결된다. 학기 Hero는 `/steppingstone`과 `/mypage/activities?tab=activities`로 보낸다(`src/components/dashboard/TermBriefHero.tsx:79`, `src/components/dashboard/TermBriefHero.tsx:86`). 할 일 추가는 수업 스케줄, 학술활동 상세, 세미나 호스트, 운영 업무수행철과 양방향 연동된다는 설명을 갖는다(`src/features/dashboard/MyTodosWidget.tsx:1427`, `src/features/dashboard/MyTodosWidget.tsx:1515`, `src/features/dashboard/MyTodosWidget.tsx:1591`, `src/features/dashboard/MyTodosWidget.tsx:1674`).

학술활동 위젯은 스터디/프로젝트/대외활동으로 보낸다(`src/features/dashboard/MyAcademicActivitiesWidget.tsx:20`, `src/features/dashboard/MyAcademicActivitiesWidget.tsx:88`). 세미나 캘린더와 신청 세미나 리스트는 `/seminars/[id]`로 이동한다(`src/features/dashboard/MiniCalendar.tsx:139`, `src/features/dashboard/MiniCalendar.tsx:141`, `src/app/dashboard/page.tsx:349`, `src/app/dashboard/page.tsx:351`). 게시판/뉴스레터도 통계 카드와 공지 리스트에서 연결된다(`src/app/dashboard/page.tsx:197`, `src/app/dashboard/page.tsx:246`, `src/app/dashboard/page.tsx:269`, `src/app/dashboard/page.tsx:271`).

부족한 접점은 아카이브/연구보고서/학술대회다. 연구 관련 todo는 proposals/reports를 가져와 이어 작성 항목을 만들지만(`src/features/dashboard/MyTodosWidget.tsx:281`, `src/features/dashboard/MyTodosWidget.tsx:292`, `src/features/dashboard/MyTodosWidget.tsx:342`), 대시보드 상단에 "최근 연구보고서", "내 학술대회 워크북", "아카이브 추천 자료" 같은 독립 접점은 없다. 학술대회 관련 API는 `bkend.ts`에 workbook/review/attendee review 계열이 있지만 대시보드 위젯에서는 직접 사용하지 않는다(`src/lib/bkend.ts:726`, `src/lib/bkend.ts:734`, `src/lib/bkend.ts:795`, `src/lib/bkend.ts:803`).

## 10. 추가 기능 우선순위

| 우선순위 | 기능 | 근거 | 예상 공수 |
|---|---|---|---|
| High | 모바일 상단 `오늘 요약` 패널: 다음 액션, 오늘 수업, 오늘 마감 todo를 한 카드로 통합 | 현재 상단은 Hero/배너 후 섹션 3에서야 수업/할 일이 나온다(`src/app/dashboard/page.tsx:162`, `src/app/dashboard/page.tsx:174`, `src/app/dashboard/page.tsx:179`). | 2-3일 |
| High | 운영진 홈 모드: 승인 대기/미답변/운영 todo를 최상단으로 승격 | 운영진 알림이 통계와 하단에 중복 배치된다(`src/app/dashboard/page.tsx:211`, `src/app/dashboard/page.tsx:390`). | 1-2일 |
| High | 대시보드 query 통합 훅 도입: 세미나/수업/todo/activity 공통 데이터 공유 | 세미나와 todo가 여러 컴포넌트에서 반복 조회된다(`src/features/dashboard/NextActionBanner.tsx:204`, `src/features/dashboard/MyTodosWidget.tsx:132`, `src/features/dashboard/TodayTodosPopup.tsx:103`). | 3-5일 |
| High | `PeerActivityFeed` author batch 조회로 N+1 제거 | 현재 authorIds를 `Promise.all(profilesApi.get)`로 조회한다(`src/features/dashboard/PeerActivityFeed.tsx:139`, `src/features/dashboard/PeerActivityFeed.tsx:143`, `src/features/dashboard/PeerActivityFeed.tsx:146`). `profilesApi.getMany`가 이미 있다(`src/lib/bkend.ts:343`, `src/lib/bkend.ts:354`). | 0.5-1일 |
| Medium | 위젯 접기/순서 저장 개인화 | 현재 섹션 순서가 고정이며 일부 숨김만 localStorage다(`src/app/dashboard/page.tsx:124`, `src/features/dashboard/NextActionBanner.tsx:42`, `src/features/dashboard/TodayTodosPopup.tsx:40`). | 4-6일 |
| Medium | 신규 회원 체크리스트: 수업 등록, 알림 켜기, 학술활동 참여, 프로필 완성 | 신규 배너는 7일 노출 후 사라지고 개별 빈 상태가 흩어져 있다(`src/features/dashboard/NewMemberWelcomeBanner.tsx:15`, `src/features/dashboard/NewMemberWelcomeBanner.tsx:48`, `src/features/dashboard/MyTodosWidget.tsx:1182`). | 2-3일 |
| Medium | 학술대회/아카이브 추천 위젯 | 학술대회/워크북 API는 있으나 대시보드 직접 접점이 없다(`src/lib/bkend.ts:726`, `src/lib/bkend.ts:795`). | 3-5일 |
| Medium | 학습 보조 위젯 접힘 기본값 또는 관심사 기반 노출 | `DailyReflectionPrompt`, `AIForumLiveWidget`, `SpacedRepetitionWidget`이 항상 본문 중간에 렌더링된다(`src/app/dashboard/page.tsx:319`, `src/app/dashboard/page.tsx:321`, `src/app/dashboard/page.tsx:325`, `src/app/dashboard/page.tsx:326`). | 1-2일 |
| Low | 종합시험 실제 날짜 필드 기반 D-day | 현재 학기 대표 시작일로 D-day를 계산한다(`src/features/dashboard/ComprehensiveExamCountdown.tsx:20`, `src/features/dashboard/ComprehensiveExamCountdown.tsx:57`). | 1-2일 |
| Low | 통계 카드 재설계: 단순 count에서 추세/최근 변화로 전환 | 현재 내 글/신청 세미나/최신 학회보는 정적 count/호수 중심이다(`src/app/dashboard/page.tsx:197`, `src/app/dashboard/page.tsx:204`, `src/app/dashboard/page.tsx:237`). | 2-4일 |

## 11. 실행 순서 제안

1. `PeerActivityFeed` N+1 제거와 세미나/todo query key 정리를 먼저 한다. 성능 리스크가 작고 효과가 즉시 보인다(`src/features/dashboard/PeerActivityFeed.tsx:139`, `src/lib/bkend.ts:343`).
2. 모바일 상단을 `오늘 요약`으로 재구성한다. 현재 `NextActionBanner`, `DailyClassTimelineWidget`, `MyTodosWidget`에 이미 필요한 데이터와 UI 조각이 있다(`src/features/dashboard/NextActionBanner.tsx:219`, `src/features/dashboard/DailyClassTimelineWidget.tsx:409`, `src/features/dashboard/MyTodosWidget.tsx:1177`).
3. 운영진/졸업생/학생 홈 모드를 분리한다. 이미 `canShowWidget`과 `isStaff` 분기 기반이 있으므로 확장 비용이 낮다(`src/features/dashboard/widget-visibility.ts:40`, `src/app/dashboard/page.tsx:88`).
4. 이후 개인화 저장과 학술대회/아카이브 추천을 추가한다. 이 단계는 데이터 모델과 UX 합의가 필요하므로 별도 스프린트가 적합하다.

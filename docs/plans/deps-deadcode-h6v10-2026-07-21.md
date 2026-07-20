# H6 의존성·데드코드 정리 감사 (v10 · 2026-07-21)

> **읽기 전용 감사 — 본 문서는 권고만 하며 어떤 코드도 수정·삭제하지 않았다.**
> 방법: node 임시 스크립트(스크래치패드, repo 밖)로 `src/`(1,375개 ts/tsx/js/mjs)+`scripts/`+루트 설정 전 파일의 import/require/dynamic-import/`export from`/CSS `@import`를 파싱 → 패키지별 사용 파일 수 집계 + `@/` alias 해석 기반 역참조 그래프로 미참조 파일 검출. 검출 결과는 전건 ripgrep 문자열 교차검증(동적 참조·주석·문자열 참조 오탐 제거) 완료.
> 근거 파일: package.json · tsconfig.json(`@/*`→`./src/*`) · vitest.config.ts · postcss.config.mjs · next.config.ts · src/app/layout.tsx 등.

---

## 1. 의존성 감사 (package.json 61항목 전수)

### 1-1. 미사용 의존성 (제거 후보 3건)

| 대상 | 근거 | 권고 | 위험도 |
|---|---|---|---|
| `ics` (dep) | src·scripts 전체에서 import 0건. ICS 생성은 3개 라우트가 **수기 문자열로 직접 구현**(`BEGIN:VCALENDAR` — `api/calendar/me.ics`·`public.ics`·`api/seminars/[id]/ics`). grep 시 "analytics/metrics" 등 부분문자열 오탐 다수 주의 | **제거** | 낮음 |
| `shadcn` (dep) | import 0건. CLI 도구이며 런타임 코드 아님 — 코드 내 언급은 주석 2곳뿐(`components/ui/label.tsx:6`·`SemesterRoadmap.tsx:181`), `components.json`은 CLI 설정 | **dependencies에서 제거** (컴포넌트 추가 시 `npx shadcn` 또는 devDep) | 낮음 |
| `@vitejs/plugin-react` (devDep) | `vitest.config.ts`가 plugins를 아예 등록하지 않음(environment: node, `src/**/*.test.ts`만 — tsx 테스트 없음). 코드베이스 어디에서도 참조 0건 | **제거** (향후 TSX 컴포넌트 테스트 도입 시 재설치) | 낮음 |

### 1-2. dep/devDep 오분류 (재배치 후보 2건)

| 대상 | 근거 | 권고 | 위험도 |
|---|---|---|---|
| `firebase-admin` (**devDep**) | **src 런타임 76파일이 import**(API route·server component — `api/activities/*` 등 다수). 현재 Vercel이 빌드 시 devDep을 설치하고 Next가 서버 코드를 번들하므로 우연히 동작하나, `--omit=dev` 설치·standalone 실행 환경에서 깨지는 구조 | **dependencies로 이동** (코드 무변경, package.json만) | 낮음 (이동 자체 무위험 · 방치 시 이식성 리스크) |
| `pdfjs-dist` (dep) | 코드 import 0건 — `lib/pdf-rasterize.ts:45`가 **`public/pdfjs/` 벤더 사본을 webpackIgnore 동적 import로 로드**(번들러 우회 설계, 주석에 명시). 패키지는 "버전 업데이트 시 public 재복사 원본" 역할만 | **devDependencies로 이동**(벤더링 원본 버전 추적용 유지, 제거는 비권고) | 낮음 |

### 1-3. "미사용처럼 보이나 실제 사용 — 유지" (grep 오탐 주의 표기)

| 대상 | 실사용 경로 | 판정 |
|---|---|---|
| `pretendard` | import 0건이지만 `src/app/layout.tsx:28` `localFont({ src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2" })` — **파일 경로 문자열로 node_modules 직접 참조** | **유지 (필수)** |
| `react-dom` | 직접 import 0건이나 React 19/Next 16 필수 peer 런타임 | **유지 (필수)** |
| `@tailwindcss/postcss` | `postcss.config.mjs`에서 **문자열 플러그인명**으로 참조(import 아님) | 유지 |
| `axe-core` | `scripts/a11y-smoke.mjs` (v9-M4 스모크) | 유지 (devDep 적정) |
| `@types/*`·`typescript`·`eslint`·`eslint-config-next`·`tailwindcss`·`@next/bundle-analyzer`·`vitest` | 암묵/설정 참조 | 유지 (devDep 적정) |
| `tw-animate-css` | `globals.css` `@import` | 유지 |

### 1-4. 중복 기능·과대 패키지 (통합 검토 후보)

| 묶음 | 실측 사용 | 권고 | 위험도 |
|---|---|---|---|
| **DOM→이미지 2종**: `html-to-image`(4파일) + `html2canvas-pro`(3파일) | 카드/카드뉴스·수료증 캡처 vs 연사후기·카드뉴스 다운로드 — 동일 목적 공존(card-news는 둘 다 사용) | 한쪽으로 수렴 검토(html-to-image 우선 후보). **렌더 결과 픽셀 차이 회귀 위험 → 화면별 비교 검증 후에만** | 중 |
| **PDF 3계열**: `@react-pdf/renderer`(9) + `jspdf`(3) + `puppeteer-core`+`@sparticuz/chromium-min`(서버 1) | React PDF 문서 / 클라 캔버스→PDF / 서버 HTML→PDF — 각기 다른 맥락에 정착 | 당장 통합 비권고(회귀 위험 > 실익). 신규 PDF는 `@react-pdf` 표준으로 문서화만 | 높음(통합 시) |
| **Gemini 2중**: `@ai-sdk/google`(2) + `@google/genai`(1 — `api/ai/poster` 이미지 생성) | ai-sdk 미지원 기능(이미지 생성) 때문일 개연 → **오탐 주의**: 단순 중복 아님 | ai-sdk 이미지 생성 지원 확인 후에만 통합 | 중 |
| **그래프 2계열**: `reactflow`(4 — /network) + `d3-force/drag/selection/zoom`(각 1 — /archive/graph) | 서로 다른 화면·패러다임 | 유지(통합 실익 낮음). 둘 다 v10-H2 동적 import 대상 | — |
| **과대 패키지**: `xlsx`(SheetJS 0.18.5 — npm판 업데이트 중단·알려진 취약점 이력) | 9파일(파싱·엑셀 export) | 장기: `exceljs` 등 대안 또는 SheetJS CDN 최신판 검토. 단기: v10-H2 동적 import로 번들 격리 | 중 |
| `qrcode.react`(생성)+`jsqr`(스캔) | 목적 상이 | 유지(중복 아님) | — |

---

## 2. 데드파일 후보 (import 0건 · 29건 / src 1,375파일)

검출 규칙: (a) app router 엔트리(page·layout·route·error·loading·not-found·global-error·opengraph-image 등)·`*.test.*`는 제외, (b) `@/` alias·상대경로·`export from`·dynamic import 전부 해석, (c) 잔여 후보 전건을 basename 문자열 ripgrep으로 재검증(동적 문자열 import·레지스트리 참조 오탐 제거 — 매치는 전부 주석뿐임을 확인).

**공통 오탐 주의**: `scripts/*.mjs` 중 일부가 과거 시점 src 경로를 참조했을 수 있고, 외부 문서·Firestore 설정 문자열로 컴포넌트명을 언급하는 경우(`console/onboarding-checklist` description 등)는 코드 참조가 아님을 확인함. 그래도 **삭제 전 `npm run build`+vitest 필수**.

| # | 파일 (src/…) | 크기 | 근거·대체 경위 | 권고 | 위험도 |
|---|---|---|---|---|---|
| 1 | `features/auth/SignupForm.tsx` | **44.8KB** | 구 monolith 가입 폼 — `signup-steps/` 단계형 플로우로 대체된 잔재 | 제거 | 낮음 |
| 2 | `features/auth/signup-steps/Step3Security.tsx` | 5.3KB | steps 중 유일하게 미참조(플로우 개편 시 탈락) | 제거 | 낮음 |
| 3 | `features/dashboard/NewMemberChecklistWidget.tsx` | **27.7KB** | `NewMemberOnboardingCard`로 역할 대체(해당 파일 주석 명시). **주의**: `lib/onboarding-evaluator.ts`가 "동일 규칙" 참조(주석) — 도메인 규칙 원본 문서 성격 | 제거 가능하나 **evaluator 규칙 동기 확인 후** | 중 |
| 4 | `features/dashboard/NewMemberWelcomeBanner.tsx` | 3.9KB | OnboardingCard 통합으로 미참조 | 제거 | 낮음 |
| 5 | `features/dashboard/MiniCalendar.tsx` | 5.4KB | `features/mypage/HabitTracker.tsx:376`이 **동명 내부 구현**을 별도 보유(중복 → §3) | 제거 | 낮음 |
| 6 | `features/dashboard/popup-coordination.ts` | 1.5KB | `notification-orchestrator.ts:9` 주석이 "Sprint1의 popup-coordination을 일반화" 명시 — 공식 대체 | 제거 | 낮음 |
| 7 | `components/notifications/PushPermissionPrompt.tsx` | 5.0KB | 대시보드는 `@/features/dashboard/PushPermissionPrompt`를 import — **동명 이중 구현 중 구본** | 제거 | 낮음 |
| 8 | `components/admin/StatusBadge.tsx` | 4.3KB | StatusBadge 토큰 표준화(게이트 150~157) 이후 미참조 구본 추정 | 제거 | 낮음 |
| 9 | `features/activities/ActivityWeeksPage.tsx` | **18.4KB** | 활동 주차 페이지 개편 잔재 | 제거 | 낮음 |
| 10 | `features/admin/AdminGreetingTab.tsx` | **17.6KB** | admin→console 이관 잔재 | 제거 | 낮음 |
| 11 | `features/admin/AdminUserList.tsx` | 8.1KB | 〃 | 제거 | 낮음 |
| 12 | `features/admin/settings/ActivityEditor.tsx` | 4.5KB | 〃 | 제거 | 낮음 |
| 13 | `components/admin/AdminFilterBar.tsx` | 1.1KB | 〃 | 제거 | 낮음 |
| 14 | `features/seminar/ReviewsSection.tsx` | 6.5KB | 후기 3분할 개편(2026-04) 이후 잔재 추정 | 제거 | 낮음 |
| 15 | `features/seminar/seminar-data.ts` | 6.1KB | 정적 데이터 → Firestore 이관 잔재 | 제거 | 낮음 |
| 16 | `features/seminar/SeminarStatusTabs.tsx` | 1.0KB | 미참조 | 제거 | 낮음 |
| 17 | `features/research/study-timer/StudyEndDialog.tsx` | 270B | 스텁(사실상 빈 파일) — 읽기타이머 개편 잔재 | 제거 | 낮음 |
| 18 | `features/research/study-timer/StudyTimerBar.tsx` | 281B | 〃 | 제거 | 낮음 |
| 19 | `components/activities/ActivityCard.tsx` | 966B | 미참조 | 제거 | 낮음 |
| 20 | `components/activities/ActivityFilter.tsx` | 887B | 미참조 | 제거 | 낮음 |
| 21 | `components/home/StatsSection.tsx` | 1.1KB | 홈 개편 잔재 | 제거 | 낮음 |
| 22 | `components/members/GenerationTabs.tsx` | 1.3KB | 미참조 | 제거 | 낮음 |
| 23 | `components/profile/ProfileAwards.tsx` | 2.7KB | 프로필 개편 잔재(아래 4건 동일 묶음) | 제거 | 낮음 |
| 24 | `components/profile/ProfileCertificates.tsx` | 2.9KB | 〃 | 제거 | 낮음 |
| 25 | `components/profile/ProfileContentCreations.tsx` | 2.5KB | 〃 | 제거 | 낮음 |
| 26 | `components/profile/ProfileExternalActivities.tsx` | 3.8KB | 〃 | 제거 | 낮음 |
| 27 | `components/profile/ProfileGraduateInfo.tsx` | 1.5KB | 〃 | 제거 | 낮음 |
| 28 | `components/ui/collapsible.tsx` | 658B | shadcn 프리미티브 — 자기 자신 외 참조 0 | 제거 (shadcn 재추가 용이) | 낮음 |
| 29 | `components/ui/pagination.tsx` | 1.6KB | 〃 | 제거 | 낮음 |

합계 약 **200KB** 소스(대형 4건 108KB 포함). 전부 제거해도 번들엔 이미 미포함(tree 밖)이므로 효과는 **유지비·인지부하·grep 노이즈 감소**가 본질.

---

## 3. 중복 구현 유틸 (수렴 후보)

| 유틸 | 정본 | 중복 재구현 (실측 위치) | 권고 | 위험도 |
|---|---|---|---|---|
| **formatDate** | `lib/utils.ts:39` (export) | 로컬 함수 **~10곳**: `console/card-news/page.tsx:17`·`[seriesId]/page.tsx:23`, `seminar-admin/PromotionTab.tsx:37`, `console/research/page.tsx:114`·`[userId]/page.tsx:35,51`, `console/potential-members/page.tsx:66`, `console/archive/review-queue/page.tsx:164`, `components/home/ActivityCards.tsx:16`, `board/InterviewResponseComments.tsx:30`, `auth/signup-steps/GuestHistoryPreviewDialog.tsx:31`, `insights/DiagnosticInsightsView.tsx:55`·`WeeklyOperationsSummary.tsx:50` | 정본으로 배치 수렴(표현 치환) — 단 각 로컬본 출력 포맷이 미묘히 다를 수 있어 **포맷 일치 확인 후 치환** | 낮음~중 |
| **timeAgo (상대시간)** | **정본 없음** | 4곳: `dashboard/PeerActivityFeed.tsx:71`, `comm-board/WallBoard.tsx:69`, `app/mypage/notifications/page.tsx:108`, `notifications/NotificationBell.tsx:41` | `lib/utils.ts`(또는 lib/time.ts)에 정본 신설 후 수렴 | 낮음 |
| **formatKoreanDate** | 정본 없음 | 4곳: `seminar-admin/NametagGenerator.tsx:27`, `dashboard/AlumniHomeWidgets.tsx:81`, `content-draft/draft-templates.ts:12`(export), `certificates/buildCertificateHtml.ts:30` | draft-templates 판을 lib로 승격 후 수렴 | 낮음 |
| **오늘 YMD / KST 날짜** | `lib/dday.ts:98,107` (`todayYmdLocal`·`todayYmdKst`) | 재구현 5곳+: `app/courses/[id]/schedule/page.tsx:148`(todayYmdLocal), `research/AdvisorFeedbackLog.tsx:51`·`mypage/HabitTracker.tsx:47`(todayYmd), `api/cron/content-draft-generator/route.ts:36`(kstTodayStr), `api/admin/insights/nudge/route.ts:48`(todayYmdKst 사본) + `kstToday(Date)` 2곳(`dashboard/SemesterCalendarWidget.tsx:55`, `console/academic-calendar/page.tsx:68`) | **우선 수렴 권장** — 로컬본이 KST/로컬 타임존을 제각각 처리해 자정 경계 버그 표면적(v9-H4 타임존 감사 계열). cron 2곳부터 dday.ts로 치환 | **중 (타임존 동작 차이 검증 필수)** |
| **학기 계산** | `lib/semester.ts:32,145` (`currentSemesterKey`·`currentSemesterRange`) | 3곳: `mypage/LearningStreak.tsx:168`(currentSemester), `mypage/useSemesterWrapped.ts:51`(getSemesterBounds), `app/leaderboard/page.tsx:52`(currentSemesterStartYmd) | 학기 **경계일 정의가 파일마다 다를 수 있음** — 정의 대조표 작성 후 semester.ts로 수렴(지표 불일치 해소 효과) | **중** |
| **MiniCalendar 컴포넌트** | — | `features/dashboard/MiniCalendar.tsx`(데드, §2-5) vs `features/mypage/HabitTracker.tsx:376` 내부 동명 함수 | 데드본 제거로 자연 해소 | 낮음 |
| **PushPermissionPrompt** | `features/dashboard/PushPermissionPrompt.tsx` (LIVE) | `components/notifications/PushPermissionPrompt.tsx` (데드, §2-7) | 데드본 제거로 자연 해소 | 낮음 |
| debounce | — | 명명된 중복 없음(0건) | 조치 불요 | — |

---

## 4. 후속 실행 순서 제안 (본 감사 범위 밖 — 별도 게이트에서)

1. **무위험 즉시**(package.json만): `firebase-admin`→dependencies, `pdfjs-dist`→devDependencies, `ics`·`shadcn`·`@vitejs/plugin-react` 제거 → `npm run build`+vitest 검증.
2. **데드파일 일괄 삭제**(§2 위험도 낮음 27건 → 빌드+테스트 → 중위험 2건은 규칙 동기 확인 후).
3. **유틸 수렴**은 KST/학기 계산(버그 표면적 감소 효과 큼)부터, formatDate류는 색상 부채(H4)와 유사한 배치 치환으로.
4. `depcheck`/`ts-prune` npm script 상시화는 v10-L2로 승계.

# 연세교육공학회 서비스 고도화 백로그 v15 — "연결·실주행·SEO 확장" (2026-07-21)

> 작성: 수석 서비스 플래너 (코드 실측 기반 · 채팅 인터뷰 없음)
> 대상: yonsei-edtech (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app)
> 실측 일자: 2026-07-21
> 직전 완료(v14): ESLint warning 360→273 (87건 감소) · knip 39→26 · console-research 분리 · bkend toRecord 헬퍼 · recharts Cell key · img→Image 6파일 · lazy loading

---

## 0. 재제안 금지선 (v14까지 완료)

### 0-1. 기술 부채 게이트 (확정값 — 변경 시 해당 파일만 수정)

| 지표 | v14 완료 수치 | 스크립트 |
|---|---|---|
| ESLint warning CEILING | **273** | `scripts/check-eslint-warning-ratchet.mjs` |
| raw color 파일 CEILING | **1** (`design-tokens.ts` 1건만 허용) | `scripts/check-rawcolor-ratchet.mjs` |
| knip deadcode CEILING | **26** | `scripts/check-deadcode-ratchet.mjs` |

### 0-2. v14 완료 항목 (재제안 절대 금지)

- H1~H6: ESLint warning 360→273 (87건 감소) — `opts` stable ref · analytics 상수 호이스팅 · dirLoading 별칭 제거 · useMemberMetrics 타입 정비 · suppress 의도 명시 · knip 39→26
- H5: eslint-disable suppress 주석 16곳 의도 명시 (mount-once / intentional 주석 병기)
- H6: knip deadcode 39→26 (13개 삭제)
- M1: `console/research/page.tsx` 1,208줄 → `src/features/console-research/` 16개 파일 분리
- M2: recharts `<Cell key={i}>` → `key={entry.name ?? i}` 차트 5개 파일
- M3: `src/lib/bkend.ts` `as unknown as` 28건 → `toRecord<T>()` 헬퍼 집중화
- M4: `<img>` → `<Image>` 전환 6파일 (MemberCard, ProfileHeader, BusinessCard 등)
- L2: `ResearchRow.tsx` 탭 5개 `next/dynamic` lazy loading

### 0-3. v14 잔여 이월 항목 (v15 배치 확정)

- **L1 이월**: OG 메타태그 감사 보고서(`docs/plans/l1-og-audit.md`) 작성 완료 — High 7개 구현 미착수 → **v15 H4**로 배치
- **L3 이월**: raw color 라운드5 (board·leaderboard·networking 파일 잔존) → **v15 M2**로 배치
- **v14-backlog 해커톤 UX (H1~H5)**: 해커톤 D-32·개강 D-42 직결 항목 미착수 → **v15 H1~H3, H5~H6**로 배치

---

## 1. v15 핵심 명제

> v14에서 ESLint·deadcode·타입 부채의 대대적 상환이 이루어져 코드 품질 게이트가 273/26/1로 탄탄해졌다. 그러나 이 기간 동안 **임박 이벤트 UX 갭**이 누적됐다: (a) 에듀테크 해커톤 D-32(8/22) — 아이디어→팀 매칭 흐름이 3화면 수동 왕복이고, D-day 카운트다운·실시간 참가 현황 표면이 없다. (b) 개강 D-42(9/1) — 신입 온보딩 파이프라인이 코드 완성 상태이나 테스트 계정 실주행 0회. (c) SEO 갭 — 공개 페이지 299개 중 metadata 보유 16개(5.4%)로 학회 핵심 라우트가 검색에 미노출. v15 각도를 **"연결(Connect) · 실주행(Rehearse) · SEO 확장(Reach)"** 으로 잡는다. 임박 이벤트 UX를 완성하고, 개강 전 온보딩을 실제로 걷고, OG 메타태그를 핵심 공개 페이지에 추가한다.

### 1-1. v15 실측 갭 (2026-07-21 기준)

| # | 렌즈 | 실측된 갭 | 근거 |
|---|---|---|---|
| ① | **해커톤 팀 형성 단절** | 아이디어 게시글→팀 신청 직결 경로 없음. 3단계 수동 왕복 | `src/features/hackathon/HackathonTeamView.tsx` · `hackathon_registrations` 단독 라우트 |
| ② | **해커톤 소통 표면 부재** | D-day 카운트다운·참가 팀 현황·pinned 공지가 허브에 없음 | `src/app/hackathon/page.tsx` · `HackathonPhaseTimeline.tsx` 날짜 정적 텍스트 |
| ③ | **신입 온보딩 미실주행** | `cohortKeyOf` 보정·semesterStart 공용화 코드 완성, 테스트 계정 실주행 0회 | `docs/plans/h3-h5-semester-fix-v13-2026-07-21.md` |
| ④ | **SEO 극저 커버리지** | metadata 16/299 (5.4%) — about/fields·board 4개·activities 상세 3개 High 누락 | `docs/plans/l1-og-audit.md` |
| ⑤ | **cron 무감시** | 성공률 추세 LIVE이나 임계 미달 자동 경보 없음. 8/22 해커톤 시즌 최대 부하 | `src/features/insights/CronLogsSection.tsx` · `cron-runs/trend` 라우트 |
| ⑥ | **개강 체크리스트 딥링크 부재** | 시즌 체크리스트 항목 클릭해도 해당 화면 이동 없음 — 운영진 수동 탐색 | `src/app/console/page.tsx` `UpcomingSeasonCard` `SeasonItem` |
| ⑦ | **ESLint/deadcode 게이트 수치 정체** | v14 완료 후 273/26 고정. 감축 트렌드 유지 없으면 내년 누적 위험 | `scripts/check-eslint-warning-ratchet.mjs:CEILING=273` |
| ⑧ | **img→Image 잔여 14파일** | v14-M4에서 6파일 전환, 억제 주석 14개 파일 잔존 | ESLint `@next/next/no-img-element` suppress 20파일 → 전환 6 → 잔여 14 |
| ⑨ | **raw color 라운드5 미완** | board·leaderboard·networking 파일 raw hex 잔존 | `src/app/board/` · `src/app/leaderboard/` · `src/features/networking/` |
| ⑩ | **단축키 힌트 v8부터 8라운드 이월** | Cmd+K 구현됐으나 어디서도 발견 불가. 마지막 기회 | `src/components/layout/CommandPalette.tsx` |

---

## 2. 고도화 백로그 (v15 · 21항목)

---

### High (즉시 착수 · 이벤트 직결 · 외부 의존 없음)

---

**H1. 해커톤 아이디어→팀 매칭 UX — 게시글 직결 숏컷 + 허브 필터 탭 (갭① · D-32)**
- **문제**: `/hackathon` 허브에서 아이디어를 보고 팀에 합류하려면 ① 작성자 개별 연락 → ② `/hackathon/register` 이동 → ③ 등록 폼 수동 작성의 3단계가 필요. `HackathonTeamView`와 `comm_boards` 게시글 간 참조 링크 없음.
- **제안 구현**:
  1. `comm_boards` 게시글 작성 폼에 `hackathonTag: "idea" | "team-wanted" | null` 라디오 추가(기본 null·하위호환)
  2. 아이디어/team-wanted 게시글 하단 "이 팀 합류 신청" 버튼 → `/hackathon/register?teamName=XXX` 쿼리 프리필로 등록 마찰 최소화
  3. 팀 등록 시 `ideaPostId` 선택 필드 추가 → `HackathonTeamView` 팀 카드에 "원본 아이디어 보기" 링크
  4. `/hackathon` 게시판 영역에 "전체 / 아이디어 / 팀원 구함" chip 탭 (클라이언트 필터)
- **담당 파일**: `src/features/hackathon/HackathonTeamView.tsx` · `src/app/hackathon/register/page.tsx` · `src/app/hackathon/page.tsx` · 보드 게시글 작성 폼
- **복잡도**: **M** | 신규 컬렉션: 불필요 (`comm_boards` 필드 추가 + 쿼리 파라미터)

---

**H2. 해커톤 참가자 실시간 소통 허브 — D-day 카운트·현황·pinned 공지 (갭② · D-32)**
- **문제**: `/hackathon` 허브에 "지금 몇 팀이 참가 중인지", "마감까지 며칠인지", "최신 운영진 공지가 무엇인지"를 알려주는 표면이 전혀 없다. `HackathonPhaseTimeline` 날짜가 정적 텍스트뿐.
- **제안 구현**:
  1. 현재 phase 마감일 역산 D-day 배너(`resolveHackathonPhase` + 기존 `HACKATHON_PHASE_TIMELINE` 재사용)
  2. `hackathon_registrations count()` 집계 → 허브 상단 "N팀 참가 중" 뱃지 (비로그인 포함, Firestore aggregate)
  3. `comm_boards` hackathon 컨텍스트 `pinned: true` 최신 공지 1건 허브 인라인 표시
  4. submission 단계 "제출 마감 D-N" 배지 amber(N≤7) / red(N≤3) 강조
- **담당 파일**: `src/app/hackathon/page.tsx` · `src/features/hackathon/HackathonPhaseTimeline.tsx` · `src/lib/bkend.ts`
- **복잡도**: **S~M** | 신규 컬렉션: 불필요

---

**H3. 개강 신입 온보딩 종단 리허설 + 경량 핫픽스 (갭③ · D-42 · 8/18 전 필수)**
- **문제**: v13에서 `cohortKeyOf` 8월 가입→다음학기 코호트 보정·`effectiveSemesterStart` 공용화·휴학자 분기가 완성됐으나, 테스트 계정으로 가입→승인→첫 로그인→첫 활동을 이어 걷는 실주행이 0회. 승인 이메일 문구·착지 URL·NewcomerProgressWidget 표시 타이밍·스터디 신청 마찰 미측정.
- **제안 구현**:
  1. 테스트 계정 가입 4단계(약관→계정→학적→선택) → 운영진 콘솔 승인 → 승인 이메일 수신·착지 URL 검증 → 첫 로그인(NewcomerProgressWidget 표시) → 첫 활동(진단평가 또는 스터디 신청 1건)
  2. 단계별 [기대 vs 실제] 체크리스트 → `docs/plans/newcomer-rehearsal-h3v15-{날짜}.md` 기록
  3. 발견 결함 경량 핫픽스 (문구 오타·CTA 착지 오류·빈 상태 누락 등 표현 계층만)
  4. 리허설 종료 후 테스트 계정 `delete-orphan-auth.mjs` 로 삭제
- **담당 파일**: `src/app/(auth)/signup/` · `src/app/api/email/approval/route.ts` · `src/features/dashboard/NewcomerProgressWidget.tsx` · `src/lib/semester.ts`
- **착수 데드라인**: **8월 18일 전** (개강 2주 전 여유 확보)
- **복잡도**: **S** (리허설) + 발견 결함 규모에 따라 S~M 추가

---

**H4. OG·메타태그 High 7개 일괄 추가 — SEO 갭 해소 (갭④)**
- **문제**: 공개 페이지 299개 중 metadata 보유 16개(5.4%). `l1-og-audit.md` 기준 High 우선순위 7개가 검색 미노출 상태: `/about/fields`, `/activities/studies/[id]`, `/activities/projects/[id]`, `/activities/external/[id]`, `/board/free`, `/board/promotion`, `/board/resources`
- **제안 구현**:
  - `/about/fields` → 정적 metadata (연구 분야 소개)
  - `/board/free`, `/board/promotion`, `/board/resources` → 정적 metadata (게시판 종류별 title·description·OG)
  - `/activities/studies/[id]`, `/activities/projects/[id]`, `/activities/external/[id]` → `generateMetadata` 동적 생성 (Firestore 서버 패치, title=활동명, description=설명 첫 100자, ogImage=포스터 or 기본)
- **담당 파일**: `src/app/about/fields/page.tsx` · `src/app/board/*/page.tsx` (3개) · `src/app/activities/studies/[id]/page.tsx` · `src/app/activities/projects/[id]/page.tsx` · `src/app/activities/external/[id]/page.tsx`
- **복잡도**: **S** (정적 3개) + **S~M** (동적 generateMetadata 4개)

---

**H5. 시즌 체크리스트 딥링크 — 개강 준비 바로가기 (갭⑥ · D-42)**
- **문제**: v13에서 시즌 체크리스트가 공유화됐으나 체크 항목 클릭 시 해당 화면으로 이동이 안 됨. 운영진이 항목 확인 후 별도 메뉴로 수동 이동 필요.
- **제안 구현**: `UpcomingSeasonCard` `SeasonItem`의 수동 체크 항목에 `href` 딥링크 추가
  - "아이디어 보드 공지 게시" → `/boards/new?context=hackathon`
  - "환영 게시글 작성" → `/boards/new?context=main`
  - "온보딩 시퀀스 확인" → `/console` cron-runs 필터 URL
  - "학사정보 캠페인 확인" → `/console/settings/academic-status`
  - 딥링크 미지원 항목은 메뉴 경로 안내 텍스트로 대체
- **담당 파일**: `src/app/console/page.tsx` (`UpcomingSeasonCard` · `SeasonItem`)
- **복잡도**: **S** | 신규 컬렉션: 불필요

---

**H6. cron 임계경보 게이트 — 콘솔 배지·배너 (갭⑤ · 8월 1~5일 착수)**
- **문제**: cron 성공률 추세 LIVE이나, 임계 미달 시 자동 경보 없어 운영진이 매번 직접 확인해야 함. 해커톤 시즌(8/22) = cron 최대 부하 시기.
- **제안 구현**:
  1. 8월 초 `cron-runs/trend` 실데이터(2개월 누적)로 kind별 성공률 분포 확인
  2. 임계 산정: 14일 이동 평균 < 80% && 직전 7일 대비 -15%p 동시 충족 시 경보
  3. `hackathon-submission-reminder` kind는 90% 임계 (더 엄격)
  4. 임계 하회 kind 발생 시 콘솔 랜딩 "cron 이상" 배지 (기존 pending 큐 배지 패턴 재사용)
  5. 이번 라운드는 콘솔 내 배지·배너 표식까지 (push/email 발송은 정책 확정 후 추가)
- **담당 파일**: `src/app/api/console/cron-runs/trend/route.ts` · `src/app/console/page.tsx` · `src/features/insights/CronLogsSection.tsx`
- **착수 시점**: **8월 1~5일** (데이터 도래 확인 후 즉시)
- **복잡도**: **S** | 신규 컬렉션: 불필요

---

### Medium (1~2 스프린트 · 코드 품질·구조·기능 강화)

---

**M1. ESLint warning 273→220 추가 감소 — 패턴 2차 상환**
- **문제**: v14에서 87건 감소했으나 273건 잔존. 상위 집중 파일의 잔여 패턴(key={i} 139파일 중 미처리·빈 exhaustive-deps 억제 수정 전환·기타 타입 단언 잔여)이 다음 누적을 일으킬 수 있다.
- **제안**: `npx eslint --format json` 결과 파일별 분류 → 상위 10개 파일 집중 처리. 패턴: `react/no-array-index-key`(목록형 컴포넌트 key 개선)·`@typescript-eslint/no-explicit-any`(타입 명시)·잔여 exhaustive-deps 억제 전환.
- **기대효과**: CEILING 273→220 (53건 추가 해소). 래칫 수치 갱신.
- **담당 파일**: ESLint 결과 상위 파일(착수 시점 재측정)
- **복잡도**: **M**

---

**M2. raw color 라운드5 완료 — board·leaderboard·networking 파일 (갭⑨ · L3 이월)**
- **문제**: raw color CEILING=1 달성됐으나, board·leaderboard·networking 영역 파일들의 raw hex가 ratchet 파일 수 계산에서 1건 내로 묶여 있는 상태. 다크모드 색상 불일치·브랜드 정합 잠재 결함원.
- **제안**: `gen-rawcolor-baseline.mjs` 재실행 후 대상 파일 확인 → 시맨틱 토큰 `var(--color-*)` 교체. 전환 후 라이트/다크 스모크 필수.
- **담당 파일**: `src/app/board/**` · `src/app/leaderboard/**` · `src/features/networking/**`
- **복잡도**: **M** | 전환 후 rawcolor ratchet CEILING=1 유지 확인 필수

---

**M3. knip deadcode 26→15 감축 — ratchet 상한 실질 인하**
- **문제**: v14에서 39→26으로 달성. CEILING=26 고정은 회귀 차단이지 감축 아님. 이번 라운드가 첫 실질 감축 시작.
- **제안**: `npm run lint:deadcode` 결과에서 파일 2건(즉시 삭제)·export 24건 중 안전 삭제 상위 11건(미참조 타입·유틸 함수) 제거 → gen-deadcode-baseline.mjs 재실행으로 CEILING 갱신.
- **담당 파일**: `scripts/gen-deadcode-baseline.mjs` · `knip.json` · 삭제 대상 다수
- **복잡도**: **S~M** | 동적 import 대상 삭제 전 grep 교차 확인 필수

---

**M4. web_vitals 목표선 + 회귀 배지 — v13-M4 이월 (8월 1~5일 착수)**
- **문제**: `web_vitals` 10% 샘플이 v9-H6부터 축적되어 `WebVitalsSection`이 LIVE이나, 목표선·회귀 감지 없이 수치만 나열.
- **제안**: 8월 초 2개월치 데이터로 라우트별 p75 기준선 산정 → Core Web Vitals 권장치(LCP 2.5s·CLS 0.1·INP 200ms) 대비 상태색 + 직전 2주 대비 악화 라우트 배지. 표본 N 미달 라우트는 "표본 부족" 레이블.
- **담당 파일**: `src/features/insights/WebVitalsSection.tsx` · `src/app/admin/insights/page.tsx`
- **착수 시점**: **8월 1~5일** (H6와 동시 착수 가능 · 파일 영역 독립)
- **복잡도**: **S**

---

**M5. kudos 리더보드 공개 — 해커톤·개강 참여 모멘텀 (9월초 볼륨 확인 후)**
- **문제**: v11-H2에서 kudos 관계 확장 완료. 해커톤·개강으로 kudos 볼륨이 최고조 예정이나 학회 전체 기여 순위·주차 추이 공개 표면 없음.
- **제안**: `/dashboard` 또는 `/mypage`에 "이번 달 kudos TOP 5" 위젯 + 본인 순위 강조. 주차 집계(`kudos.created_at` 7일 버킷). 이름은 기존 `display_name` 사용.
- **담당 파일**: `src/app/dashboard/page.tsx` · `src/features/kudos/` · `src/lib/bkend.ts`
- **착수 조건**: **9월 1일 이후 kudos 누적 N≥50 확인 후**
- **복잡도**: **S~M**

---

**M6. 해커톤 수상 발표 운영 체크리스트 — 8/22 당일 가이드 (8월 초 착수)**
- **문제**: v13-H2에서 수상→포트폴리오 1클릭·아카이브 딥링크 프리필이 완성됐으나 수상 발표 당일 운영진 실행 순서 가이드 없음.
- **제안**:
  1. `UpcomingSeasonCard` awards phase에 전용 수동 항목 추가: "수상 등급 입력 완료" → `/console/hackathon 심사 탭` / "수상작 일괄 공개" → 일괄 공개 버튼 / "포트폴리오 자동적재 공지" → `/boards/new` 딥링크
  2. 콘솔 hackathon 심사 탭 상단에 "수상 발표 절차" 접기 패널 인라인 안내 텍스트
- **담당 파일**: `src/app/console/page.tsx` · `src/app/console/hackathon/page.tsx`
- **착수 시점**: **8월 초 (H1·H2 이후)**
- **복잡도**: **S**

---

**M7. img→Image 전환 잔여 14파일 — LCP·WebP 최적화 (갭⑧ 이월)**
- **문제**: v14-M4에서 6파일 전환 완료. `// eslint-disable-next-line @next/next/no-img-element` 억제 잔여 14파일. Next.js Image 미전환 파일은 lazy load·WebP·srcSet 최적화를 받지 못해 LCP 저하 원인.
- **제안**: 고빈도 노출 순서 전환. `@react-pdf/renderer` 내부 `<Image>` 및 PDF 전용 컨텍스트는 전환 불가 — 억제 유지 + 이유 주석 추가.
  - 1순위: `src/features/seminar/SeminarCard.tsx`, `src/features/activities/ActivityCard.tsx`, `src/app/card-news/[id]/page.tsx`
  - 2순위: `src/features/alumni/AlumniCard.tsx`, `src/features/networking/NetworkingCard.tsx` 등
- **담당 파일**: 잔여 14파일 (착수 시 `eslint --rule @next/next/no-img-element` 재측정)
- **복잡도**: **M** (파일당 width/height 또는 fill + 래퍼 추가)

---

**M8. 세미나 라이브 참가자 반응 기능 — 실시간 emoji 반응 집계**
- **문제**: 현재 세미나 라이브에 강의노트·Q&A·설문·PDF 장표가 있으나, 참가자 실시간 반응(이해 여부·흥미도)을 강사가 즉각 파악하는 표면이 없다.
- **제안**:
  1. 라이브 참가자 화면에 emoji 반응 버튼 (👍 이해됨 / ❓ 다시 설명 / 🔥 흥미로움 — 3종)
  2. `seminar_live/{seminarId}/reactions/{slideId}` 컬렉션으로 onSnapshot 집계
  3. 강사(host) 화면에 슬라이드별 반응 카운터 표시 (5초 decay 또는 누적 선택)
- **담당 파일**: `src/features/seminar-live/` 신규 파일 2개(ReactionBar, ReactionPanel) + `src/app/seminars/[id]/live/page.tsx`
- **복잡도**: **M** | 신규 컬렉션: `seminar_live_reactions` (또는 기존 live_session 하위 문서)

---

**M9. 아카이브 관련 항목 크로스링크 자동 강화 — 개념·용어·연구방법 상호 연결**
- **문제**: 아카이브가 개념·통계방법·연구방법·변인·측정도구·용어·인용가이드 7개 영역으로 분리돼 있으나, 영역 간 관련 항목(예: SRL 개념 → 자기보고식 측정도구 → Pintrich 원전 → SRL 관련 논문)이 수동 링크 없이 고립되어 있다.
- **제안**:
  1. 각 아카이브 아이템에 `relatedIds: string[]` 필드 추가 (아이템 편집 UI에서 태그 방식 추가)
  2. 아이템 상세 페이지 하단 "관련 항목" 섹션 (타입 뱃지 + 이름 칩 링크)
  3. 기존 AECT 용어(aectTerm 필드)가 동일 개념 아카이브 아이템과 자동 매핑되는 경우 admin 백필 스크립트
- **담당 파일**: `src/features/archive/` · `src/app/archive/**` · `src/app/api/admin/archive-backfill/route.ts` (신규)
- **복잡도**: **M** | 신규 컬렉션: 불필요 (기존 컬렉션 필드 추가)

---

### Low (여유 시 검토 · 데이터 대기 · 경량 개선)

---

**L1. 단축키 상시 힌트 — Cmd+K 및 핵심 액션 tooltip 병기 (v8~v15 8라운드 이월 · 최종 경고)**
- Cmd+K 커맨드 팔레트 구현됨. 핵심 버튼(저장·제출·이동)에 `<kbd>` tooltip 병기.
- **담당 파일**: `src/components/layout/CommandPalette.tsx` · 각 핵심 버튼 컴포넌트 3~5곳
- **복잡도**: **S**
- **⚠️ 최종 경고: v15에서도 미구현 시 백로그에서 영구 삭제. v8부터 8라운드 연속 이월은 실질 수요 없음을 의미.**

---

**L2. OG 메타태그 Medium 추가 — board/staff, board/update, directory/[id] 등 5개 (갭④ 2차)**
- l1-og-audit Medium 등급 항목. H4 완료 후 착수.
  - `/board/staff`, `/board/update` → 정적 metadata
  - `/directory/[id]` → `generateMetadata` (회원 이름·소속 동적 생성)
  - `/boards/[boardId]/wall`, `/boards/[boardId]/present` → 정적 or 동적 metadata
- **담당 파일**: 해당 `page.tsx` 5개
- **복잡도**: **S**

---

**L3. 해커톤 실전 회고 집계 뷰 — 8/22 이후 즉시 (데이터 대기)**
- v14-backlog M6 이월. `/console/hackathon` 심사 탭에 "행사 결과 요약" 섹션 (참가 신청 N건·팀 확정 N팀·제출 N건·심사율·수상 N건·포트폴리오 자동적재 N건). 기존 컬렉션 집계 쿼리만 추가. 8/22 후 데이터가 채워지면 자동 완성.
- **담당 파일**: `src/app/console/hackathon/page.tsx` · `src/lib/bkend.ts`
- **착수**: **8/22 이후**
- **복잡도**: **S**

---

**L4. funnel 전환 개선 실험 — 개강 후 신입 유입 데이터 (9/15 이후)**
- 개강 후 신입 N≥30 유입 시 funnel 병목 라우트 특정 → 개선 가설 1건 착수.
- **착수 조건**: 9/15 이후 | **복잡도**: **M** (데이터 도래 후 재평가)

---

**L5. loyalty/adoption 코호트 기준선 — 학기 경계 1회전 후 (10월 이후)**
- `adoption/loyalty-snapshot` cron 1회전(약 3개월) 후 코호트별 retention 기준선 산정.
- **착수 조건**: 10월 이후 | **복잡도**: **S** (분석) + **M** (개선 구현)

---

**L6. 논문 여정 진행률 시각화 개선 — 4단계 퍼널 완성도 표시**
- **문제**: 논문 여정(계획서→설계→작성→보고서) 4단계가 구현됐으나, 사용자가 "전체 여정 중 어디쯤 있는지" 직관적으로 파악하는 전체 퍼널 시각화가 없음.
- **제안**: 마이페이지 논문 여정 섹션에 4단계 진행률 바(단계별 완료 여부·현재 위치 강조) + 각 단계 예상 소요 기간 안내 텍스트.
- **담당 파일**: `src/features/steppingstone/` 관련 진행률 컴포넌트 · `src/app/mypage/` 연결
- **복잡도**: **S~M**

---

## 3. 즉시 착수 Top 5 (병렬 편성안 · 파일 영역 비중복)

| 트랙 | 항목 | 파일 영역 | 착수 |
|---|---|---|---|
| **트랙 A** | **H1** 해커톤 팀 매칭 UX | `src/features/hackathon/HackathonTeamView.tsx` · `src/app/hackathon/` · boards 게시폼 | 즉시 |
| **트랙 B** | **H4** OG 메타태그 High 7개 | `src/app/about/` · `src/app/board/` · `src/app/activities/` | 즉시 (트랙 A와 파일 독립) |
| **트랙 C** | **H3** 온보딩 리허설 | `src/lib/semester.ts` · signup · newcomer cron (주로 읽기) | 즉시 (8/18 데드라인) |
| **트랙 D** | **H5** 체크리스트 딥링크 | `src/app/console/page.tsx` SeasonItem 단독 | 즉시 |
| **트랙 E** | **H2** 해커톤 D-day 허브 | `src/app/hackathon/page.tsx` · HackathonPhaseTimeline | H1 완료 후 (같은 hackathon 영역) |

> **병렬 규칙:**
> - 트랙 A와 E는 `src/app/hackathon/` 파일 영역 겹침 → **A 완료 후 E 착수(순차).**
> - 트랙 B·C·D는 트랙 A와 파일 영역 독립 → **즉시 병렬 launch 가능.**
> - H6(cron 임계경보) · M4(web_vitals)는 8/1~5 데이터 도래 신호 확인 후 병렬 launch.
> - M5(kudos 리더보드)는 9/1 이후 볼륨 확인 후.
> - **배포 게이트**: `tsc` · `build` · rawcolor ratchet(CEILING=1) · ESLint ratchet(CEILING=273) · deadcode ratchet(CEILING=26) 전량 PASS + 배포 후 QA 스모크(해커톤 허브·콘솔 랜딩·마이페이지·신규 가입 폼) 필수.

---

## 4. 수치 목표 요약

| 지표 | v14 완료 | v15 목표 | 핵심 항목 |
|---|---|---|---|
| ESLint warning | CEILING=273 | **CEILING=220** (53건↓) | M1 |
| raw color 파일 | CEILING=1 | **유지 (1 이하)** | M2 완료 후 동일 유지 |
| knip deadcode | CEILING=26 | **CEILING=15** (11건↓) | M3 |
| `<img>` 잔여 파일 | ~14개 | **~4개** (억제 10건 제거) | M7 |
| OG metadata 보유 페이지 | 16개 (5.4%) | **28개 이상** (H4 7개 + L2 5개) | H4, L2 |
| 해커톤 UX 갭 | 3단계 수동 왕복 | **1클릭 매칭 + D-day 허브** | H1, H2 |
| 온보딩 실주행 | 0회 | **리허설 1회 + 결함 핫픽스** | H3 |

---

## 5. 외부 의존 (운영진 결정 필요)

| 항목 | 의존 대상 | 코드 연결 |
|---|---|---|
| **X1: 해커톤 심사위원 배정·외부 심사위원 여부** | 운영진 기획 | 외부 심사위원 필요 시 `/hackathon/judge` 전용 라우트 추가 (S~M) |
| **X2: 해커톤 심사 루브릭 확정** (항목·배점·가중치) | 운영진 기획 | 루브릭 확정 시 `JudgingCard` 항목별 입력 UI 고정 (S) |
| **X3: cron 임계경보 발송 정책** (quiet-hours·빈도·수신자) | 운영진 알림 정책 합의 | H6는 콘솔 배지까지. push/email 발송은 정책 확정 후 추가 (S) |
| **X4: 신학기 콘텐츠 작성** (환영 공지·스터디 모집·세미나 일정) | 운영진 콘텐츠 발행 | H5 딥링크 착지 페이지에서 직접 작성 — 코드 준비됨 |
| **X5: kudos 수신 대상 확대** (비활성 회원 재활성화) | 운영진 발송 정책 결정 | 발송 대상 필터 조정 코드 S 규모 |
| **X6: Firestore 정기 export/백업 GCP 스케줄 승인** | GCP 프로젝트 설정 | 장기 carryover |

---

## 6. 데이터 대기 항목 (v15 기간 내 전환 예정)

| 항목 | 의존 데이터 | 재평가 시점 |
|---|---|---|
| **cron 임계경보 (H6)** | trend 2개월 성공률 분포 | **8/1~5 즉시** |
| **web_vitals 목표선 (M4)** | 라우트별 p75 2개월 누적 | **8/1~5 즉시** |
| **kudos 리더보드 (M5)** | 해커톤·개강 kudos N≥50 | **9/1 이후** |
| **해커톤 회고 집계 (L3)** | 8/22 행사 실데이터 | **8/22 이후 즉시** |
| **funnel 전환 실험 (L4)** | 개강 후 신입 유입 funnel | **9/15 이후** |
| **코호트 기준선 (L5)** | 학기 경계 1회전 | **10월 이후** |

---

*파일: `docs/plans/service-enhancement-plan-v15.md` | 생성: 2026-07-21 | 다음 재검토: 8/22 해커톤 실전 데이터 확보 후 v16 편성*

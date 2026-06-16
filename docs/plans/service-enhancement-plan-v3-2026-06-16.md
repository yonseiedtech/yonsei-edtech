# 연세교육공학회 서비스 3차 고도화·개선 기획 (Round 3)

> 작성일 2026-06-16 · 대상 `C:\work\yonsei-edtech` (Next.js 16 + Firestore) · **읽기·기획 전용**(코드 수정·배포 없음)
>
> 전제: 회원 = 교육공학 전공 대학원생·졸업생, 운영진 소수. **1차(H1~H4·M1~M5·L 일부)·2차(R1~R4·M1~M5·UI 색상·StatusBadge) 백로그는 전 항목 LIVE.** 이 문서는 **1·2차 항목을 제외하고, 현재 LIVE 코드를 새로 실측해 발굴한 3차 기회만** 담는다.
>
> 우선순위 기준: (1) **이미 만든 기능의 발견성·통합**(라우트 50+·feature 50+로 폭증했으나 "찾기"가 안 됨) (2) **2차 데이터 환류의 미완성 마지막 고리**(R4 학습효과 증명 등) (3) 회원 가치 (4) 소수 운영진 부담 경감 (5) **누적된 기술부채**(하드코딩 색상 2,157곳·236파일) — 기존 자산 재사용·quick win 우선.

---

## 0. 2차 대비 무엇이 달라졌나 (재진단 출발점)

2차 이후 LIVE된 것(중복 발굴 금지 대상, 실측 확인):

- **R1 암기카드 복습 알림 cron** → `app/api/cron/flashcard-review-reminder` 신설. ✅
- **R2 개인화 주간 다이제스트** → `weekly-digest/route.ts`에 "나의 한 주"(잔디 활동일·연구 타이머 분·due 카드 수·진단 준비도 변화) collection-wide 1회 집계로 LIVE. ✅
- **R3 암기카드 학습 대시보드** → `components/flashcard/FlashcardDashboard.tsx` + 마이페이지 위젯. ✅
- **M1 연구 진행도 위젯** → `features/research/ThesisProgressWidget.tsx`(마이페이지 card variant 노출). ✅
- **M3 운영 인사이트 액션화** → `features/insights/InsightsActionPanel.tsx` + `/api/admin/insights/nudge` (churn_risk·diagnosis_missing·복습지연 3종 넛지 인앱+푸시 1클릭 발송, 옵트아웃·1일1회·상한 안전장치). ✅
- **M5 콘텐츠 자동 초안** → `features/content-draft/`(세미나→카드뉴스 슬라이드·뉴스레터 섹션·안내문/후기 필드 매핑) + `SeminarDraftPicker`. ✅
- **동기이론 패널** → `ARCSPanel`·`ConnectivismPanel`(마이페이지), `DiagnosticWeakConceptPath`. ✅
- **신규 콘텐츠 도메인** → `journal`(학회지/논문집: 발행호·심사·동의·집필 컴포넌트)·`labs`(연구실+QA wall)·`directory`·`progress-meetings`(진도 미팅)·`collaborative-research`(공동연구자 추천)·`portfolio`(학술 포트폴리오 + `/console/portfolio-verification`). ✅
- **운영 콘솔 폭증** → `/console` 하위 40+ 라우트(audit-log·alumni-mapping·portfolio-verification·onboarding-checklist·transition·fees 등).

**새로 드러난 핵심 약점(3차 주제) — "만든 건 많은데, 못 찾고·못 끝맺었다":**
1. **발견성 붕괴 (최대 신규 약점).** 앱 라우트 50+·feature 50+·콘솔 40+로 폭증했으나 **전역 검색/커맨드 팔레트가 전혀 없다**(`globalsearch`·`command palette`·`spotlight` 0건). 졸업생 논문 134편·아카이브 개념·세미나·강의·암기카드·연구 도구가 쌓일수록 "어디 있는지"를 못 찾는다. 기능 추가보다 **연결·발견** ROI가 더 높아진 변곡점.
2. **2차 환류의 마지막 고리 R4 미완.** R1~R3은 LIVE지만 **R4(진단↔복습 상관 = 학습효과 증명)는 미착수**(`correlation`·`재진단 정답률` 0건). "노력이 결과로"를 데이터로 증명하는 동기 최강 레버가 여전히 비어 있음.
3. **기술부채 누적·고착.** 시맨틱색 단일화(1차)에도 **raw 팔레트 색상이 236파일·2,157곳 잔존**(`bg/text/border-{red|blue|...}-N`). 신규 도메인(journal·labs)이 늘며 부채가 재생산 중. 다크모드·브랜드 일관성·유지보수 리스크.

---

## 1. 현황 재진단

### 1-1. 강점 (2차 이후 강화분 포함)

| 영역 | 강점 |
|---|---|
| 데이터 환류 (2차 성과) | R1 복습 알림·R2 개인화 다이제스트·R3 학습 대시보드·M3 넛지 액션화로 "쌓인 데이터 → 알림·개인화·운영액션" 루프가 대부분 닫힘. |
| 콘텐츠 도메인 폭 | 진단·암기카드·연구 에디터·아카이브·졸업생 논문·심사 연습 + 신규 journal(학회지)·labs(연구실)·portfolio(학술 포트폴리오)·collaborative-research·progress-meetings. 학회 전 라이프사이클 커버. |
| 운영 자동화·콘솔 | cron 19종·넛지 1클릭 발송·insights 통합·content-draft 자동 초안·audit-log·portfolio-verification·onboarding-checklist. 소수 운영진 도구 성숙. |
| 동기·증명 | 잔디 3영역·리더보드·마일스톤·피어 비교 + ARCS/연결주의 동기이론 패널·연구 진행도 위젯. |

### 1-2. 새 약점·미흡 영역 (3차 발굴, 실측 기반)

**A. 발견성·통합 (최대 신규 기회)**
- **전역 검색 부재 (확정 갭).** 커맨드 팔레트/통합 검색이 0건. 회원이 "내 강의 후기", "○○ 개념 아카이브", "△△ 졸업생 논문", "내 due 암기카드"를 한 입구에서 못 찾음. 라우트 50+ 시대에 가장 큰 마찰.
- **신규 도메인의 진입 동선 약함.** journal·labs·directory·progress-meetings·collaborative-research가 라우트로는 존재하나, 마이페이지·대시보드·전역 네비에서 **상황 맞춤 노출**이 빈약(에디터 도구 추천 M2는 v2에서 식별만). "있는 줄 모르는" 기능 다수.
- **whats-new·help 활용 한계.** `/whats-new`·`/help` 정적 페이지는 있으나, 신규 기능을 **개인 컨텍스트에 맞춰** 안내(예: "포트폴리오가 비어 있어요 → 채우기")하는 능동 가이드 부재.

**B. 2차 환류의 미완성 — R4 학습효과 증명 (확정 갭)**
- **R4 미착수.** 진단 다회차 + flashcard 복습 데이터가 모두 쌓이는데, "약점 개념 N회 복습 → 재진단 정답률 +X%p" 개인 인사이트·개념 단위 시계열 추세가 없음. 2차 로드맵 6~8주차 핵심이었으나 LIVE 안 됨. **동기의 최강 레버가 미완.**
- **읽기·심사 데이터 환류 부분 미완.** `paper_reading_logs`·심사 STT 채점은 잔디·기록엔 반영되나, "읽기 누적 → 연구 진척"·"심사 연습 추세·피어 분포"의 증명 루프는 없음(v2 L4 미착수).

**C. 회원 가치 — 자산화·재참여**
- **포트폴리오 자산화 미완.** `portfolio.ts`·`ProfilePortfolio`·`/console/portfolio-verification`로 골격은 LIVE이나, **회원이 활동→포트폴리오를 자동 적재**(세미나 발표·연구·심사·수료를 역할/산출물로 자동 수집)하고 **PDF/공유 링크로 내보내기**(졸업·취업·진학용)하는 출구가 약함. ProfilePortfolio에 export/pdf 흔적 없음.
- **졸업생 멘토링 여전히 부재.** mentor 역할 타입(`portfolio.ts`)은 있으나 재학생↔졸업생 연결 메커니즘 미구현(1차 L1·2차 M4 연속 미착수). collaborative-research(공동연구자 추천) 자산을 동문 멘토 매칭으로 확장할 여지.
- **journal(학회지) 회원 참여 동선 약함.** 발행·심사·집필 컴포넌트는 있으나, "내가 투고할 수 있다/심사 요청이 왔다"를 회원에게 알리는 알림·마이페이지 통합이 약함.

**D. 운영 효율 — 데이터 출구·검증**
- **데이터 내보내기 부재 (확정 갭).** `/console` 어디에도 CSV/데이터 export 없음. 회원·활동·진단·수료 통계를 외부(보고서·학과 제출·백업)로 빼낼 출구가 없어 운영진이 수동 복사.
- **아카이브 인용 벌크 검증 보조 미실현.** purifiedName·배지(수동)는 LIVE이나 RISS/KCI 벌크 검증 워크플로는 1·2차 연속 미착수(L1).
- **journal 전용 운영 콘솔 부재.** `/console`에 journal 디렉토리 없음(labs는 있음). 학회지 발행·심사 배정이 공개 라우트 role-gating으로만 운영 → 운영 한눈 관리면 부재.

### 1-3. 기능 중복·기술 부채 (신규/누적 관찰)

| 항목 | 현황 (실측) | 판정 |
|---|---|---|
| **하드코딩 색상** | raw 팔레트(`bg/text/border-{red\|blue\|green\|...}-N`) **236파일·2,157곳** 잔존. 1차 시맨틱 단일화 이후에도 신규 도메인에서 재생산. | **최대 기술부채.** 단계적 마이그레이션 필요(번들이라 우선순위化) |
| `board` / `boards` / `comm-board` | board=카테고리, boards=`/boards/[boardId]` 라우트 잔존, comm-board=Q&A. 3중 잔존. | 2차 L2 미해소. boards 잔존분 폐기·통합 재확인 |
| `network` / `networking` / `gatherings` | 컬렉션·라우트·feature 3중 용어 + `/gatherings` 라우트 잔존. | 저위험 부채. 코드 레벨 용어 통합 여지 |
| cron 19종 단일 파일 | 수신자 필터·로깅·옵트아웃 중복 패턴(R1/R2가 collection-wide 집계로 일부 모범사례화) | 공통 유틸 추출(저위험, R2 패턴 표준화) |
| 콘솔 40+ 라우트 | 일부 일회성 마이그레이션 라우트(inject-spring-2026-schedule·migrate-applicants) 잔존 | 종료된 마이그레이션 라우트 정리 |

---

## 2. 3차 고도화 백로그

각 항목: 목적·기대효과 · 규모(S<1주 / M 1~2주 / L 3주+) · 우선순위 · 연계 자산. **발견성·R4 환류 완성·자산화를 최우선 가점.**

### High (다음 1개월 최우선) — "만든 걸 찾게 하고, 증명을 끝맺는다"

| # | 항목 | 목적·기대효과 | 규모 | 연계 |
|---|---|---|---|---|
| **G1** | **전역 검색 · 커맨드 팔레트** | `⌘K`/검색 입구 1개로 라우트·졸업생 논문·아카이브 개념·세미나·강의·내 암기카드·내 활동을 통합 검색. 인덱스는 기존 react-query 캐시·bkend 조회 재사용(클라이언트 fuzzy + 서버 limit). **라우트 50+ 시대 최대 마찰 해소 = 발견성 최고 ROI.** | **M** | 전 도메인 api·react-query·navbar |
| **G2** | **R4 학습효과 증명 루프(진단↔복습 상관)** | 진단 약점 개념별 시계열 추세 + "이 개념 암기카드 N회 복습 후 재진단 정답률 +X%p" 개인 인사이트. 진단 다회차(`diagnostic_results`)·flashcard 복습 교차 분석. **2차 미완 마지막 고리 — 동기 최강 레버.** | **M** | diagnostic_results 다회차·flashcards·DiagnosticWeakConceptPath·DiagnosisHistorySection |
| **G3** | **포트폴리오 자동 적재 + 내보내기(PDF/공유)** | 세미나 발표·연구·심사·수료·활동을 역할/산출물로 **자동 수집**해 ProfilePortfolio에 적재 + **PDF/공유 링크 내보내기**(졸업·진학·취업용). portfolio.ts·ProfilePortfolio·certificate PDF 라우트 재사용. **축적 활동의 출구 = 회원이 체감하는 자산.** | **M** | portfolio.ts·ProfilePortfolio·activities·seminar·certificates·defense |
| **G4** | **운영 데이터 내보내기(CSV/Export)** | `/console` 회원·활동·진단·수료·로얄티 표를 CSV로 1클릭 내보내기(학과 제출·보고서·백업). 기존 insights 집계·테이블 재사용. **소수 운영진 수동 복사 제거 = 직접 효과 quick win.** | **S** | insights·members·certificates·console |

### Medium (1~2개월)

| # | 항목 | 목적·기대효과 | 규모 | 연계 |
|---|---|---|---|---|
| **M1** | **하드코딩 색상 마이그레이션(번들 1: 고빈도·핵심 페이지)** | 2,157곳 중 마이페이지·대시보드·연구·진단 등 **회원 동선 핵심 파일 우선** raw 팔레트→시맨틱 토큰 치환. DESIGN.md §2.1 매핑 준수. 다크모드·브랜드 일관성·부채 감소. | M | DESIGN.md·globals.css·StatusBadge |
| **M2** | **상황 맞춤 능동 가이드(개인화 발견성)** | 마이페이지/대시보드에 "안 채운 포트폴리오·안 써본 도구·미응시 진단·due 카드"를 컨텍스트로 1~2개 추천(2차 M2 에디터 추천을 전역으로 확장). whats-new/help를 능동 넛지로. | M | user_activity_logs·portfolio·diagnosis·flashcards·NextActionBanner |
| **M3** | **졸업생↔재학생 멘토링 1차** | collaborative-research(공동연구자 추천) 엔진을 동문 멘토 매칭으로 확장 — "비슷한 주제 선배" 추천 + comm-board 패턴 1:1 코멘트 채널. mentor 역할 타입 이미 존재. (1차 L1·2차 M4 연속 carryover) | L | alumni·collaborative-research·research-analytics·comm-board |
| **M4** | **journal(학회지) 운영 콘솔 + 회원 참여 알림** | `/console/journal` 발행호·투고·심사 배정 한눈 관리 + "투고 가능/심사 요청 도착"을 회원 알림·마이페이지에 통합. journal 컴포넌트(심사·동의·집필) 재사용. | M | journal feature·notifications·console |
| **M5** | **읽기·심사 환류(증명 루프 확장)** | `paper_reading_logs` 누적→연구 진척 연결 + 심사 STT 채점 시계열·피어 분포(2차 L4). G2 R4와 동일 "증명" 패턴 확장. | M | paper_reading_logs·defense STT·research |

### Low (여유 시)

| # | 항목 | 목적·기대효과 | 규모 |
|---|---|---|---|
| L1 | 하드코딩 색상 마이그레이션 번들 2~3(나머지 ~1,900곳, 도메인별 일괄) | 부채 완전 해소·재생산 방지(lint 규칙 추가 검토). | M~L |
| L2 | 기술부채: boards/gatherings 잔존 라우트 폐기·network 용어 코드 통합·종료된 콘솔 마이그레이션 라우트 정리·cron 공통 유틸 추출(R2 패턴 표준화) | 유지보수·혼동 경감. | S~M |
| L3 | 아카이브 인용 벌크 검증 보조도구(운영진용, RISS/KCI) | 할루시네이션 리스크 관리(1·2차 연속 carryover). | M |
| L4 | 잔디 비활성 영역 자동 코칭(연구/학술/대학원생활 균형 넛지) | 균형 활동 유도(2차 L3 carryover). | M |
| L5 | 진단 적응형·동적 문항 생성(난이도 기반, codex 정확성 교차검증) | 진단 정교화(2차 L5 carryover). | L |

---

## 3. 운영 효율화 (소수 운영진 부담 경감) — 3차 관점

1·2차에서 알림·상태전환·넛지 발송·콘텐츠 초안까지 자동화. 3차는 **데이터 출구(export)**·**한눈 관리면(journal 콘솔)**·**검증 보조**에 집중.

| 영역 | 현재 | 3차 제안 | 효과 | 규모 |
|---|---|---|---|---|
| 데이터 출구 | export 전무(수동 복사) | **G4 CSV 내보내기** | 학과 제출·보고·백업 자동화 | S |
| 학회지 운영 | 공개 라우트 role-gating만 | **M4 `/console/journal` 한눈 관리** | 발행·심사 배정 가시화 | M |
| 발견성 | 정적 whats-new/help | M2 능동 가이드 | 신규 기능 채택률↑ | M |
| 인용 검증 | 수동 배지 | L3 RISS/KCI 벌크 보조 | 리스크 관리 | M |
| 유지보수 | 색상 부채 2,157곳·중복 라우트 | M1·L1·L2 정리 | 부채·혼동 경감 | M~L |

**운영 quick win:** G4 CSV 내보내기(S) · L2 종료된 마이그레이션/잔존 라우트 정리(S).

---

## 4. 로드맵 (다음 1~2개월)

원칙: **발견성(G1)·증명 완성(G2)·자산 출구(G3·G4) 먼저.** 기능 추가보다 "연결·증명·출구"가 현 단계 ROI 정점. 부채는 핵심 동선부터 단계 마이그레이션.

### 4-1. Quick Win (1~2주, 즉시 효과)
- **G4 운영 데이터 내보내기(CSV)** — S. insights 집계·테이블 재사용, export 유틸 1개. **운영진 수동 복사 제거.**
- **L2 잔존/종료 라우트 정리** — S. boards·gatherings·일회성 마이그레이션 라우트.
- G1 1단계: 커맨드 팔레트 골격 + 라우트·내 활동 검색부터(논문·아카이브 인덱스는 후속).

### 4-2. 4주 차 핵심 (발견성·증명 완성)
- **G1 전역 검색·커맨드 팔레트** 전체(졸업생 논문·아카이브·세미나·강의·암기카드 통합)
- **G2 R4 학습효과 증명 루프**(진단↔복습 상관) — 2차 미완 마지막 고리
- **G3 포트폴리오 자동 적재 + 내보내기**

### 4-3. 6~8주 차 (자산화·부채)
- **M1 하드코딩 색상 마이그레이션 번들 1**(핵심 동선)
- M2 상황 맞춤 능동 가이드
- M4 journal 운영 콘솔 + 회원 알림

### 4-4. 백로그(추후)
- M3 졸업생 멘토링 · M5 읽기/심사 증명 확장 · L1~L5

**빠른 효과 vs 큰 투자**
- 빠른 효과: G4, L2, G1 1단계
- 큰 투자: G1 전체, G2 상관 분석, G3 자동 적재, M1/L1 색상 마이그레이션, M3 멘토링

---

## 5. 외부 의존 항목 (운영진 결정·콘텐츠 발행 필요 — 코드만으로 불가)

| 항목 | 막힌 이유 | 필요한 결정 |
|---|---|---|
| G3 포트폴리오 내보내기 | 졸업·진학·취업용 공유 링크의 **공개 범위·개인정보** 정책 | 운영진이 외부 공유 가능 필드·만료 정책 결정 |
| G4 데이터 내보내기 | 회원 개인정보 포함 CSV의 **추출 권한·보관·파기** 정책 | 운영진 권한 범위·취급 방침 합의 |
| M3 멘토링 | 졸업생 참여 의사·매칭 동의·개인정보 노출 범위 | 졸업생 모집·동의 절차(운영진 오프라인) |
| M4 journal 운영 | 투고·심사 워크플로(심사위원 배정·라운드·게재 결정) 정책 | 편집위원회 운영 규정 확정 |
| L3 인용 검증 | RISS/KCI API/스크래핑 가용성·저작권 | 외부 데이터 접근 방식 승인 |
| L5 동적 문항 생성 | LLM 출제 정확성 검증 책임(codex 교차검증) | 출제 품질 게이트 정책 |

---

## 6. 핵심 결론 (우선 3가지)

1. **만든 걸 찾게 하라(G1).** 라우트 50+·feature 50+로 폭증했으나 전역 검색이 0건 — 현 단계 최대 마찰. 기존 캐시·조회 재사용으로 커맨드 팔레트 1개가 발견성을 회복하는 최고 ROI. 신규 기능보다 **연결**이 우선인 변곡점.
2. **증명을 끝맺어라(G2 = 2차 R4 carryover).** R1~R3은 LIVE이나 "복습 → 재진단 정답률 상승"을 증명하는 R4가 여전히 미완. 데이터는 다 쌓였으니 교차 분석만 남았다 — 동기 최강 레버를 완성한다.
3. **축적을 출구로(G3·G4).** 회원에겐 활동→**포트폴리오 자동 적재+내보내기**(졸업·진학 자산화), 운영진에겐 통계→**CSV 내보내기**(수동 복사 제거). 더불어 부채 2,157곳 색상 마이그레이션을 핵심 동선부터 단계 착수한다.

---

## 참고 파일 (절대경로, 실측 기반)

- 전역 검색 부재 확인: `globalsearch`·`command palette`·`spotlight` 검색 0건 (신규 구현 대상)
- R4 환류: `C:\work\yonsei-edtech\src\components\mypage\DiagnosticWeakConceptPath.tsx`, `...\src\components\diagnosis\DiagnosisHistorySection.tsx`, `...\src\lib\flashcard-srs.ts`, `diagnostic_results`·`flashcards` 컬렉션
- 포트폴리오: `C:\work\yonsei-edtech\src\types\portfolio.ts`, `...\src\components\profile\ProfilePortfolio.tsx`, `...\src\app\console\portfolio-verification\`, `...\src\app\api\profile\[id]\certificate\route.tsx`
- 데이터 export 부재: `C:\work\yonsei-edtech\src\features\insights\`(집계 재사용), `...\src\app\console\` (40+ 라우트, export 0건)
- 2차 LIVE 확인: `...\src\app\api\cron\flashcard-review-reminder\`, `...\src\app\api\cron\weekly-digest\route.ts`(나의 한 주), `...\src\components\flashcard\FlashcardDashboard.tsx`, `...\src\features\insights\InsightsActionPanel.tsx`, `...\src\features\content-draft\`, `...\src\features\research\ThesisProgressWidget.tsx`
- 신규 도메인: `...\src\features\journal\`(api·components·lib), `...\src\app\journal\`, `...\src\features\labs\`+`...\src\app\labs\`, `...\src\features\collaborative-research\`, `...\src\app\progress-meetings\`
- 색상 부채(실측): raw 팔레트 `bg/text/border-{red|blue|green|...}-N` = **236파일·2,157곳** (DESIGN.md §2.1 시맨틱 토큰 매핑 기준 마이그레이션)
- 멘토링 자산: mentor 역할 타입 `...\src\types\portfolio.ts`(ACTIVITY_ROLE_LABELS), 매칭 엔진 후보 `...\src\features\collaborative-research\`

> 본 문서는 3차 기획 산출물. 코드 변경 없음. 1차(`service-enhancement-plan-2026-06-15.md`)·2차(`service-enhancement-plan-v2-2026-06-16.md`) 문서와 보완 관계. 2차 R1~R3·M1·M3·M5는 LIVE 확인, R4·M2·M4(멘토링)는 미착수로 3차에 승계.

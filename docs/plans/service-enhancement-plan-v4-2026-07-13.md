# 연세교육공학회 서비스 갭 분석 v4 + 고도화 백로그 (2026-07-13)

> 대상 `C:\work\yonsei-edtech` (Next.js 16 + Firestore, LIVE https://yonsei-edtech.vercel.app) · **읽기·기획 전용**(코드 수정·배포 없음)
>
> 전제: 회원 = 교육공학 전공 대학원생·졸업생, 운영진 소수. 1~3차(H/M/R/G) 및 2026-07-08 v4 라운드(H1~H4·M1·M5·journal 콘솔·모임 Phase 1~4) 대부분 LIVE. 이 문서는 **오늘(2026-07-13) 배포된 "연구 설계 단계·프로그램 개발 가이드·용어사전 전환·이론 가계도"의 후속 갭**을 실측 기반으로 발굴한다.
>
> 실측 방법: `git log`, `grep`/`ls`로 라우트·컴포넌트·lib 존재를 직접 확인. LIVE 기능 재제안 금지. 모든 항목 파일경로 근거 명시.

---

## 0. 이번 세션 이미 LIVE (중복 제안 금지 — 실측 확인)

`git log --since=2026-07-08` 기준 오늘까지 배포 확인:

| 기능 | 실측 근거 (파일 존재) |
|---|---|
| 연구 여정 '연구 설계' 단계·8섹션 작성도구 | `src/features/research/ResearchDesignEditor.tsx`(1,294줄), `src/types/research-design.ts`, `src/lib/research-design-draft.ts`, `researchDesignsApi`(bkend.ts 1703~) |
| 설계 조건→통계방법 추천 | `src/lib/stat-method-recommender.ts`, `StatMethodGuideDialog.tsx`, `MethodRecommenderDialog.tsx` |
| 프로그램 설계·개발 가이드(가네 9절차·ADDIE·과정안) | `src/app/steppingstone/program-development/page.tsx` |
| 용어사전→개념 설명 인덱스 전환 | `src/app/archive/terminology/`, `foundation-terms/` |
| 학습이론 가계도 | `src/app/archive/theory-map/page.tsx` |
| 진단 문항 201종·이론 계보 문항 | `src/lib/diagnostic-seed.ts` |
| 모임 Phase 1~4(신뢰·모집·운영·초대명단 분리) + v4-0708 H1~H4·M1·M5·journal 콘솔 | git log 3feebcb7~83adcd1c, `src/app/console/journal/` |
| 알림·쪽지·할일 읽기/완료(항목별+일괄), 아카이브 미검수 배지 stale fix | `1c234095`, `01a6acc5` |

**따라서 v4-0708 백로그(H1~H4·M1·M5·journal)는 상당수 소진.** 본 v4-0713은 **오늘 신규 기능의 "닫히지 않은 고리"**를 중심으로 재구성한다.

---

## 1. 6개 렌즈 갭 분석 (실측 근거)

### ① 발견성·통합 — 신규 학습 자산이 "여정 밖 아카이브 랜딩에만" 고립

- **G①-1. 연구 여정이 학습 아카이브를 안내하지 않음.** `ResearchJourneyGuide.tsx`가 링크하는 외부 라우트는 `/steppingstone/thesis-defense` **1건뿐**. 오늘 배포한 `theory-map`·`terminology`·`program-development`·`diagnosis`·`flashcards`로의 딥링크 0건. 연구 여정을 타는 학생이 이론 가계도·용어사전·진단을 발견할 경로가 없다. (근거: `src/features/research/ResearchJourneyGuide.tsx` grep 결과 `/archive/*` 0건)
- **G①-2. theory-map·program-development 교차링크 희박.** `theory-map`은 **전체 코드에서 1개 파일**(`/archive` 랜딩)에서만 참조, `program-development`는 3개. 즉 아카이브 랜딩 페이지를 거치지 않으면 도달 불가. (근거: `grep -rl theory-map` = 1)
- **G①-3. NextActionBanner 발견성 넛지가 구 자산에 고정.** `DiscoveryKind = "diagnostic" | "flashcard" | "portfolio"` 3종만(라인 133). 오늘 배포한 **연구 설계 미착수·이론 가계도 미열람·프로그램 가이드**는 능동 추천 후보에 없음. (근거: `src/features/dashboard/NextActionBanner.tsx:133`)
- **G①-4. 진단 결과→학습 자산 환류 미노출.** `src/features/diagnosis/learning-loop.ts`(약점 리메디에이션 로직)는 존재하나 진단 결과 UI에서 `theory-map`·`terminology`·`flashcards`로의 직접 링크 grep 0건. 진단 후 "무엇을 공부할지"가 아카이브 학습 자산과 끊겨 있음.

### ② 연구 파이프라인 완결성 — **설계→계획서→논문 이어쓰기가 "복사"에서 끊김** (최우선 갭)

- **G②-1. 연구방법 초안이 클립보드 복사 전용.** `buildResearchMethodDraft()`(순수 함수, `research-design-draft.ts`)가 "III. 연구방법" 마크다운을 잘 조립하지만, `ResearchDesignEditor.tsx`의 소비처는 **`copyDraft()` = `navigator.clipboard.writeText`뿐**(라인 479~486). 계획서·논문 에디터로 **실제 데이터 import 경로 0건**. (근거: `grep buildResearchMethodDraft src/features/research/ResearchProposalEditor.tsx WritingPaperEditor.tsx` = 0)
- **G②-2. 논문 에디터의 `ResearchDesignType`은 별개 enum.** `WritingPaperEditor.tsx:62`의 `ResearchDesignType`(`quasi_experimental` 등)은 오늘 만든 `research_designs` 문서와 **무관한 별도 타입**. 즉 논문 에디터는 설계 단계 산출물을 인지하지 못한다. 사용자는 초안을 복사해 수동 붙여넣어야 하고, 이후 설계를 고쳐도 논문에 반영 안 됨(단방향·수동).
- **G②-3. 역방향(보고서→설계)만 자동.** `seedFromReport()`(라인 380)로 보고서→설계 접근·모형 import는 동작. 그러나 **설계→하류(계획서·논문)**는 없음. 파이프라인이 중간에서 끊긴다. 스펙 문서(`research-design-stage-spec` §8 "복사·계획서/논문으로 이어쓰기 안내")도 "안내"까지만 명시 → 실제 이어쓰기 미구현.

### ③ 회원 가치·리텐션 — 데이터 환류(R) 이후 "졸업생 재참여"와 "진단→학습→증명" 순환 미완

- **G③-1. 졸업생 재참여 레버 부재(1~4차 연속 carryover).** `src/features/collaborative-research`에 `alumni`/`mentor`/`graduat` 참조 0건. 멘토링 매칭·졸업생 리뷰어 풀·1:1 채널 미구현. 졸업생은 논문 아카이브 소스로만 쓰이고 능동 참여 경로 없음.
- **G③-2. 진단↔학습↔증명 루프가 조각남.** 진단(diagnosis)·암기카드(flashcards)·학습효과(learning-effect)·재진단은 각각 LIVE지만 **진단 결과에서 곧바로 "이 약점 개념을 이론 가계도·용어사전·암기카드로"** 잇는 단일 동선이 없음(G①-4와 연동). 오늘 신규 이론 가계도·용어사전이 이 루프에 편입되지 않음.
- **G③-3. weekly-digest가 신규 자산을 홍보 안 함.** `cron/weekly-digest/route.ts`에 `design|theory|terminology|program` 참조 0건 → 다이제스트가 오늘 만든 기능으로 회원을 재유입시키지 못함.

### ④ 운영 부담 경감 — 검수·시드 워크플로가 컬렉션별로 파편화

- **G④-1. 통합 검수 큐 부재.** 아카이브 콘솔이 `concepts·variables·measurements·research-methods·statistical-methods·foundation-terms·writing-tips` **8개 컬렉션 각각 CRUD**(`src/app/console/archive/*`). "미검수(published=false)" 항목을 **한 화면에서 일괄 검토·승인**하는 큐가 없어, 시드 확대(오늘 개념 86종·문항 201종) 후 운영진이 컬렉션을 순회해야 함. (근거: `console/archive/page.tsx` + 7개 서브디렉토리)
- **G④-2. 프로그램 개발 가이드가 페이지 전용·운영 관리 없음.** `program-development`는 `page.tsx` 206줄 정적 안내. 회원이 작성한 학습목표·과정안을 저장·조회하는 컬렉션/콘솔이 없어 운영 활용(우수 사례 큐레이션) 불가.

### ⑤ 모바일·접근성·성능 — 신규 대형 폼의 단일 파일·전개 기본값

- **G⑤-1. ResearchDesignEditor 1,294줄 단일 클라이언트 컴포넌트.** 8개 섹션 + 다이얼로그 2종(`MethodRecommenderDialog`·`StatMethodGuideDialog`)·모형/윤리 패널을 한 파일에서 즉시 로드. 코드 분할·lazy 없음 → 초기 번들·모바일 TTI 부담. (근거: `wc -l` 1294)
- **G⑤-2. 8섹션 아코디언 기본 `open=true`.** `Section` 컴포넌트 `useState(true)`(라인 1252) → 모바일에서 8개 섹션이 전부 펼쳐진 채 렌더, 긴 스크롤·입력 필드 대량 마운트. 모바일은 기본 접힘 + 현재 섹션만 펼치는 편이 사용성·성능 유리.
- **G⑤-3. SemesterRoadmap 611줄** 등 steppingstone 대형 컴포넌트도 동일 패턴 잠재.

### ⑥ 기술부채 — 색상 부채가 상환보다 빠르게 재생산

- **G⑥-1. raw 팔레트 부채 증가 지속.** `(bg|text|border)-{color}-N` 정규식 실측 **400파일 / 7,075곳** (v4-0708 실측 392파일·6,921곳 → **+8파일·+154곳 증가**). 색상 번들1·2 마이그레이션(대시보드·마이페이지)에도 불구 **총량 증가** = 신규 기능이 raw 팔레트를 재생산 중. **ESLint 재생산 차단 규칙 여전히 미도입.**
- **G⑥-2. hotspot.** `features/activities/ActivityDetail.tsx` **233곳**, `features/research/ResearchReportInterview.tsx` **122곳**, `features/defense/DefensePracticeRunner.tsx`(v4-0708 71곳). 오늘 만든 `ResearchDesignEditor`는 17곳(양호 — SEMANTIC 일부 채택). 회원 동선 상위 파일이 최대 부채.
- **G⑥-3. 잔존·일회성 라우트(v4-0708 L2 미해소).** `app/boards/[boardId]`·`app/network`·`console/inject-spring-2026-schedule`·`console/migrate-applicants` 잔존. cron 다수(35+개) 공통 유틸 추출 여지.

---

## 2. 고도화 백로그

각 항목: {제목·근거(파일)·기대효과·규모(S<1주 / M 1~2주 / L 3주+)·외부의존}. **오늘 만든 파이프라인·발견성의 "닫는 고리"를 최우선 가점.**

### High (즉시 착수·ROI 높음·외부의존 없음)

| # | 항목 | 근거·목적 | 규모 |
|---|---|---|---|
| **H1** | **연구 설계 → 계획서·논문 실제 이어쓰기(import)** | G②-1/-2. `ResearchProposalEditor`·`WritingPaperEditor`에 "연구 설계에서 연구방법 가져오기" 버튼 추가 — `buildResearchMethodDraft(design)` 결과를 해당 방법 섹션에 **실제 삽입**(복사 아님). 최신 설계 감지·재삽입/병합 안내. 파이프라인의 끊긴 중간 고리 완성 = 최고 ROI. | **M** |
| **H2** | **연구 여정·발견성 능동 통합** | G①-1/-2/-3. `ResearchJourneyGuide`에 단계별 학습 자산 딥링크(주제탐색→theory-map/terminology, 설계→program-development/statistical-methods, 진단 미응시→/diagnosis). `NextActionBanner`의 `DiscoveryKind`에 `design`(설계 미착수)·`theory`(가계도 미열람) 추가. | **M** |
| **H3** | **진단↔학습↔증명 단일 루프 완성** | G①-4/③-2. 진단 결과 UI에 `learning-loop.ts` 약점→`theory-map`·`terminology`·해당 개념 `flashcards` 생성 원클릭 동선 노출. 재진단→학습효과 카드까지 하나의 순환으로 시각화. 오늘 만든 이론 가계도·용어사전을 리텐션 루프에 편입. | **M** |
| **H4** | **색상 부채 번들3 + ESLint 재생산 차단** | G⑥-1/-2. hotspot `ActivityDetail.tsx`(233)·`ResearchReportInterview.tsx`(122) raw→`SEMANTIC` 토큰 치환 + **ESLint no-restricted-syntax 규칙**으로 신규 raw 팔레트 차단(총량 감소 전환). | **M** |

### Medium (1~2개월)

| # | 항목 | 근거·목적 | 규모 |
|---|---|---|---|
| **M1** | **ResearchDesignEditor 모바일·성능 리팩터** | G⑤-1/-2. 8섹션 서브컴포넌트 추출 + 다이얼로그 `dynamic()` lazy 로드 + 모바일 아코디언 기본 접힘(현재 섹션만 펼침). 1,294줄 분할로 유지보수·TTI 개선. | **M** |
| **M2** | **아카이브 통합 검수 큐** | G④-1. 8개 컬렉션의 `published=false` 미검수 항목을 `/console/archive`에서 **단일 리스트로 모아 일괄 승인/반려**. 시드 확대 후 운영 순회 부담 제거. 기존 미검수 배지 카운트 로직 재사용. | **M** |
| **M3** | **weekly-digest 신규 자산 재유입 블록** | G③-3. 다이제스트에 "이번 주 학습 제안"(미응시 진단·미열람 이론 가계도·미착수 설계) 개인화 블록 추가. H2 발견성 로직 재사용. | **S~M** |
| **M4** | **프로그램 개발 산출물 저장·조회** | G④-2. `program-development` 학습목표·과정안을 컬렉션 저장(본인 rw+staff read, research_designs 권한 패턴) + 마이페이지 조회 + 콘솔 우수사례 큐레이션. | **M** |
| **M5** | **색상 부채 번들4~ + 잔존 라우트 정리** | G⑥-2/-3. defense·seminar 등 차기 hotspot 도메인 일괄 + `boards/network`·일회성 마이그레이션 라우트 폐기 + cron 공통 유틸 추출. | **M~L** |

### Low (여유 시 / carryover)

| # | 항목 | 규모 |
|---|---|---|
| L1 | 설계 완성도→여정 진행 판정 정밀화(섹션별 가중치·필수/선택 구분 반영) | S |
| L2 | 잔디 비활성 영역 자동 코칭 · 진단 적응형 동적 문항(codex 교차검증) | M~L |
| L3 | 논문 에디터 `ResearchDesignType` enum ↔ `research_designs.approach` 정합(용어 이중화 해소) | S~M |

---

## 3. 외부 의존 항목 (운영진 결정·콘텐츠·동의 필요 — 코드만으로 불가)

| 항목 | 막힌 이유 | 필요한 결정 |
|---|---|---|
| 졸업생↔재학생 멘토링(G③-1) | 졸업생 참여 의사·매칭 동의·개인정보 노출 범위 | 졸업생 모집·동의 절차(오프라인), 매칭 정책 |
| journal 편집위 운영(투고·심사 라운드·게재 결정) | 편집 규정 미확정(콘솔은 조회만 LIVE) | 편집위원회 운영 규정 |
| 프로그램 개발 우수사례 공개(M4 큐레이션) | 회원 산출물 공개 범위·저작권 | 공개 정책 |
| 아카이브 인용 벌크 검증(RISS/KCI) | 외부 API/스크래핑 가용성·저작권 | 데이터 접근 방식 승인 |
| 진단 적응형 동적 문항(L2) | LLM 출제 정확성 검증 책임 | 출제 품질 게이트 정책 |

---

## 4. 이번 라운드 즉시 착수 추천 Top 5 (코드 자율 가능·외부의존 없음)

| 순위 | 항목 | 이유 | 규모 |
|---|---|---|---|
| **1** | **H1 연구 설계 → 계획서·논문 실제 import** | 오늘 만든 파이프라인의 **끊긴 중간 고리**. 현재 클립보드 복사 전용(`copyDraft`)이라 설계 산출물이 논문으로 흐르지 않음. `buildResearchMethodDraft` 순수 함수가 이미 있어 삽입 훅만 연결하면 됨 — 최소 비용·최대 ROI. | M |
| **2** | **H2 연구 여정·발견성 능동 통합** | 오늘 배포한 theory-map·terminology·program-development가 **아카이브 랜딩에만 고립**(theory-map 참조 1파일). 여정·NextActionBanner에서 능동 노출해야 신규 자산이 실제 사용됨. | M |
| **3** | **H3 진단↔학습↔증명 루프 완성** | `learning-loop.ts`는 있으나 진단 결과가 이론 가계도·용어사전·암기카드로 연결 안 됨. 리텐션 순환에 오늘 신규 자산 편입 — 회원 가치 직결. | M |
| **4** | **H4 색상 부채 번들3 + ESLint 차단** | 부채가 6,921→**7,075곳으로 증가**(상환보다 재생산이 빠름). hotspot 2파일(355곳) 치환 + lint 규칙으로 **총량 감소 전환**. | M |
| **5** | **M1 ResearchDesignEditor 모바일·성능 리팩터** | 1,294줄 단일 파일·8섹션 기본 전개는 모바일 TTI·유지보수 부담. H1 import 작업과 같은 파일을 만지므로 **연쇄 착수 효율** 높음. | M |

> 착수 순서 권고: **H1 → M1(같은 파일)** 묶음 → **H2 → H3**(발견성·루프 연동) → **H4**(부채, 독립 병렬 가능). H2·H3·M3는 발견성 로직을 공유하므로 함께 설계.

---

## 참고 파일 (절대경로, 실측 기반)

- 파이프라인 끊김(②): `src/lib/research-design-draft.ts`(buildResearchMethodDraft), `src/features/research/ResearchDesignEditor.tsx:479`(copyDraft 전용)·`:380`(seedFromReport 역방향만), `src/features/research/WritingPaperEditor.tsx:62`(무관 ResearchDesignType), `src/features/research/ResearchProposalEditor.tsx`(design import 0건)
- 발견성 고립(①): `src/features/research/ResearchJourneyGuide.tsx`(외부링크 thesis-defense 1건), `src/features/dashboard/NextActionBanner.tsx:133`(DiscoveryKind 3종), `src/app/archive/theory-map/page.tsx`(참조 1파일)
- 리텐션 루프(③): `src/features/diagnosis/learning-loop.ts`(UI 미노출), `src/features/collaborative-research/`(alumni/mentor 0건), `src/app/api/cron/weekly-digest/route.ts`(신규자산 0건)
- 운영(④): `src/app/console/archive/`(8컬렉션 개별 CRUD), `src/app/steppingstone/program-development/page.tsx`(저장 없음)
- 모바일·성능(⑤): `src/features/research/ResearchDesignEditor.tsx`(1294줄, Section useState(true) 라인 1252), `src/features/steppingstone/SemesterRoadmap.tsx`(611줄)
- 색상 부채(⑥): raw 팔레트 **400파일/7,075곳**(hotspot `src/features/activities/ActivityDetail.tsx` 233·`src/features/research/ResearchReportInterview.tsx` 122), 잔존 `src/app/boards/[boardId]`·`src/app/network`·`src/app/console/inject-spring-2026-schedule`·`src/app/console/migrate-applicants`

> 본 문서는 v4(2026-07-13) 갭 분석 산출물. 코드 변경 없음. v4-0708(H1~H4·M1·M5 상당수 LIVE)의 후속으로, **오늘 배포된 연구 설계·프로그램 가이드·이론 가계도·용어사전의 "닫히지 않은 고리"**(파이프라인 import·발견성·리텐션 루프)에 집중.

# v18-M2: Required Array Firestore 필드 회귀 감사

**작성일**: 2026-07-27  
**감사 범위**: `src/types/` 전체 인터페이스 → render 경로 무가드 배열 접근  
**제외(이미 처리됨)**: `Seminar.attendeeIds`, `GraduationRequirement.creditRules/milestones`, `ResearchQuestionItem.researchMethodIds`  
**방법**: 타입 필드 목록화 → grep 증거(`.(length|map|filter|includes|reduce|forEach|find|some|every)`) → 심각도 분류  

---

## 요약

| 심각도 | 건수 |
|--------|------|
| High   | 4    |
| Medium | 5    |
| Low    | 1    |
| **합계** | **10** |

---

## High (전 회원 render 경로 붕괴)

### H1. `ResearchJournalArticle.keywordsKo: string[]`

- **파일**: `src/app/journal/page.tsx:44`
- **문제 표현식**: `a.keywordsKo.some((k) => k.toLowerCase().includes(q))`
- **컨텍스트**: `useMemo` 내 `articles.filter(...)` 콜백 — `/journal` 전 회원 접근 페이지
- **증거**: `keywordsKo` 필드가 Firestore 문서에 없으면 `undefined.some(...)` → TypeError → `/journal` 페이지 전체 붕괴
- **보조 접근**: `src/app/journal/page.tsx:164`: `{article.keywordsKo.length > 0 &&` (같은 파일, 별도 위치)
- **제안**: `(a.keywordsKo ?? []).some(...)` 또는 loader 정규화 계층에서 `keywordsKo: doc.keywordsKo ?? []`

### H2. `ResearchJournalArticle.authors: ArticleAuthorSnapshot[]`

- **파일**: `src/app/journal/page.tsx:45`
- **문제 표현식**: `a.authors.some((au) => au.displayName.toLowerCase().includes(q))`
- **컨텍스트**: H1과 동일한 `useMemo` 블록 — 같은 줄 연속 접근
- **증거**: `authors` 필드 결손 시 `undefined.some(...)` → TypeError → `/journal` 페이지 붕괴
- **보조 접근**: `src/features/journal/components/JournalConsentPanel.tsx:82,116` 무가드 `.map()`, `.length`
- **제안**: `(a.authors ?? []).some(...)` / H1과 동일 loader 정규화 계층 처리 권장

### H3. `ResearchJournalIssue.articleIds: string[]`

- **파일**: `src/app/journal/page.tsx:79`
- **문제 표현식**: `{issue.articleIds.length}편 수록`
- **컨텍스트**: JSX 렌더 — `/journal` 호수 카드 렌더링, 전 회원 접근
- **추가 발생**: `src/app/console/research/journal/page.tsx:253`, `src/app/console/journal/page.tsx:194` (staff 경로지만 동일 패턴)
- **증거**: `articleIds` 결손 시 `undefined.length` → TypeError → 호수 카드 렌더 붕괴 → 페이지 전체 크래시
- **제안**: `(issue.articleIds ?? []).length` 또는 `issue.articleIds?.length ?? 0`

### H4. `RoadmapStage.items: string[]`

- **파일**: `src/features/steppingstone/SemesterRoadmap.tsx`
- **문제 표현식(복수)**:
  - `:225` `stage.items.map(() => false)` — `useState` 초기화자 (render 시 즉시 실행)
  - `:231` `stage.items.map((_, i) => getItemChecked(stage.order, i))` — `useEffect` 내부
  - `:236` `stage.items.length`
  - `:340` `{stage.items.map((item, i) => {` — JSX render
  - `:444` `stages.map((s) => ({ ..., itemCount: s.items.length }))` — `useMemo`
- **컨텍스트**: 전 회원 접근 스테핑스톤 페이지. `roadmap_stages` Firestore 컬렉션에서 동적 로드.
- **증거**: `items` 결손 stage 문서 1개만 있어도 `useState` 초기화 시 TypeError → `StageCard` 마운트 즉시 붕괴 → 전체 로드맵 섹션 error boundary 트립
- **비고**: 파일 주석 "Firestore 가 비어있으면 정적 fallback 로 동작" — fallback은 Firestore 응답이 빈 배열일 때만 적용; 문서가 1개라도 있으면 동적 경로로 진입
- **제안**: loader에서 `items: stage.items ?? []` 정규화 또는 각 접근부에 `(stage.items ?? []).map(...)`

---

## Medium (조건부·특정 기능 render 경로)

### M1. `ArticleAuthorSnapshot.creditRoles: CreditRole[]`

- **파일**: `src/features/journal/components/JournalArticleView.tsx:203`
- **문제 표현식**: `a.creditRoles.length > 0` — `article.authors.some(...)` 콜백 내부
- **컨텍스트**: 논문 상세 페이지 CRediT 섹션. 모든 회원이 접근 가능.
- **증거**: `authors` 배열 내 특정 스냅샷의 `creditRoles` 결손 시 `undefined.length` → 해당 article 상세 페이지 전체 붕괴
- **보조**: `:213` `a.creditRoles.length === 0` (내부 `.map()` 내), `:215` `a.creditRoles.map(...)`
- **제안**: `(a.creditRoles ?? []).length > 0` / 공통 loader 처리 권장

### M2. `CollabResearchComment.mentionedUserIds: string[]`

- **파일**: `src/features/collaborative-research/components/ChaptersBoard.tsx:472`
- **문제 표현식**: `{c.mentionedUserIds.length > 0 &&`
- **컨텍스트**: 공동연구 챕터 보드 — 회원 접근 가능 기능
- **증거**: 길이 체크 자체가 guard처럼 보이나 `mentionedUserIds`가 `undefined`이면 `undefined.length` → TypeError
- **제안**: `{(c.mentionedUserIds?.length ?? 0) > 0 &&` 또는 `{(c.mentionedUserIds ?? []).length > 0 &&`

### M3. `NetworkingAvailability.availableSlots: string[]`

- **파일**: `src/app/gatherings/poll/[id]/page.tsx:145`
- **문제 표현식**: `responses.filter((r) => r.availableSlots.length > 0).length`
- **컨텍스트**: 모임 일정조율 투표 페이지 — 회원·게스트 접근
- **증거**: M2와 동일 패턴 — 길이 guard처럼 보이나 결손 시 크래시. `api/networking/availability-tally/route.ts:55`는 `Array.isArray` 체크로 안전.
- **제안**: `responses.filter((r) => (r.availableSlots?.length ?? 0) > 0).length`

### M4. `ConferenceDay.sessions: ConferenceSession[]`

- **파일**: `src/features/conference/ConferenceProgramView.tsx`
- **문제 표현식**:
  - `:525` `const cnt = d.sessions.length;` — `program.days.map()` 루프 내부
  - `:767` `{day.sessions.length === 0 ?` — JSX 분기 (역시 무가드)
  - `:773` `const filteredSessions = [...day.sessions].sort(...)` — 세션 렌더
- **컨텍스트**: 대외 학술대회 참석 시간표 뷰 — 대외활동 신청 회원 접근
- **증거**: `ConferenceDay` 문서 내 `sessions` 필드 결손 시 해당 날짜 렌더링에서 TypeError
- **비고**: `days` 자체는 `ConferenceProgram.days: ConferenceDay[]` (required)이나 `program` 객체는 Firestore 에서 로드 후 사용되므로 `days` 누락은 별개 High 위험이나 항상 days 배열을 포함해 생성됨 → Medium 유지
- **제안**: `(d.sessions ?? []).length` / 편집기 저장 시 빈 배열 보장

### M5. `ResearchJournalArticle.authors` (JournalArticleView 추가)

- **파일**: `src/features/journal/components/JournalArticleView.tsx:209`, `src/features/journal/components/JournalConsentPanel.tsx:82,116`
- **문제 표현식**: `{article.authors.map((a) => (`, `article.authors.length === 0`
- **컨텍스트**: 논문 상세 / 동의 패널 — 모든 회원 접근
- **증거**: H2와 동일 필드. 상세 페이지에서도 무가드 접근.
- **제안**: H2와 함께 loader 정규화 시 일괄 처리

---

## Low (이벤트 핸들러 경로 / 항상 초기화)

### L1. `Poll.questions: PollQuestion[]`

- **파일**: `src/features/seminar-live/LivePollRespond.tsx:295`, `src/features/seminar-live/LivePollControl.tsx:189`
- **문제 표현식**: `{poll.questions.map((q) => {`
- **컨텍스트**: 세미나 라이브 설문 응답 / 컨트롤 패널 (세미나 참석자·운영진 경로)
- **증거**: `Poll.questions: PollQuestion[]` required. 무가드 `.map()`.
- **실제 위험도**: Low — `LivePollControl.tsx:340` 에서 `voterIds: []` 포함해 항상 `questions` 배열과 함께 생성. 레거시 결손 가능성 매우 낮음.
- **제안**: 방어적으로 `(poll.questions ?? []).map(...)` 추가 가능 (선택)

---

## 전수 검토 결과: 0건 확인 필드 목록

아래 필드는 타입상 required 배열이나 **render 경로 무가드 접근 없음** 또는 **항상 옵셔널 가드 사용** 확인:

| 타입 | 필드 | 이유 |
|------|------|------|
| `AlumniThesis` | `keywords: string[]` | 모든 접근에서 `t.keywords && t.keywords.length > 0` guard 사용 확인 |
| `LearningGuideProgress` | `readPageIds: string[]` | `ContinueReadingCard.tsx:36` 에서 `p.readPageIds?.length ?? 0` guard 선행 후 접근 |
| `CollaborativeResearch` | `collaboratorIds/tags/conceptIds/methodIds: string[]` | render 경로 무가드 접근 grep 결과 없음 |
| `CollabResearchChapter` | `assignedUserIds: string[]` | render 경로 무가드 접근 grep 결과 없음 |
| `CollabResearchMilestone` | `assigneeIds: string[]` | render 경로 무가드 접근 grep 결과 없음 |
| `CollabResearchMeeting` | `attendeeIds: string[]` | render 경로 무가드 접근 grep 결과 없음 |
| `ResearchJournalIssue` | `editorIds: string[]` | render 경로 무가드 접근 grep 결과 없음 |
| `ResearchJournalArticle` | `reviewerIds: string[]` | render 경로 무가드 접근 grep 결과 없음 |
| `ResearchJournalArticle` | `citations: ArticleCitation[]` | `ai-forum` 내 `m.citations && m.citations.length > 0` guard 확인 (별도 타입) |
| `HackathonSubmission` | `members: string[]` | 모든 접근 `s.members.length > 0` guard — 단, undefined 시 여전히 크래시 가능하나 항상 form 통해 초기화 |
| `Poll` | `voterIds: string[]` | render 경로 접근 없음 (생성 시 `[]` 설정 확인) |
| `ConferenceProgram` | `days: ConferenceDay[]` | 항상 editor에서 days 배열 포함 저장 |
| `GraduationRequirement` | `creditRules/milestones` | 이미 처리됨 (제외) |
| `Seminar` | `attendeeIds` | 이미 처리됨 (제외) |

---

## 수정 우선순위 제안

```
H1+H2+H3 → app/journal/page.tsx (단일 useMemo 블록 일괄 수정)
H4        → SemesterRoadmap.tsx + roadmap_stages loader (items ?? [])
M1+M5     → JournalArticleView.tsx + JournalConsentPanel.tsx (authors/creditRoles)
M2        → ChaptersBoard.tsx mentionedUserIds
M3        → gatherings/poll/[id]/page.tsx availableSlots
M4        → ConferenceProgramView.tsx sessions (days.map 루프 내)
```

**코드 수정 금지** — 본 문서는 감사 산출물이며, 수정은 메인 오케스트레이터가 다음 배치에서 수행한다.

# 런타임 크래시 정적 스윕 보고서 (2026-07-27)

## 배경

`/mypage` 크래시 근본원인과 같은 클래스를 코드베이스 전체에서 정적 탐색.
- 버그 패턴: TypeScript 타입상 `required string[]`이지만 **런타임 레거시 Firestore 문서에는 필드 자체가 없어** render 중 `.length` / `.includes()` 접근 → `TypeError: Cannot read properties of undefined` → Next.js `error.tsx` route boundary 트립 → 페이지 전체 붕괴
- SSR 200, 클라이언트 인증+fetch 후 re-render 시점에만 throw하는 패턴(throwOnError 미설정 시 react-query async 실패는 boundary를 트립하지 않음)

---

## 발견 항목

### HIGH — 페이지 전체 붕괴 가능 (6건)

모든 항목이 **`Seminar.attendeeIds: string[]`** (타입상 required) 를 가드 없이 render 중 접근.
레거시 세미나 문서에 필드 누락 사실은 코드베이스 자체에서 이미 확인됨:
- `src/app/seminars/[id]/page.tsx:297–298` — 명시적 QA 방어 주석 + 로컬 `attendeeIdsSafe` 변수
- `src/components/mypage/MyPageView.tsx:175`, `MyActivitiesView.tsx:85`, `features/dashboard/TodaySummaryCard.tsx:185`, `features/dashboard/NextActionBanner.tsx:284` — 모두 `Array.isArray(s.attendeeIds) &&` 가드 사용 중

**위 4곳은 이미 가드됨 → 아래 6곳은 동일 이유로 가드가 빠진 채 render 경로에 남아 있음.**

---

#### H-1. `src/features/dashboard/JourneyStepperWidget.tsx:123`

```ts
return userId ? seminars.some((s) => s.attendeeIds.includes(userId)) : false;
// ↑ useMemo 내부 → render 시점에 실행
```

- **필드**: `Seminar.attendeeIds: string[]` (타입 required, 레거시 문서 누락 가능)
- **경로**: 대시보드 진입 → useQuery `dashboard-upcoming-seminars` fetch 완료 후 useMemo 재실행 → throw
- **영향**: `/dashboard` 전체 붕괴
- **제안 수정**: `Array.isArray(s.attendeeIds) && s.attendeeIds.includes(userId)` (1줄)

---

#### H-2. `src/app/dashboard/page.tsx:255`

```ts
const mySeminars = seminars.filter((s) => s.attendeeIds.includes(user.id));
```

- **필드**: 동일
- **경로**: dashboard 페이지 render 함수 본문 직접 실행
- **영향**: `/dashboard` 전체 붕괴 (H-1과 동일 페이지지만 경로가 다름)
- **제안 수정**: `seminars.filter((s) => Array.isArray(s.attendeeIds) && s.attendeeIds.includes(user.id))` (1줄)

---

#### H-3. `src/features/seminar/SeminarList.tsx:27`

```ts
const count = attendees.length > 0 ? attendees.length : seminar.attendeeIds.length;
```

- **필드**: 동일
- **경로**: 세미나 목록 페이지(`/seminars`) → 세미나 카드 렌더 루프 → 목록에 레거시 세미나가 1건이라도 있으면 throw
- **영향**: `/seminars` 목록 페이지 전체 붕괴
- **제안 수정**: `(seminar.attendeeIds ?? []).length` (1줄)

---

#### H-4. `src/features/seminar/detail/HeroSection.tsx:35`

```ts
const attendeeCount = attendees.length > 0 ? attendees.length : seminar.attendeeIds.length;
```

- **필드**: 동일
- **경로**: 세미나 상세 페이지(`/seminars/[id]`) → HeroSection render 직접 실행
- **영향**: 레거시 세미나 상세 페이지 전체 붕괴
- **비고**: 동일 페이지의 `page.tsx:298`에서 `attendeeIdsSafe`를 만들지만 HeroSection에는 원본 `seminar` 객체가 그대로 전달됨
- **제안 수정**: `(seminar.attendeeIds ?? []).length` (1줄)

---

#### H-5. `src/features/seminar/SeminarReviews.tsx:69`

```ts
const isAttendee = user ? seminar.attendeeIds.includes(user.id) : false;
```

- **필드**: 동일
- **경로**: 세미나 상세 → 후기 탭 → SeminarReviews render 본문 직접 실행
- **영향**: 레거시 세미나 상세 페이지 전체 붕괴 (H-4와 같은 페이지지만 탭 전환 시도 전에도 crash 가능)
- **제안 수정**: `user ? (seminar.attendeeIds ?? []).includes(user.id) : false` (1줄)

---

#### H-6. `src/features/seminar/SeminarLMS.tsx:73`

```ts
const totalAttendees = seminar.attendeeIds.length + (registrations?.length ?? 0);
```

- **필드**: 동일
- **경로**: `/seminars/[id]/lms` 페이지 → SeminarLMS render 본문 직접 실행
- **영향**: 레거시 세미나 LMS 페이지 전체 붕괴
- **제안 수정**: `(seminar.attendeeIds ?? []).length + (registrations?.length ?? 0)` (1줄)

---

### MEDIUM — 조건부/스태프 전용 경로 (5건)

#### M-1. `src/features/seminar/detail/RegistrationSection.tsx:132`

```ts
{seminar.maxAttendees && `(${seminar.attendeeIds.length}/${seminar.maxAttendees}명)`}
```

- **경로**: `isFull && !isAttending && !myWaitlistEntry` 조건이 모두 참일 때만 render. `seminar.maxAttendees`는 체크하지만 `attendeeIds`는 무가드
- **심각도 Medium**: 조건 4개가 동시에 참이어야 도달하는 경로
- **제안 수정**: `(seminar.attendeeIds ?? []).length` (1줄)

---

#### M-2. `src/features/academic-admin/Dashboard.tsx:67`

```ts
totalAttendees: seminars.reduce((sum, s) => sum + s.attendeeIds.length, 0),
```

- **경로**: 스태프 전용 academic admin 대시보드 render 본문
- **심각도 Medium**: 스태프 이상만 접근
- **제안 수정**: `(s.attendeeIds ?? []).length` (1줄)

---

#### M-3. `src/features/admin/AdminSeminarTab.tsx:242,307,370,415`

```ts
// 242:
totalAttendees += s.attendeeIds.length;
// 307, 370, 415:
{s.attendeeIds.length}{s.maxAttendees ? `/${s.maxAttendees}` : ""}명
```

- **경로**: 관리자 전용 세미나 탭 render
- **심각도 Medium**: admin/sysadmin만 접근, 동일 필드 4곳
- **제안 수정**: 모두 `(s.attendeeIds ?? []).length` (줄당 1수정)

---

#### M-4. `src/app/console/members/[id]/page.tsx:416`

```ts
return all.filter((s) => s.attendeeIds.includes(memberId));
```

- **경로**: 스태프 전용 회원 상세 페이지 → 내부 filter 함수 실행 시
- **심각도 Medium**: 스태프 이상만 접근
- **제안 수정**: `(s.attendeeIds ?? []).includes(memberId)` (1줄)

---

#### M-5. `src/lib/graduation-progress.ts:61,75`

```ts
// 61:
const creditRules: CreditRuleProgress[] = req.creditRules.map((rule) => {
// 75:
const milestones: MilestoneProgress[] = req.milestones.map((m) => {
```

- **필드**: `GraduationRequirement.creditRules: CreditRule[]`, `milestones: GraduationMilestone[]` (타입 required)
- **경로**: `useGraduationSummary` → `computeGraduationProgress(requirement, ...)` 호출 → render 시 실행
- **누락 조건**: Firestore `graduation_requirements/default` 문서가 존재하되 `creditRules` 또는 `milestones` 필드가 없는 레거시 상태. `doc ?? { ...DEFAULT }` 코얼레스는 문서가 `null`/`undefined`일 때만 폴백 — 문서가 있지만 필드 누락 시 폴백 불가
- **영향**: `/mypage` 내 `GraduationChecklistCard`, `NextActionBanner` 등 훅 사용처 전체
- **심각도 Medium**: `graduation_requirements` 컬렉션은 운영진 단 1건 관리 — 현재 올바른 문서가 있다면 safe, 과거 다른 스키마로 저장된 경우에만 발동
- **제안 수정**: `(req.creditRules ?? []).map(...)`, `(req.milestones ?? []).map(...)` (각 1줄)

---

### LOW — render 경로 외 (1건)

#### L-1. `src/features/research/ResearchQuestionsPanel.tsx:321`

```ts
onRemove={(id) => patch(q.id, (cur) => ({ ...cur, researchMethodIds: cur.researchMethodIds.filter((x) => x !== id) }))}
```

- **필드**: `ResearchQuestionItem.researchMethodIds: string[]` (타입 required, 레거시 문서 누락 가능)
- **경로**: "연구방법 삭제" 버튼 클릭 이벤트 핸들러 — render 경로 아님 → error boundary 미트립
- **심각도 Low**: UI freeze/오류 toast 수준이지 페이지 전체 붕괴 아님
- **제안 수정**: `(cur.researchMethodIds ?? []).filter((x) => x !== id)` (1줄)

---

## 안전 확인 (오탐 제거)

조사 과정에서 위험해 보였으나 실제로는 안전한 곳:

| 파일 | 이유 |
|---|---|
| `features/insights/DiagnosticInsightsView.tsx:368–380` | `rows` 생성 시 `weakConceptNames: r.weakConceptNames ?? []` 코얼레스 완료 — `r`은 `MemberDiagnosticRow`(항상 `string[]`) |
| `features/research/WritingPaperEditor.tsx:2104,2182,2187–2189` | `form` 초기화(line 679)에서 `appendices: []`, `abstractKeywords: []` 기본값 설정, Firestore 로드 시도 `p.appendices ?? []` 코얼레스 |
| `features/research/ResearchDesignEditor.tsx` | `EMPTY_FORM` 상수로 `procedureSteps: []`, `instruments: []` 항상 초기화 |
| `features/mypage/GraduationChecklistCard.tsx:91,137` | `if (!requirement || !summary) return null` 가드 후 접근, `summary`는 순수함수 `computeGraduationProgress` 산출물(항상 required 배열 포함) |
| `features/mypage/ARCSPanel.tsx:324,327` | `axisScores`는 컴포넌트 내부 computed 상수 (Firestore 미사용) |
| `features/mypage/ContinueReadingCard.tsx:36–48` | `(guidesRes.data ?? [])`, `(p.readPageIds?.length ?? 0) > 0` 등 적절한 가드 사용 |

---

## 요약

| 심각도 | 건수 | 주 근본원인 |
|---|---|---|
| High | 6 | `Seminar.attendeeIds` 레거시 결손 — render 경로 무가드 |
| Medium | 5 | 동일 + 스태프 전용/조건부 경로, 또는 `GraduationRequirement` 필드 누락 |
| Low | 1 | 이벤트 핸들러 경로 (`ResearchQuestionItem.researchMethodIds`) |

**최우선 수정 대상**: H-1 ~ H-3 (`/dashboard`, `/seminars` 목록) — 모든 회원이 레거시 세미나 1건만 있어도 진입 즉시 붕괴.

수정은 모두 `(field ?? []).method()` 또는 `Array.isArray(field) && field.method()` 형태의 1줄 가드. 코드 로직 변경 없음.

# v17 M5 — react-hooks/exhaustive-deps 억제 안전검토

**작성일**: 2026-07-27
**대상**: `eslint-disable ... react-hooks/exhaustive-deps` 로 억제된 46개 파일의 useEffect/useCallback/useMemo
**목적**: 실제 결함(stale closure · 데이터 리페치/populate 누락)만 선별. 코드 수정은 하지 않음(메인이 검토 후 처리).
**판정 요약**: **High 2건, Medium 1건**, 나머지 43건은 의도적 안전(mount-once · 폼 동기화 가드 · autosave 타이머 · 포커스 이동 · 안정 헬퍼 useMemo).

---

## High (실결함 — 우선 수정 권장)

### H1. WritingPaperEditor — Ctrl+S 저장이 stale/무동작 (데이터 유실 위험)
- **파일:라인**: `src/features/research/WritingPaperEditor.tsx:962-973` (disable `:972`)
- **현재 deps**: `[readOnly]`
- **누락 dep**: `handleSave` (또는 저장 대상 `form`, `paper`)
- **근거**:
  - 이 effect는 `keydown` 리스너를 등록하고 핸들러에서 `handleSave()`(972 위 967라인)를 직접 호출한다.
  - `handleSave`는 `async function`(1190) 형태의 **매 렌더 재생성 클로저**로, payload를 `paper.id`(1214)·`form.title/sections/...`(1216-1227)에서 **직접 읽는다**. ref 우회 없음.
  - effect deps가 `[readOnly]` 뿐이라, 편집 중 `readOnly`가 바뀌지 않으면 리스너는 **마운트 시점의 handleSave 클로저**를 계속 참조한다. 이후 사용자가 타이핑해 `form`이 갱신돼도 리스너는 재구독되지 않는다.
  - 마운트 시점 `form`은 `buildEmptyForm(...)`(772) 빈 폼이고 `paper`는 쿼리 로딩 중(대개 `undefined`).
- **재현 시나리오**:
  1. (콜드 로드) 논문 편집 페이지 진입 → 마운트 시 `paper=undefined` 캡처 → 이후 Ctrl+S를 눌러도 `handleSave` 내부 `if (!paper || readOnly) return`(1191)에서 즉시 반환 → **Ctrl+S 저장이 아무 동작도 안 함**(버튼 UI엔 "저장 (Ctrl+S)" 라벨 존재 → 광고된 기능이 죽어 있음).
  2. (목록→편집 캐시 내비게이션으로 마운트 시 `paper`가 이미 캐시에 존재하는 경우) 마운트 폼은 빈 폼(하이드레이션 effect 940-948은 그 다음 커밋에서 실행) → Ctrl+S가 **빈 form을 저장 payload로 전송해 서버 논문을 공란으로 덮어씀(데이터 유실)**.
- **제안 수정**: 최신 핸들러를 ref로 유지하거나(`const saveRef = useRef(handleSave); saveRef.current = handleSave;` 후 리스너에서 `saveRef.current()`), 또는 deps에 `handleSave`를 포함(단 handleSave를 `useCallback([...정확한 deps])`로 감싼 뒤). 가장 안전한 것은 ref 패턴(재구독 없이 항상 최신 form/paper 참조).
- **비교 참고(왜 이것만 High인가)**: 유사한 키보드/autosave effect들(StudioEditor:422, FlashcardStudy:222, ConferenceProgramEditor:835, CardNewsEditor:246, program/notes:146)은 **저장/조작 대상 값이 deps에 포함**돼 있어 값이 바뀌면 재구독되며 최신 클로저를 다시 캡처한다. WritingPaperEditor만 deps가 `[readOnly]` 단독이라 재구독이 없다.

### H2. Hackathon 행사설정 폼 — 비동기 로드된 selConf 로 populate 안 됨
- **파일:라인**: `src/app/console/hackathon/page.tsx:439-442` (disable `:442`)
- **현재 deps**: `[selCtxId]`
- **누락 dep**: `selConf` (또는 `hackathonConferences`)
- **근거**:
  - effect는 `setForm(buildEventSettingsForm(selConf))` 로 폼을 채운다. `selConf`는 `hackathonConferences.find(contextId===selCtxId)`(429-432)로 파생되며, `hackathonConferences`는 react-query(`useInternalConferences`, 420)로 **비동기 로드**된다.
  - `confLoading` 가드(518)는 effect **등록 이후**(훅은 조건부 불가) 위치의 조기 return이라 effect 재실행을 막지 못한다.
  - 렌더 흐름: (1) `confLoading=true` 렌더에서 `selConf=null` → 커밋 후 effect 실행 → `setForm(빈 폼)`. (2) conferences 로드 완료 → 재렌더, `selConf` 채워짐, 그러나 deps `[selCtxId]` 불변 → **effect 재실행 안 됨** → 폼이 빈 상태로 고정.
- **재현 시나리오**: 콘솔 → 해커톤 → 행사 설정 탭 **콜드 로드**(쿼리 캐시 없음) 시, 저장돼 있던 행사 설정값 대신 **빈/기본 폼**이 표시됨. 이 상태에서 저장하면 기존 저장값을 공란으로 덮어쓸 수 있음. (쿼리 캐시가 이미 있으면 첫 렌더에 `confLoading=false`라 증상 미발생 → 간헐적으로 보임.)
- **제안 수정**: effect deps에 `selConf` 포함(파생값이어도 `null→데이터` 전이를 감지해야 함). 순환/덮어쓰기 우려가 있으면 "selCtxId 변경 OR (selConf 최초 도착)" 조건으로 분기하거나, `selConf?.contextId`+로드완료 플래그를 deps로. 단순히는 `}, [selCtxId, selConf]);`.

---

## Medium (조건부 결함 — 로드 순서 의존, 확인 권장)

### M1. Learning Guide(전자책) 읽음 진도 — user 지연 로드 시 첫 페이지 진도 유실
- **파일:라인**: `src/app/learning-guides/[slug]/page.tsx:278-292` (disable `:291`)
- **현재 deps**: `[currentPage?.id]`
- **누락 dep**: `user`, `guide`
- **근거/시나리오**: effect 상단 가드 `if (!currentPage || !user || !guide) return`(279)가 `progressSavedRef.current.add`(281) **이전**에 있다. 따라서 `currentPage.id`가 먼저 정해졌는데 `user`(useAuthStore, 인증 비동기 해소 가능)가 아직 `null`이면 조기 반환하고 ref 마킹도 안 된다. 이후 `user`가 도착해도 deps(`currentPage?.id`)가 불변이라 **effect가 재실행되지 않아 그 페이지 읽음 기록이 영구 누락**된다.
- **왜 High가 아닌가**: 로그인 상태로 진입한 독자는 대개 `user`가 마운트 시점에 이미 존재(zustand persist)하여 실제 발생 확률이 낮고, 영향은 "첫 페이지 1건 진도 미기록"으로 사용자에게 잘못된 stale 데이터를 **표시**하는 유형은 아님. 확인 후 `user?.id`, `guide?.id`를 deps에 추가하는 것이 안전.

---

## Low (의도적 안전 — 수정 불필요) — 43건

아래는 모두 (a) mount-once 초기화, (b) 폼-서버 동기화 가드(외부 갱신으로부터 편집 보호를 위해 특정 키만 deps), (c) autosave 타이머(저장 대상 값이 deps에 포함돼 재구독), (d) 포커스 이동, (e) 안정 헬퍼/상수만 쓰는 useMemo 로 분류됨. 누락 dep이 실제 stale 표시/리페치 누락을 유발하지 않음.

| 파일:라인 | 유형 | 안전 근거 |
|---|---|---|
| `features/activities/ActivityDetail.tsx:350` | 폼 보정 | 다이얼로그 오픈 시 비활성 유형 보정, 자기수정 · fetch 아님 |
| `features/studio/StudioEditor.tsx:422` | 키보드 | `typing`은 이벤트 target에서 매번 새로 계산, `removeSelected`는 `selectedId`(deps)로 재구독 |
| `features/defense/DefensePracticeRunner.tsx:874` | 타이머 | 침묵타이머, `readAlongBuffer` deps 포함 · 타이밍만 영향 |
| `features/card-news/CardNewsEditor.tsx:246` | autosave | `series`(저장대상) deps 포함 → 최신 캡처 |
| `features/defense/DefensePracticeListView.tsx:344` | once 가드 | `autoImported` 플래그로 1회 |
| `features/steppingstone/SemesterRoadmap.tsx:447` | useMemo | `progressTick` 캐시버스트 신호(의도적) |
| `features/seminar-live/LectureNotesEditor.tsx:40` | 폼 동기화 | `deck.lectureNotes` 의도적 제외(편집중 외부갱신 보호) |
| `app/steppingstone/onboarding/page.tsx:472` | 이벤트로그 | `user?.id`당 1회 |
| `components/profile/ProfileAcademicActivities.tsx:172` | useMemo | `isSpeaker`가 쓰는 owner props가 deps에 존재 |
| `components/profile/ProfileAcademicActivities.tsx:241` | useMemo | 정렬 비교자 인라인 상수만 사용 |
| `features/board/PostForm.tsx:100` | mount-once | draft 로드 1회, setValue 안정 |
| `features/admin/settings/GreetingSection.tsx:62` | 폼 동기화 | 필드 단위 deps(객체참조 리싱크 방지) |
| `components/layout/WebVitalsTracker.tsx:17` | mount-once | 페이지 로드당 1회(pathname 의도적 고정) |
| `features/admin/AdminMemberTab.tsx:407` | useMemo | 필터/정렬, 입력 state 모두 deps 포함, 헬퍼만 제외 |
| `features/conference/ConferenceProgramEditor.tsx:835` | autosave | `draft` deps 포함 → 최신 handleSave 재캡처 |
| `components/flashcard/FlashcardStudy.tsx:222` | 키보드 | `current/index` 등 deps 포함 → `grade` 재구독 |
| `features/mypage/HabitTracker.tsx:140` | useMemo | 차트 계산, `dailyCounts` 등 deps 완비 |
| `features/mypage/HabitTracker.tsx:166` | useMemo | 동일 |
| `features/mypage/HabitTracker.tsx:192` | useMemo | 동일 |
| `features/research/ResearchModelEditor.tsx:155` | mount-once | 초기 flow 레이아웃 1회 계산(의도적) |
| `features/research/ResearchDesignEditor.tsx:368` | useMemo | `strictKind`는 `form.approach`(deps)에서 파생 |
| `components/diagnosis/DiagnosisRunner.tsx:148` | useMemo | `questions/answers` deps, `isAnswered` 헬퍼만 제외 |
| `features/research/WritingPaperEditor.tsx:981` | 온보딩 넛지 | 프로파일 미설정 시 1회 유도, stale form은 판정만 영향(저저위) |
| `features/notifications/useNotifications.ts:147` | 안정참조 | `router`는 Next useRouter 안정 반환 |
| `features/research/ResearchReportInterview.tsx:1693` | autosave | 슬라이드 이동(`index`) 시 실행, index 변경 렌더의 최신 dirty 반영 |
| `features/research/ResearchPaperList.tsx:122` | 마이그레이션 | `user.id`당 1회 |
| `features/research/topic-explorer/TopicExplorer.tsx:95` | 포커스 | 질문 전환 시 포커스 이동 |
| `features/research/topic-explorer/TopicExplorer.tsx:158` | 저장 | `savedKeyRef` 가드로 중복 방지 |
| `features/research/study-timer/ReadingLogModal.tsx:75` | 폼 리셋 | `open` 전이 시 기본값 리셋(중복기록 방지) |
| `components/archive/ConsoleSimpleArchiveList.tsx:69` | 로드 | `type`가 deps에 있어 타입 변경 시 정상 리페치 |
| `app/diagnosis/page.tsx:279` | 이벤트로그 | `user?.id`당 1회, phase 의도적 제외 |
| `app/dashboard/page.tsx:163` | 방문시각 | `user.lastVisitAt` 제외로 self-update 루프 방지(의도적) |
| `app/gallery/page.tsx:52` | 딥링크 | `selectedAlbum` 가드로 앨범 로드 시 1회 오픈 |
| `app/courses/page.tsx:187` | URL 동기화 | `tab` 제외로 순환 방지, URL 변경만 반영 |
| `app/admin/user-audit/page.tsx:64` | 로드 | `user?.id` deps → 사용자 변경 시 리페치 |
| `app/archive/method-finder/page.tsx:117` | 포커스 | 질문 전환 포커스 |
| `app/archive/[type]/ArchiveTypeListClient.tsx:155` | mount-once | 라우트 단위 `type` 고정, 초기 1회 |
| `app/archive/[type]/ArchiveTypeListClient.tsx:220` | 전체로드 | 로드상태 플래그 deps 완비 |
| `app/archive/theory-map/page.tsx:78` | useMemo | `conceptIndex/loading` deps, matched 헬퍼는 conceptIndex 사용 |
| `app/archive/research-finder/page.tsx:121` | 포커스 | 질문 전환 포커스 |
| `app/activities/external/[id]/workbook/page.tsx:381` | 폼 동기화 | `existing?.updatedAt` deps(포커스 refetch 클로버 방지, 의도적) |
| `app/activities/external/[id]/program/notes/[planId]/page.tsx:146` | autosave | 내용 필드 deps 포함 → 최신 handleSave |
| `app/console/settings/academic-status/page.tsx:49` | 폼 동기화 | `recordId` 전이 시 리싱크(편집 보호 의도적) |
| `app/console/archive/review-queue/page.tsx:242` | 로드 | `allowed` deps, load는 fetch만 |
| `app/console/archive/page.tsx:1318` | mount-once | freshness 리뷰 타입 1회 로드 |
| `app/console/page.tsx:250` | 동기화-1회 | 로드완료(`hackathonChkLoading`) 시 로컬체크 병합 저장 |
| `app/console/page.tsx:283` | 동기화-1회 | 동일(semester) |
| `app/console/learning-guides/[id]/edit/page.tsx:54` | 폼 동기화 | `page.id` 전이 시 리싱크(외부 갱신 보호) |
| `app/console/learning-guides/[id]/edit/page.tsx:300` | 로드 | `id` deps → id 변경 시 리페치 |
| `app/console/learning-guides/page.tsx:85` | 로드 | `eligible` deps 게이트 |
| `app/console/handover/worklog/new/page.tsx:72` | useMemo | `roleParam`,`roleOptions.join(",")` deps |

> 참고: 표의 다수 "폼 동기화(가드)" 항목은 **특정 키가 바뀔 때만** 서버값으로 리싱크하도록 의도적으로 deps를 좁힌 것으로, 타이핑 중 외부 refetch가 편집 내용을 덮어쓰는 것을 막는 알려진 패턴이다(코드 주석에 명시). 이는 H1/H2와 반대 방향의 의도적 설계이며 stale "표시" 결함이 아니다.

---

## 수정 우선순위 제안
1. **H1** WritingPaperEditor Ctrl+S (데이터 유실 가능) — ref 패턴으로 즉시 수정 권장.
2. **H2** Hackathon 행사설정 폼 populate — `selConf` deps 추가(콜드로드 시 빈 폼/덮어쓰기 방지).
3. **M1** Learning Guide 진도 — 확인 후 `user?.id`/`guide?.id` deps 추가.

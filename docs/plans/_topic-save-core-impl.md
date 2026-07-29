# 주제 탐색 — 추천 주제 저장 + 핵심 주제 선택 + 관련 영역 자동 노출 (구현 문서)

작성: 2026-07-30 · 범위: MVP · 검증: tsc + eslint (next build 미실행 — 다른 게이트와 .next lock 회피)

## 요구사항
1. 주제 탐색 인터뷰의 추천 "주제 방향"을 저장.
2. 저장 목록을 주제 탐색 화면 하단 별도 영역에 표시(목록·삭제).
3. 저장한 주제 중 핵심 주제 1개 선택(단일).
4. 핵심 주제를 논문 읽기·연구보고서 등 관련 영역에서 자동 노출.

## 데이터 모델 결정 — (A) 프로필 필드

`users.savedTopicDirections?: SavedTopicDirection[]` (프로필 필드) 채택.

```ts
// src/types/topic-exploration.ts
export interface SavedTopicDirection {
  id: string;          // 저장 시점 생성 (crypto.randomUUID, 폴백 있음)
  label: string;       // 주제 문장 (frame.sentence)
  approach?: string;   // 양적/질적/혼합/개발·설계 — 배지용
  note?: string;       // 사용자 메모 (선택, MVP UI 미노출)
  createdAt: string;   // ISO
  isCore?: boolean;    // 전체 목록에서 단 하나만 true
}
```

### 근거
- **소량 데이터**(수~십수 개) — 요구사항이 명시적으로 소량이면 (A) 권장.
- **rules 변경 불필요**: 회원이 자기 `users` 문서 필드를 이미 자유롭게 self-update 함
  (`streakFreezes: string[]`, `thesisJourneyStage: number` 등이 `profilesApi.update`로 동일 패턴 저장).
  따라서 firestore.rules **변경 없음**.
- **크로스 서피스 노출이 공짜**: 핵심 주제가 로그인 사용자 프로필(authStore.user)에 이미 실려 있어
  논문 읽기·연구보고서 화면에서 **추가 fetch 없이** 즉시 조회 가능.
- **낙관적 갱신 패턴 재사용**: `setUser({...user, savedTopicDirections})` 선반영 → `profilesApi.update` →
  실패 시 롤백 + toast (LearningStreak `streakFreezes` 토글과 동일).

### 대안 (B) 신규 컬렉션 `research_topic_directions`
- 기존 `topic_explorations` 컬렉션·`topicExplorationsApi`·rules 패턴을 복제하는 방식.
- 목록이 수백 개로 커지거나, 여러 기기·세션에서 실시간 동기화가 필요하면 (B)가 유리.
- 본 MVP는 소량 + 개인 데이터 + 크로스 서피스 조회 요구가 커서 (A)의 마찰이 훨씬 작아 (A) 선택.

## 구현 지점 (파일:라인은 대략)

### 타입
- `src/types/topic-exploration.ts` — `SavedTopicDirection` 인터페이스 추가(기존 TopicExploration 아래).
- `src/types/user.ts` — 상단 `import type { SavedTopicDirection } from "./topic-exploration";`,
  `User` 인터페이스에 `savedTopicDirections?: SavedTopicDirection[]` 추가(`vacationWeeklyGoalHours` 다음).
  (두 타입 모두 `src/types/index.ts`에서 re-export 되어 `@/types`로 접근됨.)

### 공용 훅 (신규)
- `src/features/research/topic-explorer/useSavedTopics.ts`
  - `useSavedTopics()`: `{ saved, coreTopic, isSaved(label), save({label,approach,note}), remove(id), toggleCore(id) }`.
    - `save`: 중복(label 동일) 시 `toast.info` 후 skip → **중복 저장 방지**.
    - `toggleCore`: 지정 시 나머지 전부 `isCore=false`로 재작성 → **핵심 단일 보장**. 해제 시 해당 항목만 false.
    - 모든 쓰기는 낙관적 `setUser` + `profilesApi.update` + 실패 롤백.
    - id/createdAt 생성은 **이벤트 핸들러 내부**에서만(`new Date()`, `crypto.randomUUID`) — 렌더 경로 Date 직접호출 없음(warning 래칫 무관).
  - `useCoreTopic()`: 읽기 전용, 다른 화면에서 핵심 주제만 조회(공용 재사용).

### 저장 UI
- `src/features/research/topic-explorer/TopicExplorer.tsx`
  - import: lucide `Bookmark, BookmarkCheck, Star` + `useSavedTopics`.
  - `copyFrame` 아래에 훅 구조분해.
  - 추천 프레임 카드(각 frame)의 "복사" 옆에 **"저장/저장됨" 버튼** 추가(`isSaved`로 disabled 상태 표시).
  - 컴포넌트 최하단(결과 블록 밖, `savedTopics.length>0`일 때만) **"저장한 추천 주제"** 카드 섹션:
    목록·접근 배지·핵심 배지·★ 토글(핵심 단일)·삭제(Trash2). 결과 유무와 무관하게 항상 노출.

### 핵심 주제 크로스 노출
- `src/features/research/topic-explorer/CoreTopicBanner.tsx` (신규): `useCoreTopic()` 사용,
  핵심 주제 없으면 `null` 렌더(미노출). "내 핵심 주제: {label}" 배너 + 주제 탐색 링크.
- `src/components/mypage/MyResearchView.tsx`:
  - `import CoreTopicBanner`.
  - **논문 읽기(reading)** · **연구보고서(reportdoc)** TabsContent 상단에 `{isSelf && <CoreTopicBanner/>}` 삽입.
  - `isSelf` 게이트: 배너는 로그인 사용자(authStore) 기준이므로 타인 프로필 열람 시 오노출 방지.

## rules 변경
- **없음.** 회원 self-update 로 `users` 문서에 필드 저장(기존 streakFreezes/thesisJourneyStage 와 동일 경로).

## 엣지 케이스
- **중복 저장**: 동일 label 존재 시 저장 skip + `toast.info`, 버튼은 "저장됨" disabled.
- **핵심 교체**: 다른 항목 ★ 클릭 시 이전 핵심 자동 해제(단일 유지). 같은 항목 재클릭 시 해제.
- **삭제**: 핵심 항목을 삭제하면 목록에서 사라지고 배너도 자동 미노출(coreTopic 없음).
- **비로그인/타인 프로필**: 배너는 authStore.user 기준 + `isSelf` 게이트로 미노출.
- **저장 실패**: 낙관적 반영 롤백 + `toast.error`.
- **오염/구버전 값**: `Array.isArray` 가드로 비배열 필드 방어(빈 배열 처리).

## 검증 결과
- `npx tsc --noEmit` → **0 errors** (TSC_EXIT=0).
- `npx eslint <변경 6파일>` → 결과는 최종 메시지 참조.
- `next build` → **미실행**(지시: .next lock 회피). 런타임 스모크는 배포 트랙에서 수행 권장.

## 변경 파일
1. `src/types/topic-exploration.ts` (SavedTopicDirection 추가)
2. `src/types/user.ts` (import + savedTopicDirections 필드)
3. `src/features/research/topic-explorer/useSavedTopics.ts` (신규 · 공용 훅)
4. `src/features/research/topic-explorer/CoreTopicBanner.tsx` (신규 · 크로스 노출 배너)
5. `src/features/research/topic-explorer/TopicExplorer.tsx` (저장 버튼 + 하단 저장 목록)
6. `src/components/mypage/MyResearchView.tsx` (reading·reportdoc 탭 배너 삽입)

# Surface Naming Map — yonsei-edtech

> 실측 기준: 2026-07-20 코드 grep/ls/cat  
> 목적: 유사 명명 표면의 역할 구분을 문서화해 유지보수 혼선 방지  
> 원칙: 코드 이동/리네임 없음 — 역할 기술만

---

## 1. network / networking 4중 명명군

가장 혼선이 큰 군. 같은 단어 어근(`network`)이 **서로 다른 도메인** 두 개(그래프 vs 모임·행사)에 혼재.

| 표면 | 경로 | 역할 한 줄 | Firestore 컬렉션 | 진입 메뉴/라벨 | 혼동 주의 |
|---|---|---|---|---|---|
| 회원 관계망 그래프 | `/network` | 회원 간 동기·신분 연결망 시각화(Connectivism 이론 기반) | 없음 — `profiles` 읽기 전용 | 헤더 "회원 관계망 Map" · command palette `r:network` | `features/networking`(모임)과 **디렉토리 이름이 유사** |
| (단수) 없음 | `/networking` | **404 — 조치 불요 종결(v9-M2)** 실 트래픽 인입처 없음 확인 | — | — | 재생성·리다이렉트 금지(v9 판정 재제안 금지) |
| 모임·행사 서버 API | `api/networking/*` | `/gatherings` 화면이 쓰는 서버사이드 처리(RSVP, 회비, 참석자 집계). 직접 브라우저 접근 없음 | `networking_events` `networking_rsvps` `networking_dues` `networking_availability` `networking_event_tokens` | (클라이언트 API 내부 호출) | URL에 `networking` 있어 그래프(`/network`)와 혼동 가능 — **실제로는 모임·행사 전용** |
| 모임·행사 운영 콘솔 | `console/networking` | 운영진(staff+)이 행사 등록·수정, 참석자 명단, 회비 납부, 정산, CSV 처리 | 동일(`networking_*`) | 콘솔 레이아웃 내부 메뉴 | `/network`(그래프)와 한 글자 차이 |

### features 디렉토리 분리

```
src/features/network/      ← 회원 관계망 그래프 전용
  NetworkGraph.tsx
  NetworkControls.tsx
  CollaboratorRecommendations.tsx
  NetworkAnalyticsReport.tsx
  build-network.ts

src/features/networking/   ← 모임·행사 전용 (gatherings + console/networking)
  EventEditorForm.tsx
  GatheringEventCard.tsx
  NetworkingPoll.tsx
  NetworkingProgramManager.tsx
  NetworkingStats.tsx
  networking-helpers.ts
```

**규칙**: `features/network`(단수)는 그래프, `features/networking`(복수)는 모임·행사. import 경로 혼동 금지.

---

## 2. gatherings — 모임·행사 회원 표면

| 표면 | 경로 | 역할 한 줄 | Firestore 컬렉션 | 진입 메뉴 | 혼동 주의 |
|---|---|---|---|---|---|
| 모임·행사 (회원용) | `/gatherings` | 다가오는·지난 모임 목록, 참석 신청(로그인·게스트), 회비 현황 | `networking_events` `networking_rsvps` `networking_dues` `networking_availability` | 헤더 "구성원·네트워크 > 모임·행사" · command palette `r:gatherings` (키워드 `모임 행사 네트워킹`) | **URL은 `gatherings`지만 Firestore 컬렉션은 `networking_*`** — 클라 코드가 `networkingEventsApi` 등을 직접 호출 |
| 모임·행사 상세 | `/gatherings/[id]` | 개별 행사 상세, RSVP 폼, 프로그램, 사진 앨범 역링크 | 동일 | 목록 카드 클릭 / 구버전 `#event-{id}` 앵커 자동 리다이렉트 | — |
| 모임·행사 투표 (게스트) | `/gatherings/poll` | 비로그인 게스트의 일정 투표 전용 경로 | `networking_availability` | 비공개 링크(QR·공유) | — |

> **핵심**: `gatherings` = 회원·게스트 진입 표면 / `console/networking` = 운영진 진입 표면 — 동일 컬렉션을 양쪽에서 씀.

---

## 3. directory — 연락망

| 표면 | 경로 | 역할 한 줄 | API | 진입 | 혼동 주의 |
|---|---|---|---|---|---|
| 회원 연락망 (공개용) | `/directory` | 학회원 연락처·직업 정보 조회 (AuthGuard, 연락처 가시성 필터) | `/api/members/directory` (토큰 인증) | command palette "구성원 디렉토리" (키워드 `디렉토리 명부`) | 헤더 직접 메뉴 없음 — command palette 또는 직접 URL |
| 회원 연락망 (운영용) | `console/directory` | 동일 `DirectoryContent` 컴포넌트를 `variant="console"`로 재사용 | 동일 | 콘솔 레이아웃 | `/directory`와 코드 공유 — 컴포넌트 수정 시 양 표면 동시 영향 |

---

## 4. board / boards / seminar 명명군

| 표면 | 경로 | 역할 한 줄 | 데이터 | 진입 | 혼동 주의 |
|---|---|---|---|---|---|
| 게시판 허브 | `/board` | 카테고리 게시판 허브 페이지 | comm_boards 관련 | 헤더 "소통 > 각 게시판 직링크" | URL 단수 `/board`이지만 하위에 여러 카테고리 |
| 카테고리 게시판 | `/board/{category}` | `free` `interview` `paper-review` `promotion` `resources` `update` `staff` 7종 카테고리 | comm_boards | 헤더 소통 섹션 각 항목 | — |
| 세미나 Q&A 게시판 | `/board/seminar` | 세미나 회차별 질문·답변 게시판. `/seminars` 연동 배너 포함 | comm_boards/seminar | `/board` 하위 | **`/seminars`(이벤트)와 별개** — 게시판은 `/board/seminar`, 이벤트는 `/seminars` |
| 게시판 동적 라우트 | `/boards/[boardId]` | 동일 게시판 시스템의 동적 slug 라우트. 레이아웃 title "보드" | comm_boards | 직접 URL | `/board`(복수 없음)와 `/boards`(복수 있음) 구분 — 두 라우트가 공존 |
| 세미나 이벤트 | `/seminars` | 매주 발제·토론 세미나 목록 (이벤트 데이터) | `seminars` 컬렉션 | 헤더 "학술활동 > 세미나" · BottomNav | **이름 유사하나 `/board/seminar`(게시판)과 전혀 다른 도메인** |
| 세미나 라이브 | `/seminars/[id]` 하위 | 라이브 장표·Q&A·설문 (onSnapshot 실시간) | seminars/live_sessions | 세미나 카드 | — |

---

## 5. 새 기능을 어디에 붙여야 하는가 — 결정 가이드

1. **회원 간 연결·관계·추천** 기능 → `/network` + `features/network/` + Firestore는 `profiles` 재사용.  
   예: 공동연구자 추천 카드, 관계망 필터 추가.

2. **모임·행사·일정·회비** 기능 → 회원 화면은 `/gatherings`, 운영 화면은 `console/networking`, 서버 로직은 `api/networking/*`, 컴포넌트는 `features/networking/`, Firestore는 `networking_*` 컬렉션.  
   예: 행사 체크인, 심사 배정 — `console/networking`에 탭 추가.

3. **회원 연락처·명부** 기능 → `/directory` + `console/directory` 공유 컴포넌트 (`DirectoryContent`). API는 `/api/members/directory` 경유.

4. **게시판·커뮤니티 글쓰기** 기능 → `/board/{category}` 카테고리 게시판 또는 `/boards/[boardId]` 동적 라우트. 세미나 연동이 필요하면 `/board/seminar`에 배너·링크 추가.

5. **세미나 콘텐츠·발제·Q&A 이벤트** 기능 → `/seminars` 이벤트 표면. 게시판 토론은 `/board/seminar`.

---

*실측 파일: `src/app/network/page.tsx`, `src/app/gatherings/page.tsx`, `src/app/directory/page.tsx`, `src/app/api/networking/`, `src/app/console/networking/page.tsx`, `src/app/console/directory/page.tsx`, `src/app/board/`, `src/app/boards/`, `src/app/seminars/`, `src/components/layout/Header.tsx`, `src/components/layout/BottomNav.tsx`, `src/components/layout/command-routes.ts`, `src/lib/bkend.ts`, `src/features/network/`, `src/features/networking/`*

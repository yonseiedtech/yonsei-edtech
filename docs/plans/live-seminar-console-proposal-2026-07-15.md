# 실시간 세미나 라이브 콘솔 제안서 (Live Seminar Console)

- 작성일: 2026-07-15
- 대상 서비스: yonsei-edtech (연세교육공학회, https://yonsei-edtech.vercel.app)
- 요청: 세미나 기능과 연계한 **① 실시간 PPT(PDF) 장표 + 강의노트, ② 실시간 Q&A, ③ 실시간 설문조사**

---

## 1. 배경 · 목표

현재 세미나는 "사전 등록 → 현장 참석 → 사후 후기/수료증" 흐름은 갖췄으나, **세미나가 진행되는 그 순간(라이브)** 을 담는 기능이 없다. 발표 장표는 별도 파일로 공유되고, 질문은 구두로만 오가며, 설문은 세미나가 끝난 뒤 별도 폼으로 걷는다.

이 제안은 세미나 **진행 중 실시간 상호작용**을 하나의 콘솔로 묶는다:

- **발표자**가 장표를 넘기면 참가자 화면이 실시간으로 따라온다 + 슬라이드별 강의노트 제공
- **참가자**가 질문을 올리고 서로 추천(업보트)하면 발표자가 우선순위대로 응답한다 (Slido 스타일)
- **발표자**가 설문/투표를 띄우면 참가자가 즉석 응답하고 결과가 실시간 집계되어 스크린에 뜬다

핵심 설계 원칙: **새 실시간 서버(WebSocket)를 만들지 않는다.** 이 프로젝트는 이미 comm-board(Q&A)에서 **Firebase Firestore `onSnapshot` 클라이언트 리스너**로 실시간을 구현하고 있다. 라이브 콘솔도 동일 패턴을 재사용해 인프라 추가 없이 구축한다.

---

## 2. 기존 자산 인벤토리 (재사용 · 확장 · 신규 구분)

탐색 결과, 3대 기능 중 2개는 이미 상당 부분 존재한다.

| 구성요소 | 상태 | 근거 파일 |
|---|---|---|
| 실시간 전송 (onSnapshot) | ✅ 존재 · 재사용 | `src/lib/firebase.ts` (`db` 클라이언트), `src/features/comm-board/WallBoard.tsx:118,148` (comm_questions/comm_answers onSnapshot) |
| Firebase Storage (파일 업로드) | ✅ 존재 · 재사용 | `src/lib/firebase.ts:38` (`storage` export) |
| 세미나 도메인 모델 | ✅ 존재 | `src/types/seminar.ts` (Seminar, SeminarSession, SeminarMaterial, SeminarSpeaker) |
| **실시간 Q&A** | ✅ 존재 · **연계만 보강** | comm-board: `CommBoard.contextType = "seminar"` 이미 지원 (`src/types/comm-board.ts:2`), QR·발표(present) 모드·게스트·업보트(likeCount)·채택·발표자 태깅 완비 |
| **설문/투표 모델** | 🔶 부분 존재 · **확장** | `src/types/academic.ts:329~370` (Poll: vote/survey, single/multiple/text/rating, status draft/active/closed, PollResponse). 단 **seminarId 링크·실시간 결과 push 없음** |
| **PDF 장표 뷰어** | ❌ 없음 · **신규** | 현 `@react-pdf/renderer` 는 인증서·뉴스레터 *생성*용일 뿐, 업로드 PDF *열람/동기화* 뷰어 없음 |
| **강의노트 (슬라이드별)** | ❌ 없음 · **신규** | — |

**요약:** Q&A는 거의 다 있고(연계 배선만), 설문은 모델 확장, **장표+강의노트가 진짜 신규 구축분**이다.

---

## 3. 아키텍처 개요

### 3.1 실시간 동기화 방식

모든 라이브 상태는 **Firestore 문서 + 클라이언트 onSnapshot** 으로 동기화한다. 발표자가 쓰고(제어 문서 업데이트), 참가자는 읽는다(리스너).

```
발표자 콘솔 ──write──▶ Firestore: seminar_live_sessions/{id}  ──onSnapshot──▶ 참가자 뷰 (N명)
                          { currentSlide, activePollId, status }        발표 스크린(프로젝터)
```

### 3.2 장표(PDF) 처리 — 클라이언트 래스터화 방식

Vercel 서버리스에서 PDF를 이미지로 변환하면 무겁고 불안정하다. 대신 **발표자 브라우저에서 업로드 시점에 PDF를 페이지별 PNG로 렌더링(pdfjs)** 하여 Firebase Storage에 올린다.

- 업로드 1회 비용으로 끝나고, 라이브 열람은 단순 `<img>` 교체 → **모바일·저사양에서도 빠르고 CSP/worker 이슈 없음**
- 라이브 동기화 = `currentSlide` 숫자 하나만 onSnapshot으로 전파 (초경량)
- 원본 PDF도 Storage에 함께 보관 → "원본 다운로드" 제공

의존성: `pdfjs-dist` (클라이언트 래스터화용, worker는 정적 asset로 self-host). 뷰어에 무거운 `react-pdf` 컴포넌트 트리는 불필요.

### 3.3 데이터 모델 (신규 Firestore 컬렉션)

```ts
// src/types/seminar-live.ts (신규)

export type LiveStatus = "idle" | "live" | "paused" | "ended";

// 라이브 세션 제어 문서 — 세미나당 1개, 실시간 동기화의 중심
export interface SeminarLiveSession {
  id: string;                 // = seminarId (1:1)
  seminarId: string;
  status: LiveStatus;
  presenterId: string;
  presenterName: string;
  deckId?: string;            // 현재 발표 중인 장표 덱
  currentSlide: number;       // 0-based, 발표자가 넘기는 현재 페이지
  totalSlides: number;
  activePollId?: string;      // 지금 띄운 설문/투표 (없으면 미표시)
  qaBoardId?: string;         // 연결된 comm-board id
  allowGuest: boolean;
  joinCode: string;           // 6자리 참여 코드 (QR/수기 입장)
  participantCount?: number;  // 라이브 접속자 수 (presence 집계)
  startedAt?: string;
  endedAt?: string;
  updatedAt: string;
}

// 업로드된 장표 덱 + 발표자 강의노트
export interface SeminarSlideDeck {
  id: string;
  seminarId: string;
  title: string;
  sourcePdfUrl: string;       // 원본 PDF (Storage)
  pageImageUrls: string[];    // 페이지별 PNG (Storage), index = slide no.
  pageCount: number;
  lectureNotes: Record<number, string>; // slide index → 발표자 강의노트(마크다운)
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

// 참가자 개인 노트 (비공개) — 슬라이드에 앵커링
export interface SeminarNoteEntry {
  id: string;
  seminarId: string;
  ownerId: string;            // 로그인 userId 또는 게스트 로컬 id
  slide: number;
  body: string;
  createdAt: string;
  updatedAt: string;
}
```

재사용/확장:

```ts
// src/types/academic.ts — Poll 확장 (기존 필드 유지, 추가만)
export interface Poll {
  // ...기존...
  seminarId?: string;         // [추가] 세미나 라이브 설문 연결
  livePushedAt?: string;      // [추가] 발표자가 라이브로 띄운 시각
}
```

Q&A는 기존 `comm_boards` / `comm_questions` / `comm_answers` 를 그대로 사용 (contextType="seminar", contextId=seminarId). 신규 컬렉션 불필요.

---

## 4. 화면 · 역할 설계

### 4.1 발표자·운영자 콘솔 — `/seminars/[id]/live/host`
- 장표 업로드(드래그&드롭 PDF) → 자동 페이지 래스터화 진행바
- 슬라이드 네비게이션(◀ ▶, 썸네일 스트립, 키보드 ←/→) → 넘길 때마다 `currentSlide` write
- **강의노트 에디터**: 현재 슬라이드 옆에 발표자 노트 작성/표시 (사전 작성 또는 라이브 타이핑)
- **Q&A 모더레이션 패널**: 업보트 순 질문 정렬, "답변 완료" 체크, 부적절 질문 숨김
- **설문 제어**: 준비된 설문 목록 → "지금 띄우기"(activePollId set) → 실시간 응답률·결과 → "마감"
- 라이브 시작/일시정지/종료 토글, 접속자 수, 참여 코드·QR 표시

### 4.2 참가자 뷰 — `/seminars/[id]/live`
- 상단: 발표자와 **동기화된 현재 슬라이드** (기본 "발표자 따라가기", 토글로 자유 열람 가능 — 놓친 페이지 되돌아보기)
- 하단 탭: **내 노트** | **Q&A** | **설문**
  - 내 노트: 현재 슬라이드에 묶인 개인 메모(자동저장, 비공개). 사후 "내 노트 내보내기"
  - Q&A: 질문 작성 + 남의 질문 업보트, 채택/답변 표시 (comm-board 재사용)
  - 설문: activePollId 있으면 응답 폼 노출 → 제출 후 실시간 결과(showResults 시)
- 비로그인 입장: 참여 코드 입력 → 학번·이름(또는 닉네임) 1회 → 게스트로 참여 (comm-board 게스트 패턴 재사용, 개인정보 최소화)

### 4.3 발표 스크린(프로젝터) — `/seminars/[id]/present`
- 대형 현재 슬라이드 + 하단 **입장 QR + 참여 코드**
- 우측/하단 **실시간 Q&A 티커**(업보트 상위 질문 흐름) — comm-board present/wall 모드 재사용
- 설문 활성 시 **결과 오버레이**(막대/비율 실시간)
- 강의 진행 중 청중 몰입 유도용. UI 최소·고대비.

---

## 5. 구현 단계 (Phase)

| Phase | 내용 | 주요 산출 | 재사용/신규 |
|---|---|---|---|
| **P0** | 타입 + Firestore/Storage 규칙 + 라이브 세션 CRUD 훅 | `types/seminar-live.ts`, `academic.ts` Poll 확장, `firestore.rules`/`storage.rules`, `useLiveSession` | 신규 |
| **P1** | 장표 업로드(클라 래스터화) + 뷰어 + 라이브 슬라이드 동기화 | `SlideUploader`, `SlideViewer`, `useSlideSync`, 호스트 슬라이드 제어 | 신규 (pdfjs-dist 추가) |
| **P2** | 강의노트(발표자 슬라이드별) + 참가자 개인 노트 | `LectureNotesEditor`, `AttendeeNotesPanel`, `useSeminarNotes` | 신규 |
| **P3** | 실시간 Q&A 연계 (comm-board 임베드 + 세미나 보드 자동 프로비저닝 + 모더레이션) | `LiveQAPanel` (WallBoard 래핑), 호스트 모더레이션 | 재사용+배선 |
| **P4** | 실시간 설문/투표 (Poll에 seminarId, 호스트 push, 참가자 응답, 실시간 결과) | `LivePollControl`, `LivePollRespond`, `useLivePollResults` | 확장 |
| **P5** | 발표 스크린(프로젝터) + 입장 QR/코드 + presence 접속자 수 | `/present` 페이지, `JoinGate`, presence heartbeat | 재사용+신규 |
| **P6** | 사후 아카이브 (노트 내보내기·Q&A 아카이브·설문 결과 리포트·출석 연동) + 세미나 상세 탭 배선 | `/seminars/[id]` "라이브" 탭, 결과 리포트 | 배선 |

각 Phase는 독립 배포 가능 (게이트: tsc → vitest → CI 빌드 → 배포). P1이 가장 크며(신규 PDF 파이프라인), P3는 배선 중심으로 가볍다.

---

## 6. 제약 · 리스크

- **저작권**: 업로드 장표는 발표자 본인 자료 전제. 업로드 시 "본인 자료/인용 출처 확인" 고지. 외부 저작물 무단 재배포 금지 안내.
- **개인정보**: 참가자 개인 노트는 소유자 비공개(Firestore rules로 ownerId 강제). 게스트는 학번·이름 최소 수집, 집계 뷰에 미노출(comm-board 원칙 동일).
- **Storage 용량**: 페이지 PNG는 폭 제한(예: 1600px)·압축으로 관리. 세미나 종료 후 원본 PDF만 장기 보관, PNG는 정책상 정리 가능.
- **Firestore 비용**: onSnapshot 리스너는 접속자 수만큼. 제어 문서(currentSlide 등)는 소형 단일 문서라 read 폭증 적음. Q&A/설문은 기존 comm-board 수준.
- **동시성**: 발표자 제어는 presenterId 소유자만 write (rules). 슬라이드 넘김은 last-write-wins로 충분.
- **오프라인 세미나**: 참가자가 자기 기기로 접속(QR) → 스크린은 프로젝터. 온라인 세미나는 참가자 뷰만으로 충족.

---

## 7. 성공 지표

- 라이브 세션 개설·장표 동기화가 발표자 1인 조작으로 참가자 N명에게 <1초 반영
- 세미나당 Q&A 질문 수·업보트·설문 응답률(사후 리포트로 측정)
- 사후: 참가자 개인 노트 보유율, 노트 내보내기 사용, 설문 결과의 운영 활용

---

## 8. 즉시 착수 (P0 → P1)

승인 대기 없이 자율 PM 모드로 P0(타입·규칙·훅) → P1(장표 파이프라인)부터 구현하고, Phase 단위로 게이트·배포하며 진행 상황을 체크포인트로 보고한다.

---

## 9. 구현 현황 (2026-07-16)

MVP를 한 번에 배포 가능한 형태로 통합 구현했다. Phase 를 개별 배포하지 않고 P0~P6 핵심을 묶어 1차 배포한다.

**신규 파일**
- `src/types/seminar-live.ts` — SeminarLiveSession / SeminarSlideDeck / SeminarNoteEntry + generateJoinCode
- `src/lib/pdf-rasterize.ts` — 클라이언트 PDF→PNG 래스터화 (pdfjs-dist 4.10)
- `src/features/seminar-live/` — useLiveSession, useSeminarNotes, ensure-qa-board, SlideViewer, SlideUploader, LectureNotesEditor, AttendeeNotesPanel, LivePollControl, LivePollRespond, useLivePollResults, SeminarLiveEntry
- `src/app/seminars/[id]/live/page.tsx` (참가자) · `live/host/page.tsx` (발표자 콘솔) · `present/page.tsx` (프로젝터)

**확장/배선**
- `src/types/academic.ts` Poll 에 seminarId / livePushedAt 추가
- `src/lib/bkend.ts` — seminarLiveApi / slideDecksApi / seminarNotesApi / seminarPollsApi
- `firestore.rules` — seminar_live_sessions / seminar_slide_decks / seminar_note_entries
- `storage.rules` — seminar-slides/{seminarId} (PDF + PNG)
- `firestore.indexes.json` — seminar_slide_decks·seminar_note_entries·polls(seminarId) 복합 인덱스
- 세미나 상세 페이지에 SeminarLiveEntry 배선(Hero 하단)

**Q&A 재사용**: comm-board(contextType="seminar")를 그대로 사용 — 참가자/호스트 `WallBoard variant="wall"`, 프로젝터 `variant="present"`. 세션당 보드 1개 자동 프로비저닝(ensure-qa-board).

**배포 후 운영 액션**: `firebase deploy --only firestore:rules,firestore:indexes,storage` 로 규칙·인덱스·스토리지 규칙 반영 필요(코드 배포와 별개).

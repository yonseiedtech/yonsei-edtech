# 스터디·세미나 수요 조사 기능 구현 보고서

**작성일**: 2026-07-23  
**구현 범위**: 수요 조사 보드 데이터 레이어 + 회원 표면 + 콘솔 집계 + 진입 링크

---

## 1. 보드 컨벤션

### 데이터 레이어 (신규 컬렉션 없음)

| 항목 | 값 |
|---|---|
| Firestore 컬렉션 | `comm_boards` / `comm_questions` / `comm_likes` |
| contextType | `"demand"` (CommContextType에 추가) |
| contextId | `"demand-2026-2"` (학기별 교체 포인트) |
| 보드 상태 | `status: "open"`, `allowGuest: false` |
| 정렬 기본값 | `defaultSort: "popular"` (공감순) |

### comm_question 필드 매핑

| CommQuestion 필드 | 용도 |
|---|---|
| `body` | 희망 주제 (≤140자, 필수) |
| `presenter` | 유형 — `"스터디 희망"` \| `"세미나 희망"` |
| `demandPref.format` | 선호 형태 — `"온라인"` \| `"오프라인"` \| `"무관"` |
| `demandPref.note` | 메모 — 희망 주기·수준 등 (≤100자, 선택) |
| `likeCount` | commLikesApi.toggle 공감 카운트 |
| `authorId` / `authorName` | 등록 회원 (1인 다건 허용) |

### 타입 변경

- `src/types/comm-board.ts`
  - `CommContextType`에 `"demand"` 추가
  - `CommQuestion.demandPref?: { format?, note? }` 옵셔널 필드 추가

---

## 2. 표면 구성

### 회원 페이지 (`/activities/demand`)

- **진입**: 로그인 필수 / 비로그인 → 로그인 CTA
- **등록 폼**: 주제 한 줄 + 유형 칩(스터디/세미나) + 형태 칩(온라인/오프라인/무관) + 메모(선택)
- **보드**: 유형 필터 탭(전체/스터디/세미나) + 공감순 정렬 기본 + "저도 원해요" 공감 토글 + 본인 글 삭제
- **안내 문구**: "공감이 많은 주제부터 개설을 검토해요"

### 콘솔 집계 페이지 (`/console/demand`)

- **요약 타일**: 총 건수 / 공감 합계 / 스터디 희망 건수 / 세미나 희망 건수 + Top 3 목록
- **목록 테이블**: 공감수·주제·유형·형태·메모·작성자·작성일, 공감순
- **유형 필터 탭**: 전체 / 스터디 / 세미나
- **CSV 내보내기**: BOM prefix + 수식 인젝션 escape (`=+−@\t\r` 시작 셀에 `'` prefix)

---

## 3. 진입 링크

| 위치 | 추가 내용 |
|---|---|
| Header 드롭다운 "학술 활동" | "스터디" 아래 `{ href: "/activities/demand", label: "수요 조사" }` |
| `/activities` 허브 카드 그리드 | "수요 조사 · 개설 희망" 카드 (ClipboardList 아이콘) |
| `/seminars` 목록 하단 | "듣고 싶은 세미나 주제가 있나요?" 점선 카드 배너 |
| 콘솔 사이드바 "활동" 그룹 | "수요 조사 집계" 메뉴 (해커톤 운영 아래) |

---

## 4. Firestore rules

기존 `comm_boards` / `comm_questions` / `comm_likes` 규칙 그대로 적용:

- `comm_boards`: 읽기 공개, create = `isAuthenticated() && ownerId == uid` → ensure 패턴 통과
- `comm_questions`: create = `commBoardWritable(boardId)` (status=open + 로그인) → 통과
- `comm_likes`: create = `isAuthenticated() && userId == uid` → 통과

**규칙 수정 불필요** — 기존 comm 인프라가 demand contextType을 자동 수용.

`demandPref` 추가 필드: 규칙에 필드 화이트리스트 없음, 그대로 저장 가능.

---

## 5. 후속 메모

- **`/activities/studies` 목록 페이지 진입 카드**: 다른 트랙 충돌 회피로 이번 구현에서 제외. 추후 해당 트랙 완료 후 수요 조사 배너 동일 톤으로 추가 권장.
- **학기 교체**: `DEMAND_CONTEXT_ID = "demand-2026-2"` — 2027-1학기 개강 전 `"demand-2027-1"`로 교체하면 새 보드 자동 생성.
- **보드 status 관리**: 학기 종료 후 콘솔에서 `comm_boards` 문서 `status: "closed"`로 업데이트하면 신규 등록 차단.
- **알림 연동**: 추후 운영진이 수요 항목을 "개설 결정" 처리 시 등록자에게 알림 발송 기능 검토 가능.

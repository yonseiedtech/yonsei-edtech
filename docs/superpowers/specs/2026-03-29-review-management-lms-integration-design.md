# 후기 관리 확장 + LMS 관리자 통합 설계

**날짜**: 2026-03-29
**범위**: 후기 시스템 확장 (3종 후기, 통계, 검토/승인, 폼 커스터마이징) + LMS 관리자 탭 (홍보/포스터/타임라인 이동)

---

## 1. 개요

### 목표
- 후기 시스템을 참석자/연사/운영진 3종으로 확장
- 후기 관리 기능 (통계, 질문 관리, 검토/승인) 추가
- 세미나 관리 기능 중 콘텐츠 제작(홍보/포스터/타임라인)을 LMS 관리자 탭으로 이동

### 변경되지 않는 것
- `/seminar-admin/registrations` — 신청 관리 (현행 유지)
- `/seminar-admin/certificate` — 수료증 (현행 유지)
- `/seminar-admin/nametag` — 명찰 (현행 유지)
- 기존 `/seminar-admin/` 라우트는 하위호환을 위해 유지

---

## 2. LMS 탭 구조 변경

### 현재 (6개 탭)
```
개요 | 연사 소개 | 세션 | 자료실 | 참석자 후기 | 연사 후기
```

### 변경 후
```
[일반 탭 — 참석자+관리자]
개요 | 연사 소개 | 세션 | 자료실 | 세미나 후기
                                    └── 서브탭: 연사 | 운영진(공개만) | 참석자

[관리자 탭 — staff+ 전용, 구분선으로 분리]
후기 관리 | 홍보 콘텐츠 | 포스터 | 타임라인
```

기존 "참석자 후기" + "연사 후기" 2개 탭을 **"세미나 후기" 1개 탭**으로 통합.
내부에 서브탭(연사/운영진/참석자)으로 분리하여 표시.

### Tab 타입 변경
```typescript
// 기존
type Tab = "overview" | "speaker" | "sessions" | "materials" | "attendee-reviews" | "speaker-reviews";

// 변경
type Tab =
  | "overview" | "speaker" | "sessions" | "materials" | "reviews"
  | "review-management" | "promotion" | "poster" | "timeline";

// "reviews" 탭 내부 서브탭 (연사 → 운영진 → 참석자 순)
type ReviewSubTab = "speaker" | "staff" | "attendee";
```

### 세미나 후기 탭 내부 구조
```
┌─────────────────────────────────────┐
│ 세미나 후기                          │
├─────────────────────────────────────┤
│  [연사] [운영진] [참석자]             │  ← 서브탭 (pill 버튼 스타일)
│                                     │
│  (선택된 서브탭의 후기 목록)           │
│  + 해당 유형 후기 작성 폼            │
└─────────────────────────────────────┘
```

- 연사 서브탭: `type === "speaker"`, `status === "published"`
- 운영진 서브탭: `type === "staff"`, `visibility === "public"`, `status === "published"`
- 참석자 서브탭: `type === "attendee"`, `status === "published"`

### 탭 표시 로직
- 일반 탭(개요~세미나 후기): 모든 참석자에게 표시
- 관리자 탭(후기 관리~타임라인): `isAtLeast(user, "staff")` 일 때만 표시
- 관리자 탭 앞에 시각적 구분선 (border-left 또는 gap)

---

## 3. 후기 시스템 확장

### 3.1 후기 유형 3종

| 유형 | `type` 값 | 작성자 | 공개 범위 |
|------|-----------|--------|-----------|
| 참석자 후기 | `attendee` | 참석자 / 게스트 | 항상 공개 (상세 페이지 + LMS) |
| 연사 후기 | `speaker` | staff+ (대리 작성) | 항상 공개 (LMS) |
| 운영진 후기 | `staff` | staff+ | `visibility`에 따라 공개/비공개 |

### 3.2 데이터 모델 변경

**seminar_reviews 컬렉션 — 필드 추가:**
```typescript
interface SeminarReview {
  // 기존 필드
  id: string;
  seminarId: string;
  type: "attendee" | "speaker" | "staff";
  content: string;
  rating?: number;           // 1-5
  authorId: string;
  authorName: string;
  authorGeneration?: number;
  createdAt: string;
  updatedAt?: string;

  // 신규 필드
  visibility: "public" | "internal";  // 기본: "public"
  status: "published" | "hidden";     // 기본: "published"
  questionAnswers?: Record<string, string>; // 커스텀 질문에 대한 응답
}
```

**seminars 컬렉션 — 필드 추가:**
```typescript
interface Seminar {
  // 기존 필드 ...

  // 신규 필드
  reviewQuestions?: string[];  // 후기 폼에 표시할 커스텀 질문 목록
}
```

### 3.3 후기 표시 규칙

**세미나 상세 페이지 (`/seminars/[id]`):**
- `type === "attendee"` AND `status === "published"` 인 후기만 표시
- `type === "staff"` AND `visibility === "public"` AND `status === "published"` 인 후기도 표시

**LMS 일반 탭:**
- 참석자 후기 탭: `type === "attendee"` AND `status === "published"`
- 연사 후기 탭: `type === "speaker"` AND `status === "published"`
- 운영진 후기 탭: `type === "staff"` AND `visibility === "public"` AND `status === "published"`

**LMS 후기 관리 탭 (staff+):**
- 모든 후기 표시 (hidden, internal 포함)
- 숨기기/복원 토글 가능

---

## 4. 후기 관리 탭 상세

### 4.1 통계 카드

상단에 4개 카드:
- **총 후기 수**: 전체 건수
- **평균 평점**: 전체 평균 ★
- **유형별 분포**: 참석자 N / 연사 N / 운영진 N
- **숨김 처리**: N건

데이터 소스: `reviewsApi.list(seminarId)` 결과를 클라이언트에서 집계.

### 4.2 신청 시 질문(memo) 모아보기

기존 `RegistrationsTab`의 `QuestionManager` 로직을 재사용.
- `registrationsApi.list(seminarId)`로 신청자 목록 조회
- memo가 있고 유효한 질문만 필터링 (NO_QUESTION 패턴 제외)
- 읽기 전용 목록 (수정은 기존 신청 관리 페이지에서)

### 4.3 후기 폼 질문 설정

관리자가 세미나별 후기 폼에 표시할 질문을 설정:
- 세미나 문서의 `reviewQuestions: string[]` 필드 업데이트
- 기본 질문 1개 ("세미나에 대한 소감을 자유롭게 작성해주세요.") + 추가 질문
- 추가/삭제/순서 변경 UI
- 공개 후기 폼(`/seminars/[id]/review`)과 LMS 후기 작성 폼 모두에 반영

### 4.4 후기 작성 폼 (관리자용)

관리자가 후기 관리 탭에서 직접 후기를 작성할 수 있음:
- **유형 선택**: 참석자 / 연사 / 운영진 드롭다운
- **공개 여부**: 공개 / 비공개 (운영진 타입일 때만 선택 가능)
- **평점**: ★ 1-5
- **내용**: 텍스트 에디터
- 작성 시 `authorId`는 현재 로그인 사용자, `authorName`은 사용자 이름

### 4.5 후기 목록 (서브탭)

후기 목록은 3개 서브탭으로 분리:

```
┌──────────┬──────────┬──────────┐
│ 연사 후기 │ 운영진 후기│ 참석자 후기│
└──────────┴──────────┴──────────┘
```

각 서브탭에서:
- 해당 type의 모든 후기 표시 (hidden 포함, 비공개 포함)
- 각 후기 카드: 작성자명, 평점, 내용, 작성일
- **숨기기/복원 버튼**: `status` 토글 (`published` ↔ `hidden`)
- **삭제 버튼**: 관리자 권한
- hidden 상태 후기는 시각적으로 구분 (투명도 낮춤 + "숨김" 뱃지)
- internal 후기는 "비공개" 뱃지 표시

---

## 5. 관리 기능 LMS 이동

### 5.1 이동 대상

| 기능 | 현재 파일 | LMS 탭명 |
|------|-----------|----------|
| 홍보 콘텐츠 | `seminar-admin/promotion` 페이지 내 컴포넌트 | `promotion` |
| 포스터 제작 | `seminar-admin/poster` 페이지 내 컴포넌트 | `poster` |
| 타임라인 | `seminar-admin/timeline` → `TimelineTab.tsx` | `timeline` |

### 5.2 구현 방식

기존 컴포넌트를 `seminarId` prop을 받는 형태로 리팩터링:
- 현재: 컴포넌트 내에서 세미나 목록을 보여주고 선택하는 로직 포함
- 변경: `seminarId`를 외부에서 주입받아 해당 세미나만 관리
- `/seminar-admin/` 페이지에서는 기존처럼 세미나 선택 + 컴포넌트 렌더링
- LMS에서는 현재 세미나 ID를 직접 전달

### 5.3 코드 구조

```
src/features/seminar-admin/
  ├── PromotionPanel.tsx     ← 홍보 콘텐츠 (추출 또는 기존 활용)
  ├── PosterPanel.tsx        ← 포스터 제작 (추출 또는 기존 활용)
  ├── TimelineTab.tsx        ← 타임라인 (기존, seminarId prop 추가)
  └── ReviewManagement.tsx   ← 신규: 후기 관리 패널

src/features/seminar/
  └── SeminarLMS.tsx         ← 관리자 탭에서 위 컴포넌트 렌더링
```

---

## 6. API 변경

### 6.1 reviews API 수정 (`/api/reviews/route.ts`)

POST 요청 시 `visibility`, `status` 필드 저장:
```typescript
// 추가 필드
visibility: body.visibility || "public",
status: "published",
questionAnswers: body.questionAnswers || undefined,
```

### 6.2 리뷰 상태 토글 API

기존 `reviewsApi.update(id, data)` 활용:
- 숨기기: `reviewsApi.update(id, { status: "hidden" })`
- 복원: `reviewsApi.update(id, { status: "published" })`

별도 API 엔드포인트 불필요 (클라이언트 Firestore SDK 사용).

### 6.3 후기 질문 설정

기존 `seminarsApi.update(id, { reviewQuestions: [...] })` 활용.

---

## 7. 공개 후기 폼 변경 (`/seminars/[id]/review`)

### 커스텀 질문 표시
- 세미나 데이터에서 `reviewQuestions` 조회
- 각 질문을 별도 textarea로 표시
- 응답은 `questionAnswers: { "질문1": "답변1", ... }` 형태로 저장
- 기존 `content` 필드는 자유 작성란으로 유지

### 운영진 후기 필터링
- 세미나 상세 페이지 `ReviewsList`에서 `type === "staff" && visibility === "public"` 후기도 함께 표시

---

## 8. Acceptance Criteria

- [ ] LMS에 관리자 탭 4개 (후기 관리, 홍보, 포스터, 타임라인) 추가 — staff+에만 표시
- [ ] 운영진 후기 탭 추가 (공개 운영진 후기 표시)
- [ ] 후기 관리 탭: 통계 카드 (총 건수, 평균 평점, 유형별 분포)
- [ ] 후기 관리 탭: 신청 시 질문(memo) 모아보기
- [ ] 후기 관리 탭: 후기 폼 질문 설정 (추가/삭제)
- [ ] 후기 관리 탭: 관리자 후기 작성 폼 (유형 선택, 공개 여부)
- [ ] 후기 관리 탭: 3개 서브탭 (참석자/연사/운영진) + 숨기기/복원
- [ ] 공개 후기 폼에 커스텀 질문 표시
- [ ] 세미나 상세 페이지에 공개 운영진 후기 표시
- [ ] seminar_reviews에 visibility, status 필드 추가
- [ ] seminars에 reviewQuestions 필드 추가
- [ ] 홍보/포스터/타임라인 컴포넌트를 LMS 관리자 탭에서 렌더링
- [ ] 기존 `/seminar-admin/` 라우트 하위호환 유지
- [ ] `npm run build` 성공

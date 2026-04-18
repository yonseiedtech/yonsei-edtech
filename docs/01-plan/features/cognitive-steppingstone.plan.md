# 연세교육공학 인지디딤판 (Cognitive Stepping Stone) — 신입생 온보딩 (Track 6)

## Context

연세대학교 교육대학원 교육공학전공 신입생을 위한 **온보딩 허브 페이지**. 입학 전 오리엔테이션 시점부터 입학 후 1학기 정착까지 회원이 자력으로 따라갈 수 있는 가이드·체크리스트·신청 안내를 한 곳에 모은다.

장기적으로는 '인지디딤판' 브랜드 페이지의 첫 번째 콘텐츠 트랙이며, 이후 재학생 학습 가이드, 종합시험 대비 가이드, 졸업 준비 가이드 등이 추가될 수 있는 확장 가능한 구조로 설계.

### 사용자 컨텍스트 (직접 진술)

> "연세교육공학 인지디딤판 페이지를 개설해서, 해당 페이지에서 우선 구현해줄 것이 신입생 온보딩 프로그램이라고 해서, 입학 전 오리엔테이션때 미리 참고할 내용들이나 직접 신청해야할 것 알아야할 것들을 보여줄 수 있는 페이지가 있었으면 좋겠어. 이것도 마스터플랜 구현 계획에 추가해줘"

---

## 핵심 기능 (Phase 1 = 신입생 온보딩)

### F1. 인지디딤판 허브 페이지
- `/steppingstone` (또는 `/guides`) — 트랙 카탈로그
- Phase 1 진입 카드: "신입생 온보딩"
- 후속 트랙 자리표시자 (재학생 학습 가이드, 종합시험 대비, 졸업 준비)

### F2. 신입생 온보딩 페이지
- `/steppingstone/onboarding` 또는 `/onboarding`
- 입학 전 → 입학 직후 → 1학기 진입 단계별 가이드
- 콘텐츠 카테고리:
  - **사전 준비**: 합격 후 ~ 입학 전 해야 할 것 (서류, 결제, 계정 발급)
  - **OT/입학식**: 일정, 장소, 준비물, 좌석 안내
  - **수강신청 가이드**: 사전 수강편람 안내, 수강신청 프로세스, Track 5 소요조사 연계
  - **학회 가입**: 연세교육공학회 가입 절차 → `/signup` 연결
  - **학교 시설/자원**: 도서관·LMS·연구실·식당
  - **선배·동기 네트워킹**: 멘토링·세미나·디스코드/카톡 등
  - **자주 묻는 질문**: 학번 표기, 휴학, 전공 변경 등

### F3. 단계별 체크리스트
- 회원 본인의 진행 상태 추적 (로그인 시)
- 항목별 완료 토글 + 진행률 % 표시
- 각 항목에 외부 링크 / 양식 다운로드 / 학회 페이지 내 액션 (예: 회원가입, 세미나 신청) 연결

### F4. CMS형 콘텐츠 관리 (관리자)
- `/console/onboarding` — 카테고리·항목·순서 관리
- 항목 본문은 마크다운 입력
- 첨부파일 / 외부 URL / 내부 라우트 액션 3종 지원
- 발행 토글 (`published: true` 만 노출)

---

## 데이터 모델 (요약 — 상세는 Design 단계)

### 신규 컬렉션 2종

```typescript
// 가이드 트랙 (인지디딤판 단위 — 신입생 온보딩, 재학생 학습 등)
type GuideTrackKey = "onboarding" | "current_student" | "comprehensive_exam" | "graduation";

interface GuideTrack {
  id: string;
  key: GuideTrackKey;
  title: string;
  description?: string;
  iconKey?: string;        // lucide 아이콘명
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

// 가이드 항목 (신입생 온보딩 내 카테고리·항목)
type GuideItemActionType = "link" | "download" | "internal" | "info";

interface GuideItem {
  id: string;
  trackId: string;
  category: string;        // "사전 준비" / "OT" / "수강신청" 등
  title: string;
  body?: string;           // 마크다운
  /** 사용자 액션 */
  actionType: GuideItemActionType;
  actionUrl?: string;      // 외부 링크 / 내부 라우트
  attachmentPath?: string; // GCS 경로
  /** 적용 기간 (기수/학기 한정 안내) */
  appliesFrom?: string;
  appliesUntil?: string;
  order: number;
  published: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// 회원별 진행 상태 (체크리스트)
interface GuideProgress {
  id: string;
  userId: string;
  trackId: string;
  /** Item.id → 완료 시각 */
  completedItems: Record<string, string>;
  startedAt: string;
  updatedAt: string;
}
```

### bkend API 모듈 (lib/bkend.ts)
- `guideTracksApi`: list / listPublished / get / create / update / delete
- `guideItemsApi`: listByTrack / get / create / update / delete / reorder
- `guideProgressApi`: getByUser / upsert / toggle

---

## 페이지 구성

### 회원 (Public/Members)
- `/steppingstone` — 인지디딤판 허브 (트랙 카탈로그)
- `/steppingstone/onboarding` — 신입생 온보딩 가이드 (카테고리별)
- (확장) `/steppingstone/[trackKey]` — 트랙별 동적 페이지

### 운영진/조교 (Console)
- `/console/onboarding` — 트랙·항목 관리 (Phase 1은 onboarding 트랙 단일)
- (확장) `/console/steppingstone` — 다트랙 통합 관리

### Header / Sidebar 네비게이션
- 공개 메뉴: 학회 → "인지디딤판" 추가 (또는 별도 1차 메뉴)
- 콘솔 사이드바: 학술활동 그룹에 "인지디딤판" 추가

---

## Firestore 보안 규칙 (요약)

```
match /guide_tracks/{id} {
  allow read: if true;                              // 공개
  allow write: if isAuthenticated() && isStaffOrAbove();
}

match /guide_items/{id} {
  allow read: if resource.data.published == true || isStaffOrAbove();
  allow write: if isAuthenticated() && isStaffOrAbove();
}

match /guide_progress/{id} {
  allow read: if isOwner(resource.data.userId) || isStaffOrAbove();
  allow create, update: if isOwner(request.resource.data.userId);
  allow delete: if isOwner(resource.data.userId);
}
```

---

## 우선순위 단계 (PDCA 사이클 분할)

### Phase 1 — 데이터 모델 + 신입생 온보딩 페이지 (1주)
- types + bkend API 3종 모듈
- Firestore 규칙 추가 + 배포
- `/steppingstone` 허브 (정적 카드 + onboarding 진입)
- `/steppingstone/onboarding` 회원 뷰 (카테고리별 그룹 + 마크다운 렌더)

### Phase 2 — 콘솔 CMS (1주)
- `/console/onboarding` 항목 CRUD
- 카테고리·순서 드래그 정렬
- 마크다운 미리보기
- 첨부파일 업로드 (Firestore base64 또는 GCS)

### Phase 3 — 체크리스트 + 진행률 (3일)
- 항목별 완료 토글 (로그인 시)
- 진행률 % 카드 + 카테고리별 진척도
- 미완료 항목 강조

### Phase 4 — 콘텐츠 시드 (운영진 협업, 0.5주)
- 운영진과 함께 실제 신입생 온보딩 항목 입력 (사용자 추후 협업)
- "사전 준비" / "OT" / "수강신청" / "학회 가입" / "시설" / "FAQ" 카테고리당 5~10개

### Phase 5 — 확장 트랙 (선택, 추후)
- 재학생 학습 가이드, 종합시험 대비 가이드, 졸업 준비 가이드

---

## 핵심 파일

### 신규
- `src/types/index.ts` — Track 6 타입 3종 추가 (GuideTrack, GuideItem, GuideProgress + 라벨)
- `src/lib/bkend.ts` — API 모듈 3종 추가
- `firestore.rules` — 3 컬렉션 규칙 추가
- `src/app/steppingstone/page.tsx`
- `src/app/steppingstone/onboarding/page.tsx`
- `src/app/console/onboarding/page.tsx`
- `src/components/onboarding/OnboardingChecklist.tsx`
- `src/components/onboarding/OnboardingItemCard.tsx`

### 수정
- `src/components/layout/Header.tsx` — "인지디딤판" 메뉴 추가
- `src/app/console/layout.tsx` — 사이드바 "인지디딤판" 추가
- `src/components/mypage/MyPageView.tsx` — 진행 중인 가이드 위젯 (선택)

### 재사용
- `ConsolePageHeader`, `Badge`, `Button`, `AuthGuard`
- 기존 마크다운 렌더 (게시글에서 사용 중인 라이브러리 — `react-markdown` 또는 자체)
- `isStaffOrAbove`

---

## 비기능 요구사항

- **비로그인 열람 가능**: 입학 전 합격생도 볼 수 있어야 함 (회원가입 전).
- **체크리스트는 로그인 한정**: 진행 상태 저장은 로그인 회원만.
- **콘텐츠 신뢰성**: 입학 일정 등 시점 의존 정보는 `appliesFrom`/`appliesUntil` 적용 — 매년 갱신 누락 방지.
- **Track 5 연계**: "수강신청 가이드" 카테고리 항목에서 Track 5의 사전 소요조사·과목 카탈로그로 직접 연결.
- **모바일 최적화**: 신입생이 휴대폰으로 가장 많이 봄 — 카드형 레이아웃, 큰 탭 버튼.

---

## 검증 (Verification)

- `npx tsc --noEmit` 통과
- `npm run build` 통과
- Phase 1 종료 시: `/steppingstone/onboarding` 접근 + 5개 이상 항목 노출 확인
- Phase 2 종료 시: 운영진이 항목 1건 추가 → 회원 뷰 즉시 반영 확인
- Phase 3 종료 시: 회원 본인 토글 → 진행률 % 갱신 확인
- 비로그인 접근 시 체크박스만 비활성, 콘텐츠는 정상 노출

---

## 보류 (V2)

- 다른 학교/대학원 카피용 멀티 트랙 마스터 (현재는 본 학회 단일)
- 챗봇 가이드 어시스턴트 연계 (기존 chatbot 시스템 확장)
- 자동 입학 일정 캘린더 동기화 (Google Calendar 연동)

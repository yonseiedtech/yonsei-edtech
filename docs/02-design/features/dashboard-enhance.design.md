# Design: 대시보드 고도화 (dashboard-enhance)

## 1. 선행 조건

- `bkend-integration` 피처 완료 필수
- 실 데이터 API 연동 완료 후 진행

## 2. 구현 순서

```
1. StatCard를 API 데이터로 전환
2. 역할별 위젯 조건부 렌더링
3. ActivityFeed 컴포넌트 (내 글의 새 댓글)
4. MiniCalendar 컴포넌트 (이번 달 세미나)
5. 모바일 레이아웃 최적화
```

## 3. 컴포넌트 상세 설계

### 3.1 StatCard API 전환

기존 React Query 기반 훅(`usePosts`, `useSeminars`, `usePendingMembers`, `useInquiries`)을 재활용하여 실데이터를 표시한다.
대시보드 위젯들이 동일 데이터를 공유하므로, 개별 통계 API 호출보다 기존 훅 재활용이 효율적이다.

```typescript
// 기존 React Query 훅 재활용 (데이터 공유)
const { posts } = usePosts();
const { seminars } = useSeminars();
const { pendingMembers } = usePendingMembers(); // staff 전용
const { inquiries } = useInquiries();           // staff 전용

const myPosts = posts.filter((p) => p.authorId === user.id);
const pendingCount = pendingMembers.length;
const unansweredCount = inquiries.filter((q) => q.status === "pending").length;
```

### 3.2 역할별 위젯

```
member/alumni/advisor:
  - 내 글 | 신청 세미나 | 예정 세미나 | 최신 학회보
  - 최근 공지 | 세미나 일정(캘린더) | 내 활동 피드

staff/president/admin:
  - 내 글 | 신청 세미나 | 승인 대기 | 미답변 문의
  - 최근 공지 | 세미나 일정(캘린더) | 내 활동 피드 | 관리 알림
```

### 3.3 ActivityFeed 컴포넌트

```
Props:
  - userId: string
  - posts: Post[] (내 게시글 필터링용)
  - limit?: number (기본 5)

데이터:
  1. 최근 댓글 50건 조회 후 내 게시글에 달린 것만 클라이언트 필터링
  2. bkend API가 postAuthorId 필터를 지원하지 않아 클라이언트 필터 방식 채택
  3. 자기 댓글은 제외

UI:
  - 타임라인 형태 (세로 점선 + 이니셜 아바타)
  - "홍길동님이 '세미나 후기'에 댓글을 남겼습니다"
  - 댓글 내용 미리보기 + 날짜
  - 클릭 시 해당 게시글로 이동

API:
  - dataApi.list("comments", { sort: "createdAt:desc", limit: 50 })
  - 클라이언트 필터: myPostIds.includes(c.postId) && c.authorId !== userId
```

### 3.4 MiniCalendar 컴포넌트

```
Props:
  - seminars: Seminar[]

UI:
  - 이번 달 달력 그리드 (7열 × 5~6행)
  - 세미나 있는 날짜에 점(dot) 마커
  - 날짜 클릭 → 캘린더 하단에 해당 세미나 정보 인라인 표시
  - 오늘 날짜 하이라이트
  - 이전/다음 달 네비게이션

구현:
  - 자체 구현 (외부 라이브러리 없음, 네이티브 Date 사용)
  - 7×n 그리드 (일~토)
```

### 3.5 모바일 레이아웃

```
Desktop (md+):
  ┌─────────┬─────────┐
  │  공지    │ 캘린더   │
  ├─────────┴─────────┤
  │   활동 피드        │
  ├───────────────────│
  │   내 세미나        │
  └───────────────────┘

Mobile:
  ┌───────────────────┐
  │  StatCards (2×2)   │
  ├───────────────────┤
  │  빠른 액션 (횡스크롤)│
  ├───────────────────┤
  │  공지 (카드)       │
  ├───────────────────┤
  │  캘린더 (카드)     │
  ├───────────────────┤
  │  활동 피드         │
  └───────────────────┘
```

## 4. 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `src/app/dashboard/page.tsx` | API 데이터 연동 + 위젯 추가 |
| `src/features/dashboard/ActivityFeed.tsx` | 신규 — 활동 피드 (타임라인) |
| `src/features/dashboard/MiniCalendar.tsx` | 신규 — 미니 달력 |

## 5. 구현 체크리스트

- [x] StatCard: 기존 React Query 훅으로 실데이터 조회
- [x] 역할별 위젯 조건부 렌더링
- [x] ActivityFeed 컴포넌트 (타임라인 UI)
- [x] MiniCalendar 컴포넌트
- [x] 모바일 반응형 레이아웃
- [x] 빠른 액션 횡스크롤 (모바일)
- [x] StatCard 클릭 시 해당 페이지 링크
- [x] 관리 알림 위젯 (staff+ 전용)

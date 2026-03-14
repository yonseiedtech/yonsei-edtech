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

```typescript
// 현재 (Mock)
const myPosts = posts.filter(p => p.authorId === user.id);
const pendingCount = 2; // 하드코딩

// 변경 후 (API)
const { data: myPostCount } = useQuery({
  queryKey: ["stats", "myPosts", user.id],
  queryFn: () => postsApi.list({ "filter[authorId]": user.id, limit: 0 }),
  select: (res) => res.total,
});

const { data: pendingCount } = useQuery({
  queryKey: ["stats", "pendingMembers"],
  queryFn: () => profilesApi.list({ "filter[approved]": "false", limit: 0 }),
  select: (res) => res.total,
  enabled: isStaff,
});
```

### 3.2 역할별 위젯

```
member/alumni/advisor:
  - 내 글 | 신청 세미나 | 예정 세미나 | 최신 학회보
  - 최근 공지 | 예정 세미나 | 내 활동 피드

staff/president/admin:
  - 내 글 | 승인 대기 | 미답변 문의 | 예정 세미나
  - 최근 공지 | 관리 알림 | 승인 대기 목록
```

### 3.3 ActivityFeed 컴포넌트

```
Props:
  - userId: string
  - limit?: number (기본 5)

데이터:
  1. 내 게시글의 최근 댓글 조회
  2. 댓글 작성자 + 게시글 제목 + 시각 표시

UI:
  - 타임라인 형태 (세로 점선 + 아바타)
  - "홍길동님이 '세미나 후기'에 댓글을 남겼습니다"
  - 클릭 시 해당 게시글로 이동

API:
  - GET /data/comments?filter[postAuthorId]={userId}&sort=createdAt:desc&limit=5
  - 또는 클라이언트 사이드: 내 posts → 각 post의 comments 조회
```

### 3.4 MiniCalendar 컴포넌트

```
Props:
  - seminars: Seminar[]

UI:
  - 이번 달 달력 그리드 (7열 × 5~6행)
  - 세미나 있는 날짜에 점(dot) 마커
  - 날짜 클릭 → 해당 세미나 정보 팝오버
  - 오늘 날짜 하이라이트

구현:
  - 자체 구현 (외부 라이브러리 없음)
  - date-fns의 startOfMonth, endOfMonth, eachDayOfInterval
  - 7×6 그리드 (일~토)
```

### 3.5 모바일 레이아웃

```
Desktop (md+):
  ┌─────────┬─────────┐
  │  공지    │  세미나  │
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
  │  세미나 (카드)     │
  ├───────────────────┤
  │  활동 피드         │
  └───────────────────┘
```

## 4. 수정 대상 파일

| 파일 | 변경 |
|------|------|
| `src/app/dashboard/page.tsx` | API 데이터 연동 + 위젯 추가 |
| `src/features/dashboard/ActivityFeed.tsx` | 신규 — 활동 피드 |
| `src/features/dashboard/MiniCalendar.tsx` | 신규 — 미니 달력 |
| `src/features/dashboard/StatsSection.tsx` | 신규 — API 기반 통계 (옵션) |

## 5. 구현 체크리스트

- [ ] StatCard: React Query로 API 데이터 조회
- [ ] 역할별 위젯 조건부 렌더링
- [ ] ActivityFeed 컴포넌트
- [ ] MiniCalendar 컴포넌트
- [ ] 모바일 반응형 레이아웃
- [ ] 빠른 액션 횡스크롤 (모바일)

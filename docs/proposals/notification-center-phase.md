# 알림센터 통합 로드맵

**작성일**: 2026-05-24  
**상태**: Phase 1 구현 완료 / Phase 2~4 설계 확정

---

## 1. 현황 진단

현재 알림 채널이 4곳으로 분산되어 있어 사용자가 한 화면에서 모든 알림을 확인할 수 없다.

| 채널 | 위치 | 현황 |
|------|------|------|
| `notifications` Firestore | `notificationsApi` + `AppNotification` 타입 | Bell 아이콘 드롭다운 표시 (30초 폴링) |
| `push_logs` Firestore | FCM web push 발송 이력 | `/console/cron-logs`에서 admin만 조회 |
| `inquiries` | 1:1 문의 답변 | 별도 이메일 응답만, 인앱 알림 없음 |
| 위젯 toast (sonner) | 페이지별 분산 | 휘발성, 기록 없음 |
| `NotificationOrchestrator` | 모달 슬롯 큐 | 세션 단위, 영속 기록 없음 |

### 문제점
- 부재 중 수신한 알림을 나중에 다시 확인할 목록 페이지 없음
- push_logs·inquiries·toast 는 `notifications` 컬렉션과 연동 없음
- 알림 종류(NotificationType)가 9가지로 늘었지만 필터·검색 UI 없음

---

## 2. 통합 데이터 모델

### 기존 `notifications` 컬렉션 확장 (신규 컬렉션 불필요)

```ts
// src/types/operations.ts — AppNotification (기존 + 확장 필드)
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;          // 기존 9종 + 향후 확장
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  // Phase 3에서 추가 예정
  source?: "cron" | "system" | "user" | "inquiry";  // 발생 출처
  channel?: "push" | "inapp" | "email";              // 전송 채널
}
```

**선택 이유**: 기존 `notificationsApi`·`useNotifications`·`NotificationBell` 을 그대로 재사용.  
신규 컬렉션을 만들면 Firestore 인덱스·rules 이중 관리가 필요하므로 확장 방식 채택.

### Firestore 규칙 (기존 유지)
```
match /notifications/{id} {
  allow read: if request.auth.uid == resource.data.userId;
  allow write: if request.auth != null;
}
```

---

## 3. 4-Step 로드맵

### Phase 1 — Bell + 미열기 카운트 (완료)

**목표**: 헤더 Bell 아이콘에 실시간 미열기 카운트 표시. 알림센터 페이지 경로 예약.

**구현 완료 항목**:
- `src/features/notifications/NotificationBell.tsx` — Bell + 미열기 카운트 배지 (30초 폴링)
- `src/features/notifications/useNotifications.ts` — React Query `staleTime` 없음, `refetchInterval: 30_000`
- Header (desktop·mobile 양쪽) 에 `<NotificationBell />` 삽입
- `src/app/mypage/notifications/page.tsx` — Phase 2 대기 stub 페이지
- NotificationBell 드롭다운 하단 "전체 보기" 링크 → `/mypage/notifications`
- `/mypage` 설정 탭 알림센터 안내 카드

**staleTime 권고**: Phase 2에서 목록 페이지 추가 시 `staleTime: 60_000` 으로 조정 고려.

---

### Phase 2 — 알림 목록 페이지 `/mypage/notifications`

**목표**: 전체 알림 목록 + 읽음/미읽음 필터 + 일괄 읽음 처리.

**구현 예정 파일**:
- `src/app/mypage/notifications/page.tsx` — 목록 페이지 (현재 stub)
- `src/components/notifications/NotificationList.tsx` — 필터 탭 + 카드 리스트

**UI 스펙**:
```
/mypage/notifications
├── 탭: 전체 | 미읽음 | 읽음
├── 일괄 읽음 처리 버튼
├── 알림 카드 (아이콘 + 제목 + 메시지 + 시간 + 읽음 토글)
└── 빈 상태 EmptyState
```

**연동**: `useNotifications()` 재사용, 추가 필터 파라미터만 추가.

---

### Phase 3 — 위젯·cron 알림 자동 적재

**목표**: push_logs·cron 발송과 동시에 `notifications` 컬렉션에도 인앱 레코드 생성.

**구현 예정**:
- `src/app/api/cron/` 각 cron 핸들러에 `createNotification()` 호출 추가
- `source` 필드로 cron 발생 알림 식별 가능
- `channel: "push"` 로 FCM push 와 연결 추적

**영향 범위**: API route 파일들만 수정, 클라이언트 변경 없음.

---

### Phase 4 — 읽음 처리 + 무한 스크롤

**목표**: 대용량 알림 처리, 오래된 알림 아카이브.

**구현 예정**:
- `notificationsApi.list()` cursor 기반 페이지네이션 (현재 limit:50 고정)
- `useInfiniteQuery` 로 교체
- 30일 이상 읽은 알림 자동 삭제 cron (`/api/cron/notifications-cleanup`)
- 알림 종류별 그룹핑 (날짜별 섹션 헤더)

---

## 4. 마이그레이션 전략

- **하위 호환 유지**: `source`·`channel` 필드는 optional — 기존 레코드에 없어도 오류 없음
- **점진적 적재**: Phase 3 이후 생성분부터 source/channel 채워짐, 소급 불필요
- **Firestore 인덱스**: Phase 2에서 `userId + read + createdAt` 복합 인덱스 추가 필요

---

## 5. 파일 변경 요약

| Phase | 파일 | 변경 유형 |
|-------|------|-----------|
| 1 | `src/features/notifications/NotificationBell.tsx` | 수정 (전체 보기 링크) |
| 1 | `src/app/mypage/notifications/page.tsx` | 신규 (stub) |
| 1 | `src/components/mypage/MyPageView.tsx` | 수정 (안내 카드) |
| 2 | `src/app/mypage/notifications/page.tsx` | 수정 (목록 구현) |
| 2 | `src/components/notifications/NotificationList.tsx` | 신규 |
| 3 | `src/app/api/cron/*.ts` | 수정 (createNotification 추가) |
| 4 | `src/features/notifications/useNotifications.ts` | 수정 (useInfiniteQuery) |
| 4 | `src/app/api/cron/notifications-cleanup.ts` | 신규 |

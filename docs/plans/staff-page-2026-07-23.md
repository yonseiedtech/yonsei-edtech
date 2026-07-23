# 운영진 페이지 구현 설계 (2026-07-23)

## 개요

학회 운영진(staff+)만 접근하는 협업·프로젝트 운영 공간(`/staff`) 신규 구현.
AuthGuard + Firestore 3컬렉션 + 칸반 보드 + 진입점(헤더 "더보기" / 모바일 BottomNav "더보기" 시트).

---

## 라우트

| 경로 | 접근 권한 | 비고 |
|------|-----------|------|
| `/staff` | staff / president / admin / sysadmin | 비-staff → 홈 리다이렉트 (AuthGuard) |

---

## 파일 목록

### 신규 생성

| 파일 | 역할 |
|------|------|
| `src/features/staff/staff-store.ts` | 3컬렉션 타입 + dataApi CRUD hooks |
| `src/features/staff/StaffNoticesTab.tsx` | 탭1 — 운영진 공지 |
| `src/features/staff/StaffProjectsTab.tsx` | 탭2 — 프로젝트 운영(칸반 보드) |
| `src/features/staff/StaffConsoleTab.tsx` | 탭3 — 콘솔 바로가기 |
| `src/app/staff/layout.tsx` | AuthGuard(staff+) 레이아웃 |
| `src/app/staff/page.tsx` | 탭 셸 페이지 |

### 수정

| 파일 | 변경 내용 |
|------|-----------|
| `src/components/layout/Header.tsx` | `NavLink.staffOnly?: boolean` 추가, NavDropdown/MobileNavGroup 필터링, "더보기" 그룹에 `/staff` 항목 추가 |
| `src/components/layout/BottomNav.tsx` | `NavItem.staffOnly?: boolean` 추가, MORE_ITEMS에 `/staff` 추가, `isAtLeast` 필터 적용 |

---

## 3컬렉션 데이터 모델

### `staff_notices`

```
{
  id: string                 // Firestore auto-id
  title: string              // 제목
  body: string               // 본문
  pinned: boolean            // 상단 고정 여부
  authorId: string           // 작성자 uid
  authorName: string         // 작성자 이름
  createdAt: Timestamp       // 자동 (dataApi.create)
  updatedAt: Timestamp       // 자동 (dataApi.update)
}
```

정렬: `pinned DESC → createdAt DESC` (클라이언트 정렬)

### `staff_projects`

```
{
  id: string
  name: string
  description?: string
  ownerId: string            // 담당 운영진 uid
  ownerName: string
  status: "planning" | "active" | "done"
  dueDate?: string           // ISO date (YYYY-MM-DD)
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### `staff_tasks`

```
{
  id: string
  projectId: string          // 상위 프로젝트 id (equality filter)
  title: string
  description?: string
  assigneeId?: string        // 담당자 uid (없으면 "미배정")
  assigneeName?: string
  status: "todo" | "doing" | "review" | "done"
  checklist?: string         // JSON.stringify(TaskChecklist[])
  dueDate?: string           // ISO date
  order: number              // 칸반 내 순서
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

type TaskChecklist = { label: string; done: boolean }
```

---

## Firestore Rules 수정안 (전문)

> **메인 오케스트레이터가 `firestore.rules`에 직접 추가할 내용.**
> 기존 `isStaffOrAbove()` 헬퍼를 그대로 재사용한다.

파일 내 `// ─── 마지막 컬렉션 그룹 뒤` 또는 `} // end databases` 직전에 삽입:

```
    // ─── Staff Notices (운영진 전용 공지) ───────────────────────────────────────
    match /staff_notices/{docId} {
      allow read, list: if isAuthenticated() && isStaffOrAbove();
      allow create, update, delete: if isAuthenticated() && isStaffOrAbove();
    }

    // ─── Staff Projects (운영진 프로젝트) ────────────────────────────────────────
    match /staff_projects/{docId} {
      allow read, list: if isAuthenticated() && isStaffOrAbove();
      allow create, update, delete: if isAuthenticated() && isStaffOrAbove();
    }

    // ─── Staff Tasks (운영진 태스크 칸반) ────────────────────────────────────────
    match /staff_tasks/{docId} {
      allow read, list: if isAuthenticated() && isStaffOrAbove();
      allow create, update, delete: if isAuthenticated() && isStaffOrAbove();
    }
```

---

## 진입점

### 데스크톱 헤더 "더보기" 드롭다운

- `NavLink.staffOnly?: boolean` 필드 추가
- `NavDropdown`: `isStaff` prop 수신 → `section.links.filter(l => !l.staffOnly || isStaff)`
- `MobileNavGroup`: 동일 필터 적용
- "더보기" 그룹 items에 `{ href: "/staff", label: "운영진 페이지", staffOnly: true }` 추가
- 비-staff에게는 항목 자체가 렌더링되지 않음 (그룹 visibility "both" 유지)

### 모바일 BottomNav "더보기" 시트

- `NavItem.staffOnly?: boolean` 필드 추가
- `MORE_ITEMS`에 `{ href: "/staff", label: "운영진 페이지", icon: Shield, staffOnly: true }` 추가
- `isAtLeast(user, "staff")` 결과로 필터링: `MORE_ITEMS.filter(item => !item.staffOnly || isStaff)`

---

## 칸반 보드 / 체크리스트 / 경고 로직

### 칸반 4컬럼

| 컬럼 | status | 배지 색상 |
|------|--------|-----------|
| 할 일 | todo | `bg-muted text-muted-foreground` |
| 진행 중 | doing | `bg-info/10 text-info` |
| 검토 | review | `bg-warning/10 text-warning` |
| 완료 | done | `bg-success/10 text-success` |

카드 이동: 각 카드 하단 "← 이전 / 다음 →" 버튼 + 상태 칩 표시 (신규 DND 의존성 없음).

### 담당자 배정

- `MemberAutocomplete` 컴포넌트 재사용 (`approvedOnly={true}`)
- 미배정 태스크: 카드 border를 `border-warning/30`으로 하이라이트
- 담당자별 태스크 수 요약 테이블 (KanbanBoard 하단)
- "내 담당만 보기" 토글: `tasks.filter(t => t.assigneeId === currentUserId)`

### 마감 경고

```typescript
function getDueDateStatus(dueDate): "overdue" | "warn" | null {
  // diffDays < 0  → "overdue"  (기한 초과, 빨간 배지)
  // diffDays 0-3  → "warn"     (D-3 이내, 주황 배지)
  // else          → null
}
```

카드에 `<AlertTriangle>` + `(기한 초과)` 또는 `<Clock>` + `(D-N)` 렌더.
컬럼 헤더에 overdue 건수 빨간 배지 표시.

### 프로젝트 요약 대시보드

4-stat 그리드:
1. 완료율 `done/total * 100%`
2. 지연 건수 (`status != done` && `overdue`) — `border-destructive/30` 강조
3. 미배정 건수 (`!assigneeId` && `status != done`) — `border-warning/30` 강조
4. 상태별 숫자 (할일/진행/검토/완료)

### 체크리스트 진행률

카드에 프로그레스바(done/total) + 텍스트 카운터 표시.
태스크 모달에서 항목 추가/토글/삭제 가능.

---

## 검증 결과

- `npx tsc --noEmit` → 0 errors
- `npx eslint --quiet <변경파일들>` → 0 errors
- `node scripts/check-rawcolor-ratchet.mjs` → PASS (1/1 — 변동 없음)
- `node scripts/check-eslint-warning-ratchet.mjs` → 실행 중 (pre-existing 4개만 해당)

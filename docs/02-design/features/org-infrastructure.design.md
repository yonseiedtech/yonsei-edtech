# Design: 지속가능한 조직 체계 구축 (org-infrastructure)

## 1. 구현 순서

```
1. useMembers.ts 훅 생성 (profilesApi 래핑, React Query)
2. /members 페이지 DB 전환 (하드코딩 MEMBERS 제거 → API)
3. /directory 페이지 DB 전환 (하드코딩 배열 제거 → 역할 필터 API)
4. ProfileEditor API 저장 연동 (TODO 주석 → 실제 API 호출)
5. AdminMemberTab 실 데이터 연동 (Mock 배열 → API)
6. AdminUserList 승인/거부 API 연동
7. 운영진 교체 일괄 역할 변경 UI
```

## 2. 데이터 모델

### 2.1 기존 users 테이블 (변경 없음)

bkend `users` 테이블의 필드를 그대로 활용한다:

```
id, email, name, username, role, generation, field,
bio, occupation, affiliation, department, position,
contactEmail, contactVisibility, approved, profileImage
```

### 2.2 연락처 공개 범위 처리

bkend에는 행 수준 보안(RLS)이 있으나 `contactVisibility` 필드는 클라이언트 사이드에서 필터링한다:

```typescript
function filterContactByVisibility(
  member: User,
  viewer: User | null
): User {
  const vis = member.contactVisibility ?? "members";
  const shouldHide =
    vis === "private" ||
    (vis === "staff" && !isAtLeast(viewer, "staff")) ||
    (vis === "members" && !viewer);

  if (shouldHide) {
    return { ...member, contactEmail: undefined };
  }
  return member;
}
```

## 3. 신규 파일

### 3.1 `src/features/member/useMembers.ts` — 멤버 React Query 훅

```typescript
// ── 전체 회원 목록 (승인된 회원만) ──
export function useMembers(options?: {
  generation?: number;
  role?: UserRole;
  field?: string;
  search?: string;
}) {
  // queryKey: ["members", options]
  // queryFn: profilesApi.list({ filter[approved]: true, ...filters })
  // 반환: { members: User[], isLoading: boolean }
}

// ── 미승인 회원 (관리자용) ──
export function usePendingMembers() {
  // queryKey: ["members", "pending"]
  // queryFn: profilesApi.list({ filter[approved]: false })
}

// ── 프로필 수정 ──
export function useUpdateProfile() {
  // mutationFn: profilesApi.update(id, data)
  // onSuccess: invalidate ["members"], update auth-store user
}

// ── 회원 승인 ──
export function useApproveMember() {
  // mutationFn: profilesApi.approve(id) — PATCH { approved: true }
  // onSuccess: invalidate ["members", "pending"], ["members"]
}

// ── 회원 거부 (삭제) ──
export function useRejectMember() {
  // mutationFn: profilesApi.delete(id) — 또는 PATCH { approved: false, rejected: true }
  // onSuccess: invalidate ["members", "pending"]
}

// ── 역할 변경 ──
export function useChangeRole() {
  // mutationFn: profilesApi.update(id, { role: newRole })
  // onSuccess: invalidate ["members"]
}

// ── 일괄 역할 변경 (운영진 교체) ──
export function useBulkChangeRoles() {
  // mutationFn: Promise.all(changes.map(c => profilesApi.update(c.id, { role: c.role })))
  // onSuccess: invalidate ["members"]
}
```

## 4. 파일별 상세 변경

### 4.1 `/members` 페이지 — `src/app/members/page.tsx`

**현재**: 서버 컴포넌트 + MEMBERS 배열 하드코딩 (12명)
**변경**: 클라이언트 컴포넌트로 전환 + useMembers() 훅 사용

```
변경 전:
  - MemberData 인터페이스 (page.tsx 내 정의)
  - const MEMBERS: MemberData[] = [...] 하드코딩
  - 서버 컴포넌트 (metadata export)

변경 후:
  - "use client" 추가
  - MemberData 인터페이스 → User 타입 사용 (types/index.ts)
  - useMembers() 훅으로 API 데이터 조회
  - 로딩 상태 표시 (Skeleton)
  - 빈 상태 표시 ("등록된 회원이 없습니다")
  - metadata → layout.tsx로 이동
```

### 4.2 `GenerationTabs` — `src/components/members/GenerationTabs.tsx`

**현재**: `MemberData[]` props 수신
**변경**: `User[]` 타입으로 변경

```
Props 변경:
  - members: MemberData[] → members: User[]

내부 로직 변경 없음 (generation 필터링 동일)
```

### 4.3 `MemberCard` — `src/components/members/MemberCard.tsx`

**현재**: `MemberData` 타입 사용
**변경**: `User` 타입 사용, ROLE_LABELS 표시

```
Props 변경:
  - member: MemberData → member: User

표시 변경:
  - member.role → ROLE_LABELS[member.role] 배지
  - member.bio → member.bio ?? "" (optional)
```

### 4.4 `/directory` 페이지 — `src/app/directory/page.tsx`

**현재**: 3개 하드코딩 배열 (CURRENT_STAFF, ADVISORS, PAST_PRESIDENTS)
**변경**: useMembers() 훅으로 역할별 동적 조회

```
변경 전:
  const CURRENT_STAFF: DirectoryMember[] = [...] // 2명
  const ADVISORS: DirectoryMember[] = [...] // 1명
  const PAST_PRESIDENTS: DirectoryMember[] = [...] // 3명

변경 후:
  // 현 운영진: role이 staff 또는 president인 회원
  const { members: staff } = useMembers({ role: "staff" });
  const { members: presidents } = useMembers({ role: "president" });
  const currentStaff = [...presidents, ...staff];

  // 자문위원: role이 advisor인 회원
  const { members: advisors } = useMembers({ role: "advisor" });

  // 역대 회장: 별도 조회 필요 → 향후 role_history 테이블
  // 임시: 하드코딩 유지 또는 users 테이블에 tenure 필드 추가

연락처 표시:
  - filterContactByVisibility() 적용
  - 비공개인 경우 이메일 숨김
```

### 4.5 `ProfileEditor` — `src/features/auth/ProfileEditor.tsx`

**현재**: `onSubmit`에 `// TODO: bkend.ai profilesApi.update()` 주석
**변경**: useUpdateProfile() 훅으로 실제 API 호출

```typescript
// 변경 전
async function onSubmit(data: ProfileData) {
  try {
    // TODO: bkend.ai profilesApi.update()
    toast.success("프로필이 저장되었습니다.");
  } catch {
    toast.error("프로필 저장에 실패했습니다.");
  }
}

// 변경 후
const { updateProfile, isLoading } = useUpdateProfile();

async function onSubmit(data: ProfileData) {
  try {
    await updateProfile({ id: user.id, data });
    // auth-store의 user 정보도 함께 갱신
    useAuthStore.getState().setUser({ ...user, ...data });
    toast.success("프로필이 저장되었습니다.");
  } catch {
    toast.error("프로필 저장에 실패했습니다.");
  }
}
```

### 4.6 `AdminMemberTab` — `src/features/admin/AdminMemberTab.tsx`

**현재**: PENDING_USERS, ALL_MEMBERS 하드코딩 + useState로 관리
**변경**: useMembers(), usePendingMembers(), useChangeRole() 훅 사용

```
변경 전:
  const PENDING_USERS: User[] = [...] // 2명
  const ALL_MEMBERS: User[] = [...] // 5명
  const [members, setMembers] = useState(ALL_MEMBERS);
  function handleRoleChange() { setMembers(...); }

변경 후:
  const { members: pendingUsers, isLoading: pendingLoading } = usePendingMembers();
  const { members, isLoading } = useMembers({ role: roleFilter !== "all" ? roleFilter : undefined });
  const { changeRole } = useChangeRole();

  function handleRoleChange(userId: string, newRole: UserRole) {
    changeRole({ id: userId, role: newRole });
  }
```

### 4.7 `AdminUserList` — `src/features/admin/AdminUserList.tsx`

**현재**: onApprove/onReject 콜백 + TODO 주석
**변경**: useApproveMember(), useRejectMember() 훅 사용

```
변경 전:
  function handleApprove(user: User) {
    // TODO: bkend.ai admin API
    onApprove?.(user.id);
  }

변경 후:
  const { approveMember } = useApproveMember();
  const { rejectMember } = useRejectMember();

  async function handleApprove(user: User) {
    await approveMember(user.id);
    toast.success(`${user.name} 승인 완료`);
  }

  async function handleReject(user: User) {
    await rejectMember(user.id);
    toast.error(`${user.name} 거부 완료`);
  }
```

### 4.8 운영진 교체 UI (신규 섹션)

AdminMemberTab 하단에 "운영진 교체" 섹션 추가:

```
UI:
  ┌──────────────────────────────────────────┐
  │ 🔄 운영진 교체                           │
  │                                          │
  │ 현재 운영진:                             │
  │ [김회장 - 회장] [이운영 - 운영진]        │
  │                                          │
  │ 변경할 회원 선택:                        │
  │ ┌─────────────┬────────────┐            │
  │ │ 회원 검색   │ 새 역할    │            │
  │ │ [박신임 ▾]  │ [회장 ▾]   │  [+ 추가]  │
  │ │ [최운영 ▾]  │ [운영진 ▾] │  [+ 추가]  │
  │ └─────────────┴────────────┘            │
  │                                          │
  │ ⚠️ 기존 운영진은 자동으로 '회원'으로     │
  │    변경됩니다.                           │
  │                                          │
  │ [변경 사항 미리보기]  [교체 실행]        │
  └──────────────────────────────────────────┘

동작:
  1. 현재 staff/president 역할 회원 표시
  2. 새 운영진 선택 (회원 목록에서)
  3. "교체 실행" 클릭 시:
     - 기존 staff/president → member로 변경
     - 새 선택 회원 → 지정 역할로 변경
     - useBulkChangeRoles() 호출
  4. 확인 다이얼로그 필수
```

## 5. 수정 대상 파일 요약

| 파일 | 변경 유형 | 설명 |
|------|----------|------|
| `src/features/member/useMembers.ts` | **신규** | React Query 멤버 훅 7개 |
| `src/app/members/page.tsx` | 전면 수정 | 하드코딩 → API, 서버 → 클라이언트 |
| `src/app/members/layout.tsx` | **신규** | metadata 이동 |
| `src/components/members/GenerationTabs.tsx` | 수정 | MemberData → User 타입 |
| `src/components/members/MemberCard.tsx` | 수정 | MemberData → User 타입 |
| `src/app/directory/page.tsx` | 전면 수정 | 하드코딩 3배열 → API 조회 |
| `src/features/auth/ProfileEditor.tsx` | 수정 | TODO → useUpdateProfile() |
| `src/features/admin/AdminMemberTab.tsx` | 전면 수정 | Mock → API, 운영진 교체 UI 추가 |
| `src/features/admin/AdminUserList.tsx` | 수정 | TODO → useApproveMember/Reject |

## 6. API 호출 매핑

| 기능 | bkend API | 비고 |
|------|-----------|------|
| 승인된 회원 목록 | `profilesApi.list({ "filter[approved]": "true" })` | |
| 기수 필터 | `profilesApi.list({ "filter[generation]": 3 })` | |
| 역할 필터 | `profilesApi.list({ "filter[role]": "staff" })` | |
| 미승인 회원 | `profilesApi.list({ "filter[approved]": "false" })` | |
| 프로필 수정 | `profilesApi.update(id, { name, bio, ... })` | 본인만 |
| 회원 승인 | `profilesApi.approve(id)` → PATCH `{ approved: true }` | 회장+ |
| 역할 변경 | `profilesApi.update(id, { role: "staff" })` | 회장+ |

## 7. 구현 체크리스트

- [ ] `useMembers.ts` 훅 생성 (useMembers, usePendingMembers, useUpdateProfile, useApproveMember, useRejectMember, useChangeRole, useBulkChangeRoles)
- [ ] `/members` 페이지: "use client" + useMembers() + 로딩/빈 상태
- [ ] `members/layout.tsx` 생성 (metadata 이동)
- [ ] `GenerationTabs`: MemberData → User
- [ ] `MemberCard`: MemberData → User + ROLE_LABELS
- [ ] `/directory` 페이지: 하드코딩 제거 → useMembers({ role }) + contactVisibility 필터
- [ ] `ProfileEditor`: TODO → useUpdateProfile() + auth-store 동기화
- [ ] `AdminMemberTab`: Mock 제거 → usePendingMembers() + useMembers() + useChangeRole()
- [ ] `AdminUserList`: TODO → useApproveMember() + useRejectMember()
- [ ] 운영진 교체 UI: 일괄 역할 변경 + 확인 다이얼로그
- [ ] 빌드 성공 확인

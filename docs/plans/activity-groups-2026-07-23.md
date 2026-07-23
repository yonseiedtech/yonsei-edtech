# 다회성 모임(Activity Groups) 기능 설계 및 구현 계획

> 작성일: 2026-07-23  
> 구현 완료 커밋 대상 파일 목록은 맨 아래 참조.

---

## 1. 개요

독서모임·와인모임처럼 1회성이 아닌 지속 운영 소모임(Activity Groups)을 생성·관리할 수 있는 기능.
기존 /gatherings(1회성 행사·RSVP·일정투표) 하위에 `/gatherings/groups` 경로로 독립 운영한다.

---

## 2. 데이터 모델 — 신규 컬렉션 3개

### 2-1. `activity_groups`

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | Firestore auto-id |
| name | string | 모임 이름 (max 40자) |
| description | string | 소개 (max 300자) |
| category | ActivityGroupCategory | "독서"\|"취미"\|"친목"\|"운동"\|"기타" |
| coverEmoji | string? | 선택 이모지 아이콘 |
| leaderId | string | 그룹장 uid |
| leaderName | string | 그룹장 표시명 |
| cadence | string? | 모임 주기 자유 문구 (예: "격주 목요일 19시") |
| place | string? | 주로 만나는 곳 |
| status | ActivityGroupStatus | "recruiting"\|"active"\|"closed" |
| memberLimit | number? | 정원 (없으면 무제한) |
| createdBy | string | uid |
| createdAt | Timestamp | dataApi 자동 |
| updatedAt | Timestamp | dataApi 자동 |

### 2-2. `activity_group_members`

**docId 규약**: `${groupId}_${userId}` → 가입/탈퇴 멱등 (setDoc/deleteDoc)

| 필드 | 타입 | 설명 |
|------|------|------|
| groupId | string | 소속 그룹 id |
| userId | string | 회원 uid |
| userName | string | 회원 표시명 |
| role | "leader"\|"member" | 그룹장 개설 시 leader로 자동 등록 |
| joinedAt | Timestamp | 가입 시각 |

**멱등 보장**: `join()` 는 문서 존재 여부를 `getDoc`으로 확인 후 이미 있으면 기존 반환, 없으면 `setDoc`. `leave()` 는 `deleteDoc` (문서 없어도 오류 없음).

### 2-3. `activity_group_sessions`

| 필드 | 타입 | 설명 |
|------|------|------|
| id | string | Firestore auto-id |
| groupId | string | 소속 그룹 id |
| title | string | 회차 제목 (예: "3회차 — 3장") |
| date | string | ISO date 문자열 (YYYY-MM-DD) |
| place | string? | 장소 |
| note | string? | 메모 (준비 사항 등) |
| createdBy | string | uid |
| createdAt | Timestamp | dataApi 자동 |

---

## 3. 자체 API 모듈

**파일**: `src/features/activity-groups/api.ts`

- `dataApi` 프리미티브(`@/lib/bkend`) 재사용 — `bkend.ts` 수정 없음.
- `db` (Firebase Firestore 인스턴스)를 `@/lib/firebase`에서 직접 import.
- 3개 API 객체 export: `activityGroupsApi`, `activityGroupMembersApi`, `activityGroupSessionsApi`.

```
activityGroupsApi    → list / get / create / update
activityGroupMembersApi → listByGroup / listByUser / join(멱등) / leave(멱등) / isMember
activityGroupSessionsApi → listByGroup / create / update / delete
```

---

## 4. 라우트 / 표면

### 4-1. `/gatherings/groups` (목록, `src/app/gatherings/groups/page.tsx`)

- 카테고리 필터 칩 (전체 / 독서 / 취미 / 친목 / 운동 / 기타)
- 상태별 섹션 분리: 모집중 → 운영중 → 마감
- 카드: 이모지 아이콘·이름·상태 배지·카테고리·그룹장·정원·주기 표시
- "가입됨" 배지 (로그인 회원에게 자신이 속한 그룹 강조)
- 개설 버튼 (로그인 회원 누구나) → `ActivityGroupCreateForm` 다이얼로그

### 4-2. `/gatherings/groups/[id]` (상세, `src/app/gatherings/groups/[id]/page.tsx`)

- 그룹 헤더: 이모지·이름·상태·카테고리·그룹장·멤버수·주기·장소
- **가입/탈퇴 버튼**: 정원 마감 시 비활성, 마감 상태 시 비활성
- **회차 일정**: 다가오는 회차(date ≥ 오늘) / 지난 회차(date < 오늘)
- **그룹장·staff**: 회차 추가·수정·삭제(인라인 다이얼로그), 그룹 정보 수정
- 멤버 목록 (가입순)

### 4-3. 진입점 — `/gatherings` (수정, `src/app/gatherings/page.tsx`)

`GuestRsvpBanner` 직후에 안내 카드 추가:
```
📖 다회성 모임 | 독서모임·와인모임 등 지속 운영 소모임 → [/gatherings/groups]
```
Header.tsx 수정 없음 — 내비 탭 추가는 메인 오케스트레이터가 필요 시 처리.

---

## 5. 가입/회차 멱등 처리

| 오퍼레이션 | 멱등 방법 |
|-----------|----------|
| 가입 | `getDoc` → 존재하면 즉시 반환, 없으면 `setDoc` |
| 탈퇴 | `deleteDoc` — 문서 없어도 예외 없음 |
| 회차 생성 | `dataApi.create` (auto-id) — 중복 호출 시 별도 문서 생성됨. UI 레벨에서 중복 제출 방지 (버튼 `disabled` + `submitting` 상태) |
| 회차 수정 | `dataApi.update` (id 지정 — 멱등) |

---

## 6. Firestore Rules 수정안 (보고서 전문)

아래 블록을 `firestore.rules` 의 마지막 `}` 직전에 삽입한다.

```
    // ─── 다회성 모임 (2026-07-23) ───

    // 그룹 — 인증 회원 read, 인증 회원 create(leaderId==uid), 그룹장·staff update/delete
    match /activity_groups/{groupId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated()
        && request.resource.data.leaderId == request.auth.uid;
      allow update: if isAuthenticated()
        && (resource.data.leaderId == request.auth.uid || isStaffOrAbove());
      allow delete: if isAuthenticated()
        && (resource.data.leaderId == request.auth.uid || isStaffOrAbove());
    }

    // 멤버십 — read 인증 회원, create/delete 본인(userId==uid) 또는 해당 그룹장·staff
    // docId 규약 `${groupId}_${userId}` 으로 본인 접근이 docId 예측 가능 — list 제한으로 보완.
    match /activity_group_members/{memberId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated()
        && (resource.data.userId == request.auth.uid
            || isStaffOrAbove()
            || (exists(/databases/$(database)/documents/activity_groups/$(resource.data.groupId))
                && get(/databases/$(database)/documents/activity_groups/$(resource.data.groupId)).data.leaderId == request.auth.uid));
      // update 불허 — role 변경 등은 admin 콘솔 직접 편집으로만 (현재 미구현)
      allow update: if false;
    }

    // 회차 — read 인증 회원, write 해당 그룹장·staff
    match /activity_group_sessions/{sessionId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAuthenticated()
        && (isStaffOrAbove()
            || (exists(/databases/$(database)/documents/activity_groups/$(resource.data.groupId))
                && get(/databases/$(database)/documents/activity_groups/$(resource.data.groupId)).data.leaderId == request.auth.uid));
    }
```

> **참고**: `activity_group_sessions` create 시 `resource.data.groupId` 는 생성 전이므로 `request.resource.data.groupId` 를 사용해야 한다. 아래가 정정된 create 규칙:
>
> ```
>     allow create: if isAuthenticated()
>       && (isStaffOrAbove()
>           || (exists(/databases/$(database)/documents/activity_groups/$(request.resource.data.groupId))
>               && get(/databases/$(database)/documents/activity_groups/$(request.resource.data.groupId)).data.leaderId == request.auth.uid));
>     allow update, delete: if isAuthenticated()
>       && (isStaffOrAbove()
>           || (exists(/databases/$(database)/documents/activity_groups/$(resource.data.groupId))
>               && get(/databases/$(database)/documents/activity_groups/$(resource.data.groupId)).data.leaderId == request.auth.uid));
> ```

---

## 7. 변경 파일 목록

| 파일 | 유형 |
|------|------|
| `src/types/activity-groups.ts` | 신규 — 도메인 타입 |
| `src/types/index.ts` | 수정 — re-export 추가 |
| `src/features/activity-groups/api.ts` | 신규 — 자체 API 모듈 |
| `src/features/activity-groups/ActivityGroupCreateForm.tsx` | 신규 — 개설 폼 |
| `src/app/gatherings/groups/page.tsx` | 신규 — 목록 페이지 |
| `src/app/gatherings/groups/[id]/page.tsx` | 신규 — 상세 페이지 |
| `src/app/gatherings/page.tsx` | 수정 — 진입 안내 카드 |

---

## 8. 제외 사항 (과설계 방지)

- 그룹장 이관·강퇴: 미구현 (admin 콘솔 직접 편집)
- Header.tsx 내비 탭: 메인이 필요 시 별도 추가
- 멤버 초대(이메일/링크): 미구현
- 모임 채팅/댓글: 미구현

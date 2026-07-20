# 대내 학술대회 CRUD 구현 보고서 (2026-07-21)

## 변경 파일 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/components/layout/Header.tsx` | 수정 | 학술 활동 드롭다운에서 대내 학술대회를 대외 학술대회보다 위로 이동 (L133-134 순서 교환) |
| `src/features/internal-conference/conferences.ts` | 수정 | `InternalConference` 인터페이스에 `externalLink?: string` 필드 추가 |
| `src/features/site-settings/useInternalConferences.ts` | 신규 | site_settings key="internal_conferences" 읽기·쓰기 훅 |
| `src/features/internal-conference/InternalConferencesView.tsx` | 신규 | 목록 렌더 + 운영진 CRUD UI (클라이언트 컴포넌트) |
| `src/app/activities/internal/page.tsx` | 수정 | 기존 정적 렌더 → InternalConferencesView 위임 |

---

## 과업 1 — 메뉴 순서

`src/components/layout/Header.tsx`의 `PUBLIC_NAV` 배열 내 "학술 활동" 그룹 `items` 배열에서
`대외 학술대회`와 `대내 학술대회`의 순서를 교환했다.

```tsx
// 변경 전
{ href: "/activities/external", label: "대외 학술대회" },
{ href: "/activities/internal", label: "대내 학술대회" },

// 변경 후
{ href: "/activities/internal", label: "대내 학술대회" },
{ href: "/activities/external", label: "대외 학술대회" },
```

`PUBLIC_NAV` 배열은 `getSections` / `getAllLinks` 헬퍼를 통해 데스크톱 드롭다운과 모바일 내비에서
공통으로 사용되므로 두 표면 모두 자동 반영된다.

`BottomNav.tsx`(모바일 탭 바)는 대내 학술대회 단일 항목만 존재하므로 변경 불필요.
`command-routes.ts`는 대외 학술대회 단일 항목만 등록되어 있어 순서 조정 대상 아님.

---

## 과업 2 — 대내 학술대회 CRUD

### 저장 설계

- **컬렉션**: `site_settings` (기존 컬렉션 재사용, 신규 컬렉션 없음)
- **문서 key**: `internal_conferences`
- **값 형식**: `{ key: "internal_conferences", value: JSON.stringify(InternalConference[]) }`
- **API**: 기존 `siteSettingsApi.getByKey / create / update` 재사용 (useSiteContent.ts 동일 패턴)

### 병합 규칙 구현

1. **설정 문서 없음 (초기)**: `useInternalConferences` 훅이 레지스트리(`INTERNAL_CONFERENCES`)를 표시값으로 반환. UI는 정상 표시.
2. **최초 편집**: `recordId=null` 상태에서 `save({ recordId: null, conferences: [...] })` 호출 → `siteSettingsApi.create()`로 레지스트리 + 변경이 담긴 배열을 단일 문서로 생성. 이후 설정 문서가 단일 진실 원천.
3. **이후 편집**: `recordId` 가 있으므로 `siteSettingsApi.update()` 호출.
4. **코드 레지스트리 유지**: `conferences.ts`의 `INTERNAL_CONFERENCES`는 폴백·시드 원본으로 그대로 유지.

### 해커톤 보호 (slug=hackathon-2026-08-22)

- 카드 내 삭제 버튼: `disabled` 처리 + `title="해커톤은 삭제할 수 없습니다"` tooltip
- `handleDelete`에서 이중 차단: protected slug 감지 시 `toast.error` 후 즉시 return
- 수정 다이얼로그: `slug`·`contextId`·`hubHref`는 `existing` 값에서 그대로 가져옴 (폼 바인딩 없음)
- 수정 허용 필드: `title`, `tagline`, `description`, `date`, `dayLabel`, `timeLabel`, `place`, `awardsAnnounceDate`, `status`, `externalLink`

### Firestore rules 판단

```
match /site_settings/{settingId} {
  allow read: if true;
  allow write: if isAuthenticated()
    && getUserRole() in ['president', 'admin', 'sysadmin'];
}
```

- **공개 목록 read**: `allow read: if true` → 비로그인 포함 전체 read 가능. ✓
- **운영진 write**: `['president', 'admin', 'sysadmin']` — **`staff` 역할은 포함되지 않음**.

> **주의**: UI는 `isStaffOrAbove()` 기준으로 버튼을 노출하지만, Firestore 규칙상
> `staff` 역할 계정은 실제 write 시 `permission-denied` 오류가 발생한다.
> 아래 중 하나를 메인이 결정 후 적용 필요:
>
> **옵션 A (권장)** — 규칙에 `staff` 추가:
> ```
> allow write: if isAuthenticated()
>   && getUserRole() in ['staff', 'president', 'admin', 'sysadmin'];
> ```
>
> **옵션 B** — UI 조건을 `isAdmin(user)` (admin+)으로 변경:
> `InternalConferencesView.tsx`의 `const isStaff = isStaffOrAbove(user);`를
> `const isStaff = isAtLeast(user, "admin");`로 변경.

### 신규 행사 CTA 처리

- `hubHref` 가 빈 문자열이 아닌 행사: 카드 전체를 `<Link href={hubHref}>` 로 감쌈 (해커톤 등)
- `hubHref=""` 이고 `externalLink` 가 있는 행사: 카드를 `<a href={externalLink} target="_blank">` 로 감쌈
- 두 필드 모두 없는 행사: 카드가 비클릭 `<div>` 로 렌더 (설명만 표시)

---

## tsc 검증

```
npx tsc --noEmit → 0 errors
```

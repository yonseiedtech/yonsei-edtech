# 운영진 설정 독립 메뉴 이동 & 학기 flash 수정

**작성일**: 2026-07-20  
**범위**: 콘솔 사이드바 재구성(회원/문의 그룹) + OrgChartEditor 학기 동기화 버그 수정

---

## 1. 경로 정책

| 역할 | 경로 | 파일 |
|------|------|------|
| 신규 독립 페이지 | `/console/org` | `src/app/console/org/page.tsx` |
| 기존 경로 redirect (북마크 보존) | `/console/settings/org-chart` → `/console/org` | `src/app/console/settings/org-chart/page.tsx` |

### 설계 근거
- 운영진 설정은 "회원 조직 구성" 업무로, 사이트 소개 콘텐츠(greeting·about·fields 등)를 관리하는 `/console/settings` 탭 그룹보다 "회원/문의" 그룹에 위치하는 것이 업무 맥락에 부합함.
- OrgChartEditor 컴포넌트 자체는 재사용 — 신규 페이지는 동일 컴포넌트를 단순 래핑(`<OrgChartEditor />`).
- 기존 경로는 Next.js 서버 컴포넌트 `redirect()`로 영구 리다이렉트 처리 → 북마크·외부 링크 불변.

---

## 2. 사이드바 변경

**파일**: `src/app/console/layout.tsx`

- lucide-react `Network` 아이콘 추가 import
- "회원/문의" 그룹 마지막 항목 뒤에 추가:
  ```
  { href: "/console/org", label: "운영진 설정", icon: Network }
  ```
- 기존 "시스템 → 사이트 설정" 탭에서의 접근은 redirect로 보존

**파일**: `src/app/console/settings/layout.tsx`

- "구성원" 탭 그룹에서 `{ href: "/console/settings/org-chart", label: "운영진 설정" }` 제거
- "주임교수"·"역대 회장"만 남음 (중복 편집 화면 제거)

---

## 3. 학기 전환 flash 버그 — 원인 및 수정

### 원인

`OrgChartEditor`의 기존 로직:
```tsx
useEffect(() => { if (!isLoading) setItems(positions); }, [isLoading, positions]);
```

학기 전환 시:
1. `selectedSemester` 변경
2. React Query가 새 학기 쿼리 시작 (`isLoading = true` 또는 캐시 hit)
3. **문제**: `items` state는 여전히 이전 학기 데이터를 보유
4. `isLoading = true` 조건에서 effect 실행 안 됨 → 이전 학기 데이터가 로딩 중에 계속 노출(flash)
5. 새 학기 데이터 도착 후에야 `setItems(newPositions)` 실행

### 수정

```tsx
// 학기 전환 즉시 items 초기화 (flash 방지)
useEffect(() => { setItems([]); }, [selectedSemester]);
// 쿼리 완료 후 새 학기 데이터 주입
useEffect(() => { if (!isLoading) setItems(positions); }, [isLoading, positions]);
```

- `selectedSemester` effect가 먼저 선언되어 순서대로 실행됨
- 캐시 hit 시: ① items = [] → ② items = 캐시된 새 학기 데이터 (두 effect 같은 렌더 사이클)
- 미캐시 시: ① items = [] → 로딩 중 빈 상태 → ② 데이터 도착 시 items = 새 데이터
- `setDirty(false)`는 기존 onChange 핸들러에서 처리 완료 (중복 불필요)

---

## 4. 수정 파일 목록

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/console/org/page.tsx` | **신규** — OrgChartEditor 래퍼 |
| `src/app/console/settings/org-chart/page.tsx` | redirect("/console/org") 서버 컴포넌트로 교체 |
| `src/app/console/layout.tsx` | Network 아이콘 import + 회원/문의 그룹에 운영진 설정 추가 |
| `src/app/console/settings/layout.tsx` | 구성원 탭에서 운영진 설정 항목 제거 |
| `src/features/admin/settings/OrgChartEditor.tsx` | selectedSemester 변경 시 items 즉시 초기화 effect 추가 |

# 해커톤 진입점 + 합류 신청 숏컷 구현 보고 (A-1, 2026-07-22)

근거: service-gap-integrated-2026-07-22.md §A-1 · service-gap-ux-2026-07-22.md IA-5 · service-gap-pm-2026-07-22.md GAP-B

## 구현 내용

### 1. 해커톤 진입점 (UX IA-5 — 고아 페이지 해소)

**파일**: `src/components/layout/Header.tsx`, `src/components/layout/BottomNav.tsx`

#### Header.tsx
- `useMemo` import 추가
- `HACKATHON_AWARDS_ANNOUNCE_DATE` import (`@/features/hackathon/config`)
- `Header()` 컴포넌트 내부에 `showHackathon` state + `useEffect`:
  - 컷오프 = `HACKATHON_AWARDS_ANNOUNCE_DATE` + 7일 (2026-09-05)
  - `new Date() <= cutoff` 일 때 true — hydration 안전(useEffect에서만 계산)
- `navGroups` useMemo: "학술 활동" 그룹의 `items` 배열에서 "/activities/internal" 인덱스 바로 다음에 `{ href: "/hackathon", label: "에듀테크 해커톤" }` 삽입
- 데스크톱·모바일 양쪽 `PUBLIC_NAV` → `navGroups` 교체

#### BottomNav.tsx
- `useMemo` import 추가, `Zap` icon import 추가
- `HACKATHON_AWARDS_ANNOUNCE_DATE` import
- `showHackathon` state + `useEffect` (Header와 동일 조건)
- `moreItems` useMemo: MORE_ITEMS에서 "/activities/internal" 바로 다음에 `{ href: "/hackathon", label: "에듀테크 해커톤", icon: Zap }` 삽입
- `moreActive` 계산 + 시트 렌더 양쪽 `MORE_ITEMS` → `moreItems` 교체

**조건**: 오늘 ≤ 2026-09-05 (수상 발표일 2026-08-29 + 7일)  
**위치**: "대내 학술대회" 항목 바로 아래

---

### 2. 합류 신청 숏컷 (PM GAP-B)

**파일**: `src/features/hackathon/HackathonBoard.tsx`

#### 추가 함수 `handleJoinApply(entry)`
- 기존 `handleTeamConfirm`과 동일한 sessionStorage + CustomEvent(`hackathon:prefill`) 패턴 재사용
- `prefill = { teamName: entry.authorName, members: user.name }` 로 제출 폼 프리필
- `document.getElementById("hackathon-submission")` 스크롤 (HackathonSubmissions.tsx line 240에 id 존재 확인)
- toast 안내 메시지

#### 카드 UI 변경
- "팀원 찾는 중 && 내 카드 아님" 조건의 버튼 래퍼: `<div className="mt-2.5">` → `<div className="mt-2.5 flex flex-wrap items-center gap-2">`
- 기존 "합류 희망" 버튼 옆에 "이 팀에 합류 신청" 버튼 추가
- 추가 조건: `registrationOpen`(접수 phase)에서만 노출
- 아이콘: `ArrowRight` (기존 import 재사용)

---

## 검증

- `npx tsc --noEmit`: 에러 0
- `npx eslint --quiet` (3개 파일): 에러 0

## 패턴 준수

- 신규 컬렉션 없음
- raw 색상 없음 (Tailwind 토큰 사용)
- hydration 안전: `useState(false)` + `useEffect` 패턴
- 기존 CustomEvent/sessionStorage prefill 패턴 재사용
- 기존 아이콘(`ArrowRight`) 재사용, `Zap`은 lucide-react 기존 패키지에서 추가

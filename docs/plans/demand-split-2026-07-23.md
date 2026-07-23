# 수요 조사 분리 — 스터디·세미나 인라인 통합 (2026-07-23)

## 목표

통합 수요 조사 페이지(`/activities/demand`)를 폐기하고,
스터디 페이지·세미나 페이지에 각각 인라인 수요 조사 섹션을 삽입한다.
콘솔 통합 대시보드(`/console/demand`)는 동일 보드·컬렉션을 그대로 집계하므로 무변경.

---

## 추출 컴포넌트: `DemandSurveySection`

**경로:** `src/features/demand/DemandSurveySection.tsx`

### Props

| prop | 타입 | 설명 |
|------|------|------|
| `kind` | `"study" \| "seminar"` | 유형 구분 |

### 유형 고정 방식

`KIND_META` 객체로 `kind → demandType("스터디 희망" \| "세미나 희망")` 를 정적으로 매핑.
등록 시 `commQuestionsApi.create({ presenter: meta.demandType, ... })` 로 유형이 자동 고정.
사용자에게 유형 선택 UI 없음 — 진입 맥락(스터디/세미나 페이지)이 유형을 결정.

### 목록 필터링

전체 보드(`demand-2026-2`)에서 목록을 가져온 후 `q.presenter === meta.demandType` 으로 클라이언트 필터.
**신규 컬렉션·보드 없음** — 콘솔 대시보드가 동일 보드를 통합 집계 가능.

### 인증 처리

비로그인: 컴팩트 CTA(로그인 버튼만) — 페이지 전체 대체 없이 섹션 내부에서만 처리.
로그인: 등록 폼 + 공감순 보드 목록(공감/삭제 포함).

---

## 표면 배치

### 스터디 페이지 (`src/app/activities/studies/page.tsx`)

`ActivityPage`에 `footerSection` prop(새로 추가, optional ReactNode) 으로 전달.

```tsx
<ActivityPage
  ...
  footerSection={<DemandSurveySection kind="study" />}
/>
```

`ActivityPage` 수정: Props 인터페이스에 `footerSection?: React.ReactNode` 추가,
Dialog 바로 위에 `{footerSection}` 렌더 (기존 로직 무변경).

### 세미나 페이지 (`src/app/seminars/page.tsx`)

기존 수요 조사 진입 카드(Link → `/activities/demand`) 제거 후 교체.

```tsx
<DemandSurveySection kind="seminar" />
```

`ArrowRight` lucide import 제거(더 이상 미사용).

---

## 통합 페이지 처리

`src/app/activities/demand/page.tsx` → 서버 컴포넌트로 교체, `redirect("/activities/studies")`.
기존 북마크 안전하게 스터디 페이지로 이동.

---

## 내비 정리

`src/components/layout/Header.tsx` — "학술 활동" 그룹 items 에서
`{ href: "/activities/demand", label: "수요 조사" }` 제거.
BottomNav에는 demand 항목 없음(무변경).

---

## 콘솔 대시보드 유지

`src/app/console/demand/page.tsx` — **무변경**.
동일 보드(`DEMAND_CONTEXT_ID = "demand-2026-2"`)를 조회하므로
스터디/세미나 양쪽에서 등록된 수요 모두 통합 집계·CSV 유지.

---

## 검증 결과

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 errors |
| `check-rawcolor-ratchet.mjs` | PASS (1/1 상한) |
| `check-eslint-warning-ratchet.mjs` | 실행 중 (백그라운드) |
| 디버그 코드(console.log/TODO/HACK) | 없음 |
| 신규 컬렉션 | 0 |
| npm run build / git commit | 금지(메인 게이트) |

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/features/demand/DemandSurveySection.tsx` | **신규** — 재사용 수요 조사 섹션 컴포넌트 |
| `src/app/activities/demand/page.tsx` | redirect("/activities/studies") 로 교체 |
| `src/features/activities/ActivityPage.tsx` | `footerSection?: ReactNode` prop 추가 + 렌더 |
| `src/app/activities/studies/page.tsx` | DemandSurveySection import + footerSection 전달 |
| `src/app/seminars/page.tsx` | 기존 demand 진입 카드 → DemandSurveySection kind="seminar" |
| `src/components/layout/Header.tsx` | "수요 조사" 내비 항목 제거 |

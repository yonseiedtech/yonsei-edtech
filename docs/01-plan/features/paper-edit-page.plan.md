# Plan: 분석 노트 논문 편집을 별도 페이지로 (paper-edit-page)

> **작성일**: 2026-05-05
> **PDCA 단계**: Plan
> **추정 작업량**: 6-10h
> **사용자 의도**: "추가는 팝업 / 편집은 페이지" — 큰 폼(변인·연구방법·요약 등)을 페이지에서 편하게 작성

---

## 1. 배경 / 현황 분석

### 1.1 현재 흐름
- **분석 노트 위치**: `/mypage/research` → `MyResearchView.tsx` → `ResearchPaperList.tsx`
- **카드 렌더**: `ResearchPaperCard.tsx` (paper, onEdit, onDelete, onQuickUpdate prop)
- **편집 트리거**: 카드 클릭 → `onEdit(paper)` → ResearchPaperList의 state(`selectedPaper`) → `ResearchPaperDialog` 열림
- **편집 폼**: `ResearchPaperDialog.tsx` (line 110~) — 변인·연구방법·요약·노트 등 큰 폼이 좁은 모달에 갇힘
- **저장 API**: `useResearchPapers.ts`의 update mutation

### 1.2 문제
| 영역 | 문제 |
|------|------|
| 작성 공간 | 다이얼로그 폭/높이 제한 — 변인 표·연구방법 본문 입력에 비좁음 |
| 인지 흐름 | 다이얼로그는 "잠깐 보고 닫는" 톤 — 깊은 사고를 요하는 분석 노트와 결이 다름 |
| 저장 안정성 | 다이얼로그 닫힘 시 임시 입력 유실 가능 |
| 공유 | 다이얼로그는 URL이 없어 협업자에게 링크 공유 불가 |

### 1.3 사용자 의도 (확정)
- **추가 시점**: 팝업 그대로 유지 — 가벼운 기본 정보 입력
- **편집/상세 작성 시점**: 별도 페이지 — 변인·연구방법 등 천천히 작성
- 진입 장벽 낮추고 작성 완료율 향상

---

## 2. 목표 (Why)

### 2.1 사용자 가치
- 큰 폼을 모달 폭에서 빠져나와 페이지의 넉넉한 영역에서 작성
- URL 기반 → 북마크/공유 가능
- 작성 중 다이얼로그 클로징 사고로 인한 데이터 유실 위험 제거

### 2.2 KPI (정성적)
| 지표 | 기대 변화 |
|------|----------|
| 변인·연구방법 작성 완료율 | ↑ |
| 작성 중 이탈율 | ↓ |
| 복귀 후 재편집 빈도 | ↑ (URL로 직접 접근) |

### 2.3 스코프
- **포함**: 편집 페이지 신규(`/mypage/research/papers/[id]`), 카드 클릭 → router.push, 다이얼로그는 추가 전용 유지
- **불포함**: 데이터 모델 변경, 신규 필드 추가, 기존 다이얼로그 추가 흐름 재설계

---

## 3. 변경 흐름 (What)

### 3.1 사용자 흐름

```
[추가 흐름 — 변경 없음]
  분석 노트 페이지 → "+ 논문 추가" 버튼 → 다이얼로그 열림
  → 기본 정보(제목/저자/연도/링크 등) 입력 → "저장" → 카드 등장

[편집 흐름 — 변경됨]
  분석 노트 페이지 → 카드 클릭
  → router.push("/mypage/research/papers/{paperId}")
  → 페이지 로드: 페이퍼 상세 + 변인 표 + 연구방법 + 요약 + 노트
  → 자동 저장 (debounce) 또는 "저장" 버튼
  → 뒤로가기 → 분석 노트 페이지 복귀
```

### 3.2 페이지 구조 — `/mypage/research/papers/[id]`

```
┌─────────────────────────────────────────┐
│  ← 분석 노트로                           │  Breadcrumb
├─────────────────────────────────────────┤
│  📄 논문 제목 (편집 가능)                 │  Header
│  저자 · 연도 · 게재지                     │
├─────────────────────────────────────────┤
│  Tabs: [기본정보] [변인] [연구방법] [노트] │  Section nav
├─────────────────────────────────────────┤
│  (선택된 탭 컨텐츠 — 페이지 폭 활용)      │
├─────────────────────────────────────────┤
│  마지막 저장: 1분 전        [저장] [닫기] │
└─────────────────────────────────────────┘
```

> 탭 분할은 옵션. 단순 스크롤 페이지로 시작 후 컨텐츠 양 증가 시 탭 적용.

### 3.3 라우트 결정
- 권장: `/mypage/research/papers/[id]` — 회원 본인 영역 하위 (자연스러운 위치)
- 대안: `/research/papers/[id]` — 도메인 루트 (단, 권한 가드 별도 필요)
- → **권장안 채택**: `/mypage` 라우트는 이미 AuthGuard 적용

---

## 4. 영향 범위

| 파일 | 변경 |
|------|------|
| `src/app/mypage/research/papers/[id]/page.tsx` | **신규** 페이지 |
| `src/features/research/PaperEditPage.tsx` | **신규** 편집 폼 컴포넌트 (다이얼로그의 본체 마이그레이션) |
| `src/features/research/ResearchPaperList.tsx` | 카드 클릭 핸들러 — `router.push` 로 변경, 편집 다이얼로그 표시 코드 제거 |
| `src/features/research/ResearchPaperDialog.tsx` | **추가 전용**으로 단순화 (편집 코드 정리) — 또는 별도 `ResearchPaperCreateDialog.tsx`로 분리 |
| `src/features/research/useResearchPapers.ts` | 단건 조회 hook 보강 (페이지에서 paperId 기반 fetch) |
| 데이터 모델 | **변경 없음** |

---

## 5. 기술 구현 방향 (How)

### 5.1 신규 hook
```ts
// useResearchPapers.ts에 추가
export function useResearchPaper(paperId: string | undefined) {
  // Firestore single doc fetch
  // 또는 useResearchPapers의 list에서 find
}
```

### 5.2 PaperEditPage 컴포넌트 인터페이스
```tsx
interface PaperEditPageProps {
  paperId: string;
}
// 내부적으로 useResearchPaper(paperId) + react-hook-form 또는 controlled state
// 자동 저장 (debounce 1.5s) 또는 명시적 "저장"
```

### 5.3 자동 저장 정책
- 사용자가 "큰 폼을 천천히 쓴다"는 의도 → 자동 저장이 강력
- debounce 1500ms, 변경된 필드만 PATCH
- "마지막 저장: N분 전" 표시

### 5.4 카드 클릭 핸들러 변경
```tsx
// ResearchPaperList.tsx
import { useRouter } from "next/navigation";
const router = useRouter();
// 기존: setSelectedPaper(paper); setDialogOpen(true);
// 변경: router.push(`/mypage/research/papers/${paper.id}`);
```

---

## 6. 리스크 / 완화

| 리스크 | 완화 |
|--------|------|
| 자동 저장 실패 시 사용자 인지 어려움 | 마지막 저장 시각 + 실패 시 toast.error |
| 페이지 이탈 시 미저장 변경 유실 | beforeunload 경고 + 자동 저장 활용 |
| 기존 ResearchPaperDialog의 편집 코드가 다른 곳에서 호출 | grep으로 호출처 확인 후 정리 |
| 페이지 라우트 추가 후 권한 누락 | mypage 하위라 AuthGuard 자동 적용 |
| /console/research 운영 콘솔에서도 동일 다이얼로그 사용 시 영향 | console 측은 변경 X, mypage만 페이지화. 작업 4(별도 PDCA)에서 console 통합 결정 |

---

## 7. 작업 분해 (DoD)

### Phase Plan ✅ (현재)

### Phase Design
- [ ] `paper-edit-page.design.md` 작성
- [ ] PaperEditPage 와이어프레임 + 자동 저장 시퀀스
- [ ] useResearchPaper(id) hook 인터페이스

### Phase Do
- [ ] `useResearchPaper` hook 추가
- [ ] `PaperEditPage.tsx` 신규 (다이얼로그 폼 본체 마이그레이션)
- [ ] `/mypage/research/papers/[id]/page.tsx` 신규 페이지
- [ ] `ResearchPaperList.tsx` 클릭 핸들러 router.push로 변경
- [ ] `ResearchPaperDialog.tsx` 추가 전용 정리 (편집 분기 제거)
- [ ] 자동 저장 + "마지막 저장 시각" 표시
- [ ] beforeunload 경고

### Phase Check
- [ ] gap-detector
- [ ] /mypage/research 카드 클릭 → 페이지 이동 시각 검증
- [ ] 자동 저장 동작 검증

### Phase Report
- [ ] `paper-edit-page.report.md`

---

## 8. 일정

| 단계 | 시간 |
|------|------|
| Plan | 0.5h ✅ |
| Design | 1h |
| Do | 5-7h |
| Check + Act | 1-2h |
| Report | 0.5h |
| **합계** | **~8-11h** |

---

## 9. 후속 PDCA 단계

| 명령 | 다음 |
|------|------|
| `/pdca design paper-edit-page` | Design 진입 |
| `/pdca do paper-edit-page` | Do 진입 |

---

> 다음은 `/pdca design paper-edit-page`.

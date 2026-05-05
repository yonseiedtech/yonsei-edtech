# Design: 분석 노트 논문 편집 페이지화 (paper-edit-page)

> **작성일**: 2026-05-05
> **PDCA 단계**: Design
> **참조 Plan**: `docs/01-plan/features/paper-edit-page.plan.md`

---

## 1. 컴포넌트 트리

```
/mypage/research/papers/[id]/page.tsx       (신규 — server component wrapper)
  └─ <PaperEditPage paperId={id} />         (신규 — client)
       ├─ <PaperEditHeader paper />          (제목/저자/연도/뒤로가기)
       ├─ <PaperEditSection title="기본 정보">
       │    └─ 입력 필드 (PaperType, ThesisLevel, title, authors, year, venue …)
       ├─ <PaperEditSection title="변인·연구방법">
       │    └─ <VariablesInput /> + methodology textarea
       ├─ <PaperEditSection title="참고문헌">
       │    └─ references textarea
       ├─ <PaperEditSection title="인사이트">
       │    └─ findings + insights + myConnection textarea
       ├─ <PaperEditSection title="분류">
       │    └─ <TagInput /> + readStatus + rating + 날짜
       └─ <SaveStatus />                     (마지막 저장 시각, 자동 저장 표시)
```

## 2. 데이터 흐름

```
useResearchPaper(paperId)        // 신규 hook
  ↓
PaperEditPage 마운트 시 fetch
  ↓
state: form (FormState 동일 — Dialog와 1:1)
  ↓
사용자 입력 → setForm + dirty=true
  ↓
debounce 1500ms → useUpdateResearchPaper.mutateAsync({id, data})
  ↓
성공 → setLastSavedAt(new Date()) + dirty=false
실패 → toast.error + dirty 유지
```

## 3. 신규 훅 — `useResearchPaper(paperId)`

```ts
// useResearchPapers.ts에 추가
export function useResearchPaper(paperId: string | undefined) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["research_papers", "single", paperId],
    queryFn: async () => {
      if (!paperId) return null;
      const res = await researchPapersApi.get(paperId);
      return res.data ?? res;
    },
    enabled: !!paperId,
    staleTime: 1000 * 60,
  });
  return { paper: data, isLoading, error, refetch };
}
```

> `researchPapersApi.get(id)`이 있는지 확인 필요. 없으면 `list(userId)` → `find(id)` 폴백.

## 4. 페이지 라우팅

`src/app/mypage/research/papers/[id]/page.tsx`

```tsx
"use client";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/features/auth/auth-store";
import PaperEditPage from "@/features/research/PaperEditPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  const { user } = useAuthStore();
  if (!user) return null; // AuthGuard 하위라 로그인 강제됨
  return <PaperEditPage paperId={params.id} />;
}
```

`/mypage`에 이미 `AuthGuard`가 적용되어 비로그인 차단 + approved 미통과 차단.

## 5. PaperEditPage 인터페이스

```ts
interface PaperEditPageProps {
  paperId: string;
}
```

내부 상태 (Dialog와 동일):
- `form: FormState` — Dialog의 FormState 구조 그대로
- `dirty: boolean` — 변경 추적
- `lastSavedAt: Date | null`
- `saving: boolean`

## 6. 자동 저장 시퀀스

```
[입력 변경]
    ↓ setForm + dirty=true
    ↓
[useDebounceEffect 1500ms]
    ↓ 변경 없으면 skip
    ↓
[useUpdateResearchPaper.mutateAsync({id, data})]
    ↓ saving=true
    ↓
성공:
  - setLastSavedAt(new Date())
  - dirty=false
  - saving=false
실패:
  - toast.error
  - dirty=true 유지 → 다음 입력 시 재시도
```

## 7. 페이지 이탈 보호

```ts
useEffect(() => {
  function handler(e: BeforeUnloadEvent) {
    if (dirty) e.preventDefault();
  }
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [dirty]);
```

## 8. SaveStatus UI

```tsx
{saving && <span><Loader2 size={12} className="animate-spin" /> 저장 중…</span>}
{!saving && lastSavedAt && (
  <span>마지막 저장: {formatDistanceToNow(lastSavedAt)}</span>
)}
{!saving && dirty && <span className="text-amber-600">저장 대기 중…</span>}
```

## 9. ResearchPaperList 변경

```diff
- const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);
- const [dialogOpen, setDialogOpen] = useState(false);
+ const router = useRouter();

  <ResearchPaperCard
    paper={paper}
-   onEdit={() => { setSelectedPaper(paper); setDialogOpen(true); }}
+   onEdit={() => router.push(`/mypage/research/papers/${paper.id}`)}
    onDelete={...}
  />

- // 편집 다이얼로그 표시 코드 제거
- {dialogOpen && <ResearchPaperDialog ... initial={selectedPaper} />}
+ {/* 추가 다이얼로그는 그대로 유지 */}
+ {createDialogOpen && <ResearchPaperDialog ... initial={null} />}
```

## 10. 추가 흐름 (변경 없음)
- "+ 논문 추가" 버튼 → 다이얼로그 열림 (Dialog의 5-step wizard)
- "임시 저장" 또는 "완료" → ResearchPaper 생성 → 카드 등장
- **추가 직후 페이지 자동 이동** (사용자 의도): 생성 응답의 id로 `router.push(/mypage/research/papers/{id})` 즉시 호출

> 이렇게 하면: 가벼운 추가 → 자동으로 상세 페이지 진입 → 변인/연구방법 등 천천히 작성. 가장 자연스러운 흐름.

## 11. 작업 분해 (Do)

- [ ] `useResearchPaper` hook 추가
- [ ] `PaperEditPage.tsx` (Dialog의 FormState/입력 필드 마이그레이션)
- [ ] `/mypage/research/papers/[id]/page.tsx` 신규 페이지
- [ ] `ResearchPaperList.tsx` 클릭 → router.push 변경, 편집 Dialog 표시 제거
- [ ] 추가 흐름 — Dialog 완료 후 자동 페이지 이동
- [ ] 자동 저장 + 마지막 저장 시각
- [ ] beforeunload 경고
- [ ] 빌드 검증

## 12. 검증 체크리스트
- [ ] 카드 클릭 → 페이지 이동 정상
- [ ] 페이지에서 입력 → 1.5초 debounce 후 자동 저장
- [ ] 새로고침 후 이전 입력 유지 (저장됨)
- [ ] dirty 상태에서 페이지 이탈 시 경고
- [ ] 추가 다이얼로그 → 완료 → 페이지로 자동 이동
- [ ] 모바일 반응형

---

> 다음은 `/pdca do paper-edit-page`.

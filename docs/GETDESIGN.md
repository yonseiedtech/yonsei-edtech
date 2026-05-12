# GETDESIGN.md — yonsei-edtech 디자인 시스템 사용 가이드

> "어떻게 쓰는가" 에 집중한 개발자 쿡북.
> "무엇인가" 정의는 [/DESIGN.md](../DESIGN.md) 참조.
> 최종 갱신: 2026-05-13 (Sprint 67-AR)

---

## 0. 5초 결정 트리

| 상황 | 사용할 컴포넌트 |
|---|---|
| 짧은 성공/실패 알림 (저장됨·삭제됨) | `toast` (sonner) |
| 폼 검증 오류·섹션 내 지속 알림 | `<InlineNotification>` |
| 페이지 상단 행동 유도 (미답변 N건) | `<ActionableBanner>` |
| 0건·로딩 후 빈 상태 | `<EmptyState>` |
| 데이터 로딩 중 | `<Skeleton>` |
| 되돌릴 수 없는 작업 확인 | `<AlertDialog>` |
| 모바일 슬라이드 메뉴 | `<Sheet>` |
| 표·정렬·필터 | `AdminMemberTab` 패턴 참조 |

---

## 1. Notification — 4-Tier 사용법

### 1.1 Toast (sonner)
짧은 성공/실패. 자동 사라짐.

```tsx
import { toast } from "sonner";

toast.success("저장되었습니다");
toast.error("저장 실패: 권한 없음");
```

### 1.2 InlineNotification
폼·섹션 내부 지속 알림.

```tsx
import InlineNotification from "@/components/ui/inline-notification";

// 정보
<InlineNotification
  kind="info"
  title="자동 승인이 켜져 있습니다"
  description="yonsei.ac.kr 도메인은 자동 승인됩니다."
/>

// 경고 + 닫기 가능
<InlineNotification
  kind="warning"
  title="이메일 도메인 불일치"
  description="외부 도메인 사용 시 운영진 수동 검토가 필요합니다."
  dismissible
  onDismiss={() => setDismissed(true)}
/>

// 에러 + 우측 액션
<InlineNotification
  kind="error"
  title="제출 실패"
  description="네트워크 오류가 발생했습니다."
  action={<button onClick={retry} className="text-xs underline">다시 시도</button>}
/>
```

### 1.3 ActionableBanner
페이지 상단 prominent + CTA 필수.

```tsx
import ActionableBanner from "@/components/ui/actionable-banner";

// 미답변 문의 — 페이지 상단
{unansweredCount > 0 && (
  <ActionableBanner
    kind="error"
    title={`미답변 문의 ${unansweredCount}건`}
    description="24시간 내 응답이 학회 운영 표준입니다."
    action={{ label: "문의 답변하기", href: "/console/inquiries" }}
  />
)}

// 사용자 알림 (닫기 가능)
<ActionableBanner
  kind="success"
  title="가입이 완료되었습니다"
  description="본인 학기에 맞는 가이드가 준비되어 있어요."
  action={{ label: "디딤판 가기", href: "/steppingstone" }}
  dismissible
  onDismiss={() => localStorage.setItem("hide_welcome", "1")}
/>
```

### 1.4 AlertDialog (모달 확인)
shadcn 표준 사용 — 되돌릴 수 없는 작업 전용.

```tsx
import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription,
         AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

<AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogTitle>토론을 영구 삭제합니다</AlertDialogTitle>
    <AlertDialogDescription>되돌릴 수 없습니다. 계속할까요?</AlertDialogDescription>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## 2. EmptyState — 빈 상태

```tsx
import EmptyState from "@/components/ui/empty-state";
import { Bot, Inbox, User } from "lucide-react";

// 단일 액션
<EmptyState
  icon={Bot}
  title="아직 등록된 AI 포럼 토론이 없습니다"
  description="새 토론을 등록하면 회원이 관전 페이지에서 라운드별 발언을 볼 수 있습니다."
  actionLabel="새 토론 등록"
  onAction={() => setShowNew(true)}
/>

// 다중 액션 (1-click + 직접)
<EmptyState
  icon={Inbox}
  title="아직 단계가 없습니다"
  description="기본 6단계를 1-click 으로 등록하거나 직접 추가하세요."
  actions={[
    { label: "기본 6단계 1-click 등록", onClick: handleSeed, variant: "default" },
    { label: "직접 새 단계 추가", onClick: openForm, variant: "outline" },
  ]}
/>

// 컴팩트 (위젯 내부)
<EmptyState
  icon={User}
  title="아직 받은 명함이 없습니다"
  description="학술대회·세미나에서 만난 분들의 명함을 등록해 보세요."
  compact
/>
```

---

## 3. Button — variants

```tsx
import { Button } from "@/components/ui/button";

<Button>저장</Button>                              // default
<Button variant="outline">취소</Button>             // outline
<Button variant="destructive">삭제</Button>         // 위험 동작
<Button variant="ghost" size="sm">더보기</Button>   // 부수
<Button variant="link">자세히 →</Button>            // 인라인 링크 톤

// 로딩
<Button disabled>
  <Loader2 size={14} className="mr-1 animate-spin" />
  처리 중…
</Button>
```

---

## 4. Form Layout 표준

```tsx
<div className="space-y-4">
  {/* 필드 1 */}
  <div>
    <label htmlFor="title" className="text-sm font-semibold">제목</label>
    <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
  </div>

  {/* 2열 그리드 */}
  <div className="grid gap-3 sm:grid-cols-2">
    <div>
      <label className="text-sm font-semibold">카테고리</label>
      <select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
        ...
      </select>
    </div>
    <div>
      <label className="text-sm font-semibold">최대 라운드</label>
      <Input type="number" className="mt-1" />
    </div>
  </div>

  {/* 액션 (오른쪽 정렬) */}
  <div className="flex justify-end gap-2 pt-2">
    <Button variant="outline" onClick={onCancel}>취소</Button>
    <Button onClick={onSubmit}>저장</Button>
  </div>
</div>
```

---

## 5. 카드 패턴

### 기본 카드
```tsx
<article className="rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
  ...
</article>
```

### 강조 카드 (CTA)
```tsx
<div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 shadow-sm">
  ...
</div>
```

### 그라데이션 강조 (Banner 톤)
```tsx
<div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-sky-500/5 to-primary/5 p-5 shadow-sm">
  ...
</div>
```

---

## 6. 상태 배지

```tsx
import { Badge } from "@/components/ui/badge";

<Badge>새 기능</Badge>                                  // default (primary)
<Badge variant="secondary">{count}건</Badge>            // secondary
<Badge variant="outline">{label}</Badge>                // 가벼운 메타
<Badge variant="destructive">위험</Badge>               // 경고

// 커스텀 상태 (Carbon-style 색상)
<span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
  완료
</span>
```

---

## 7. ❌ Do / ✓ Don't

### 색상
- ❌ `bg-[#3a5fcd]` (free-form HEX)
- ✅ `bg-primary` 또는 Tailwind 표준 (`bg-blue-500`)

### 색상 — 의미와 매핑
- ❌ 위험 상태에 `bg-blue-50`
- ✅ 위험은 `bg-rose-*` / 경고는 `bg-amber-*`

### 빈 상태
- ❌ `<div>데이터가 없습니다.</div>`
- ✅ `<EmptyState icon={...} title="..." actionLabel="..." />`

### 알림
- ❌ 커스텀 div 로 새 알림 UI 만들기
- ✅ Notification 4-Tier (Toast/Inline/Banner/AlertDialog) 중 선택

### 동적 OG metadata
- ❌ "use client" 페이지에 metadata 누락
- ✅ 형제 `layout.tsx` 에 `generateMetadata` 추가 (sub-layout 패턴)

### 폰트 크기
- ❌ `style={{ fontSize: 14 }}`
- ✅ `text-sm` 등 Tailwind 클래스

### 모션
- ❌ `animate-spin` 무한 회전을 reduced-motion 고려 없이 사용
- ✅ `useReducedMotion()` 또는 CSS `@media (prefers-reduced-motion)` 확인

### Cron
- ❌ `0 */6 * * *` (Hobby 플랜 불가)
- ✅ `0 6 * * *` (daily, Hobby 호환)

### 운영진 콘텐츠
- ❌ 하드코딩된 콘텐츠 배열 (수정 시 코드 배포 필요)
- ✅ Firestore CMS + 운영진 콘솔 폼 + 정적 fallback

---

## 8. 마이그레이션 — 기존 코드 표준화

### 기존 커스텀 빈 상태 → EmptyState
```tsx
// Before
<div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
  검색 결과가 없습니다.
</div>

// After
<EmptyState
  icon={Search}
  title={`"${query}"에 대한 결과 없음`}
  description="키워드를 다시 확인하거나 검색을 초기화하세요."
  actionLabel="검색 초기화"
  onAction={() => setQuery("")}
/>
```

### 기존 plain 안내 → InlineNotification
```tsx
// Before
<div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-xs text-muted-foreground">
  <strong>안내</strong>: ...
</div>

// After
<InlineNotification kind="info" title="..." description="..." />
```

### 기존 커스텀 banner → ActionableBanner
- 7일 윈도우 같은 특수 로직이 있으면 커스텀 유지
- 일반 페이지 안내라면 ActionableBanner 채택

---

## 9. FAQ

### Q1. Toast 와 InlineNotification 중 뭘 써야 할까?
- 사용자가 화면 어디에 있어도 봐야 한다 → Toast
- 특정 폼·섹션 내에서 지속 노출되어야 한다 → InlineNotification

### Q2. ActionableBanner 와 InlineNotification 차이는?
- 둘 다 in-flow 알림이지만, **CTA 필수성**이 핵심:
  - ActionableBanner: action 필수 (사용자에게 다음 단계 안내)
  - InlineNotification: action 선택

### Q3. 새 색상이 필요해요. 추가해도 되나요?
- Foundation 6색 프리셋(§2.1 DESIGN.md) 안에서 먼저 시도
- 부족하면 Tailwind 팔레트(`cyan` · `orange` 등)에서 추가
- HEX 직접 사용은 디자인 리뷰 통과 후만 허용

### Q4. 새 페이지에 generateMetadata 어떻게?
- 페이지가 server component → page.tsx 에 직접 추가
- 페이지가 `"use client"` → 형제 `layout.tsx` 에 추가 (sub-layout 패턴)
- 동적 라우트 (`[id]`) → `params` 받아서 API 호출 + try/catch

### Q5. 디딤판 학기별 로드맵 수정하려면?
- 코드 수정 ❌ → 운영진 콘솔 `/console/roadmap` 에서 즉시 수정
- 콘텐츠는 Firestore CMS 가 우선 (없으면 정적 fallback)

### Q6. AI 포럼 새 토론 등록하려면?
- 운영진 콘솔 `/console/ai-forum`
- 등록 → "개최" 클릭 → 매일 cron 자동 진행 또는 "다음 진행" 즉시 advance

### Q7. 접근성 점검은?
- shadcn/ui · Lucide 아이콘은 기본 접근성 갖춤
- 추가 시 `aria-label`, `role`, `aria-live` 점검
- 색상만으로 정보 전달 금지 — 아이콘/패턴 병용

### Q8. 모바일에서 깨져요. 어떻게?
- Tailwind 반응형 prefix (`sm:`, `md:`, `lg:`) 사용
- 모바일 우선 — 기본은 모바일, prefix 는 데스크톱 확장
- 터치 타겟 최소 44×44px

---

## 10. 디버깅·점검 체크리스트

신규 컴포넌트·페이지 추가 시:

```
[ ] DESIGN.md §3 컴포넌트 인벤토리 확인 — 중복 컴포넌트 만들지 않기
[ ] DESIGN.md §2 Foundation 토큰 따르기 — 색상·타이포·간격
[ ] Notification 4-Tier 결정 트리 (§0) 따라 알림 선택
[ ] EmptyState 적용 (0건 상태)
[ ] Skeleton 적용 (로딩 상태)
[ ] generateMetadata 추가 (상세 페이지)
[ ] TypeScript tsc --noEmit 통과
[ ] vitest 회귀 테스트 추가 (핵심 로직만)
[ ] 모바일·다크모드 시각 점검
[ ] aria-label·role·focus-visible 확인
[ ] prefers-reduced-motion fallback (모션 사용 시)
```

---

## 11. 참고

- **정의·원칙**: [/DESIGN.md](../DESIGN.md) (단일 진입점)
- **차트 가이드**: [docs/charts-guide.md](./charts-guide.md)
- **권한 체계**: [docs/ROLE_PERMISSIONS.md](./ROLE_PERMISSIONS.md)
- **운영 자산**:
  - `docs/roadmap-stages-seed.md` — 디딤판 6단계 시드
  - `docs/ai-forum-launch-topics.md` — AI 포럼 첫 토론 주제
  - `docs/ai-forum-phase2-activation.md` — AI 포럼 활성화 절차

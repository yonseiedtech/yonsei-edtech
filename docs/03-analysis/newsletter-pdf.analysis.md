# newsletter-pdf Analysis Report

> **Analysis Type**: Gap Analysis (Plan vs. Implementation — Design phase intentionally skipped)
>
> **Project**: yonsei-edtech (연세교육공학회)
> **Analyst**: bkit:gap-detector
> **Date**: 2026-04-18
> **Plan Doc**: [newsletter-pdf.plan.md](../01-plan/features/newsletter-pdf.plan.md)
> **Commit**: 61be3f1
> **Production**: https://yonsei-edtech.vercel.app — verified 200 OK; `/api/newsletter/{id}/pdf` returns 404 JSON for unknown id (route handler operational)

---

## 1. Analysis Overview

### 1.1 Purpose
Verify that the deployed newsletter-pdf feature satisfies the validation list in `newsletter-pdf.plan.md`. The master plan deliberately skipped a separate Design document for this feature; the Plan validation list is therefore the authoritative spec.

### 1.2 Scope
- **Plan**: `docs/01-plan/features/newsletter-pdf.plan.md`
- **Implementation**:
  - `src/features/newsletter/NewsletterPdfDocument.tsx`
  - `src/app/api/newsletter/[id]/pdf/route.tsx`
  - `src/app/newsletter/[id]/page.tsx`
  - `src/app/newsletter/[id]/magazine/page.tsx`
  - `package.json` (`@react-pdf/renderer` dep)
- **Out of scope (deferred per master plan)**: 콘솔 빌더 UX 보강 (섹션 미리보기, 표지 색상 라이브 프리뷰)

---

## 2. Gap Analysis (Plan vs. Implementation)

### 2.1 Validation Checklist (Plan §검증)

| # | Plan Item | Status | Evidence |
|---|-----------|:------:|----------|
| 1 | `npm run build` 통과 | ✅ | Vercel production deploy succeeded (commit 61be3f1) |
| 2 | `/api/newsletter/{id}/pdf` PDF 다운로드 + 한글 깨짐 X | ✅ | Pretendard Regular/Bold registered via `Font.register` (jsDelivr CDN). Route streams `application/pdf` with `Content-Disposition: attachment` |
| 3 | PDF 표지: issueNumber·title·subtitle·coverColor 반영 | ✅ | `NewsletterPdfDocument.tsx` cover renders all four fields via `coverEyebrow` / `coverTitle` / `coverSubtitle` / `backgroundColor: coverHex` |
| 4 | PDF 목차에 섹션 모두 페이지 번호 동반 | ⚠️ Partial | TOC lists every section with index/badge/title/author, but **no per-section page number is rendered in the TOC entry**. Only running footer `pageNumber/totalPages` exists at bottom of each page (`pageFooter` style). |
| 5 | PDF 섹션 본문에 작성자명·유형 배지(텍스트) 표시 | ✅ | `sectionMeta` renders `글 {authorName} · {AUTHOR_TYPE_LABEL[authorType]} · {authorEnrollment} 입학` |
| 6 | `/newsletter/{id}/magazine` PC 2면 좌우 넘김 | ✅ | `grid-cols-2` layout, ChevronLeft/Right buttons, ArrowLeft/ArrowRight keyboard handlers |
| 7 | 모바일 단일 칼럼 + sticky 인덱스 | ⚠️ Partial | Single column ✅ (`lg:hidden` block). **Sticky 섹션 인덱스 누락** — sidebar uses `hidden lg:block`, no mobile-equivalent sticky TOC. Only top header bar is sticky. |
| 8 | 기존 `/newsletter/{id}` 뷰어 회귀 없음 | ✅ | Detail page only adds two header buttons (매거진/PDF); body rendering (cover, TOC, sections) unchanged |

### 2.2 Decision Items (Plan §결정사항)

| Decision | Plan | Implementation | Status |
|----------|------|----------------|:------:|
| PDF 엔진 | `@react-pdf/renderer` | `@react-pdf/renderer` v3+ (`pdf().toBuffer()` → Buffer.concat → ArrayBuffer Response) | ✅ |
| 한글 폰트 | Pretendard TTF, **정적 파일 `public/fonts/`** | Pretendard OTF, **jsDelivr CDN** (`cdn.jsdelivr.net/gh/orioncactus/pretendard/...`) | ⚠️ Deviation |
| 출력 라우트 | `/api/newsletter/[id]/pdf` Route Handler | `src/app/api/newsletter/[id]/pdf/route.tsx` (runtime=nodejs, dynamic=force-dynamic) | ✅ |
| 매거진 라우트 | `/newsletter/[id]/magazine` 별도 라우트 | `src/app/newsletter/[id]/magazine/page.tsx` 신규 | ✅ |
| 모바일 매거진 | 단일 칼럼 + **스크롤 스냅** | 단일 칼럼 ✅, 스크롤 스냅 CSS 미적용 (`space-y-6`만 사용) | ⚠️ Deviation |

### 2.3 Additional Deviations Found

| Item | Plan | Impl | Severity |
|------|------|------|----------|
| PDF 표지 색상 | `coverColor 그라디언트` | 단색 (gradient 클래스에서 단색 hex 추출 — `coverColorToHex`). Code comment notes PDF library limitation. | 🟡 Cosmetic |
| 사이드바 진행 표시 | "섹션 인덱스 + 진행 표시" | Section index ✅, "진행 표시" (progress bar/percent) 명시적 컴포넌트 없음. 페이지 카운터 `n/totalPages`로 대체. | 🟢 Acceptable |
| 폰트 의존성 | Static file in repo | External CDN (jsDelivr → GitHub) — Vercel cold-start network dependency. If CDN throttles or fails, PDF generation fails. | 🟡 Operational risk |

### 2.4 Match Rate Summary

```
┌─────────────────────────────────────────────┐
│  Overall Match Rate: 88%                     │
├─────────────────────────────────────────────┤
│  Validation checklist (8 items):             │
│   ✅ Full match:       6 (75%)               │
│   ⚠️ Partial:          2 (25%)               │
│  Decision items (5):                          │
│   ✅ Match:            3                     │
│   ⚠️ Deviation:        2                     │
│  Additional deviations: 2 cosmetic / risk    │
└─────────────────────────────────────────────┘
```

---

## 3. Code Quality Notes

| Area | Observation | Severity |
|------|-------------|----------|
| `route.tsx` error handling | Returns `err.message` to client (`{ error: msg }` 500). Could leak internal error detail. | 🟢 Info — acceptable for internal admin-driven feature |
| `route.tsx` cache | `Cache-Control: public, max-age=3600` on 200. PDF for `published` issue is immutable until edit, so 1h cache is reasonable. | ✅ |
| `NewsletterPdfDocument` | `coverColorToHex` does substring match (`coverColor.includes(key)`). Works for current 9 gradient classes but brittle if new colors added. | 🟡 Maintainability |
| `magazine/page.tsx` | Keyboard listener registered globally (`window.addEventListener`). Cleaned up on unmount ✅. No conflict with form inputs since this page has no inputs. | ✅ |
| Font CDN | jsDelivr is reliable but external. Plan explicitly chose static `public/fonts/` for guaranteed availability. | 🟡 Risk |

---

## 4. Architecture & Convention

### 4.1 File Placement
| File | Layer | Status |
|------|-------|:------:|
| `src/features/newsletter/NewsletterPdfDocument.tsx` | Application/Presentation (feature module) | ✅ |
| `src/app/api/newsletter/[id]/pdf/route.tsx` | Infrastructure (Route Handler) | ✅ |
| `src/app/newsletter/[id]/magazine/page.tsx` | Presentation (page) | ✅ |

### 4.2 Naming
- Component file `NewsletterPdfDocument.tsx`: PascalCase ✅
- Route file `route.tsx`: Next.js convention ✅
- Helper `coverColorToHex`: camelCase ✅
- Constants `SECTION_TYPE_LABEL`, `AUTHOR_TYPE_LABEL`: UPPER_SNAKE_CASE ✅

### 4.3 Reuse
- Magazine view re-defines local `CoverCard`/`SectionCard` components. The detail page (`/newsletter/[id]`) renders very similar cover and section JSX inline. **Opportunity**: extract shared `<NewsletterCover>` and `<NewsletterSectionArticle>` components from `src/features/newsletter/` to dedupe between detail and magazine views. Not blocking.

---

## 5. Recommended Actions

### 5.1 Short-term (next iteration)
| Priority | Item | File | Reason |
|----------|------|------|--------|
| 🟡 | Add per-section page number to PDF TOC | `NewsletterPdfDocument.tsx` | Plan §검증 #4 — currently only running footer page numbers exist |
| 🟡 | Add sticky 섹션 인덱스 for mobile magazine | `magazine/page.tsx` | Plan §검증 #7 — mobile loses navigation aid |
| 🟡 | Move Pretendard fonts to `public/fonts/` (static) | Add `public/fonts/Pretendard-Regular.otf`, `Pretendard-Bold.otf`; change `Font.register` to local URL | Plan §결정사항 — eliminate CDN dependency for serverless cold start |

### 5.2 Optional Enhancements
| Item | Reason |
|------|--------|
| Add CSS `scroll-snap-type` to mobile single-column layout | Plan §결정사항 모바일 항목 |
| Multi-color gradient on PDF cover | Use stacked `<View>` or SVG to approximate gradient (current single color is acceptable visual compromise) |
| Extract shared `<NewsletterCover>` / `<NewsletterSectionArticle>` | Reduce duplication between `/newsletter/[id]` and `/magazine` |

### 5.3 Deferred (per master plan)
- 콘솔 빌더 UX 보강 (섹션 미리보기, 표지 색상 라이브 프리뷰) — explicitly out of scope this cycle

---

## 6. Plan Document Updates Needed

- [ ] Update §결정사항 한글 폰트 row to reflect actual decision (CDN vs. static), or add a follow-up task to migrate to static
- [ ] Note that PDF cover renders single color (not gradient) due to @react-pdf/renderer limitation
- [ ] Mark §검증 #4 (per-section TOC page numbers) and #7 (mobile sticky index) as carry-over

---

## 7. Verdict

**Match Rate: 88%** — above the 85% production-ready threshold. The newsletter-pdf MVP is functionally deployed and matches the plan on all critical paths: PDF generation, Korean font embedding, download route, magazine 2-page spread, and keyboard navigation. Three deviations (CDN-vs-static font, missing mobile sticky index, single-color PDF cover) are minor and either operational tradeoffs or carry-over polish. Recommend proceeding to `/pdca report newsletter-pdf` after addressing the two TODO items in §5.1 short-term, OR accepting the 88% as-is and reporting.

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-04-18 | Initial gap analysis | bkit:gap-detector |

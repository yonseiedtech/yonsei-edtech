# OG/SEO High 우선순위 메타데이터 수정 보고서 (2026-07-22)

## 감사 보고서 재검토 결과

`l1-og-audit.md` 의 High 목록 7개를 실측 확인한 결과:

| 페이지 경로 | 상태 | 비고 |
|---|---|---|
| `/about/fields` | **누락 → 신규 추가** | "use client" → layout.tsx 패턴 |
| `/board/free` | **누락 → 신규 추가** | "use client" → layout.tsx 패턴 |
| `/board/promotion` | **누락 → 신규 추가** | "use client" → layout.tsx 패턴 |
| `/board/resources` | **누락 → 신규 추가** | "use client" → layout.tsx 패턴 |
| `/activities/studies/[id]` | 기존 완료 | `src/app/activities/studies/[id]/layout.tsx` generateMetadata 존재 |
| `/activities/projects/[id]` | 기존 완료 | `src/app/activities/projects/[id]/layout.tsx` generateMetadata 존재 |
| `/activities/external/[id]` | 기존 완료 | `src/app/activities/external/[id]/layout.tsx` generateMetadata 존재 |

동적 라우트 3개는 Sprint 67-AR에서 이미 구현된 상태였음.

## 신규 추가 파일 (4개)

### 1. `src/app/about/fields/layout.tsx`

```tsx
title: "활동 분야"
// → 렌더 결과: "활동 분야 | 연세교육공학회"
description: "연세교육공학회가 탐구하고 실천하는 교수설계, 테크놀로지 활용, 학습분석 등 주요 연구 분야를 소개합니다."
```

### 2. `src/app/board/free/layout.tsx`

```tsx
title: "자유게시판"
// → 렌더 결과: "자유게시판 | 연세교육공학회"
description: "연세교육공학회 회원들이 학습, 연구, 일상을 자유롭게 나누는 커뮤니티 공간입니다."
```

### 3. `src/app/board/promotion/layout.tsx`

```tsx
title: "홍보게시판"
// → 렌더 결과: "홍보게시판 | 연세교육공학회"
description: "연세교육공학회의 학술대회, 세미나, 모집 공고 등 학회 관련 홍보 및 행사 안내입니다."
```

### 4. `src/app/board/resources/layout.tsx`

```tsx
title: "자료실"
// → 렌더 결과: "자료실 | 연세교육공학회"
description: "연세교육공학회 회원을 위한 발표 자료, 참고 문헌, 학습 리소스를 공유하는 자료 게시판입니다."
```

## 구현 패턴

- **"use client" 페이지** → 형제 `layout.tsx` 에 `export const metadata: Metadata` 선언
  - Next.js 제약: page.tsx가 `"use client"` 이면 metadata export 불가
  - 루트 layout.tsx의 `title.template: "%s | 연세교육공학회"` 가 자동 suffix 적용
- **페이지 본문 수정 없음**: 메타 레이어만 추가, page.tsx는 일절 변경하지 않음

## 검증

- `npx tsc --noEmit` → 오류 0
- `npx eslint --quiet` 4개 파일 → 경고/오류 0
- 빌드·커밋은 메인 게이트에서 처리

# `<img>` → `<Image>` 전환 결과

작업일: 2026-07-21  
대상: `@next/next/no-img-element` suppress 제거를 위한 6개 파일 전환

---

## 파일별 변환 내용

### 1. `src/components/members/MemberCard.tsx`
- `import Image from "next/image"` 추가
- 아바타 div에 `relative` 추가
- `<img … className="h-full w-full object-cover">` → `<Image fill className="object-cover" />`

### 2. `src/components/profile/ProfileHeader.tsx`
- `import Image from "next/image"` 추가
- 아바타 div에 `relative` 추가
- `<img … className="h-full w-full object-cover">` → `<Image fill className="object-cover" />`

### 3. `src/components/popup/SitePopupModal.tsx`
- `import Image from "next/image"` 추가
- `<img className="w-full object-cover h-32/h-44">` →  
  `<div className="relative w-full overflow-hidden h-32/h-44"><Image fill className="object-cover" /></div>`

### 4. `src/features/card/BusinessCard.tsx`
- `import Image from "next/image"` 이미 존재 (중복 추가 없음)
- 프로필 사진 부모 div에 `relative` 이미 존재
- `<img … className="h-full w-full object-cover">` → `<Image fill className="object-cover" />`

### 5. `src/features/activities/ActivityPage.tsx`
- `import Image from "next/image"` 추가
- ExternalCard 포스터: 부모 Link에 `relative` 이미 있음  
  `<img className="absolute inset-0 h-full w-full …">` → `<Image fill className="object-cover …" />`
- Dialog 포스터 미리보기:  
  `<img className="h-24 w-18 …">` →  
  `<div className="relative h-24 w-18 shrink-0 overflow-hidden rounded-lg border"><Image fill className="object-cover" /></div>`

### 6. `src/features/activities/ActivityDetail.tsx`
- `import Image from "next/image"` 추가
- 포스터 이미지 2곳 (로그인/비로그인 분기):  
  `<img className="block w-full">` → `<Image width={800} height={1200} className="block w-full h-auto" />`

---

## tsc 검증 결과

```
npx tsc --noEmit → 에러 0건
```

---

## 잔여 `eslint-disable @next/next/no-img-element`

대상 6개 파일: **0건** (모두 제거)

프로젝트 내 다른 파일(PageCanvas, SlideViewer, card-news/art, seminars 등)에는 여전히 suppress 주석이 남아 있으나, 이번 작업 범위 밖임.

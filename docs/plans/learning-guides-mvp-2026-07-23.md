# 러닝 가이드 MVP 구현 보고서 (2026-07-23)

## 1. 신규 파일 목록

### 타입
- `src/types/learning-guide.ts` — LearningGuide / GuideChapter / GuidePage / GuideProgress 타입 정의
- `src/types/index.ts` — `export * from "./learning-guide"` 추가

### 피처 모듈 (충돌 파일 수정 없음)
- `src/features/learning-guides/api.ts` — 클라이언트 API 모듈 (읽기: dataApi 재사용, 쓰기: Admin 라우트 경유)
- `src/features/learning-guides/SimpleMarkdown.tsx` — 최소 마크다운 렌더러 (외부 라이브러리 없음)

### Admin API 라우트 (Admin SDK, write: Admin 전용)
| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/learning-guides` | GET | published 목록 (공개범위 적용), ?all=true (staff+ 전체), ?slug=xxx (단건) |
| `/api/learning-guides` | POST | 가이드 생성 (저자 자격 검증) |
| `/api/learning-guides/[id]` | GET/PATCH/DELETE | 단건 조회·수정·삭제 |
| `/api/learning-guides/authorize` | GET | 저자 자격 확인 |
| `/api/guide-chapters` | GET/POST | 챕터 목록/생성 |
| `/api/guide-chapters/[id]` | PATCH/DELETE | 챕터 수정/삭제 (하위 페이지 포함) |
| `/api/guide-pages` | GET/POST | 페이지 목록/생성 |
| `/api/guide-pages/[id]` | GET/PATCH/DELETE | 페이지 조회·수정·삭제 |
| `/api/guide-progress` | GET/POST | 개인 진행 조회·적립 |

### 독자 표면
- `src/app/learning-guides/page.tsx` — 서재 (카드 그리드, 카테고리 필터, 진행 배지)
- `src/app/learning-guides/[slug]/page.tsx` — 뷰어 (TOC 사이드바, 마크다운/임베드 렌더, 이전/다음, 진행 추적, 키보드 단축키 ←→T)

### 저자 표면 (콘솔)
- `src/app/console/learning-guides/page.tsx` — 목록 + 발행 토글 + 삭제
- `src/app/console/learning-guides/new/page.tsx` — 새 가이드 생성 폼
- `src/app/console/learning-guides/[id]/edit/page.tsx` — 챕터·페이지 에디터

### 수정 파일
- `src/app/console/layout.tsx` — 콘텐츠 그룹에 `{ href: "/console/learning-guides", label: "러닝 가이드", icon: BookMarked }` 추가
- `src/types/index.ts` — learning-guide 타입 export 추가

---

## 2. 데이터 모델 (4개 컬렉션)

### learning_guides
```
{
  id, title, slug(고유), subtitle?, coverEmoji?, category,
  description?, tags: string[],
  visibility: "public" | "member" | "staff",
  status: "draft" | "published",
  authorId, authorName, chapterCount?(집계 캐시),
  createdAt, updatedAt
}
```

### guide_chapters
```
{ id, guideId, title, order, createdAt?, updatedAt? }
```

### guide_pages
```
{
  id, guideId, chapterId, title, order, anchor(슬러그),
  pageType: "native" | "embed",
  body?(native — 마크다운), embedUrl?(embed), embedKind?:"pdf"|"link"|"youtube",
  createdAt?, updatedAt?
}
```

### guide_progress  
```
docId: `${userId}_${guideId}`
{ userId, guideId, lastPageId?, readPageIds: string[], updatedAt }
```

---

## 3. 저자 자격 서버 검증

`/api/learning-guides/authorize` 및 POST/PATCH/DELETE 모든 쓰기 라우트에서 재검증:

```
eligible = staff 이상(ROLE_HIERARCHY >= 3)
         OR activities.type=="study" && leaderId==uid (스터디 모임장)
         OR seminars.speakerIds array-contains uid (세미나 연사)
```

**구현 위치**: `src/app/api/learning-guides/route.ts` → `checkAuthorEligibility(uid, role)` 헬퍼, `[id]/route.ts` / `authorize/route.ts` 에서 import 재사용.

---

## 4. 네이티브/임베드 택일

- **native**: 마크다운 textarea 입력 → `SimpleMarkdown` 렌더 (헤딩·굵게·기울임·코드·목록·링크)
- **embed**: URL 입력 + 종류 선택
  - `pdf`: `<iframe>` 뷰어
  - `youtube`: `youtube-nocookie.com` embed iframe (CSP: next.config.ts에 별도 frame-src 헤더 없음 → 기존 X-Frame-Options: SAMEORIGIN은 우리 사이트가 프레임될 때 적용, 외부 임베드에는 무관 → **안전 확인됨**)
  - `link`: 링크 카드 (외부 링크 버튼)

---

## 5. 재사용 자산

| 필요 | 재사용 |
|---|---|
| PDF 임베드 | `<iframe>` (pdfjs는 슬라이드 PNG 전용이라 embed용은 iframe 직접 사용) |
| 다크모드·시맨틱 토큰 | globals.css 전역 가드 (raw 색상 금지 준수) |
| 마크다운 렌더 | SimpleMarkdown (신규 경량 파서 — 외부 의존성 없음) |
| 회원 게이트·staff 게이트 | AuthGuard (console layout), isAtLeast, ROLE_HIERARCHY |
| 인증 API 패턴 | requireAuth / verifyAuth from @/lib/api-auth |
| Admin Firestore | getAdminDb from @/lib/firebase-admin |
| 클라 Firestore 읽기 | dataApi from @/lib/bkend (수정 없이 import만) |

---

## 6. firestore.rules 수정안 (전문)

> **메인 오케스트레이터가 firestore.rules에 추가할 규칙**

```
// ── 러닝 가이드 (MVP 2026-07-23) ──────────────────────────────────────────────

// 가이드 목록·조회
match /learning_guides/{guideId} {
  // 발행된 가이드 공개범위별 읽기
  allow read: if (
    // public 가이드: 누구나
    (resource.data.status == "published" && resource.data.visibility == "public") ||
    // member 가이드: 인증된 승인 사용자
    (resource.data.status == "published" && resource.data.visibility == "member" && request.auth != null) ||
    // staff 가이드: staff 이상 (Firestore에서 role 검증은 불가 → 공개 read 허용 후 API 라우트에서 필터)
    (resource.data.status == "published" && resource.data.visibility == "staff" && request.auth != null) ||
    // draft: staff+ (API 라우트 경유 read도 가능하지만 직접 접근 시)
    request.auth != null
  );
  // 쓰기: Admin SDK 전용 (클라이언트 직접 쓰기 금지)
  allow write: if false;
}

// 챕터
match /guide_chapters/{chapterId} {
  allow read: if request.auth != null;
  allow write: if false;
}

// 페이지 (본문 포함 — 크기 주의)
match /guide_pages/{pageId} {
  allow read: if request.auth != null;
  allow write: if false;
}

// 개인 진행 — 본인만 읽기/쓰기
// (쓰기도 Admin SDK 경유이므로 allow write: if false 가능하나
//  혹시 클라 직접 접근 시를 대비해 본인만 허용)
match /guide_progress/{progressId} {
  allow read, write: if request.auth != null &&
    progressId == (request.auth.uid + "_" + resource.data.guideId);
}
```

**참고**: visibility=="staff" 게이트는 API 라우트 서버에서 `ROLE_HIERARCHY` 로 정밀 제어. Firestore rules는 1차 방어 (미인증 차단)만 담당.

---

## 7. 내비게이션 진입점

- **콘솔 메뉴**: `/console/learning-guides` (콘텐츠 그룹, BookMarked 아이콘) — **완료**
- **독자 진입 (Header/BottomNav)**: Header.tsx·BottomNav.tsx는 충돌 금지 파일 — **메인 오케스트레이터가 추가 예정**
- **/archive 안내 카드**: archive 페이지는 충돌 금지 목록 외이나, 대규모 "use client" 컴포넌트 수정은 다른 에이전트와 충돌 위험 → **메인이 판단 후 추가** (추천 위치: ArchiveStartHere 컴포넌트 또는 페이지 하단 추천 섹션)

---

## 8. 검증 항목

| 항목 | 결과 |
|---|---|
| 신규 파일 모두 생성 | 16개 OK (PowerShell -LiteralPath 확인) |
| raw 색상 | 시맨틱 토큰만 사용 (bg-primary, text-muted-foreground 등) — raw 팔레트 미사용 |
| 신규 외부 의존성 | 없음 (pdfjs는 iframe 대체, 마크다운은 자체 파서) |
| bkend.ts 수정 | 없음 (import만) |
| 충돌 금지 파일 | Header.tsx, BottomNav.tsx, bkend.ts, board/**, activities/*/[id]/page.tsx — 모두 미수정 |
| console/layout.tsx | 콘텐츠 그룹에 1항목만 추가 (BookMarked import + nav item) |
| npm run build / git commit | 금지 — 메인 오케스트레이터 게이트에서 수행 |

---

*작성: executor · 2026-07-23 · bkend.ts 수정 없는 자체 API 모듈 + Admin SDK write 전용 패턴*

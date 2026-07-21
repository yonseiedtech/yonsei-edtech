# L1 OG·메타태그 감사 리포트 (2026-07-21)

## 현황 요약

- 전체 `page.tsx` 파일: **299개**
- `metadata` / `generateMetadata` export 보유: **16개** (5.4%)

## metadata 보유 파일 (16개)

| 페이지 경로 | 비고 |
|---|---|
| `/` | 메인 홈 |
| `/about/history` | 연혁 |
| `/ai-forum` | AI 포럼 목록 |
| `/ai-forum/[id]` | AI 포럼 상세 (generateMetadata) |
| `/gatherings/poll/[id]` | 일정 투표 (generateMetadata) |
| `/hackathon` | 해커톤 |
| `/activities/internal` | 내부 활동 목록 |
| `/consent` | 동의 안내 |
| `/privacy` | 개인정보처리방침 |
| `/terms` | 이용약관 |
| `/card-news` | 카드뉴스 목록 |
| `/card-news/[id]` | 카드뉴스 상세 (generateMetadata) |
| `/profile/[id]` | 회원 프로필 (generateMetadata) |
| `/console/card-news` | 콘솔 (공개X) |
| `/console/card-news/[seriesId]` | 콘솔 (공개X) |
| `/console/card-news/[seriesId]/edit` | 콘솔 (공개X) |

## SEO 영향 있는 주요 누락 공개 페이지

### High (검색 유입 가능성 높음)

| 페이지 경로 | 우선순위 | 비고 |
|---|---|---|
| `/about/fields` | High | 연구 분야 소개 — 학회 SEO 핵심 |
| `/activities/studies/[id]` | High | 스터디 상세 — 동적 OG 필요 |
| `/activities/projects/[id]` | High | 프로젝트 상세 — 동적 OG 필요 |
| `/activities/external/[id]` | High | 외부 활동 상세 |
| `/board/free` | High | 자유게시판 |
| `/board/promotion` | High | 홍보게시판 |
| `/board/resources` | High | 자료게시판 |

### Medium

| 페이지 경로 | 우선순위 | 비고 |
|---|---|---|
| `/board/staff` | Medium | 운영진 공지 |
| `/board/update` | Medium | 업데이트 공지 |
| `/directory/[id]` | Medium | 회원 디렉토리 상세 (generateMetadata 필요) |
| `/boards/[boardId]/wall` | Medium | 소통 보드 (공개 공유 가능) |
| `/boards/[boardId]/present` | Medium | 소통 보드 발표 뷰 |

### Low (로그인 필요 또는 SEO 불필요)

| 페이지 경로 | 이유 |
|---|---|
| `/login` | SEO 필요 없음 |
| `/activities/studies/[id]/weeks` | 로그인 필요 |
| `/activities/projects/[id]/weeks` | 로그인 필요 |
| `/steppingstone/thesis-defense/[id]/practice` | 로그인 필요 |
| `/seminars/[id]/lms` | 로그인 필요 |
| `/collab/new` | 로그인 필요 |
| `/mypage/**` | 로그인 필요 |

## 구현 권고

### 정적 metadata (단순 페이지)
```tsx
export const metadata: Metadata = {
  title: "연구 분야 | 연세교육공학회",
  description: "연세대학교 교육공학과 연구 분야 안내",
  openGraph: {
    title: "연구 분야 | 연세교육공학회",
    description: "연세대학교 교육공학과 연구 분야 안내",
    url: "https://yonsei-edtech.vercel.app/about/fields",
    siteName: "연세교육공학회",
  },
};
```

### 동적 generateMetadata (상세 페이지)
활동 상세·회원 디렉토리 상세는 Firestore 데이터를 서버에서 패치해
`generateMetadata` 함수로 동적 title/description/OG 이미지 생성.

## 결론

전체 299페이지 중 공개 SEO 유효 페이지 16개만 metadata 보유.
High 우선순위 7개 (about/fields + board 4개 + activities 상세 3개)를
v15 또는 별도 OG 스프린트에서 일괄 추가 권고.

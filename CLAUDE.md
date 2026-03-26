# 연세교육공학회 웹사이트 (yonsei-edtech)

## 프로젝트 정보
- **스택**: Next.js (App Router) + TypeScript + Firestore + Vercel
- **배포**: GitHub Actions → Vercel 자동 배포 (master push)
- **URL**: https://yonsei-edtech.vercel.app

## 배포 규칙 (필독)

### Vercel 배포 충돌 방지
- **GitHub Actions(`vercel deploy --prebuilt`)와 CLI 직접 배포(`npx vercel --prod`)가 충돌할 수 있음**
- `npx vercel --prod`로 직접 배포하면 해당 배포가 프로덕션 alias를 차지
- 이후 GitHub Actions 배포가 성공해도 **프로덕션 alias가 업데이트되지 않는** 문제 발생
- **해결 방법**: `git push` 후 `npx vercel --prod --force`로 직접 배포까지 수행
- **검증 방법**: 배포 후 반드시 `curl -s -o /dev/null -w "%{http_code}" {URL}` 로 새 라우트 접근 확인

### 배포 후 필수 검증
```bash
# 새 라우트 추가 시 반드시 HTTP 상태 코드 확인
curl -s -o /dev/null -w "%{http_code}" https://yonsei-edtech.vercel.app/{새_라우트}
# 200이 아니면 npx vercel --prod --force 재배포
```

## 작업 내역

### 2026-03-20: 커뮤니티/소식 메뉴 구조 개선 및 Post "newsletter" 카테고리 정리

**배경:**
- "소식" 그룹에 "공지사항" 1개만 존재하여 빈약
- Post의 `newsletter` 카테고리와 독립 학회보 시스템(NewsletterIssue)이 이중 구조
- 홈페이지 NewsletterPreview가 Post newsletter에서 데이터를 가져오면서 링크는 독립 학회보로 연결 → 불일치

**변경 내용:**

1. **메뉴 구조 재구성** (`src/components/layout/Header.tsx`)
   - 변경 전: `학회소개 | 구성원 | 학술활동 | 커뮤니티(게시판,학회보) | 소식(공지사항) | 문의`
   - 변경 후: `학회소개 | 구성원 | 학술활동 | 커뮤니티(공지사항,게시판,학회보) | 문의`
   - "소식" 그룹 제거, "커뮤니티"에 공지사항 추가

2. **Post `newsletter` 카테고리 제거**
   - `src/types/index.ts` — PostCategory 유니온에서 "newsletter" 제거
   - `src/features/board/CategoryTabs.tsx` — CATEGORIES 배열에서 제거
   - `src/features/board/PostForm.tsx` — ALL_CATEGORIES에서 제거, 권한 필터 정리
   - `src/features/board/PostList.tsx` — newsletter 색상 분기 제거, fallback 추가
   - `src/features/admin/AdminPostTab.tsx` — newsletter 배지 분기 제거, fallback 추가
   - `src/lib/ai-tools.ts` — z.enum()에서 "newsletter" 제거
   - `src/features/board/board-data.ts` — newsletter 목업 게시글 3개 제거

3. **NewsletterPreview 데이터 소스 전환** (`src/components/home/NewsletterPreview.tsx`)
   - `usePosts("newsletter")` → `useNewsletters()`로 변경
   - Firestore의 발행된 NewsletterIssue 표시
   - 빈 상태 처리 추가

4. **Dashboard newsletter 참조 전환** (`src/app/dashboard/page.tsx`)
   - `useNewsletterStore()` → `useNewsletters()`로 변경
   - Firestore 데이터 기반 학회보 카운트

**기존 데이터 처리:**
- DB에 `category: "newsletter"`로 저장된 기존 Post는 그대로 유지
- `CATEGORY_LABELS[post.category] ?? post.category` fallback으로 라벨 표시

**검증:**
- `npm run build` 통과 (TypeScript 에러 없음)
- 메뉴, 게시판, 홈페이지 학회보 미리보기, 대시보드 모두 정상 동작

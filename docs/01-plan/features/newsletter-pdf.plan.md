# Newsletter PDF + 매거진 뷰 (Plan)

## 목적
연세교육공학회보(`NewsletterIssue`)의 발행물을 **다운로드 가능한 PDF**로 만들고, 웹에서도 책 형태의 **매거진 뷰**로 읽을 수 있게 한다. 마스터 플랜의 단계 2(P0).

## 현재 상태 (재사용 가능)
- 데이터 모델: `src/features/newsletter/newsletter-store.ts` — `NewsletterIssue`, `NewsletterSection`, Firestore CRUD, React Query hooks
- 발행 목록: `src/app/newsletter/page.tsx`
- 발행 상세 뷰어: `src/app/newsletter/[id]/page.tsx` (표지·목차·섹션 본문)
- 편집기: `src/app/newsletter/edit/page.tsx` + `src/features/admin/AdminNewsletterTab.tsx`
- 이메일 발송: 기존 Resend 통합 (sendNewsletterEmail)

## 미구현 (이번 사이클 범위)
1. PDF 생성 (`@react-pdf/renderer`)
2. PDF 다운로드 라우트 + UI 버튼
3. 매거진 뷰 (좌우 페이지 넘김 + 모바일 단일 칼럼)
4. 콘솔 빌더 UX 보강 (섹션 미리보기 + 표지 색상 라이브 프리뷰) — 후순위

## 결정사항
| 항목 | 선택 | 사유 |
|---|---|---|
| PDF 엔진 | `@react-pdf/renderer` | 서버 의존성 최소, Vercel serverless 호환, Puppeteer/Chromium 불필요 |
| 한글 폰트 | Pretendard (TTF 임베드, 정적 파일 `public/fonts/`) | OFL 라이선스, 한글 누락 방지 |
| 출력 라우트 | `/api/newsletter/[id]/pdf` (Next.js Route Handler) | API 표준, `application/pdf` 반환 |
| 매거진 뷰 | `/newsletter/[id]/magazine` (별도 라우트) | 기존 상세 뷰는 보존, 토글 대신 명확한 이중 진입 |
| 모바일 매거진 | 단일 칼럼 + 스크롤 스냅 | 좌우 넘김은 PC/태블릿 한정 |

## 작업 순서
1. **deps 설치**: `npm i @react-pdf/renderer`
2. **폰트**: `public/fonts/Pretendard-Regular.ttf`, `Pretendard-Bold.ttf` 다운로드 (또는 NotoSansKR)
3. **NewsletterPdfDocument.tsx**: 표지(coverColor 그라디언트)·목차·섹션 본문 컴포넌트 (`@react-pdf/renderer` 의 `Document/Page/View/Text`)
4. **API route** `src/app/api/newsletter/[id]/pdf/route.ts`: GET → `renderToStream` → `Response(stream, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="newsletter-vol${n}.pdf"` } })`
5. **다운로드 버튼**: `src/app/newsletter/[id]/page.tsx` 표지 우측 상단에 `<a href="/api/newsletter/{id}/pdf" download>` 버튼 추가
6. **매거진 뷰**: `src/app/newsletter/[id]/magazine/page.tsx` 신규
   - PC/태블릿: 좌우 2면 페이지 (CSS Grid 2 cols + 페이지 넘김 버튼)
   - 모바일: 단일 칼럼 + 섹션 인덱스 sticky
   - 좌측 사이드바: 섹션 인덱스 + 진행 표시
7. **상세 뷰 진입점**: `/newsletter/[id]` 에서 "📖 매거진으로 보기" 버튼 추가

## 핵심 파일
| 신규/수정 | 경로 | 역할 |
|---|---|---|
| 신규 | `src/features/newsletter/NewsletterPdfDocument.tsx` | @react-pdf/renderer Document |
| 신규 | `src/app/api/newsletter/[id]/pdf/route.ts` | PDF 다운로드 API |
| 신규 | `src/app/newsletter/[id]/magazine/page.tsx` | 매거진 뷰 |
| 신규 | `public/fonts/Pretendard-Regular.ttf` 등 | 한글 폰트 |
| 수정 | `src/app/newsletter/[id]/page.tsx` | PDF/매거진 진입 버튼 |
| 수정 | `package.json` | @react-pdf/renderer 추가 |

## 검증
- [ ] `npm run build` 통과
- [ ] `/api/newsletter/{id}/pdf` 호출 → PDF 다운로드 (한글 깨짐 X)
- [ ] PDF 표지에 issueNumber·title·subtitle·coverColor 반영
- [ ] PDF 목차에 섹션 7개 모두 페이지 번호 동반
- [ ] PDF 섹션 본문에 작성자명·유형 배지(텍스트로) 표시
- [ ] `/newsletter/{id}/magazine` PC에서 2면 좌우 넘김 동작
- [ ] 모바일에서 단일 칼럼 + sticky 인덱스 동작
- [ ] 기존 `/newsletter/{id}` 뷰어 회귀 없음
- [ ] Lighthouse 성능 모바일 ≥ 80

## 비범위 (분리)
- 포스터/썸네일 자동 생성 (AI 이미지)
- 관리자 콘솔 빌더 UX 고도화 (섹션 라이브 미리보기, 색상 피커)
- PDF 워터마크 / 비공개 호 인증
- ePub 출력

# 전자책(전자 콘텐츠) 기능 분석 — hands-on-workshop 참고 (2026-07-23)

> 목적: 참고 사이트(https://hands-on-workshop.vercel.app)의 **전자 콘텐츠 전달 기능**을 분석해
> 연세교육공학회 플랫폼에 구현할 전자책 기능을 설계한다. (콘텐츠 주제가 아니라 기능 메커니즘 중심)

---

## 1. 참고 사이트의 전자책 기능 요약 (기능만)

| 기능 축 | 참고 사이트 구현 | 평가 |
|---|---|---|
| **구조** | 책 → 4섹션 → 33장(슬라이드) 계층. 선형 진행 | 챕터/페이지 계층 + 순서가 핵심 |
| **내비게이션** | ←→ 이전/다음, O 전체 목차 패널, M 탐색, 앵커 딥링크(#welcome) | 키보드 우선·목차 패널·딥링크 3종이 뼈대 |
| **진행 표시** | 하단 "1 / 33 장표" | 위치 표시만(개인 진행 저장 없음) |
| **읽기 모드** | D 다크모드, F 전체화면 | 몰입 읽기 지원 |
| **콘텐츠 블록** | 텍스트·리스트·외부 임베드(구글시트)·별도 install 페이지 | 블록 조합형 |
| **접근 제어** | 비밀번호 잠금 → 강의 당일 공개(점진적 공개) | 날짜/조건부 공개 |
| **약점** | 진행 추적·북마크·검색 **없음**, 데스크톱 프레젠테이션 중심 | ← 우리가 차별화할 지점 |

**핵심 통찰**: 참고 사이트는 "발표 슬라이드를 웹으로 옮긴 뷰어"에 가깝다. 우리는 **로그인 기반 플랫폼**이라 진행 추적·북마크·이어읽기·잔디 연동 등으로 "진짜 전자책 학습 경험"으로 넘어설 수 있다.

---

## 2. 데이터 모델 (신규 컬렉션 — Firestore)

```
ebooks (전자책)
  { id, title, slug, subtitle, coverEmoji?, coverImage?, authorId, authorName,
    category, description, tags[],
    visibility: "public" | "member" | "staff",      // 공개 범위
    status: "draft" | "published",
    publishAt?,                                       // 예약 공개(점진적 공개 대응)
    chapterOrder: string[],                           // chapter id 순서
    createdAt, updatedAt }

ebook_chapters (챕터)
  { id, ebookId, title, order, pageOrder: string[] }

ebook_pages (페이지 — 실제 콘텐츠 단위)
  { id, ebookId, chapterId, title, order,
    blocks: Block[],                                  // 콘텐츠 블록 배열(JSON)
    anchor,                                           // 딥링크용 slug(#anchor)
    lockUntil?,                                        // 페이지 단위 점진적 공개(선택)
    createdAt, updatedAt }

ebook_progress (개인 진행 — 로그인 강점)
  { id: `${userId}_${ebookId}`, userId, ebookId,
    lastPageId, readPageIds: string[],                // 읽은 페이지 집합
    bookmarks: { pageId, note? }[],
    updatedAt }
```

**Block 타입**(page.blocks — 참고 사이트의 블록 조합을 확장):
`heading` · `paragraph`(마크다운 인라인) · `list` · `code`(언어 지정·복사 버튼) · `image`(캡션) · `callout`(info/warning/tip) · `quote` · `divider` · `embed`(유튜브/PDF/구글시트 — CSP 허용 화이트리스트) · `quiz`(선택형·즉시 피드백 — 우리 진단/암기카드 자산 재사용).

> **신규 컬렉션 4개**는 기능 성격상 정당. 단, 콘텐츠가 크면 pages를 분리 저장(위 구조)해 문서 크기 상한 회피.

---

## 3. 표면 설계

### 3-1. 독자 경험 (회원)
- **서재 `/library`(또는 /ebooks)**: 카테고리·태그 필터, 표지 카드, 진행률 배지("3/12장"), "이어읽기" 강조.
- **뷰어 `/ebooks/[slug]`**: 좌측 **목차 사이드바**(챕터→페이지 트리, 읽은 페이지 체크), 본문(블록 렌더), 하단 **이전/다음 + 진행바("N/M")**.
  - **키보드 단축키**: ←→ 이동, T 목차 토글, B 북마크, D 다크, F 전체화면 (참고 사이트 차용·확장). 힌트 툴팁(기존 커맨드팔레트/단축키 패턴 재사용).
  - **딥링크**: `/ebooks/[slug]/[chapter]/[page]` 또는 `?p=anchor` — 참고 사이트의 `#welcome`처럼 특정 페이지 공유.
  - **이어읽기**: 진입 시 ebook_progress.lastPageId로 자동 이동(로그인 강점).
  - **북마크·읽음 표시**: 페이지 읽으면 readPageIds 적립, 별표 북마크. → 서재 진행률·잔디 연동 가능.
  - **인앱 검색**: 책 내 텍스트 검색(블록 텍스트 인덱싱) — 참고 사이트에 없던 개선.
- **읽기 편의**: 폰트 크기·다크모드(전역 토큰 재사용), reduced-motion(기존 가드), 모바일 반응형(목차는 바텀시트).

### 3-2. 저자/운영 경험 (staff)
- **콘솔 › 콘텐츠 › 전자책**: 책 CRUD, 챕터/페이지 순서 편집(드래그 대신 순서 버튼), **블록 에디터**(블록 추가/삭제/이동, 마크다운 입력), 미리보기, 공개 설정(범위·예약 발행).
- **점진적 공개**: publishAt/페이지 lockUntil로 "강의 당일 공개" 재현.

---

## 4. 기존 자산 재사용 (신규 최소화)

| 필요 | 재사용 자산 |
|---|---|
| PDF 임베드 블록 | 이미 vendoring된 pdfjs(세미나 라이브 장표) |
| 다크모드·시맨틱 토큰·reduced-motion | globals.css 전역 가드 |
| 마크다운 인라인(**볼드**) | 해커톤/업무노트에서 쓰던 최소 파서 |
| 회원 게이트·staff 게이트 | AuthGuard·isStaffOrAbove |
| 이미지 내보내기/카드 렌더 | 카드뉴스·축하카드 html2canvas 패턴 |
| quiz 블록 | 진단평가·암기카드(SM-2) 채점 로직 |
| 진행 추적→잔디 | 학습 잔디(HabitTracker) 집계에 "전자책 읽기" 신호 추가 |
| CSV/감사 | 기존 escape·logAudit |

---

## 5. 참고 사이트 대비 차별화 포인트 (우리 강점)

1. **개인 진행·이어읽기·북마크** — 참고 사이트엔 없음(로그인 플랫폼의 이점).
2. **책 내 전문 검색** — 참고 사이트엔 없음.
3. **quiz 블록으로 능동 학습** — 진단/암기카드 자산 접목.
4. **잔디·포트폴리오 연동** — 읽기가 학습 기록·성장 서사로 축적.
5. **수요 조사·세미나·아카이브와 교차링크** — 세미나 자료를 전자책으로, 아카이브 개념을 책 페이지로.

---

## 6. 단계별 구현 로드맵 (제안)

- **MVP(1차)**: ebooks/chapters/pages 모델 + 뷰어(목차·이전/다음·진행바·딥링크·다크) + 블록 5종(heading·paragraph·list·code·image) + staff 에디터(기본) + 서재 목록. 개인 진행(readPageIds·lastPageId) 포함.
- **2차**: 북마크·인앱 검색·키보드 단축키 풀셋·callout/quote/embed 블록·모바일 목차 바텀시트.
- **3차**: quiz 블록·잔디/포트폴리오 연동·점진적 공개(publishAt/lockUntil)·세미나/아카이브 교차링크.

---

## 7. 열린 결정 사항 (사용자 확인 필요)

1. **저자 범위**: 전자책 작성을 staff만? 아니면 특정 회원(집필진)도 허용?
2. **콘텐츠 형식**: 블록 에디터 자체 구축 vs 마크다운 원문 입력(경량) — MVP는 마크다운 권장.
3. **PDF 업로드 대체 여부**: 기존 자료(PDF)를 전자책으로 임베드만? 아니면 네이티브 페이지로 재편집?
4. **명칭**: "전자책 / 서재 / 라이브러리 / 러닝 가이드" 중 브랜드 톤.

*작성: 메인 오케스트레이터 · 구현 착수 전 분석 단계 · 신규 컬렉션 4개(ebooks/chapters/pages/progress) 전제*

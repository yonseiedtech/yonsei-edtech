# M6 선행 감사 — OG·메타·alt 커버리지 실측 (v10 · 2026-07-21)

> 읽기 전용 감사 — 코드 무수정. 근거: 코드 grep(`src/app` metadata/generateMetadata 전수) + LIVE HTML curl 대조(2026-07-21, https://yonsei-edtech.vercel.app 33개 라우트 실측).
> 형식: [라우트/파일 → 문제 → 우선순위 → 정정안]

---

## 0. 요약

| 구분 | 실측 결과 |
|---|---|
| 전역 구조 결함 | **3건** (canonical 홈 고정 · og:title/desc 루트 고정 · 타이틀 이중 접미사) |
| 메타 누락(루트 기본값 방치) 라우트 | **18개** LIVE 확인 (핵심 공개 라우트 /archive 포함) |
| og:image | 루트 동적 OG **정상**(1200×630 실측) · 상세 4종 라우트별 동적 OG 코드 존재 |
| img alt | **완전 누락 0** · 의미 이미지에 빈/무의미 alt **후보 4건** |

---

## 1. 전역(사이트 와이드) 구조 결함 — 최우선

### G1. 전 라우트 canonical = 홈페이지 고정 (P0)
- **파일**: `src/app/layout.tsx:115-117` — `alternates: { canonical: SITE_URL }`
- **문제**: 루트 레이아웃의 `alternates.canonical`이 절대 URL(`https://yonsei-edtech.vercel.app`)로 고정돼 **모든 하위 라우트에 상속**됨. LIVE 실측: `/seminars`·`/archive`·`/about` 등 전 라우트에서 `<link rel="canonical" href="https://yonsei-edtech.vercel.app"/>` 확인. 검색엔진에 "모든 페이지의 정본 = 홈"이라고 선언하는 셈 → 서브페이지 색인·검색 노출 저해(사실상 사이트 전체 SEO 무력화 수준).
- **정정안**: 루트 레이아웃에서 `alternates.canonical` 제거(또는 `canonical: "./"` 상대 경로로 변경해 라우트별 자동 해석 — Next 15+ 지원). 상세 페이지는 generateMetadata에서 자체 canonical 지정.

### G2. og:title / og:description / og:url 이 전 라우트에서 루트 기본값 (P1)
- **파일**: 정적 metadata를 가진 모든 라우트 레이아웃(`about`·`seminars`·`newsletter`·`research`·`activities`·`board`·`courses`·`members`·`notices`·`calendar`·`steppingstone`·`alumni/thesis` 등)과 `hackathon/page.tsx` — `title`·`description`만 설정하고 `openGraph`를 지정하지 않음.
- **문제**: Next는 `title`/`description`을 openGraph로 자동 승계하지 않음. LIVE 실측: `/hackathon`은 `<title>`은 해커톤인데 `og:title`은 사이트 기본 문구, `og:description`도 기본값, `og:url`은 항상 홈. **카톡/슬랙 공유 시 어떤 페이지를 공유해도 동일한 홈 카드**로 보임(해커톤 홍보 공유 시 치명적 — D-33).
- **정정안**: 공유 가치가 있는 공개 라우트(hackathon·seminars·newsletter·archive·research·about·card-news·ai-forum 최소 8종)에 `openGraph: { title, description, url }` 병기. 공통 헬퍼(예: `buildMetadata(title, desc, path)`) 도입 시 중복 제거 + 재발 방지.

### G3. 타이틀 이중 접미사 — "… | 연세교육공학회 | 연세교육공학회" (P2)
- **문제**: 루트 template(`"%s | 연세교육공학회"`)이 있는데 개별 title에 접미사를 또 포함. LIVE 실측 확인:
  - `/seminars` → "세미나 | 연세교육공학회 | 연세교육공학회" (`seminars/layout.tsx:5`)
  - `/dashboard` → "대시보드 | 연세교육공학회 | 연세교육공학회" (`dashboard/layout.tsx:4`)
  - `/hackathon` → "… 에듀테크 해커톤 — 연세교육공학회 | 연세교육공학회" (`hackathon/page.tsx`)
  - `/card-news` → "카드뉴스 — 연세교육공학회 | 연세교육공학회" (`card-news/page.tsx`)
  - `/ai-forum` → "AI 포럼 — 연세교육공학회 | 연세교육공학회" (`ai-forum/page.tsx`)
- **정정안**: 개별 title에서 "| 연세교육공학회"·"— 연세교육공학회" 접미사 제거(template가 붙여줌). 검색결과·탭 표기 품질 개선.

---

## 2. 메타 누락 라우트 — 루트 기본값 방치 (LIVE 확인 18개)

아래 라우트는 metadata export가 전무해 **title·description 모두 사이트 기본 문구**로 노출됨(LIVE curl로 전수 확인). 클라이언트 컴포넌트 page인 경우 layout.tsx 신설로 해결.

| # | 라우트 | 성격 | 우선순위 | 정정안(title 제안) |
|---|---|---|---|---|
| 1 | **/archive** | 핵심 공개 허브(아카이브) | **P0** | "교육공학 아카이브" + 설명 + openGraph. `archive/layout.tsx` 신설(하위 [type] 리스트에도 상속) |
| 2 | /gatherings | 공개(모임·일정투표) | P1 | "모임·일정 조율" |
| 3 | /network | 공개(협업 그래프) | P1 | "협업 네트워크" (M5 명명 문서화와 연계) |
| 4 | /mentoring | 공개 진입 | P1 | "멘토링" |
| 5 | /diagnosis | 공개 진입(진단평가) | P1 | "연구 준비도 진단" |
| 6 | /whats-new | 공개(새 소식) | P1 | "새로운 소식" |
| 7 | /alumni | 공개(졸업생 허브 — 하위 /alumni/thesis만 메타 있음) | P1 | "졸업생" |
| 8 | /labs | 공개 리스트( [id]만 메타 있음) | P1 | "실험실" |
| 9 | /leaderboard | 공개 | P2 | "리더보드" |
| 10 | /flashcards | 회원 기능(HTML 메타는 공개 노출) | P2 | "암기카드" |
| 11 | /help | 공개 | P2 | "도움말" |
| 12 | /journal | 회원 기능 | P2 | "연구 저널" |
| 13 | /gallery | 공개 | P2 | "갤러리" |
| 14 | /contact | 공개 | P2 | "문의" |
| 15 | /directory | 회원 디렉토리( [id]는 profile 메타 존재) | P2 | "회원 디렉토리" |
| 16 | /progress-meetings | 리스트( [id]만 메타 있음) | P2 | "진행상황 회의" |
| 17 | /collab | 회원 기능 | P3 | "공동연구" |
| 18 | /boards | 보조 표면 | P3 | "보드" (또는 /board로 통합 검토 — M5 연계) |

- 참고: 게이트형(마이페이지·콘솔·admin)은 대상 제외(색인 가치 낮음, robots noindex가 오히려 적절 — 별도 후속).
- 참고: `/r`(트래킹 리다이렉트)·`/offline`(PWA)은 메타 불요.

## 3. 설명(description) 중복·품질

- `board/layout.tsx` 하위 5개 서브보드(free·promotion·staff·resources·update)가 모두 동일 "게시판" 메타 상속 → 서브보드별 구분 없음. **P3** — 서브보드 layout 또는 page별 title 지정.
- `steppingstone/layout.tsx` 하위 전체(thesis-defense 등)가 "인지디딤판" 단일 메타 상속. **P3**.
- 상세 라우트 fallback 문구( "연세교육공학회 게시글" 등)는 정상 동작 — 문제 없음.

---

## 4. og:image 커버리지

| 항목 | 실측 | 판정 |
|---|---|---|
| 루트 `src/app/opengraph-image.tsx` | LIVE에서 `og:image` 1200×630 + `og:image:alt` 출력 확인 | **정상** — 전 라우트 폴백으로 상속됨 |
| `seminars/[id]/opengraph-image.tsx` | 코드 존재(동적) | 정상 추정 — 실 ID 공유 시 스모크 1회 권장 |
| `archive/[type]/[id]/opengraph-image.tsx` | 코드 존재(동적) | 〃 |
| `alumni/thesis/[id]/opengraph-image.tsx` | 코드 존재(동적) | 〃 |
| `card-news/[id]/opengraph-image.tsx` | 코드 존재(동적) | 〃 |
| 그 외 라우트 | 루트 OG 이미지 폴백 | 허용 — 단 G2(og:title 고정)와 결합돼 "이미지도 제목도 전부 동일 카드"가 현재 상태. G2 정정이 선행 과제 |

- 해상도 규격 위반 없음. 정적 1200×630 파일 부재는 문제 아님(동적 생성이 정본).

---

## 5. img alt 감사

전수 grep 결과: 원시 `<img>` 24곳(19파일)·`next/image` 사용 18파일 — **alt 속성 자체가 없는 곳 0**. 장식 이미지 `alt=""` 관행(엠블럼 워터마크·프리로드·트래킹 픽셀·명찰/증서 장식)은 정상 처리로 분류. 문제 후보는 "의미 있는 이미지에 빈/무의미 alt" 4건:

| # | 파일:라인 | 문제 | 우선순위 | 정정안 |
|---|---|---|---|---|
| 1 | `src/features/board/InterviewResponses.tsx:303` | 인터뷰 답변 첨부사진이 `<a>` 링크 안에 `alt=""` — **링크에 접근 가능한 이름이 없음**(스크린리더가 빈 링크로 읽음) | **P1** | `alt={"첨부 사진 " + (i+1)}` 등 의미 있는 alt 부여(또는 aria-label을 a에) |
| 2 | `src/features/board/InterviewPlayer.tsx:809` | 답변 작성 중 첨부사진 미리보기 `alt=""` — 사용자 콘텐츠 이미지인데 무명 | P2 | `alt={"첨부 사진 " + (i+1)}` |
| 3 | `src/features/admin/AdminSeminarTab.tsx:357, 400` | 세미나 포스터 썸네일 `alt=""` — 옆에 제목 텍스트가 있어 장식 처리로 볼 여지도 있으나, 포스터는 의미 이미지 | P3(콘솔 한정) | `alt={s.title + " 포스터"}` 또는 장식 유지 판단 명시 |
| 4 | `src/features/card/ReceivedCardsSection.tsx:136` | 받은 명함 사진 미리보기 `alt="명함 사진"` — 무의미(누구 명함인지 없음). 292행은 `alt={card.name}`로 정상 | P3 | 폼 미리보기이므로 `alt="명함 사진 미리보기"` 수준으로 허용 또는 이름 병기 |

- 정상 확인(조치 불요): `SlideViewer.tsx:56`(프리로드, aria-hidden)·`weekly-digest/route.ts:909`(트래킹 픽셀)·`speaker-review/page.tsx:133`(워터마크)·`NametagGenerator`/`review`/`speaker-review` 엠블럼 장식 alt=""·`BusinessCardPrintPdfDocument`(react-pdf, alt 개념 없음)·마크다운 렌더 파이프라인(`PostForm.tsx:227`·`board/[id]/page.tsx:54` — 작성자 alt 승계 구조 정상).

---

## 6. M6 실행 시 권장 순서 (정정은 후속 — 본 문서는 감사만)

1. **G1 canonical 제거/상대화** (1줄, 전역 효과 최대) → 2. **G2 공유 핵심 8라우트 openGraph 병기**(해커톤 D-33 최우선) → 3. **§2 P0~P1 라우트 메타 신설**(archive 최우선, layout.tsx 신설 패턴) → 4. **G3 이중 접미사 5건 제거** → 5. **§5 alt 후보 4건 정정** → 6. P2~P3 잔여. 전 항목 표현 계층 한정·로직 무변경 — 1커밋 일괄 배포 가능 규모.

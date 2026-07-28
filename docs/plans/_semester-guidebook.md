# 학기별 온보딩 가이드북 — 인지디딤판 로드맵 확장 설계

> 작성일: 2026-07-29
> 요청: "인지디딤판 기준 학기별 로드맵 분석 → 필요 시 통합/연동 + 러닝가이드처럼 학기별 온보딩 가이드북 별도 페이지"

## 1. 현황 분석

- **메뉴 통합 상태**: `/steppingstone`(인지디딤판)이 이미 "학기별 로드맵"을 포함하는 단일 허브.
  - Header 섹션 "🌱 필수 — 학기별 로드맵" → 링크 "인지디딤판"(`/steppingstone`)
  - command-palette `r:steppingstone` label "인지디딤판" sub "학기별 로드맵"
  - BottomNav 첫 탭 "디딤판" → `/steppingstone`
  - → **중복 메뉴 없음. 별도 통합 불필요.**
- **구성**: 허브 = 4 트랙(온보딩·재학생·학술대회·졸업) + 셀프도구(프로그램설계) + `SemesterRoadmap`(학기 카드).
- **로드맵 데이터**: `roadmap_stages` (order·matchSemester·title·shortTag·items[]·colorPreset·isAlumni·bloomStage·published). CMS = `console/roadmap`. 정적 fallback 6단계.
- **부재**: 학기별 카드에 **깊이 있는 본문(내러티브 가이드북)** 이 없음. 체크리스트뿐.

## 2. 결정: roadmap_stages 확장 (신규 컬렉션·러닝가이드 복제 대신)

"러닝가이드처럼"은 **포맷**(리치 가이드북 페이지)을 의미. 학기별 온보딩은 이미 로드맵이 학기 구조·체크리스트·Bloom·CMS를 갖추고 있으므로, **별도 러닝가이드/컬렉션을 만들면 체크리스트·Bloom·매칭이 이원화**된다.
→ `RoadmapStage`에 **하위호환 옵셔널 리치 필드**를 추가하고, 각 학기를 가이드북 페이지로 렌더. 렌더러는 **방금 무한루프 수정한 `SimpleMarkdown`** 재사용.

### 타입 확장 (`types/steppingstone.ts` — 모두 옵셔널, 무회귀)
```ts
interface RoadmapStage {
  // ...기존...
  slug?: string;                         // 안정 URL (미지정 시 semester 번호 사용)
  overview?: string;                     // 가이드북 도입부 (markdown)
  sections?: { heading: string; body: string }[];  // 가이드북 챕터 (markdown)
  resources?: { label: string; href: string; kind?: "internal" | "external" | "download" }[];
}
```

## 3. 신규 라우트 `/steppingstone/semester/[semester]`

러닝가이드 리더 형태의 학기 가이드북 페이지:
- **Hero**: 학기 title·shortTag·Bloom 인지단계 배지·"내 학기" 강조(로그인 시 matchSemester 매칭).
- **개요**: `overview` → SimpleMarkdown.
- **가이드북 챕터**: `sections[]` → 좌측/상단 목차(TOC) + SimpleMarkdown 본문(러닝가이드 감성).
- **완전 학습 체크리스트**: 기존 `items[]` Mastery 체크리스트 재사용(localStorage 진행 — `mastery-progress.ts`).
- **자료·바로가기**: `resources[]` + 학기 맥락 교차링크(온보딩/학술대회/디펜스 트랙, 아카이브 개념, 활동).
- **이전/다음 학기 내비**: 로드맵 순서대로.
- 콘텐츠 없으면(옵셔널 미설정) 체크리스트만 + "가이드북 준비 중" 안내(graceful).

## 4. 연동(링크)

- `SemesterRoadmap` 각 카드에 **"가이드북 열기 →"** CTA → `/steppingstone/semester/{matchSemester}`.
- 허브 인트로에 "학기 카드를 열면 온보딩 가이드북으로 이어집니다" 안내.
- 카드의 matchSemester 기준으로 라우팅(동문=alumni 스테이지의 matchSemester).

## 5. CMS (`console/roadmap`)

StageEditor에 리치 필드 편집 추가:
- `overview` textarea(markdown), `sections[]` 반복 편집(heading + body textarea, 순서 이동), `resources[]` 반복 편집(label/href/kind).
- 기존 save(update/create)에 새 필드 포함. 하위호환(미입력 시 undefined).

## 6. 초기 콘텐츠(시드)

- 최소 **1학기차(온보딩) 가이드북 초안**을 seed로 제공(기존 온보딩 트랙·신입생 시퀀스 내용 재구성). 나머지 학기는 운영진이 CMS로 점진 작성(외부 의존: 콘텐츠 발행은 운영진 몫).

## 7. 규율

- 하위호환: 신규 필드 전부 옵셔널. 기존 stage·fallback 무손실.
- Date 순수성·시맨틱 토큰·SimpleMarkdown(무한루프 수정본) 재사용.
- 게이트: tsc + eslint(변경 파일) + rawcolor 래칫 + warning 래칫 + build.

## 8. 변경 파일(예정)

| 파일 | 변경 |
|------|------|
| `types/steppingstone.ts` | RoadmapStage 옵셔널 리치 필드 |
| `app/steppingstone/semester/[semester]/page.tsx` | 신규 학기 가이드북 페이지 |
| `features/steppingstone/SemesterRoadmap.tsx` | 카드 "가이드북 열기" CTA |
| `app/console/roadmap/page.tsx` | CMS 리치 필드 편집 |
| `app/api/admin/roadmap/seed/route.ts` | 1학기 가이드북 초안 시드(옵션) |
| `components/layout/command-routes.ts` | (선택) 학기 가이드북 딥링크 |

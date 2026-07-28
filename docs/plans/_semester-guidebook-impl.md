# 학기별 온보딩 가이드북 — 구현 결과

> 구현일: 2026-07-29
> 설계 문서: `_semester-guidebook.md` (그대로 반영)

## 변경 파일

| 파일 | 변경 |
|------|------|
| `src/types/steppingstone.ts` | `RoadmapStage` 에 옵셔널 리치 필드 `slug` / `overview` / `sections[]` / `resources[]` 추가 (모두 옵셔널, 하위호환 — 기존 소비처 무변경) |
| `src/features/steppingstone/SemesterRoadmap.tsx` | `RoadmapItem` 타입 · `STATIC_FALLBACK` 를 `export` (신규 라우트 재사용). 각 StageCard 하단에 **"가이드북 열기 →"** CTA(`/steppingstone/semester/{semester}`, aria-label 포함) 추가. 기존 체크리스트/레이아웃 무회귀 |
| `src/app/steppingstone/semester/[semester]/page.tsx` | **신규** 학기 가이드북 리더 페이지 (client) |
| `src/app/console/roadmap/page.tsx` | CMS StageEditor 에 overview(textarea) · sections(heading+body 반복·순서이동·삭제·추가) · resources(label/href/kind select·삭제·추가) 편집 UI + save/create payload 반영 (`richPayload` — 빈값은 undefined 로 하위호환) |
| `src/app/api/admin/roadmap/seed/route.ts` | 1학기차(온보딩) stage 에 overview + 3챕터(합격 직후 준비 / OT·수강신청 / 학회 가입·네트워크) + resources 초안 시드. 나머지 학기는 기존대로. idempotent skip 로직 유지 |

## 신규 라우트 구성 (`/steppingstone/semester/[semester]`)

- `useParams()` → semester(number). `roadmapStagesApi.listPublished()` 로드 후 `matchSemester === semester` 매칭(없으면 `slug` 매칭). Firestore 비어있으면 `STATIC_FALLBACK` 재사용.
- 매칭 stage 없으면 `notFound` 대신 "해당 학기 가이드북이 아직 없습니다" 안내 + 로드맵 복귀 링크 (로딩 중과 구분).
- 렌더: Hero(shortTag 배지·Bloom 인지단계 배지·"내 학기" 강조) → 개요(SimpleMarkdown) → 가이드북 챕터(2개↑일 때 앵커 목차 + 각 챕터 h2 + SimpleMarkdown, 없으면 "본문 준비 중" 안내) → 완전 학습 체크리스트(mastery-progress, stage.order 키, 로그인만 체크·비로그인 disabled, SSR-safe) → 자료·바로가기(resources kind별 아이콘·외부링크 처리 + 학기 맥락 교차링크) → 이전/다음 학기 내비(order 정렬).
- **진행률 동기화**: 체크리스트가 `mastery-progress`(stage.order 키)를 재사용하므로 SemesterRoadmap 카드와 localStorage 진행률이 공유됨.
- **Date 순수성**: `getEffectiveSemesterCount`(default `new Date()`) 호출을 `useMemo` 로 고정, 렌더 경로에 직접 Date 없음.

## 핵심 결정

- **신규 컬렉션/러닝가이드 복제 대신 `roadmap_stages` 확장** (설계 §2) — 체크리스트·Bloom·본인 학기 매칭·CMS 이원화 방지.
- **SimpleMarkdown 재사용** (무한루프 수정본, 수정 금지) — overview·챕터 본문 렌더.
- **StageCard 재사용 대신 동등 체크리스트 구현** — 리더 페이지는 카드형이 아니라 전폭 섹션이 적합. 저장 로직(getItemChecked/setItemChecked)은 그대로 재사용해 진행률 일관성 유지.
- **앵커 id 는 index 기반**(`guide-sec-{i}`) — 한글 heading 앵커 인코딩 이슈 회피, 안정적 스크롤.
- **eslint `react-hooks/set-state-in-effect`**: 두 곳(신규 페이지·SemesterRoadmap)의 localStorage 하이드레이션(서버 false → 마운트 후 1회 반영)은 하이드레이션 불일치 회피 목적의 의도된 setState 이므로 justification 주석과 함께 `eslint-disable-next-line` 로 억제(0 warning 게이트 충족). SemesterRoadmap 것은 본 작업 이전부터 있던 동일 패턴.

## 검증 결과

- `npx tsc --noEmit` → **exit 0** (0 errors)
- `npx eslint <변경 파일 5종>` → **exit 0** (0 errors / 0 warnings)
- `next build` 미실행 (지시 — .next lock 충돌 방지)

## 후속 (범위 밖)

- 2~5학기·졸업 학기 가이드북 콘텐츠 발행 — 운영진이 `console/roadmap` CMS 에서 점진 작성 (외부 의존: 콘텐츠).
- 배포 후 콘솔에서 시드 재실행 시 이미 등록된 1학기 stage 는 idempotent skip 되므로, 기존 stage 에 리치 필드를 채우려면 CMS 편집 또는 stage 재생성 필요.

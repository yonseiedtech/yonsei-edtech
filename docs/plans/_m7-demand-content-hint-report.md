# M7 수요 상위 주제 → 콘텐츠 전환 힌트 구현 보고서

## 구현 범위

- **수정 파일**: `src/app/console/demand/page.tsx` 단일 파일만 변경
- **신규 DB 조회 없음**: 기존 `questions` 쿼리 재사용

## 변경 내용

### 1. 추가 import
- `Link` (next/link) — 액션 링크용
- `Lightbulb`, `BookOpen`, `PlusCircle` (lucide-react) — 아이콘

### 2. `topSeminarDemands` useMemo 추가
- `questions`에서 `presenter === "세미나 희망"` 필터
- `likeCount` 내림차순 정렬 후 상위 5개 슬라이스
- 0건이면 빈 배열 반환 → 패널 자동 숨김

### 3. "세미나 수요 상위 주제" 패널 추가
- **위치**: 스터디 개설 퍼널 다음, 개설 후 전환 집계 바로 위
- 각 항목: 순위 배지 · 주제(body) · 공감수(likeCount)
- 액션 링크 2개:
  - **러닝 가이드 초안 만들기** → `/console/learning-guides?draftTitle=<주제(URL 인코딩)>`
  - **세미나 개설 검토** → `/console/academic/seminars/create`

## 실제 세미나 개설 경로

`/console/academic/seminars/create`
(`src/app/console/academic/seminars/create/page.tsx` 존재 확인)

## 검증 결과

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | PASS (0 errors) |
| `npx eslint src/app/console/demand/page.tsx` | PASS (0 warnings/errors) |
| `node scripts/check-rawcolor-ratchet.mjs` | PASS (1개 / 상한 1개, 변동 없음) |

## 제약 준수

- 기존 요약·퍼널·전환·CSV·목록 로직 무변경(순수 추가)
- 브랜드 시맨틱 토큰만 사용(`text-primary`, `bg-muted`, `text-muted-foreground` 등)
- raw 팔레트 색상 미사용
- ESLint warning ratchet CEILING=263 유지
- 커밋/배포 없음 (메인 배포 대기)

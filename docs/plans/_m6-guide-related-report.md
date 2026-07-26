# M6 러닝 가이드 ↔ 관련 스터디/개념 상호참조 구현 보고서

## 수정/신규 파일

| 파일 | 변경 |
|---|---|
| `src/features/learning-guides/GuideRelated.tsx` | 신규 생성 |
| `src/app/learning-guides/[slug]/page.tsx` | import 1줄 + JSX 3줄 삽입 |

## 매칭 로직

### 아카이브 개념 (archiveConceptsApi.list → archive_concepts, 최대 4개)

조건 (OR 매칭):
1. `concept.name` (정규화) ∈ guide.tags (정규화 Set)
2. `concept.altNames` 중 하나가 guide.tags에 포함
3. `concept.tags` ∩ guide.tags ≠ ∅ (hasIntersection 헬퍼)

링크 경로: `/archive/concept/${concept.id}`

### 개설 스터디 (activitiesApi.list("study") → activities type=study, 최대 3개)

조건 (OR 매칭):
1. `activity.tags` ∩ guide.tags ≠ ∅
2. guide.tags의 키워드(≥2자)가 activity.title에 포함

링크 경로: `/activities/studies/${activity.id}`

## 사용한 실제 조회 API

- `archiveConceptsApi.list()` — `src/lib/bkend.ts:2590` — `archive_concepts` 컬렉션, limit 500, 읽기 전용
- `activitiesApi.list("study")` — `src/lib/bkend.ts:790` — `activities` 컬렉션, type=study 필터, 클라이언트 정렬

## 삽입 위치

`src/app/learning-guides/[slug]/page.tsx` — `</main>` 직전, 완료 CTA 블록 아래.  
`guide.tags.length > 0` 조건으로 태그 없는 가이드에서는 렌더 자체를 건너뜀.  
GuideRelated 내부에서 매칭 0건이면 섹션 전체 숨김 (빈 상태 안전).

## 제약 준수

- DB/rules/bkend.ts/api.ts 무변경
- raw palette색 0개 (시맨틱 토큰만 사용: `text-primary`, `bg-primary/5`, `text-muted-foreground`, `bg-secondary/5` 등)
- 다크모드: Tailwind 시맨틱 토큰이 자동 대응
- `src/features/learning-guides/api.ts` 미변경

## 검증 결과

```
npx tsc --noEmit         → 오류 0건
npx eslint <파일들>       → 경고/오류 0건
check-rawcolor-ratchet   → PASS (1개 / 상한 1개 — 변동 없음)
```

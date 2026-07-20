# Empty State Round 3 — M1 v13 완결 보고서

작성일: 2026-07-21  
근거 계획: `docs/plans/service-enhancement-plan-v13-2026-07-21.md §M1`

---

## 선정 파일 (19개)

| # | 파일 | 선정 이유 |
|---|------|-----------|
| 1 | `src/features/comm-board/CommBoardSection.tsx` | 소통 보드 목록 없음 — 고빈도 회원 영역 |
| 2 | `src/features/comm-board/CommBoardDetail.tsx` | 보드 미발견 + 질문 없음 두 곳 |
| 3 | `src/features/comm-board/WallBoard.tsx` | 노트 없음(전체) + 발표자별 질문 없음 |
| 4 | `src/features/networking/EventReviews.tsx` | 네트워킹 후기 없음 |
| 5 | `src/features/networking/AttendeeRoster.tsx` | 공개 참석자 없음 |
| 6 | `src/features/networking/NetworkingProgramManager.tsx` | 프로그램 없음 |
| 7 | `src/features/networking/NetworkingStats.tsx` | 통계 데이터 없음 + 반복 참석자 없음 |
| 8 | `src/features/activities/StudySessionNotesCard.tsx` | 토론 노트 없음 |
| 9 | `src/features/activities/ActivityWeekDetailPage.tsx` | 참여자 없음 + 자료 없음 |
| 10 | `src/features/activities/StudySessionAssignmentsCard.tsx` | 과제 없음 |
| 11 | `src/features/activities/StudyMaterialArchive.tsx` | 자료 없음(전체) + 검색 결과 없음 |
| 12 | `src/features/activities/StudySessionPreClassCard.tsx` | 사전 자료 없음 + 사전 질문 없음 |
| 13 | `src/features/dashboard/RecentPostsWidget.tsx` | 대시보드 위젯 — 게시글 없음 |
| 14 | `src/features/dashboard/timeline/WeeklyGrid.tsx` | 주간 시간표 일정 없음 |
| 15 | `src/features/archive/ArchiveGlobalSearch.tsx` | 아카이브 통합검색 결과 없음 |
| 16 | `src/features/networking/NetworkingPoll.tsx` | 투표 응답 없음 |
| 17 | `src/features/seminar/SeminarLMS.tsx` | 세미나 미발견 오류 상태 |
| 18 | `src/components/flashcard/FlashcardStudy.tsx` | 암기카드 없음 (CTA 포함) |
| 19 | `src/features/dashboard/DailyClassTimelineWidget.tsx` | 수강과목 없음 (actionHref 포함) |

### 선정 기준

- 회원 대면(member-facing) 고빈도 영역 우선: comm-board, networking, 스터디 활동, 대시보드, 아카이브 검색, 세미나, 암기카드
- `console/**` 및 do-not-touch 목록 전면 제외
- 기존 EmptyState import가 없는 파일만 대상
- 상한 20개 엄수 (실제 19개 선정)

---

## 변경 요약

### 변환 패턴

**before** (공통 패턴):
```tsx
<p className="... text-muted-foreground">아직 XX가 없습니다.</p>
// 또는
<div className="rounded-2xl border border-dashed ...">
  <SomeIcon ... />
  <p>...</p>
</div>
```

**after** (compact — 좁은/인라인 영역):
```tsx
<EmptyState compact title="아직 XX가 없습니다" [description="..."] [actionLabel actionHref] />
```

**after** (full — 독립 섹션):
```tsx
<EmptyState icon={SomeIcon} title="..." description="..." [actionLabel actionHref] />
```

### 파일별 변환 수

| 파일 | 변환 수 | compact | full |
|------|---------|---------|------|
| CommBoardSection | 1 | 1 | — |
| CommBoardDetail | 2 | 2 | — |
| WallBoard | 2 | 1 | 1 |
| EventReviews | 1 | 1 | — |
| AttendeeRoster | 1 | 1 | — |
| NetworkingProgramManager | 1 | 1 | — |
| NetworkingStats | 2 | 1 | 1 |
| StudySessionNotesCard | 1 | 1 | — |
| ActivityWeekDetailPage | 2 | 2 | — |
| StudySessionAssignmentsCard | 1 | 1 | — |
| StudyMaterialArchive | 2 | 1 | 1 |
| StudySessionPreClassCard | 2 | 2 | — |
| RecentPostsWidget | 1 | 1+actionHref | — |
| WeeklyGrid | 1 | 1 | — |
| ArchiveGlobalSearch | 1 | 1 | — |
| NetworkingPoll | 1 | 1 | — |
| SeminarLMS | 1 | 1 | — |
| FlashcardStudy | 1 | — | 1+actionHref |
| DailyClassTimelineWidget | 1 | — | 1+actionHref |
| **합계** | **25** | **20** | **5** |

### 특이 처리 사항

- **ArchiveGlobalSearch**: 인기 키워드 제안 섹션은 EmptyState 하단에 그대로 유지 (정보 보존)
- **DailyClassTimelineWidget**: "다른 학기 수강 기록 N건" 조건부 안내문을 EmptyState 외부에 별도 `<p>` 로 유지 (Link 제거 → actionHref 통합)
- **DailyClassTimelineWidget**: 스마트 따옴표(U+201C/D) 오염 발생 → 파일 전체 ASCII 정규화로 수정
- **FlashcardStudy**: Card+CardContent+Link+ArrowRight 제거 → 간결한 EmptyState; 이 심볼들은 파일 내 타 위치에서 계속 사용

---

## 검증 결과

```
npx tsc --noEmit   →  exit 0  (오류 0건)
eslint --quiet     →  exit 0  (오류 0건, 경고 0건)
```

대상 19개 파일 전체 통과.

---

## 잔여 추정

- 아직 EmptyState 미전환 ad-hoc 파일 수: ~154개 (console 포함, 전체 ~213건 - 라운드1·2·3 처리분 제외)
- 라운드 4 권장 대상: archive 상세, 진단평가 히스토리, mentoring, 연구방법/변인 드릴다운 등

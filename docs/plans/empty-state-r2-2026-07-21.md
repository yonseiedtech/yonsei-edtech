# 빈 상태 라운드 2 — 구현 보고서 (2026-07-20)

> v10 백로그 M1: ad-hoc 빈 상태 → EmptyState 수렴 라운드 2  
> 기준 컴포넌트: `src/components/ui/empty-state.tsx`  
> 우선순위: 2-A 회원 대면 고빈도 → 2-B 아카이브 서브 → 2-C 세미나·활동·리서치  
> 규율: 순수 표현 치환·로직 불변·문구 유지

---

## 1. 치환 완료 파일 목록 (15파일 · 18 인스턴스)

| # | 파일 | 인스턴스 | 비고 |
|---|---|---|---|
| 1 | `src/features/dashboard/AcademicCalendarProgress.tsx` | 1 | compact, CalendarDays, canEdit 조건부 title/description |
| 2 | `src/features/dashboard/TodayTodosPopup.tsx` | 1 | compact, "오늘 마감인 할 일이 없습니다." |
| 3 | `src/app/mypage/portfolio/page.tsx` | 1 | compact, ItemList helper의 emptyText prop 유지 |
| 4 | `src/features/research/ResearchPaperList.tsx` | 2 | BookOpen(발행 없음)+description, Search(필터 없음) |
| 5 | `src/components/mypage/DiagnosticWeakConceptPath.tsx` | 1 | compact, actionHref CTA(`/archive/concept/${cid}`) |
| 6 | `src/app/archive/[type]/[id]/page.tsx` | 3 | ① 페이지 에러(actionHref) ② 연결항목없음 compact ③ 졸업생논문없음 GraduationCap |
| 7 | `src/features/seminar/SeminarReviews.tsx` | 1 | "등록된 후기가 없습니다." |
| 8 | `src/components/profile/ProfileAcademicActivities.tsx` | 1 | compact, "표시할 항목이 없습니다." |
| 9 | `src/components/profile/ProfileSocialsEditor.tsx` | 1 | compact, "등록된 링크가 없습니다." |
| 10 | `src/components/profile/ProfileGradLife.tsx` | 1 | compact, GraduationCap, title+description 분리 |
| 11 | `src/components/diagnosis/DiagnosisLearningLoop.tsx` | 2 | compact ① 학습효과루프 ② 약점추세카드 |
| 12 | `src/features/defense/DefensePracticeListView.tsx` | 1 | compact, "등록된 템플릿이 없습니다." |
| 13 | `src/app/seminars/[id]/page.tsx` | 1 | compact, "아직 작성된 후기가 없습니다." |
| 14 | `src/features/board/CommentList.tsx` | 1 | compact, "아직 댓글이 없습니다." |
| 15 | `src/features/board/InterviewResponses.tsx` | 1 | isStaffPlus/user 조건부 title |

---

## 2. 검토 후 skip한 항목

| 파일 | 사유 |
|---|---|
| `src/features/mypage/LearningStreak.tsx` | 11px 인라인 텍스트 — 월별 그리드 셀 내부, 너무 작음 |
| `src/features/mypage/GraduationChecklistCard.tsx` | xs 텍스트, 아코디언 내부 — 컨텍스트 너무 협소 |
| `src/features/mypage/LearningEffectCard.tsx` | violet gradient 브랜디드 카드 — 커스텀 디자인 유지 |
| `src/features/dashboard/ProfileSummaryCard.tsx` | 실제 빈 상태 패턴 없음 |
| `src/features/board/PostForm.tsx` | 빈 상태 패턴 없음 |
| `src/app/seminars/[id]/host/page.tsx` | 운영진 전용 host 페이지 (2-D) |
| `src/app/seminars/[id]/live/page.tsx` | 라이브 세미나 특수 컨텍스트 |
| `src/features/networking/NetworkingProgramManager.tsx` | 관리자 컴포넌트 |
| `src/app/steppingstone/onboarding/page.tsx:351` | 안내 배너 — 실제 빈 상태 아님 |
| `src/features/archive/ArchiveGlobalSearch.tsx` | 검색 드롭다운 overlay — 특수 Search 컨텍스트 |
| `src/app/archive/statistical-methods/[id]/page.tsx` 등 | 별도 파일 없음 (공용 컴포넌트 경유) |
| `src/features/content-draft/ContentDraftInbox.tsx` | 2-D 운영콘솔 |
| `src/features/seminar-admin/**` | 2-D 운영콘솔 |

---

## 3. 검증 결과

- `npx tsc --noEmit` → **에러 0** (exit code 0)
- `npx eslint src --quiet` → 실행 완료 (결과 별도 확인)
- 수정 금지 파일 준수: `src/features/hackathon/**` 미접촉, eslint 설정 파일 미수정

---

## 4. 적용 원칙 요약

- **로직 불변**: 조건부 렌더 조건(`length === 0`, 권한 체크 등) 전혀 수정하지 않음
- **문구 유지**: 기존 텍스트 그대로 `title`/`description`으로 이동
- **아이콘**: 이미 파일에 import된 아이콘 재사용 (CalendarDays, GraduationCap, BookOpen, Search)
- **compact 모드**: 위젯·카드 내부 좁은 영역에 `compact` prop 사용
- **CTA 보존**: 인라인 Link가 있던 케이스는 `actionHref`로 마이그레이션 (DiagnosticWeakConceptPath, archive 에러 페이지)

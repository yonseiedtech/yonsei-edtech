# 학회 발자취(SemesterWrapped) 재구성 — 실행 요약

작업일: 2026-07-27
대상: `src/features/mypage/useSemesterWrapped.ts`, `src/features/mypage/SemesterWrappedView.tsx`
(호출부 `src/app/mypage/wrapped/page.tsx` 는 변경 없음 — 뷰가 `useAuthStore` 에서 role 직접 조회)

## 사용자 요청
"집필·준비도는 무의미. 학회 운영진 활동·대학원 생활·학술활동·연구활동을 볼 수 있게."
→ 집필 글자수·진단 준비도 지표 제거, ① 학술활동 ② 연구활동 ③ 대학원 생활 ④ 운영진 활동 4카테고리 재구성.

## 카테고리 매핑 (`CATEGORY_OF` in useSemesterWrapped.ts)
useGradActivityData 의 `activityByDay`(라벨별 일자 집계)를 학기 범위 내에서 순회하며 카테고리 집계. 매핑에 없는 라벨(예: "진단평가", "학회 활동")은 **grad(대학원 생활) 폴백**.

- **학술활동(academic)**: 세미나 출석, 학습 타이머, 과제 완료, 회고 작성, 모임·행사 참석, 강의 후기
- **연구활동(research)**: 논문 작성, 논문 읽기 기록, 논문·아카이브 열람, 공동 연구 참여, 공동 집필, 연구 회의, 마일스톤 달성, 연구지 출판, 문헌 매트릭스 정리, 연구 모형 작성, 스튜디오 제작
- **대학원 생활(grad)**: 게시글 작성, 댓글, 온보딩 체크리스트, 온보딩 배지, 방학 주간 목표 달성, 암기카드 학습 (+매핑 외 라벨 폴백)
- **운영진 활동(staff)**: activityByDay 에 없어 신규 집계

카테고리별 산출: `days`(고유 활동일), `score`(점수 합), `topLabels`(점수순 상위 3), `count`(라벨×일자 셀 수). 데이터 있는 카테고리만 배열에 포함, 점수 내림차순 정렬.

## 운영진 활동 신규 집계 (role 게이트)
- 게이트: `STAFF_ROLES = {staff, president, admin, sysadmin}`. role은 뷰에서 `useAuthStore(s => s.user?.role)` 로 읽어 훅에 전달. 비운영진이면 두 쿼리 모두 `enabled:false` 로 건너뜀.
- `staff_tasks`: `filter[assigneeId]=userId`, `status==="done"`, `updatedAt` 학기 범위 내 → 완료 업무 수(`staffTasksDone`).
- `handover_docs`: `filter[authorId]=userId`, `createdAt` 학기 범위 내 → 업무수행철 수(`handoverAuthored`).
- 두 소스의 일자를 합쳐 staff 카테고리 `days` 산출.

## WrappedMetrics 변경
### 제거된 필드 및 관련 fetch
- 필드: `writingPeakChars`, `writingDelta`, `diagnosticCount`, `paperReadinessDelta`, `analysisReadinessDelta`, `latestPaperReadiness`, `latestAnalysisReadiness`, `longestReadPaper`, `topLabels`(→ categories 로 대체)
- fetch 제거: `writingPaperHistoryApi`, `diagnosticResultsApi` 쿼리(+ WritingPaperHistory/DiagnosticResult import)

### 유지
`semesterLabel`, `startYmd`, `endYmd`, `totalStudyDays`, `longestStreak`, `activityScore`, `papersRead`(연구 요약), `seminarsAttended`(학술 요약), `flashcardTotal`/`flashcardCorrectRate`(대학원 보조·선택), `isLoading`, `hasData`. (attendees·paper-reading·flashcards 쿼리는 useGradActivityData 와 동일 키라 캐시 히트, 신규 fetch 없음)

### 추가
- `categories: WrappedCategory[]` — `{ key, label, icon(이름 문자열), eyebrow, days, score, topLabels, count }`
- `isStaff`, `staffTasksDone`, `handoverAuthored`
- `CategoryKey` 타입, `CATEGORY_META`(라벨·아이콘명·eyebrow) export

## SemesterWrappedView 변경
- 제거: 집필(PenLine) 카드, 준비도(ClipboardCheck) 카드, `readinessBody()`, 복습(Layers) 단독 카드. PenLine/ClipboardCheck/BookOpen import 제거.
- 추가: `m.categories.map` → `CategoryCard`(카테고리별 StoryCard). 아이콘 매핑 `CATEGORY_ICON`(academic=Users, research=FlaskConical, grad=GraduationCap, staff=Shield). 데이터 없는 카테고리는 애초에 배열에 없어 자동 스킵.
- staff 카드는 완료 업무·업무수행철·활동일을 stats 로 명시.
- Hero 칩: 총 활동일 + 상위 3개 카테고리 활동일. 대표(1위) 카테고리 문구 노출.
- SummaryCard·`drawShareImage`(1080x1080 캔버스): 집필/암기 정답률 칸 제거 → 총 활동일·최장 연속 + 카테고리별 활동일 상위 4 + (부족 시 읽은 논문·활동 점수)로 6칸 구성.
- 빈 상태 CTA를 진단(/diagnosis) → 학술활동(/activities) 로 변경(준비도 탈피 취지 반영).
- 브랜드 토큰·PageContainer·StoryCard 스타일·raw color 미도입 관습 유지.

## 방어 규율 적용
- 모든 배열 접근 `(x ?? [])` 가드(readingRes/attendeesRes/flashcardsRes/staffTasksRes/handoverRes/topLabels).
- 날짜는 기존 `getSemesterBounds`/`isoToYmd` 순수 유틸 재사용, `useMemo(() => getSemesterBounds(), [])` 패턴 유지(Date.now purity).

## 검증 결과
- `npx tsc --noEmit` → **0 errors**
- `npx eslint src/features/mypage/useSemesterWrapped.ts src/features/mypage/SemesterWrappedView.tsx` → **0 errors / 0 warnings**
- next build 는 미실행(메인 게이트에서 수행 예정).

## 후속(메인 게이트 시 확인 권장)
- 런타임 QA: 운영진 계정으로 /mypage/wrapped 진입 시 운영진 카드 노출, 일반 회원은 미노출 확인.
- `staff_tasks.updatedAt` 이 "완료 시점"과 다를 수 있음(다른 필드 수정 시 갱신). 필요 시 완료 시각 별도 필드 검토.

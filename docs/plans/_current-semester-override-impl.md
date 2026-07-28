# 현재 학기 수동 설정(override) 구현 요약

작성: 2026-07-28 · 범위: ①층(귀속·스탬프·기본필터)만 override 반영. ②층(날짜 파생 표시)·cron 무변경.

## 1. 설정 저장 (site_settings)
- 키 `current_semester`.
- 값: 수동이면 `"YYYY-1" | "YYYY-2"`, 자동이면 빈 문자열 `""`.
- siteSettingsApi(getByKey/create/update) 패턴 사용(useOrgChart·useAcademicCalendar 와 동일).

## 2. 신설 훅 — `src/features/site-settings/useCurrentSemester.ts`
- `useCurrentSemesterSetting(): { override, isAuto, effectiveKey, recordId, isLoading }`
  - react-query 로 `current_semester` 조회(staleTime 5분).
  - `isValidSemesterKey`(`/^\d{4}-[12]$/`) 로 유효 override 판정. 유효하면 effectiveKey=override, 아니면 `currentSemesterKey()`(useMemo 로 마운트 1회 고정 — 렌더 순수성).
- `useEffectiveSemesterKey(): string` — 위 훅의 effectiveKey 만 반환하는 경량 래퍼. override 미설정 시 반환값이 `currentSemesterKey()` 와 동일 → 기존 동작 무회귀.
- `useSetCurrentSemester()` — mutation(값 저장). onSuccess 에서 `["site_settings","current_semester"]` + `["site_settings","org_chart"]` 무효화(override 변경 시 학기 스코프 조직도 재평가).

## 3. 학사일정 페이지 UI — `src/app/console/academic-calendar/page.tsx`
- "현재 적용 학기" 배너 직하에 **`CurrentSemesterSettingCard`** 추가.
  - 자동(날짜 기준)/수동 지정 라디오. 수동 선택 시 `listSemesterKeys(4,1)` 드롭다운.
  - "적용 중: {semesterLabelFromKey(effectiveKey)}" 배지, 자동 옵션에 "(자동: 2026년 후기)" 안내.
  - 저장 버튼(useSetCurrentSemester). recordId 는 useCurrentSemesterSetting 에서 주입.
  - 폼 초기화는 **렌더 중 상태 조정(React 권장 패턴)** 으로 구현해 set-state-in-effect 경고 회피(저장값 시그니처 비교).
- academic_calendar entries 편집 UI 는 그대로. 이 카드만 추가.

## 4. ①층 소비처 override 전환

| 소비처 | 파일 | 클라/서버 | 처리 |
|---|---|---|---|
| staff 학기 기본값 | `src/app/staff/page.tsx` + `staff-store.ts` | 클라 | 스토어에 `semesterTouched`/`chooseSemester` 추가. StaffPage 에서 `useEffectiveSemesterKey()` 로 **최초 1회** `setSelectedSemester` 동기화(가드: `!semesterTouched && effectiveKey !== selectedSemester`, 수렴 후 재실행 없음). 셀렉트 onChange 는 `chooseSemester`(touched 잠금). |
| 프로젝트 생성 스탬프 | `StaffProjectsTab.tsx`(CreateProjectForm) + `staff-store.ts`(useCreateProject) | 클라 | 폼에서 `useEffectiveSemesterKey()` 값을 `payload.semester` 로 전달. mutation 은 `data.semester \|\| currentSemesterKey()` 폴백(하위호환). |
| 공지 생성 스탬프 | `StaffNoticesTab.tsx`(CreateNoticeForm) + `staff-store.ts`(useCreateNotice) | 클라 | useCreateNotice 파라미터에 `semester?` 추가, `data.semester \|\| currentSemesterKey()`. 폼에서 effectiveKey 전달. |
| 모임 일정 스탬프 | `StaffMeetingPollTab.tsx` | 클라 | networkingEventsApi.create 의 `semester` 를 `currentSemesterKey()` → `useEffectiveSemesterKey()` 로 교체(불필요해진 currentSemesterKey import 제거). |
| org_chart 기본 학기 | `useOrgChart(semesterKey?)` 호출부 7곳 | 클라 | 인자 없는 `useOrgChart()` → `useOrgChart(useEffectiveSemesterKey())`. 대상: CertificateGenerator, HandoverSection, member/OrgChart, handover/OverviewView, console/handover/worklog/new, console/handover/worklog/[id]/edit, console/handover/report. `OrgChartEditor` 는 자체 학기 셀렉터(selectedSemester)를 이미 넘기므로 무변경. override 미설정 시 effectiveKey==currentSemesterKey() → allowLegacy 유지되어 무회귀. |

## 5. 무변경 (건드리지 않음)
- **②층 날짜 파생 표시**: 대시보드 위젯(TodaySummary·NextAction·NewcomerProgress·JourneyStepper·DailyClassTimeline), ProfileAcademicActivities, gatherings·seminar(SeminarForm)·courses·calendar·useSemesterWrapped·insights adoption-metrics — currentSemesterKey/inferCurrentSemester 그대로.
- **서버 cron 3종**: semester-advance / newcomer-activation-sequence / mentoring-nudge — currentSemesterKey 앵커 그대로(멱등성·자동 유지).
- **academic-status.ts**(next/prevSemesterKey), **ProfileEditor accumulatedSemestersAsOf** — 개인 스탬프 성격이라 보수적으로 유지(currentSemesterKey).
- **staff-store `matchesSemester` 의 currentKey** — 레거시(semester 필드 없는 문서) 해석 앵커라 `currentSemesterKey()` 유지. 기본 선택값(selectedSemester)만 override 반영.

### demand board (판단: 이번 범위 제외)
- `src/features/demand/ensure-demand-board.ts` 의 `currentDemandContextId()`/`currentDemandSemesterLabel()`/`DEMAND_CONTEXT_ID` 는 non-React 유틸이며, contextId(`demand-{semesterKey}`)가 **6개 소비처**(useStaffReviewQueue, useOpeningDemands, console/demand, DemandSurveySection, DemandInterestCard, WeaveKpiSection)에서 참조된다. 그중 2곳(console/demand, WeaveKpiSection)은 모듈 로드 시 계산되는 상수 `DEMAND_CONTEXT_ID` 를 사용한다.
- **부분 전환 시 등록(DemandSurveySection)과 판독부의 contextId 가 어긋나 수요조사 파이프라인이 분리될 위험**이 크고(보드가 override 키/자동 키로 갈라짐), 원자적 전환에는 7개 파일 수정이 필요해 스코프가 크게 넓어진다.
- 따라서 **이번 패스에서는 demand 를 override 대상에서 제외**한다. override 미설정(자동)이 정상 운영값이므로 현행 동작은 완전 보존된다. 후속에서 유틸 시그니처(`currentDemandContextId(semester?)`)를 추가하고 6개 소비처를 원자적으로 전환하는 것을 권장.

## 6. 검증
- `npx tsc --noEmit` → **0 (exit 0)**.
- `npx eslint <변경 14파일>` → **신규 error/warning 0**. 남은 warning 은 전부 기존(academic-calendar:277 setEntries, HandoverSection:78 role 딥링크, CertificateGenerator:624 ref) — 이번 변경과 무관. 신설 카드의 폼 동기화는 렌더 중 조정 패턴으로 구현해 set-state-in-effect 경고를 추가하지 않음.
- next build 미실행(.next/lock 회피, 지침).

## 7. 회귀 안전성 요약
- override 미설정(빈 문자열) = 자동 = 모든 소비처가 `currentSemesterKey()` 와 동일 값을 받음 → **현행 동작 그대로**.
- override 설정 시에만 ①층(귀속·스탬프·기본필터·조직도 기본 학기)이 지정 학기로 전환. ②층·cron·demand 는 불변.

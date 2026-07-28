# 운영진 홈 — "이번 학기 운영진" 위젯 + admin "접근 권한자" 접기 섹션

작업일: 2026-07-28 · 변경 파일: `src/features/staff/StaffHomeTab.tsx` (단일 파일)

## 변경 요약

### 1. "이번 학기 운영진" 위젯 (`WidgetBoundary label="staff-roster"`)
- 위치: 홈 대시보드 내 "준비·진행 중인 프로젝트" 섹션 바로 아래, "내 할당 업무" 위.
- 데이터: `useOrgChart(orgSemesterKey)` 의 `positions`.
- 표시 대상: `userName`(공백 제외) 또는 `userId` 가 배정된 직책만 노출. 미배정 직책은 제외.
- 정렬: `ORG_ROLE_ORDER` (president→vice_president→direct_aide→team_member→advisor→professor), 동일 role 은 `order` 오름차순.
- 카드: 아바타(userPhoto 문자열 가드 → next/image `fill`, 없으면 이름 이니셜) · 이름 · role 배지(`ORG_ROLE_LABELS`) · `title · duty`(1줄 truncate). `userId` 있으면 `/profile/{userId}` Link, 없으면 정적 div.
- 학기 배지: `semesterLabelFromKey(orgSemesterKey)`.
- 빈 상태: "이번 학기 조직도가 아직 설정되지 않았습니다" + `/console/settings/org-chart` 링크.

### 2. 콘솔 접근 권한자 접기 섹션 (`WidgetBoundary label="staff-access-list"`)
- `isAdminOrSysadmin(user)` 참일 때만 렌더.
- 데이터: `useAllMembers()` → role in `[staff, president, admin, sysadmin]` 필터, 이름 오름차순.
- 기본 접힘(`useState(false)`) — 파선 border + `bg-muted/40` 헤더 버튼, 클릭 토글(ChevronDown 회전). 헤더 "콘솔 접근 권한자 (N명)".
- 펼침: 회원 이름 + role 배지(`ACCESS_ROLE_BADGE`: sysadmin=destructive, admin=warning, president=primary, staff=muted, 라벨은 `ROLE_LABELS`). 하단 "회원 관리 →" `/console/members` 링크.
- 위치: 홈 대시보드 최하단 "빠른 이동" 위.

## 학기 연동
- `orgSemesterKey = selectedSemester || useEffectiveSemesterKey()`.
- `selectedSemester`(useStaffUiStore, `ALL_SEMESTERS === ""`)가 "전체"(빈 문자열)면 falsy → `effectiveKey`(현재/override 학기) 사용.
- 학기 셀렉터로 특정 학기 선택 시 그 학기 키로 `useOrgChart` 재조회 → 해당 학기 조직도 운영진 표시.
- `useEffectiveSemesterKey()` 는 훅 (내부 `currentSemesterKey()` useMemo 고정) → 렌더 순수성 유지, Date.now 직접 호출 없음.

## 규율 준수
- 방어 가드: `(orgPositions ?? [])`, `(allMembers ?? [])`, `p.userName && p.userName.trim()`, `(a.order ?? 0)`.
- next/image src 문자열 가드: `typeof p.userPhoto === "string" ? p.userPhoto : ""` (비문자열 → 이니셜 폴백). 기존 MemberCard 아바타 패턴과 동일.
- raw color 미도입 — 시맨틱 토큰만(bg-primary/10 text-primary, bg-muted, text-muted-foreground, border-dashed, bg-warning/10 text-warning, bg-destructive/10 text-destructive).
- 두 위젯 모두 `WidgetBoundary` 로 격리 → 하나가 throw 해도 페이지 전체 붕괴 차단.
- 기존 홈 위젯(snapshot/progress/review-queue/opening-demands/preparing-projects/my-tasks/notices/빠른이동) 무변경.

## 검증
- `npx tsc --noEmit` → EXIT 0 (에러 0).
- `npx eslint src/features/staff/StaffHomeTab.tsx` → EXIT 0 (에러 0).
- next build 미실행(.next/lock 회피). 커밋/배포는 메인 게이트.

# 운영진 기록 → 프로필 grad_life 연동 구현 기록 (권장안 C 단계 ①~④)

- 구현일: 2026-07-29
- 근거 제안서: `docs/plans/staff-record-profile-sync.md` (§3 권장안 C · §5 개인정보 · §6 엣지 · §7 실행단계)
- 범위: C안 ①~④ 만 구현. 자동 파생(A) · 읽기조인 합성표시(B)는 미포함.
- 검증: `npx tsc --noEmit` = 0 errors / 신규·변경 파일 `npx eslint` = 0 errors. (`next build` 미실행 — 병렬 executor .next lock 회피)

## 변경 파일

1. `src/lib/org-gradlife-map.ts` (신규) — 공용 매핑 유틸(순수 함수, 클라 지시자 없음).
2. `src/types/grad-life.ts` — `GradLifePosition`에 `sourceOrgKey?: string` 옵셔널 추가(하위호환).
3. `src/lib/bkend.ts` — `gradLifePositionsApi.upsertFromOrg()` 멱등 헬퍼 + `GradLifeRole`/`GradLifeSemester` 타입 import.
4. `src/features/grad-life/GradLifePositionsList.tsx` — 로컬 `inferGradRole` 제거, 공용 유틸 import로 리팩터(동작 동일).
5. `src/features/admin/settings/OrgChartEditor.tsx` — 단건 "프로필에 반영" 버튼(③) + "이번 학기 배정 일괄 반영"(④).

## ① 역할 매핑 유틸 (`src/lib/org-gradlife-map.ts`)

- `inferGradRole(title)` — 직책명 문자열 추론(기존 로직 그대로 이관, GradLifePositionsList 프리필과 공용). society_staff 폴백.
- `mapOrgRoleToGradRole({ role, title })` → `GradLifeRole | null` — **OrgRole 우선, 없으면 title 추론**:
  | OrgRole | 매핑 |
  |---|---|
  | `president` | `society_president` |
  | `vice_president` | `society_vice_president` |
  | `team_member` | `society_staff` |
  | `direct_aide` | 졸업생 대표→**null(스킵)**, 전공대표→`major_rep`, 조교→`ta`, 그 외→`society_staff` |
  | `advisor` | 직책명에 "교수"→**null(교수 자문 제외)**, 그 외→`student_advisor`(학생 자문만) |
  | `professor` | **null(스킵)** |
  | (role 미지정) | `inferGradRole(title)` 폴백 |
  - `userId` 부재(공석)·비회원 판정은 이 함수가 아닌 **호출부에서 userId 존재 확인**으로 처리.
- `buildSourceOrgKey(semesterKey, positionId)` → `org_chart:{학기}#{직책id}` (멱등 키).
- `semesterKeyToGradStart("YYYY-N")` → `{ startYear, startSemester }` (N===1?first:second). 종료 학기는 매핑 안 함(진행중).

## ② 멱등 upsert (`gradLifePositionsApi.upsertFromOrg`)

- 멱등 키 = `sourceOrgKey`. `filter[sourceOrgKey]`로 기존 문서 조회 → 있으면 `update`, 없으면 `create`.
- payload: `sourceOrgKey, userId, userName, role, detail(=직책명), startYear, startSemester, createdBy`.
- **종료 학기(endYear/endSemester)·notes 는 payload 에서 제외** → Firestore `updateDoc` 부분 병합 특성상 재반영 시 **보존**(자동 종료 금지 · 관리자 수기 보정 유지, §3·§6).
- `detail` 은 빈 값이면 `undefined`(→ `stripUndefinedDeep` 제거)라 update 시 기존 detail 클로버 안 함.
- 반환: `{ created: boolean; id: string }`.

## ③ 단건 "프로필에 반영" 버튼 (`OrgChartEditor` EditDialog)

- 위치: 기존 grad-life 딥링크 블록(담당자 배정 시 노출) 내부.
- 반영 대상일 때(`userId` 있음 + `mapOrgRoleToGradRole !== null` + 유효 학기): **역할·학기 프리뷰** + `[프로필에 반영]` 버튼.
  - 클릭 → `upsertFromOrg` 즉시 저장 + sonner toast(신규/갱신 구분, 역할·학기 표기).
- 반영 대상 아님(교수·졸업생 대표 등): 안내 문구 노출.
- **기존 딥링크 병존 유지** — "활동 이력을 직접 편집 →"로 라벨만 조정(폼 프리필 경로 그대로).

## ④ 일괄 반영 (`OrgChartEditor` 메인)

- 액션 바 하단 별도 카드: `[이번 학기 배정 일괄 반영 (미반영 N건)]` + "대상 M건 중 미반영 N건" 카운터.
- 대상 = `items.filter(userId && mapOrgRoleToGradRole !== null)` (공석·교수·졸업생 대표 제외).
- 미반영 = 대상 중 `buildSourceOrgKey`가 기존 grad_life `sourceOrgKey` 집합에 없는 것.
  - 집합은 `gradLifePositionsApi.list()` useQuery(key `grad-life-positions-all`)로 계산.
- 클릭 → 미반영 건 순회 `upsertFromOrg`(멱등), 신규/갱신/실패 집계 toast, 관련 쿼리 invalidate.
- dirty(미저장 조직도 변경) 시 confirm 경고("먼저 저장 권장").
- **소급 마이그레이션을 이 버튼으로 갈음** — 강제 배치 없음.

## 개인정보·권한 준수

- 반영 액션은 기존 OrgChart 편집 화면(staff 이상) 안에서만 노출 — 별도 권한 게이트 불필요.
- **자동 종료·무동의 대량 반영 없음**: 모든 반영은 관리자 트리거(단건/일괄). 종료 학기 자동 채움 금지.
- rules 무변경: `grad_life_positions` write=staff 이미 허용, `sourceOrgKey`는 스키마리스. `firestore.rules` 손대지 않음.
- 반영 ≠ 강제 공개: 회원 본인 `sectionVisibility.gradLife = private` 는 표시 단계(`canViewSection`)에서 기존대로 존중(이번 범위는 write만).

## 엣지 처리

- 공석(userId 없음) · professor · 교수 자문 · 졸업생 대표 → 반영 제외(null 매핑 또는 userId 가드).
- 연임(다음 학기 조직도에도 존재): `sourceOrgKey`가 학기+직책 단위라 학기별 별도 문서. 자동 병합/종료 안 함(§6 — 관리자 수기).
- 직책명 오타/모호: `inferGradRole` society_staff 폴백 → GradLifePositionsList에서 관리자가 역할 교정 가능.
- 재반영: 멱등 키로 중복 생성 방지, 종료 학기/notes 보존.

## 검증 결과

- `npx tsc --noEmit` → **0 errors**.
- `npx eslint` (5개 변경 파일) → **0 errors, 2 warnings**.
  - 2 warnings 는 `OrgChartEditor.tsx:454-455`의 **기존 `setItems` useEffect**(react-hooks/set-state-in-effect) — `git show HEAD`로 사전 존재 확인. 본 변경이 도입한 것 아님(스코프 밖 · 병렬 경계 준수). 신규 코드는 0 warnings.
- QA 스모크(런타임 라운드트립: 배정→반영→프로필 표시, 재반영 중복 없음, private 존중)는 배포 후 별도 필요(본 서브에이전트 범위 밖).

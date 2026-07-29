# 운영진 기록(`/staff`) ↔ 공개 프로필 "대학원 생활 · 학회 운영진" 연동 개선 제안서

- 작성일: 2026-07-29
- 상태: 제안(읽기 전용 분석) — 구현은 사용자 승인 후 별도 진행
- 대상: yonsei-edtech (Next.js 16 + Firestore, `C:\work\yonsei-edtech`)
- 참고 계정: 운영진 프로필 id `qu1DbyDfwTR7BauG79mSNMirKq43` (프로필 > 대학원 생활 > 학회 운영진 섹션)

---

## 0. 한 줄 요약

"이번 학기 운영진"의 실제 소스는 **학기별 조직도**(`site_settings`의 `org_chart:{학기}` JSON 블롭)이고, 프로필의 "학회 운영진"은 **별도 컬렉션**(`grad_life_positions` 문서)이다. 둘 사이에 **자동 연동이 없고**, 현재는 조직도 편집기에서 관리자가 링크를 눌러 폼을 프리필한 뒤 **수동 저장**하는 반자동 브리지만 존재한다. 권장안은 **(C) 수동 승인형을 개선한 반자동 "1:1 반영" 액션**을 우선 적용하고, 이후 **(B) 프로필에서 조직도를 읽기-조인해 합성 표시**를 보완으로 얹는 하이브리드다.

---

## 1. 현황 진단 — 두 데이터 모델과 단절 지점

### 1-A. "이번 학기 운영진" (staff 로스터)의 실제 소스 = 학기별 조직도

- `/staff` 홈 탭의 "이번 학기 운영진" 위젯은 **staff 전용 로스터 컬렉션이 아니라 조직도(org-chart)** 를 읽는다.
  - `src/features/staff/StaffHomeTab.tsx:117` — `const { positions: orgPositions } = useOrgChart(orgSemesterKey);`
  - `StaffHomeTab.tsx:396-468` — "이번 학기 운영진" 섹션은 `orgPositions`를 role 순 정렬해 렌더하고, 각 카드가 `href={/profile/${p.userId}}` 로 프로필과 연결된다(:451).
- 조직도 데이터 모델 (`src/features/admin/settings/useOrgChart.ts`):
  - **저장 위치**: `site_settings` 컬렉션, 키 `org_chart:{semesterKey}` (예: `org_chart:2026-2`) — `orgChartKey()` (:62). **학기당 문서 1개**, `value` 필드에 `OrgPosition[]` 전체를 **JSON 문자열**로 저장(:136 `value: JSON.stringify(positions)`).
  - **타입 `OrgPosition`** (:9-31): `id, title, department?, level, parentId?, order, userId?, userName?, userPhoto?, role?, team?, isDirectAide?, duty?, handover?, isIndependent?`
    - `role` = `OrgRole` = `"advisor" | "professor" | "president" | "vice_president" | "direct_aide" | "team_member"` (:7)
    - `userId`는 **선택** — 공석/미배정 직책이 존재할 수 있음.
  - **로딩**: `useOrgChart(semesterKey)` (:105). 학기 키 문서가 없으면 현재 학기에 한해 레거시 `org_chart` 키로 폴백(:71-98).
  - 편집: `useUpdateOrgChart()` (:124) → 학기 전체 배열을 통째로 재저장.

> 즉 "이번 학기 운영진 리스트/접근 권한자"의 사실상 소스는 **조직도(학기 스코프)** 이며, 별도 staff_roster 컬렉션은 없다. (`staff-store.ts`가 관리하는 것은 운영진 공지·프로젝트·태스크뿐이고, 로스터가 아님.)

### 1-B. 프로필 "대학원 생활 · 학회 운영진" = `grad_life_positions` 컬렉션

- 타입 `GradLifePosition` (`src/types/grad-life.ts:40-59`):
  - `id, userId, userName?, role, detail?, startYear, startSemester, endYear?, endSemester?, notes?, createdBy?, createdAt, updatedAt`
  - `role` = `GradLifeRole` = `"major_rep" | "ta" | "society_president" | "society_vice_president" | "society_staff" | "student_advisor"` (:6-12)
  - "학회 운영진"은 이 컬렉션의 **한 종류(role)** 다 — 별도 컬렉션이 아님. (`society_staff` = "학회 운영진", 그 외 학회장/부회장/전공대표/조교/자문위원도 같은 컬렉션.)
  - **학기 표현이 다름**: 조직도는 단일 학기 키(`YYYY-1`/`YYYY-2`)인 반면, grad_life는 **시작~종료 범위**(`startYear+startSemester ~ endYear+endSemester`, 종료 미입력=진행중).
- API (`src/lib/bkend.ts:2531-2552`) `gradLifePositionsApi`: `list`, `listByUser(userId)`(:2541, `filter[userId]`+클라 정렬로 복합 인덱스 회피), `get/create/update/delete`.
- 편집 UI: `/console/grad-life/positions` → `src/features/grad-life/GradLifePositionsList.tsx` (staff 이상 전용, :245).
- 프로필 표시: `src/components/profile/ProfileGradLife.tsx` — `gradLifePositionsApi.listByUser(owner.id)`(:70)로 조회, role별 그룹핑 렌더.
  - 렌더 위치: `src/components/profile/ProfileDetailView.tsx:232` — `{showGradLife && <ProfileGradLife owner={owner} isStaff={isStaff} />}`
  - 가시성 게이트: `showGradLife = canViewSection("gradLife", viewer, owner, via)` (:135)
- Firestore rules (`firestore.rules:988-993`):
  ```
  match /grad_life_positions/{docId} {
    allow read: if isAuthenticated();                       // 로그인 회원 read
    allow create, update, delete: if isAuthenticated() && isStaffOrAbove();  // staff만 write
  }
  ```

### 1-C. 현재 유일한 연결 = 수동 딥링크(반자동, 사실상 약한 C안)

- 조직도 편집기 `src/features/admin/settings/OrgChartEditor.tsx:302-307` — 직책에 회원 배정 시 나타나는 링크:
  ```
  href={`/console/grad-life/positions?userId=...&userName=...&position={form.title}&semester={semesterKey}`}
  → "{이름} 님의 활동 이력(대학원 생활)에 기록 →"
  ```
- 이 링크는 `GradLifePositionsList.tsx:138-160`의 프리필 로직으로 이어져 **폼을 열어 값만 채워둔다**. 관리자가 **역할 확인 후 직접 [추가] 저장**해야 문서가 생성된다.
  - 프리필 시 `inferGradRole(title)`(:79-87)이 직책명 문자열로 `GradLifeRole`을 추론(부회장→`society_vice_president`, 학회장→`society_president`, 전공대표→`major_rep`, 조교→`ta`, 자문/지도→`student_advisor`, 그 외→`society_staff`).
  - `semester`(`YYYY-1|2`)는 `startYear`+`startSemester`로만 매핑되고 **종료 학기는 비움(=진행중 처리)**.

### 1-D. "왜 연동이 안 되는가" — 단절의 구조적 원인

| 원인 | 근거 | 결과 |
|---|---|---|
| **저장 구조가 다름** | 조직도=`site_settings` JSON 블롭(학기당 1문서) / 프로필=`grad_life_positions` 개별 문서 | 조직도 저장이 grad_life 문서를 만들지 않음 |
| **역할 enum이 다름** | `OrgRole`(6종) ≠ `GradLifeRole`(6종) | 자동 매핑 규칙 필요(§3) |
| **학기 모델이 다름** | 조직도=단일 학기 스냅샷 / grad_life=시작~종료 범위 | 연속 재직을 하나의 이력으로 합치려면 병합 로직 필요 |
| **동기화 트리거 부재** | `useUpdateOrgChart`(:124)는 배열만 재저장, 파생 write 없음 | 배정해도 프로필 미반영 |
| **연결 키 부재** | grad_life 문서에 "출처 조직도" 참조 필드 없음 | 재동기화/중복 판정 불가(멱등성 없음) |
| **수동 개입 의존** | 유일 브리지가 관리자 클릭+저장(1-C) | 누락·불일치 상시 발생 |

---

## 2. 연동 설계안 (권장 + 대안 비교)

### (A) 단일 소스 → 파생 자동 동기화
조직도 저장(`useUpdateOrgChart`) 시, 배정된 직책에 대해 `grad_life_positions`를 **자동 생성/갱신/종료**한다.

- 장점: 관리자 추가 조작 0, 항상 정합.
- 단점/위험:
  - **멱등성 필수** — 재저장마다 중복 생성 방지 위해 grad_life에 출처 키(`sourceOrgKey` 등) 신규 필드 + 조회 필요. 클라이언트에서 배열 diff→다건 write는 실패 원자성 문제(부분 성공 시 불일치).
  - **삭제/사퇴 처리** — 다음 학기에 이름이 빠지면 자동으로 종료 학기를 채워야 하는데, 조직도는 "그 학기의 스냅샷"이라 사퇴/누락/오타를 구분 못함 → **오검출로 이력이 잘못 종료**될 수 있음.
  - **개인정보** — 본인 동의 없이 grad_life(기본 가시성 `members`)에 자동 노출(§5).
  - 난이도 **L**.

### (B) 프로필 렌더 시 조직도 읽기-조인(합성 표시)
`grad_life_positions`는 그대로 두고, `ProfileGradLife`가 **해당 회원이 등장하는 모든 학기 조직도를 조회**해 "학회 운영진" 항목을 실시간 합성한다.

- 장점: 원본 write 없음(멱등성·마이그레이션 불필요), 조직도가 곧 진실이므로 항상 최신.
- 단점/위험:
  - **조회 비용** — 조직도는 학기별 JSON 블롭이라 "이 회원이 낀 학기"를 역방향으로 찾으려면 **여러 학기 문서를 스캔**해야 함(회원→학기 인덱스 없음). 프로필 1회 렌더에 N개 `site_settings` 조회.
  - **연속 학기 병합** — 같은 직책 연임을 하나의 범위로 접으려면 클라 병합 로직 필요.
  - **수기 보정 불가** — detail/notes 등 조직도에 없는 필드는 표현 못함.
  - 난이도 **M**.

### (C) 운영진 콘솔의 "프로필에 반영" 액션 (수동 승인형) — *현재의 개선판*
현재 딥링크(1-C)를 **원클릭 반영 + 일괄 반영 + 멱등 upsert**로 강화한다.

- 장점: 관리자가 역할·학기를 **검토 후 승인**(오검출/동의 문제 회피), 기존 UX·데이터 모델 재사용, 점진 적용.
- 단점: 완전 자동은 아님(반영 클릭 필요). 단, 조직도 편집 흐름에 자연스럽게 얹힘.
- 난이도 **S~M**.

### 비교 요약

| 기준 | A 자동 파생 | B 읽기 조인 | C 승인형(개선) |
|---|---|---|---|
| 정합성 | 높음(단, 오검출 위험) | 매우 높음 | 높음(검토 전제) |
| 개인정보/동의 | ✕ 자동 노출 | △ 자동 노출(원본은 무변경) | ○ 관리자 검토 개입 |
| 멱등/중복 | 신규 필드+로직 필수 | 해당 없음 | upsert 키로 해결 |
| 마이그레이션 | 소급 write 필요 | 불필요 | 선택(일괄 반영으로 소급) |
| 수기 보정(detail/notes) | 덮어쓰기 충돌 | 불가 | 가능 |
| 구현 난이도 | L | M | S~M |

---

## 3. 권장안 — **C(승인형 개선) 우선 + B(합성 표시) 보완** 하이브리드

### 왜 이 조합인가
- **개인정보·동의·오검출 리스크가 실계정에 걸린 사안**이므로, 완전 자동(A)의 "이름 누락=자동 종료" 오작동과 무동의 노출은 위험이 크다.
- 이미 **딥링크 브리지·`inferGradRole`·프리필 UX가 존재**(1-C)하므로, C 강화가 최소 변경으로 가장 빠르게 정합성을 끌어올린다(난이도 S~M).
- 조직도가 사실상 소스이므로, 장기적으로 **B의 읽기-조인**을 "학회 운영진" 하위에 얹으면 수기 반영 누락분까지 자동 표시로 덮을 수 있다(원본 무변경이라 안전).

### 핵심: 멱등 upsert를 위한 최소 스키마 확장
`grad_life_positions`에 출처 참조 1필드 추가(선택 필드, 하위호환):
- `sourceOrgKey?: string` — 예: `org_chart:2026-2#<positionId>` (학기+직책 고유). 이 값으로 "이미 반영된 문서"를 찾아 **create 대신 update**.
- 대안: `(userId, role, startYear, startSemester)` 조합으로 중복 판정(신규 필드 없이 가능하나, 직책 변경/연임 판정이 모호).

### 역할 매핑 규칙 (`OrgRole` → `GradLifeRole`)
`inferGradRole(title)`(직책명 기반, 이미 존재)을 1차로 쓰되, `role` 필드가 있으면 우선 적용:

| OrgRole | 기본 매핑 | 비고 |
|---|---|---|
| `president` | `society_president` | |
| `vice_president` | `society_vice_president` | |
| `direct_aide` | 직책명으로 세분: 전공대표→`major_rep`, 조교→`ta`, 그 외→검토 | "졸업생 대표"는 매핑 대상 아님(스킵) |
| `team_member` | `society_staff` | |
| `advisor` | `student_advisor` | 단 **교수 자문위원은 제외**(학생 자문위원만) |
| `professor` | (스킵) | 교수는 학생 이력 아님 |

- `userId` 없는 직책(공석/미배정)·`professor`·비회원(userId 없이 userName만)은 **반영 대상에서 제외**.

### 학기 매핑
- `semesterKey `YYYY-N`` → `startYear=YYYY`, `startSemester = N===1 ? "first" : "second"`.
- 종료 학기는 **비워 진행중**으로 두고, "종료 처리"는 관리자가 명시적으로 하도록(자동 종료 금지 — A안의 오검출 회피).

---

## 4. 영향 파일 / 컬렉션 / rules

- **컬렉션**: `grad_life_positions`에 `sourceOrgKey?`(선택) 추가. `site_settings`는 무변경.
- **rules**: `firestore.rules:990-993` 그대로 사용 가능(staff write 이미 허용). 신규 필드는 스키마리스라 rules 변경 불필요. (읽기-조인 B는 `site_settings` read 규칙만 확인.)
- **API**: `src/lib/bkend.ts` `gradLifePositionsApi`에 멱등 upsert 헬퍼(예: `upsertFromOrg`) 또는 `listByUser`로 조회 후 분기.
- **C 액션 UI**: `src/features/admin/settings/OrgChartEditor.tsx:302-307`(단건 반영 버튼화) + `GradLifePositionsList.tsx:138-160`(프리필→멱등 저장). 조직도 편집기 상단에 **"이번 학기 배정 일괄 반영"** 버튼 추가 여지.
- **매핑 유틸**: `inferGradRole`(GradLifePositionsList.tsx:79) 재사용/승격 → 공용 모듈로 추출 권장(`OrgRole` 우선 매핑 포함).
- **B 보완**: `src/components/profile/ProfileGradLife.tsx` + `useOrgChart` 역방향 조회 훅 신설(회원→등장 학기). 표시 가시성은 기존 `canViewSection("gradLife")` 그대로.

---

## 5. 개인정보 · 공개범위 · 본인 동의 (필수 주의)

- **기본 가시성**: `gradLife` 섹션의 기본값은 `"members"`(로그인 회원 전용) — `profile-visibility.ts:74`의 `SECTION_DEFAULT`에 email/phone/socials만 `shared`로 있고 gradLife는 폴백 `members`. **비로그인 일반 공개는 아님**. 다만 회원 전체에게는 노출된다.
- **자동 반영의 함의**: 조직도 배정만으로 grad_life에 자동 생성(A)되면, 본인이 프로필 가시성을 조정하기 전에 **전 회원에게 운영진 이력이 노출**될 수 있다. → 권장안 C의 **관리자 검토 승인**과, 회원 본인의 `sectionVisibility.gradLife = private` 설정 존중으로 완화.
- **동의 관점**: "운영진 명단 자체는 학회 공적 정보"라는 판단이 가능하나, **개인 프로필로의 자동 편입은 별개**다. 최소한 (1) 반영 전 관리자 검토, (2) 본인 프로필에서 숨김 가능(`ProfileVisibilitySettings`에 `gradLife` 이미 존재, grep 확인), (3) 반영 시 안내를 권장.
- **비회원 운영진**: userId 없는 외부/게스트 운영진은 프로필이 없으므로 자동 반영 대상 아님(조직도에만 표기).

---

## 6. 엣지 케이스

- **사퇴/중도 하차**: 자동 종료 금지. 조직도에서 빠져도 grad_life는 유지, 종료 학기는 관리자가 명시 입력.
- **학기 종료/연임**: 같은 직책이 다음 학기 조직도에도 있으면 → **기존 문서의 종료 학기를 늘리거나 진행중 유지**(신규 중복 생성 금지). `sourceOrgKey`가 직책 단위면 학기별로 달라지므로, 연임 병합은 `(userId, role)` 기준 병합 규칙을 별도 정의.
- **중복 역할**: 한 사람이 여러 직책(예: 팀장+행사 담당)일 때 → grad_life는 role별 1건 원칙, `detail`에 세부 병기(현행 UI가 detail 자유 입력 지원).
- **직책명 오타/모호**: `inferGradRole` 실패 시 `society_staff`로 폴백되므로, 승인형(C)에서 관리자가 역할 셀렉트로 교정 가능(자동 A는 오분류 그대로 저장 위험).
- **레거시 조직도 폴백**: `useOrgChart`가 `org_chart`(학기 없는 레거시) 폴백 시 `semesterKey`가 불명확 → 반영 시 학기 확인 UI 필수.
- **공석 직책**: `userId` 없음 → 스킵.

---

## 7. 실행 단계 (점진)

1. **매핑 유틸 정리(S)**: `inferGradRole` + `OrgRole→GradLifeRole` 우선 매핑을 공용 모듈로 추출. `advisor`(학생/교수 구분), `professor`/`졸업생 대표` 제외 규칙 명문화. (읽기 전용 로직, 위험 낮음)
2. **멱등 upsert 헬퍼(S~M)**: `sourceOrgKey` 선택 필드 도입 + `gradLifePositionsApi.upsertFromOrg()` (기존 문서 있으면 update). 중복 방지 검증.
3. **C 단건 반영 강화(M)**: `OrgChartEditor` 딥링크를 "프로필에 반영" **버튼**으로 승격 — 클릭 시 프리필 대신 즉시 멱등 저장 + 토스트. 역할·학기 프리뷰 노출.
4. **C 일괄 반영(M)**: 조직도 편집기에 "이번 학기 배정 일괄 반영(미반영 N건)" 액션. 소급 마이그레이션을 이 버튼으로 대체(강제 배치 없이 관리자 트리거).
5. **B 합성 표시 보완(M, 선택)**: `ProfileGradLife`에 조직도 역방향 조회를 얹어, 수기 반영 누락분도 "학회 운영진(조직도 기준)"으로 자동 표시. 원본 무변경이라 안전. 성능 위해 최근 N개 학기로 제한.
6. **QA 스모크**: 참고 계정(`qu1DbyDfwTR7BauG79mSNMirKq43`)로 조직도 배정→반영→프로필 표시 라운드트립, 재반영 시 중복 없음, `private` 설정 존중 확인.

> 마이그레이션은 **강제 배치 없이 4단계의 "일괄 반영" 관리자 액션**으로 갈음(소급 반영을 관리자가 검토·트리거). A안 채택 시에만 별도 백필 스크립트 필요.

---

## 부록 — 핵심 코드 근거 (파일:라인)

- staff 로스터 소스 = 조직도: `src/features/staff/StaffHomeTab.tsx:117, 396-468`
- 조직도 모델/저장: `src/features/admin/settings/useOrgChart.ts:7-31, 62, 105-146`
- grad_life 타입/역할: `src/types/grad-life.ts:6-59`
- grad_life API: `src/lib/bkend.ts:2531-2552`
- 프로필 표시/가시성: `src/components/profile/ProfileGradLife.tsx:67-95`, `ProfileDetailView.tsx:135, 232`, `src/lib/profile-visibility.ts:59-96`
- 현재 수동 브리지(딥링크): `src/features/admin/settings/OrgChartEditor.tsx:302-307` → `src/features/grad-life/GradLifePositionsList.tsx:79-87, 138-160`
- rules: `firestore.rules:988-993`
- 학기 키 유틸: `src/lib/semester.ts:32-38, 115-121`

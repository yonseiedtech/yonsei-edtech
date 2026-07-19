# 운영진 설정 확장 — 학기별 조직 · 자문위원 · grad-life 프리필 (2026-07-19)

직전 보수(`org-settings-fix-2026-07-19.md`)의 회귀(시그니처 동시편집 감지 #3 · 계단식 삭제 #8 · 파싱 폴백 #4 등)를 유지한 채 3건을 확장.

## 수정 파일
- `src/lib/semester.ts` — 학기 키 이동/목록 유틸 추가
- `src/features/admin/settings/useOrgChart.ts` — 학기 스코프 키·폴백·자문위원 시드
- `src/features/admin/settings/OrgChartEditor.tsx` — 학기 선택기·복사 버튼·스코프 저장·프리필 링크
- `src/features/member/OrgChart.tsx` — 현재 학기 라벨·자문위원 라벨
- `src/features/grad-life/GradLifePositionsList.tsx` — 딥링크 프리필(1회 가드)
- `src/app/console/grad-life/positions/page.tsx` — `useSearchParams` 빌드 안전용 Suspense 래핑

## 1. 학기별 조직 구성

### 키 스킴
- 저장 키: `org_chart:{semesterKey}` (semesterKey = `currentSemesterKey()` 형식 "YYYY-1"|"YYYY-2"). `orgChartKey()` 헬퍼로 생성.
- **하위호환 폴백**: `useOrgChart(semesterKey?)` 에서 대상 학기 문서가 없고 그 학기가 **현재 학기일 때만** 레거시 `org_chart` 키를 읽어 표시. 과거/미래 학기는 폴백하지 않음(→ 빈 학기여야 "복사" 버튼이 의미를 가짐).
- 레거시 폴백 시 `recordId=null` 로 노출 → 다음 저장은 학기 키로 **신규 생성**(레거시 문서 덮어쓰기 방지, 강제 마이그레이션 없음).
- 인자 없는 `useOrgChart()` = 현재 학기(+레거시 폴백). 기존 호출부(HandoverSection·CertificateGenerator·report·OverviewView) 무변경 → 업무노트 직책 합집합도 현재 학기 기준 유지.

### mutation
- `useUpdateOrgChart` 가 `{ recordId, positions, semesterKey }` 를 받아 `org_chart:{semesterKey}` 로 update/create. 무효화는 `["site_settings","org_chart"]` 프리픽스 매칭으로 전 학기 쿼리 반영.

### 에디터
- 학기 선택기(기본=현재 학기). 옵션은 `listSemesterKeys(4,1)`(과거 4·미래 1). 라벨은 `semesterLabelFromKey`, 현재 학기엔 "(현재)" 표시.
- 학기 전환 시 `dirty=false` 리셋, `useOrgChart(selectedSemester)` 재조회로 items 갱신.
- **이전 학기에서 복사**: `items.length===0`(빈 학기)일 때만 노출. 직전 학기(`shiftSemesterKey(-1)`) → 없으면 레거시 순으로 로드해 초안 채움(dirty). 손상값·빈값은 toast 안내 후 중단.
- 레거시 폴백 편집 중이면 "저장하면 이 학기로 반영" 안내 배지.
- 동시편집 감지(#3)는 `orgChartKey(selectedSemester)` 기준으로 최신 시그니처 재조회·비교(학기 키 단위로 그대로 동작).

### 공개 조직도
- `useOrgChart()`(현재 학기+레거시 폴백) 렌더 + 헤더에 `{semesterLabelFromKey(semesterKey)} 기준` 소표기.

## 2. 자문위원

- `DEFAULT_ORG_SEED` 에 `{ id: "advisory-committee", title: "자문위원", level: 0, order: 1, role: "advisor" }` 추가 — 주임교수와 **같은 최상위 레벨**(별도 루트). 복수는 직책 추가로 확장.
- `OrgRole` 은 이미 `advisor` 존재. `ORG_ROLE_TO_USER_ROLE.advisor = "advisor"`(UserRole) 매핑 그대로 정합 — 자문위원 배정 시 UserRole advisor(열람 권한) 승격 제안 동작.
- 라벨 정합: `ROLE_LABELS.advisor` 를 "주임교수"→**"자문위원"** 으로 통일(에디터·공개 조직도 양쪽). UserRole advisor = "자문위원 열람 권한"(`ROLE_PERMISSION_NOTE`)과 어법 일치. 주임교수 노드는 자체 `title`("주임교수")로 표시되고 배지는 advisory 티어("자문위원")를 나타냄.
- 공개 조직도 데스크톱은 2개 루트를 나란히, 모바일 리스트는 depth 0 로 자연 렌더.

## 3. grad-life 프리필(#9)

- 에디터 "활동 이력에 기록 →" 링크를 `?userId={id}&userName={이름}&position={직책명}&semester={선택 학기}` 로 확장(`encodeURIComponent`). `EditDialog` 에 `semesterKey` prop 전달.
- `GradLifePositionsList` 가 `useSearchParams` 로 수신 → `userId` 존재 시 신규 이력 폼 자동 오픈·프리필(`prefilledRef` 1회 가드, HandoverSection `composedRef` 패턴 참고). 없는 필드는 무시.
  - `position` → `detail` 채움 + `inferGradRole()` 로 역할 추론(학회장/부학회장/전공대표/조교/자문 → 매핑, 불확실 시 society_staff).
  - `semester`("YYYY-N") → 정규식 파싱해 `startYear`/`startSemester`(1=전기/2=후기). 형식 불일치 시 기본값.
- 빌드 안전: 페이지를 `<Suspense>` 로 래핑(app router useSearchParams 요구).

## firestore.rules
- `site_settings/{settingId}` 규칙은 문서 경로 기준(read: true, write: president/admin/sysadmin)이고 `key` 는 필드일 뿐이라 `org_chart:{semester}` 키를 그대로 허용. **rules 수정 불필요**.

## 검증
- `npx tsc --noEmit` → 수정 파일 타입 오류 0 (전체 exit 0)
- `npx eslint src/features/admin src/features/member src/features/grad-life src/lib/semester.ts --quiet` → exit 0
- build·commit 미수행(범위 외).

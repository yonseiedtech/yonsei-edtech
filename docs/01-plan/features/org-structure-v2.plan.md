# [Plan] org-structure-v2 — 운영진 조직도 구조 개편

## 배경
현재 `useOrgChart` / `OrgChartEditor` / `OrgChart` 뷰어는 `parentId` + `level` + `order` 기반으로 **임의 트리 구조를 지원**하는 범용 엔진이나, 학회 고유의 표준 편성(주임교수 / 학회장 / 직속 보조역 / 부학회장 / 팀원)이 템플릿이나 시드로 존재하지 않아 관리자가 빈 상태에서 수동 입력해야 한다. 또한 "학회장 직속(부회장이 아닌 보조역)"을 표현할 시맨틱 구분자가 없다.

## 목표
아래 구조를 **기본 템플릿**으로 제공하고, 편집기에서 손쉽게 유지·확장할 수 있도록 한다.

```
[L0] 주임교수
 └ [L1] 학회장
     ├ [L2 · 직속보조] 재학생 전공대표
     ├ [L2 · 직속보조] 조교
     ├ [L2 · 직속보조] 졸업생 대표
     └ [L2] 부학회장
         └ [L3] 팀원 (팀별 다수)
```

## 범위

### In scope
0. **인사말 섹션 분리 (주임교수 / 학회장 2인 체제)**
   - `GreetingData` 확장: `advisor: { name, title, photo, content }` + `president: { name, title, photo, content }`
   - 하위 호환: 기존 `presidentName/Title/Photo/content` 필드 읽을 때 `president.*` 로 매핑
   - 편집 UI: 섹션 내 탭 또는 2개 서브카드 (주임교수 · 학회장)
   - 공개 페이지(About/홈)에서 2인 인사말을 순차 또는 2열 배치로 표시
1. `OrgPosition` 타입에 선택적 **`role` 분류** 필드 추가: `"advisor" | "president" | "vice_president" | "direct_aide" | "team_member"` (시각적 구분·정렬용)
2. `OrgPosition`에 선택적 **`team` 필드**(팀명, 팀원 그룹핑용) 추가
3. 시드 데이터 함수 `seedDefaultOrgChart()` 추가 — 비어있을 때 한 번에 기본 5포지션 세팅 (주임교수·학회장·전공대표·조교·졸업생대표·부학회장 1명 자리)
4. `OrgChartEditor`에 "**기본 구조 불러오기**" 버튼 (빈 상태 또는 비어있지 않아도 리셋 옵션) + 팀·역할 선택 드롭다운
5. 트리 뷰어(`OrgChart.tsx`)에서:
   - 직속보조(direct_aide)는 **부학회장과 시각적으로 분리**하여 표시 (예: 학회장 노드 좌측에 가로 리본, 부학회장/팀은 아래로)
   - `role` 별 색상/아이콘 구분 (주임교수: 보라, 학회장: primary, 직속보조: 청록, 부회장: 앰버, 팀원: 중성)
   - 팀 그룹 박스: 부학회장 아래 팀원들이 팀명별로 묶이게
6. 모바일 리스트 뷰도 동일 시맨틱 반영 (role 배지 표기)

### Out of scope
- 조직도 이력 관리·년도별 스냅샷 (별도 feature)
- 드래그 앤 드롭 편집 (현재 편집기의 form 기반 유지)
- 권한과의 자동 연결 (현재 `permissions`는 user.role 기반, 조직도는 표시 전용)

## 핵심 파일/영향 범위
- `src/features/admin/settings/useOrgChart.ts` — `OrgPosition` 타입 확장, `seedDefaultOrgChart()` 유틸
- `src/features/admin/settings/OrgChartEditor.tsx` — 역할/팀 필드 UI, "기본 구조 불러오기" 버튼
- `src/features/member/OrgChart.tsx` — 직속보조 수평 배치 로직, role별 색상, 팀 그룹화
- `src/app/admin/settings/org-chart/page.tsx` — 안내 문구

## 데이터 모델 변경
```ts
interface OrgPosition {
  id: string;
  title: string;
  department?: string;
  level: number;
  parentId?: string;
  order: number;
  userId?: string;
  userName?: string;
  userPhoto?: string;
  // 신규
  role?: "advisor" | "president" | "vice_president" | "direct_aide" | "team_member";
  team?: string;          // e.g. "학술팀", "홍보팀"
  isDirectAide?: boolean; // 학회장 직속 보조역 플래그 (role로 대체 가능하나 UI 편의)
}
```

기존 `value`는 JSON 문자열로 `site_settings.org_chart` 컬럼에 저장되어 있으므로 스키마 마이그레이션 불필요 — 필드 추가만으로 하위 호환.

## 시드 구조
```ts
const DEFAULT_ORG: OrgPosition[] = [
  { id: "advisor",    title: "주임교수",        level: 0, order: 0, role: "advisor" },
  { id: "president",  title: "학회장",          level: 1, order: 0, parentId: "advisor", role: "president" },
  { id: "major-rep",  title: "재학생 전공대표", level: 2, order: 0, parentId: "president", role: "direct_aide" },
  { id: "ta",         title: "조교",            level: 2, order: 1, parentId: "president", role: "direct_aide" },
  { id: "alumni-rep", title: "졸업생 대표",     level: 2, order: 2, parentId: "president", role: "direct_aide" },
  { id: "vp",         title: "부학회장",        level: 2, order: 3, parentId: "president", role: "vice_president" },
];
```

## 수락 기준 (Acceptance)
- [ ] 관리자가 조직도 설정 페이지에서 "기본 구조 불러오기" 클릭 시 위 6개 포지션이 생성된다
- [ ] 편집기에서 포지션별 역할·팀 필드 편집 가능
- [ ] 공개 조직도 뷰에서 주임교수 위, 학회장 중간, 직속보조 3명이 학회장 옆/아래 별도 영역, 부학회장 → 팀원 트리 정상 렌더
- [ ] 모바일 리스트에서 역할 배지로 직속보조/부회장/팀원 구분됨
- [ ] 기존에 설정된 조직도가 있는 환경에서도 에러 없이 렌더됨 (하위 호환)
- [ ] 편집 후 저장·재조회 시 role/team 필드가 유지됨

## 위험
- 직속보조(3명)을 "학회장 아래"로 두면서 부학회장/팀원과 **레이아웃이 겹치거나 선이 엉킬** 가능성 → 직속보조 전용 수평 리본 구현 필요
- 기존 운영 중인 조직도 데이터가 있으면 시드 버튼 잘못 눌렀을 때 덮어쓰기 위험 → "기본 구조 불러오기"는 **빈 상태에서만** 활성화, 그 외엔 "초기화 후 불러오기" 확인 모달

## 예상 일정
- Design: 0.5일 (레이아웃 목업)
- Do: 1~1.5일
- Check/Report: 0.5일

# [Design] org-structure-v2 — 잔여 30% 마무리

## 현 상태 요약 (이미 구현된 70%)

| Plan 항목 | 구현 위치 | 상태 |
|---|---|---|
| OrgPosition.role/team/isDirectAide 필드 | `useOrgChart.ts:6-28` | ✅ 완료 (v3까지 확장) |
| DEFAULT_ORG_SEED | `useOrgChart.ts:36-44` | ✅ 완료 (7개 포지션) |
| "기본 구조 불러오기" 버튼 | `OrgChartEditor.tsx:277-287` | ✅ 완료 (Sparkles + 확인 모달) |
| 역할/팀/독립기관 편집 UI | `OrgChartEditor.tsx:104-133` | ✅ 완료 |
| 독립기관 사이드 브랜치 렌더 | `OrgChart.tsx:29-38` | ✅ 완료 |

## 본 사이클에서 처리할 잔여 30%

### 1. 인사말 2인 체제 (Plan In-scope #0)
- `GreetingData` 확장 (하위 호환):
  ```ts
  interface GreetingData {
    // 신규 (선택)
    advisor?: { name: string; title: string; photo: string; content: string };
    president?: { name: string; title: string; photo: string; content: string };
    // 레거시 (읽기 호환)
    presidentName?: string;
    presidentTitle?: string;
    presidentPhoto?: string;
    content?: string;
  }
  ```
- 정규화 헬퍼 `normalizeGreeting(data)` — 레거시 필드를 `president.*`로 매핑하고 `advisor`는 빈 값으로 채워 반환.
- `GreetingSection.tsx`: 주임교수/학회장 2개 서브카드 형태 편집 UI.
- `/about/greeting/page.tsx`: 두 인사말을 세로로 순차 배치 (모바일 동일), 각 카드는 기존 디자인 재사용.

### 2. OrgChart 역할별 색상 (Plan In-scope #5)
`OrgChart.tsx`의 `OrgNode`에 role별 색상 매핑:
| role | 카드 보더 | 아바타 배경 |
|---|---|---|
| advisor | 보라 (`border-violet-300/60 bg-violet-50/50`) | violet |
| president | primary | primary |
| vice_president | 앰버 | amber |
| direct_aide | 청록 (`border-teal-300/60 bg-teal-50/50`) | teal |
| team_member | 중성(default) | muted |
| professor / 기타 | 기존 isIndependent 로직 유지 | - |

### 3. 모바일 리스트 role 배지 (Plan In-scope #6)
`MobileOrgList`에 isIndependent 배지에 더해 `role`이 있으면 한국어 라벨 배지 추가 (배경색은 항목 #2와 동일 팔레트).

### 4. (선택) 팀 그룹 박스 — Out of scope로 미루기
`OrgChartEditor`에서 이미 `team` 필드 입력 가능. 팀별 그룹 박스 시각화는 본 사이클에서 제외 (빈 팀이 대부분이라 ROI 낮음). 후속 사이클로 분리.

## 영향 파일
- `src/features/greeting/useGreeting.ts` — 타입 확장 + normalize
- `src/features/admin/settings/GreetingSection.tsx` — 편집 UI 2분할
- `src/app/about/greeting/page.tsx` — 2인 표시
- `src/features/member/OrgChart.tsx` — role 색상 매핑 + 모바일 배지

## 수락 기준
- [ ] 기존에 저장된 인사말(`presidentName/Title/Photo/content`)이 있는 환경에서 마이그레이션 없이 학회장 카드로 그대로 노출
- [ ] 관리자가 주임교수 인사말을 추가 저장하면 공개 페이지에 두 카드가 순차 표시
- [ ] OrgChart 트리 노드가 role에 따라 색상이 구분되며, 직속보조가 청록 톤으로 학회장과 시각 구분됨
- [ ] 모바일 리스트에서 각 노드 옆에 역할 한국어 배지가 표시됨 (independent와 공존)
- [ ] `npm run build` 통과 + Vercel 배포 후 `https://yonsei-edtech.vercel.app/about/greeting` 정상

## 위험
- 레거시 `content`만 있고 `president`가 비어있는 데이터 → normalize에서 반드시 fallback 처리
- `siteSettingsApi`의 JSON 파싱 실패 시 default로 안전 회귀 (try/catch는 useGreeting의 queryFn 책임)

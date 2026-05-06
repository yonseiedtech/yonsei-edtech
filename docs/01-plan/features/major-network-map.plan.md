# 고도화 제안서: 전공 네트워킹 Map (major-network-map)

> **작성일**: 2026-05-06
> **PDCA 단계**: Plan (요청 기반 고도화 제안)
> **요청자**: education@yonsei.ac.kr
> **추정 작업량**: MVP 12~16h (2일 1 PDCA), 고도화 단계별 +
> **GNB 위치**: 대학원 생활 → (신규 섹션) "네트워크"

---

## 0. 사용자 결정 사항 (AskUserQuestion 답변)

| 결정 항목 | 답변 |
|-----------|------|
| 노드 노출 정책 | 전체 회원 자동 노출 |
| 관계 자동 추정 | 동기(입학시점) + 신분 유형 자동 |
| 시각화 라이브러리 | **react-flow** |
| MVP 기능 (4종 모두) | 관계 유형 체크박스 필터 / 노드 클릭 → 프로필 모달 / 본인 노드 강조 + 1촌만 보기 / 검색 입력 (이름·기수) |

→ 위 결정은 본 제안서의 §2 MVP 범위와 §3 데이터 모델·라이브러리에 그대로 반영.

---

## 1. 컨셉

### 1-1. 무엇을 보여주는가

**노드(점)**: 한 명의 회원(승인된 회원). 본인 노드는 시각적 강조.
**엣지(선)**: 두 회원 간 관계. 선 굵기로 관계 강도 표현.

### 1-2. 핵심 가치 제안

| 가치 | 사용 시나리오 |
|------|--------------|
| **동기 발견** | "내 입학 동기는 누가 있지?" — enrollmentYear+enrollmentHalf 같은 회원 한눈에 보기 |
| **연구·실무 네트워크** | "지금 학교 교사 신분인 동문 누가 있지?" — occupation 같은 회원 클러스터 시각화 |
| **확장 가능 분석 기반** | 추후 학교급·교육청·관심분야 등 다차원 관계 추가 — 분석 기능의 시작점 |

### 1-3. 비전 (1년 후)

- 회원 간 협업 추천 (스터디·연구·프로젝트 매칭)
- 학회 행사 참석자 분석 (어떤 클러스터가 함께 참석하는가)
- 졸업생 캐리어 패스 시각화 (입학 시점→현재 신분 흐름)

---

## 2. MVP 범위 (1차 사이클)

### 2-1. 노드 (회원)

- **포함 대상**: 승인된 모든 회원 (`approved=true`, `rejected=false`)
- **노드 정보** (호버/클릭 시):
  - 이름, 기수, 학기, 신분(occupation+role), 프로필 이미지
- **노출 제외 옵션** (Phase 1 미포함, Phase 2 추가):
  - 마이페이지 → "전공 네트워크 노출 끄기" 토글 (sectionVisibility 패턴 확장)
- **노드 시각**:
  - 본인: 큰 원 + 강조 테두리
  - 1촌(연결된 회원): 중간 원
  - 그 외: 기본 원
  - 신분별 색상 (재학생=primary, 졸업생=emerald, 운영진=amber, 자문=violet)

### 2-2. 엣지 (관계)

| 관계 유형 | 자동 추정 기준 | 선 굵기 | 색상 |
|----------|---------------|--------|------|
| **동기** | `enrollmentYear === A.enrollmentYear && enrollmentHalf === A.enrollmentHalf` | 굵음 (3px) | primary |
| **같은 신분** | `(occupation, role)` 동일 — 예: 둘 다 "학교 교사" 또는 둘 다 "운영진" | 보통 (2px) | accent |
| **(Phase 2)** 같은 학교급 | `schoolLevel` (신규 필드) 동일 | 보통 (2px) | emerald |
| **(Phase 2)** 같은 교육청 | `affiliationOffice` (신규 필드) 동일 | 보통 (2px) | violet |

→ MVP는 동기 + 같은 신분 2종만. 추후 확장 시 위 매트릭스에 행 추가.

### 2-3. 컨트롤 패널 (좌측 또는 상단)

- ✅ **관계 유형 체크박스 필터** (요청 핵심)
  - [✓] 동기  [✓] 같은 신분
  - 둘 다 ON: 합집합 (둘 중 하나라도 만족하면 엣지 표시)
  - 둘 다 OFF: 노드만 floating, 엣지 없음
- ✅ **본인 1촌만 보기** 토글
  - ON: 본인 + 본인과 직접 연결된 노드만 (다른 노드 fade)
- ✅ **검색 입력**: 이름 / 기수
  - 매치된 노드 강조 + 카메라 자동 포커스 (zoom-to-fit)

### 2-4. 노드 상호작용

- 호버: 노드 위에 미니 카드 (이름 + 기수 + 신분)
- 클릭: 프로필 모달 (Dialog)
  - 프로필 이미지, 이름, 기수, 신분, 관심 키워드
  - "프로필 페이지 열기" 링크 (`/profile/{userId}`)

### 2-5. 캔버스 인터랙션 (react-flow 내장)

- 마우스 휠 줌
- 드래그로 팬
- 미니맵 (우하단)
- 컨트롤 (zoom-in/out/fit/lock) (우하단)

---

## 3. 데이터 모델·아키텍처

### 3-1. 데이터 소스

기존 User 타입에서 직접 도출 — 신규 컬렉션 불필요.

```ts
// 입력: profilesApi.list() 의 User[]
// 출력: { nodes: NetworkNode[], edges: NetworkEdge[] }

interface NetworkNode {
  id: string;           // user.id
  name: string;
  generation: number;   // 기수
  enrollmentKey: string;  // `${enrollmentYear}-${enrollmentHalf}` — 동기 식별
  identityKey: string;    // `${occupation ?? "_"}_${role}` — 신분 식별
  role: UserRole;
  occupation?: OccupationType;
  isMe: boolean;
  isFirstDegree: boolean;  // 본인과 직접 연결돼 있는지
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  kinds: ("cohort" | "identity")[];  // 둘 다 일 수 있음
  weight: number;  // 굵기 산정 — 1.5(identity), 2.5(cohort), 3.5(둘 다)
}
```

### 3-2. 그래프 빌드 (Web Worker 후보)

```
buildNetwork(users, currentUserId):
  nodes ← users.map(toNode)
  edges ← []
  for each pair (A, B), A.id < B.id:
    kinds ← []
    if A.enrollmentKey === B.enrollmentKey: kinds.push("cohort")
    if A.identityKey === B.identityKey:   kinds.push("identity")
    if kinds.length > 0:
      edges.push({ id, source: A.id, target: B.id, kinds, weight })
  flag isFirstDegree on nodes connected to currentUserId
  return { nodes, edges }
```

성능 고려:
- 회원 N=300 → 페어 ~45,000 → 동기 클러스터 평균 30명 → cohort 엣지 ~15K, identity 엣지 ~5K
- N=500 → ~125K 페어 → 약 250ms 빌드. 임계치: N=800 부터 Web Worker 권장
- MVP는 단일 스레드 빌드로 충분, useMemo 캐싱

### 3-3. 라이브러리

```bash
npm install reactflow
```

- 패키지: `reactflow` (~50KB gzip)
- 라이선스: MIT
- 의존: React 18+ (현 React 19 호환)
- shadcn/ui 디자인 토큰과 결합: Custom Node 컴포넌트로 우리 디자인 시스템 적용

---

## 4. 라우트·메뉴 구조

### 4-1. 신규 라우트
```
/network              ← 메인 페이지 (전공 네트워킹 map)
```

### 4-2. GNB 추가
`src/components/layout/Header.tsx` 의 "대학원 생활" 섹션에 신규 카테고리:

```
대학원 생활
├── 학사 도구
│   ├── 인지디딤판
│   ├── 내 수강과목
│   └── 캘린더
├── 구성원                       ← 기존
│   ├── 재학생 회원
│   └── 졸업생 회원
└── 네트워크                     ← 신규 섹션
    └── 전공 네트워킹 map (NEW)
```

### 4-3. 권한
- 회원 전용 (`AuthGuard`)
- 졸업생/자문위원 포함 — 본인이 보고 싶을 수 있음
- 비공개 옵션은 Phase 2

---

## 5. 고도화 로드맵 (Phase별)

### Phase 1: MVP (요청 핵심) — 2일

- [ ] reactflow 설치 + 기본 캔버스
- [ ] `NetworkGraph.tsx` 컴포넌트 — Custom Node·Edge
- [ ] `buildNetwork()` 빌더 함수 (코호트 + 신분 자동 추정)
- [ ] 컨트롤 패널 — 관계 유형 체크박스 + 1촌 토글 + 검색
- [ ] 노드 클릭 → 프로필 모달 (재사용: 기존 ProfileLite 또는 신규 mini)
- [ ] 본인 노드 강조 + 1촌 강조

### Phase 2: 프라이버시·확장 — 1일

- [ ] 마이페이지 → 네트워크 노출 토글 (`networkOptIn`)
- [ ] 노출 거부 회원은 노드 비표시 (본인 빼고 "익명 노드 N명" 카운트만 표시)
- [ ] Phase 2 첫 추가 차원: **학교급** (초/중/고/대학/기타)
  - User 타입에 `schoolLevel?: "elementary" | "middle" | "high" | "university" | "other"` 추가
  - 마이페이지 입력 필드
  - 관계 유형에 "같은 학교급" 추가

### Phase 3: 다차원 관계 — 1.5일

- [ ] 추가 차원:
  - **소속 교육청** (`affiliationOffice?: string`) — 자유 입력 + autocomplete
  - **관심 연구 키워드** (`researchInterests` 활용) — Jaccard 유사도 ≥ 0.3 시 엣지
- [ ] 컨트롤 패널 동적 — 관계 유형 6종까지 체크박스 자동 확장
- [ ] **선 색상 범례** 우측 항상 노출

### Phase 4: 분석·인사이트 — 2일

- [ ] **클러스터 자동 감지** (Louvain or Label Propagation)
  - 색상으로 클러스터 그룹 표시
  - 사이드 패널에 "내 클러스터 회원 N명" 표시
- [ ] **추천 카드**
  - "관심사가 비슷한 회원 5명" — 우측 사이드 카드
  - "최근 활동 활발한 동기 3명"
- [ ] **시계열** (졸업 시점에 따른 신분 변화 흐름) — 토글 시 노드를 입학연도 X축에 배치

### Phase 5: 운영·소셜 — 미정 (1년 후)

- 학회 행사 참석자 클러스터 자동 분석
- 신청자 추천 (관심 분야 기반)
- 메시지·1:1 연결 요청

---

## 6. 리스크·완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 회원 수 증가 시 그래프 렌더 성능 저하 | High (N=500+ 시 lag) | Web Worker 빌드 + 화면 밖 노드 가상화 + 클러스터 그룹화 옵션 |
| 프라이버시 — "내 정보가 그래프에 노출됨" 불편 | Medium | Phase 2 옵트아웃 토글 명시, 약관에 명시적 동의 추가 |
| 동기 정의 모호 (전반/후반 학기 차이) | Low | enrollmentYear+enrollmentHalf 정확 매칭만 (느슨한 동기는 옵션) |
| 모바일 화면에서 그래프 가독성 | High | 모바일은 노드/엣지 단순화 + 컨트롤 패널 sheet 형태 |
| 신규 데이터 필드(schoolLevel 등) 미입력 회원 다수 | Medium | "정보 없음" 그룹으로 분리, 입력 prompt (UndergradInfoPrompt 패턴 재사용) |

---

## 7. 비기능 요구사항

| 항목 | 기준 |
|------|------|
| 초기 로드 | 회원 N=200 기준 1.5s 이내 |
| 인터랙션 | pan/zoom 60fps |
| 검색 응답 | 200ms 이내 노드 강조 |
| 모바일 | 375px 이상 정상 동작 |
| 접근성 | 노드 키보드 네비게이션 (Tab → Enter), 색맹 친화 색상 (선 굵기 보조) |
| 다크 모드 | 동일 가시성 (design-tokens 시맨틱 토큰 활용) |

---

## 8. 작업 분해 (MVP)

### Phase Plan ✅ (본 문서)

### Phase Do — MVP (12~14h)
1. **타입·빌더** (3h)
   - `src/types/network.ts` — NetworkNode·Edge 정의
   - `src/features/network/build-network.ts` — 회원 배열 → 그래프 변환
   - vitest 테스트 — buildNetwork 정확성
2. **react-flow 설치 + 기본 캔버스** (1h)
3. **Custom Node + Custom Edge** (2h)
   - `src/features/network/MemberNode.tsx`
   - `src/features/network/RelationEdge.tsx`
   - 신분별 색상, 본인 강조, 1촌 강조
4. **메인 페이지** (3h)
   - `src/app/network/page.tsx`
   - AuthGuard, 회원 fetch (profilesApi.list), useMemo 빌드
   - 컨트롤 패널 (관계 체크박스 + 1촌 토글 + 검색)
5. **노드 클릭 모달** (1.5h)
   - 기존 ProfileCard 재사용 또는 신규 NetworkMemberDialog
6. **GNB 추가** (0.5h)
   - Header.tsx "대학원 생활" 섹션에 "네트워크" 카테고리 추가
7. **빌드/배포 검증 + Report** (1h)

### Phase Check — gap-detector + 시각 점검

### Phase Report

---

## 9. 결정 포인트 (사용자 추가 컨펌 권장)

| Q | 옵션 |
|---|------|
| Q1. Phase 2 의 "노출 옵트아웃" 을 MVP 에 미리 넣을지 | A. MVP 에 포함(권장 — 출시 후 cancel 부담 감소) / B. Phase 2 로 |
| Q2. 노드 클릭 시 — 미니 모달 vs 전체 프로필 페이지로 이동 | A. 미니 모달(권장 — 그래프 컨텍스트 유지) / B. 전체 프로필 |
| Q3. 본인이 노출 거부 시 — 본인 노드도 안 보이는지 | A. 본인 노드는 항상 보이게(권장) / B. 본인도 익명 처리 |
| Q4. Phase 1 출시 시점에 회원 수 N | 현재 약 ~?명 — N≥800 이면 Web Worker 우선 검토 |

### 권장 묶음
- Q1 A · Q2 A · Q3 A · Q4 회원 수 확인 후 결정

---

## 10. 산출물 예측 (MVP)

- 신규 파일 ~6개:
  - `src/types/network.ts`
  - `src/features/network/build-network.ts`
  - `src/features/network/MemberNode.tsx`
  - `src/features/network/RelationEdge.tsx`
  - `src/features/network/NetworkControls.tsx`
  - `src/app/network/page.tsx`
- 수정 파일 ~2개:
  - `src/components/layout/Header.tsx` (GNB 추가)
  - `package.json` (reactflow 추가)
- Commit: 4건 (타입+빌더 / 컴포넌트 / 페이지+GNB / 검증)
- Vercel 배포: 1회 (MVP 완료 후)

---

## 11. 일정

| 단계 | 시간 |
|------|------|
| Plan | 1h ✅ |
| Do — MVP (Phase 1) | 12~14h |
| Phase 2 (옵트아웃·학교급) | 8h |
| Phase 3 (다차원 관계·범례) | 12h |
| Phase 4 (클러스터·추천·시계열) | 16h |
| **MVP 합계** | **~14h** |
| **Phase 4까지 누적** | **~50h** |

---

> 다음: 사용자 §9 결정 포인트 컨펌 → `/pdca do major-network-map` 즉시 진입 → 단계 1 (타입·빌더) 부터.

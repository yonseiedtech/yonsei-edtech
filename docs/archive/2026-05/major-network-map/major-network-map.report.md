# 완료 보고서: 전공 네트워킹 Map MVP (major-network-map Phase 1)

> **작성일**: 2026-05-07
> **PDCA 단계**: Report
> **상태**: ✅ MVP(Phase 1) 완료 — Phase 2~4는 후속 사이클
> **참조**: [Plan](../archive/2026-05/major-network-map/major-network-map.plan.md)

---

## 1. 요약

대학원 생활 GNB 하위 "네트워크" 섹션에 **전공 네트워킹 Map** 신규. 노드(회원)+엣지(관계) 그래프로 동기·신분 자동 추정 시각화.

사용자 결정 사항 (AskUserQuestion 4건):
- 노드: **전체 회원 자동 노출**
- 관계: **동기(입학시점) + 신분 유형 (occupation+role) 자동 추정**
- 라이브러리: **react-flow**
- MVP 기능 4종 모두: 관계 체크박스 필터 / 노드 클릭→프로필 미니 모달 / 1촌 토글 / 검색

§9 결정 포인트 4건:
- 옵트아웃 토글: Phase 2로 이행
- 노드 클릭: 미니 모달 (그래프 컨텍스트 유지)
- 본인 노드: 항상 동일 표시
- 회원 규모: 100명 이하 → 단일 스레드 빌드 충분

---

## 2. 산출물 (12개 파일)

| 파일 | 역할 |
|------|------|
| `src/types/network.ts` | NetworkNode/Edge/RelationKind/FilterState |
| `src/features/network/build-network.ts` | User[] → 그래프 변환 (cohort + identity 페어 매칭) |
| `src/features/network/__tests__/build-network.test.ts` | vitest 7건 (rejected 필터 / cohort / identity / kinds 합집합 / isMe + isFirstDegree / null cohortKey / weight) |
| `src/features/network/MemberNode.tsx` | react-flow Custom Node (신분별 색상, 본인/1촌 사이즈, 노드 아래 전체 이름·기수 라벨 항상 표시) |
| `src/features/network/NetworkControls.tsx` | 검색·관계 체크박스·1촌 토글·통계 |
| `src/features/network/MemberMiniDialog.tsx` | 노드 클릭 → 미니 모달 (Avatar + Badge × 3 + 관심 키워드 + 프로필 페이지 링크) |
| `src/features/network/NetworkGraph.tsx` | react-flow 통합 + 간이 원형 레이아웃 (본인 중심·1촌 안쪽 원·기타 바깥 원, cohort 그룹화) |
| `src/app/network/page.tsx` | AuthGuard + 좌측 컨트롤 / 우측 그래프 2-col 레이아웃 |
| Header GNB | "대학원 생활" → "네트워크" → "전공 네트워킹 Map" 신규 섹션 |

의존성: `reactflow ^11` (~50KB gzip, MIT)

---

## 3. 그래프 빌드 알고리즘

```
buildNetwork(users: User[], currentUserId):
  approved = users.filter(u => u.approved && !u.rejected)
  for each pair (A, B), A.id < B.id:
    kinds = []
    if A.cohortKey === B.cohortKey (둘 다 not null): kinds.push("cohort")
    if A.identityKey === B.identityKey:               kinds.push("identity")
    if kinds.length > 0:
      edges.push({source: A, target: B, kinds, weight: calcWeight(kinds)})

  flag isFirstDegree on nodes connected to currentUserId
  return { nodes, edges }

calcWeight: identity 1.5 / cohort 2.5 / 둘 다 3.5 (cap)
```

---

## 4. UI 동작

| 요소 | 동작 |
|------|------|
| **본인 노드** | 큰 원(56px) + ring-2 ring-primary + shadow-md + 라벨 primary 톤 |
| **1촌 노드** | 중간 원(44px) + ring-2 |
| **그 외** | 기본 원(36px) + ring-1 |
| **선** | 동기 = primary 굵음(2.5) / 신분 = muted 보통(1.5) / 둘 다 = 가장 굵음(3.5) |
| **체크박스 필터** | 동기 / 신분 — 둘 다 ON 시 합집합, 둘 다 OFF 시 노드만 |
| **1촌만** | 본인 + 직접 연결된 노드만 + 본인-1촌 엣지만 |
| **검색** | 이름·기수 매치 노드 강조 + 비매치 dim |
| **노드 클릭** | 미니 모달 (Avatar + 이름·기수·신분 배지 + 관심 키워드 + "프로필 페이지 열기" 링크) |
| **인터랙션** | 휠 줌, 드래그 팬, 우하단 미니맵·줌 컨트롤, 노드 드래그 가능 |

---

## 5. 검증

- vitest 7/7 통과 (build-network.test.ts)
- `npx tsc --noEmit` + `npm run build` + `npx vercel --prod` 모두 통과
- /network ○ static prerendered 라우트로 등록

---

## 6. Commit·배포

| Commit | 내용 |
|--------|------|
| `93df2c3a` | MVP — 12개 파일 + reactflow 의존성 |
| `12fe58bc` | 노드 라벨 전체 이름 표시 (사용자 요청) |

배포: `https://yonsei-edtech.vercel.app/network` ✅

---

## 7. 후속 — Phase 2~4 (별도 PDCA 권장)

| Phase | 내용 | 추정 |
|-------|------|------|
| **Phase 2** | 옵트아웃 토글 (`networkOptIn`) + 학교급 (`schoolLevel`) 차원 추가 | 8h |
| **Phase 3** | 교육청 (`affiliationOffice`) + 관심사 Jaccard 유사도 + 색상 범례 | 12h |
| **Phase 4** | 클러스터 자동 감지 (Louvain) + 추천 카드 + 시계열 뷰 | 16h |

→ 회원 800명 이상 시 Web Worker 빌드 + 가상화 검토 필요.

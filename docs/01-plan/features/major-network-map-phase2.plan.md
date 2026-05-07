# Plan: 전공 네트워킹 Map Phase 2 (major-network-map-phase2)

> **작성일**: 2026-05-07
> **PDCA 단계**: Plan
> **추정 작업량**: 8h
> **선행**: [Phase 1 MVP 보고서](../archive/2026-05/major-network-map/major-network-map.report.md)

---

## 1. 목적

MVP에서 의도적으로 미뤘던 두 가지를 구현:
1. **노출 옵트아웃** — 마이페이지에서 본인 노출 끄기 (프라이버시)
2. **학교급 차원** — 동기·신분에 이어 세 번째 관계 차원 추가

---

## 2. 범위

### F2-1: 옵트아웃 토글 (~3h)
- `User.networkOptIn?: boolean` 신규 (default: true — 미설정 시 노출)
- `false` 명시한 회원은 그래프에서 노드 비노출
- 본인은 항상 자기 노드 보임 (사용자 결정대로)
- 옵트아웃한 회원 수는 그래프 통계에 "비공개 N명" 으로만 카운트
- 마이페이지 → 알림·노출 설정 영역에 토글 추가

### F2-2: 학교급(schoolLevel) 차원 (~5h)
- `User.schoolLevel?: SchoolLevel` 신규 (`"elementary" | "middle" | "high" | "university" | "etc"`)
- `SCHOOL_LEVEL_LABELS` 상수
- 마이페이지 → 직업/소속 영역에 select 입력
- `NetworkRelationKind` union 에 `"school_level"` 추가
- `build-network.ts` — 같은 schoolLevel 페어에 엣지 추가 (weight 1.5, identity 와 합쳐지면 더 굵음)
- `NetworkControls` — 학교급 체크박스 추가 (3 row)
- `NetworkGraph` — school_level 엣지 색상 (emerald — Plan §2-2)

---

## 3. 데이터 호환

| 항목 | 호환 |
|------|------|
| 기존 `networkOptIn`/`schoolLevel` 미설정 회원 | 둘 다 default — 노출 ON, schoolLevel undefined → 학교급 매칭 안 됨 |
| 그래프 빌드 | undefined schoolLevel 페어는 매칭 제외 (cohort 방식과 동일) |
| 기존 옵션 | NetworkRelationKind 2종(cohort/identity) 그대로 — 신규 1종 추가 |

---

## 4. 검증

- vitest — buildNetwork 추가 케이스 (schoolLevel + opt-out)
- 마이페이지에서 토글 ON/OFF 즉시 반영 확인
- /network 에서 옵트아웃 회원 카운트만 표시되는지 확인
- 학교급 체크박스 ON 시 추가 엣지 표시 확인

---

## 5. 산출물

- `src/types/user.ts` — `networkOptIn`, `schoolLevel`, `SCHOOL_LEVEL_LABELS`
- `src/types/network.ts` — `NetworkRelationKind` 확장
- `src/features/network/build-network.ts` — opt-out 필터 + schoolLevel 매칭
- `src/features/network/NetworkControls.tsx` — 학교급 체크박스 + 통계 보강
- `src/features/network/NetworkGraph.tsx` — school_level 엣지 색상
- `src/app/network/page.tsx` — 비공개 회원 카운트 노출
- `src/features/profile/...` (또는 mypage 영역) — 마이페이지 입력 UI 2건

---

## 6. 일정

| 단계 | 시간 |
|------|------|
| Plan | 0.5h ✅ |
| F2-1 옵트아웃 | 3h |
| F2-2 학교급 차원 | 5h |
| Build/Deploy/Report | 1h |
| **합계** | **~9.5h** |

---

> 다음: 즉시 F2-1 부터.

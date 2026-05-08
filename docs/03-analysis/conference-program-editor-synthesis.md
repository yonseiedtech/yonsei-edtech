# 학술대회 프로그램 편집기 — 통합 고도화 제안서 (Codex × Claude)

> **작성일**: 2026-05-08
> **분석 모델**: Codex (codex-rescue) + Claude Sonnet 4.6 (designer)
> **대상**: `ConferenceProgramEditor.tsx` (운영진용 편집기) + 진입 라우트 2종
> **참조 단독**: [`conference-program-editor-uiux-claude.md`](./conference-program-editor-uiux-claude.md)

---

## 0. 분석 메타

| 항목 | Codex | Claude designer |
|------|-------|-----------------|
| 시각 | 엔지니어링·데이터 무결성·낙관적 잠금 | 정보 위계·SessionCard 추상·자동저장·매트릭스 뷰 |
| 강한 발견 | 시간 충돌 미검증 / `updatedAt` 비교 없는 저장 / React Query 부재 / 발표자 split 한계 | 세로 스크롤 무한 / 정보 밀도 과부하 / AI 추출 묻힘 / 자동저장 없음 |
| 결과물 | 8건 매트릭스 + Phase 1~3 | UI 7건 + UX 5건 + Quick Wins 5선 + Phase 1~3 (84~102h) |

→ 두 모델이 서로 다른 결함을 잡음. **공통 P0** (저장 전 검증 + 자동저장 + 시간 충돌)이 명확하게 떠오름.

---

## 1. 양 모델 합의 — 신뢰도 높은 P0/P1

### 🔴 P0 (즉시 작업 권장)

| ID | 항목 | Codex | Claude | 근거 |
|----|------|-------|--------|------|
| ★A | **저장 전 필수값·시간 순서 검증** | ✅ | ✅ (UX-05) | 빈 제목·종료<시작·중복 일자 검증 부재 |
| ★B | **시간 충돌 인라인 경고** | ✅ | ✅ (UI-07) | 동일 일자 내 시간 겹침 — 운영자에게 즉시 피드백 |
| ★C | **자동저장(debounced) + dirty 상태** | ✅ | ✅ (UX-02·QW4) | 수동 저장만 → 데이터 소실 위험. 30~60s debounce |

### 🟡 P1

| ID | 항목 | Codex | Claude |
|----|------|-------|--------|
| M1 | React Query 도입 (academic-admin 페이지·편집기 중복 로드 제거) | ✅ | (간접) |
| M2 | `updatedAt`/version 기반 낙관적 잠금 | ✅ | (간접) — 협업 편집 |
| M3 | SessionCard 접기/펼치기 (정보 밀도 ↓) | (간접) | ✅ UI-02 |
| M4 | DayTabBar 고정 (sticky) | (간접) | ✅ UI-01 |
| M5 | CategoryPickerButton + 색상 미리보기 | (간접) | ✅ UI-03 |
| M6 | 시간 슬롯 드롭다운 (HH:MM 입력 부담 ↓) | (간접) | ✅ UI-04 |
| M7 | 발표자 다중 엔티티 입력 (Chip + 매칭) | ✅ | ✅ UI-05 |
| M8 | 드래그 순서 변경 (@dnd-kit) | (간접) | ✅ UI-06 |
| M9 | 첫 등록 온보딩 (AI 추출 vs 직접 입력 분기) | (간접) | ✅ UX-01 |

### 🟢 P2

| ID | 항목 |
|----|------|
| N1 | CSV/Excel 일괄 가져오기·붙여넣기 |
| N2 | 트랙 매트릭스 뷰 (시간×트랙 grid) |
| N3 | 인쇄/PDF/CSV 내보내기 |
| N4 | 실시간 협업 편집 (Yjs/Liveblocks) |

---

## 2. 모델별 고유 발견

### Codex 단독 (엔지니어링·데이터 무결성)

| 항목 | 인사이트 |
|------|---------|
| 데이터 모델에 `version` 필드 부재 | 동시 편집 시 후저장이 전저장 덮어씀 — 학회 직전 운영진 다수가 편집할 때 위험 |
| 발표자 = 콤마 split 문자열 | 다중 발표자·소속 매칭 부담 (예: "김OO·이OO" 배분 어려움) |
| `useEffect + Promise.all` 중복 로드 | 페이지 + 편집기가 같은 데이터 두 번 fetch |
| 병합 검사가 제목만 | 같은 제목·같은 시간 중복 세션 감지 안 됨 |

### Claude Designer 단독 (UX·시각 시스템)

| 항목 | 인사이트 |
|------|---------|
| **세로 스크롤 무한** | 세션 20+ 시 네비게이션 수단 없음 → DayTabBar sticky 필요 |
| **AI 추출 발견성 낮음** | 가장 가치 큰 기능이 작은 메타 카드 안에 묻힘 — 첫 등록 화면의 큰 CTA로 격상 |
| **SessionCard 접기/펼치기** | 7~8 필드 항상 노출 → 카드 헤더만 보고 펼쳐서 편집 |
| **CategoryPickerButton** | select 대신 색상 칩 그리드 팝오버 — 시각적 빠른 선택 |
| **시간 슬롯 드롭다운** | HH:MM 텍스트 입력 부담 → 15분/30분 단위 슬롯 선택 |
| **발표자 Chip 입력** | 콤마 대신 Enter 시 chip 생성 + 회원 자동완성 |
| **@dnd-kit 드래그 순서** | 시간 입력 없이 순서 변경 가능 (시간은 자동 재배치) |
| **트랙 매트릭스 뷰** | 시간×트랙 grid 로 병렬 트랙 한눈에 |
| **AI 추출 vs 직접 입력 분기** | 첫 등록 시 두 갈래 분명히 |

---

## 3. 통합 우선순위 매트릭스

> ★ 양 모델 합의 / ◎ Codex / ◇ Claude

| ID | 항목 | 영향 | 난이도 | 우선 |
|----|------|------|--------|------|
| ★A | 저장 전 검증 (필수값·시간 순서·중복) | High | Low | **P0** |
| ★B | 시간 충돌 인라인 경고 | High | Medium | **P0** |
| ★C | 자동저장(debounced) + dirty 표시 | High | Medium | **P0** |
| ◇M3 | SessionCard 접기/펼치기 | High | Medium | **P1** |
| ◇M4 | DayTabBar sticky | High | Low | **P1** |
| ◎M1 | React Query 도입 | Medium | Medium | **P1** |
| ◇M5 | CategoryPickerButton 색상 팝오버 | Medium | Low | **P1** |
| ◇M6 | 시간 슬롯 드롭다운 | Medium | Low | **P1** |
| ★M7 | 발표자 Chip + 회원 자동완성 | High | Medium | **P1** |
| ◇M8 | @dnd-kit 드래그 순서 | Medium | High | **P2** |
| ◎M2 | 낙관적 잠금 (`updatedAt`/version) | High | Medium | **P2** |
| ◇M9 | 첫 등록 AI vs 직접 입력 분기 | High | Medium | **P2** |
| N1 | CSV/Excel 일괄 가져오기 | High | High | **P3** |
| N2 | 트랙 매트릭스 뷰 | Medium | High | **P3** |
| N3 | 인쇄/PDF/CSV 내보내기 | Medium | Medium | **P3** |
| N4 | 실시간 협업 편집 | Medium | High | **P3** |

---

## 4. 고도화 프로젝트 — 4 Phase 로드맵

### Phase 0 — 데이터 안전·무결성 (P0, ~1.5일)
**목표**: 데이터 소실·시간 오류 즉시 차단.

| 작업 | 산출물 |
|------|--------|
| `handleSave` 직전 검증 함수 신규 (필수값·시간·중복 일자) | `validateProgram()` 헬퍼 |
| 시간 입력 주변 인라인 충돌 경고 (`AlertTriangle ring-rose-400/40`) | SessionRow 시간 필드 |
| 자동저장 — useDebouncedCallback 30s + dirty 상태 표시 ("저장 안 됨"/"저장 중"/"저장됨") | useEffect + state |
| 검증 실패 시 저장 방지 + 친화적 메시지 | toast.error + scrollIntoView |

### Phase 1 — 편집 UX 기본 고도화 (P1, ~3~4일)
**목표**: 운영진 입력 부담 절감.

| 작업 | 효과 |
|------|------|
| DayTabBar sticky (top-0 z-20 + bg-background/95) | 일자 컨텍스트 보존 |
| `SessionCard` 접기/펼치기 (Collapsible — 헤더만 보고 펼쳐서 편집) | 세션 20+ 시 가독성 ↑ |
| `CategoryPickerButton` — 색상 칩 그리드 팝오버 | 빠른 카테고리 선택 |
| 시간 슬롯 드롭다운 (15분 단위) — HH:MM 텍스트 입력과 병행 | 입력 부담 ↓ |
| 발표자 Chip 입력 + 회원 자동완성 (학번/이름 매칭) | 다중 발표자 입력 정확 |
| React Query — `useConferenceProgram(activityId)` 훅으로 통합 | 중복 로드 제거 |

### Phase 2 — 협업·온보딩·고급 인터랙션 (P2, ~3~4일)

| 작업 | 효과 |
|------|------|
| 낙관적 잠금: 저장 시 서버 `updatedAt` 비교, 충돌 시 사용자 선택 | 동시 편집 안전 |
| @dnd-kit 드래그 순서 변경 — 시간 자동 재배치 | 시간 재입력 없이 순서 조정 |
| 첫 등록 온보딩 — "AI 자동 추출(이미지/PDF)" vs "직접 입력" 분기 카드 | AI 기능 발견성 ↑ |
| 자동저장 실패 시 재시도 + 사용자 알림 | 안정성 ↑ |

### Phase 3 — 일괄 가져오기·매트릭스 뷰·내보내기 (P3, ~5~7일)

| 작업 | 효과 |
|------|------|
| CSV/Excel 붙여넣기·가져오기 (시간·트랙·제목·발표자 컬럼) | 큰 학회 입력 부담 한 번에 해결 |
| 트랙 매트릭스 뷰 (시간×트랙 grid) | 병렬 트랙 한눈에 + 충돌 즉시 인지 |
| 인쇄/PDF 내보내기 (PersonalSchedulePdfDocument 패턴 재사용) | 운영진 인쇄 수요 |
| CSV 내보내기 (회원 일정 분석용) | 외부 활용 |

### Phase 4 (선택) — 실시간 협업 편집 (Yjs/Liveblocks)
- 학회 직전 운영진 다수 동시 편집 시나리오 — Phase 2 낙관적 잠금이 1차 방어, 본 Phase 는 진화

---

## 5. Quick Wins (10시간 이내 묶음)

Claude designer Quick Wins 5선:
1. **DayTabBar sticky** (2h) — 일자 탭 고정
2. **SessionCard 접기/펼치기** (3h) — Collapsible UI
3. **CategoryPickerButton** (2h) — 색상 칩 팝오버
4. **AutoSave (debounced)** (2h) — 30s 자동저장 + 상태 표시
5. **저장 전 시간 역전 경고** (1h) — endTime < startTime 검증

→ 약 10시간 작업 묶음. P0 (저장 전 검증) 일부 + P1 시각 위계 일부 묶어 즉시 가치 가시화 가능.

---

## 6. 두 모델 시각 차이 정리

1. **Codex**: 데이터 무결성·낙관적 잠금·React Query 캐시 — "운영 사고 방지" 시각.
2. **Claude designer**: SessionCard 추상·DayTabBar sticky·매트릭스 뷰·온보딩 — "운영진 인지 부하 절감" 시각.
3. **공통 P0** = 저장 전 검증 + 시간 충돌 + 자동저장 — 두 시각이 동시에 가리킨 핵심.
4. 권장: Phase 0 (P0 3건) 즉시 → Phase 1 (UX 기본) → Phase 2 (협업·온보딩) → Phase 3 (일괄 가져오기·매트릭스).

---

## 7. 다음 진입 옵션

| 옵션 | 내용 | 시간 |
|------|------|------|
| **A** | Phase 0 (P0 3건) 단독 PDCA — 학회 직전 데이터 안전 우선 | ~1.5일 |
| **B** | Phase 0 + Phase 1 묶음 (편집 UX 기본 고도화) | ~5일 |
| **C** | Quick Wins 5건 1일 PDCA → Phase 0 → 별도 단계 | ~1일 + α |
| **D** | 전체 Phase 0~3 단일 PDCA | ~13일 |

**권장**: 학회 운영 직전이라면 옵션 A. 평시라면 옵션 B (Phase 0+1).

---

> 본 통합 리포트는 두 모델의 병렬 분석 결과를 비교·우선순위 매트릭스로 재구성한 메타 분석입니다.
> 단독 리포트는 [`conference-program-editor-uiux-claude.md`](./conference-program-editor-uiux-claude.md) 참조.

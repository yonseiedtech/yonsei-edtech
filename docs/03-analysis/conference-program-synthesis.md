# 학술대회 프로그램 페이지 — 통합 개선 분석 (Codex × Claude)

> **작성일**: 2026-05-08
> **분석 모델**: Codex (codex-rescue) + Claude Sonnet 4.6 (designer)
> **대상**: `/activities/external/[id]/program` (+ `/qr` `/checkin` `/roundup`)
> **참조 단독 리포트**:
> - [Claude designer 단독](./conference-program-uiux-claude.md) — 시각·UX·컴포넌트 시스템 (3,500자, 284줄)
> - Codex 분석 결과 — 엔지니어링·보안·데이터 정합성 (본 문서 §1·§2 인용)

---

## 0. 분석 메타

| 항목 | Codex | Claude designer |
|------|-------|-----------------|
| 시각 | 엔지니어링·보안·데이터 흐름 | 디자이너·페르소나·컴포넌트 시스템 |
| 강한 발견 영역 | QR 토큰 무서명, 운영진 guard 누락, React Query 캐시 부재, attended 무결성 | 시각 위계, 카드 추상화 부재, 다크 모드 누락, sticky now-line |
| 결과물 | 9건 매트릭스 + Phase 0~3 (10일+) | UI 7건 + UX 5건 + Quick Wins 5선 + Phase 1~3 (~31h) |

→ 두 시각이 **서로 다른 결함을 잡음**. Codex = "당장 보안·정합성 깨짐", Claude = "시스템 부채·UX 마찰". 통합하면 P0(보안)부터 P3(고도화)까지 일관 로드맵 가능.

---

## 1. 양 모델 합의 — 신뢰도 높은 P0/P1

### 🔴 P0 (즉시 작업 권장)

| ID | 항목 | Codex | Claude | 영향 |
|----|------|-------|--------|------|
| C1 | **QR 보드 운영진 권한 누락** (`/qr/page.tsx:49`) | ✅ | (미터치) | 모든 사용자가 QR 발급 페이지 접근 가능 — **보안 결함** |
| C2 | **체크인 토큰 무서명** (`ConferenceCheckinScanner.tsx:18`) | ✅ | (미터치) | `yet-conf:programId:sessionId` 평문 — 복제·공유 가능 |
| C3 | **수동 후기 저장 = attended** (`ConferenceProgramView.tsx:258`) | ✅ | UX-02 (Dialog 마찰)와 결합 | 실제 참석 안 해도 attended 기록 — 통계 신뢰성 ↓ |
| C4 | **카테고리 카드 시각 위계 평탄** | (간접 언급) | ✅ UI-01 | keynote와 break이 같은 카드 외형 — 정보 위계 사라짐 |

### 🟡 P1

| ID | 항목 | Codex | Claude |
|----|------|-------|--------|
| M1 | React Query 캐시 미사용 (직접 useEffect fetch) | ✅ | (간접 — Stat 중복) |
| M2 | URL/state 미동기화 (day/view/filter 새로고침 시 손실) | ✅ | (간접) |
| M3 | 다크 모드 카테고리 색상 누락 (`academic.ts:152`) | ✅ | ✅ |
| M4 | SessionCard 추상화 부재 (View·Stats·Roundup 3곳 복제) | (간접) | ✅ |
| M5 | EmptyState 컴포넌트 미사용 (인라인 div 사용) | (간접) | ✅ UI-05 |
| M6 | 즐겨찾기 ≠ 참석 계획 분리 부재 | ✅ | ✅ UX-02 |
| M7 | Sticky day/time 헤더 부재 (모바일 컨텍스트 손실) | (간접) | ✅ UI-04 |

---

## 2. 모델별 고유 발견

### Codex 단독 (엔지니어링 디테일)

| 항목 | 인사이트 |
|------|---------|
| `allPlans` 미갱신 (View:195) | 세션 선택 후 "함께 참석" 카운트가 stale — UI 불일치 |
| 조회 오류 은닉 (Scanner:56, QrBoard:31) | catch 없이 finally 만 — 디버깅 어려움 |
| `aria-pressed` 누락 (별점 버튼) | 키보드/스크린리더 사용자 상태 미파악 |
| 라운드업 작성자명 직접 노출 | 익명·공개 옵션 부재 → 후기 작성 망설임 가능 |
| PDF 비공개 메모 노출 위험 | 출력 시 옵션 다이얼로그 부재 |

### Claude Designer 단독 (시각·UX 시스템)

| 항목 | 인사이트 |
|------|---------|
| 카드 좌측 시간 컬럼 분리 (Sched/Whova 패턴) | 60-80px 고정 — 시간 흐름이 시각 리듬화 |
| Now-line + 점멸 인디케이터 | "지금 진행 중" 세션 즉시 식별 |
| 충돌 카드 시각 강화 | `ring-2 ring-rose-400/50` 또는 우측 세로 줄무늬 |
| break/networking 압축 카드 | 정보 위계 격상의 인지 부하 절감 |
| QR 다크 색상 하드코딩 (`fgColor="#0a2e6c"`) | 다크 배경에서 스캔 불가 |
| PDF 카테고리 색상 바 (좌측 1열) | 인쇄 가독성 개선 |
| Stat 헬퍼 중복 (View + Roundup) | 컴포넌트 추출 시그널 |

---

## 3. 통합 우선순위 매트릭스

> ★ 양 모델 합의 / ◎ Codex / ◇ Claude

| ID | 항목 | 영향도 | 난이도 | 우선 |
|----|------|--------|--------|------|
| ★A | QR 보드 운영진 guard | High | Low | **P0** |
| ★B | 체크인 토큰 서버 서명 + 만료 | High | Medium | **P0** |
| ★C | attended 자동 전환 = QR 스캔 + 운영확인 only | High | Low | **P0** |
| ★D | 카드 시각 위계 (keynote/standard/compact) | High | Low | **P0** |
| ★E | EmptyState 컴포넌트 통일 | Medium | Low | **P0** |
| ★F | SessionCard 추상화 | Medium | Medium | **P1** |
| ★G | React Query 도입 + invalidate | High | Medium | **P1** |
| ★H | URL state 동기화 (day/view/filter) | Medium | Low | **P1** |
| ★I | 다크 모드 색상 토큰 (CONFERENCE_SESSION_CATEGORY_COLORS) | High | Low | **P1** |
| ★J | Sticky day 탭 + now-line | High | Medium | **P1** |
| ◎K | allPlans 즉시 upsert | Medium | Low | **P1** |
| ◇L | 카드 좌측 시간 컬럼 분리 | High | Medium | **P1** |
| ◇M | 충돌 카드 시각 강화 (ring/줄무늬) | Medium | Low | **P1** |
| ◇N | break/networking 압축 카드 variant | Medium | Low | **P1** |
| ◎O | 라운드업 작성자명 익명·공개 옵션 | Medium | Low | **P2** |
| ◎P | PDF 비공개 메모 출력 옵션 | Medium | Low | **P2** |
| ◎Q | 조회 오류 surface (catch + retry) | Medium | Low | **P2** |
| ◎R | 별점 buttons aria-pressed | Low | Low | **P2** |
| ◇S | QR 다크 색상 동적 (CSS variable) | Medium | Low | **P2** |
| ◇T | PDF 카테고리 색상 바 | Low | Low | **P2** |
| ◇U | 마이크로 인터랙션 (framer-motion) | Low | Low | **P3** |

---

## 4. 개선 프로젝트 — 4 Phase 로드맵 (총 ~3주)

### Phase 0 — 보안·무결성 (P0, 1.5~2일)
**목표**: 운영 기능 보호 + 참석 통계 신뢰성 회복.

| 작업 | 파일 |
|------|------|
| QR 보드 운영진 guard | `qr/page.tsx` |
| 체크인 토큰 서버 서명 (HMAC + 만료) | `api/conference-checkin` 신규 + Scanner 갱신 |
| attended 전환을 QR 스캔/운영진 확인으로만 한정 | `ConferenceProgramView.tsx:222,250,258` |
| 카드 시각 위계 3종 variant + EmptyState 적용 | `ConferenceProgramView.tsx`, `Stats`, `Roundup` |

### Phase 1 — 데이터 정합성 + 컴포넌트 시스템 (P1 일부, 3~4일)
**목표**: React Query 도입 + SessionCard 추상화 + 토큰 일관성.

| 작업 | 산출물 |
|------|--------|
| React Query queryKey 표준화 (`conference-program`, `conference-plans`, `conference-roundup`) | hooks 신규 |
| mutation 후 invalidate (선택→allPlans, 후기→roundup) | View + Roundup |
| URL searchParams 동기화 (`?day=&view=&filter=`) | View |
| `SessionCard` 컴포넌트 추출 + 3종 variant (primary/standard/compact) | features/conference/SessionCard.tsx |
| `Stat` 컴포넌트 추출 (View + Roundup 공유) | features/conference/Stat.tsx |
| `CONFERENCE_SESSION_CATEGORY_COLORS` 다크 변형 추가 | `academic.ts` |
| EmptyState 일괄 적용 (View/Stats/Roundup) | 3 파일 |

### Phase 2 — 탐색 UX 강화 (P1 잔여, 3~4일)
**목표**: 모바일 컨텍스트 보존 + 충돌 시각화 + 즐겨찾기 분리.

| 작업 | 효과 |
|------|------|
| Sticky day 탭 (`position: sticky top-0`) + 일자 컨텍스트 보존 | 모바일 스크롤 친화 |
| Now-line + 진행 중 세션 점멸 인디케이터 | 실시간 안내 |
| 카드 좌측 시간 컬럼 (60-80px, font-mono) | 시간 흐름 시각 리듬 |
| 충돌 카드 강화 (`ring-rose-400/50` + 클릭 가능 링크) | 충돌 즉시 인지 |
| break/networking 압축 variant (py-2, text-only) | 정보 위계 격상 |
| 즐겨찾기·관심 마크 (북마크) — 참석 계획과 분리 | UserSessionPlan 외에 별도 모델 또는 sub-status |

### Phase 3 — 운영 리포팅·보호 (P2, 2~3일)
**목표**: 라운드업 익명화 + PDF 옵션 + 체크인 피드백.

| 작업 | 산출물 |
|------|--------|
| 라운드업 작성자명 공개 범위 (익명/실명/공유 회원) | `UserSessionPlan` 또는 review-side flag |
| PDF 출력 시 비공개 메모 포함 다이얼로그 | `PersonalSchedulePdfDocument` 옵션 prop |
| QR 다크 색상 동적 (`var(--qr-fg)`) | `ConferenceCheckinQrBoard` |
| PDF 카테고리 색상 바 (좌측 1열) | PDF 디자인 |
| 체크인 성공/실패 피드백 강화 (진동·음향·오류) | `ConferenceCheckinScanner` |
| 조회 오류 retry 버튼 + error state | Scanner + QrBoard |
| 별점 `aria-pressed` 보강 | View |

### Phase 4 — 마이크로 인터랙션·다듬기 (P3, 1일, 선택적)
- StatCard hover lift, framer-motion + useReducedMotion
- 인쇄 최적화 (QR 보드 여백·폰트)
- 키보드 네비게이션 보강

---

## 5. Quick Wins (1일 이내, 묶음)

Claude designer가 제시한 5건 + Codex P0 일부:
1. **(Claude QW1)** break/networking 카드 → `py-2` 압축 variant — 10분
2. **(Claude QW2)** 체크인 후 후기 prompt CTA 자동 — 20분
3. **(Claude QW3)** 다크 모드 배지 dark 변형 1줄씩 추가 — 15분
4. **(Claude QW4)** PDF 카테고리 색상 바 — 1줄 변경 — 10분
5. **(Claude QW5)** Stat 컴포넌트 추출 — 20분
6. **(Codex P0-A)** QR 보드 운영진 guard — 15분
7. **(Codex P0-C)** attended 자동 전환 차단 — 30분

→ 약 2시간 작업 묶음으로 즉시 가치 가시화 가능.

---

## 6. 두 모델 시각 차이에 대한 메타 관찰

1. **Codex**: 보안·데이터 정합성을 빠르게 본다 — QR 토큰 무서명, 운영진 guard 부재, attended 자동 전환은 즉시 운영 영향 있는 결함.
2. **Claude designer**: 시스템 부채를 깊게 본다 — 카드 추상화 부재, 토큰 일관성, sticky now-line 등 6개월 뒤 부채로 자라는 항목.
3. **공통 발견** (★ 표기)이 P0/P1 후보 핵심 — 두 시각이 동시에 가리킨 곳은 무조건 진행.
4. **개별 발견의 가치 차이**: Codex는 "운영 사고 방지", Claude는 "사용자 경험 향상" — 둘 다 필요한데 단계 분리.
5. **권장 운영 패턴**: 학술대회 직전(Phase 0) → 정합성(Phase 1) → 평시 UX(Phase 2~3).

---

## 7. 추천 진입 시퀀스

| 옵션 | 내용 | 시간 |
|------|------|------|
| **A** | Phase 0 (보안 P0) 단독 PDCA — 학술대회 행사 직전 즉시 적용 | ~2일 |
| **B** | Phase 0 + Phase 1 묶음 PDCA (정합성·컴포넌트 시스템) | ~5일 |
| **C** | Quick Wins 7건 1일 PDCA → Phase 0 → 별도 Phase | ~1일 + α |
| **D** | 전체 Phase 0~3 단일 PDCA (3주) | ~15일 |

→ **권장**: 학회 행사 시점이 임박했다면 옵션 A (Phase 0 단독). 평시라면 옵션 B (Phase 0+1).

---

> 본 통합 리포트는 두 모델의 병렬 분석 결과를 정량 비교 + 통합 우선순위 매트릭스로 재구성한 메타 분석입니다.
> 단독 리포트: [`conference-program-uiux-claude.md`](./conference-program-uiux-claude.md)
> Codex 단독은 본 문서 §1·§2 표·매트릭스에 통합 인용.

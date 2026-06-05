# v4 작업 계획 — 사이클 2 (Re-Write)

> **선행**: v3 작성 완료 (2026-06-01) + tables_check.csv 정합성 점검 + Codex 리뷰(진행 중) + Claude critic 리뷰(진행 중)
> **목적**: v3의 잔존 결함 + 두 리뷰 산출물의 Critical/Major 항목을 통합 반영하여 투고 직전 수준의 final.v4.md 도출
> **산출물**: `theory-implementation-matrix.final.v4.md`, `theory-implementation-matrix.final.v4.docx`

---

## A. tables_check.csv 자체 발견 (v3 → v4 우선 반영)

| ID | 발견 | 위치 | 조치 |
|----|------|------|------|
| T1 | Table 1 정렬 오류 — Formative Assessment(1.44) > Cognitive Apprenticeship(1.33)인데 Cog.App.가 위에 위치 | §4.2 Table 1 | row_mean 내림차순으로 재정렬, 또는 alphabetical 등 명시적 정렬 기준 본문에 표기 |
| T2 | 클러스터 narrative "동기 군집 7-8 도메인" — SRL=5이므로 범위가 5-8이 정확 | §4.2 라인 275 + §6.1 명제 1 | "5-8개 도메인"으로 정정 + 클러스터별 평균 도메인 수 추가 가능 |
| T3 | L2 ↔ F2 pairing 약함 — F2는 consent gate 효과 측정이지 insider bias 직접 대응이 아님 | §5.5 | F2를 "외부 평가자 풀 확장 + 다른 학회 재평가" 트랙으로 재서술 |
| T4 | L4 ↔ F4 pairing 약함 — F4는 wizard segmentation 효과 측정이지 시스템 진화 매트릭스 변동 대응이 아님 | §5.5 | F4를 "Phase 2-4 시점의 매트릭스 재평가 종단" 트랙으로 재서술 |
| T5 | L6 phrasing "양적 단일 설계" — 본 논문은 framework synthesis이므로 양적 설계 자체가 아님 | §5.5 | "framework synthesis 단독 한계 — 양적 검증 부재" 또는 "혼합 방법론 부재"로 재서술 |

## B. v3 부가 점검 결과

| ID | 발견 | 위치 | 조치 |
|----|------|------|------|
| V1 | "본 ~" 자기지시 50회 (v2 44 → v3 50) — 결론 §6 재작성 시 증가 | 전 영역 | "본 매트릭스", "본 사례"를 일부 "이 매트릭스/이 사례/여기서"로 분산 — 목표 35회 이하 |
| V2 | "시사한다" 4회 (산발) — Charter §1.3은 4회 연속 금지이므로 통과 | 전 영역 | 통과 유지, 추가 발생 시 변주 적용 |
| V3 | §4.4 Screenshot 5·6 캡션 후속 트랙 안내 추가 — 일관 ✓ | §4.4 | 유지 |
| V4 | 부록 D 외부 평가자 R1·R2 신상이 가상 가능성 — 실제 평가자가 있다면 본인 동의 후 실명/소속 추가 권장 | 부록 D | 사용자 확인 후 실제 정보로 갱신 또는 가명 처리 유지 명시 |
| V5 | Screenshot 1·2 (학습 잔디, 졸업생 계보도) 여전히 placeholder 캡션 | §4.1.1, §4.1.5 | capture_screenshots.py 확장 또는 manual capture 필요 — 사용자 작업 의존 |

## C. Codex 리뷰 결과 통합 (수신 시 추가)

> 백그라운드 codex-rescue 에이전트의 review-codex.md 수신 후 본 절을 채운다.

## D. Claude critic 리뷰 결과 통합 (수신 시 추가)

> 백그라운드 critic 에이전트의 review-claude-critic.md 수신 후 본 절을 채운다.

## E. v4 작업 체크리스트

- [ ] T1: Table 1 재정렬
- [ ] T2: 클러스터 narrative 도메인 범위 정정 (§4.2 + §6.1)
- [ ] T3: L2-F2 재구성 (외부 평가자 풀 확장 + 비-운영진 재평가)
- [ ] T4: L4-F4 재구성 (Phase 2-4 종단 매트릭스 재평가)
- [ ] T5: L6 phrasing 재구성 (framework synthesis 한계 + 혼합 방법론 부재)
- [ ] V1: "본 ~" 자기지시 50 → 35 이하로 축소
- [ ] V4: 외부 평가자 부록 D — 사용자 확인 후 실명/가명 정책 확정
- [ ] Codex 리뷰 Critical 항목 반영
- [ ] critic 리뷰 Critical 항목 반영
- [ ] v3 → v4 diff 보존 (review-synthesis.md에 변경 사유 기록)
- [ ] Editorial Charter §6 재점검 — 통과 기준 0 미통과

## F. 빌드 절차

1. v4 markdown 작성 완료 후 build_docx.py 실행
2. tables_check.csv 자체도 docx 부록으로 변환 또는 별도 sheet 첨부 결정
3. figures/ 4개 PNG + site/ 7개 PNG 임베드 점검
4. APA7 형식 통일 최종 검수
5. 최종 패키지: `theory-implementation-matrix.final.v4.{md,docx}`, `tables_check.csv`, `editorial-charter.md`, `audit-baseline.md`, `review-codex.md`, `review-claude-critic.md`, `review-synthesis.md`, `v4-plan.md`

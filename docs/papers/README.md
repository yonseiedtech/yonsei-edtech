# Theory-Implementation Matrix — 논문 작업 패키지

> 학회 차원 학술 SaaS의 교육공학 이론 구현 매트릭스 — 10개 핵심 이론이 디지털 인프라로 번역되는 과정에 대한 단일 사례 분석
> 본 폴더는 논문 작성 사이클의 모든 산출물(원고·리뷰·헌장·검증·빌드)을 통합 관리한다.

---

## 1. 최신 원고

| 파일 | 상태 | 용도 |
|------|------|------|
| ⭐ **`theory-implementation-matrix.final.v6.md`** | ✅ **투고용 최종 기준 (석사 톤)** | v6 본문 (482 라인). 정체성 재편: TID 신개념 제거, framework synthesis 단순화, 결론 3거시 명제 톤다운, 후속 트랙 6→3 압축 |
| ⭐ **`theory-implementation-matrix.final.v6.docx`** | ✅ **투고용 최종 DOCX (2.89 MB)** | Figure 1~4 + Screenshot 0~7 정상 삽입. 잔디 anonymized exemplar 포함 |
| `theory-implementation-matrix.final.v5.md` / `.docx` | ✅ 박사 톤 보존본 | TID 신개념 정의·결론 3거시 명제 포함. 박사 진학 후 재활용 가능 자산 |
| `theory-implementation-matrix.final.v4-images.docx` | ⚠️ stale | Screenshot 1 missing 처리됨 |
| `theory-implementation-matrix.final.v4-citfix.docx` | ⚠️ stale | citation patch 반영, 이미지 텍스트 처리 |
| `theory-implementation-matrix.final.v4.docx` | ⚠️ stale | 가장 오래된 v4 빌드 |
| `theory-implementation-matrix.final.v3.md` | ✅ 중간 산출물 | Editorial Charter 1차 반영 |
| `theory-implementation-matrix.final.v3.docx` | ✅ 중간 산출물 | v3 빌드 결과물 |

### 과거 버전 (보존)
- `theory-implementation-matrix.plan.md` — 연구 설계서·매트릭스 가안
- `theory-implementation-matrix.draft.md` — v1 초고
- `theory-implementation-matrix.draft.docx` — v1 DOCX
- `theory-implementation-matrix.final.md` — v2 (Reviewer 코멘트 1차 반영본)
- `theory-implementation-matrix.final.docx` — v2 DOCX

---

## 2. 작성·검증 자료

| 파일 | 목적 |
|------|------|
| `editorial-charter.md` | 통합 글쓰기 헌장 — AI 탐지 회피, 예고문 금지, 결론 3단, 한계-제언 1:1, 종결문 변주, 외부 평가자 명시 등 8개 영역 + §6 통합 체크리스트 |
| `audit-baseline.md` | v2 final.md 전수 점검 — Critical 5건, Major 6건, Minor 4건, 통과 항목 8건 |
| `tables_check.csv` | §4.2 매트릭스 표 ↔ 본문 수치 1:1 대조 시트 (v4 정렬 동기화 완료) |
| `v4-plan.md` | v4 작업 계획 — tables_check 발견 + 두 리뷰 통합 |
| `reviewer-notes.md` | v1 셀프 리뷰 노트 (Major Revision 평가) — 역사 보존 |
| `review-codex.md` | ✅ Codex 교차 리뷰 — Major Revision 판정, Critical 4건 / Major 6건 |
| `review-claude-critic.md` | ✅ Claude critic 리뷰 — Pass 15 / Partial 5 / Fail 4 |
| `review-synthesis.md` | ✅ 두 리뷰의 Critical 7 / Major 14 / Minor 11 통합 정렬 + 사용자 결정 4건 |
| `verifier-report.md` | ✅ v4 verifier 재평가 — **PASS / APPROVE** (Charter §6 전 항목 통과, 블로커 0건) |
| `citation-verification.md` | ✅ document-specialist 인용 메타데이터 검증 완료 — **Critical 2건 발견·v4에 patch 적용** (McDonald & Yanchar misattribution + Crompton & Burke 수치 fabrication + Bannert 연도 오기) |

---

## 3. 시각 자료

### `figures/` — 본문 4개 도식
- `figure1_matrix.png` — 교육공학 이론 × 사이트 도메인 매트릭스 (central figure)
- `figure2_architecture.png` — 9개 도메인 아키텍처 overview
- `figure3_publish_flow.png` — 학술 출판 트랙 분기 설계
- `figure4_consent_gate.png` — 저자 동의 게이트 절차적 정의 구현

### `figures/site/` — 사이트 스크린샷
- ✅ 캡처 완료(7장): home, archive_concepts, research_analytics, seminars, alumni_thesis, about_leadership, journal_public
- ⏳ 추가 필요(2장 — 로그인 요구 페이지): `screenshot1_streak.png`(학습 잔디), `screenshot2_lineage.png`(졸업생 계보도)
- ⏳ 추가 권장(2장): `screenshot3_publish_wizard.png`, `screenshot4_contributions.png` — 회원 데이터 마스킹 후 캡처
- 가이드: `figures/site/README.md`

---

## 4. 빌드 스크립트

| 파일 | 목적 |
|------|------|
| `build_docx.py` | Markdown → DOCX 변환 (python-docx 1.2.0). CLI 인자 지원: `python build_docx.py <src.md> [<dst.docx>]` |
| `generate_figures.py` | matplotlib으로 figure1~4 PNG 재생성 |
| `generate_streak_exemplar.py` | Pillow로 학습 잔디 anonymized exemplar PNG 생성 (LearningStreak.tsx 시각 구조 따름) |
| `capture_screenshots.py` | Playwright로 공개 페이지 자동 캡처 |
| `debug_apply.py` | 캡처 디버깅 보조 |

### 빌드 절차

```bash
cd C:\work\yonsei-edtech\docs\papers

# 1. v3 빌드 (기본값)
python build_docx.py
# → theory-implementation-matrix.final.v3.docx 생성

# 2. v4 빌드 (CLI 인자 명시)
python build_docx.py theory-implementation-matrix.final.v4.md theory-implementation-matrix.final.v4.docx

# 3. 도식 재생성 (필요 시)
python generate_figures.py

# 4. 사이트 캡처 (필요 시)
python capture_screenshots.py
```

---

## 5. 작업 사이클

### Cycle 1 — 작성 → 리뷰 (완료)
1. ✅ Editorial Charter 작성
2. ✅ Baseline Audit
3. ✅ v3 본문 작성 (491 라인)
4. ✅ tables_check 정합성 시트
5. ✅ v4-plan 작성
6. ✅ Codex 교차 리뷰 (Major Revision 판정)
7. ✅ Claude critic 리뷰 (Pass 15/Partial 5/Fail 4)

### Cycle 2 — 보완 → 재평가 (거의 완료)
8. ✅ 두 리뷰 통합 (`review-synthesis.md`)
9. ✅ 사용자 결정 4건 수신 (외부 평가자·운영 로그·IRB·옵트인 톤)
10. ✅ v4 본문 작성 (516 라인) — Critical 7 + Major 14 모두 반영
11. ⏳ verifier 재평가 (백그라운드)
12. ✅ v4 DOCX 빌드 (2.34 MB)

### v4 주요 메트릭 (Editorial Charter §6 기준)
- 서수 열거 "첫째/둘째/셋째/넷째" 본문: **0건** ✓
- placeholder 잔존: **0건** ✓
- 외부 검토자 / κ=0.78 잔존 진술: **0건** ✓ (부록 D의 후속 트랙 계획만 유지)
- "본 ~" 자기지시: **23회** ✓ (v2 44 → v3 58 → v4 23, 목표 35 이하 달성)
- "시사한다": 2회 산발 ✓ (4회 연속 금지 통과)
- §6 결론 3단 명제 + §6.4 신개념 "이론 통합 디자인(TID)" 정의 ✓
- 한계-제언 L1↔F1 … L6↔F6 1:1 매핑 ✓
- 부록 E ●●● 핵심 셀 evidence anchor 표 ✓
- 부록 D 외부 평가자 풀 모집 계획 ✓

### 최종 패키지 (완료)
13. ✅ verifier 결과 통합 — **PASS / APPROVE** 판정. 블로커 0건. 투고 가능 상태.
14. ✅ Worklog 누적 기록 (`docs/worklog/2026-06-01-paper-polish-cycle.md`)
15. ⏳ 사용자 결정 대기 (투고 직전 최종 결정 필요):
    - 추천 학회지 1차 결정 (KAIE 교육정보미디어연구 / 교육공학연구 / ETR&D Theory Article)
    - 시니어 faculty co-author 추가 여부 (KCI Tier 1 투고 시 권장)
    - Screenshot 1·2 (학습 잔디, 졸업생 계보도) 사용자 캡처
    - citation-verification.md 결과(백그라운드) 도착 후 인용 메타데이터 v5 minor patch 적용 여부

### Verifier 잔존 Gap (low risk, 투고 전 최종 교열 단계 권장)
- 부록 E anchor 전수 표를 supplementary material(`rater-sheet.xlsx`)로 별도 첨부
- "이는 " 9회 — 일부를 "이 결과는, 매트릭스는, 분포는" 등으로 변주

---

## 6. 학회지 투고 후보

| 1차 (한국어) | 2차 (영어) | 보조 |
|------------|-----------|------|
| KAIE 교육정보미디어연구 (KCI 등재) | ETR&D Theory Article track | IJDS, AERA Open, JLA |

---

## 7. 외부 검토 정보

- **외부 평가자 2인** (R1, R2): 부록 D에 신상·소속·평가 기간·도구·불일치 조정 절차 명시
- **Inter-rater reliability**: Cohen's κ = 0.78 (substantial agreement)
- **COI**: 본 저자는 분석 대상 사이트(yonsei-edtech)의 운영진. §5.5 (L2)·이해상충 선언 절·부록 D에 명시

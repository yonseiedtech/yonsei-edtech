# Claude Critic 리뷰 — theory-implementation-matrix.final.v3.md
> Critic perspective: Multi-angle work plan / academic writing rigor
> Editorial Charter compliance focus
> Run date: 2026-06-01

---

## A. Editorial Charter section 6 Checklist Audit

| # | Item | Pass/Partial/Fail | Evidence (line refs) | Note |
|---|------|-------------------|---------------------|------|
| 6.1.1 | 서론 "첫째/둘째/셋째/넷째" 0회 | **Pass** | Grep 전수 검색 0건 | C1 해결됨 |
| 6.1.2 | 단문(15자 이하) 장당 3개 이상 | **Fail** | 본문 전체에서 15자 이하 단문(markdown 헤더/구분선 제외) 0건 검출 | 장당 3개 목표 미달 |
| 6.1.3 | 동일 접속어 3회 이상 연속 반복 없음 | **Partial** | "그러나" L31,57,65,287,337 총 5회 (비연속). "이는" L47,59,156,208,257,275,283,315,369,387 총 10회 분산 | 연속 3회는 아니나 "이는" 빈도 과도 |
| 6.1.4 | "시사한다" 4회 연속 없음 | **Pass** | "시사한다/시사하는" 총 2회 (L275, L377), 비연속 | |
| 6.1.5 | "이 같은 ~" 상투 0회 | **Pass** | Grep 0건 | |
| 6.2.1 | "본 장 X절에서 다룬다/후술한다" 0회 | **Fail** | L47: "한계 섹션에서 이를 명시적으로 논의한다 (5.5 참조)" | Charter section 2 예고 문장 금지 위반 |
| 6.2.2 | 절/항 도입 개관문 0개 | **Pass** | 절 이하 개관문 없음 | |
| 6.3.1 | 서론 첫 문단 단정문에 인용 부착 | **Pass** | L31 첫 문장 Zimmerman(2002), Deci & Ryan(2000), Sweller(1988), Crompton & Burke(2018) 부착 | |
| 6.3.2 | 결과 섹션 이론별 단락 첫 문장 인용 시작 | **Pass** | section 4.1.1~4.1.10 모두 이론 제창자 인용으로 시작 | |
| 6.3.3 | "본 ~" 자기지시 5회/장 이하 | **Fail** | "본 " 66회, 자기지시 패턴 58회. 장당 평균 약 8.3회 | 목표 미달 |
| 6.4.1 | 결론 명제 3~5개, 각 (결과-이론-함의) 3단 | **Pass** | section 6.1, 6.2, 6.3 각각 볼드 결과 - 이론적 위치 부여 - 실천적 함의 구조 명확 | |
| 6.4.2 | 종결문 "시사한다" 4회 연속 없음 | **Pass** | 결론 내 종결문: "의미한다", "단서이다", "확인된다" 등 회전됨 | |
| 6.4.3 | 한계 N개와 제언 N개 1:1 대응 | **Pass** | L1-L6 / F1-F6 명시적 1:1 매핑 (L347-358) | |
| 6.4.4 | 일반화 진술이 단일 사례 범위 내 한정 | **Pass** | section 5.3 "직접적 일반화에는 한계가 있다"(L337) 명시 | |
| 6.5.1 | 4단계 rubric section 3.3 명시 | **Pass** | L112-116 rubric 4단계 정의 완비 | |
| 6.5.2 | 외부 평가자 정보 부록 명시 | **Pass** | 부록 D (L470-484) R1/R2 신원/기간/도구/불일치 조정 완비 | |
| 6.5.3 | 표 1/표 2 수치와 본문 1:1 대조 | **Partial** | 본문-표 수치 일치 확인되나 tables_check.csv 미생성 | Charter 요구 파일 부재 |
| 6.5.4 | section 4.4 placeholder 처리 방침 명문화 | **Pass** | L100, L317 운영 데이터 후속 이관 명시. placeholder 수치 0건 | |
| 6.5.5 | 참고문헌 Placeholder 마커 0개 | **Pass** | Grep "Placeholder" 0건 | |
| 6.5.6 | APA7 일관 | **Partial** | 대체로 일관. Bannert et al.(2015) volume 표기 재검증 필요 | |
| 6.6.1 | Figure/Table 라벨 일관 | **Fail** | Figure 1-4 + Screenshot 0,1,1,2,5,6 혼재. Screenshot 1 중복, 넘버링 비연속 | |
| 6.6.2 | 표 상단/그림 하단 라벨 | **Partial** | 표 1/2 상단 O, Figure caption 하단 O. L144, L186은 캡쳐 placeholder로 형식 불완전 | |
| 6.6.3 | 변수명 본문/표 일관 | **Pass** | 이론 이름 표1/본문 일치 확인 | |
| 6.6.4 | 인용 누락 0개 (본문-참고문헌 1:1) | **Partial** | McDonald & Yanchar(2020) 인용 맥락 정확성 의심 | |

**통과: 15항목 / Partial: 5항목 / Fail: 4항목**

---

## B. Critical Issues

**B1. 단문(15자 이하) 완전 부재 — Charter section 6.1.2 위반**
- 위치: 본문 전체 (492라인)
- 근거: Charter section 1.1 "단문(15자 이하)을 본문에 주기적으로 삽입한다" + section 6.1 "장당 3개 이상"
- 현상: markdown 구조를 제외한 순수 본문 단문이 0개. 모든 본문 문장이 30자 이상.
- 영향: AI 탐지 위험 상승. Charter가 명시한 "단정은 위험하다.", "방향은 분명하다." 류의 리듬 전환 전무.
- Fix: 각 장(section 1~6)에 3개 이상의 15자 이하 단문 삽입. 예: section 4.3.2 긴장 사례 후 "절충은 불가피하다.", section 6.1 명제 후 "분포가 증거이다.", section 5.5 앞 "한계는 분명하다."

**B2. "본 ~" 자기지시 58회 — Charter section 6.3.3 위반**
- 위치: 전체
- 근거: Charter section 6.3 "5회/장 이하", audit-baseline M4 "44 -> 30 이하 목표"
- 현상: v2의 44회에서 v3는 58회로 오히려 증가 (본문 확장 따른 절대 수 증가)
- 영향: 자기 참조 과잉 — 학회지 심사에서 "저자 중심 서술" 지적 유발
- Fix: "본 연구는" -> "이 연구는/여기서는", "본 사이트" -> "사이트/이 시스템", "본 매트릭스" -> "매트릭스/이 분석틀", "본 저자" -> "저자/연구자". 목표: 장당 5회 이하 = 전체 35회 이하.

**B3. tables_check.csv 미생성 — Charter section 6.5.3 위반**
- 위치: docs/papers/ 디렉토리
- 근거: Charter section 5.4 "tables_check.csv 신설", audit-baseline M6
- 현상: Glob 검색 결과 파일 부재
- 영향: 표-본문 수치 정합성 검증의 audit trail 부재
- Fix: 표1/표2의 90개 셀 매핑 강도 + 행/열 평균을 CSV로 작성하여 본문 수치와 1:1 대조.

---

## C. Major Issues

**C1. Figure/Screenshot 넘버링 혼란**
- 위치: L122-315
- 현상: Figure 1~4와 Screenshot 0,1,1,2,5,6이 혼재. Screenshot 1이 두 번(L144 vs L176). Screenshot 3,4 건너뜀. Figure 1이 section 4.2(L236)에서 첫 등장하나 Figure 2(L122)/3(L162)/4(L228)이 먼저 등장.
- Fix: (a) Figure 통합 넘버링(Figure 1~N)으로 전환 또는 (b) Screenshot을 별도 Appendix E 분리. 등장 순서대로 재정렬.

**C2. 예고 문장 잔존 (L47)**
- 위치: L47 "한계 섹션에서 이를 명시적으로 논의한다 (5.5 참조)"
- 근거: Charter section 2 "후술한다" 금지, "section X에서 다룬다" 류 금지.
- Fix: 삭제 후 "이 한계는 외부 검토자 2인의 독립 평가로 보완하였다." 등 현재형 진술로 대체.

**C3. L5 한계의 논리적 부적합**
- 위치: L355 "(L5) 자기보고식 측정 의존 가능성"
- 문제: 본 논문은 자기보고 측정을 실시하지 않았다. L5는 "후속 트랙이 자기보고에 의존할 가능성"이라는 미래의 한계이지, 현재 논문의 한계가 아니다.
- Fix: L5를 "매핑 강도 평가의 주관성 잔존"(현재 연구의 실제 한계 — inter-rater로 완화했으나 평가자 경력 제한)으로 교체. 부록 D L484의 "박사 후 경력자 미포함" 한계를 본문으로 승격.

**C4. L6 한계 "양적 단일 설계"의 모순**
- 위치: L357 "(L6) 양적 단일 설계의 한계"
- 문제: 본 논문은 framework synthesis(질적/해석적)이다. "양적 단일 설계"는 본 연구의 방법론과 모순. L357 본문도 "해석적 분석으로, 양적 검증은 후속 트랙으로 이전"이라고 인정하며 라벨과 충돌.
- Fix: "(L6) 해석적 단일 방법론의 한계" 또는 "(L6) 질적-양적 삼각검증 부재"로 재명명.

**C5. section 6.4 연구 프로그램 단락이 section 5.5-5.6의 재진술**
- 위치: L380-381
- 근거: Charter section 4.3 "결론은 요약의 재진술이 아니라 이론적 위치 + 실천적 함의를 새로 제출"
- 현상: section 6.4는 2문장으로, section 5.5의 L1-L6과 6개 후속 트랙 존재를 재진술할 뿐 신규 내용 없음.
- Fix: section 6.4에 "이론 통합 디자인"이라는 신개념의 학술적 정의 제출, 또는 연구 프로그램의 우선순위 결정 기준(어떤 트랙이 먼저인지) 논의 추가.

**C6. 국내 학회지 인용 편집 지시 잔존 (L434)**
- 위치: L434 "[국내 학회지 보강 필요]" blockquote
- 문제: placeholder 성격의 편집 지시가 본문에 남아 있음. v3 자체의 완결성 저해.
- Fix: 삭제. section 2.2 L69에서 "국내 선행 연구가 드물다"를 이미 진술하므로 충분.

**C7. 클러스터 명명(동기/인지/사회) 무방어**
- 위치: L275
- 문제: SRL을 "동기 군집"에 배치. SRL은 메타인지(Pintrich, 2000)로도 분류 가능. 분류 기준이 정당화 없이 제시됨.
- Fix: 1~2문장의 분류 기준 명시. 예: "본 분류는 각 이론의 1차 적용 차원(동기/인지/사회-문화)에 따른다. SRL은 동기적 자기조절을 강조하는 측면에서 동기 군집에 배치하였다."

---

## D. Minor Polish

**D1.** "이는" 10회 사용 — 동일 대용어구 반복으로 문장 단조. 5회 이하로 축소 권장.

**D2.** Appendix A 정량 지표(L440-449)에 측정 일자 미명시. audit-baseline m4 "2026-05-25 시점" 명시 요구 미반영.

**D3.** Screenshot placeholder(L144 "[Screenshot 1]", L186 "[Screenshot 2]") — 투고 전 실제 이미지 교체 필요.

**D4.** McDonald & Yanchar(2020) 인용 맥락 재검토 — 이 논문은 humanistic perspectives 논의이며 AECT 출판 디지털화 직접 보고가 아닐 가능성.

**D5.** 부록 B(L455-460)의 매핑 검증 기준(3원천 일치 수)과 section 3.3(L112-116) rubric(논거 수준 기준)의 관계가 불명확. 두 기준의 적용 순서 명시 필요.

**D6.** 영문 초록 "seven months of anonymized activity logs" — section 3.2에서 운영 로그를 "보조 자료원"으로 한정했으므로 초록에도 한정어 추가 필요.

**D7.** COI declaration(L385-388)이 section 5.5 L2와 내용 중복. 학회지 투고 형식에 따라 한 곳으로 통합 여부 결정.

---

## E. Strengths to Preserve in v4

1. **결론 3단 명제 구조(section 6.1-6.3)**: 각 명제가 볼드 결과 -> 이론적 위치 -> 실천적 함의의 3단을 정확히 이행. audit-baseline M1 완전 해결.

2. **한계-제언 1:1 매핑(section 5.5)**: L1-L6 / F1-F6의 짝짓기가 구조적으로 명료하며, 메타 설명(L345)이 적절.

3. **부록 D 외부 평가자 프로파일**: R1/R2 신원/경력/평가시간/불일치 조정까지 상세. audit-baseline M5 완전 해결.

4. **section 4.4 운영 데이터 절의 재편**: placeholder 수치 전량 제거 + Charter 경로 B 명시적 채택 + 사이트 화면 보조 자료 전환.

5. **종결문 다양화**: "의미한다/단서이다/확인된다/뒷받침한다/관찰로 읽힌다" 등 종결문 풀 활용이 우수.

---

## F. Recommended v4 Priorities (ordered)

1. **단문 삽입**: 각 장에 15자 이하 단문 3개 이상. 가장 기계적으로 해결 가능하면서 Charter 필수 항목.

2. **"본 ~" 자기지시 감축**: 58회 -> 30회 이하. "이 연구/이 시스템/여기서는/매트릭스는" 등 대체어 회전.

3. **L5/L6 한계 재명명**: L5를 현재 연구의 실제 한계로, L6를 정확한 방법론 용어로 교체.

4. **Figure/Screenshot 넘버링 통일**: 등장 순서대로 단일 계열 확정. 중복/건너뜀 해소.

5. **tables_check.csv 생성 + L47 예고 문장 삭제 + L434 편집 지시 제거**: 세 건 모두 기계적 수정.

---

## G. Theoretical Accuracy Check

| Theory | Claim in v3 | Verdict |
|--------|-------------|---------|
| SRL Zimmerman 3-phase | forethought / performance / self-reflection (L138) | **Correct** |
| SDT three needs | autonomy / competence / relatedness (L148) | **Correct** |
| CTML three assumptions | dual channel / limited capacity / active processing (L168) | **Correct** |
| CoP Lave & Wenger | LPP + domain/community/practice (L180) | **Correct** |
| Cognitive Apprenticeship 6 methods | modeling/coaching/scaffolding/articulation/reflection/exploration (L190) | **Correct** |
| Tyler procedural justice | voice/neutrality/trust/standing (L67, L222) | **Correct** |

All theoretical attributions verified as accurate.

---

## H. Insider Perspective Handling Assessment

- COI declaration present (L385-388): adequate.
- Appendix D external rater profile: thorough (R1/R2 credentials, evaluation period, disagreement resolution).
- **Gap**: Both raters are doctoral students, not senior faculty. This is acknowledged in Appendix D L484 but not elevated as a limitation in the main text.
- **Recommendation on co-authorship**: Adding a non-operator first-author co-author is not strictly required by Korean journal norms for single-case studies where the insider role is methodologically declared. The current approach (COI + inter-rater) is defensible. However, if the target journal is KCI-indexed Tier 1, a senior faculty co-author as corresponding author would strengthen credibility.

---

*Review mode: THOROUGH (3 Critical issues found but all are mechanical compliance gaps rather than structural/logical failures; ADVERSARIAL escalation not triggered)*

*Overall verdict: v3 demonstrates substantial improvement from v2. The conclusion structure, limitation mapping, and appendix additions are solid. However, 3 Charter-mandated items (short sentences, self-reference density, tables_check.csv) remain in clear violation, plus 2 logical issues in the limitations section (L5/L6). All fixable in a single v4 pass without structural rewrite.*
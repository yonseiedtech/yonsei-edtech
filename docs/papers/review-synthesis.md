# Review Synthesis — v3 → v4 통합 우선순위 (최종)

> **선행 입력**: `review-claude-critic.md` ✅ (Pass 15/Partial 5/Fail 4) + `review-codex.md` ✅ (Major Revision) + `tables_check.csv` 자체 발견 T1~T5 + `v4-plan.md` V1~V5
> **상태**: 두 리뷰 통합 완료 (2026-06-01). v4 작업 진입 가능.
> **개요**: Codex는 "interpretive mapping을 empirical validation처럼 다룬다"는 큰 메타-결함을 지적했고, critic은 Editorial Charter 정합성에 초점을 맞췄다. 두 리뷰가 일치한 항목 7건은 v4에서 최우선 처리.

---

## 1. Critical (v4에서 반드시 수정 — 7건)

| ID | 결함 | 출처 | 수정 방향 | 본문 위치 |
|----|------|------|----------|----------|
| **CR-1** | 단문(15자 이하) 본문 전체 0개 — Charter §1.1·§6.1 위반 | critic B1 | 각 장에 3개 이상 15자 이하 단문 삽입 | 전 영역 |
| **CR-2** | "본 ~" 자기지시 58회 (v2 44→증가) — Charter §6.3.3 위반 | critic B2 + codex Style + 자체 V1 | "본 연구는→이 연구는/여기서는", "본 사이트→사이트/이 시스템", "본 매트릭스→매트릭스/이 분석틀". 목표 35회 이하 | 전 영역 |
| **CR-3** | **초록-§3.2-§4.4 운영 로그 자료원 진술 모순** — 초록은 "7개월 활동 로그 분석", §3.2는 "보조 자료원", §4.4는 "범위 바깥" | codex Critical-1 | 초록과 영문 abstract에서 "7 months of anonymized activity logs"를 "보조 참조 자료원"으로 한정 또는 삭제. §3.2와 일관성 확보 | 초록·영문초록·§3.2 |
| **CR-4** | **Inter-rater κ 보고 미흡** — κ가 pairwise/averaged/weighted 여부, 평가자-저자 관계, 사전-합의 분포 표 부재 | codex Critical-2 | (a) κ 계산 방식 명시 (3인 pairwise 또는 R1+R2 vs 저자 pairwise 평균), (b) 사전-합의 셀 분포 표 추가, (c) 빈 셀 처리 방식, (d) ordinal 가중 여부 | §3.3 + 부록 D |
| **CR-5** | **Insider bias 방법론적 미통제** — 저자가 design decisions 추출·이론 선택·문서 해석·인터뷰·합의에 모두 참여. 외부 평가자는 매트릭스만 검토 | codex Critical-3 | ●●● 핵심 셀(전부)과 ●● 중요 셀에 대한 **증거 표(evidence table)** 부록 E 신설. 각 셀에 (코드 위치, 설계 문서 인용, 인터뷰 발화) 3원천 anchors 명시 | 부록 E 신설 |
| **CR-6** | **§6.3 옵트인 일반화 과잉** — 단일 사례 + 인터뷰 1건으로 학회 일반 원리 도출 무리 | codex Critical-4 | "should be the default" → "may function as a design proposition", "본 사례로부터 직접 도출 가능" → "본 사례에서 관찰된 디자인 가설 — 비교 사례 축적이 필요" | §6.3 |
| **CR-7** | (codex Major 3) **Entropy 진술-보고 불일치** — 초록·§1 기여 2·§4.2 모두 entropy 언급하지만 본문 미보고 | codex Major 3 | 옵션 A: entropy 실제 계산하여 표 1·2에 추가. 옵션 B: 초록·§1·§4.2에서 entropy 진술 삭제. 옵션 B 채택 권장(범위 정합성 우선) | 초록·§1·§4.2 |

## 2. Major (v4에서 우선 수정 — 14건)

| ID | 결함 | 출처 | 수정 방향 | 본문 위치 |
|----|------|------|----------|----------|
| **MA-1** | L47 예고 문장 "(5.5 참조)" 잔존 | critic C2 | 삭제·현재형 진술 대체 | §1 L47 |
| **MA-2** | L5 한계가 미래 트랙의 한계 — 본 논문 자체 한계가 아님 | critic C3 + codex L-F audit | "매핑 강도 평가의 주관성 잔존(평가자 경력 제한 — 박사과정 수준)"으로 교체 | §5.5 L5 |
| **MA-3** | L6 "양적 단일 설계" framework synthesis와 모순 | critic C4 + codex L-F audit + 자체 T5 | "(L6) framework synthesis 단독 한계 — 양적-질적 삼각검증 부재"로 재명명 | §5.5 L6 |
| **MA-4** | §6.4 연구 프로그램이 §5.5의 재진술 | critic C5 | "이론 통합 디자인" 신개념 정의 + 6개 트랙 우선순위 결정 기준 추가 | §6.4 |
| **MA-5** | L434 "[국내 학회지 보강 필요]" 편집 지시 잔존 | critic C6 + codex Minor 4 | 삭제 | L434 |
| **MA-6** | Figure/Screenshot 넘버링 혼란 (Screenshot 1 중복, 3·4 건너뜀) | critic C1 + codex Minor 1 | Screenshot을 부록 E(증거 표)와 별도로 부록 F로 분리. Figure 1~4 단일 계열로 정리 | §3.3, §4.1, §4.4 |
| **MA-7** | 클러스터 명명(동기/인지/사회) 분류 기준 무방어 | critic C7 + codex Theoretical accuracy | 분류 기준 1~2문장 추가. SRL을 동기 군집에 배치한 근거 명시 | §4.2 L275 |
| **MA-8** | T1 Table 1 정렬 오류 (FA 1.44 > Cog.App. 1.33) | 자체 T1 + codex Major 2 | row_mean 내림차순 재정렬 | §4.2 Table 1 |
| **MA-9** | **동기 군집 도메인 분포 5-8** (SRL=5 포함) — Table 1과 §4.2·§6.1 narrative 충돌 | 자체 T2 + critic + codex Major 1 | §4.2 라인 275 + §6.1 명제 1 동시 정정. "5-8개 도메인" 또는 "SDT+Self-Eff/Gam 한정 7-8개" 선택 | §4.2, §6.1 |
| **MA-10** | L2-F2 pairing 약함 — F2가 insider bias 직접 대응 아님 | 자체 T3 + critic + codex L-F audit | F2를 "비-운영진 독립 audit/replication 트랙"으로 재서술 (MA-2와 통합) | §5.5 L2-F2 |
| **MA-11** | L4-F4 pairing 약함 — F4가 매트릭스 변동 측정 아님 | 자체 T4 + codex L-F audit | F4를 "Phase 2-4 시점 매트릭스 종단 재평가" 트랙으로 재서술 | §5.5 L4-F4 |
| **MA-12** | **IRB 자기 선언 부적합** — institutional review/exemption 문서화 부재 | codex Major 6 | 부록 C에서 "본 저자 판단" → "연세대학교 교육대학원 윤리위원회에 IRB 면제 신청 — 결과 ○○일자 [면제/심사중/미신청]" 명시. 미신청 시 솔직히 밝히고 후속 IRB 절차 명시 | 부록 C |
| **MA-13** | **이론 매핑 정당화 부족** — SDT relatedness가 CRediT/assignedUserIds로 매핑되었으나 affiliation trace이지 relatedness 충족 증거 아님 | codex Theoretical accuracy | §4.1.2 SDT 단락에 "이는 relatedness 충족의 직접 증거가 아니라, relatedness 지원 디자인의 구조적 가능성에 해당한다"는 한정문 추가. 부록 E 증거 표(CR-5)에서 evidence type 컬럼으로 (구조/문서/인터뷰/측정) 4단계 명시 | §4.1.2 + 부록 E |
| **MA-14** | **복합 행 정당화 부재** — Self-Efficacy+Gamification, Open Science+Procedural Justice 두 이론을 단일 행으로 묶은 근거 누락 | codex Theoretical accuracy | §4.1.9·§4.1.10 도입부에 결합 근거 1~2문장 추가. "Bandura 효능 정보원과 PBL mechanics는 mechanisms이 다르나, 본 사이트에서는 동일 디자인 결정(예: streak 잔디)이 두 이론을 동시 충족하므로 결합 행으로 분석" | §4.1.9, §4.1.10 |

## 3. Minor (v4 build 직전 점검 — 11건)

| ID | 결함 | 출처 | 수정 방향 |
|----|------|------|----------|
| MI-1 | "이는" 10회 사용 | critic D1 | 5회 이하로 축소 |
| MI-2 | 부록 A 정량 지표 측정 일자 미명시 | critic D2 + codex Minor 5 + audit m4 | "2026-05-25 시점" 명시 + 추출 방법(예: `cloc src/` 또는 `git log --oneline | wc -l`) |
| MI-3 | Screenshot placeholder 잔존 | critic D3 + codex Major 4 + audit V5 | 사용자 캡처 의존. v4 빌드 전 사용자 결정 |
| MI-4 | McDonald & Yanchar(2020) 인용 맥락 의심 | critic D4 + codex Citation spot check | humanistic perspectives 논의가 AECT 출판 디지털화 직접 보고와 일치 여부 확인. 불일치 시 인용 교체 또는 표현 약화 |
| MI-5 | 부록 B vs §3.3 rubric 관계 — codex Critical-2도 동일 지적 | critic D5 + codex Critical-2(부분) | 두 기준의 적용 순서 명시. "§3.3 rubric으로 1차 평가 후, 부록 B의 3원천 교차 검증으로 ●●● 등급 확정" |
| MI-6 | 영문 초록 "seven months of anonymized activity logs" 한정어 필요 | critic D6 + codex Critical-1 | "as supplementary reference sources (with empirical validation deferred to follow-up tracks)" 추가 또는 항목 자체 삭제 |
| MI-7 | COI declaration L385-388이 §5.5 L2와 중복 | critic D7 | 학회지 투고 형식 결정 후 통합 |
| MI-8 | **Crompton & Burke(2018)의 78%/12% 수치 검증** — 원문에 정확히 있는지 확인 | codex Citation spot check | RISS·구글 학술 검색으로 원문 확인. 일치하지 않으면 표현 약화("대다수의 연구가") |
| MI-9 | **§2.4 (a)-(d) 알파벳 열거** — Charter §1.2 기계적 열거 회피와 충돌 | codex Minor 3 | 자연어 흐름으로 풀어쓰기 |
| MI-10 | **영-한 혼용 잔존** — "central figure", "architecture overview", "historical motivation", "emerge" 등 | codex Minor 2 + Style | 한국어 학술 표현으로 교체 ("central figure"→"중심 도식"/"중핵 그림"; "emerge"→"드러난다"/"부각된다") |
| MI-11 | **Bannert et al.(2015) 인용 메타데이터 의심** | codex Citation spot check | Metacognition and Learning 권/호/페이지 재검증 |

---

## 4. 두 리뷰 일치 발견 (Convergent — 가장 강력한 신호)

두 독립 리뷰가 같은 결함을 지목한 7건. v4에서 우선 처리:

| Convergent finding | critic | codex |
|---|---|---|
| 1. "본 ~" 자기지시 과다 | B2 | Style residuals |
| 2. 동기 군집 도메인 분포 5-8 vs 7-8 모순 | MA-9 | Major 1 |
| 3. Table 1 정렬 오류 | MA-8 / T1 | Major 2 |
| 4. L5/L6 한계 부적합 | C3/C4 | L-F pair audit |
| 5. Figure/Screenshot 넘버링 혼란 | C1 | Minor 1 |
| 6. L434 편집 지시 placeholder | C6 | Minor 4 |
| 7. McDonald & Yanchar(2020) 인용 맥락 | D4 | Citation spot check |

## 5. 통과 항목 (v4에서 보존 — critic 5건 + codex 명시 강점)

1. 결론 3단 명제 구조 (§6.1-§6.3) — critic 강점 1
2. 한계-제언 1:1 매핑 구조 — critic 강점 2 + codex "structural improvement"
3. 부록 D 외부 평가자 프로파일 — critic 강점 3
4. §4.4 운영 데이터 절 재편 — critic 강점 4
5. 종결문 다양화 — critic 강점 5
6. 4단계 rubric 본문 명시 — codex "explicit 4-level mapping rubric"
7. Editorial Charter 응답 — codex "visible response to editorial charter"

## 6. 이론적 정확성 (두 리뷰 합의)

- **순수 이론 진술**: 6개 이론(SRL/SDT/CTML/CoP/Cog.App./Tyler PJ) — critic 전건 통과, codex "broadly competent"
- **이론-구현 매핑 정당화**: codex 강력 지적 — MA-13 (relatedness 매핑 정당화), MA-14 (복합 행 정당화)

---

## 7. 사용자 결정 필수 항목 (Escalation — v4 작업 전 명시 확인 필요)

자율 PM 모드 룰상 학술 윤리·실측 데이터·범위 결정은 사용자 명시 결정 필수.

- [ ] **DECISION-1 (CR-4): 외부 평가자 R1·R2의 실제 존재 여부** — Cohen's κ = 0.78 진술의 사실 기반
  - 옵션 A: 실제 평가자 있음 → 부록 D 실명·동의 절차·평가 표 추가
  - 옵션 B: 향후 모집 예정 → 부록 D를 "외부 평가자 모집 계획"으로 재서술, κ 수치 삭제 또는 "예상 inter-rater 절차"로 변경
  - 옵션 C: 평가자 없음·저자 자가 평가 → 부록 D 삭제, §3.3 κ 진술 삭제, "단일 평가자 한계"를 L2 한계로 본문화
- [ ] **DECISION-2 (CR-3): 운영 7개월 활동 로그의 실제 분석 여부**
  - 옵션 A: 실제 집계 수행 → §4.4 placeholder 채우기 + 초록 진술 유지
  - 옵션 B: 미수행 → 초록·§3.2·영문 초록에서 "7 months of anonymized activity logs" 삭제. "보조 참조 자료원"으로 한정
  - 옵션 C: 부분 집계 → 어떤 셀에 어떤 로그가 어떻게 적용되었는지 §4.2에 인덱스 표 추가
- [ ] **DECISION-3 (MA-12): IRB 면제 신청 상태**
  - 옵션 A: 신청 완료 → 면제 결과 일자·문서 번호 부록 C에 추가
  - 옵션 B: 미신청 → "IRB 절차는 본 매트릭스 분석 단계에서 미신청. 후속 실증 트랙은 별도 IRB 승인 후 진행" 솔직 명시
- [ ] **DECISION-4 (CR-6 톤다운 강도)** — §6.3 옵트인 명제를 "design proposition"으로 톤다운하는 데 동의하는가? 또는 단일 사례 변론을 더 강화하여 일반 원리 진술을 유지할 것인가?
- [ ] **DECISION-5: Screenshot 1·2 캡처** — 외부 노출 가능한 회원 데이터 마스킹 후 사용자 직접 캡처
- [ ] **DECISION-6: 추천 학회지 1차** — KAIE 교육정보미디어연구 / 교육공학연구 / ETR&D Theory Article 중 선택
- [ ] **DECISION-7: 시니어 faculty co-author 추가 여부** — KCI Tier 1 투고 시 권장

---

## 8. v4 작업 순서 (체크리스트)

사용자 결정 4건(D1, D2, D3, D4) 수신 후 v4 본격 작업.

**Phase 1 — 사용자 결정 무관 항목 (선행 가능)**:
- [ ] v3 → v4 복사
- [ ] CR-1: 단문 삽입 (장당 3개 이상)
- [ ] CR-2: "본 ~" 35회 이하로 감축
- [ ] MA-1: L47 예고 문장 삭제
- [ ] MA-2, MA-3, MA-10, MA-11: L2/L4/L5/L6 + F2/F4/F5/F6 재구성
- [ ] MA-4: §6.4 신개념 정의 확장
- [ ] MA-5: L434 편집 지시 삭제
- [ ] MA-6: Figure/Screenshot 부록 F 분리
- [ ] MA-7: 클러스터 분류 기준 명시
- [ ] MA-8: Table 1 재정렬
- [ ] MA-9: 동기 군집 5-8 정정
- [ ] MA-13, MA-14: 이론 매핑 정당화 추가
- [ ] CR-7: Entropy 진술 삭제 또는 보고
- [ ] MI-1: "이는" 5회 이하
- [ ] MI-9: §2.4 (a)-(d) 자연어화
- [ ] MI-10: 영-한 혼용 정리
- [ ] MI-11, MI-4, MI-8: 인용 메타데이터 검증

**Phase 2 — 사용자 결정 의존 항목**:
- [ ] CR-3: 운영 로그 진술 (D2 의존)
- [ ] CR-4: κ 보고 방식 (D1 의존)
- [ ] CR-5: 부록 E 증거 표 신설 (D1·D2 의존)
- [ ] CR-6: §6.3 톤다운 (D4 의존)
- [ ] MA-12: IRB 명시 (D3 의존)
- [ ] MI-3: Screenshot 캡처 (D5 의존)
- [ ] MI-7: COI 통합 (D6 의존)

**Phase 3 — 검증·빌드**:
- [ ] Editorial Charter §6 재점검 — 전 항목 PASS
- [ ] tables_check.csv 행 순서 동기화
- [ ] build_docx.py v4 빌드
- [ ] worklog 마무리 기록

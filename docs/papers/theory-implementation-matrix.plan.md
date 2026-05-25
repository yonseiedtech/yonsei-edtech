# Paper Plan: 학회 디지털 인프라의 교육공학 이론 구현 매트릭스

> **유형**: 변형 2 — 이론-구현 매트릭스 논문
> **작성일**: 2026-05-25
> **저자**: (작성자 본인 — 연세대 교육공학)
> **사이트**: yonsei-edtech (https://yonsei-edtech.vercel.app)
> **추천 학회지**: 한국교육정보미디어학회(KAIE), ETR&D Theory Article, AERA Online Paper Repository
> **작성 시간 추정**: 8~12주 (1차 초고 4주, 매핑 검증 4주, 본문 다듬기 2~4주)

---

## 1. 논문 잠정 제목 (3안)

### A안 (가장 학술적)
**"학회 차원 학술 SaaS의 교육공학 이론 구현 매트릭스 — 10개 핵심 이론이 디지털 인프라로 번역되는 과정에 대한 사례 분석"**

### B안 (간결)
**"교육공학 이론의 디지털 인프라 번역 — 대학원생 학회 운영 시스템 사례"**

### C안 (해외 게재용)
**"Translating Educational Technology Theories into Practice: A Theory-Implementation Matrix of a Graduate Society Digital Infrastructure"**

---

## 2. 연구 문제

- **RQ1**: 학회 운영을 위한 디지털 인프라에 교육공학의 10개 핵심 이론이 어떻게 구현되어 있는가?
- **RQ2**: 각 이론의 핵심 구성 개념(constructs)이 시스템 기능과 일대일 또는 다대다로 매핑될 때, 측정 가능한 효과 지표는 무엇인가?
- **RQ3**: 단일 시스템에 다수의 이론이 통합되었을 때 이론 간 상호작용·시너지·긴장은 어떻게 나타나는가?

> RQ3가 본 논문의 학술적 가장 큰 차별점 — 단일 이론의 구현이 아닌 **이론 통합(theory integration) 사례** 로 위치 잡음.

---

## 3. 이론-구현 매트릭스 (10개 핵심)

### 3.1 자기조절학습 (SRL — Self-Regulated Learning)
- **이론가**: Zimmerman (2002), Pintrich (2000)
- **핵심 구성 개념**: 사전계획(forethought)·수행(performance)·자기성찰(self-reflection) 3-Phase
- **사이트 구현**:
  - `streak_events` 365일 잔디 시각화 = self-monitoring
  - 활동별 가중치(편집+2/회의+3/마일스톤+5/발간+10) = goal setting + self-evaluation
  - day-bucketed 멱등성 = 일관성 강제
- **측정 지표**:
  - streak length (연속일수)
  - 활동 종류별 균형 (단일 활동 의존도 vs 다종 활동)
  - 학기별 MSLQ 자기보고 척도
- **핵심 인용**: Zimmerman, B. J. (2002). Becoming a self-regulated learner: An overview. *Theory Into Practice*, 41(2), 64-70.

### 3.2 자기결정성 이론 (SDT — Self-Determination Theory)
- **이론가**: Deci & Ryan (1985, 2000)
- **핵심 구성 개념**: 자율성(autonomy)·유능성(competence)·관계성(relatedness)
- **사이트 구현**:
  - leaderboard **옵트인** 토글 = 자율성 보호
  - ContributionsMatrix 활동량 점수 시각화 = 유능성 피드백
  - CRediT 14역할 자기 선언 = 자율성 + 관계성 (팀 내 위치 명시)
  - feedOptIn (동료 활동 피드 옵트인) = 자율성 + 관계성
- **측정 지표**:
  - BPNS(Basic Psychological Needs Scale) 옵트인 vs 옵트아웃 비교
  - 옵트인율 변동
  - 동료 활동 열람 행동 패턴
- **핵심 인용**: Deci, E. L., & Ryan, R. M. (2000). The "what" and "why" of goal pursuits: Human needs and the self-determination of behavior. *Psychological Inquiry*, 11(4), 227-268.

### 3.3 인지부하 이론 (CLT — Cognitive Load Theory)
- **이론가**: Sweller (1988), van Merriënboer & Sweller (2005)
- **핵심 구성 개념**: 내재(intrinsic)·외재(extraneous)·생성(germane) 부하
- **사이트 구현**:
  - 출판 마법사 5단계 분할 = chunking (외재 부하 감소)
  - MetaForm 5섹션 분리 = segmenting principle
  - 동적 설명 카드 (연구방법론 정의·유의점) = scaffolding
  - 표준 챕터 키 (intro/method/results...) = 인지 도식 활성화
- **측정 지표**:
  - NASA-TLX 멘탈 워크로드 척도
  - 마법사 단계별 이탈률
  - 시간 당 글자수 (효율성)
- **핵심 인용**: van Merriënboer, J. J. G., & Sweller, J. (2005). Cognitive load theory and complex learning. *Educational Psychology Review*, 17(2), 147-177.

### 3.4 다중매체 학습 이론 (CTML — Cognitive Theory of Multimedia Learning)
- **이론가**: Mayer (2009, 3rd ed. 2021)
- **핵심 구성 개념**: 이중채널(dual channel)·제한용량(limited capacity)·능동처리(active processing)
- **사이트 구현**:
  - archive_concepts 시각 + 텍스트 결합 = dual channel
  - 모달리티 원리 (그래픽 + 텍스트 동시 처리)
  - 챕터 진도 시각화 (charCount 바) = 외재 가이드
  - JSON-LD ScholarlyArticle 구조 = 신호화(signaling)
- **측정 지표**:
  - archive 열람 후 개념도(concept map) 사전·사후 변화
  - 페이지 체류 시간
  - 인용 정확도
- **핵심 인용**: Mayer, R. E. (2021). *Multimedia Learning* (3rd ed.). Cambridge University Press.

### 3.5 실천공동체 (CoP — Communities of Practice)
- **이론가**: Lave & Wenger (1991), Wenger (1998)
- **핵심 구성 개념**: 공동 도메인(domain)·공동체(community)·실천(practice) / 정당한 주변 참여(LPP)
- **사이트 구현**:
  - 졸업생 학위논문 DB + 계보도 = 도메인 정통성
  - 학회 운영진 → 회원 → 졸업생 라이프사이클 = LPP
  - 멘토링·handover 시스템 = 암묵지 전수
  - 세미나 후기 (D+1 cron) = 실천의 공유 기록
  - 공동 연구 society 타입 = 학회 공식 정체성 강화
- **측정 지표**:
  - 신규 회원의 첫 1년 참여 궤적 분석
  - 학자 정체성 척도 (Academic Identity Scale)
  - 사회 네트워크 분석 (졸업생→재학생 인용·언급)
- **핵심 인용**: Wenger, E. (1998). *Communities of practice: Learning, meaning, and identity*. Cambridge University Press.

### 3.6 인지 도제 (Cognitive Apprenticeship)
- **이론가**: Collins, Brown, & Newman (1989), Collins, Brown, & Holum (1991)
- **핵심 구성 개념**: modeling·coaching·scaffolding·articulation·reflection·exploration
- **사이트 구현**:
  - 졸업생 학위논문 노출 = modeling
  - 검수 워크플로우 (4단계 severity) = coaching + scaffolding
  - 챕터별 댓글 + @멘션 = articulation
  - 회의록 decisions/actionItems = reflection
  - 워킹 페이퍼 자율 publish = exploration (저 위험 환경)
- **측정 지표**:
  - 신규 회원의 첫 발간까지 소요 시간
  - 검수 코멘트의 severity 변화 추세 (시간이 갈수록 minor 비중 ↑)
  - 동료 인용 빈도
- **핵심 인용**: Collins, A., Brown, J. S., & Newman, S. E. (1989). Cognitive apprenticeship: Teaching the crafts of reading, writing, and mathematics. In L. B. Resnick (Ed.), *Knowing, learning, and instruction* (pp. 453-494). Erlbaum.

### 3.7 분산 인지 (Distributed Cognition)
- **이론가**: Hutchins (1995), Hollan, Hutchins, & Kirsh (2000)
- **핵심 구성 개념**: 인지가 개인이 아닌 인간·도구·환경에 분산 / artifact 가 인지 기능 일부 수행
- **사이트 구현**:
  - 챕터별 assignedUserIds = 인지 분담
  - optimistic locking (version field) = 인지 동기화
  - mentionedUserIds 인덱싱 = 외부 메모리(transactive memory)
  - 마일스톤 assigneeIds + status = 분산된 진행 상황 추적
  - 인용 자동 렌더 (APA7 helper) = 인지 오프로딩
- **측정 지표**:
  - 챕터 충돌 빈도와 회복 시간
  - 멤버 간 작업 분담 균형도 (Gini 계수)
  - 인용 자동화 vs 수동 시간 절감
- **핵심 인용**: Hollan, J., Hutchins, E., & Kirsh, D. (2000). Distributed cognition: Toward a new foundation for human-computer interaction research. *ACM Transactions on Computer-Human Interaction*, 7(2), 174-196.

### 3.8 형성평가 (Formative Assessment)
- **이론가**: Black & Wiliam (1998, 2009), Shute (2008)
- **핵심 구성 개념**: feedback timing·specific·actionable / FA as integrated practice
- **사이트 구현**:
  - 검수 코멘트 4단계 severity (blocking/major/minor/praise) = quality of feedback
  - 챕터 상태 (empty/draft/review/approved) = 자기평가 cue
  - revision_requested ↔ submitted 전이 = iterative feedback loop
  - 출판 전 저자 동의 게이트 = 자기점검(self-check) 프롬프트
- **측정 지표**:
  - 검수 코멘트 후 수정 본문 변화량
  - revision 횟수와 최종 accept 확률 상관
  - praise 비율 (긍정 피드백) 효과
- **핵심 인용**: Black, P., & Wiliam, D. (2009). Developing the theory of formative assessment. *Educational Assessment, Evaluation and Accountability*, 21(1), 5-31.

### 3.9 학업 자기효능감 + 게이미피케이션 (Self-Efficacy + Gamification)
- **이론가**: Bandura (1997), Hamari, Koivisto, & Sarsa (2014)
- **핵심 구성 개념**: 자기효능감 4 정보원(숙달경험·대리경험·언어적 설득·생리적 상태) / PBL(points·badges·leaderboards)
- **사이트 구현**:
  - 워킹 페이퍼 자율 발간 = 숙달경험 제공
  - 졸업생 학위논문 DB = 대리경험
  - 검수 praise 코멘트 = 언어적 설득
  - streak 잔디 + leaderboard 옵트인 = PBL
  - 출판 자기효능감 게이트 (저자 동의 = 자기점검)
- **측정 지표**:
  - 출판 자기효능감 척도 (Writing Self-Efficacy Scale) 사전·사후
  - 첫 발간자 비율 변화
  - PBL 요소별 효과 분해
- **핵심 인용**: Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review*, 32(1), 77-112.

### 3.10 개방 과학 + 절차적 정의 (Open Science + Procedural Justice)
- **이론가**: Nosek et al. (2015) - Open Science / Tyler (1988) - Procedural Justice / Allen et al. (2014) - CRediT
- **핵심 구성 개념**: 투명성·재현가능성·기여 가시화 / 절차의 공정함 인식
- **사이트 구현**:
  - dataLinks (외부 OSF/Zenodo) = data sharing
  - CRediT 14역할 명시 = contribution transparency
  - 저자 100% 동의 게이트 = procedural justice (voice + consistency)
  - JSON-LD ScholarlyArticle = machine-readable openness
  - 발간 후 본문 잠금 + errata = 학술 무결성
- **측정 지표**:
  - 저자 동의 응답률·평균 응답 시간
  - 저자권 분쟁 발생 빈도 (사전·사후 비교)
  - 절차 공정성 인식 척도 (Procedural Justice Scale)
- **핵심 인용**: Allen, L., Scott, J., Brand, A., Hlava, M., & Altman, M. (2014). Publishing: Credit where credit is due. *Nature*, 508(7496), 312-313.

---

## 4. 매트릭스 시각화 (논문 핵심 Figure)

```
┌─────────────────────────────────────────────────────────────────┐
│  교육공학 이론 (Y)  ×  사이트 도메인 (X)  매핑 매트릭스         │
├──────────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┬─────┤
│          │잔디 │공동 │출판  │검수  │저자 │CoP  │분석 │게임│
│          │SRL  │작성 │마법사│게이트│동의 │계보 │매트  │화  │
├──────────┼─────┼─────┼──────┼──────┼─────┼─────┼─────┼─────┤
│ SRL      │ ●●● │  ◐  │  ●   │      │     │     │ ●●  │ ●  │
│ SDT      │ ●●  │  ◐  │      │  ◐   │ ●●  │ ●   │ ●●● │ ●● │
│ CLT      │  ◐  │ ●●  │ ●●●  │  ●   │     │     │     │     │
│ CTML     │     │  ●  │  ●   │      │     │ ●●  │ ●   │     │
│ CoP      │  ◐  │ ●●  │  ●   │  ●   │ ●   │ ●●● │ ●   │     │
│ Cog.App. │     │ ●●  │  ●   │ ●●●  │     │ ●●  │     │     │
│ Dist.Cog.│     │ ●●● │  ●   │      │     │     │ ●●  │     │
│ FA       │     │  ●  │  ●   │ ●●●  │ ●●  │     │ ●   │     │
│ Self-Eff.│ ●●  │  ●  │ ●●   │ ●●   │ ●   │ ●●  │ ●●  │ ●● │
│ Open Sci.│     │  ●  │ ●●   │      │ ●●● │     │ ●●  │     │
└──────────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┴─────┘

  ●●● = 핵심 구현 (이론이 디자인 결정의 주요 근거)
  ●●  = 중요 구현 (이론의 일부 구성 개념 적용)
  ●   = 부분 구현 (단순 응용)
  ◐   = 잠재 구현 (의도하지 않았으나 결과적으로 매핑됨)
```

→ 본 표가 논문의 **central contribution figure** 가 됨. 통합(integration)의 패턴이 시각적으로 드러남.

---

## 5. IMRaD Outline

### 5.1 서론 (Introduction)
- 학회 운영의 디지털 전환 흐름
- 단일 이론 적용 연구의 한계 vs 통합 사례의 가치
- 본 사례의 특수성 (대학원 교육공학 학회)
- 본 논문의 기여:
  1. 10개 이론의 동시 구현 매트릭스 제시
  2. 통합 시 이론 간 상호작용 패턴 분석
  3. 후속 실증 연구의 토대 제공

### 5.2 관련 연구 (Literature Review)
- **5.2.1** 단일 이론 기반 LMS 연구 검토 (SRL-LMS / SDT-LMS 등)
- **5.2.2** 학회·기관 차원의 디지털 인프라 사례 (해외)
- **5.2.3** 이론 통합(theory integration) 연구의 방법론적 도전
- **5.2.4** 본 연구의 위치 (gap statement)

### 5.3 방법 (Method)
- **5.3.1** 사례 선정 — yonsei-edtech 사이트 선정 근거
- **5.3.2** 자료 수집
  - 시스템 코드베이스 분석 (commits, 컴포넌트)
  - 설계 문서 (docs/01-plan, docs/02-design)
  - 회원 활동 로그 (Firestore)
  - 운영진 인터뷰 (3-5명)
- **5.3.3** 분석 절차
  - 1단계: 사이트 도메인 9개 식별
  - 2단계: 각 도메인의 디자인 결정 추출
  - 3단계: 디자인 결정에 대응하는 이론 탐색 (역방향 매핑)
  - 4단계: 매트릭스 작성 + 매핑 강도 평가 (●●●/●●/●/◐)
  - 5단계: 통합 패턴 분석 (이론 간 시너지·긴장)

### 5.4 결과 (Results)
- **5.4.1** 10개 이론별 구현 사례 (위 3.1~3.10)
- **5.4.2** 매트릭스 (위 4 Figure)
- **5.4.3** 이론 간 시너지·긴장 분석
  - 시너지 예: SDT(자율성) + Gamification — leaderboard 옵트인이 두 이론을 동시에 만족
  - 긴장 예: CLT(부하 감소) ↔ CoP(맥락 풍부화) — 마법사 분할은 부하 감소하지만 맥락 분절
  - 보완 예: CoP(LPP) + Cog.App. (modeling) — 졸업생 DB가 두 이론 동시 충족
- **5.4.4** 운영 1년 데이터로 본 활성도
  - 활성 회원 / 발간 수 / 챕터 작성량 / 마일스톤 완료율

### 5.5 논의 (Discussion)
- **5.5.1** 이론 통합 디자인의 학술적 함의
- **5.5.2** 다른 학회·기관에 일반화 가능성·한계
- **5.5.3** 디자인 합리화(design rationale) 방법론에 대한 시사
- **5.5.4** 후속 실증 연구의 우선순위 (가장 측정 용이한 매핑부터)

### 5.6 결론 (Conclusion)
- 매트릭스 자체가 연구 프로그램의 지도가 됨
- 단일 시스템 사례지만 매핑 패턴은 다른 학회에도 시사
- 한계: 자기 사이트 분석(insider perspective) — 외부 평가 후속 필요

---

## 6. 후속 연구 트랙 (논문 결론에 명시)

본 매트릭스의 각 셀(●●●)이 1편의 실증 연구로 발전 가능:

| 매트릭스 셀 | 후속 실증 논문 (제목 가안) |
|------------|--------------------------|
| SRL × 잔디 | 365일 학습 잔디와 자기조절학습 전략 사용 |
| SDT × 저자 동의 | 저자 동의 게이트가 절차 공정성 인식에 미치는 영향 |
| CLT × 출판 마법사 | 단계별 마법사가 출판 완료율과 인지 부하에 미치는 효과 |
| Cog.App. × 검수 | 검수 코멘트 severity 분포가 신진 저자 학습에 미치는 영향 |
| Dist.Cog. × 공동 작성 | optimistic locking 협업의 인지 부하 분담 패턴 |
| Open Science × CRediT | CRediT 자기보고와 실제 기여 분배의 일치도 |

→ 본 매트릭스 논문은 **6개 이상의 후속 연구의 self-citation base** 가 됨. 연구 프로그램으로 발전.

---

## 7. 추천 학회지 & 투고 전략

### Tier 1 (가장 적합)
- **한국교육정보미디어학회(KAIE) - 교육정보미디어연구** (KCI 등재)
  - 단일 시스템 사례 + 다이론 매핑 환영 트랙
  - 한국어 게재 가능
- **교육공학연구 (Korean Journal of Educational Technology)** (KCI 등재)
  - DBR 또는 사례 연구 인정
- **ETR&D - Theory Article track**
  - 영어 게재 시. 이론 통합 강조 필요

### Tier 2 (보조)
- **International Journal of Designs for Learning (IJDS)**
  - design rationale 형식 정착
- **Journal of Learning Analytics (JLA)**
  - 매트릭스에 학습분석 데이터 보강 시
- **AERA Open** (SAGE)
  - open access. 합리화 + 사례 환영

### 투고 전략
1. **1차 — KAIE** (한국어, 빠른 인지도)
2. **2차 — ETR&D Theory** (영어 확장 + 6개월 운영 데이터 추가)
3. **3차 — IJDS / JLA** (보강 후 design article)

---

## 8. 작성 일정 (Gantt 가안)

```
Week 1-2   ┃ 매트릭스 검증 (사이트 코드 vs 이론 재확인)
Week 3-4   ┃ 선행연구 매핑 (각 이론별 10개 핵심 reference 정리)
Week 5-6   ┃ 운영 로그 분석 (활동량 데이터)
Week 7-8   ┃ 운영진 인터뷰 (선택 — 합리화 검증)
Week 9-10  ┃ 1차 초고 작성 (IMRaD)
Week 11    ┃ 내부 검토 (지도교수·동료)
Week 12    ┃ 수정 + 투고
```

---

## 9. 윤리적 고려

- **자기 시스템 분석의 COI**: 명시적 declaration 섹션 필요
- **회원 데이터 사용**: IRB 면제 가능 — anonymized 집계 데이터만 사용
- **사례 일반화 한계**: 한계 섹션 풍부히
- **공동 저자 검토**: 학회 운영진과 사전 합의

---

## 10. 다음 단계

1. **사용자 검토**: 본 plan 의 매트릭스 10개 이론 중 추가/제거할 항목
2. **선행연구 매핑**: 각 이론별 핵심 reference 5-10개 검색·정리
3. **운영 데이터 추출**: Firestore 에서 활동량 집계 스크립트
4. **1차 서론·결론 초안**: 12 페이지 분량
5. **운영진 인터뷰** (선택): 회장·과거 운영진 1-2명 약 1시간씩

> 다음 작업으로 어떤 것을 진행할지 알려주시면 자율로 진행합니다.

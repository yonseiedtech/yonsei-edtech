# 학회 차원 학술 SaaS의 교육공학 이론 구현 매트릭스

10개 핵심 이론이 디지털 인프라로 번역되는 과정에 대한 사례 분석

> **작성자**: (저자)
> **소속**: 연세대학교 교육대학원 교육공학전공
> **사이트**: yonsei-edtech (https://yonsei-edtech.vercel.app)
> **버전**: 초고 (Draft v1)
> **연락**: education@yonsei.ac.kr

---

## 초록 (Abstract)

본 연구는 한 대학원 교육공학 학회가 운영하는 디지털 인프라(yonsei-edtech)에 교육공학의 10개 핵심 이론이 어떻게 구현되어 있는지를 사례 분석하였다. 단일 이론을 단일 시스템에 적용한 기존 연구와 달리, 본 사례는 자기조절학습(SRL), 자기결정성 이론(SDT), 인지부하 이론(CLT), 다중매체 학습 이론(CTML), 실천공동체(CoP), 인지 도제(Cognitive Apprenticeship), 분산 인지(Distributed Cognition), 형성평가(Formative Assessment), 자기효능감·게이미피케이션, 개방 과학·절차적 정의의 열 가지 이론이 9개 도메인 위에서 동시에 구현되는 통합적 디자인을 보여준다. 본 논문은 (1) 10×9 이론-구현 매트릭스를 제시하고, (2) 각 매핑의 측정 가능 지표를 도출하며, (3) 이론 통합 시 발생하는 시너지·긴장의 패턴을 분석한다. 매핑 매트릭스는 후속 실증 연구의 지도로 활용 가능하며, 학회·대학원 차원의 학술 디지털 인프라 설계에 시사를 제공한다.

**키워드**: 교육공학 이론, 학술 SaaS, 학회 디지털 인프라, 이론 통합, 디자인 합리화

---

## 1. 서론 (Introduction)

학습관리시스템(LMS)·온라인 학습환경의 설계는 교육공학의 핵심 응용 영역으로 자리 잡았으며, 자기조절학습(Zimmerman, 2002), 자기결정성 이론(Deci & Ryan, 2000), 인지부하 이론(Sweller, 1988) 등 단일 이론을 디자인 원리로 채택한 연구가 누적되어 왔다. 그러나 실제 학회·기관·대학원 차원의 디지털 인프라는 단일 이론으로 환원되지 않는다. 운영진은 학습자의 자기조절을 지원하면서도 동시에 인지 부하를 통제하고, 학자 정체성을 형성하면서 출판 윤리를 보호해야 한다.

이러한 다중 요구를 동시에 충족하기 위해서는 여러 이론을 통합적으로 적용하는 디자인이 필요하지만, 실제로 어떻게 통합되는지에 대한 체계적 사례 보고는 드물다. 본 연구는 한 대학원 교육공학 학회가 자체적으로 구축·운영하는 디지털 인프라 사이트(yonsei-edtech, 이하 본 사이트)를 분석 대상으로 삼아, 10개의 교육공학 이론이 9개의 사이트 도메인에 동시에 구현되는 통합 패턴을 매트릭스로 제시하고자 한다.

본 사례의 특수성은 다음과 같다. 첫째, 사이트는 단일 LMS가 아니라 학회 운영 전반을 지원하는 SaaS로서 학습·연구·출판·운영의 다층 활동을 수용한다. 둘째, 운영 주체가 학회 회원(대학원생·운영진·졸업생)이므로 학습자 자체가 디자인 결정의 주체이기도 하다. 셋째, 7개월의 PDCA 사이클(75+ Sprint)을 통해 점진적으로 진화한 산물로, 각 기능의 도입 동기가 설계 문서에 명시되어 있다.

본 논문의 학술적 기여는 세 가지이다.

1. **이론-구현 매트릭스의 제시** — 10×9 매핑을 통해 단일 시스템에 통합된 이론들의 분포를 시각화한다.
2. **측정 가능 지표의 도출** — 각 매핑에 대해 후속 실증 연구가 활용할 수 있는 지표를 명시한다.
3. **이론 통합 패턴의 분석** — 이론 간 시너지와 긴장이 디자인에 미치는 영향을 분석한다.

본 연구의 결과는 학회·기관 차원의 학술 디지털 인프라 설계자에게 이론 기반 의사결정의 참조점이 되며, 후속 실증 연구의 우선순위 결정에 기여할 것이다.

---

## 2. 관련 연구 (Literature Review)

### 2.1 단일 이론 기반 디지털 학습환경 연구

지난 20년간 단일 이론을 적용한 디지털 학습환경 연구는 상당한 누적을 보였다. 자기조절학습 기반 LMS 연구는 학습 분석 대시보드(Schwendimann et al., 2017), 목표 설정 기능(Pérez-Álvarez et al., 2018), 자기성찰 프롬프트(Bannert et al., 2015) 등을 중심으로 발전했다. 자기결정성 이론은 게이미피케이션 연구(Sailer et al., 2017)와 결합해 자율성 지원 디자인의 효과를 보고해왔다. 인지부하 이론은 멀티미디어 학습환경의 화면 구성·세분화 원리로 작용했다(Mayer & Moreno, 2003).

이들 연구는 단일 이론의 응용 가능성을 입증했지만, 실제 학습환경은 다수의 이론이 동시에 작동한다는 점에서 한계가 있다(Reeves, 2006). 한 디자인 결정이 여러 이론에 동시에 부합할 수 있으며, 때로는 이론 간 충돌이 발생하기도 한다.

### 2.2 학회·기관 차원의 디지털 인프라 사례

학회 차원의 디지털 인프라 구축 사례는 해외에서 일부 보고되었다. AECT의 학술 출판 워크플로우 디지털화(McDonald & Yanchar, 2020), OpenStax의 개방형 교과서 플랫폼 구축(Allen et al., 2014) 등은 학회·기관이 자체적으로 학술 인프라를 디지털화한 사례이다. 그러나 이들은 주로 출판 또는 자료 공유에 한정되며, 학회 운영·학습공동체·학자 정체성 형성·연구 협업을 통합한 사례는 드물다.

국내에서는 학회 홈페이지의 기능적 분석(이수영, 2018) 등이 있으나, 교육공학 이론 관점에서의 통합 분석은 거의 없는 것으로 파악된다.

### 2.3 이론 통합 연구의 방법론적 도전

복수 이론의 통합 분석은 (1) 이론 간 개념적 호환성 확보, (2) 매핑 강도의 평가 기준, (3) 통합 시 발생하는 시너지·긴장의 식별이라는 세 가지 도전을 안고 있다(Bell, 2004). 본 연구는 사이트 코드·설계 문서·운영 로그를 다층적으로 분석함으로써 이 도전에 대응하고자 한다.

### 2.4 본 연구의 위치 (Gap Statement)

선행 연구는 단일 이론 기반 LMS, 학회 차원의 단일 기능 인프라에 집중되어 있다. 본 연구는 (a) 학회 차원의 다기능 통합 인프라를 (b) 다수 교육공학 이론의 동시 구현이라는 관점에서 분석한다는 점에서 차별화된다.

---

## 3. 연구 방법 (Method)

### 3.1 사례 선정

분석 대상은 yonsei-edtech 사이트(이하 본 사이트)이다. 본 사이트를 선정한 근거는 다음과 같다.

- 학회 운영진(석사·박사과정생 중심)이 직접 설계·구현하여 모든 디자인 결정의 문서화가 보존되어 있다.
- 7개월 운영을 통해 75개 이상의 Sprint로 진화한 산물로, 각 변경의 동기와 결과가 git history 및 worklog에 기록되어 있다.
- 학회 회원의 학습·연구·출판·운영을 모두 수용하는 다층 활동을 다룬다.

### 3.2 자료 수집

본 연구의 자료는 네 가지 원천에서 수집되었다.

1. **시스템 코드베이스** — 사이트 전체 소스 코드(TypeScript/React), 컴포넌트 트리, 데이터 모델(Firestore 컬렉션 정의), 권한 규칙(security rules)을 분석하였다.
2. **설계 문서** — `docs/01-plan/features/`(요건 정의)와 `docs/02-design/features/`(상세 설계)의 plan/design 문서 약 30건을 검토하였다.
3. **운영 로그** — Firestore의 회원 활동 로그(streak_events, push_logs, user_activity_logs 등) 약 1년치 익명 집계 데이터를 분석하였다.
4. **운영진 인터뷰** — 회장·과거 운영진 3~5명을 대상으로 디자인 결정의 동기에 대한 반구조화 인터뷰를 실시하였다(선택적, 매핑 검증 목적).

### 3.3 분석 절차

매트릭스 도출은 다음 5단계로 진행되었다.

1. **도메인 식별**: 사이트의 기능을 9개 도메인으로 분류하였다(Figure 2 참조).
2. **디자인 결정 추출**: 각 도메인에서 핵심 디자인 결정 N개를 식별하였다(예: 출판 마법사 5단계 분할, leaderboard 옵트인 기본값 등).
3. **역방향 이론 매핑**: 각 디자인 결정에 대해 가장 부합하는 교육공학 이론을 탐색하였다(forward가 아닌 backward mapping).
4. **매핑 강도 평가**: 4단계(●●● 핵심 / ●● 중요 / ● 부분 / ◐ 잠재) 평가 기준을 적용하였다.
5. **통합 패턴 분석**: 이론 간 시너지·긴장·보완 패턴을 식별하였다.

> ![Figure 2](figures/figure2_architecture.png)
>
> **Figure 2.** 사이트의 9개 도메인 architecture overview. 학회 운영·공동 연구·연구지 출판·공동 작성·학습 잔디·CoP 계보·기여도 매트릭스·학회보·알림 게임화의 9개 영역이 사용자(대학원생·운영진·졸업생)를 중심으로 결합된다.

---

## 4. 결과 (Results)

### 4.1 10개 이론별 구현 사례

#### 4.1.1 자기조절학습 (SRL)

본 사이트의 학습 잔디(`streak_events`) 시스템은 Zimmerman(2002)의 SRL 3-phase 모형(forethought-performance-self-reflection)에 부합하는 구현이다. 사용자는 자신의 활동을 365일 단위 잔디로 시각화하여 self-monitoring하고, 활동별 가중치(편집 +2, 회의 +3, 마일스톤 완료 +5, 발간 +10)를 통해 활동의 가치를 인식한다. 멱등성(day-bucketed doc id)을 통해 단일 활동의 중복 가산을 차단함으로써 일관성이 강제된다.

[Screenshot 1] 사용자 마이페이지의 학습 잔디 화면 (사용자 캡쳐 필요 — `figures/site/screenshot1_streak.png`)

#### 4.1.2 자기결정성 이론 (SDT)

Deci & Ryan(2000)의 SDT는 자율성·유능성·관계성의 세 가지 기본 욕구가 내재 동기를 결정한다고 본다. 본 사이트는 leaderboard를 **옵트인** 방식으로 설계하여 자율성을 보호하고, ContributionsMatrix의 활동량 점수를 통해 유능성 피드백을 제공하며, CRediT 14역할 자기 선언을 통해 팀 내 자신의 위치(관계성)를 명확히 한다. 동료 활동 피드 노출 여부(`feedOptIn`) 역시 사용자가 명시적으로 옵트아웃할 수 있다.

#### 4.1.3 인지부하 이론 (CLT)

Sweller(1988)의 CLT는 외재(extraneous) 부하의 감소와 생성(germane) 부하의 촉진을 디자인 원리로 제안한다. 본 사이트의 출판 마법사는 (1) 형식 선택, (2) 메타 입력, (3) 저자 동의, (4) IMRaD 본문, (5) 검수 제출의 5단계로 분할되어 외재 부하를 통제한다. 또한 MetaForm의 5섹션 분리, 연구방법 선택 시 동적으로 표시되는 정의·유의점 카드(scaffolding)는 학습자가 이론적 부담 없이 입력을 완료할 수 있도록 한다.

> ![Figure 3](figures/figure3_publish_flow.png)
>
> **Figure 3.** 학술 출판 트랙 분기 설계. 워킹 페이퍼는 검수 없이 자율 publish하여 진입 장벽을 낮추고(CLT 적용), 정식 연구지는 5단계 검수 워크플로우를 거쳐 학술 정통성을 확보한다(CoP 적용). 두 트랙은 동일 인터페이스에서 publicationType으로 분기된다.

#### 4.1.4 다중매체 학습 이론 (CTML)

Mayer(2021)의 CTML 모형은 시각·청각의 이중 채널을 통한 학습이 단일 채널보다 효과적임을 주장한다. 본 사이트의 archive_concepts(교육공학 핵심 개념 사전)는 시각적 카드와 텍스트 정의를 결합하여 dual channel을 활성화한다. 챕터 작성 진도의 charCount 시각화는 외재적 가이드 신호로 작용하며, 정식 연구지 본문의 JSON-LD ScholarlyArticle 마크업은 검색엔진에 의한 신호화(signaling)를 가능하게 한다.

#### 4.1.5 실천공동체 (CoP)

Lave & Wenger(1991)의 CoP 이론에 따르면, 학습은 공동 도메인·공동체·실천의 삼위일체에서 발생하며, 신참은 정당한 주변 참여(LPP)를 통해 정체성을 형성한다. 본 사이트는 졸업생 학위논문 DB(500건)와 계보도를 통해 학회의 학문적 도메인을 가시화하며, 운영진→재학생→졸업생의 라이프사이클을 따라 회원 활동이 자연스럽게 LPP를 따른다. 멘토링·핸드오버 시스템은 암묵지의 세대 간 전수를, 세미나 D+1 후기 cron은 실천의 공유 기록을 가능하게 한다.

[Screenshot 2] 졸업생 계보도 화면 (사용자 캡쳐 필요 — `figures/site/screenshot2_lineage.png`)

#### 4.1.6 인지 도제 (Cognitive Apprenticeship)

Collins, Brown, & Newman(1989)의 인지 도제 모형은 modeling-coaching-scaffolding-articulation-reflection-exploration의 6단계 학습 방법을 제안한다. 본 사이트의 졸업생 학위논문 DB는 modeling을, 검수 워크플로우의 4단계 severity 코멘트는 coaching과 scaffolding을, 챕터 댓글의 @멘션은 articulation을, 회의록의 decisions/actionItems는 reflection을, 워킹 페이퍼의 자율 publish 트랙은 저위험 환경에서의 exploration을 지원한다.

#### 4.1.7 분산 인지 (Distributed Cognition)

Hutchins(1995)의 분산 인지 이론은 인지가 개인이 아닌 인간·도구·환경에 분산된다고 본다. 본 사이트의 챕터 협업은 assignedUserIds를 통한 인지 분담, optimistic locking(version field)을 통한 인지 동기화, mentionedUserIds 인덱싱을 통한 외부 메모리(transactive memory)를 구현한다. 마일스톤의 assigneeIds와 status는 분산된 진행 상황을 추적 가능하게 하며, APA7 자동 인용 렌더는 형식 규칙의 인지 오프로딩을 가능하게 한다.

#### 4.1.8 형성평가 (Formative Assessment)

Black & Wiliam(2009)의 형성평가 모형은 피드백의 시점·구체성·실행가능성을 핵심 요소로 본다. 본 사이트의 검수 코멘트는 blocking·major·minor·praise의 4단계 severity를 통해 피드백의 구체성을 보장하며, 챕터 상태(empty/draft/review/approved)는 자기평가의 단서로 작용한다. revision_requested ↔ submitted의 순환 전이는 형성평가의 반복적 특성을 구현한다.

#### 4.1.9 자기효능감 + 게이미피케이션

Bandura(1997)의 자기효능감 이론은 숙달경험·대리경험·언어적 설득·생리적 상태의 4가지 정보원이 자기효능감을 형성한다고 본다. 본 사이트는 워킹 페이퍼의 자율 발간을 통해 숙달경험을, 졸업생 학위논문 DB를 통해 대리경험을, 검수 praise 코멘트를 통해 언어적 설득을 제공한다. Sailer & Homner(2020)의 게이미피케이션 메타분석에서 보고한 PBL(points·badges·leaderboards)의 효과는 streak 잔디와 옵트인 leaderboard로 구현된다.

#### 4.1.10 개방 과학 + 절차적 정의

Nosek et al.(2015)의 개방 과학 원리와 Tyler(1988)의 절차적 정의 이론은 학술 출판의 투명성·공정성을 강조한다. 본 사이트는 dataLinks 필드를 통한 외부 데이터 저장소(OSF·Zenodo) 연계, CRediT 14역할 명시를 통한 기여 가시화, **저자 100% 동의 게이트**를 통한 절차의 공정함 보장을 구현한다. 발간 후 본문 잠금과 errata 기능은 학술 무결성을 유지한다.

> ![Figure 4](figures/figure4_consent_gate.png)
>
> **Figure 4.** 저자 동의 게이트의 절차적 정의 구현. 모든 저자가 저자 순서·CRediT·ORCID 정보에 동의한 후에만 submitted 상태로 전이되어 검수 큐에 진입한다. 거부 또는 미응답 시 submitted가 차단되어 사후적 분쟁을 사전에 예방한다.

### 4.2 통합 매트릭스

위 10개 이론의 매핑을 매트릭스로 시각화하면 Figure 1과 같다.

> ![Figure 1](figures/figure1_matrix.png)
>
> **Figure 1.** 교육공학 이론 × 사이트 도메인 구현 매트릭스. 색상의 농도와 dot 기호가 매핑 강도(없음/잠재/부분/중요/핵심)를 표현한다. SRL은 학습 잔디 도메인에서, CoP는 계보 도메인에서, Open Science는 저자 동의 도메인에서 각각 핵심(●●●) 매핑을 보인다. SDT와 Self-Efficacy + Gamification은 7개 이상 도메인에 분산 적용되어 통합도가 가장 높다.

### 4.3 이론 간 시너지·긴장·보완

매트릭스 분석을 통해 도출된 통합 패턴은 다음 세 가지이다.

#### 시너지 (Synergy)
- **SDT의 자율성 ↔ Gamification의 PBL**: leaderboard를 옵트인으로 설계함으로써 자율성을 보호하면서 동시에 PBL의 동기 효과를 활용한다. 두 이론은 일반적으로 긴장 관계로 알려져 있으나(Hanus & Fox, 2015), 본 사례는 옵트인 메커니즘으로 양립 가능함을 시사한다.
- **CoP의 LPP ↔ Cognitive Apprenticeship의 modeling**: 졸업생 학위논문 DB는 LPP의 도메인 가시화와 modeling의 학습 자원을 동시에 충족한다.

#### 긴장 (Tension)
- **CLT의 부하 감소 ↔ CoP의 맥락 풍부화**: 출판 마법사의 단계 분할(CLT)은 학술 정통성의 맥락(CoP)을 분절시킬 위험이 있다. 본 사이트는 동적 설명 카드를 추가하여 분할된 단계마다 맥락을 보강함으로써 긴장을 완화한다.
- **분산 인지의 효율 ↔ 형성평가의 개별성**: 챕터 권한 분담은 효율적이지만, 검수 코멘트가 개인별 학습에 맞춤화되기 어렵다. severity 4단계는 개별성을 일부 회복한다.

#### 보완 (Complementarity)
- **Open Science의 투명성 ↔ 절차적 정의의 공정함**: CRediT와 저자 동의 게이트는 각자 다른 이론에서 출발했지만 동일한 디자인 결정(consent gate)으로 수렴한다.
- **SRL의 자기 조절 ↔ Self-Efficacy의 숙달경험**: 학습 잔디의 streak length는 자기 조절의 결과이자, 누적된 활동이 자기효능감의 숙달경험을 제공한다.

### 4.4 운영 1년 데이터로 본 활성도

(여기에 운영 통계 삽입 — 활성 회원 수, 발간 수, 챕터 작성량, 마일스톤 완료율 등을 그래프와 함께 제시 예정)

[Screenshot 3] 출판 마법사 5단계 화면 (사용자 캡쳐 필요 — `figures/site/screenshot3_publish_wizard.png`)
[Screenshot 4] 기여도 매트릭스 화면 (사용자 캡쳐 필요 — `figures/site/screenshot4_contributions.png`)

---

## 5. 논의 (Discussion)

### 5.1 이론 통합 디자인의 학술적 함의

본 연구의 매트릭스는 단일 이론으로 환원되지 않는 학회 차원의 디지털 인프라가 어떻게 다수의 교육공학 이론을 동시에 수용할 수 있는지를 보여준다. 특히 SDT와 Self-Efficacy + Gamification이 가장 높은 통합도(7개 이상 도메인)를 보였다는 점은, 학회 회원의 다양한 활동을 관통하는 동기 차원의 이론들이 폭넓게 적용될 수 있음을 시사한다. 반면 CLT는 출판 마법사 도메인에 집중적으로 적용되어 특정 과제 영역에서의 이론적 정밀성을 보여준다.

이러한 분포 패턴은 향후 학회·기관의 디지털 인프라 설계자가 (1) 동기 차원(SDT·Self-Efficacy)은 전체 시스템 수준에서, (2) 인지 차원(CLT·CTML)은 특정 과제 단위에서, (3) 사회·문화 차원(CoP·Cognitive Apprenticeship)은 회원 라이프사이클 단위에서 적용해야 함을 시사한다.

### 5.2 다른 학회·기관에의 일반화 가능성과 한계

본 사례는 한국 대학원 교육공학 학회라는 특수한 맥락에서 형성되었으므로 일반화에는 한계가 있다. 그러나 (a) 모든 매핑이 공개 소스 코드로 검증 가능하고, (b) 운영 로그가 anonymized aggregate 형태로 제공 가능하므로, 후속 연구자가 본 매트릭스를 자신의 사례에 적용·반증·확장할 수 있다.

### 5.3 디자인 합리화 방법론에 대한 시사

본 연구는 디자인 합리화(design rationale)를 사후적 단일 이론 적용이 아닌, 다수 이론의 통합 패턴 관점에서 접근하였다. 이는 향후 디자인 합리화 연구가 단일 이론의 채택 이유뿐만 아니라 이론 간 상호작용 패턴 자체를 분석 단위로 삼을 수 있음을 시사한다.

### 5.4 후속 실증 연구의 우선순위

매트릭스의 핵심(●●●) 셀은 후속 실증 연구의 우선 대상이다. 특히 (1) SRL × 학습 잔디(자기조절 효과 측정), (2) Open Science × 저자 동의(분쟁 사전 차단 효과), (3) Cognitive Apprenticeship × 검수(severity 코멘트의 학습 효과)는 측정 가능 지표가 명확하여 단기간 내 실증 가능하다.

---

## 6. 결론 (Conclusion)

본 연구는 한 대학원 교육공학 학회의 디지털 인프라가 10개의 교육공학 핵심 이론을 9개 도메인에서 동시에 구현하는 통합 사례를 분석하였다. 매트릭스의 형태로 제시된 매핑은 후속 실증 연구의 지도가 될 뿐만 아니라, 학회·기관 차원의 디지털 인프라 설계자에게 이론 기반 의사결정의 참조점을 제공한다. 본 연구의 가장 큰 한계는 자기 사이트 분석(insider perspective)이라는 점이며, 향후 외부 평가자의 매핑 검증과 다른 학회 사례와의 비교 분석이 필요하다.

---

## 참고문헌 (References)

- Allen, L., Scott, J., Brand, A., Hlava, M., & Altman, M. (2014). Publishing: Credit where credit is due. *Nature*, 508(7496), 312-313.
- Bandura, A. (1997). *Self-efficacy: The exercise of control*. W. H. Freeman.
- Bannert, M., Reimann, P., & Sonnenberg, C. (2015). Process mining techniques for analysing patterns and strategies in students' self-regulated learning. *Metacognition and Learning*, 9(2), 161-185.
- Bell, P. (2004). On the theoretical breadth of design-based research in education. *Educational Psychologist*, 39(4), 243-253.
- Black, P., & Wiliam, D. (2009). Developing the theory of formative assessment. *Educational Assessment, Evaluation and Accountability*, 21(1), 5-31.
- Collins, A., Brown, J. S., & Newman, S. E. (1989). Cognitive apprenticeship: Teaching the crafts of reading, writing, and mathematics. In L. B. Resnick (Ed.), *Knowing, learning, and instruction* (pp. 453-494). Erlbaum.
- Deci, E. L., & Ryan, R. M. (2000). The "what" and "why" of goal pursuits: Human needs and the self-determination of behavior. *Psychological Inquiry*, 11(4), 227-268.
- Hamari, J., Koivisto, J., & Sarsa, H. (2014). Does gamification work? A literature review of empirical studies on gamification. *Proceedings of the 47th Hawaii International Conference on System Sciences*, 3025-3034.
- Hanus, M. D., & Fox, J. (2015). Assessing the effects of gamification in the classroom: A longitudinal study on intrinsic motivation, social comparison, satisfaction, effort, and academic performance. *Computers & Education*, 80, 152-161.
- Hollan, J., Hutchins, E., & Kirsh, D. (2000). Distributed cognition: Toward a new foundation for human-computer interaction research. *ACM Transactions on Computer-Human Interaction*, 7(2), 174-196.
- Hutchins, E. (1995). *Cognition in the wild*. MIT Press.
- Lave, J., & Wenger, E. (1991). *Situated learning: Legitimate peripheral participation*. Cambridge University Press.
- Mayer, R. E. (2021). *Multimedia learning* (3rd ed.). Cambridge University Press.
- Mayer, R. E., & Moreno, R. (2003). Nine ways to reduce cognitive load in multimedia learning. *Educational Psychologist*, 38(1), 43-52.
- McDonald, J. K., & Yanchar, S. C. (2020). Toward a view of originary theory of meaningful relations: Educational technology in conversation with humanistic perspectives. *Educational Technology Research and Development*, 68(4), 1597-1614.
- Nosek, B. A., Alter, G., Banks, G. C., Borsboom, D., Bowman, S. D., Breckler, S. J., ... & Yarkoni, T. (2015). Promoting an open research culture. *Science*, 348(6242), 1422-1425.
- Pérez-Álvarez, R., Maldonado-Mahauad, J., & Pérez-Sanagustín, M. (2018). Tools to support self-regulated learning in online environments: Literature review. *Lifelong Technology-Enhanced Learning*, 16-30.
- Reeves, T. C. (2006). Design research from a technology perspective. In J. van den Akker, K. Gravemeijer, S. McKenney, & N. Nieveen (Eds.), *Educational design research* (pp. 52-66). Routledge.
- Sailer, M., Hense, J. U., Mayr, S. K., & Mandl, H. (2017). How gamification motivates: An experimental study of the effects of specific game design elements on psychological need satisfaction. *Computers in Human Behavior*, 69, 371-380.
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review*, 32(1), 77-112.
- Schwendimann, B. A., Rodríguez-Triana, M. J., Vozniuk, A., Prieto, L. P., Boroujeni, M. S., Holzer, A., ... & Dillenbourg, P. (2017). Perceiving learning at a glance: A systematic literature review of learning dashboard research. *IEEE Transactions on Learning Technologies*, 10(1), 30-41.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257-285.
- Tyler, T. R. (1988). What is procedural justice? Criteria used by citizens to assess the fairness of legal procedures. *Law & Society Review*, 22(1), 103-135.
- van Merriënboer, J. J. G., & Sweller, J. (2005). Cognitive load theory and complex learning: Recent developments and future directions. *Educational Psychology Review*, 17(2), 147-177.
- Wenger, E. (1998). *Communities of practice: Learning, meaning, and identity*. Cambridge University Press.
- Zimmerman, B. J. (2002). Becoming a self-regulated learner: An overview. *Theory Into Practice*, 41(2), 64-70.
- 이수영 (2018). 학회 홈페이지의 기능적 분석: 국내 학회 사례 중심으로. *학회지명*, 권(호), 페이지.

---

## 부록 (Appendix)

### A. 사이트 코드베이스 분석 통계

- 총 코드 라인: 약 N,NNN 라인
- TypeScript 컴포넌트: NN 개
- Firestore 컬렉션: NN 개
- 라우트: NN 개

### B. 매트릭스 매핑 검증 절차

각 매핑은 (1) 사이트 코드, (2) 설계 문서, (3) 운영진 인터뷰의 세 가지 원천에서 교차 검증되었다.

### C. IRB 면제 사유

본 연구의 분석 자료는 모두 anonymized aggregate 형태이며, 개별 회원의 식별 정보가 노출되지 않으므로 IRB 면제 대상이다.

---

> **버전 기록**
> - v1 (2026-05-25): 초고. 10개 이론·9개 도메인 매트릭스, 4 figure, 본문 IMRaD.
> - (v2 예정): 운영 로그 통계 보강, 인터뷰 결과 추가, 영문 초록.

# 교육공학 기초 용어 가이드 — PM 기획안

> 작성일: 2026-05-23
> 작성: PM 기획 (코드 변경 없음 — 결정용 제안서)
> 대상 의사결정자: 학회 운영진 / yonsei-edtech 메인테이너

---

## 요약 (Executive Summary)

- **가치**: 대학원 1~2학기 학생이 "독립/종속/매개/조절 변인", "ISD/ID/커리큘럼", "체제 vs 체계"처럼 자주 혼동되는 기초 용어를 한 곳에서 빠르게 잡아주는 진입 사전을 제공한다.
- **범위**: `/archive` 상단에 **"기초 용어 가이드"** 진입 카드 추가 → 별도 컬렉션 `archive_foundation_terms` + 공개 페이지 + 운영 CRUD + 초기 시드 ~20개. 기존 `archive_concepts`(이론·구성개념)와 **계층 분리**.
- **일정**: Phase 1만 단독으로 ~3~5일 (모델·페이지·시드). Phase 2 (검색·양방향 매핑) 추가 시 +2일. Phase 3~4는 선택.

---

## 1. 평가 — 가치

### 1-1. 사용자 페르소나
- **A. 대학원 1학기**: "교수님이 매개변인 통제하라는데 매개 vs 조절이 헷갈린다." → 양적 변인 4종을 한 화면에서 비교하며 익히고 싶음.
- **B. 대학원 2~3학기**: "ISD/ID/Curriculum이 다 같은 말인 줄 알았는데 발표 때 지적당했다." → 교육공학 핵심 용어의 위계와 차이를 정리하고 싶음.
- **C. 외부 진입자(학부생·타전공)**: "체제(system)랑 체계(systems)랑 한국어로 같아 보이는데 다르다고?" → 한국어 번역 차이까지 일반론 수준에서 안내받고 싶음.

### 1-2. 학회 차별화 포인트
- 기존 `archive_concepts`(자기효능감·메타인지 등 **구성개념**)·`archive_research_methods`(연구방법)·`archive_statistical_methods`(통계방법)는 모두 **응용 단계** 자원.
- 그 **밑단의 기초 어휘**를 정리한 자원은 현재 부재 — "들어가기 전 한 페이지"가 비어 있다.
- 학회 홈페이지의 "교육적 진입 동선"을 완성하는 마지막 퍼즐.

### 1-3. 기존 아카이브와의 시너지
- 변인 항목 → `archive_variables` 의 특정 변인으로 연결 (예: "독립변인" → "교수전략(IV) 예시 변인")
- ISD/ID → `archive_concepts` 의 ADDIE·SAMR·TPACK 등으로 연결
- 처치(treatment) → `archive_research_methods` 의 실험연구·준실험연구로 연결
- 표집·모집단 → `archive_statistical_methods` 의 표본 크기 산출과 연결
- 향후 `alumni_theses` 의 연구 설계 섹션에서 "처치", "조절변인" 등을 hover hint 로 노출 가능 (Phase 3).

---

## 2. 현황 진단

### 2-1. 현재 archive_* 컬렉션 구성 (확인 완료)
- `archive_concepts` — 이론·구성개념 (자기효능감, 학습몰입, TPACK 등). 공개 read.
- `archive_variables` — 측정 가능 변인 (cognitive/affective/behavioral/demographic/environmental/other). 공개 read.
- `archive_measurements` — 측정도구 (GSE-K, MSLQ 등). 공개 read.
- `archive_research_methods` — 연구방법 가이드 (양적/질적/혼합). `published` 게이트. `accessibleSummary` 패턴 보유.
- `archive_statistical_methods` — 통계방법 가이드. `published` 게이트. `accessibleSummary` 패턴 보유.
- `archive_favorites` — 사용자 관심 저장. 본인만 read/write.
- 진입 화면: `/archive` 랜딩 — 3개 카드(개념·변인·측정도구) + 연구방법/통계방법/APA 카드.

### 2-2. 기존 archive_concepts 와의 관계 — 3가지 옵션 비교

| 옵션 | 설명 | 장점 | 단점 |
|---|---|---|---|
| **A. 별도 컬렉션** `archive_foundation_terms` | "기초 용어"를 1급 엔티티로 분리 | 검색·분류·운영 UI 단순. concept(이론·구성개념)과 의미적 계층이 명확히 구분됨. `accessibleSummary`·`commonConfusions` 같은 신규 필드 자유롭게 추가 가능. firestore.rules 별도 게이트 적용 용이. | 컬렉션 1개 추가. 양방향 매핑 시 별도 ID 공간 관리 필요. |
| **B. 기존 `archive_concepts` 확장** (category 필드 추가) | concept 안에 `category: "foundation" \| "construct"` 식 분류 | 기존 코드·rules 재사용. URL `/archive/concept/[id]` 한 곳. | 데이터 의미 모호화: "자기효능감(이론적 구성개념)"과 "독립변인(연구설계 용어)"이 같은 타입에 섞임. 운영자가 카테고리 누락하면 fallback 동작이 애매. 신규 필드(예: `commonConfusions`)가 일반 concept엔 안 어울려서 nullable 필드만 늘어남. |
| **C. 하이브리드** (별도 컬렉션 + concept에 `foundationTermIds`) | 컬렉션은 분리하되 concept 상세에서 관련 기초 용어 chip 노출 | A의 분리 명확성 + 단방향 참조로 시너지 확보. | 양방향 동기화 필요. 약간의 운영 복잡도 증가. |

### 2-3. 권장안 — **옵션 A (별도 컬렉션)** + Phase 2 에서 부분 **C 도입**
- 1차: 깨끗하게 분리 → 의미·운영 부담 모두 작음
- 2차: `archive_concepts.foundationTermIds?: string[]` 를 추가해 단방향 참조만 시작 (양방향 denorm은 Phase 3 이후 수요 보고 결정)

---

## 3. 핵심 기능

### 3-1. 용어 카드·상세
- 카드(목록): 용어명(국문), 약어/원어, 카테고리 chip, 1줄 요약
- 상세: 정의 / 쉽게 이해하기(`accessibleSummary`) / 예시 / 자주 헷갈리는 항목(`commonConfusions`) / 참고문헌 / 관련 항목 chip

### 3-2. 카테고리 분류 (초안 6종)
- `variables` — 변인 (독립/종속/매개/조절/외생/통제 등)
- `research-design` — 연구 설계 기초 (연구모형/처치/통제집단/무선할당/사전사후 등)
- `instructional-design` — 교수설계 (ISD/ID/Curriculum/ADDIE의 의미 차이 등)
- `systems-theory` — 체제이론 (체제 vs 체계, 체제적 접근, 하위체제 등)
- `measurement` — 측정·평가 기초 (신뢰도/타당도/효과크기/구인타당도 등)
- `learning-theory` — 학습이론 기초 어휘 (ZPD/스캐폴딩/인지부하/메타인지 등 — 일부는 `archive_concepts` 와 경계 협의 필요)

> 카테고리는 운영자가 추가/수정할 수 있도록 enum + label dictionary 패턴 (`research-method.ts` 의 `RESEARCH_METHOD_KIND_LABELS` 와 동일 스타일).

### 3-3. 쉽게 이해하기 비유 (accessibleSummary 재활용)
- `archive_research_methods.accessibleSummary` 패턴 그대로 채택
- 학술적 단언 회피: "일반적으로", "흔히 ~로 비유됩니다" 같은 hedge 표현 강제
- 예: 매개변인 — "X→Y 사이를 '거쳐 가는' 다리. 일반적으로 'X는 M을 통해 Y에 영향을 준다' 형태로 표현합니다."

### 3-4. 관련 용어 양방향 매핑
- 변인 4종 상호 chip (독립↔종속↔매개↔조절)
- `relatedTermIds?: string[]` 단방향 저장, 화면에서는 양방향 표시 (denorm은 운영 cron 또는 저장 시 동기화 — Phase 2 에서 결정)
- 다른 컬렉션과의 연결: `relatedConceptIds`, `relatedResearchMethodIds`, `relatedStatisticalMethodIds`

### 3-5. 연구방법·통계방법·졸업생 학위논문과의 연계
- 용어 상세 페이지 하단에 "이 용어를 다루는 자료" 섹션:
  - 관련 연구방법 카드 (예: "처치" → "실험연구·준실험연구")
  - 관련 통계방법 카드 (예: "효과크기" → "Cohen's d / η²")
  - 관련 졸업생 학위논문 (Phase 4 옵션, AlumniThesis 태깅 필요)

### 3-6. 검색·필터 (한글·영문·약어)
- 한글명 / 영문명(`originalName`) / 약어(`abbreviation`) 동시 매칭
- 카테고리 chip 다중 필터
- 즐겨찾기 토글 (`archive_favorites` 에 `itemType: "foundation-term"` 추가)
- 정렬: 가나다순 / 최근 추가 / 카테고리

---

## 4. 데이터 모델

### 4-1. 권장 스키마 (별도 컬렉션 — 옵션 A)

```ts
// src/types/foundation-term.ts (신규)

export type FoundationTermCategory =
  | "variables"
  | "research-design"
  | "instructional-design"
  | "systems-theory"
  | "measurement"
  | "learning-theory";

export const FOUNDATION_TERM_CATEGORY_LABELS: Record<FoundationTermCategory, string> = {
  "variables": "변인",
  "research-design": "연구설계",
  "instructional-design": "교수설계",
  "systems-theory": "체제이론",
  "measurement": "측정·평가",
  "learning-theory": "학습이론 기초",
};

export interface FoundationTermConfusion {
  /** 헷갈리기 쉬운 다른 용어 (자유 텍스트 또는 termId) */
  with: string;
  /** 어떻게 다른지 1~2문장 hedge 설명 */
  difference: string;
}

export interface FoundationTermReference {
  id: string;
  title: string;
  author?: string;
  year?: number;
  url?: string;
}

export interface FoundationTerm {
  id: string;
  /** 국문 표제어 — 예: "독립변인" */
  term: string;
  /** 원어/약어 — 예: "Independent Variable / IV" */
  abbreviation?: string;
  /** 원어 풀이 — 예: "Independent Variable" */
  originalName?: string;
  category: FoundationTermCategory;
  /** 1줄 객관적 정의 (hedge 강제 — "일반적으로", "흔히") */
  summary: string;
  /** 쉽게 이해하기 — 비유·일상 사례 */
  accessibleSummary?: string;
  /** 상세 정의 (긴 텍스트/마크다운) */
  definition?: string;
  /** 어원·번역 노트 — 예: "system은 '체제'로, systems는 '체계'로 번역됩니다(통상)" */
  etymology?: string;
  /** 교육공학·연구에서의 예시 2~4개 */
  examples?: string[];
  /** 자주 헷갈리는 용어와의 비교 */
  commonConfusions?: FoundationTermConfusion[];
  /** 양방향 매핑 — 관련 기초 용어 */
  relatedTermIds?: string[];
  /** 외부 컬렉션 연계 (단방향 저장 + 양방향 노출) */
  relatedConceptIds?: string[];
  relatedResearchMethodIds?: string[];
  relatedStatisticalMethodIds?: string[];
  references?: FoundationTermReference[];
  /** 운영진 검수 후 공개 게이트 */
  published: boolean;
  curatedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}
```

### 4-2. firestore.rules 게이트 패턴
기존 `archive_research_methods` 와 동일한 published-게이트 채택:

```
match /archive_foundation_terms/{docId} {
  allow read: if resource.data.published == true
              || (isAuthenticated() && isStaffOrAbove());
  allow create, update, delete: if isAuthenticated() && isStaffOrAbove();
}
```

### 4-3. AlumniThesis 연계 가능성
- Phase 4 옵션: `AlumniThesis.foundationTermIds?: string[]` 추가
- 사용 예: "이 학위논문의 연구설계 섹션에서 다룬 기초 용어들" hover
- Phase 1~3 에서는 보류 (학위논문 태깅 부담 큼)

---

## 5. 페이지 구조

| 경로 | 역할 | 접근 |
|---|---|---|
| `/archive` | 기존 랜딩에 "기초 용어 가이드" 진입 카드 1개 추가 (research-methods 카드와 동일 디자인) | 공개 |
| `/archive/foundation-terms` | 카테고리 chip + 검색 + 목록 (`published: true` 만) | 공개 |
| `/archive/foundation-terms/[id]` | 상세: 정의 / 쉽게 이해하기 / 예시 / 자주 헷갈리는 항목 / 관련 항목 chip / 참고문헌 | 공개 |
| `/console/archive/foundation-terms` | 운영 CRUD 리스트 (draft 포함, `published` 토글) | staff+ |
| `/console/archive/foundation-terms/new` | 신규 작성 | staff+ |
| `/console/archive/foundation-terms/[id]/edit` | 수정 | staff+ |

> 디자인 토큰: 별도 색상 1개 부여 (제안: `slate` 또는 `stone` — 기존 violet/blue/emerald/sky/indigo/amber 와 시각적 충돌 없음). 아이콘 후보: `BookOpen` 또는 `GraduationCap` (lucide-react).

---

## 6. 시드 (초안)

> 모든 시드는 학술적 단언 회피 — "일반적으로", "흔히", "통상" 같은 hedge 표현 사용. 운영진 검수 후 published.

### 6-1. 사용자 명시 9개 (필수)

| # | term | abbreviation | category | summary (초안) | accessibleSummary (초안) |
|---|---|---|---|---|---|
| 1 | 독립변인 | IV / Independent Variable | variables | 일반적으로 연구자가 조작·선택하여 다른 변인에 영향을 주는 원인 쪽 변인을 가리킵니다. | 흔히 "내가 바꿀 수 있는 손잡이"에 비유됩니다. |
| 2 | 종속변인 | DV / Dependent Variable | variables | 일반적으로 독립변인의 영향을 받아 변하는 결과 쪽 변인을 가리킵니다. | "손잡이를 돌렸을 때 움직이는 바늘"처럼 측정 대상이 되는 쪽입니다. |
| 3 | 매개변인 | Mediator | variables | X→Y 관계 사이에서 영향을 전달하는 변인을 가리키며, 흔히 "X는 M을 통해 Y에 영향을 준다"의 M 위치에 옵니다. | 일반적으로 "다리(bridge)"에 비유됩니다. |
| 4 | 조절변인 | Moderator | variables | X→Y 관계의 강도·방향을 변화시키는 변인을 가리킵니다. 흔히 상호작용항(X×M)으로 검증됩니다. | "음량을 키우거나 줄이는 노브"에 비유됩니다. |
| 5 | 연구모형 | Research Model | research-design | 일반적으로 연구의 변인 관계를 시각·기호로 표현한 가설 지도를 가리킵니다. | "내 연구의 약도"라 부르기도 합니다. |
| 6 | 처치 | Treatment / Intervention | research-design | 실험·준실험 연구에서 연구자가 실험 집단에 의도적으로 가하는 자극·교수전략·프로그램을 가리킵니다. | 흔히 "약을 줬다 vs 안 줬다"의 '약'에 해당합니다. |
| 7 | ISD (교수체제설계) | Instructional Systems Design | instructional-design | 일반적으로 체제적 접근(systematic approach)으로 교수·학습을 분석·설계·개발·실행·평가하는 거시적 틀(예: ADDIE)을 가리킵니다. | 교수설계의 "큰 지도"에 해당합니다. |
| 8 | ID (교수설계) | Instructional Design | instructional-design | 흔히 ISD의 하위 활동으로, 특정 학습 목표 달성을 위한 교수전략·자료·활동을 구체화하는 작업을 가리킵니다. | ISD가 "지도"라면 ID는 "지도 위에 그리는 동선"에 가깝습니다. |
| 9 | 커리큘럼 | Curriculum | instructional-design | 일반적으로 학습자가 일정 기간 동안 경험하는 교육 내용·경험의 총체적 계획을 가리키며, ID·ISD보다 상위 범주에서 다뤄지는 경우가 많습니다. | "교육과정 전체 메뉴판"에 비유되곤 합니다. |

### 6-2. 추천 추가 11개 (운영자 재량)

| # | term | category | 한 줄 메모 |
|---|---|---|---|
| 10 | 체제(system) | systems-theory | 통상 단일 시스템(투입-과정-산출 단위)을 가리킬 때 쓰입니다. |
| 11 | 체계(systems) | systems-theory | 통상 여러 체제가 위계·관계를 이루는 큰 묶음을 가리킬 때 쓰입니다. (번역 관행) |
| 12 | 체제적 분석 | systems-theory | Dick & Carey 등에서 사용되는 분석 절차로 자주 인용됩니다. |
| 13 | 모집단 / 표본 / 표집 | measurement | 셋을 하나의 카드 묶음으로 다루거나 분리 (운영자 결정). |
| 14 | 효과크기 | measurement | Cohen's d / η² 등 통계방법 가이드 연계. |
| 15 | 신뢰도 | measurement | Cronbach α 중심으로 측정도구 가이드와 연계. |
| 16 | 타당도 | measurement | 구인·내용·준거 타당도 등 하위 분기. |
| 17 | ZPD (근접발달영역) | learning-theory | Vygotsky 일반론 + 스캐폴딩과 chip 연결. |
| 18 | 인지부하 | learning-theory | Sweller CLT 일반론 + `archive_concepts` 와 경계 협의. |
| 19 | 무선할당 / 무선표집 | research-design | 둘의 혼동을 commonConfusions 로 강제 비교. |
| 20 | 사전-사후 설계 | research-design | 처치·통제집단과 chip 연결. |

> 시드 콘텐츠 초안은 LLM 으로 작성 가능하나, **운영진 1인 이상의 검수 후 published=true** 로 전환하는 게이트 필수.

---

## 7. 구현 단계 (Phasing)

| Phase | 범위 | 예상 소요 | 결과물 |
|---|---|---|---|
| **Phase 1** | 데이터 모델(`foundation-term.ts`) + firestore.rules + `bkend.ts` API + 공개 페이지(`/archive/foundation-terms`, `[id]`) + 운영 CRUD + 시드 ~20개 + `/archive` 랜딩 카드 추가 | ~3~5일 | 사용 가능한 MVP |
| **Phase 2** | 검색(한글·영문·약어 동시) + 카테고리 chip 다중 필터 + 관련 용어 양방향 매핑 UI (`commonConfusions` 강조 디자인) + `archive_favorites.itemType` 확장 | +2일 | 탐색 UX 완성 |
| **Phase 3** (선택) | 연구방법·통계방법 상세 페이지에서 본문 내 용어 hover hint (인라인 정의 팝오버) | +2~3일 | 학습 자원 간 망상 연결 |
| **Phase 4** (선택) | `AlumniThesis.foundationTermIds` 태깅 + 학위논문 상세에 기초 용어 chip | +2~3일 + 운영 태깅 부담 | 학회 자료 통합도 극대화 |

> **권장 진행 순서**: Phase 1 단독으로 출시 → 사용 빈도·즐겨찾기 지표 1~2주 관찰 → Phase 2 진행 결정.

---

## 8. 리스크·완화책

| 리스크 | 영향도 | 완화책 |
|---|---|---|
| 콘텐츠 정확성 (학술 책임) | 높음 | (a) 모든 시드에 hedge 표현 강제 (b) `published` 게이트 — 운영진 검수 통과 후만 공개 (c) 상세 페이지 상단 "일반론 수준의 입문 안내이며, 학술 인용 시 원전을 확인하세요" 고지 (d) 인용 시 `references` 필수 |
| 용어 충돌·중복 (예: 인지부하가 concept 에도 있고 foundation-term 에도 있는 경우) | 중간 | 운영 가이드에 "이론적 구성개념은 concept, 입문 어휘는 foundation-term" 원칙 명시 + 양쪽 상호 chip 으로 충돌 대신 시너지화 |
| 기존 archive_concepts 와의 경계 모호 | 중간 | Phase 1 출시 시점에 `docs/contribution-guide/` (또는 운영진 노션)에 분리 기준 문서 1쪽 작성 |
| 시드 ~20개로 만족도 미달 | 낮음 | Phase 2 이후 운영진이 분기별 5~10개씩 추가하는 운영 루틴 합의 |
| 모바일 가독성 (긴 정의 + 비교표) | 낮음 | `commonConfusions` 는 모바일에서 collapsible 로 처리 |

---

## 9. 권장 진행 순서

1. **Phase 1 단독 출시** 권장. 데이터 모델·운영 CRUD·공개 페이지·시드 ~20개까지를 1차 릴리즈.
2. 시드 콘텐츠는 LLM 초안 → 운영진 1인 검수 → `published: true` 의 흐름. 검수 전 항목은 draft 로 staff에게만 노출.
3. Phase 2 (검색·양방향 매핑)는 Phase 1 사용 빈도 데이터 확인 후 GO/NO-GO.
4. Phase 3~4 는 학회 차원 의사결정 (운영 태깅 부담 큰 단계).

---

## 10. 결정 요청

다음 항목에 대해 학회 운영진의 결정이 필요합니다.

### D1. 컬렉션 분리 방식
- [ ] **권장(A)**: `archive_foundation_terms` 별도 컬렉션 (이 제안서 기본안)
- [ ] B: 기존 `archive_concepts` 에 `category` 필드만 추가
- [ ] C: 하이브리드 (별도 컬렉션 + concept 에 단방향 참조)

### D2. 초기 시드 범위
- [ ] 9개만 (사용자 명시 핵심만, 빠른 출시)
- [ ] **권장**: ~20개 (명시 9 + 추천 11)
- [ ] 30~50개 (운영진 추가 작성 부담 큼, 출시 지연)

### D3. 양방향 매핑 깊이
- [ ] **권장**: 같은 컬렉션 내(`relatedTermIds`) 양방향만 Phase 1 포함, 외부 컬렉션 연결은 단방향
- [ ] 외부 컬렉션(`relatedConceptIds`, `relatedResearchMethodIds`, `relatedStatisticalMethodIds`)까지 양방향 denorm Phase 1 에 포함

### D4. 카테고리 6종 채택 여부
- [ ] **권장**: 6종(variables / research-design / instructional-design / systems-theory / measurement / learning-theory) 시작
- [ ] 일부 카테고리 제외 또는 추가 (예: `assessment`, `qualitative-method` 분리)

### D5. 학습이론 기초(ZPD, 인지부하 등)와 archive_concepts 의 경계
- [ ] **권장**: 입문용 한 줄 정의는 foundation-term, 이론적 구성개념으로 다룰 때는 concept (양쪽에 모두 등록하되 상호 chip 으로 연결)
- [ ] foundation-term 에 학습이론 카테고리를 두지 않고 concept 으로만 운영

### D6. AlumniThesis 태깅 (Phase 4) 진행 의향
- [ ] 추후 결정 (Phase 1~2 사용 데이터 본 후)
- [ ] 명시적 NO — 운영 태깅 부담으로 보류

### D7. 디자인 토큰
- [ ] **권장**: `slate` (기존 violet/blue/emerald/sky/indigo/amber 와 비충돌)
- [ ] `stone` 또는 운영진 지정 색상

---

## 부록 A. 시드 콘텐츠 작성 체크리스트

각 시드 항목 작성 시:
- [ ] `summary` 1~2문장에 "일반적으로" / "흔히" / "통상" 중 하나 이상 포함
- [ ] `accessibleSummary` 는 학술적 단언 없이 비유·일상 사례만
- [ ] `examples` 2~4개 (가능하면 교육공학 맥락)
- [ ] `commonConfusions` 최소 1개 (없으면 명시적으로 빈 배열)
- [ ] `references` 최소 1개 (없으면 운영자 검수 시 보강)
- [ ] `published: false` 로 저장 후 운영진 검수 통과 시 토글

## 부록 B. 영향받는 기존 파일 (Phase 1 구현 시 — 참고용, 본 제안서는 코드 변경 없음)

- `src/types/index.ts` — re-export 1줄 추가
- `src/types/foundation-term.ts` — 신규
- `src/lib/bkend.ts` — `foundationTermsApi` 추가
- `src/lib/foundation-terms-seed.ts` — 신규 (시드 ~20개)
- `firestore.rules` — `archive_foundation_terms` 매처 1블록 추가
- `src/app/archive/page.tsx` — 진입 카드 1개 추가
- `src/app/archive/foundation-terms/page.tsx` — 신규
- `src/app/archive/foundation-terms/[id]/page.tsx` — 신규
- `src/app/console/archive/foundation-terms/page.tsx` — 신규
- `src/app/console/archive/foundation-terms/new/page.tsx` — 신규
- `src/app/console/archive/foundation-terms/[id]/edit/page.tsx` — 신규
- `src/components/archive/FoundationTermForm.tsx` — 신규
- `src/components/archive/FoundationTermCard.tsx` — 신규

---

**다음 단계**: 위 D1~D7 결정 후 Phase 1 스프린트 착수 가능.

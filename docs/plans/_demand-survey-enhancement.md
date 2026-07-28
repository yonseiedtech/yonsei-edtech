# 스터디 수요조사 고도화 제안서

> PM 분석 기준일: 2026-07-28  
> 대상: yonsei-edtech 연세교육공학회 학술 커뮤니티  
> 상태: 제안(미착수)

---

## 1. 현황 진단

### 1.1 데이터 모델

수요조사는 **별도 컬렉션 없이 comm_boards/comm_questions 재사용** 구조다.

| 계층 | 컬렉션 | 용도 |
|------|--------|------|
| 보드 | `comm_boards` (contextType=`"demand"`, contextId=`"demand-{YYYY}-{1\|2}"`) | 학기별 단일 보드 자동 프로비저닝 |
| 항목 | `comm_questions` | 수요 1건 = question 1건 |
| 반응 | `comm_likes` | "관심있어요"(`type="question"`) + "참여할래요"(`type="demand-join"`) |

**CommQuestion.demandPref** 필드에 수요 전용 메타를 저장한다:

```typescript
demandPref?: {
  format?: "온라인" | "오프라인" | "무관";        // 선호 형태
  note?: string;                                  // 자유 메모 (<=100자)
  status?: "collecting" | "reviewing" | "leader"
         | "designing" | "opened" | "declined";   // 파이프라인 단계
  leaderId?: string;                              // 모임장 ID
  leaderName?: string;
  design?: {                                      // 설계 정보 (designing 단계)
    startDate?: string;
    cadence?: string;
    level?: string;
    maxParticipants?: number;
    plan?: string;
  };
  linkedActivityId?: string;                      // 개설된 활동 ID
  statusNote?: string;                            // 운영진 메모 (<=120자)
};
```

**주제 구분**: `presenter` 필드에 `"스터디 희망"` 또는 `"세미나 희망"` 문자열로 구분.

**학기 분리**: `contextId = "demand-{YYYY}-{1|2}"` 형태로 학기별 보드가 분리된다 (`currentSemesterKey()` 기준). 과거 학기 보드는 `DemandRetroSection`에서 회고 집계로 활용.

### 1.2 파이프라인 흐름 (현재)

```
[회원] 주제 등록 (body + format + note)
    |
    v
수집중(collecting) ── 관심있어요(Heart) / 참여할래요(UserPlus) 반응
    |
    v  (운영진 또는 정족수 신호)
개설 검토중(reviewing)
    |
    v  (모임장 자원 또는 운영진 지정)
모임장 선정(leader)
    |
    v  (모임장/운영진이 설계 작성)
설계중(designing) ── startDate, cadence, level, maxParticipants, plan
    |
    v  (staff 전용: activitiesApi.create → 자동 생성)
개설됨(opened) ── linkedActivityId 연결, 참여 희망자 알림(notifyStudyOpened)
```

**세미나 수요**: 스터디와 달리 개설 파이프라인(StudyLaunchPanel) 없이 운영진이 직접 `reviewing -> opened` 또는 `declined`로 전환. 콘솔에서 "러닝 가이드 초안 만들기" / "세미나 개설 검토" 링크로 콘텐츠 전환 힌트 제공.

### 1.3 UI 배치

| 화면 | 경로 | 역할 |
|------|------|------|
| 스터디 페이지 | `/activities/studies` (탭) | `DemandSurveySection kind="study"` 인라인 |
| 세미나 페이지 | `/seminars` (탭 `demand`) | `DemandSurveySection kind="seminar"` 인라인 |
| 콘솔 집계 | `/console/demand` | 요약 통계, 퍼널, Top3, CSV, 개설 후 전환, 세미나 상위 주제, 학기 회고 |
| 운영진 홈 | `/staff` (홈 대시보드) | `useOpeningDemands` 상위 5건 위젯 |
| 수요조사 단독 | `/activities/demand` | `/activities/studies`로 리다이렉트 |

### 1.4 병목 및 한계

#### (A) 수요 수집의 구조적 한계

| 문제 | 상세 | 코드 참조 |
|------|------|-----------|
| **자유서술 의존** | `body`가 140자 자유 텍스트. 동일 주제를 다른 표현으로 등록하면 수요가 분산되어 집계 왜곡 | `DemandSurveySection.tsx:337-343` |
| **분야/난이도 미구조화** | 교육공학 하위 분야(교수설계, 학습분석, 테크놀로지 등)나 난이도(입문/중급/심화) 필드 없음. 분류는 `note` 자유 메모에 의존 | `comm-board.ts:80-81` |
| **선호 시간대 미수집** | 형태(온/오프/무관)만 수집. 요일·시간대 선호 없음 → 개설 후 시간 조율 별도 필요 | `DemandSurveySection.tsx:78-79` |
| **예상 기간 미수집** | 단기(4주) vs 장기(1학기) 선호 파악 불가. 설계 단계에서 모임장이 임의 결정 | `StudyLaunchPanel.tsx:85-91` |
| **1인 다건 허용** | 동일 회원이 같은 주제를 중복 등록 가능. 중복 제거 로직 없음 | `ensure-demand-board.ts:11` |

#### (B) 집계·시각화 한계

| 문제 | 상세 |
|------|------|
| **주제 클러스터링 부재** | 유사 주제 묶기 기능 없음. "논문 읽기" / "논문 리딩" / "학술 논문 분석"이 별개 항목 |
| **시간대 겹침 분석 없음** | 시간대 데이터 자체가 없어 모임 성사 가능성 예측 불가 |
| **히트맵/트렌드 없음** | 콘솔은 테이블 + Top3 + 퍼널 수치. 시각적 히트맵, 학기 간 트렌드 비교 없음 |
| **관심 vs 참여 괴리 미분석** | Heart(관심)와 UserPlus(참여) 비율 차이 시각화 없음 |

#### (C) 개설 전환 퍼널 병목

| 단계 | 병목 |
|------|------|
| collecting -> reviewing | **수동 판단**: 정족수(JOIN_THRESHOLD=3) 뱃지는 시각 힌트만. 자동 전환·알림 없음 |
| reviewing -> leader | **모임장 확보 난이**: 자원 버튼만 존재. 적임자 추천·매칭 로직 없음 |
| leader -> designing | **설계 품질 편차**: 자유 텍스트 plan. 템플릿·가이드 없음 |
| designing -> opened | **staff 게이트**: 운영진만 최종 개설 가능(firestore.rules). 운영진 부재 시 정체 |
| opened -> 실참여 | **참여 전환 추적 제한적**: conversionData는 존재하나 실시간이 아닌 콘솔 조회 시점 집계 |

#### (D) 회원 경험 한계

| 문제 | 상세 |
|------|------|
| **내 수요 진행 상황 추적 없음** | 회원이 등록한 수요의 현재 단계를 한눈에 볼 수 있는 "내 수요" 뷰 없음 |
| **개설 알림 한정적** | `notifyStudyOpened`은 "참여할래요" 누른 회원에게만. "관심있어요"만 누른 회원은 알림 미수신 |
| **수요 편집 불가** | 등록 후 수정 기능 없음. 삭제 후 재등록만 가능 |
| **수요 댓글/토론 없음** | 주제에 대한 의견 교환 기능 없음(comm_answers 미활용) |

---

## 2. 고도화 제안

### 2.1 수요 항목 구조화

#### 2.1.1 구조화 필드 추가

현재 `demandPref`에 다음 필드를 추가하여 자유서술 의존도를 낮춘다:

```
demandPref.fields (신규):
  - domain: string (선택)      // 교육공학 하위 분야 드롭다운
    후보: "교수설계" | "학습분석" | "에듀테크" | "HRD/평생교육"
         | "교육평가" | "연구방법론" | "기타"
  - difficulty: string (선택)  // 난이도
    후보: "입문" | "중급" | "심화" | "무관"
  - duration: string (선택)    // 예상 기간
    후보: "단기(4주 이내)" | "중기(5-8주)" | "장기(한 학기)" | "무관"
  - preferredDay: string[] (선택, 복수)  // 선호 요일
    후보: ["월","화","수","목","금","토","일"]
  - preferredTime: string (선택)         // 선호 시간대
    후보: "오전(9-12)" | "오후(13-17)" | "저녁(18-21)" | "무관"
```

**설계 원칙**:
- 모든 구조화 필드는 선택(optional). 진입 장벽을 높이지 않는다.
- `body`(주제 한 줄)는 그대로 유지 — 자유서술의 표현력 보존.
- 기존 `format`, `note` 필드와 공존. 마이그레이션 불필요(신규 필드 부재 = "무관" 취급).
- comm_questions 스키마 변경 없음 — `demandPref`는 이미 자유 형식 JSON.

**UI 변경**: `DemandSurveySection` 등록 폼에 아코디언/펼침 "상세 선호" 섹션 추가. 기본 접힌 상태로 부담 최소화.

**코드 참조**: `DemandSurveySection.tsx:331-392` (등록 폼), `comm-board.ts:78-109` (타입)

#### 2.1.2 유사 주제 안내 (중복 방지)

등록 폼에서 `body` 입력 중 기존 수요 목록을 실시간 필터링하여 "이미 비슷한 수요가 있습니다" 안내. 정확한 NLP 매칭 대신 단순 부분 문자열 + 형태소 키워드 매칭(클라이언트 사이드).

- 매칭된 항목 표시 시 "관심있어요로 합류" CTA → 수요 분산 방지.
- 구현 복잡도: 낮음 (기존 `kindItems` 배열 활용, 신규 API 불필요).

### 2.2 정량 집계 및 시각화

#### 2.2.1 주제별 수요 히트맵

구조화 필드 도입 후 `domain x difficulty` 매트릭스 히트맵 제공 (콘솔).

```
        입문  중급  심화
교수설계   3    1    0
학습분석   2    4    1
에듀테크   5    2    0
...
```

- 셀 색상 강도 = 해당 조합의 수요 건수.
- 클릭 시 해당 수요 목록 필터.
- 구조화 필드 미입력 항목은 "미분류" 행/열에 집계.

**코드 참조**: `console/demand/page.tsx:103-122` (현재 summary 계산 → 히트맵 데이터 확장)

#### 2.2.2 시간대 겹침 분석

`preferredDay` x `preferredTime` 교차 집계로 "모임 성사 가능성 점수" 산출.

- 동일 시간대 선호 회원이 정족수(3명) 이상이면 "성사 가능" 표시.
- 운영진에게 "이 시간대로 개설하면 N명 참여 가능" 인사이트 제공.

#### 2.2.3 학기 간 트렌드

`DemandRetroSection`을 확장하여 학기별 수요 건수, 분야별 비중 변화를 라인/바 차트로 시각화. 현재는 단일 학기 숫자 집계만 존재.

#### 2.2.4 관심 vs 참여 괴리 분석

각 수요 항목의 Heart(관심) 대비 UserPlus(참여) 비율을 시각화. 관심은 높지만 참여 의사가 낮은 주제 = 주제 자체보다 형식/시간대 조건이 맞지 않을 가능성 → 조건 조정 힌트.

### 2.3 관심 회원 매칭 및 알림

#### 2.3.1 유사 수요 클러스터링 (운영진용)

콘솔에서 운영진이 유사 주제를 수동으로 "묶기" 기능 제공:
- 체크박스로 복수 수요 선택 → "클러스터로 묶기" → 묶인 수요의 관심+참여 합산 표시.
- 클러스터 내 가장 공감 높은 항목을 "대표 수요"로 자동 선정.
- DB: `demandPref.clusterId` 필드 추가 (같은 클러스터 ID를 공유).

#### 2.3.2 모임장 추천

모임장 선정 단계에서 참여 의사 회원 중 조건 매칭:
- 과거 스터디 모임장 경험 (`activities` 컬렉션의 `leaderId` 이력 조회).
- 해당 주제 관련 아카이브 콘텐츠 기여도 (선택적).
- UI: "추천 모임장" 뱃지 표시 (StudyLaunchPanel 내).

**코드 참조**: `StudyLaunchPanel.tsx:78-83` (현재 responders 명단) → 명단에 경험 뱃지 추가

#### 2.3.3 알림 확장

| 이벤트 | 현재 | 제안 |
|--------|------|------|
| 수요 개설됨 | 참여할래요 회원에게 알림 | 관심있어요 회원에게도 알림 (낮은 우선순위) |
| 정족수 도달 | 없음 | 운영진에게 "N건 수요가 정족수 도달" 알림 |
| 모임장 모집 시작 | 없음 | 참여 의사 회원에게 "모임장을 찾고 있습니다" 알림 |
| 수요 장기 미처리 | 없음 | 14일 이상 `collecting` 상태 수요 → 운영진 리마인더 |
| 유사 수요 등록됨 | 없음 | 기존 수요 등록자에게 "비슷한 수요가 추가됨" 알림 |

**코드 참조**: `notifications/notify.ts:270` (현재 notifyStudyOpened) → 동일 패턴으로 확장

### 2.4 개설 전환 퍼널 개선

#### 2.4.1 자동 단계 전환

| 트리거 | 자동 전환 | 조건 |
|--------|-----------|------|
| 참여 의사 >= JOIN_THRESHOLD(3) | collecting -> reviewing | 현재는 뱃지만 표시. 자동 전환 + 운영진 알림 |
| 모임장 자원 완료 | reviewing -> leader | 현재도 부분 구현. 자원 시 자동 전환 확인 |
| 설계 필수 필드 충족 | leader -> designing | cadence + startDate 입력 시 자동 전환 |

**코드 참조**: `DemandSurveySection.tsx:54-55` (JOIN_THRESHOLD=3, 현재 시각 힌트만)

#### 2.4.2 퍼널 지표 강화

콘솔 퍼널에 다음 추가:
- **평균 체류 시간**: 각 단계에 머무는 평균 일수 (demandPref.status 변경 이력 필요 → `statusHistory` 배열 추가 제안).
- **단계별 이탈률**: 각 단계에서 `declined`로 빠지는 비율.
- **리드타임**: 수요 등록 → 개설까지 평균 소요일.

```
statusHistory (신규):
  Array<{ status: DemandStatus; at: string; by?: string }>
```

#### 2.4.3 설계 템플릿

`StudyLaunchPanel`의 설계 단계에 커리큘럼 템플릿 제공:
- "논문 리딩 스터디" / "도구 실습 스터디" / "프로젝트 스터디" 등 유형별 기본 구조.
- 모임장이 템플릿 선택 후 커스터마이즈 → 설계 품질 편차 감소.

### 2.5 회원 경험 개선

#### 2.5.1 "내 수요" 추적 뷰

마이페이지 또는 수요조사 섹션 상단에 "내가 등록/관심 표시한 수요" 필터 탭:
- 현재 단계 표시 (스테퍼 시각화).
- 단계 변경 시 타임라인 이력.
- "개설됨" 상태의 수요 → 해당 활동 페이지 바로가기.

#### 2.5.2 수요 편집

등록자 본인이 `body`, `format`, `note`, 구조화 필드를 수정 가능. 단, `status`가 `collecting`인 경우에만 (검토 진입 후 변경 방지).

**코드 참조**: `DemandSurveySection.tsx:239-246` (현재 삭제만 가능)

#### 2.5.3 수요 댓글/토론

comm_answers를 활용하여 수요 항목에 댓글 기능 추가. "이 스터디에서 다뤘으면 하는 세부 주제" 등 의견 수렴. 현재 comm_answers는 Q&A 보드에서 사용 중이므로 동일 패턴 재사용 가능.

### 2.6 운영 자동화

#### 2.6.1 정족수 도달 자동 알림

`commLikesApi.togglePlain` (참여할래요) 호출 시 해당 수요의 joinCount를 체크하여 JOIN_THRESHOLD 도달 시 운영진에게 인앱 알림 발송. 현재는 UI에 "개설 정족수" 뱃지만 표시.

#### 2.6.2 미처리 수요 리마인더

`collecting` 상태가 14일 이상 지속된 수요를 콘솔 대시보드에 "미처리 수요" 섹션으로 강조. 선택적: 운영진에게 주간 다이제스트 알림.

#### 2.6.3 학기 전환 시 미개설 수요 이월

학기가 바뀌면 새 보드가 생성되는데, 이전 학기의 미개설 상위 수요를 "재점화" 후보로 자동 제안. 현재 `DemandRetroSection`에서 회고만 제공 → "다음 학기로 이월" 원클릭 기능 추가.

#### 2.6.4 수요 기반 콘텐츠 자동 제안

세미나 수요 상위 주제를 기반으로:
- 러닝 가이드 초안 자동 생성 제안 (현재 링크만 제공 → 주제·분야 프리필 확대).
- 관련 아카이브 콘텐츠 자동 연결 ("이 주제 관련 기존 자료").

---

## 3. 우선순위 로드맵

### Phase 1: Quick Win (1-2주, 노력 LOW)

기존 코드에 최소 변경으로 즉각 효과.

| # | 항목 | 효과 | 노력 | 변경 범위 |
|---|------|------|------|-----------|
| Q1 | **유사 수요 안내** (2.1.2) | 수요 분산 방지, 중복 감소 | LOW | DemandSurveySection.tsx 등록 폼 |
| Q2 | **정족수 도달 시 자동 reviewing 전환** (2.4.1) | 운영진 수동 개입 감소 | LOW | DemandSurveySection.tsx joinMutation 콜백 |
| Q3 | **수요 편집 기능** (2.5.2) | 회원 UX 개선 | LOW | DemandSurveySection.tsx 항목 카드 |
| Q4 | **관심있어요 회원에게도 개설 알림** (2.3.3) | 참여 전환율 향상 | LOW | StudyLaunchPanel.tsx openMutation |
| Q5 | **콘솔 관심/참여 괴리 지표** (2.2.4) | 운영 인사이트 | LOW | console/demand/page.tsx |

### Phase 2: 구조화 및 집계 (3-4주, 노력 MEDIUM)

데이터 구조 확장과 시각화.

| # | 항목 | 효과 | 노력 | 변경 범위 |
|---|------|------|------|-----------|
| M1 | **구조화 필드 추가** (2.1.1) | 정량 분석 기반 확보 | MED | comm-board.ts, DemandSurveySection.tsx |
| M2 | **주제별 수요 히트맵** (2.2.1) | 수요 패턴 시각화 | MED | console/demand/page.tsx |
| M3 | **시간대 겹침 분석** (2.2.2) | 모임 성사 가능성 예측 | MED | console/demand/page.tsx |
| M4 | **"내 수요" 추적 뷰** (2.5.1) | 회원 경험 향상 | MED | 마이페이지 또는 수요 섹션 |
| M5 | **설계 템플릿** (2.4.3) | 설계 품질 표준화 | LOW-MED | StudyLaunchPanel.tsx |
| M6 | **정족수 도달 운영진 알림** (2.6.1) | 병목 해소 | LOW-MED | joinMutation + notify |

### Phase 3: 매칭 및 퍼널 (5-6주, 노력 HIGH)

지능형 매칭과 퍼널 심화.

| # | 항목 | 효과 | 노력 | 변경 범위 |
|---|------|------|------|-----------|
| H1 | **유사 수요 클러스터링** (2.3.1) | 수요 통합 관리 | HIGH | 콘솔 신규 UI + demandPref.clusterId |
| H2 | **모임장 추천** (2.3.2) | 모임장 확보 병목 해소 | MED-HIGH | StudyLaunchPanel + activities 이력 조회 |
| H3 | **퍼널 지표 강화** (2.4.2) | 운영 데이터 기반 개선 | HIGH | statusHistory 배열 + 콘솔 시각화 |
| H4 | **학기 간 트렌드** (2.2.3) | 장기 운영 인사이트 | MED | DemandRetroSection 확장 |
| H5 | **수요 댓글/토론** (2.5.3) | 회원 참여 심화 | MED | comm_answers 재사용 |

### Phase 4: 자동화 및 예측 (7-8주+, 노력 HIGH)

운영 자동화와 예측 기능.

| # | 항목 | 효과 | 노력 | 변경 범위 |
|---|------|------|------|-----------|
| L1 | **미처리 수요 리마인더** (2.6.2) | 운영 누락 방지 | MED | 콘솔 위젯 + 선택적 알림 |
| L2 | **학기 전환 수요 이월** (2.6.3) | 수요 연속성 보장 | MED | DemandRetroSection + ensure-demand-board |
| L3 | **알림 체계 확장** (2.3.3 전체) | 참여 전환 극대화 | HIGH | notifications/notify.ts 확장 |
| L4 | **수요 기반 콘텐츠 자동 제안** (2.6.4) | 콘텐츠-수요 연결 | MED-HIGH | 콘솔 + 러닝가이드 연동 |

---

## 4. 성공 지표 (KPI)

### 4.1 핵심 지표

| KPI | 정의 | 현재 측정 가능 여부 | 목표 |
|-----|------|-------------------|------|
| **수요->개설 전환율** | opened / 전체 수요 | O (콘솔 퍼널) | 현재 대비 +20%p |
| **개설 리드타임** | 수요 등록 -> opened 평균 일수 | X (statusHistory 필요) | 21일 이내 |
| **수요당 평균 참여 의사** | demand-join 평균 수 / 수요 건수 | O (joinCounts 집계) | 4명 이상 |
| **개설 후 실참여율** | 실참여 / 참여 의사 | O (conversionData) | 60% 이상 |

### 4.2 보조 지표

| KPI | 정의 | Phase |
|-----|------|-------|
| 수요 중복률 | 유사 주제 수요 / 전체 수요 | Phase 1 (유사 안내 도입 후 감소 추이) |
| 구조화 필드 입력률 | 선택 필드 입력 건 / 전체 수요 | Phase 2 (필드 도입 후) |
| 모임장 확보 소요일 | reviewing -> leader 평균 일수 | Phase 3 (statusHistory 후) |
| 미처리 수요 비율 | 14일+ collecting / 전체 수요 | Phase 4 (리마인더 후 감소 추이) |
| 학기 간 수요 이월률 | 이월된 수요 / 미개설 수요 | Phase 4 |

### 4.3 측정 방법

- **즉시 가능** (콘솔 기존 인프라): 전환율, 참여 의사 수, 개설 후 실참여율 → `console/demand/page.tsx`의 conversionData, summary 확장.
- **Phase 2 이후**: 구조화 필드별 집계 → 히트맵 데이터.
- **Phase 3 이후**: statusHistory 기반 리드타임, 단계별 체류 시간.

---

## 5. 근거 및 코드 참조 종합

| 제안 | 핵심 근거 | 주요 코드 참조 |
|------|-----------|---------------|
| 구조화 필드 (2.1.1) | `body` 140자 자유서술만으로는 정량 집계·매칭 불가. `demandPref`가 자유 형식 JSON이므로 스키마 변경 없이 필드 추가 가능 | `comm-board.ts:78-109`, `DemandSurveySection.tsx:331-392` |
| 유사 수요 안내 (2.1.2) | 1인 다건 허용 + 중복 제거 없음 → 수요 분산 | `ensure-demand-board.ts:11`, `DemandSurveySection.tsx:152-164` (kindItems) |
| 정족수 자동 전환 (2.4.1) | JOIN_THRESHOLD=3 달성 시 뱃지만 표시, 운영진 수동 개입 필요 | `DemandSurveySection.tsx:54-55, 437` |
| 모임장 추천 (2.3.2) | StudyLaunchPanel에서 responders 명단은 보여주나 경험 기반 추천 없음 | `StudyLaunchPanel.tsx:78-83` |
| 퍼널 지표 강화 (2.4.2) | 콘솔 퍼널은 현재 카운트만 표시. 시간 축 데이터(단계 전환 일시) 미기록 | `console/demand/page.tsx:112-121` (funnel 계산) |
| 알림 확장 (2.3.3) | notifyStudyOpened은 demand-join 회원만 대상. Heart(관심) 회원 누락 | `StudyLaunchPanel.tsx:177-184`, `notify.ts:270` |
| 학기 전환 이월 (2.6.3) | DemandRetroSection에서 "미개설 상위 주제" 표시하나 이월 액션 없음 | `DemandRetroSection.tsx:195-238` |
| 세미나 파이프라인 (현황 1.2) | 세미나는 StudyLaunchPanel 미적용. 운영진 직접 전환만 가능 | `DemandSurveySection.tsx:519-545` (kind별 분기) |

---

## 6. 리스크 및 고려사항

| 리스크 | 완화 방안 |
|--------|-----------|
| 구조화 필드 추가 시 등록 UX 복잡도 증가 | 모든 필드 optional + 아코디언 UI (기본 접힘). 주제 한 줄만으로도 등록 가능 유지 |
| comm_questions 재사용 구조의 한계 | demandPref JSON 확장으로 대응 가능. 별도 컬렉션 분리는 Phase 4 이후 재평가 |
| statusHistory 배열 추가 시 문서 크기 증가 | 단계 전환은 수요당 최대 6회. 문서 크기 영향 미미 |
| 클러스터링 운영 부담 | 수동 클러스터링으로 시작. 자동화는 수요 규모 증가 후 검토 |
| 알림 과다 | 알림 유형별 사용자 수신 설정(opt-out) 기능 선행 필요 |

---

## 부록: 현재 파일 구조 맵

```
src/features/demand/
  ensure-demand-board.ts    -- 학기별 보드 프로비저닝 (comm_boards)
  DemandSurveySection.tsx   -- 수요 등록·반응·상태 전환 (스터디/세미나 공용)
  DemandRetroSection.tsx    -- 지난 학기 회고 집계 (콘솔)
  StudyLaunchPanel.tsx      -- 스터디 개설 파이프라인 다이얼로그

src/features/staff/
  useOpeningDemands.ts      -- 운영진 홈 "개설 대기" 위젯 훅

src/app/console/demand/
  page.tsx                  -- 수요 집계 콘솔 (staff+)

src/app/activities/demand/
  page.tsx                  -- 리다이렉트 → /activities/studies

src/types/
  comm-board.ts             -- CommQuestion.demandPref 타입 정의

src/features/notifications/
  notify.ts                 -- notifyStudyOpened (개설 알림)
```

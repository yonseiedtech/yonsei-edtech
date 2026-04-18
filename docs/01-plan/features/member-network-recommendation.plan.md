# member-network-recommendation

> **재학생(휴학생) ↔ 졸업생 네트워크 + "연세교육공학人(인)" 추천 매칭 시스템**
>
> 마스터 플랜 v2 Track 3 (인적 네트워크 시각화 + 추천 매칭) 의 구체화 plan.
> 작성일: 2026-04-19 / Track 9 / Owner: Daekyoung
> 의존: Track 2 (profile portfolio), Track 4 (alumni-thesis-db), Track 5 (course-management), Research Timer (study sessions)

---

## 1. 배경 / 문제

현재 사이트는 회원 디렉토리, 졸업논문 DB, 수강과목 마스터, 논문 읽기 트랙커가 모두 **독립된 데이터 사일로**로 존재한다. 사용자는 다음을 알지 못한다:

- 내 관심 연구분야와 가까운 **선배(졸업생)** 가 누구인가
- 내가 가르치는 학교급(초/중/고)에 같은 처지의 **현직 교사 회원**이 누구인가
- 내가 읽고 있는 논문을 **이미 읽은 사람**이 누구인가
- 내가 읽은 논문이 **누구의 졸업논문 참고문헌**에 등장하는가
- 같은 수업을 **함께 듣고 있는 동기/이전 수강자**가 누구인가

이 정보가 **클릭 한번에 5명**으로 보여진다면, 멘토링·스터디·공동연구·논문 작성 자문이 자연스럽게 발생한다.

---

## 2. 명칭 / 브랜딩

> **연세교육공학人** — "人"만 사람인 한자(人, U+4EBA)로 표기.
>
> - 화면 헤더: `연세교육공학人 추천` (한자 「人」 강조 색상)
> - 컴포넌트명: `YonseiEdTechPeopleRecommendation`
> - 모바일 단축형: `에듀텍人`
> - i18n 키: `network.people.title`

**Tone & Manner**: "당신을 기다리는 학자들" — 단순 친구 추천이 아닌 **학문 공동체 매칭**임을 명시.

---

## 3. 사용자 시나리오

### 3-1. 재학생 (석사 1학기, 초등교사)
1. 마이페이지 진입 → 우측 카드 `연세교육공학人 추천` 5장
2. 각 카드:
   - 사진 + 이름 + 신분 배지(재학/휴학/졸업)
   - **매칭 사유 칩**: `같은 관심 분야 (학습분석)` `같은 신분 (초등교사)`
   - 학기·기수 / 진행 중 활동 1건
   - `프로필 보기 →` `메시지 / 차담 신청 →`
3. 사유 칩을 클릭 → 같은 사유로 매칭된 사람 전체 리스트 (10–30명) 페이지로 이동

### 3-2. 졸업생 (현직 중등교사, 박사졸업)
1. 마이페이지 → `당신을 찾는 후배` 카드
2. 본인 키워드/논문/수업과 매칭된 후배 3–5명 표시
3. "멘토 신청 받기 ON/OFF" 토글 (멘토링 의지 표명)

### 3-3. 휴학생 (재학생 신분 유지)
- **신분 필터에서 "재학" 카테고리에 휴학 포함**
- 본인 카드에는 "휴학 중" 미니 배지만 추가 (네트워크 노출은 동일)
- 휴학생 본인은 "추천 노출 ON/OFF" 옵션 (기본 ON)

### 3-4. 운영진
- `/console/network-insights` — 매칭 사유별 추천 노출/클릭/응답 통계
- 매칭 알고리즘 가중치 튜닝 UI (관리자 전용)

---

## 4. 추천 시그널 (6종)

각 시그널은 0–1 정규화 점수로 환산되어 **가중합**으로 최종 매치 스코어 계산.

| # | 시그널 | 데이터 소스 | 산출 |
|---|---|---|---|
| **S1** | 관심 연구분야 동일 | `users.researchInterests[]` (Track 2 portfolio) | Jaccard(자기 키워드, 상대 키워드) |
| **S2** | 신분유형 + 학교급 동일 | `users.identityType` + `users.schoolLevel` (신규 필드: `elementary` / `middle` / `high` / `university` / `other`) | 정확 일치 = 1.0, 신분만 일치 = 0.4, 불일치 = 0 |
| **S3** | 같은 논문 저장(읽기) | `research_papers` (회원이 등록한 읽기 논문) | 두 사람 paperKey 교집합 / 합집합 (자카드, 최소 1건 이상) |
| **S4** | 졸업논문 참고문헌과 겹침 | Track 4 `alumni_theses` + `thesis_references` (DOI/제목 정규화) | 자기 읽기 논문 ↔ 졸업생 학위논문 references 교집합 / 자기 논문 수 |
| **S5** | 같은 수업 이전 수강자 | Track 5 `course_offerings` + `users.courses[]` | 이전 학기 동일 offeringId 1건 이상 = 1.0 (스칼라) |
| **S6** | 같은 수업 현재 동시 수강 | Track 5 (현재 학기 offering) | 현재 학기 동일 offering 1건 이상 = 1.0 (스칼라) |

### 4-1. 가중치 (V1 기본값)

```typescript
const WEIGHTS = {
  S1_research:     0.30,  // 관심 분야 (강한 신호)
  S2_identity:     0.20,  // 신분/학교급
  S3_paperOverlap: 0.15,  // 같은 논문 저장
  S4_thesisRef:    0.20,  // 졸업논문 참고문헌 겹침 (학문 계보)
  S5_pastCourse:   0.05,  // 과거 동수강
  S6_curCourse:    0.10,  // 현재 동수강
};
// 최종: matchScore = Σ(Si * Wi). 0.0 ~ 1.0 범위.
```

### 4-2. 매칭 사유 칩 (Reason Chips)

UI에는 점수가 아닌 **자연어 사유**로 노출:

| Si > threshold | 칩 라벨 |
|---|---|
| S1 ≥ 0.3 | `같은 관심 분야 ({공통키워드})` |
| S2 = 1.0 | `같은 학교급 ({초/중/고}) {신분}` |
| S2 = 0.4 | `같은 {신분유형}` |
| S3 ≥ 0.2 | `같은 논문 {N}편 읽음` |
| S4 ≥ 0.2 | `{선배 논문} 참고문헌과 겹침` |
| S5 = 1.0 | `{과목명} 이전 수강` |
| S6 = 1.0 | `{과목명} 현재 동수강` |

각 카드는 **최대 3개 칩**만 노출 (점수 높은 순).

---

## 5. 데이터 모델

### 5-1. User 확장 (신규 필드)

```typescript
interface User {
  // 기존 필드 ...
  identityType?: "current" | "leave" | "graduate";       // 재학/휴학/졸업
  schoolLevel?: "elementary" | "middle" | "high"
              | "university" | "other";                  // 학교급 (S2)
  researchInterests?: string[];                          // Track 2 portfolio 동기화
  networkOptOut?: boolean;                               // 추천 노출 거부
  mentorAvailable?: boolean;                             // 졸업생 멘토 의지
  lastNetworkRefreshAt?: string;                          // ISO
}
```

### 5-2. NetworkRecommendation (캐시 컬렉션)

추천은 **batch 계산 후 캐시**. 매 페이지 로드마다 합산하면 비용 폭발.

```typescript
interface NetworkRecommendation {
  id: string;                       // {forUserId}_{candidateUserId}
  forUserId: string;
  candidateUserId: string;
  matchScore: number;               // 0.0 ~ 1.0
  signals: {
    s1_research: number;
    s2_identity: number;
    s3_paperOverlap: number;
    s4_thesisRef: number;
    s5_pastCourse: number;
    s6_curCourse: number;
  };
  reasonChips: string[];            // 사전 계산된 사유 칩 (최대 3)
  computedAt: string;               // ISO
  ttl: string;                      // 7일 후 만료
}
```

### 5-3. NetworkInteraction (피드백 학습용)

```typescript
interface NetworkInteraction {
  id: string;
  fromUserId: string;
  toUserId: string;
  action: "viewed" | "profile_clicked" | "message_sent" | "dismissed" | "blocked";
  reasonChipsShown?: string[];
  matchScore?: number;
  createdAt: string;
}
```

---

## 6. 알고리즘 / 컴퓨트 전략

### 6-1. 1차 필터 (Coarse Recall)

전체 회원 N명 중 페어 N×N 비교는 비현실적. 다음으로 후보군 축소:

```
candidates(forUser) =
   { 같은 관심 분야 1개 이상 }
 ∪ { 같은 학교급 + 같은 신분 }
 ∪ { 본인 paperKey 1건 이상 겹침 }
 ∪ { 본인이 읽은 논문이 references에 있는 졸업논문의 저자 }
 ∪ { 같은 수업 1건 이상 (과거+현재) }
   - { 본인 + 차단/블록한 사람 + networkOptOut=true }
```

각 집합 max 200명 → 합집합 최대 ~500명까지 축소.

### 6-2. 2차 점수 계산 (Fine Rank)

500명 후보를 6개 시그널로 점수 계산 → 상위 5명만 캐시.

- **JS Worker / Cloud Function** 으로 비동기 처리.
- 사용자 본인은 즉시(최대 1초) 본인 추천 큐 새로고침 가능 (rate-limit: 1/30분).

### 6-3. 컴퓨트 트리거

| 트리거 | 대상 | 빈도 |
|---|---|---|
| 회원 가입 / 프로필 변경 | 본인 + 영향 회원 | 즉시 |
| 새 논문 읽기 등록 | 본인 | 즉시 |
| 새 졸업논문 references 추가 | 영향 회원 (해당 reference 포함자) | 야간 배치 |
| 새 학기 수강 등록 | 본인 + 동수강자 | 즉시 |
| 정기 재계산 | 전 회원 | 주 1회 (일요일 03:00 KST) |

### 6-4. 콜드 스타트 처리

- 신규 가입 → S2 (신분) + S6 (현재 수강) 만으로 임시 5명 추천
- "관심 분야 추가하면 더 정확한 추천을 받을 수 있어요" CTA

---

## 7. UI 구성

### 7-1. 마이페이지 위젯

```
┌──────────────────────────────────────────────┐
│  연세교육공학人(인) 추천                       │
│  ─────────────────────────────────────         │
│  당신과 연결될 가능성이 높은 학자들             │
│                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │ 👤김유진 │ │ 👤박상민 │ │ 👤이서연 │ │ ...    ││
│  │ 박사졸업 │ │ 재학 휴학│ │ 재학    │ │        ││
│  │ #학습분석│ │ #초등교사│ │ #같은수업│ │        ││
│  └────────┘ └────────┘ └────────┘ └────────┘│
│                                              │
│  새로고침 ↻         더 보기 →                  │
└──────────────────────────────────────────────┘
```

### 7-2. 전체 리스트 페이지 `/network/people`

- **필터**: 신분(재학/휴학/졸업), 학교급, 관심분야, 매칭 사유
- **정렬**: 매치 스코어 / 최근 활동 / 기수
- **표시**: 카드 그리드 (8개 / 더보기)
- **알림**: "1주일 새 활동 없음" 회원은 흐림 처리

### 7-3. 사유별 페이지

- `/network/by-reason/research?keyword=학습분석` — 같은 키워드 회원 전체
- `/network/by-reason/paper?paperKey=10.xxx` — 같은 논문 읽은 회원
- `/network/by-reason/course?offeringId=xxx` — 같은 수업 회원

### 7-4. 운영진 콘솔 `/console/network-insights`

- 매칭 사유별 클릭률 / 응답률
- 가중치 슬라이더 (실시간 미리보기)
- 매칭 노출 ↔ 메시지 전환율 funnel

---

## 8. 프라이버시 / 보안

| 항목 | 정책 |
|---|---|
| 노출 거부 | `networkOptOut: true` 시 추천 큐에서 완전 제외 |
| 차단 | NetworkBlock 컬렉션 (양방향) |
| 휴학생 | 기본 노출 (본인이 OFF 가능) |
| 비회원 | 추천 일체 미노출 |
| 졸업생 미인증 | 매핑된 alumni_theses는 익명 카드(이름 가림) |
| 학교급 노출 | identityType='current' 인 학생은 학교급 비공개 가능 (개인정보 동의) |
| 매칭 사유 노출 | 본인이 동의한 데이터(연구분야·신분·수강이력·읽기 논문)만 사유 칩 생성 |

### 8-1. firestore.rules

```
// network_recommendations: 본인 것만 read
match /network_recommendations/{recId} {
  allow read: if request.auth.uid == resource.data.forUserId;
  allow write: if false;  // 시스템(Cloud Function)만 write
}

// network_interactions: 본인 작성, 본인+staff read
match /network_interactions/{intId} {
  allow read: if request.auth.uid in [resource.data.fromUserId, resource.data.toUserId]
    || isStaff();
  allow create: if request.auth.uid == request.resource.data.fromUserId;
}

// network_blocks: 본인 차단 목록만 본인이 read/write
match /network_blocks/{blockId} {
  allow read, write: if request.auth.uid == resource.data.fromUserId;
}
```

---

## 9. 구현 우선순위 (Phase)

### Phase 1 — MVP (1주, ~12h)

| # | 작업 | 산출물 |
|---|---|---|
| 1 | User 신규 필드 + 가입/마이페이지 입력 UI | identityType / schoolLevel 등 |
| 2 | 단순 매칭 (S1 + S2만, 클라이언트 사이드) | `useRecommendedPeople(userId)` |
| 3 | 마이페이지 위젯 (5명 표시) | `YonseiEdTechPeopleRecommendation.tsx` |
| 4 | `/network/people` 전체 리스트 페이지 | 필터·정렬 |
| 5 | networkOptOut + 차단 기능 | UI + rules |
| **합계** | | **~12h** |

### Phase 2 — 시그널 확장 (1주, ~10h)

| # | 작업 |
|---|---|
| 6 | S3 (같은 논문 읽기) 추가 — research_papers 인덱싱 |
| 7 | S5/S6 (수강 이력) — Track 5 데이터 활용 |
| 8 | NetworkInteraction 로그 + dismiss/block UI |
| 9 | 사유별 페이지 3종 |

### Phase 3 — 졸업논문 계보 (1.5주, ~14h)

| # | 작업 |
|---|---|
| 10 | S4 (참고문헌 겹침) — Track 4 alumni_theses + thesis_references 활용 |
| 11 | 졸업생 카드에 "당신의 읽기 논문 N건 인용" 사유 |
| 12 | 졸업생 멘토 신청 ON/OFF + 후배 추천 큐 |

### Phase 4 — 캐시·배치·튜닝 (1주, ~10h)

| # | 작업 |
|---|---|
| 13 | NetworkRecommendation 캐시 컬렉션 + Cloud Function 배치 |
| 14 | 야간 정기 재계산 (cron 일요 03:00 KST) |
| 15 | `/console/network-insights` 운영진 대시보드 |
| 16 | 가중치 튜닝 + A/B 테스트 인프라 |

---

## 10. 의존 / 연관 트랙

| 트랙 | 활용 |
|---|---|
| Track 2 (profile-portfolio-system) | researchInterests, identityType, currentRole |
| Track 4 (alumni-thesis-db) | S4 졸업논문 references |
| Track 5 (course-management) | S5/S6 수강 이력 |
| Track 7 (host-participant-dashboard) | 호스트 화면에 "이 신청자와 비슷한 회원" 추천 |
| Track 8 (past-staff-history) | 과거 운영진 자동 멘토 후보 가중치 |
| Research Timer (study sessions) | S3 가중치에 "최근 30일 내 읽음" 보정 |

---

## 11. 측정 KPI

| KPI | 정의 | 목표 (3개월) |
|---|---|---|
| 추천 노출률 | 마이페이지 진입 시 추천 위젯 본 비율 | 90%+ |
| CTR | 추천 카드 → 프로필 클릭 | 25%+ |
| 응답 전환율 | 프로필 클릭 → 메시지/차담 신청 | 8%+ |
| 멘토 신청 매칭률 | 졸업생 멘토 ON 회원 중 후배 매칭 발생 | 40%+ |
| 노출 거부율 | networkOptOut 비율 | < 10% |
| 사유 칩별 CTR | S1~S6 별 매칭 사유 클릭률 | 가중치 튜닝 근거 |

---

## 12. 위험 / 완화

| 위험 | 완화 |
|---|---|
| 콜드 스타트 (관심 분야 미입력) | S2/S6 만으로 임시 5명, CTA로 입력 유도 |
| 추천이 항상 같은 사람 (Top 5 고착) | 노출 빈도 페널티(같은 페어 30일 연속 노출 시 -0.1) |
| 졸업생 정보 갱신 불가 | Track 4 self-claim UI + alumni 초대 메일 |
| 매칭 사유 노출의 사생활 침해 우려 | 본인 동의 데이터만 사유 칩 생성 + 운영자 검수 큐 |
| 신규 회원이 추천 큐에 거의 안 뜸 (피추천 부족) | "신입 회원" 부스트(가입 30일 내 +0.1) |
| 컴퓨트 비용 폭발 | 1차 후보 필터 + 주 1회 정기 배치 + 변경 이벤트만 부분 재계산 |

---

## 13. 향후 확장 (Out of Scope - V2+)

- **임베딩 기반 시멘틱 매칭** — 키워드 → 텍스트 임베딩(OpenAI/SBERT) 으로 유사도 강화
- **그래프 시각화** — D3 force-directed graph로 학회 인적 네트워크 전체 시각화
- **차담 일정 자동 매칭** — 멘토-멘티 가능 시간 교집합으로 1:1 미팅 슬롯 추천
- **공동연구 제안 매칭** — 연구 제안서(ResearchProposal)와 연계, 가설/방법론 보완 멘토 추천
- **알림** — 매칭 점수 ≥ 0.7 신규 회원 등장 시 푸시/메일

---

## 14. 핵심 파일 (예정)

```
src/types/index.ts                                      # User 확장 + Network 타입 3종
src/lib/bkend.ts                                        # networkApi (recommendations/interactions/blocks)
src/features/network/
├── recommendation-engine.ts                            # 시그널 6종 + 가중합 + 1차 필터
├── YonseiEdTechPeopleRecommendation.tsx                # 마이페이지 위젯
├── PeopleCard.tsx                                       # 카드 컴포넌트 (사유 칩)
├── PeopleListFilters.tsx                                # 필터/정렬
├── useRecommendedPeople.ts                              # React Query 훅
├── network-block-store.ts                               # 차단 목록 관리
└── reasonChip-utils.ts                                  # 사유 칩 라벨 생성

src/app/network/
├── people/page.tsx                                      # 전체 리스트
├── by-reason/[type]/page.tsx                            # 사유별 페이지
└── settings/page.tsx                                    # 노출 거부/차단 설정

src/app/console/network-insights/page.tsx                # 운영진 대시보드

functions/                                                # Cloud Functions (선택)
├── recomputeNetworkBatch.ts                              # 야간 배치
└── onUserChange.ts                                       # 변경 이벤트 트리거

firestore.rules                                           # network_* 컬렉션 정책
```

---

## 15. 1줄 요약

> **"학회 자산(회원·논문·수업·읽기 이력) 4종을 6개 매칭 시그널로 묶어, 마이페이지에 「연세교육공학人 추천 5명」 카드를 띄우는 학자 매칭 시스템."**

Phase 1 MVP만으로도 즉시 가치 발생 (1주). Phase 3 (졸업논문 계보) 까지 가야 본 트랙의 차별화가 완성됨.

# 진단평가 오답 풀이·개념 암기카드(플래시카드) 설계

작성일: 2026-06-15 · 대상: yonsei-edtech (Next.js 16 + Firestore + react-query)
범위: 설계 전용(코드 수정·배포 금지). executor 착수용 TODO 포함.

---

## 0. 요약

진단평가 결과 리포트(DiagnosisReport)에서 **틀린 문항을 1탭으로 암기카드(flashcard)로 저장**하고, 마이페이지의 학습 라우트에서 **앞/뒤 뒤집기 + 맞음/틀림 채점 + SM-2 간소화 간격반복**으로 반복 학습하는 "진단 → 오답 암기 → 재진단" 루프를 설계한다.

핵심 설계 결정:
- 신규 컬렉션 **1개(flashcards)** 만 추가. 복습 메타까지 동일 문서에 포함(서브컬렉션·로그 분리 안 함 — MVP 단순화).
- 멱등 저장은 기존 streak_events·profile_likes·postReactionsApi.toggle 패턴 그대로 — **deterministic doc id + dataApi.upsert(merge:true)**.
- firestore.rules 는 paper_reading_logs / diagnostic_results 블록(본인 rw + staff read)을 그대로 복제.
- 잔디(LearningStreak) 연계는 기존 가중치 불변 원칙을 지키되 **streak_events 외부 가산점 채널**(이미 존재)로 1일 1회 멱등 가산하는 옵션만 제안(채택은 운영 판단).

**현재 코드의 가장 큰 제약(반드시 선행)**: DiagnosisReport 와 diagnosis/page.tsx::handleComplete 는 채점 후 **문항·응답 원본을 버리고 집계(areaScores/weakConcepts)만 보존**한다. 오답 카드를 만들려면 "어떤 문항을 틀렸는가 + 그 문항의 정답/해설" 이 리포트까지 전달돼야 한다. 따라서 1순위 작업은 **틀린 문항 상세를 리포트로 흘려보내는 데이터 경로 추가**다.

---

## 1. 데이터 모델

### 1.1 신규 컬렉션 flashcards (1개만)

```ts
// src/types/flashcard.ts (신규)
export type FlashcardSource = "diagnostic_wrong" | "concept";

export interface Flashcard {
  // deterministic doc id (멱등 저장 핵심):
  //  - diagnostic_wrong : `${userId}__dx__${sourceQuestionId}`
  //  - concept          : `${userId}__concept__${conceptId}`
  // → 같은 문항/개념 재저장 시 upsert(merge) 로 중복 생성 차단.
  id: string;
  userId: string;
  source: FlashcardSource;

  // ── 카드 내용 (denormalized — 문항/개념 원본이 바뀌어도 카드 학습은 독립) ──
  front: string;        // 앞면: 질문 또는 개념명
  back: string;         // 뒷면: 정답 + 해설 (개념 카드는 개념 정의)
  frontHint?: string;   // 부가 맥락(선택, 앞면 하단 보조)

  // ── 출처 메타 (역링크·재진단 연결용) ──
  sourceQuestionId?: string;  // DiagnosticQuestion.id (seed:* 또는 firestore id)
  conceptId?: string;         // archive_concepts 문서 id → /archive/concept/[id] 링크
  area?: "statistics" | "method" | "concept";
  cognitiveLevel?: "remember" | "understand" | "apply" | "analyze";

  // ── 복습 메타 (SM-2 간소화) ──
  dueAt: string;        // 다음 복습 예정일 YYYY-MM-DD (KST) — 대기열 정렬·"오늘 복습" 필터 키
  streak: number;       // 연속 정답 횟수(=상자 단계). 0 시작. 틀리면 0 리셋.
  intervalDays: number; // 현재 복습 간격(일). 다음 dueAt = today + intervalDays
  reviewCount: number;  // 누적 복습 횟수
  correctCount: number; // 누적 정답 횟수
  lastReviewedAt?: string | null; // 마지막 복습 ISO (null=미학습)

  createdAt?: string;
  updatedAt?: string;
}
```

### 1.2 SM-2 간소화(Leitner 변형) 간격 규칙

신규 의존성 금지 — 순수 함수 1개로 구현(src/lib/flashcard-srs.ts).

| streak(연속정답) | 다음 intervalDays |
|---|---|
| 0 (신규/직전 오답) | 1 |
| 1 | 3 |
| 2 | 7 |
| 3 | 16 |
| 4+ | 30 (상한) |

- **정답**: streak += 1, intervalDays = STEPS[min(streak,4)], dueAt = todayKST + intervalDays, correctCount += 1.
- **오답**: streak = 0, intervalDays = 1, dueAt = todayKST + 1.
- 공통: reviewCount += 1, lastReviewedAt = now.
- todayKST 는 기존 todayYmdKst() 헬퍼(Sprint 47 KST drift fix) 재사용 — 신규 날짜 유틸 만들지 말 것.

### 1.3 왜 컬렉션 1개인가 (트레이드오프)

| 안 | 장점 | 단점 | 결론 |
|---|---|---|---|
| A. 단일 flashcards (복습 메타 포함) | 컬렉션 최소·rules 1블록·쿼리 단순 | 복습 이력(매회 정오답 로그) 미보존 | **채택** (MVP, paper_reading_logs 단일 문서 패턴 동일) |
| B. flashcards + flashcard_reviews 로그 분리 | 학습 분석 풍부 | 컬렉션 2개·rules 2블록·집계 복잡 | 후속(분석 필요 시) |
| C. diagnostic_results 에 배열 임베드 | 신규 컬렉션 0 | 문서 비대·개별 멱등/복습 갱신 불가·rules 충돌 | 기각 |

---

## 2. 저장 플로우 (멱등)

### 2.1 선행 필수 — 틀린 문항 상세를 리포트로 전달 (현재 누락된 경로)

근거: src/app/diagnosis/page.tsx:287-340 handleComplete 는 gradeQuestion 후 집계만 state 에 저장하고 문항·응답을 버린다. DiagnosisReport(src/components/diagnosis/DiagnosisReport.tsx:39-49) props 에도 문항 상세가 없다.

해결: handleComplete 채점 루프에서 **오답 문항의 카드 소재를 수집**해 새 state wrongItems 에 담고 리포트로 내려준다.

```ts
// page.tsx — 채점 루프 내 오답 분기에서 수집
interface WrongCardSeed {
  questionId: string;       // q.id
  front: string;            // 문항 표시 본문 (mcq=question, term=prompt, ox=statement)
  back: string;             // 정답 + 해설 (유형별 정답 텍스트 + q.explanation)
  area: DiagnosticArea;
  cognitiveLevel?: CognitiveLevel;
  conceptId?: string;       // resolveConcept().id (있으면)
  conceptName?: string;
}
```

- 정답 텍스트 도출은 유형 분기(questionType)로 구성: mcq/compare/scenario/passage/diagram → options[answerIndex]; ox → "참/거짓"; term → answer; ordering → items 순서 나열; matching → left↔right 매핑 텍스트. (러너에 이미 동일 분기 존재 → 헬퍼 1개로 추출: src/lib/diagnostic-answer-text.ts)
- DiagnosisReport 에 wrongItems?: WrongCardSeed[] prop 추가.

### 2.2 리포트 UI — "암기카드로 저장" 버튼

DiagnosisReport.tsx 의 약점 개념 카드(line 268-313) 아래 신규 섹션 "틀린 문항 복습 카드" 추가:
- 오답 문항을 카드 리스트로 표시(앞면 미리보기 + 정답/해설 접기).
- 각 문항 [암기카드 저장] 버튼 + 상단 [전체 저장] 버튼.
- 비로그인 시 버튼 비활성 + "로그인 후 저장 가능" 안내(기존 diagnosticResultsApi.create 의 if (user) 가드와 동일 정책).

### 2.3 멱등 저장 API (flashcardsApi.saveFromWrong)

기존 streakEventsApi.add(bkend.ts:2698-2716)·profile_likes toggle(bkend.ts:1637) 패턴 그대로:

```ts
// src/lib/bkend.ts 에 추가
export const flashcardsApi = {
  makeId: (userId, source, refId) =>
    `${userId}__${source === "concept" ? "concept" : "dx"}__${refId}`,
  listByUser: (userId) =>
    dataApi.list<Flashcard>("flashcards", { "filter[userId]": userId, limit: 1000 }),
  // 멱등 — 같은 (userId, 문항) 재저장 시 내용만 갱신, 복습메타는 보존
  saveFromWrong: async (userId, seed: WrongCardSeed) => {
    const id = `${userId}__dx__${seed.questionId}`;
    const existing = await dataApi.get<Flashcard>("flashcards", id).catch(() => null);
    const content = {
      userId, source: "diagnostic_wrong",
      front: seed.front, back: seed.back, area: seed.area,
      cognitiveLevel: seed.cognitiveLevel ?? null,
      sourceQuestionId: seed.questionId, conceptId: seed.conceptId ?? null,
    };
    if (existing) return dataApi.update<Flashcard>("flashcards", id, content);
    const today = todayYmdKst();
    return dataApi.upsert<Flashcard>("flashcards", id, {
      ...content,
      dueAt: today, streak: 0, intervalDays: 1,
      reviewCount: 0, correctCount: 0, lastReviewedAt: null,
    });
  },
  update: (id, data) => dataApi.update<Flashcard>("flashcards", id, data),
  delete: (id) => dataApi.delete("flashcards", id),
};
```

**주의(멱등 갱신 함정)**: 단순 upsert(merge) 로 복습메타(dueAt/streak…)를 항상 초기값으로 보내면, **이미 학습 중인 카드를 재저장할 때 복습 진척이 리셋**된다. → 위처럼 get-선확인 분기(존재 시 내용 필드만 update). profile_likes.toggle 의 getDoc 선확인 패턴과 동일.

### 2.4 중복/멱등 가드 요약
- doc id deterministic → 같은 문항/개념 카드는 항상 1장.
- "전체 저장" 다중 호출은 Promise.allSettled 로 부분 실패 허용(개별 카드 토스트).
- 저장 후 버튼 상태 idle→saving→saved(기존 saveState 패턴 재사용).

---

## 3. 암기 학습 UI (플래시카드 러너)

신규 컴포넌트 src/components/flashcard/FlashcardStudy.tsx + 진입 라우트 src/app/flashcards/page.tsx.

### 3.1 학습 세션 동작
1. flashcardsApi.listByUser(user.id) 로드 → **오늘 복습 대상**(dueAt <= todayKST) 우선, 다음 신규(reviewCount===0), 나머지. 정렬은 클라이언트(복합 인덱스 회피 — 기존 course_todos/activity_progress 주석 정책 준수).
2. 카드 1장 표시: **앞면**(front + area 배지 + frontHint) → 탭/스페이스로 **뒤집기**(CSS transform rotateY). 뒷면 = back(정답·해설) + conceptId 있으면 /archive/concept/[id] 링크.
3. 뒷면 노출 후 **[맞음]/[틀림]** → flashcard-srs 로 다음 메타 계산 → flashcardsApi.update(id, nextMeta) → 다음 카드.
4. 상단 진행률 바(기존 러너 role="progressbar" 패턴 재사용) + "오늘 복습 N장 / 전체 M장".
5. 빈 상태: "오늘 복습할 카드가 없습니다 — 진단평가로 새 카드를 만들어 보세요" + /diagnosis CTA.

### 3.2 간격반복 채택 여부 (제안)
- MVP 에서 **간소 SRS 포함**(§1.2). 구현 비용 작고("순수 함수 1개 + update 호출") "맞으면 간격↑" 가 루프 핵심.
- 단, UI 는 "오늘 복습/전체" 2탭으로만 노출 — 간격 숫자는 뒷면 작은 메타로만(과도한 SRS 노출 지양).

### 3.3 재사용 자산
- Card/Badge/Button/Skeleton/PageContainer/PageHeader (기존 ui).
- 뒤집기·진행률·접근성(aria-pressed/progressbar)은 DiagnosisRunner 패턴 차용.

---

## 4. 진입점 & 잔디 연계

### 4.1 진입점 (3곳, 모두 기존 라우트에 링크만 추가)
1. **진단 리포트 하단**: "암기카드로 저장" 직후 "저장한 카드 학습하기 →" 링크(/flashcards).
2. **마이페이지**(MyPageView.tsx): 기존 진단/약점 경로(DiagnosticWeakConceptPath.tsx) 인접에 "내 암기카드 (오늘 복습 N장)" 위젯 + /flashcards 링크. 오늘 복습 수 = listByUser 후 dueAt<=today count.
3. **별도 라우트** /flashcards (학습 본체).

권장: 루프 강화 목적이므로 (1)+(2) 우선, (3) 라우트 필수.

### 4.2 잔디(LearningStreak) 연계 — 제안만 (기존 가중치 불변)
- 기존 잔디는 도메인 컬렉션 직접 집계 + 외부 이벤트는 streak_events(bkend.ts:2690). "진단평가" 라벨(grad-activity.ts:53)은 이미 매핑됨.
- **제안 A(권장)**: "암기카드 학습" 을 streak_events 외부 채널로 **1일 1회 멱등 가산**.
  - 신규 StreakEventType: "flashcard-study" 1종 추가(streak-event.ts:14 enum).
  - refId = todayYmdKst() → doc id `${userId}__flashcard-study__2026-06-15` → 하루 여러 장 복습해도 1회만 가산(기존 day-bucketed collab-chapter-edit 패턴 동일).
  - 점수: 기존 활동 최저(+2~+3) 수준 보수 책정(예 +2). **기존 활동 점수는 일절 변경하지 않음** → 가중치 불변 준수.
  - LearningStreak 합산부(streak_events 소비)에 신규 type 라벨 매핑 1줄 + grad-activity.ts ACTIVITIES 에 행 1개("암기카드 학습", research) 추가.
- **제안 B(대안)**: 잔디 미연계 — 카드 학습은 별도 진행률만. 점수 인플레 우려 시 B.
- 채택은 운영 판단으로 남김(설계는 A 권장·B 안전).

---

## 5. firestore.rules

diagnostic_results / paper_reading_logs 블록(rules:575-584, 1098-) 복제 — 본인 rw + staff read(추후 분석용, 선택).

```
// ─── Flashcards (진단 오답·개념 암기카드) ───
match /flashcards/{docId} {
  // 본인 + 운영진(학습 분석, 선택). 분석 불요 시 isStaffOrAbove() 제거 가능.
  allow read, list: if isAuthenticated()
    && (resource == null
        || resource.data.userId == request.auth.uid
        || isStaffOrAbove());
  allow create: if isAuthenticated()
    && request.resource.data.userId == request.auth.uid;
  allow update, delete: if isAuthenticated()
    && resource.data.userId == request.auth.uid;
}
```

- streak_events 에 flashcard-study 추가 시 기존 streak_events 룰(본인 rw)은 변경 없음(enum 확장만).

---

## 6. 구현 범위 · 규모 · 단계별 TODO

### Phase 0 — 데이터 경로 선행 (필수, 모든 작업의 전제)
- [ ] (S) src/lib/diagnostic-answer-text.ts — 유형별 정답 텍스트 도출 헬퍼(러너 분기 추출). 단위테스트 1개.
- [ ] (M) src/app/diagnosis/page.tsx::handleComplete — 오답 분기에서 WrongCardSeed[] 수집 → state → DiagnosisReport 전달.
- [ ] (S) DiagnosisReport.tsx props 에 wrongItems 추가.

### Phase 1 — 저장
- [ ] (S) src/types/flashcard.ts — Flashcard 타입 + FlashcardSource.
- [ ] (S) src/lib/flashcard-srs.ts — SM-2 간소 순수함수 nextReview(card, correct), todayYmdKst() 재사용. 단위테스트.
- [ ] (M) src/lib/bkend.ts — flashcardsApi(makeId/listByUser/saveFromWrong[get-선확인 멱등]/update/delete).
- [ ] (M) DiagnosisReport.tsx — "틀린 문항 복습 카드" 섹션 + 개별/전체 저장 버튼 + saveState.
- [ ] (S) firestore.rules — flashcards 블록 추가 후 배포(rules 게이트).

### Phase 2 — 학습 UI
- [ ] (L) src/components/flashcard/FlashcardStudy.tsx — 뒤집기·맞음/틀림·진행률·빈상태.
- [ ] (S) src/app/flashcards/page.tsx — 로드/정렬(클라이언트)/PageHeader.
- [ ] (S) MyPageView.tsx — "내 암기카드(오늘 N장)" 위젯 + 링크.

### Phase 3 — 잔디 연계 (제안 A 채택 시, 선택)
- [ ] (S) src/types/streak-event.ts — "flashcard-study" enum 추가.
- [ ] (S) FlashcardStudy.tsx — 세션 중 1회 streakEventsApi.add({type:"flashcard-study", refId: todayYmdKst(), points: 2}).
- [ ] (S) LearningStreak 합산부 + grad-activity.ts ACTIVITIES 라벨 매핑 1행.

규모 합계: 신규 컬렉션 1 · 신규 파일 4(타입/srs/러너/라우트) · 수정 파일 5(page/report/bkend/rules/mypage) + 잔디 3(선택). 신규 npm 의존성 0.

### 검증 게이트
- npm run build + tsc 통과.
- 런타임 QA: 진단 오답 발생 → 저장 → /flashcards 로드 → 뒤집기/채점 → dueAt 갱신 확인(빌드통과 ≠ 런타임정상). 비로그인 저장 버튼 비활성. 같은 문항 재저장 시 복습메타 비리셋(멱등 함정 회귀).

---

## 7. 리스크 / 주의

| 리스크 | 영향 | 완화 |
|---|---|---|
| 멱등 재저장이 복습 진척 리셋 | 학습 데이터 손실 | §2.3 get-선확인 분기(내용만 update) — 회귀테스트 명시 |
| seed 문항 id(seed:*)는 Firestore 미적재 | refId 안정성 | seed id 도 deterministic 문자열 → doc id 안전. 시드 개편 시 id 변동 가능하나 back 내용 denorm 보존으로 카드 유지 |
| 복합 인덱스(userId+dueAt 정렬) silent empty | /flashcards 빈 화면 | 기존 정책대로 **정렬은 클라이언트**, filter 는 userId 단일만 |
| staff read 노출 | 개인 학습 데이터 | 분석 불요 시 rules 에서 isStaffOrAbove() 제거(본인 only) |
| 잔디 점수 인플레 | 가중치 균형 | 제안 A 는 1일 1회·최저점·기존 점수 불변. 우려 시 제안 B(미연계) |

# H4 (v9) — v7/v8 지표 정확성 교차검증 감사 보고서 (코드 무수정)

> 감사자: 독립 검증 서브에이전트 (Opus) · 대상: `src/features/insights/` + 관련 cron/lib · 2026-07-20 실측
> 방법: 집계 수식·분모/분자 정의·기간/타임존 경계·센티널 처리·이벤트 vs 고유회원 혼동을 코드로 재현해 의심.
> **코드 수정 없음.** 각 발견은 [파일:라인 → 수식 문제 → 실데이터 오작동 시나리오 → 심각도 → 수정안].
> 심각도: **A** = 표시 숫자가 실제로 크게 틀림(의사결정 왜곡) · **B** = 특정 조건에서 틀림/오해 · **C** = 정의 모호·경미·표기.
> 불확실 항목은 **PLAUSIBLE** 표기(무자격 REST 프로브로 재확인 권장).

## 요약 (건수)
- **A급 2건** · **B급 6건** · **C급 7건**
- 최우선(A1): `cnt2` 혼합 타입 부등식 조회로 인한 30일 지표 과대집계 가능성 — 실 데이터 프로브로 즉시 확인 필요.
- 확인된 **비이슈(오탐 방지 기록)**: `lastVisitAt`(active7d/30d) 문자열 단일타입으로 안전 · `computeGoalStreak` 호출부는 `prevWeekKey`(지난 완료주)를 넘겨 "이번 주 미기록" 경계 올바르게 회피 · `DigestStats.hoursAfterSend`의 `weekKey+"T00:00:00Z"` 발송 앵커는 실제 발송시각(월 00:00 UTC = 09:00 KST)과 일치.

---

## A급

### A1. `adoption-metrics.ts` `cnt2()` — Firestore 혼합 타입 부등식 조회로 30일 지표 전면 과대집계 (PLAUSIBLE, 프로브 필요)
- **파일**: `src/features/insights/adoption-metrics.ts:81-87` (`cnt2`), 사용처 `:129,130,131,132,140`
- **영향 지표**: `readingLogs30d`·`sessions30d`·`posts30d`·`comments30d`·`diagnostics.completed30d`
- **수식 문제**:
  ```ts
  const cnt2 = async (name, field, days) => {
    const [a, b] = await Promise.all([
      cnt(col(name).where(field, ">", iso(days))),   // 문자열 하한
      cnt(col(name).where(field, ">", tsCut(days))),  // Timestamp 하한
    ]);
    return Math.max(a, 0) + Math.max(b, 0);
  };
  ```
  설계 의도: "문자열 createdAt 문서는 `a`가, Timestamp createdAt 문서는 `b`가 각각 잡아 겹치지 않는다"(주석 :78-79). 그러나 **Firestore 값 타입 정렬 순서는 Timestamp < String**이다. 부등식(`>`)은 타입 경계를 넘어 전역 순서로 평가되므로, `where(field, ">", tsCut)` (Timestamp 하한)는 **모든 문자열 타입 createdAt 문서를 (날짜 무관) 전부 매칭**한다. 즉 `b = (Timestamp 문서 중 30일) + (문자열 문서 전체 이력)`.
  - 결과: 한 컬렉션이 문자열 createdAt을 하나라도 포함하면 `a + b ≈ (30일분) + (문자열 문서 총량)` 으로 **누적 이력만큼 과대**. (`a`(문자열 하한)는 Timestamp 문서가 전부 문자열보다 앞서 정렬되어 오염되지 않음 — 오염은 `b` 한쪽만.)
- **실데이터 근거**: `grep`으로 두 기록 방식 공존 확인 — `lib/bkend.ts`는 `createdAt: serverTimestamp()`(Timestamp), 서버 경로·`funnel-telemetry.ts`·`visit-tracker.ts`·`notifications-bridge.ts` 등은 `new Date().toISOString()`(문자열). 코드 주석도 혼합 존재를 명시.
- **오작동 시나리오**: `diagnostics.completed30d`가 `diagnostics.total`(누적)보다 **커지는** 눈에 보이는 모순, 또는 `posts30d`가 실제 30일 글 수의 수 배로 표시. `adoption-snapshot` cron이 이 값을 매주 적재하므로 추세 그래프 전체가 왜곡.
- **심각도**: **A** (확정 시). 단, Firestore가 실제로 크로스타입을 반환하는지 + 각 컬렉션의 실제 타입 분포에 의존 → **PLAUSIBLE**.
- **확인법(프로브)**: 무자격 REST/Admin으로 `diagnostic_results`에 대해 `count(createdAt > tsCut(30))` 와 `count(*)` 비교 — 전자가 총량에 근접하면 확정. 또는 콘솔에서 `completed30d > total` 여부만 봐도 즉시 판정.
- **수정안(참고)**: `b` 쿼리에 상한을 추가해 타입 범위를 가두거나(`where(field,">",tsCut).where(field,"<",Timestamp.now()+ε)` — Firestore 부등식 단일필드 상·하한은 동일 타입으로 범위 폐색), 또는 컬렉션별 기록 타입을 한쪽으로 정규화(백필) 후 단일 쿼리로 단순화.

### A2. `FunnelSection.tsx` / `SuggestedActionsSection.tsx` — `limit(500)` + `orderBy` 부재 → 최근 30일 이벤트 누락
- **파일**: `FunnelSection.tsx:53-59` (`fetchFunnelRows`), 동일 패턴 `SuggestedActionsSection.tsx:93-101`
- **수식 문제**:
  ```ts
  const q = buildQuery(collection(db,"user_activity_logs"),
    where("funnelType","==",funnelType), limit(500)); // orderBy 없음
  ...
  .filter(r => r.createdAt >= cutoffISO ...) // 클라이언트 30일 필터
  ```
  `orderBy` 없이 `limit(500)`이면 Firestore는 **문서 키(ID) 순 앞 500건**을 반환(사실상 오래된/임의 표본). 그 뒤 클라이언트가 "최근 30일"만 남긴다. 누적 이벤트가 500건을 넘으면 **반환된 500건이 과거 이벤트로 채워져 최근 30일 이벤트가 0에 가깝게 필터링**될 수 있다.
- **오작동 시나리오**: 온보딩/진단 퍼널 이벤트가 누적 500건 초과인 개강 시즌에, 실제 최근 트래픽이 많아도 퍼널 각 단계 수가 급감·0으로 표시 → 전환율 "—" 또는 허위 저조. **SuggestedActionsSection**은 같은 소스로 "재개 넛지" 액션을 판정하므로, 최근 이탈을 놓치거나(미제안) 과거 표본 기준으로 오제안.
- **심각도**: **A** (이벤트 누적이 500 초과인 순간부터 상시 오작동). 현재 규모(수십 명)에선 임박하지 않을 수 있으나 8월 유입 시 도달 위험.
- **수정안(참고)**: `orderBy("createdAt","desc")` 추가 + 30일 하한을 서버 `where("createdAt",">=",cutoffISO)`로 이관(복합 인덱스 필요) 하여 최신부터 잘라오게 한다. `limit`도 이벤트량 기준 상향.

---

## B급

### B1. `adoption-metrics.ts` — `responseRate` 분자 소스 불일치(정규화 필드 의존)
- **파일**: `:190-198`
- **문제**: `responseRate = mWithAnswers / mQuestions`. `mWithAnswers`는 질문 문서의 **정규화 필드 `answerCount > 0`**으로 판정하나, 같은 루프의 `mAnswers`는 **`comm_answers` 컬렉션 `count()`**로 별도 집계. 두 소스가 다르다. `answerCount`가 미갱신/누락(0·undefined)인데 실제 `comm_answers`엔 답변이 있으면 그 질문은 "미답변"으로 분류 → **responseRate 과소**. (0분모는 `mQuestions>0 ? … : null`로 올바르게 처리됨.)
- **심각도**: **B** (정규화 필드 신뢰도에 의존).
- **수정안**: `answerCount` 대신 boardId별 `comm_answers`의 distinct questionId 집합으로 판정하거나, `answerCount` 갱신 무결성을 검증.

### B2. `adoption-metrics.ts` — 멘토링 보드 선택자 불일치(`contextType` vs `contextId`)
- **파일**: `adoption-metrics.ts:183` `where("contextType","==","mentoring")` vs `weekly-digest/route.ts:249` `where("contextId","==",MENTORING_CONTEXT_ID)` (`loadMentorPendingByUser`)
- **문제**: adoption의 `questions/answers/resolved/unmatchedNewcomers/responseRate`는 **contextType="mentoring"인 모든 보드**를 합산하지만, 다이제스트의 멘토 대기 집계는 **단일 전역 보드 contextId=MENTORING_CONTEXT_ID**만 본다. 두 축의 모집단이 다르면 콘솔 멘토링 지표와 이메일 멘토 알림이 서로 다른 수를 근거로 함. 특히 contextType 태깅이 안 된 멘토링 보드가 있으면 adoption에서 통째로 누락.
- **심각도**: **B** (정의/모집단 불일치 — 운영 판단 필요).
- **수정안**: 두 경로가 동일 선택자(권장: `contextId==MENTORING_CONTEXT_ID` 또는 문서화된 단일 기준)를 공유하도록 통일.

### B3. `adoption-metrics.ts` — `reviewQueueDetail.draft = notPublished − held` 가정 취약
- **파일**: `:218-224` (원천 `:152-159`)
- **문제**: 4개 검수 컬렉션에서 `draft = max(0, published==false 수 − held 수)`. 이는 **held 문서가 모두 published==false**라는 가정에 의존. held인데 published==true인 문서가 있으면, 그 held는 `notPublished`에 포함되지 않는데도 빼기 때문에 **draft 과소(음수는 0으로 클램프되어 실제 draft가 있어도 0 표시)**. 반대로 held가 unpublished면 정확.
- **심각도**: **B**.
- **수정안**: draft를 `reviewStatus=="draft"` 직접 카운트로 집계(현재 `archive_concepts`가 쓰는 방식과 동일)해 뺄셈 추정을 제거. 4개 컬렉션의 `reviewStatus` 스키마 확인 필요.

### B4. `DigestStatsSection.tsx` — 열람률·CTR이 "고유"가 아닌 "이벤트 총량" → 100% 초과 가능
- **파일**: `DigestStatsSection.tsx:278-285` (CTR·openRate), 원천 `r/digest-open/route.ts:32-42`·`r/digest/route.ts:50-59`
- **문제**: `digest_opens.count`·`digest_link_clicks.count`는 이벤트마다 `FieldValue.increment(1)` — **고유 수신자 수가 아니라 총 픽셀/클릭 히트 수**. 그런데 `CTR = clicks/opens`, `openRate = opens/recipients`를 "율"로 표기·라벨. 한 수신자가 여러 번 열람/클릭하거나(정상), 이미지 프록시 재요청 시 분자 팽창 → **openRate·CTR이 100%를 초과**할 수 있고 이를 "열람률/CTR"로 오독. 이미지 차단 시 opens 과소로 CTR 과대(클릭>열람)도 발생. 헤더에 픽셀 한계 고지는 있으나 율 자체의 정의 문제는 미해소.
- **심각도**: **B** (숫자 자체가 율로서 부정확·오해 유발).
- **수정안**: 고유 집계가 필요하면 수신자 단위 dedup 소스로 전환, 아니면 라벨을 "열람 수/클릭 수(연간 비교용, 고유 아님)"로 명확화하고 `min(100%, …)` 클램프 대신 정의를 표기.

### B5. `weekly-goal` 연속·추세 — `weekly_goal_records` 적재가 다이제스트 발송에 종속 → 스트릭 단절
- **파일**: `weekly-goal.ts:167` `computeGoalStreak`·`:191` `recentWeekBars` (소비: `WeeklyGoalCard.tsx:65-66`), 적재 원천: `weekly-digest/route.ts:998-1013` (upsert가 `sendDigest` 내부, `:899-901` 콘텐츠 0건 조기반환 **이후**)
- **문제**: `weekly_goal_records`(met/streak 원천)는 **주간 다이제스트 cron이 실제 발송에 성공할 때만** 기록된다. 그런데 `sendDigest`는 (a) 세미나·글·활동·질문이 모두 0건이면 레코드 기록 전에 조기 반환, (b) 발송 대상 `recipients`는 `weeklyDigest !== false` + quiet-hours 통과 회원만 → **다이제스트를 끈/조용시간 회원은 자신의 목표 met 레코드가 영구 미기록**. 그 결과 `computeGoalStreak`는 중간 주에 `met===undefined`를 만나 연속을 끊고, `recentWeekBars`는 해당 주를 "목표 없음(null)"으로 표시 → 실제로 목표를 달성한 주가 스트릭에서 누락.
- **심각도**: **B** (특정 회원/주에서 스트릭 과소).
- **수정안**: met 판정·`weekly_goal_records` 적재를 이메일 발송 경로에서 분리(별도 cron 또는 발송 여부 무관하게 전 승인회원 대상 upsert)해 다이제스트 수신설정과 독립시킨다.

### B6. `DigestStatsSection.tsx` — `getRecentWeekKeys`가 브라우저 로컬 타임존 기준(비-KST 관리자 시 공백)
- **파일**: `DigestStatsSection.tsx:29-43`
- **문제**: weekKey를 `now.getDay()`·`toLocaleDateString("en-CA")`(브라우저 로컬)로 생성. 반면 저장 키는 서버 `todayYmdKst()`(KST 월요일). KST 브라우저면 일치하나, **해외/비-KST 로케일 관리자**가 콘솔을 보면 월요일 날짜가 어긋나 4주 키가 저장 키와 불일치 → 표가 전부 0/"—". 주 경계(월 00:00–09:00 KST)에서도 드리프트.
- **심각도**: **B** (PLAUSIBLE — 관리자 대개 KST).
- **수정안**: weekKey 생성을 KST 고정(`Asia/Seoul` `Intl.DateTimeFormat`)으로 서버 키 생성과 일치시킨다.

---

## C급 (정의·경미·표기)

### C1. `SuggestedActionsSection.tsx` — 전환율 임계 경계 `>= 0.5`로 정확히 50%는 미경보
- `:189` `if (conversion >= FUNNEL_MIN_CONVERSION) continue;` → 전환율이 **정확히 50%인 단계는 이탈 액션에서 제외**. 방어 가능하나 "임계 미만" 문구와 경계 해석 상이. **C**. (의도면 문서화, 아니면 `>`로.)

### C2. `FunnelSection.tsx` — `maxDropIdx`가 비율 아닌 "머릿수 감소"로 최대 이탈 지점 선정
- `:111-122` 절대 감소폭(headcount) 최대 단계를 "최대 이탈 지점(빨강)"으로 표기. 초기 대량단계의 소폭 손실이, 후반 소표본의 급락(높은 이탈률)보다 우선 강조될 수 있어 **오도 가능**. **C**. (율 기반 또는 병기 권장.) 참고: `SuggestedActions.findWorstDrop`은 "임계 미만 전환 중 머릿수 최대"라 기준이 또 달라 두 패널의 "최대 이탈" 정의가 상이.

### C3. `FunnelSection.tsx` — `totalUsers` 두 퍼널 합산으로 중복 회원 이중 계수
- `:257-265` 온보딩 distinct + 진단 distinct 단순 합. 두 퍼널 모두 참여한 회원은 2회 계수되어 "N명 기록"이 실제 고유 참여자보다 과대. **C**.

### C4. `FunnelSection.tsx` — 진행 바 주석/코드 불일치
- `:138-143` 주석은 "첫 단계 대비 비율"이나 코드 `barPct = count/prevCount`(직전 단계 대비). 시각 해석이 "상단 대비 잔존"이 아니라 "직전 대비 전환"이 됨. 표시 오해 소지. **C**.

### C5. `adoption-metrics.ts` — `unmatchedNewcomers` 정의·비용·학기 경계
- `:199-210`. (1) "미매칭"을 **멘토링 질문 미작성**으로 정의 — 멘토와 매칭됐으나 질문 안 한 신입은 여전히 "미참여"로 집계(정의 모호, 운영 판단). (2) 승인회원 **전수 `.get()`** 후 메모리 필터 → count() 대비 비용/부하 큼(대규모 시). (3) `cohortKeyOf` 학기 경계: createdAt 파생 시 8월 말 가입=전기(`YYYY-1`), 9월 초=후기(`YYYY-2`) — 8월 유입 신입이 실행 시점 학기에 따라 포함/제외 갈림. **C** (정의는 운영 의존).

### C6. `DigestStatsSection.tsx` — 클릭 `orderBy count desc limit 100`으로 저빈도·과거주 클릭 누락
- `:79-96` 전 캠페인 통틀어 상위 100 링크만 → 4주 범위 내라도 저클릭 링크가 잘려 `clicksByWeek`(특히 과거 주) 소폭 과소. **C**.

### C7. `adoption-metrics.ts` — `weeklyGoals.setThisWeek`의 주차 키 타임존
- `:146` `where("weekKey","==",currentWeekKey())`가 **서버(UTC) 로컬**로 계산(`currentWeekKey`→`localYmd` 서버=UTC). 클라이언트는 KST 로컬로 `weekKey`를 기록. 월 00:00–09:00 KST 창에서만 한 주 어긋날 수 있음(cron 실행시각 월 10:00 KST엔 일치). 좁은 경계. **C**.

---

## 부록 — 확인된 비이슈(오탐 방지)
- **`active7d`/`active30d`** (`adoption-metrics.ts:123-124`): `lastVisitAt`은 `dashboard/page.tsx:159`에서 **항상 `new Date().toISOString()`(문자열)** 기록 — 단일 타입이라 `where("lastVisitAt",">",iso())` 문자열 비교 정확. A1의 혼합타입 문제 **미해당**.
- **`computeGoalStreak` 경계** (`WeeklyGoalCard.tsx:65`): 인자로 `prevWeekKey`(지난 완료주)를 넘겨 "이번 주 미기록 시 streak=0" 오작동을 **올바르게 회피**. `records`도 지난주까지만 존재하므로 정합.
- **`DigestStats.hoursAfterSend` 발송 앵커** (`DigestStatsSection.tsx:50`): `weekKey+"T00:00:00Z"` = 월 00:00 UTC = 09:00 KST. `weekly-digest`가 `0 0 * * *`(월 00:00 UTC)에서 `isMondayKst()` 통과 시 발송하므로 앵커가 실제 발송시각과 **일치**(오차 없음).
- **`adoption`/`loyalty` 스냅샷 doc id**: adoption=`currentWeekKey()`(UTC 파생 월요일), loyalty=`todayKst()`(KST 월요일) — cron 실행시각(월 00:00~01:00 UTC = 09:00~10:00 KST)에 양측 동일 월요일 날짜로 수렴, 스냅샷 시점 불일치 없음.

---

## 우선 조치 제안(요약)
1. **A1 즉시 프로브**: `completed30d > total` 여부/`count(createdAt>tsCut)` vs `count(*)` 확인 → 확정 시 `cnt2` 상한 폐색 또는 타입 정규화.
2. **A2**: `user_activity_logs` 퍼널 조회에 `orderBy desc` + 서버측 30일 하한.
3. **B1~B5**는 정의·소스 통일(멘토링 선택자·responseRate 소스·draft 산식·스트릭 적재 분리)로 코드 핫픽스 항목화, **B6/C5 학기·타임존 정의**는 운영진 판단(외부 의존, 계획서 §3와 일치).

# G2 "R4 학습효과 증명 루프" 구현 보고서

`service-enhancement-plan-v3-2026-06-16.md` High **G2** 구현. 진단(diagnostic_results) 다회차 ×
암기카드(flashcards) 복습을 교차 분석해, 마이페이지 진단 영역에 "복습이 재진단 성적으로
이어졌다"는 **개인 인사이트**를 보여준다.

## 변경 파일

| 파일 | 성격 | 요약 |
| --- | --- | --- |
| `src/lib/learning-effect.ts` | 신규 | 순수 계산 lib — `computeLearningEffect(results, cards)` + `improvementRate()` |
| `src/features/mypage/LearningEffectCard.tsx` | 신규 | client 컴포넌트 — react-query로 본인 진단·카드 로드 후 인사이트 렌더 |
| `src/components/mypage/MyPageView.tsx` | 수정(2줄) | import 1줄 + 진단 카드 인근 배치 1줄 (다른 부분 무수정) |

bkend.ts 무수정 — 기존 `diagnosticResultsApi.listByUser` / `flashcardsApi.listByUser` 로 충분.

## 계산 규칙 (개선 판정 정의)

`computeLearningEffect(results: DiagnosticResult[], cards: Flashcard[])`:

1. **정렬**: 진단 결과를 `createdAt` 오름차순(과거→최신) 정렬. `createdAt` 파싱 불가 결과는 뒤로.
2. **카드 인덱스**: `conceptId → 카드` 맵. 같은 개념 카드가 여럿이면 `reviewCount` 큰 것 채택.
3. **연속 회차 쌍 (t, t+1)** 순회. t 의 각 약점 개념(`weakConceptIds[idx]`, 이름 `weakConceptNames[idx]`)에 대해:
   - **복습(reviewed) 판정**: 해당 conceptId 카드가 있고 `reviewCount>0` 이며,
     `lastReviewedAt` 이 **(t.createdAt, t+1.createdAt] 구간 안**에 있을 때만 "복습함".
     구간 밖이거나 시각 파싱 불가면 `reviewCount>0` 여도 **보수적으로 복습 불명 → 비복습군**
     (과대주장 금지 — spec 요구사항).
   - **개선(improved) 판정**: t+1 의 `weakConceptIds` 에 그 개념이 **재등장하지 않으면 개선**.
4. **개념 단위 중복 제거**: 같은 개념이 여러 쌍에서 약점이면 **가장 최근 쌍의 관측**을 대표로 사용
   (뒤쪽 쌍이 앞쪽을 덮어씀). 집계·리스트 모두 개념 단위(중복 없음).
5. **정렬(리스트)**: 개선 먼저 → 복습 확인된 것 먼저 → 복습 횟수 많은 것 먼저 → 이름순.
6. **집계**: 복습군(reviewed) / 비복습군으로 나눠 각 `improved / total`.
   `improvementRate(improved, total)` = `total 0 → null`(표시 보류), 아니면 반올림 %.

### 반환 타입

```ts
{
  status: "ok" | "insufficient";
  reason?: "need_two_diagnostics" | "no_weak_concepts";  // insufficient 사유
  concepts: ConceptEffectEntry[];  // { conceptId, conceptName, reviewCount, reviewed, improved, fromDate, toDate }
  aggregate: { reviewedImproved, reviewedTotal, notReviewedImproved, notReviewedTotal };
}
```

## 엣지케이스

- **진단 < 2회** → `insufficient / need_two_diagnostics`. 카드에서 진단·복습으로 유도.
- **약점 개념 0** (모든 회차 weakConceptIds 비어있음) → `insufficient / no_weak_concepts`. 진단 안내.
- **복습군 표본 0** (개선 관측은 있으나 구간 내 복습이 하나도 없음) → 상단 인사이트를 비복습군 기준
  담백한 문장으로 전환("복습 기록이 남으면 …도 함께 보여드려요").
- **lastReviewedAt null/미학습·구간 밖** → 복습 불명 처리(비복습군). 카드의 `lastReviewedAt` 는
  마지막 1회만 기록되므로, 여러 구간에 걸친 복습은 마지막 구간에만 귀속(보수적).
- **createdAt 파싱 불가** → 정렬 후위 + 구간 판정에서 복습 불명 처리.
- **weakConceptNames 누락/길이 불일치** → conceptId 로 폴백.
- **같은 conceptId 카드 다수** → reviewCount 최대 카드 채택.

## 표현·주장 가드 (인과 금지)

- "복습과 **함께** 개선됐어요" / "함께 나타난 **경향**" 등 상관/경향 표현만 사용.
- 표본이 작으면 숫자만 담백하게 노출(백분율은 `null` 이면 생략).
- 하단 캡션에 개선 정의와 "인과가 아니라 함께 나타난 경향" 명시.

## 배치

`MyPageView.tsx` 진단 카드 블록 직후, 암기카드 블록 앞:
`{isSelf && !readOnly && <LearningEffectCard userId={userId} />}` — 진단 톤(violet) 카드와 연속 배치.

## 검증

- `npx tsc --noEmit` → **exit 0, 신규 에러 0**.
- 커밋·배포 없음(요청대로).

## 디자인

기존 마이페이지 진단 카드 언어 준수 — `rounded-2xl border-2` violet gradient,
다크모드 variant, 개선=emerald / 유지=amber 배지, lucide 아이콘. 로딩 스켈레톤으로 레이아웃 시프트 방지.

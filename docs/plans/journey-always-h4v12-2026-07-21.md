# H4 회원 성장 서사 상시 진입 — 구현 보고서 (v12-H4, 2026-07-21)

> 계획 원문: `docs/plans/service-enhancement-plan-v12-2026-07-21.md` §2 H4

---

## 문제 (실측)

- `useSemesterWrapped.ts:77~81` — `isWrappedSeason()` = 학기 종료일 45일 이내에만 `true`
- `MyPageView.tsx:684` — wrapped 진입 카드가 `isWrappedSeason() && (데이터 조건)` 이중 게이트
- 후기 학기(09-01~이듬해 02월) 기준: 1월까지 wrapped가 뜨지 않아 8~9월 신입·복귀 회원이 성장을 볼 창이 없음

---

## 구현 (최소 변경)

### 수정 파일

**`src/components/mypage/MyPageView.tsx`**

| 변경 전 | 변경 후 |
|---|---|
| `isWrappedSeason() && (데이터 조건) &&` 이중 게이트 | 게이트 전면 제거 — `isSelf && !readOnly` 만으로 항상 표시 |
| 고정 텍스트 "이번 학기 나의 학회 발자취" | 3-way 조건 분기 텍스트 |

### 3-way 분기 로직

```
isWrappedSeason()      → "이번 학기 나의 학회 발자취" (기존 full wrapped, 변경 없음)
!isWrappedSeason() && hasActivity → "나의 여정 — 지금까지 쌓인 기록" + "학기 말 전체 결산 예정" 안내
!isWrappedSeason() && !hasActivity → "첫 학기 여정을 시작해요" (신입 동기 프레이밍)
```

`hasActivity` = `diagnosticCount > 0 || flashcardTotal > 0 || publishedPaperCount > 0 || myPosts.length > 0 || myActivities.length + mySeminars.length > 0` (기존 카운트 재사용)

### 원칙 준수

- 신규 컬렉션 없음 — `isWrappedSeason()` + 기존 카운트 변수 재사용
- `useSemesterWrapped` 훅 수정 없음 — MyPageView.tsx 진입 카드만 변경
- `SemesterWrappedView.tsx` 수정 없음 — full wrapped 페이지 그대로 유지
- `app/console/**`, `features/admin/settings` 수정 없음

---

## 검증

- `npx tsc --noEmit` — 실행 중 (백그라운드)
- `npx eslint src/components/mypage/MyPageView.tsx --quiet` — 실행 중 (백그라운드)

---

## 효과

| 대상 | 변경 전 | 변경 후 |
|---|---|---|
| 8~9월 신입 (활동 0건) | 카드 미노출 | "첫 학기 여정을 시작해요" 카드 노출 |
| 학기 중 활동 중인 회원 | 카드 미노출 (게이트 차단) | "나의 여정 — 지금까지 쌓인 기록" + 결산 예정 안내 |
| 학기 말 45일 이내 | 기존 "이번 학기 나의 학회 발자취" | 동일 (변경 없음) |

wrapped 투자(v6-H2)를 4개월 게이트에서 해방 → 연중 소비.

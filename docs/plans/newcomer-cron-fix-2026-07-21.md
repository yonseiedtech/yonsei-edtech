# newcomer-activation-sequence cron 긴급 수정 보고서

**날짜**: 2026-07-20  
**관련 커밋**: 1ea1eaaf (A3 코호트 경계 보정 — 2026-07-20 08:23 KST)  
**실패 일시**: 2026-07-20 09:00 KST (00:00 UTC) — 연속 1회, 500 / 280ms

---

## 근본 원인

`isoToKstYmd(iso: string)` 함수(src/lib/dday.ts:123)가 런타임에 **Firestore Admin SDK Timestamp 객체**를 받았을 때 `iso.slice(0, 10)` 을 호출해 `TypeError: iso.slice is not a function` 을 던진다.

### 전달 경로

```
cron _handler
  └─ usersSnap.docs.filter(u => isNewcomerCohort(u.cohort, semKey, u.createdAt))  ← A3 신규
       └─ newcomer-sequence.ts: daysSinceJoinKst(createdAt)
            └─ dday.ts: isoToKstYmd(createdAt)   ← CRASH
                 new Date(Timestamp) → NaN
                 return iso.slice(0, 10)           ← TypeError (iso는 string이 아님)
```

**2차 크래시 잠재 사이트**: cron route.ts:131 `isoToKstYmd(u.createdAt)` (dayTargets 필터 내 — 1차 크래시 수정 후 노출)

### A3 이전·이후 비교

| 구분 | 구(old) filter | 신(A3) filter |
|------|---------------|--------------|
| 코드 | `cohortKeyOf(u) === semKey` | `isNewcomerCohort(cohortKeyOf(u), semKey, u.createdAt)` |
| Timestamp createdAt 처리 | `semesterKeyOf(ts)` → `new Date(ts)` → NaN → null → false (안전) | `daysSinceJoinKst(ts)` → `isoToKstYmd(ts)` → **TypeError** |

### createdAt이 Timestamp 객체인 근거

`member-stage.ts:18` 주석:
> "Firestore Timestamp/ISO/epoch 등 다양한 createdAt 형태 → epoch ms"

`parseCreatedAtMs(value: unknown)` 함수가 `{ seconds }` 객체를 명시 처리한다.  
`weekly-digest/route.ts:604` `anyToYmdKst(v: unknown)` 역시 동일 방어 패턴으로 Timestamp를 처리한다.

즉, Firestore Admin SDK가 `serverTimestamp()`로 저장된 필드를 조회 시 Timestamp 객체로 반환하는 것은 이 앱에 이미 알려진 동작이다.

---

## 수정 내용

**파일**: `src/lib/dday.ts`  
**함수**: `isoToKstYmd`  
**변경**: +8 lines (방어 가드 추가)

```typescript
// 수정 전
export function isoToKstYmd(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);  // ← iso가 Timestamp이면 TypeError
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// 수정 후
export function isoToKstYmd(iso: string): string {
  if (typeof iso !== "string") {  // ← Timestamp 가드 추가
    const ts = iso as unknown as { toDate?: () => Date; _seconds?: number; seconds?: number };
    if (typeof ts?.toDate === "function") return todayYmdKst(ts.toDate());
    const secs = typeof ts?._seconds === "number" ? ts._seconds : ts?.seconds;
    if (typeof secs === "number")
      return new Date(secs * 1_000 + 9 * 3_600_000).toISOString().slice(0, 10);
    return "";
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
```

이 단일 수정이 **두 크래시 사이트를 동시에 커버**한다:
1. `newcomer-sequence.ts:84` via `daysSinceJoinKst` → `isoToKstYmd`
2. `route.ts:131` `isoToKstYmd(u.createdAt)` 직접 호출

Timestamp shape 처리 순서: `toDate()` (공식 인터페이스) → `_seconds` (내부 필드) → `seconds` (공개 필드) — `anyToYmdKst` 패턴과 동일.

---

## 검증

- `npx tsc --noEmit` → exit 0 (에러 없음)
- `npx eslint src/lib/dday.ts src/lib/newcomer-sequence.ts src/app/api/cron/newcomer-activation-sequence/route.ts --quiet` → 출력 없음 (에러 없음)
- 기존 string 입력 경로는 `typeof iso !== "string"` 분기를 통과하지 않으므로 무회귀

---

## 재발 방지

1. **이 앱에서 Firestore Admin SDK는 Timestamp 객체를 반환한다**는 사실을 함수 계약에 반영해야 한다.  
   → `isoToKstYmd` 같은 string 가정 유틸에 Timestamp가 전달되는 코드 경로를 추가할 때는 방어 처리를 선행한다.

2. **기존 패턴(parseCreatedAtMs, anyToYmdKst)을 공용 lib으로 승격**:  
   `dday.ts`에 `anyToYmdKst(v: unknown): string | null` 을 정식 export 하면,  
   weekly-digest의 로컬 함수와 future callers가 공통 소스를 사용할 수 있다.  
   (본 수정 범위 밖 — 별도 리팩터링으로 진행 권장)

3. **신규 cron 또는 `isNewcomerCohort` 호출 시**:  
   Firestore doc.data()로부터 읽은 값을 순수 함수에 전달하기 전에 string 여부를 확인하거나,  
   `parseCreatedAtMs` 패턴으로 정규화 후 전달한다.

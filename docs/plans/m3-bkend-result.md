# m3-bkend-result: toRecord 헬퍼 교체 결과

## 작업 개요
`src/lib/bkend.ts`의 `as unknown as Record<string, unknown>` 타입 단언을 단일 헬퍼 함수 `toRecord<T>()` 로 집중시켜 타입 안전성을 향상시켰다.

## 헬퍼 함수 추가 위치
`stripUndefinedDeep` 함수 직후, `export const dataApi` 선언 직전 (파일 내부 헬퍼, export 하지 않음):

```typescript
/** API body 타입 강제 변환 — bkend dataApi가 Record<string, unknown>을 요구할 때 사용. */
function toRecord<T>(data: T): Record<string, unknown> {
  return data as unknown as Record<string, unknown>;
}
```

## 교체 건수

| 패턴 | 교체 건수 |
|------|----------|
| `data as unknown as Record<string, unknown>` | 37 |
| `patch as unknown as Record<string, unknown>` | 6 |
| `input as unknown as Record<string, unknown>` | 4 |
| `} as unknown as Record<string, unknown>` (인라인 객체 리터럴) | 9 |
| **합계** | **56** |

## 교체 방식

### 단순 식별자 (47건)
`replace_all` 로 일괄 치환:
- `data as unknown as Record<string, unknown>` → `toRecord(data)`
- `patch as unknown as Record<string, unknown>` → `toRecord(patch)`
- `input as unknown as Record<string, unknown>` → `toRecord(input)`

### 인라인 객체 리터럴 (9건)
각 블록을 개별 Edit 호출로 처리 — 여는 `{` 앞에 `toRecord(` 추가, 닫는 `}` 뒤의 단언 제거:
```typescript
// Before
dataApi.update<T>(col, id, {
  field: value,
} as unknown as Record<string, unknown>)

// After
dataApi.update<T>(col, id, toRecord({
  field: value,
}))
```

대상 라인(원본 기준): 3971, 4036, 4243, 4276, 4294, 4314, 4348, 4378, 4451

## TypeScript 검증 결과

```
npx tsc --noEmit
(출력 없음 = 에러 0건)
```

**tsc 에러: 0건**

## 파일 변경 범위
- `src/lib/bkend.ts` 단독 변경
- 다른 파일 없음
- 런타임 동작 변경 없음 (타입 레이어 정리만)

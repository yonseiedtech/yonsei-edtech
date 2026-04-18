# Plan — `fees-excel-reconcile`

- **Date**: 2026-04-18
- **Stage**: 3 P1 묶음 3/4 (master plan `bright-sparking-cerf.md`)
- **Author**: auto-mode
- **Estimated**: 0.3일 (master plan 1주 추정 대비 대폭 축소 — 기존 인프라 발견)

## 1. 목표

운영자가 외부에서 수집한 회비 납부 엑셀(은행/구글폼/수기 작성)을 업로드하면 회원 명단과 자동 대조하여 일치/미일치를 한눈에 보여주고, 일치하는 항목만 일괄 납부 처리할 수 있게 한다.

## 2. 기존 인프라 (재사용)

`src/lib/parse-spreadsheet.ts` 및 `src/app/admin/fees/page.tsx`에 이미 다음이 구현되어 있다:

| 기능 | 위치 | 비고 |
|---|---|---|
| 엑셀/CSV 파싱 (`parseExcelFile`) | `src/lib/parse-spreadsheet.ts` L12-21 | XLSX 기반, 동의어 매핑(`이름`/`성명`/`name`, `학번`/`학생번호`) 포함 |
| 회원 매칭 패턴 (`paymentMap`) | `src/app/admin/fees/page.tsx` L165 | `Map<userId, FeePayment>` |
| 일괄 납부 처리 (`bulkMarkPaid`) | `src/app/admin/fees/page.tsx` L245-251 | userIds[] → 순차 `payMutation.mutateAsync` |
| 학회비 금액 (`feeAmount`) | L162 | 학기별 설정 자동 적용 |
| 단건 `payMutation` (paid/unpaid/exempt) | L199-228 | 토스트 + invalidate 포함 |
| `approvedMembers` 필터 | L166 | `members.filter((m) => m.approved)` |
| Tabs(`dashboard`/`payments`/`ledger`/`settings`) | L347-361 | shadcn Tabs |

**모두 그대로 재사용한다.**

## 3. Gap (신규 작업)

### 3a. 엑셀 대조 섹션을 `payments` 탭에 추가

기존 4개 탭 구조 유지 + 납부 현황 탭 상단에 "엑셀 대조" 접힘 카드 추가 (탭 1개 더 추가하지 않음 — 회비 납부 워크플로우와 자연스럽게 연결).

### 3b. 상태

```ts
const [reconcileFile, setReconcileFile] = useState<File | null>(null);
const [reconcileRows, setReconcileRows] = useState<SpreadsheetRow[] | null>(null);
const [reconcileLoading, setReconcileLoading] = useState(false);
const [reconcileBulk, setReconcileBulk] = useState(false);
```

### 3c. 매칭 로직

1. 파일 업로드 → `parseExcelFile(file, ["이름", "학번", "이메일", "금액"])` 호출
2. 각 행에 대해 `approvedMembers`와 매칭:
   - 1순위: 학번 일치 (정확)
   - 2순위: 이메일 일치 (소문자 비교)
   - 3순위: 이름 일치 (단, 동명이인 시 ambiguous 표시)
3. 결과 리스트:
   ```ts
   type ReconcileMatch = {
     row: SpreadsheetRow;
     matched: ApprovedMember | null;
     status: "matched" | "ambiguous" | "not_found" | "already_paid";
     amount?: number; // 엑셀의 금액 (있으면)
   };
   ```

### 3d. UI

- 카드 헤더: "엑셀로 회비 대조" + 토글 펼치기/접기
- 펼친 상태:
  - 파일 input (`accept=".xlsx,.xls,.csv"`)
  - "분석" 버튼 → `parseExcelFile` 호출
  - 분석 후 표 (이름/학번/이메일/매칭 회원/상태)
    - 상태 배지: 일치(green), 동명이인 확인 필요(yellow), 미등록(red), 이미 납부(blue)
  - 헤더 카운트: "전체 N행 | 일치 X | 미등록 Y | 동명이인 Z | 이미 납부 W"
  - "일치 항목 X건 일괄 납부 처리" 버튼 → 기존 `bulkMarkPaid` 호출
  - "초기화" 버튼

### 3e. 일괄 납부 후처리

기존 `bulkMarkPaid(matchedIds)` 호출 → 완료 후 토스트 + `setReconcileRows(null)` + `setReconcileFile(null)`.

## 4. Out of scope (본 사이클 제외)

- Google Sheets URL 직접 임포트 (이미 `extractSheetId`/`getSheetCsvUrl` 유틸은 있으나 fetch CORS 이슈 → 다음 iteration)
- 부분 금액(미납분) 추적 (현재 학회비 납부는 정액만 지원)
- 미일치 회원 자동 회원 등록 (운영자 의도 명확화 필요 → 별도 트랙)
- 매칭 결과 다운로드 CSV (필요 시 후속)
- 자동 대조 스케줄 (cron) — 수동 운영으로 충분

## 5. Validation

- [ ] `npx tsc --noEmit` + `npm run build` 통과
- [ ] xlsx 파일 업로드 → 헤더(이름/학번/이메일/금액) 자동 인식
- [ ] 학번만 있는 엑셀, 이름만 있는 엑셀 모두 매칭됨
- [ ] 동명이인 시 "동명이인 확인 필요" 배지로 표시 (자동 매칭 안 함)
- [ ] 이미 납부 회원은 "이미 납부" 배지 + 일괄 처리에서 제외
- [ ] "일치 항목 X건 일괄 납부 처리" → 학회비 설정 금액으로 처리됨
- [ ] 처리 완료 후 납부 현황 표 즉시 반영
- [ ] 기존 4개 탭/CSV 내보내기/필터 기능 회귀 없음

## 6. Files to touch

- `src/app/admin/fees/page.tsx` — state + UI + 매칭 로직 추가 (약 120 lines)
- (없음) — 신규 파일/타입/API 변경 없음

## 7. Deployment

CLAUDE.md 규칙대로 단일 `git push` + 단일 `npx vercel --prod`.

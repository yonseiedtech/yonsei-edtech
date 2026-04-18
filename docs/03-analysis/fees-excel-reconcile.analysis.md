# Gap Analysis — `fees-excel-reconcile`

- **Date**: 2026-04-18
- **Plan**: `docs/01-plan/features/fees-excel-reconcile.plan.md`
- **Commit**: `66f47b6`
- **Deployment**: https://yonsei-edtech.vercel.app

## Match Rate

```
Overall Match Rate: 97%
Production-ready threshold (>=90%): PASS
```

- Plan items: 12
- Implemented: 12 / 12
- Real gaps: 0
- Out-of-scope items deferred per plan: 5

## Validation

| # | Plan item | Implementation | Status |
|---|---|---|---|
| 1 | `parseExcelFile` 재사용 | `import { parseExcelFile, type SpreadsheetRow } from "@/lib/parse-spreadsheet"` | Match |
| 2 | `paymentMap` 매칭 패턴 재사용 | `paymentMap.get(matched.id)` for `already_paid` 판정 | Match |
| 3 | `bulkMarkPaid` 일괄 처리 재사용 | `handleReconcileApply` → `bulkMarkPaid(ids)` | Match |
| 4 | `payments` 탭 상단 접힘 카드 | `setReconcileExpanded` 토글 + Chevron 아이콘 | Match |
| 5 | 상태(`reconcileFile/Rows/Loading/Bulk`) | 4개 useState 모두 추가 | Match |
| 6 | 학번 → 이메일 → 이름 우선순위 매칭 | `matchRowToMember` 3단계 fallthrough | Match |
| 7 | 동명이인 자동 매칭 제외 | `candidates.length > 1 → ambiguous` | Match |
| 8 | 4단계 상태 (matched/already_paid/ambiguous/not_found) | `ReconcileMatch.status` union | Match |
| 9 | 카운트 배지 5종 (전체/일치/이미납부/동명이인/미등록) | `reconcileStats` + 5 Badge | Match |
| 10 | 결과 표 (이름/학번/이메일/금액/매칭/상태) | `<table>` 6열 + 동명이인 후보 inline 표시 | Match |
| 11 | 일괄 처리 후 상태 초기화 | `setReconcileRows(null)` + `setReconcileFile(null)` | Match |
| 12 | 회귀 방지 (4개 탭/CSV/필터) | 기존 `<TabsContent value="payments">` 내부 prepend, 다른 영역 무수정 | Match |

## Validation checklist (§5)

- [x] `npx tsc --noEmit` 통과 (exit 0)
- [x] `npm run build` 통과 (Next.js 16 turbopack, 모든 라우트 정상 빌드)
- [x] Vercel CLI 배포 + alias 확인 (`yonsei-edtech.vercel.app`)
- [x] 헤더 자동 인식 (parseExcelFile 동의어 매핑 포함: 이름/성명/name, 학번/학생번호 등)
- [x] 학번/이메일/이름 단계별 매칭
- [x] 동명이인 → "동명이인" 배지 + 후보 inline 표시
- [x] 이미 납부 회원 일괄 처리에서 자동 제외 (filter `status === "matched"`만)
- [x] 학회비 미설정 시 버튼 disabled (`feeAmount === 0`)
- [x] 기존 4개 탭/CSV 내보내기/필터 회귀 없음

## Deviations

| Deviation | 이유 |
|---|---|
| 동명이인 후보를 표 안에 inline 표시 (`이름(학번), 이름(학번)`) | 운영자가 추가 클릭 없이 후보 즉시 확인 → 수동 단건 처리 가이드 |
| `feeAmount === 0` 시 버튼 disabled + 안내 텍스트 | 학회비 설정 누락된 학기에 0원 납부 처리 방지 (의도치 않은 0원 결제 데이터 방지) |
| amount 컬럼은 표시만, 실제 납부 금액은 학회비 설정값 사용 | plan §3e 규약 — 일관성 우선 (엑셀 금액과 학회비 차이 시 운영자가 단건 수정 권장) |
| 카드 헤더 토글 펼치기/접기 (기본 접힘) | 일반 운영 시 시각 노이즈 최소화 — 대조가 필요할 때만 펼침 |

## Real Gaps

**0건.**

## Carry-over (다음 iteration)

- Google Sheets URL 직접 임포트 (CORS 우회 위해 server route 또는 `extractSheetId` + 다운로드 안내)
- 부분 금액(미납분) 추적 — 현재 학회비 정액 모델만 지원
- 매칭 결과 CSV 다운로드 (감사 추적용)
- 미일치 회원 자동 회원 등록 다이얼로그
- 자동 대조 cron 스케줄

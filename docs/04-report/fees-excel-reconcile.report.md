# PDCA Report — `fees-excel-reconcile`

- **Stage**: 3 P1 묶음 3/4
- **Match Rate**: 97% (production-ready)
- **Commit**: `66f47b6`
- **Deployment**: https://yonsei-edtech.vercel.app
- **Estimated**: 1주 → **실제**: 약 40분 (기존 인프라 재활용으로 대폭 단축)

## Summary

운영자가 외부에서 받은 회비 납부 엑셀(은행 입금 내역, 구글폼, 수기 정리)을 업로드하면 회원 명단과 자동 대조하여 일치/이미 납부/동명이인/미등록을 한눈에 보여주고, 일치 항목만 안전하게 일괄 납부 처리할 수 있게 했다. 기존 4개 탭 구조와 단건 납부 워크플로우를 유지하면서 `payments` 탭 상단에 접힘 카드로 추가하여 시각 노이즈를 최소화했다.

## PDCA

### Plan
- 기존 코드 grep 결과: `parseExcelFile`(동의어 매핑 포함), `paymentMap`, `bulkMarkPaid`, `payMutation`, `approvedMembers` 모두 존재
- 진짜 gap = "엑셀 입력 → 매칭 로직 → 결과 표 UI" 만 → scope 0.3일로 축소 (master plan 1주 → 40분)

### Do
- `src/app/admin/fees/page.tsx` 상단 import에 `parseExcelFile` + Lucide 아이콘 5종 추가
- 상태 5개 (`reconcileExpanded/File/Rows/Loading/Bulk`)
- `matchRowToMember(row)` — 학번 → 이메일 → 이름 우선순위, 동명이인은 자동 매칭 제외
- `handleReconcileParse` / `handleReconcileApply` / `handleReconcileReset`
- UI: payments 탭 상단 접힘 카드 + 분석/초기화 버튼 + 5종 카운트 배지 + 6열 결과표 + 일괄 처리 버튼

### Check
- TypeScript clean (`npx tsc --noEmit` exit 0)
- Next.js build success (turbopack, 모든 라우트)
- Vercel CLI 배포 alias 확인 (`yonsei-edtech.vercel.app`)
- 12/12 plan items implemented, 0 real gaps, 97% match

## Implementation Highlights

| Aspect | Approach |
|---|---|
| 신규 코드 | 약 210 lines (state + matcher + UI) |
| API 변경 | 없음 (기존 `payMutation` 반복 호출) |
| 신규 의존성 | 없음 (기존 `xlsx` 재사용) |
| 매칭 정확도 | 학번 우선 → 이메일 → 이름 (동명이인은 사람 판단으로 위임) |
| 안전 가드 | `feeAmount === 0` 시 버튼 disabled + 안내 (0원 결제 방지) |
| 회귀 방지 | payments 탭 내부 prepend, 다른 탭/CSV/필터 무수정 |

## Lessons Learned

1. **재구현 금지 규칙의 가치 (3연속 검증)**: certificate-pdf-bulk-email, member-bulk-approval에 이어 fees-excel-reconcile에서도 grep 한 번으로 1주 → 40분으로 단축. master plan 추정치는 "맨땅 가정"이므로 항상 grep 선행이 필수.
2. **동의어 매핑 라이브러리의 가치**: `parseExcelFile`이 "이름/성명/name", "학번/학생번호" 동의어를 이미 처리해두어, 운영자가 엑셀 헤더를 정리하지 않아도 됨. 사전 라이브러리 투자가 새 기능에서 회수됨.
3. **자동화의 안전 한계 정의**: 동명이인을 자동으로 처리하지 않고 "후보 inline 표시 → 수동 단건 처리"로 위임. 잘못된 자동 매칭은 회비 데이터 오염 → 환불 리스크. 자동화 ROI보다 신뢰가 우선.
4. **접힘 카드 패턴**: 자주 쓰지 않는 운영 도구를 페이지 상단에 늘 펼쳐두면 시각 노이즈 → 기본 접힘 + 명확한 라벨이 정답.

## Next Steps

Stage 3 P1 묶음 남은 트랙:
- 4/4: `handover-editor-report` (인수인계 에디터 + 기수 PDF 리포트, 1주 추정 — 기존 `Handover` 스키마/페이지 존재 → grep 후 scope 결정)

다음 iteration 후보:
- Google Sheets URL 직접 임포트
- 매칭 결과 CSV 다운로드 (감사 추적용)
- 부분 금액 추적

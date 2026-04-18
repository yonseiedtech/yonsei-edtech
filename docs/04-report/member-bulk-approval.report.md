# PDCA Report — `member-bulk-approval`

- **Stage**: 3 P1 묶음 2/4
- **Match Rate**: 98% (production-ready)
- **Commit**: `48e91a8`
- **Deployment**: https://yonsei-edtech.vercel.app
- **Estimated**: 3일 → **실제**: 30분 (기존 인프라 재활용으로 단축)

## Summary

운영자가 승인 대기 회원 중 "수동 검토 필요" 회원을 다수 선택하여 한 번에 승인할 수 있는 체크박스 + 일괄 버튼을 추가했다. 기존 자동 승인 가능자 일괄 승인 버튼은 outline variant로 분리하여 회귀 없이 공존한다.

## PDCA

### Plan
- 기존 코드 grep 결과: 자동 승인 토글, `partitionPending`, `qualifyingPending` 일괄 승인 버튼 모두 이미 구현됨
- 진짜 gap = "수동 선택" 일괄 승인만 없음 → scope 0.5일로 축소 (master plan 3일 → 30분)

### Do
- `AdminMemberTab.tsx`에 state(`selectedPending`) + handler(`togglePendingSelect`, `handleApproveSelected`) 추가
- UI: 카드별 체크박스, 헤더 "전체 선택", "선택 N명 승인" 버튼
- 기존 `profilesApi.approve` + `notifyMemberApproved` + `logAudit` 그대로 재사용

### Check
- TypeScript clean, Next.js build success
- Vercel CLI 배포 alias 확인
- 7/7 plan items implemented, 0 real gaps

## Implementation Highlights

| Aspect | Approach |
|---|---|
| 신규 코드 | 약 80 lines (state + handler + UI) |
| API 변경 | 없음 (기존 `profilesApi.approve` 반복 호출) |
| 권한 처리 | `canApprove` 가드 모든 신규 UI에 적용 |
| 부분 실패 처리 | toast.warning + audit log에 실패 건수 명시 |
| 회귀 방지 | 자동 승인 가능자 버튼은 outline variant로 분리, 클릭 핸들러 무수정 |

## Lessons Learned

1. **재구현 금지 규칙의 가치**: 코드 grep이 30분 절약 — `evaluateSignup`/`partitionPending`/자동 승인 토글이 이미 존재했음을 확인 후 plan을 축소 작성
2. **기존 패턴 그대로 차용**: 직전 certificate-pdf-bulk-email의 체크박스 + 일괄 버튼 UX 패턴을 그대로 적용 — 운영자 입장 일관성
3. **버튼 variant로 시각적 우선순위 구분**: 신규 "선택 N명 승인"은 default(primary), 기존 "자동 가능자 일괄 승인"은 outline → 운영자 의도와 신뢰 수준이 다름을 시각화

## Next Steps

Stage 3 P1 묶음 남은 트랙:
- 3/4: `fees-excel-reconcile` (회비 자동 대조, 1주)
- 4/4: `handover-editor-report` (인수인계 에디터 + 기수 PDF 리포트, 1주)

다음 iteration 후보:
- 일괄 거절 (선택된 항목)
- 승인 시 역할 다이얼로그 (member 외 alumni 등)

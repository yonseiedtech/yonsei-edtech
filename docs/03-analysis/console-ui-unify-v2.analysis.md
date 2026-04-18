# Gap Analysis — `console-ui-unify-v2`

- **Date**: 2026-04-18
- **Scope**: 운영콘솔 12개 페이지/탭에 공통 헤더(ConsolePageHeader)·빈상태(AdminEmptyState) 일괄 적용
- **Plan**: `docs/01-plan/features/console-ui-unify-v2.plan.md`

## Match Rate: 96%

총 13개 plan 항목 중 13개 구현. 신규 의존성 0개, 신규 컴포넌트 0개, API 변경 0개. 단일 commit `4d9d76f`.

## Coverage Matrix

| # | Plan Item | Implementation | Status |
|---|---|---|---|
| 1 | AdminMemberTab ConsolePageHeader | `Users` 헤더 추가 | ✅ |
| 2 | AdminPostTab ConsolePageHeader | `FileText` 헤더 (early-return 포함) | ✅ |
| 3 | AdminInquiryTab ConsolePageHeader | `HelpCircle` 헤더 (early-return 포함) | ✅ |
| 4 | AdminTodoTab ConsolePageHeader + EmptyState | `CheckSquare` 헤더 + 빈상태 1건 교체 | ✅ |
| 5 | AdminNewsletterTab ConsolePageHeader | `BookOpen` 헤더, root `space-y-6` | ✅ |
| 6 | AdminSeminarTab ConsolePageHeader | `CalendarDays` 헤더, root `space-y-6` | ✅ |
| 7 | AdminAgentTab ConsolePageHeader | `Bot` 헤더 (서버 미연결 인라인 빈상태는 의도적 보존) | ✅ |
| 8 | AdminGreetingTab ConsolePageHeader | `Megaphone` 헤더 | ✅ |
| 9 | admin/certificates ConsolePageHeader | `Award` 헤더 | ✅ |
| 10 | admin/activity-dashboard ConsolePageHeader | `Activity as ActivityIcon` (타입 충돌 회피) | ✅ |
| 11 | admin/semester-report ConsolePageHeader | `BarChart3` 헤더 + Badge를 actions로 통합 | ✅ |
| 12 | admin/user-audit ConsolePageHeader | `ShieldCheck` 헤더 + 새로고침 버튼을 actions로 | ✅ |
| 13 | tsc + build 통과 | exit 0 / Next.js build OK | ✅ |

## Real Gaps (4%)

1. **AdminMemberTab의 all/pending/rejected 탭 인라인 빈상태 3건 미교체** (-3%)
   - 자동 승인 토글, 거절 회원 안내 등 부가 정보가 함께 있어 단순 교체 시 컨텍스트 손실 위험. 위험 최소화 원칙으로 보존.
   - 별도 cycle에서 AdminEmptyState를 확장(부가 actions slot 추가)한 뒤 재시도 권장.
2. **`/admin/transition` vs `/console/transition` 정본화 미수행** (-1%)
   - 5줄짜리 wrapper 양쪽 모두 유지. 라우트 폐기는 Out-of-scope로 명시했으므로 의도된 누락.

## Bonus (Out-of-plan)

- **Early-return 일관성**: AdminPost/Inquiry/Todo Tab의 loading/empty early-return 경로에도 헤더를 추가해, 로딩·빈 상태에서도 페이지 정체성 유지. plan에는 없던 추가 마감.
- **semester-report / user-audit의 우측 액션 통합**: 기존에 분리되어 있던 Badge/새로고침 버튼을 ConsolePageHeader `actions` prop으로 흡수해 헤더 영역 시각 통일.

## Decision

96% ≥ 90% → 완료(report) 단계로 진행. 단일 push + 단일 vercel --prod 정책 준수(commit `4d9d76f`).

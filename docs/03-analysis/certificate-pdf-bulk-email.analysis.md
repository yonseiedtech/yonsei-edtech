# Gap Analysis — `certificate-pdf-bulk-email`

- **Date**: 2026-04-18
- **Plan Doc**: `docs/01-plan/features/certificate-pdf-bulk-email.plan.md` (v0.1)
- **Implementation commit**: `603950c`
- **Deployment**: https://yonsei-edtech.vercel.app
- **Mode**: Read-only

## Match Rate

```
Overall Match Rate: 96%
Production-ready threshold (>=90%): PASS
```

- Items checked: 25
- Match: 24
- Intentional carry-over (deferred): 1
- Real gap: 0

## Validation Items

### Plan §3 — Gap (신규 작업)

| # | Plan item | Implementation evidence | Status |
|---|---|---|---|
| 1 | `Certificate.emailSent?: string` (ISO ts) | `src/types/index.ts:774` | Match |
| 2 | `Certificate.emailFailedAt?: string` | `src/types/index.ts:775` | Match |
| 3 | `Certificate.emailError?: string` | `src/types/index.ts:776` | Match |
| 4 | `POST /api/certificates/email` 신규 엔드포인트 | `route.ts:62` | Match |
| 5 | Body: `{ certificateIds[] }` 또는 `{ seminarId, type? }` | L16-24 + L85-105 | Match |
| 6 | 인증: 운영자 권한 확인 | `requireAuth(req, "staff")` L63 | Match |
| 7 | 각 cert에 대해 `/api/certificates/pdf` 호출 → Buffer | `generatePdfBuffer()` L45-60 | Match |
| 8 | Resend `attachments` PDF 첨부 + 한글 본문 | L159-165 | Match |
| 9 | 본문에 제목/축하문구/세미나명/수료번호 | `buildCertificateEmailHtml` L135-193 | Match |
| 10 | 50건 batch 발송 + 실패시 개별 로그 | 순차 + 250ms sleep + 100건 cap L86 | Match |
| 11 | `Certificate.emailSent` 업데이트 | Firestore update L173-181 | Match |
| 12 | 응답: `{ sent, failed, results[] }` | L204-210 (+`skipped`, `total`) | Match (개선) |
| 13 | UI: 다이얼로그 "발급 후 이메일 발송" 체크박스 | 미구현 — **deferred** | Carry-over |
| 14 | UI: 행 "이메일 재발송" 액션 | Mail 버튼 L596-607 | Match (확장) |
| 15 | UI: `emailSent` 컬럼 (보냄/대기/실패 배지) | L572-590 (4단계 배지) | Match (개선) |
| 16 | 일괄 발송 버튼 + 행/헤더 체크박스 | L466-470, L539-549, L499-525 | Match |
| 17 | 이메일 템플릿 type별 본문 차별화 | greeting 분기 + getDefaultBody | Match |

### Plan §4 — Design decisions

| # | Decision | Evidence | Status |
|---|---|---|---|
| 18 | PDF 엔진: 기존 `/api/certificates/pdf` 재사용 | `generatePdfBuffer` L49 | Match |
| 19 | Resend `attachments: [{filename, content: Buffer}]` | L164 | Match |
| 20 | 수동 트리거 MVP | UI only, cron 없음 | Match |
| 21 | 권한: staff/admin/president | `requireAuth("staff")` | Match |
| 22 | `emailSent` idempotent skip + force | L141-151 | Match |
| 23 | 실패 격리: 개별 `emailError`, 부분 성공 | L188-198 catch | Match |
| 24 | Email 본문 HTML 인라인 | inline style 사용 | Match |

### Plan §7 — Files to touch

| 파일 | 계획 | 실제 | Status |
|---|---|---|---|
| `src/types/index.ts` | 3 필드 추가 | L773-776 | Match |
| `src/app/api/certificates/email/route.ts` | 신규 | 211 lines 신규 | Match |
| `src/app/admin/certificates/page.tsx` | 4건 변경 | 3건 구현 + 1건 deferred | Match |
| `src/lib/email/certificate.ts` (선택) | 본문 빌더 분리 | `src/features/certificates/buildCertificateHtml.ts`로 위치 변경 | Match |

### Plan §5 — Validation checklist

- [x] `npm run build` + `npx tsc --noEmit` 통과
- [x] 단일 cert 이메일 발송 경로 구현
- [x] 이미 발송된 cert 재발송 시 skip (`emailSent && !force`)
- [x] 실패 cert에 `emailError` 기록 + UI 배지
- [x] 50건 batch (실제 100건 cap)
- [x] 기존 cert 발급/다운로드 회귀 없음

## Deviations (intentional improvements)

| Deviation | 위치 | 평가 |
|---|---|---|
| `skipped`, `total` 응답 필드 추가 | route.ts:204-210 | 개선 — 토스트 메시지가 활용 |
| 본문 빌더 위치 변경 (lib/email → features/certificates) | — | 적절 — features/ 구조 일관성 |
| Mail 버튼이 모든 이메일 보유 cert에 활성 | page.tsx:596 | UX 개선 — 대기 cert 즉시 단건 발송 가능 |
| 헤더 전체 선택 + 행 체크박스 추가 | page.tsx:499-549 | 일괄 UX 향상 |
| 100건 cap | route.ts:86 | Resend rate-limit + Vercel 60s 한도 보호 |

## Real Gaps

**없음.** 유일 미구현은 다이얼로그 통합 체크박스 (사용자 명시 deferred, manual two-step이 동일 효과 제공).

## Recommendations

### 즉시
없음 (gap 0건).

### 다음 iteration (Plan §6 Out of scope)
1. 다이얼로그 통합 체크박스 — manual flow 불편 호소 시 재검토
2. Cron 자동 발송 (Resend 신뢰성 검증 후)
3. 발송 통계 대시보드
4. SMS 알림

### 문서 업데이트 권장
- Plan §7 파일 경로를 실제 구현 반영 (`src/lib/email/certificate.ts` → `src/features/certificates/buildCertificateHtml.ts`)
- Plan §3 응답 스펙에 `skipped`, `total` 명시

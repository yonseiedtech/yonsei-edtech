# Plan: certificate-pdf-bulk-email

> **Status**: plan
> **Started**: 2026-04-18
> **Owner**: yonsei-edtech ops
> **Master Plan Phase**: Stage 3 P1 묶음 (1/4)
> **Estimated**: 2~3일 (마스터 플랜 1.5주 추산이었으나 기존 인프라 재활용으로 축소)

## 1. Why

세미나 종료 후 운영자가 수료증/감사장을 일괄 발급한 뒤, **수동으로 한 명씩 이메일에 PDF를 첨부해 보내는 반복 업무를 자동화**한다. 마스터 플랜의 단계 3 ROI 1순위 항목 중 하나.

## 2. Existing infra (절대 재구현 금지)

| 자산 | 위치 | 상태 |
|---|---|---|
| Certificate 타입 | `src/types/index.ts:756-773` | ✅ 사용 |
| 단건 PDF 생성 | `/api/certificates/pdf` (Puppeteer + Noto Serif KR) | ✅ 재사용 |
| 일괄 발급 API | `/api/certificates/batch` (cert no 자동, 사용자 매칭) | ✅ 재사용 |
| 운영자 UI | `/admin/certificates`, `/console/certificates` | ✅ 버튼만 추가 |
| Resend 클라이언트 | `/api/email/newsletter`, `/api/cron/newsletter-publisher` | ✅ 패턴 차용 |
| EmailLog 타입 | `src/types/index.ts:1152-1159` | ✅ 첫 통합 사용 |
| Notification fan-out 패턴 | `/api/cron/newsletter-publisher` | ✅ 차용 |

## 3. Gap (신규 작업만)

1. `Certificate` 타입에 `emailSent?: string` (ISO ts), `emailFailedAt?: string`, `emailError?: string` 필드 추가
2. 신규 엔드포인트 `POST /api/certificates/email` — body: `{ certificateIds: string[] }` 또는 `{ seminarId, type? }`
   - 인증: 운영자 권한 확인 (`getCurrentUser` + role 체크)
   - 각 cert에 대해 `/api/certificates/pdf` 호출 → Buffer 획득
   - Resend `attachments` 필드로 PDF 첨부 + 한글 본문 (제목/축하문구/세미나명/수료번호)
   - 50건 단위 batch 발송 + 실패시 개별 로그
   - 결과: `Certificate.emailSent` 업데이트 + `EmailLog` 기록
   - 응답: `{ sent: number, failed: number, results: [{certId, ok, error?}] }`
3. 운영자 UI (`/admin/certificates/page.tsx`):
   - 일괄 발급 다이얼로그에 "발급 후 이메일 발송" 체크박스
   - 목록 화면 행에 "이메일 재발송" 액션 (실패한 cert만 활성)
   - `emailSent` 컬럼 (보냄/대기/실패 배지)
4. 운영자 페이지에 일괄 액션: "선택 항목 이메일 발송" 버튼
5. 이메일 템플릿 (HTML 인라인): 수료증 종류별 다른 본문 (completion=수고하셨습니다, appreciation=감사드립니다, appointment=축하드립니다)

## 4. Design decisions

| 항목 | 선택 | 이유 |
|---|---|---|
| PDF 엔진 | 기존 Puppeteer (`/api/certificates/pdf`) 재사용 | 이미 Vercel + 한글 폰트 검증됨. @react-pdf/renderer 재구성 불필요 |
| 첨부 방식 | Resend `attachments: [{filename, content: Buffer}]` | Resend 표준 기능. SES 마이그 시에도 호환 |
| 이메일 트리거 | 수동 (운영자 클릭) MVP, cron은 다음 iteration | 첫 회는 운영자가 결과 확인 후 발송. 자동화는 신뢰성 검증 후 |
| 발송 단위 | seminar+type 기준 batch (예: 23년 2학기 정기세미나 완료 수료증 일괄) | 운영자 멘탈 모델 일치 |
| 권한 | 운영자(staff/admin/president) 모두 허용 | 기존 `/api/certificates/batch`와 동일 |
| 동시성 | `emailSent` 필드 기반 idempotent — 이미 발송된 cert는 skip (강제 재발송 옵션 별도) | 중복 발송 방지 |
| 실패 처리 | 개별 cert별 `emailError` 저장, 전체는 부분 성공 허용 | 50건 중 1건 실패해도 49건은 발송 |
| Email 본문 | HTML 인라인 (newsletter-publisher 패턴 차용) | 별도 템플릿 시스템 불필요 |

## 5. 검증 (Validation)

- [ ] `npm run build` + `npx tsc --noEmit` 통과
- [ ] 단일 cert 이메일 발송 → 수신함에서 PDF 첨부 확인 + 한글 깨짐 X
- [ ] 일괄 발급 다이얼로그에서 "발급 후 이메일" 체크 → 발급 완료 후 자동 발송 동작
- [ ] 이미 발송된 cert는 재발송 시 skip (강제 옵션 OFF 상태)
- [ ] 실패 cert에 emailError 기록 + UI 배지 표시
- [ ] 50건 batch 시 정상 발송 (Resend rate limit 안 걸림)
- [ ] 기존 cert 발급 / 다운로드 회귀 없음

## 6. Out of scope (다음 iteration)

- Cron 자동 발송 (수동 검증 후 도입)
- 이메일 발송 통계 대시보드 (단계 3-기타에서)
- 발송 예약 (특정 시각 발송)
- SMS 알림
- 수료증 외 기수 리포트 PDF (단계 3 다른 트랙: handover-editor-report)
- 회원 일괄 승인 / 회비 대조 (단계 3 다른 트랙)

## 7. Files to touch

| 파일 | 변경 |
|---|---|
| `src/types/index.ts` | `Certificate`에 `emailSent?`, `emailFailedAt?`, `emailError?` 추가 |
| `src/app/api/certificates/email/route.ts` | 신규 |
| `src/app/admin/certificates/page.tsx` | 일괄 발급 다이얼로그 + 행 액션 + 일괄 발송 버튼 + emailSent 배지 |
| `src/lib/email/certificate.ts` (선택) | 본문 빌더 분리 |

## 8. Risks

- **Resend 첨부 크기 제한**: PDF가 너무 크면 첨부 실패. `/api/certificates/pdf`는 보통 100KB 미만이라 안전. 모니터링.
- **Puppeteer 콜드스타트**: cert 50건 발송 시 chromium 재실행 부하. Vercel 1 worker 60s 한도 안에 처리 가능한지 확인 (실패 시 백그라운드 큐 도입).
- **Resend rate limit**: 무료 100/day, paid 더 큼. 일괄 발송 직전 sleep 추가 권장.

## 9. Dependencies on master plan

- 단계 3의 다른 3개 트랙(member-bulk-approval, fees-excel-reconcile, handover-editor-report)과 **독립 PDCA 사이클**.
- 단계 4(academic-activities-v2)에서 활동별 수료증 발송에 본 인프라 재사용 예정.

## Version

| Version | Date | Changes |
|---|---|---|
| 0.1 | 2026-04-18 | Initial plan after existing infra survey |

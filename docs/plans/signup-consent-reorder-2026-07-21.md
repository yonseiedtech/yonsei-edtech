# 회원가입 약관동의 개편 + 약관 현행화 (2026-07-21)

## 요구 1 — 약관 동의를 가입 플로우 최초 단계로 이동

### 단계 변경 전 → 후
가입 플로우(`SignupMultiStep.tsx`)는 UI 4단계(`StepNum = 1|2|3|4`). 폼 검증 단계(`useSignupForm.validateStep`, `STEP_FIELDS_BASE`)는 그대로 1(계정)·2(학적)·3(선택) 유지하고, **UI 단계 순서만 재배치**했다.

| UI Step | 변경 전 | 변경 후 | 폼 검증 매핑(변경 후) |
|--------|--------|--------|----------------------|
| 1 | 계정 정보 (Step1AccountInfo) | **약관 동의 (Step5Consents)** | (검증 없음 · 필수 약관 동의 게이트) |
| 2 | 학적 정보 (Step2Academic) | 계정 정보 (Step1AccountInfo) | validateStep(1) + 학번중복·게스트이력 |
| 3 | 선택 정보 (Step4Optional) | 학적 정보 (Step2Academic) | validateStep(2) |
| 4 | 약관 동의 (Step5Consents) | 선택 정보 (Step4Optional) — 마지막·제출 | validateStep(3) (제출 시) |

### 흐름/정합 처리
- **약관 게이트**: UI Step 1에서 필수 약관(terms·privacy·collection) 미동의 시 `handleNext`가 toast로 차단 → 다음 단계 진행 불가. (기존 다른 단계의 validateStep 실패-toast 패턴과 동일)
- **폼 검증 매핑**: 입력 단계(UI 2·3·4)는 `formStep = uiStep - 1`로 매핑해 기존 `validateStep(1|2|3)` 재사용. 폼 필드 정의(`STEP_FIELDS_BASE`)는 무변경.
- **학번 중복·게스트 이력 확인**: 계정 정보 단계가 UI Step 1→2로 이동 → 조건을 `step === 1`에서 `step === 2`로 변경.
- **마지막 단계 검증**: 선택 정보(activity 필수)가 마지막 단계가 되어, 기존엔 next 시 검증되던 폼 Step 3을 `handleSubmit`에서 검증하도록 이동.
- **단계 인디케이터**: `StepProgress` 라벨을 새 순서 `["약관 동의","계정 정보","학적 정보","선택 정보"]`로 교체. (기존 라벨 배열은 Sprint 67 5→4단계 축소 후 갱신 안 된 5개 스테일 상태였음 — 함께 정리)
- **뒤로가기**: `handlePrev` 무변경(Math.max(1, s-1)). Step 1(약관)에서 `isFirst` → 이전 버튼 비활성.

### 잠재 버그 동반 수정 (재배치 필수 전제)
`StepNavigation`의 `isLast = step === 5`가 4단계 플로우에서 절대 참이 되지 않아 마지막 단계에서 제출 버튼이 노출되지 않는 상태였음(HEAD 커밋 동일). 재배치로 마지막 단계가 선택 정보(Step 4)로 바뀌므로 제출 버튼이 반드시 떠야 함 → `total` prop 추가(`SignupMultiStep`에서 `total={4}` 전달), `isLast = step === total`로 수정.

### ConsentGate(로그인 후 게이트)와의 관계
- 가입 시 `runSignupFlow`가 필수 동의를 프로필 `consents`에 저장 → 로그인 후 `ConsentGate`의 `needsReConsent(user.consents)`가 false → **중복 요구 없음**. 재배치로 동의 수집·저장 로직은 불변이므로 정합 유지(추가 조치 불필요).

## 요구 2 — 약관 내용 현행화 (사실 기반)

실측으로 확인한 현행 서비스 기반으로만 갱신(창작 배제):
- 웹 성능 텔레메트리: `src/lib/web-vitals-tracker.ts` — 10% 샘플링(SAMPLE_RATE=0.1), 익명(userId 없음).
- 검색 무결과 질의: `src/lib/search-miss-tracker.ts` — 익명(userId 저장 없음), `search_misses` 컬렉션, `analytics-retention` cron으로 365일 초과 삭제.
- 학습활동 기록: 학습 잔디·논문 읽기 타이머·진단평가(기존 기능).
- 문의처: `yonsei.edtech@gmail.com` (Footer 실측값과 일치).
- 제3자 제공 없음(기존 서술 유지·명확화). 위탁: Firebase/Vercel/Resend·Gmail(기존 유지).

### 변경 요지
- `src/lib/legal.ts`: `CURRENT_TERMS` 1.0.0 → **1.1.0**(terms/privacy/collection). `needsReConsent`는 버전 불일치를 트리거로 보지 않으므로(2026-04-16 정책) 기존 회원 강제 재동의 없음. 인라인 요약(privacy·collection body) 현행화 — 학습활동 기록·프로필 사진·제3자 미제공 반영.
- `src/app/terms/page.tsx`: 시행일 2026-04-15 → **2026-07-21**. 제5조 제공 서비스 현행화(아카이브·검색·소통 보드·학습 지원 도구·명함). 부칙에 개정 이력 2줄.
- `src/app/privacy/page.tsx`: 시행일 갱신. 처리목적에 학습 지원·서비스 개선 추가. 수집항목에 학부 정보·보안질문·학습활동 기록·익명 통계(웹 성능 10% 표본·검색 무결과) 추가. 보유기간에 익명 통계 1년 추가. 방침 변경 섹션에 개정 이력 2줄.
- `src/app/consent/page.tsx`: 시행일 갱신. 필수 표 학술·학습활동 행에 학습활동 기록 추가, 서비스 운영 행에 익명 통계 추가. 문의처 하단 개정 이력 2줄.

## 수정 파일
- `src/features/auth/SignupMultiStep.tsx`
- `src/features/auth/signup-steps/StepNavigation.tsx`
- `src/features/auth/signup-steps/StepProgress.tsx`
- `src/lib/legal.ts`
- `src/app/terms/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/consent/page.tsx`

## 검증
- `npx tsc --noEmit` (src 에러 0) / `npx eslint src --quiet` (통과)
- build·commit 미수행(지시).

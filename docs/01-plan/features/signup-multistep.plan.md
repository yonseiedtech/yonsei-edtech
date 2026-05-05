# Plan: 회원가입 4단계 분리 (signup-multistep)

> **작성일**: 2026-05-05
> **기반**: UI/UX 병렬 분석(Codex × Claude) 결과 — 회원가입 단일 폼 인지 부하
> **PDCA 단계**: Plan
> **추정 작업량**: 24h (구현 16h + 검증·QA 8h)

---

## 1. 배경 / 현황 분석

### 1.1 현재 SignupForm 구조 (`src/features/auth/SignupForm.tsx`)
- **단일 폼, 1090줄, 100+ 필드** 보유
- 핵심 그룹:
  - 계정 식별 (학번/이름/이메일/전화/생년월일)
  - 학적 (재학상태/기수/입학연도/학부 정보/휴학/졸업)
  - 보안 (비밀번호/비밀번호확인/보안질문/답변)
  - 선택 정보 (관심 분야/직업유형/소속/직책/자격)
- 현재는 모든 섹션이 한 페이지에 노출되어 회원가입 진입 시 **인지 과부하**

### 1.2 두 모델의 일치 진단
| 모델 | 진단 |
|------|------|
| **Codex** | "회원가입은 정보량 많고 선택항목 기본 노출 → 첫 진입 부담 큼. 4단계(필수→학적→보안→선택)로 분리 + 진행률 표시 권장" |
| **Claude** | "100+ 필드 단일 폼 → 사용자 포기율 높음. conversion rate 추정 30-50% 손실. 다단계화 기대효과 = 가입 완료율 큰 상승" |

### 1.3 영향 범위
| 대상 | 영향 |
|------|------|
| **신규 가입자** | UX 개선 — 단계별 작은 폼 | 가입 완료율 상승 기대 |
| **기존 회원** | **영향 없음** — 데이터 스키마 동일, 마이페이지 수정 폼 그대로 |
| **운영진/관리자** | 회원 데이터 구조 동일, 관리 콘솔 영향 없음 |
| **인증 백엔드** | Firebase Auth + Firestore users 컬렉션 — 변경 없음 |

---

## 2. 목표 (Why)

### 2.1 사용자 가치
- 회원가입 첫 화면의 인지 부하 감소 (필드 100+ → 첫 화면 5필드)
- 단계별 검증으로 에러 회복 명확화
- 진행률 가시화로 이탈 감소

### 2.2 KPI
| 지표 | 현재(추정) | 목표 |
|------|------------|------|
| 회원가입 완료율 | 50-70% (단일 폼 가설) | 80%+ |
| 첫 단계 진입 → 완료 평균 시간 | 미측정 | 측정 + 단축 |
| 폼 검증 에러 도달까지 시간 | 마지막 제출 시점 | 단계별 즉시 노출 |

### 2.3 스코프
- **포함**: 신규 회원가입 화면 4단계 분리, 진행률, 단계별 검증
- **포함**: SignupForm 기존 로직 재사용 (제출 API, 검증 로직 그대로)
- **불포함 (별도 sprint)**: 마이페이지 수정 폼 다단계화, 기존 회원 데이터 마이그레이션

---

## 3. 5단계 설계 (What)

| Step | 이름 | 목적 | 주요 필드 (필수) |
|:----:|------|------|------------------|
| 1/5 | **계정 정보** | 식별 정보 입력 | username(학번), name, email, phone, birthDate |
| 2/5 | **학적 정보** | 학회 기수·학부 정보 | enrollmentStatus, generation, 학부(University/College/Major1), Major1IsEducation, 입학연도/반기, (조건부) 휴학·졸업 정보 |
| 3/5 | **계정 보안** | 비밀번호·복구 수단 | password, passwordConfirm, 비밀번호 강도, securityQuestion(Select/Custom), securityAnswer |
| 4/5 | **선택 정보** | 활동 분야·소속 | field, activity, affiliation1/2, position, 직업유형별 세부 필드 |
| 5/5 | **약관 동의** | 법적 약관·마케팅 수신 동의 | UserConsents (이용약관·개인정보·마케팅) — 기존 `ConsentSteps.tsx` 재사용 |

### 3.1 단계별 검증 정책
- 각 단계는 **자체 react-hook-form 검증** 통과 시에만 "다음" 활성화
- 진행률 바 (1/4 ~ 4/4) 상단 고정
- 각 단계 우상단 "이전" / "다음" 버튼, 4단계에서 "가입 완료" 버튼
- 백 버튼 시 입력 보존 (단계 간 useState 또는 react-hook-form watch)

### 3.2 조건부 분기 처리
- enrollmentStatus = "재학" → 입학연도/반기, 학부 정보 노출
- enrollmentStatus = "휴학" → 휴학 시작/복학 예정 추가
- enrollmentStatus = "졸업" → 학위논문/졸업연도/월 추가
- enrollmentStatus = "지원자/외부인" → 학부 정보만 (간소화)

### 3.3 진행률 시각 가이드
```
[●●●○○]  3 / 5 단계  (계정 보안)
─────────────────────────────────
이전 화면 ← 다음 화면 →
```

### 3.4 단계 전환 모션 (확정)
- **Fade + Slide-up**: 새 단계가 16px 아래에서 올라오며 fade-in (`duration 0.3s`)
- `useReducedMotion()` 활성 시 즉시 교체로 fallback (HeroSection 패턴 재사용)
- 단계 전환 후 첫 input 자동 포커스

---

## 4. 데이터 마이그레이션 전략

### 4.1 데이터 스키마
- Firestore `users` 컬렉션 — **변경 없음**
- 회원가입 시 한 번에 모든 필드를 저장하던 동작 그대로 유지 (마지막 단계 제출 시)

### 4.2 기존 회원 영향
- 기존 회원의 데이터 그대로 (필드 누락/추가 없음)
- 마이페이지의 프로필 수정 폼은 영향 없음 (별도 sprint에서 단계화 가능)
- 4단계 도중 필수 입력 항목은 **현재 필수와 동일** — 데이터 무결성 보장

### 4.3 운영 도구 영향
- AdminUserList, console/members/[id] 등 — 영향 없음
- Firestore Rules의 회원가입 관련 규칙 — 변경 없음
- 회원가입 직후 자동 매칭 로직(`runAllGuestLinkers`) — 그대로 호출

### 4.4 Rollback 전략
- 신규 컴포넌트로 분리 (`SignupMultiStep.tsx`) — 기존 SignupForm 유지
- `/signup/page.tsx`에서 새 컴포넌트만 사용
- 문제 시 한 줄 수정으로 SignupForm으로 즉시 복구 가능

---

## 5. 기술 구현 방향 (How)

### 5.1 신규 파일 / 수정 파일
| 파일 | 역할 | 비고 |
|------|------|------|
| `src/features/auth/SignupMultiStep.tsx` | 5단계 컨테이너 (state, 진행률, 단계 라우팅, 모션) | 신규 |
| `src/features/auth/signup-steps/Step1AccountInfo.tsx` | 1단계: 계정 정보 | 신규 |
| `src/features/auth/signup-steps/Step2Academic.tsx` | 2단계: 학적 정보 | 신규 |
| `src/features/auth/signup-steps/Step3Security.tsx` | 3단계: 계정 보안 | 신규 |
| `src/features/auth/signup-steps/Step4Optional.tsx` | 4단계: 선택 정보 (활동·소속·직업) | 신규 |
| `src/features/auth/signup-steps/Step5Consents.tsx` | 5단계: 약관 동의 — `ConsentSteps.tsx` 래핑 | 신규 |
| `src/features/auth/signup-steps/StepProgress.tsx` | 진행률 바 (5단계, 현재 단계 강조) | 신규 |
| `src/features/auth/signup-steps/useSignupForm.ts` | react-hook-form 단일 인스턴스 + 단계별 trigger helper | 신규 |
| `src/app/signup/page.tsx` | SignupMultiStep 사용으로 교체 (1줄 변경) | 수정 |
| `src/features/auth/SignupForm.tsx` | **유지** — rollback 옵션 (1줄 수정으로 즉시 복구 가능) | 유지 |
| `src/components/auth/ConsentSteps.tsx` | Step 5 내부에서 그대로 재사용 | 변경 없음 |

### 5.2 핵심 라이브러리/패턴
- `react-hook-form` 단일 인스턴스 + 단계별 `trigger(["fieldA", "fieldB"])` 검증
- `useState<1 | 2 | 3 | 4>(1)` 단계 상태
- 입력 보존 — `defaultValues` + `watch()` 활용
- 진행률 바: Tailwind progress 바 또는 `<Progress>` shadcn 사용
- 다음/이전 버튼: 페이지 전환 애니메이션 (framer-motion fadeIn) — 단, `useReducedMotion` 처리

### 5.3 검증 흐름
```
Step 1 [계정 검증] → trigger(["username","name","email","phone","birthYear","birthMonth","birthDay"])
  ↓ 통과 시 setStep(2)

Step 2 [학적 검증] → trigger([학부 + (조건부) 휴학·졸업 필드])
  ↓ 통과 시 setStep(3)

Step 3 [보안 검증] → trigger(["password","passwordConfirm","securityQuestionSelect","securityAnswer"])
  ↓ 통과 시 setStep(4)

Step 4 [선택 정보 검증] → trigger([activity-conditional fields])  // 모두 선택값이라 비어도 통과 가능
  ↓ 다음 시 setStep(5)

Step 5 [약관 동의] → ConsentSteps의 필수 약관 모두 체크 시 "가입 완료" 활성화
  ↓ handleSubmit → 기존 onSubmit 100% 재사용 (Firebase Auth + Firestore + guestLinker + sha256)
```

### 5.4 접근성·UX 지침
- 단계 전환 시 첫 입력 필드 자동 포커스
- 모바일에서는 단계 진행 시 상단 진행률 바 sticky
- 각 입력 필드 `aria-describedby` + 에러 메시지 연결 (이미 SignupForm에 있는 패턴 재사용)

---

## 6. 리스크 / 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 단계 전환 시 입력 데이터 유실 | 높음 | react-hook-form 단일 인스턴스 사용 + watch 보존 |
| Step 2의 조건부 분기(휴학/졸업)에서 필수 검증 누락 | 중 | enrollmentStatus 변경 시 trigger 재실행 |
| 현재 SignupForm 의존성(guestLinker, sha256) 누락 | 중 | onSubmit 로직 100% 그대로 재사용 — 단계 컴포넌트는 입력만 담당 |
| Firebase Auth/Firestore 호출 패턴 변경 시 회원가입 실패 | 큼 | 기존 SignupForm 유지 → A/B 가능, rollback 1줄 |
| 모바일에서 단계 전환 애니메이션 성능 | 낮 | reduced-motion 대응 + spring stiffness 80~100 |

---

## 7. 작업 분해 (DoD)

### Phase Plan ✅ (현재)
- [x] 사용자 의도 확인 + 영향 범위 정리
- [x] 4단계 매핑 + 데이터 마이그레이션 전략 확정

### Phase Design (다음)
- [ ] `signup-multistep.design.md` 작성
- [ ] 단계별 와이어프레임/필드 매핑 표
- [ ] react-hook-form 통합 패턴 명세
- [ ] 진행률 컴포넌트 prop 인터페이스
- [ ] 약관 동의(ConsentSteps)와의 통합 방식

### Phase Do
- [ ] `useSignupForm.ts` 훅 (단일 form 인스턴스 + 단계별 검증 helper)
- [ ] `StepProgress.tsx` 진행률 바 (5단계, fade+slide-up 모션 + reduced-motion)
- [ ] `Step1AccountInfo.tsx` ~ `Step4Optional.tsx` 4개 입력 컴포넌트
- [ ] `Step5Consents.tsx` — 기존 `ConsentSteps.tsx` 래핑
- [ ] `SignupMultiStep.tsx` 컨테이너 (단계 상태 + 라우팅 + 모션)
- [ ] `/signup/page.tsx` 컴포넌트 교체 (1줄)
- [ ] vitest 단위 테스트 — 단계별 trigger 통과·차단 시나리오 (최소 6개, 5단계+조건부 분기)

### Phase Check (Gap Analysis)
- [ ] gap-detector로 design ↔ 구현 비교
- [ ] Match Rate ≥ 90% 목표
- [ ] 모바일/데스크톱 단계 전환 시각 검증

### Phase Act (Iterate, 필요 시)
- [ ] Match Rate < 90% 시 pdca-iterator 자동 개선

### Phase Report
- [ ] `signup-multistep.report.md` 생성

---

## 8. 일정 (Tentative)

| 단계 | 시간 |
|------|------|
| Plan | 1h ✅ |
| Design | 2-3h |
| Do | 14-16h (단계 컴포넌트 5개 + 컨테이너 + 훅 + 모션 + 테스트) |
| Check | 2h (gap-detector + 시각 QA) |
| Act | 2-4h (필요 시) |
| Report | 1h |
| **합계** | **~22-27h** |

---

## 9. 후속 PDCA 단계 가이드

| 명령 | 다음 동작 |
|------|----------|
| `/pdca design signup-multistep` | Design 문서 작성 (와이어프레임 + 필드 매핑 + 검증 흐름) |
| `/pdca do signup-multistep` | 구현 시작 가이드 |
| `/pdca analyze signup-multistep` | gap-detector로 검증 |
| `/pdca status` | 현재 단계 확인 |

---

## 10. 확정 결정 (2026-05-05 사용자 승인)

| # | 항목 | 결정 | 이유 |
|---|------|------|------|
| 1 | 컴포넌트 분리 전략 | **신규 `SignupMultiStep` + 기존 `SignupForm` 유지** | Rollback 1줄, A/B 가능, 운영 인증 흐름 안전 |
| 2 | 약관 동의 위치 | **Step 5 별도 단계로 분리 (전체 5단계)** | 인지 부하 분산, 법적 약관에 시각적 무게 부여, 기존 `ConsentSteps.tsx` 그대로 재사용 |
| 3 | 단계 전환 모션 | **Fade + Slide-up 16px / 0.3s + `useReducedMotion` 대응** | 학회 톤 유지, 단계 전환 인지 명확, 접근성 보장 |

---

> 이 Plan은 PDCA Plan 단계 산출물입니다. 다음은 `/pdca design signup-multistep`으로 진입.

# Design: 회원가입 5단계 분리 (signup-multistep)

> **작성일**: 2026-05-05
> **PDCA 단계**: Design
> **참조 Plan**: `docs/01-plan/features/signup-multistep.plan.md`
> **확정 결정**: 신규 컴포넌트 분리 / Step 5 약관 / Fade+Slide-up + reduced-motion

---

## 1. 컴포넌트 트리

```
/signup/page.tsx
  └─ <SignupMultiStep>                                  (신규 — 컨테이너)
       ├─ <StepProgress current={n} total={5} />        (진행률 바)
       ├─ <AnimatePresence mode="wait">                 (단계 전환 모션)
       │    ├─ Step 1: <Step1AccountInfo form={...} />
       │    ├─ Step 2: <Step2Academic form={...} enrollmentStatus={...} setEnrollmentStatus={...} />
       │    ├─ Step 3: <Step3Security form={...} />
       │    ├─ Step 4: <Step4Optional form={...} />
       │    └─ Step 5: <Step5Consents consents={c} setConsents={setC} />
       └─ <StepNavigation step onPrev onNext onSubmit canProceed isSubmitting />
```

**역할 분리**
- `SignupMultiStep`: state(단계 + consents) + react-hook-form 인스턴스 보유 + 단계별 trigger 호출 + 최종 onSubmit 디스패치
- 각 `StepN*` 컴포넌트: **입력 필드만**. 부모로부터 `form` prop을 받아 register. 자체 state 없음 (단, `enrollmentStatus` 같은 UI 분기는 상위에서 lift)
- `StepProgress`: 시각 진행률 (5단계 도트 + 현재 단계 라벨)
- `StepNavigation`: 이전/다음/제출 버튼 + canProceed 비활성화

---

## 2. 데이터 / 상태 모델

### 2.1 상태 위치
| 상태 | 위치 | 이유 |
|------|------|------|
| `step: 1..5` | `SignupMultiStep` useState | 단계 라우팅·진행률 모두 사용 |
| **모든 입력 필드** | `react-hook-form` 단일 인스턴스 | 단계 전환 시 데이터 보존 |
| `enrollmentStatus` | `SignupMultiStep` useState (Step 2 prop으로 전달) | 학적 분기에 따라 Step 2 내부 필드 동적 렌더 |
| `consents: UserConsents` | `SignupMultiStep` useState | Step 5에서 토글, 최종 onSubmit에 합쳐 전송 |
| `isSubmitting` | `SignupMultiStep` useState | Step 5의 "가입 완료" 버튼 로딩 |

### 2.2 `useSignupForm` 훅 명세
```ts
// src/features/auth/signup-steps/useSignupForm.ts
import { useForm, type UseFormReturn } from "react-hook-form";

export interface SignupFormValues {
  // ... 기존 SignupForm.tsx의 SignupData 인터페이스 그대로
}

export interface UseSignupFormResult {
  form: UseFormReturn<SignupFormValues>;
  /** 단계별 검증 — 통과 시 true 반환 */
  validateStep: (step: 1 | 2 | 3 | 4) => Promise<boolean>;
}

export function useSignupForm(
  defaultValues?: Partial<SignupFormValues>,
): UseSignupFormResult;
```

### 2.3 단계별 trigger 필드 매핑
```ts
const STEP_FIELDS: Record<1 | 2 | 3 | 4, (keyof SignupFormValues)[]> = {
  1: ["username", "name", "email", "phone", "birthYear", "birthMonth", "birthDay"],
  2: [
    "enrollmentYear", "enrollmentHalf",
    "undergraduateUniversity", "undergraduateCollege",
    "undergraduateMajor1", "undergraduateMajor1IsEducation",
    // 조건부: 휴학자 → leaveStartYear/Half/returnYear/returnHalf
    // 조건부: 졸업자 → thesisTitle, graduationYear, graduationMonth
  ],
  3: [
    "password", "passwordConfirm",
    "securityQuestionSelect", "securityQuestionCustom", "securityAnswer",
  ],
  4: [], // 모두 선택값 — trigger는 빈 배열 (즉시 통과)
};
```

> Step 5는 `consents` 상태로만 검증 (`consents.terms && consents.privacy && consents.collection`).

---

## 3. 5단계 와이어프레임

### 3.1 공통 레이아웃
```
┌──────────────────────────────────────────────┐
│  [●●○○○]  2 / 5 단계 · 학적 정보            │  ← StepProgress (sticky top)
├──────────────────────────────────────────────┤
│                                              │
│  (단계별 입력 영역)                          │  ← Step{N}* 컴포넌트
│                                              │
├──────────────────────────────────────────────┤
│  [← 이전]              [다음 →] / [가입 완료] │  ← StepNavigation (sticky bottom on mobile)
└──────────────────────────────────────────────┘
```

### 3.2 Step 1 — 계정 정보
| 필드 | 타입 | 검증 |
|------|------|------|
| username (학번) | text/numeric | 10자리 숫자 또는 학번 룰 / `/api/auth/resolve-email`로 중복 체크 |
| name | text | 1자 이상 |
| email | email | RFC + `/api/auth/check-email` 중복 체크 |
| phone | tel | 010-XXXX-XXXX 또는 숫자 11자리 |
| birthYear/Month/Day | select 3개 | 모두 선택 시 통과 |

> 첫 단계 진입 시 `defaultName`/`defaultStudentId` 가 있으면 `setValue`로 prefill.

### 3.3 Step 2 — 학적 정보
- 상단: `enrollmentStatus` segmented control (`재학 / 휴학 / 졸업 / 지원자 / 외부인`)
- 공통 필드: 입학연도/반기, 학부 정보(University/College/Major1, Major1IsEducation, Major2, Major2IsEducation)
- 조건부 분기:
  - **재학**: 추가 필드 없음
  - **휴학**: leaveStartYear/Half + returnYear/Half
  - **졸업**: thesisTitle + graduationYear/Month
  - **지원자/외부인**: 학부 정보만 (입학연도/반기 비활성)
- `enrollmentStatus` 변경 시 즉시 `trigger()` 재호출하여 새 필수 필드 검증 활성화

### 3.4 Step 3 — 계정 보안
- password / passwordConfirm + 비밀번호 강도 인디케이터
- securityQuestionSelect (사전 정의 5개 + "직접 입력")
- securityQuestionSelect === "직접 입력" → securityQuestionCustom 활성화
- securityAnswer (sha256 해싱은 onSubmit 시점)

### 3.5 Step 4 — 선택 정보
- field (관심 분야), activity (직업유형 select)
- `activity` 값에 따라 동적으로 affiliation/department/position/duty/title/notes 필드 라벨 변경 (기존 `OCCUPATION_FIELD_LABELS` 그대로 사용)
- 모두 선택값이라 비어 있어도 다음 단계 진행 가능

### 3.6 Step 5 — 약관 동의 (`Step5Consents.tsx`)
- 4개 약관 한 화면에 표시 (펼침 가능):
  - ☑️ **이용약관** (필수)
  - ☑️ **개인정보 처리방침** (필수)
  - ☑️ **개인정보 수집·이용** (필수)
  - ☐ 마케팅 수신 (선택)
- "전체 동의" 체크박스 — 4개 모두 토글
- `legal.ts` 의 `CONSENT_LABELS`, `CONSENT_LINKS`, `CONSENT_SUMMARIES`, `buildFreshConsents` 재사용
- ⚠️ **주의**: 기존 `ConsentSteps.tsx`는 자체 5단계 wizard 구조(약관 1개씩 보여줌)이므로 그대로 사용 시 "5단계 안의 5단계"가 됨. → **자체 wizard 미사용**, `legal.ts` 데이터만 재사용하는 inline 컴포넌트로 신규 작성
- "가입 완료" 버튼 활성화 조건: `consents.terms && consents.privacy && consents.collection`

---

## 4. 검증 정책 (단계 → 다음 단계 진행)

```ts
async function handleNext() {
  const ok = await validateStep(step as 1 | 2 | 3 | 4);
  if (!ok) {
    toast.error("입력값을 확인해주세요.");
    // 첫 에러 필드로 자동 스크롤·포커스 (react-hook-form의 setFocus)
    return;
  }
  setStep((s) => Math.min(5, s + 1) as 1 | 2 | 3 | 4 | 5);
}

function handlePrev() {
  setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3 | 4 | 5);
}

async function handleSubmit() {
  // Step 5에서만 호출
  if (!consents.terms || !consents.privacy || !consents.collection) {
    toast.error("필수 약관에 모두 동의해주세요.");
    return;
  }
  setSubmitting(true);
  try {
    const values = form.getValues();
    await runOriginalSignupFlow(values, consents); // 기존 SignupForm.onSubmit 100% 재사용
    onSuccess();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "가입 실패");
  } finally {
    setSubmitting(false);
  }
}
```

> `runOriginalSignupFlow`는 기존 `SignupForm.onSubmit`을 외부 함수로 추출하여 양쪽이 공유.

---

## 5. 모션 (Fade + Slide-up + reduced-motion)

```tsx
// SignupMultiStep.tsx
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const reduce = useReducedMotion();
const variants = reduce
  ? { initial: {}, animate: {}, exit: {} }
  : {
      initial: { opacity: 0, y: 16 },
      animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
    };

<AnimatePresence mode="wait">
  <motion.div key={step} variants={variants} initial="initial" animate="animate" exit="exit">
    {renderStep(step)}
  </motion.div>
</AnimatePresence>
```

---

## 6. 진행률 컴포넌트 (`StepProgress.tsx`)

### 6.1 Props
```ts
interface StepProgressProps {
  current: 1 | 2 | 3 | 4 | 5;
  total: 5;
  labels?: string[]; // ["계정 정보", "학적 정보", "계정 보안", "선택 정보", "약관 동의"]
}
```

### 6.2 시각 (Tailwind)
- 5개 도트 (현재 단계: `bg-primary`, 완료: `bg-primary/60`, 미완: `bg-muted`)
- 도트 사이 1px 라인
- 우상단에 `현재단계/총단계 · 라벨`
- 모바일에서 sticky top, 데스크톱에서는 카드 내 상단

---

## 7. 네비게이션 (`StepNavigation.tsx`)

```tsx
interface StepNavigationProps {
  step: 1 | 2 | 3 | 4 | 5;
  onPrev: () => void;
  onNext: () => Promise<void>;
  onSubmit: () => Promise<void>;
  canProceed: boolean;        // Step 5만 사용 (필수 약관 체크)
  isSubmitting: boolean;
}
```

- Step 1: "이전" 버튼 비활성, "다음" 활성
- Step 2-4: "이전" + "다음"
- Step 5: "이전" + "**가입 완료**" (canProceed === true 시 활성, isSubmitting 시 spinner)
- 모바일: bottom-sticky 풀너비 버튼, safe-area-inset-bottom 적용

---

## 8. 약관 동의 통합 (`Step5Consents.tsx`)

```tsx
import { CONSENT_LABELS, CONSENT_LINKS, CONSENT_SUMMARIES, buildFreshConsents, type UserConsents } from "@/lib/legal";

interface Step5ConsentsProps {
  consents: UserConsents;
  setConsents: (c: UserConsents) => void;
}

export default function Step5Consents({ consents, setConsents }: Step5ConsentsProps) {
  const allRequired = consents.terms && consents.privacy && consents.collection;
  const allChecked = allRequired && consents.marketing;

  function toggleAll() {
    const next = !allChecked;
    setConsents(next ? { terms: true, privacy: true, collection: true, marketing: true, version: ... } : buildFreshConsents());
  }

  return (
    <section>
      <h2>약관 동의</h2>
      <label>
        <input type="checkbox" checked={allChecked} onChange={toggleAll} />
        전체 동의 (마케팅 수신 포함)
      </label>
      {(["terms", "privacy", "collection", "marketing"] as const).map((key) => (
        <ConsentRow
          key={key}
          itemKey={key}
          required={key !== "marketing"}
          checked={consents[key]}
          onChange={(v) => setConsents({ ...consents, [key]: v })}
          summary={CONSENT_SUMMARIES[key]}
          link={CONSENT_LINKS[key]}
        />
      ))}
    </section>
  );
}
```

> `ConsentRow`는 inline 펼침/접기 UI. 약관 본문은 expanded 시에만 노출.

---

## 9. 기존 onSubmit 로직 추출

`src/features/auth/SignupForm.tsx` 의 onSubmit 본문을 `src/features/auth/signup-steps/runSignupFlow.ts`로 추출:

```ts
// runSignupFlow.ts
export async function runSignupFlow(
  values: SignupFormValues,
  consents: UserConsents,
): Promise<{ uid: string; email: string }> {
  // 1. Firebase Auth createUserWithEmailAndPassword
  // 2. sha256 보안질문 답변 해싱
  // 3. Firestore users 문서 생성 (모든 필드 + consents 통합)
  // 4. profilesApi.create (bkend)
  // 5. runAllGuestLinkers (게스트 → 정회원 매칭)
  // 6. saveTokens
}
```

기존 SignupForm.tsx는 `runSignupFlow`를 호출하는 형태로 유지(rollback 안전 보장). SignupMultiStep도 같은 함수 호출.

---

## 10. 테스트 케이스 (vitest, 최소 6개)

| # | 케이스 | 기대 결과 |
|---|--------|----------|
| 1 | Step 1 필수 미입력으로 "다음" 클릭 | trigger false, 에러 노출, step 1 유지 |
| 2 | Step 1 모든 필드 정상 → "다음" | step === 2 |
| 3 | Step 2에서 enrollmentStatus="휴학" 시 leaveStartYear 미입력 | trigger false |
| 4 | Step 3 password ≠ passwordConfirm | trigger false, step 3 유지 |
| 5 | Step 5에서 필수 약관 미체크 시 "가입 완료" 비활성 | 버튼 disabled |
| 6 | Step 5 모든 필수 약관 체크 + onSubmit 성공 | runSignupFlow 호출, onSuccess 콜백 트리거 |

---

## 11. 작업 분해 (Do 단계 체크리스트)

- [ ] `runSignupFlow.ts` 추출 (기존 SignupForm onSubmit 로직)
- [ ] `useSignupForm.ts` 훅 (form 인스턴스 + validateStep)
- [ ] `StepProgress.tsx` 진행률 바
- [ ] `StepNavigation.tsx` 이전/다음/제출
- [ ] `Step1AccountInfo.tsx`
- [ ] `Step2Academic.tsx` (조건부 분기 포함)
- [ ] `Step3Security.tsx`
- [ ] `Step4Optional.tsx`
- [ ] `Step5Consents.tsx` (legal.ts 재사용 inline)
- [ ] `SignupMultiStep.tsx` 컨테이너 (step state + consents state + 모션)
- [ ] `/signup/page.tsx`에서 SignupMultiStep 사용
- [ ] vitest 테스트 6개 작성·통과
- [ ] 빌드 검증 + 수동 QA (데스크톱/모바일, 다크모드, reduced-motion)

---

## 12. 디자인 검증 체크리스트

- [ ] Plan과 일치 (5단계, 신규 컴포넌트 분리, ConsentSteps 데이터만 재사용)
- [ ] 데이터 마이그레이션 영향 없음 (Firestore users 스키마 동일)
- [ ] Rollback 가능 (`/signup/page.tsx`에서 컴포넌트 1줄 변경)
- [ ] 접근성: 진행률 `aria-valuenow`, `aria-valuemax`; 단계 전환 후 첫 input focus
- [ ] 모바일 sticky bottom 버튼 + safe-area-inset
- [ ] reduced-motion 대응

---

> 이 Design은 PDCA Design 단계 산출물입니다. 다음은 `/pdca do signup-multistep`으로 구현 시작.

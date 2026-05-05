"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useSignupForm } from "./signup-steps/useSignupForm";
import StepProgress from "./signup-steps/StepProgress";
import StepNavigation from "./signup-steps/StepNavigation";
import Step1AccountInfo from "./signup-steps/Step1AccountInfo";
import Step2Academic from "./signup-steps/Step2Academic";
import Step3Security from "./signup-steps/Step3Security";
import Step4Optional from "./signup-steps/Step4Optional";
import Step5Consents from "./signup-steps/Step5Consents";
import { runSignupFlow } from "./signup-steps/runSignupFlow";
import { buildFreshConsents, type UserConsents } from "@/lib/legal";
import type { EnrollmentStatus } from "@/types";

interface Props {
  onSuccess: () => void;
  defaultName?: string;
  defaultStudentId?: string;
}

type StepNum = 1 | 2 | 3 | 4 | 5;

export default function SignupMultiStep({
  onSuccess,
  defaultName,
  defaultStudentId,
}: Props) {
  const { form, validateStep } = useSignupForm({
    name: defaultName,
    username: defaultStudentId,
  });
  const [step, setStep] = useState<StepNum>(1);
  const [enrollmentStatus, setEnrollmentStatus] =
    useState<EnrollmentStatus>("enrolled");
  const [consents, setConsents] = useState<UserConsents>(
    buildFreshConsents({ terms: false, privacy: false, collection: false }),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleNext() {
    if (step === 5) return;
    const ok = await validateStep(step as 1 | 2 | 3 | 4, enrollmentStatus);
    if (!ok) {
      toast.error("입력값을 확인해 주세요.");
      return;
    }
    setStep((s) => Math.min(5, s + 1) as StepNum);
  }

  function handlePrev() {
    setStep((s) => Math.max(1, s - 1) as StepNum);
  }

  const canProceed = !!(
    consents.terms?.agreed &&
    consents.privacy?.agreed &&
    consents.collection?.agreed
  );

  async function handleSubmit() {
    if (!canProceed) {
      toast.error("필수 약관에 모두 동의해 주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      const data = form.getValues();
      const { autoApproved } = await runSignupFlow(
        data,
        enrollmentStatus,
        consents,
      );
      toast.success(
        autoApproved
          ? "가입이 완료되었습니다. 바로 로그인하실 수 있습니다."
          : "가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
      );
      onSuccess();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "가입 중 오류가 발생했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <StepProgress current={step} total={5} />

      <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {step === 1 && <Step1AccountInfo form={form} />}
        {step === 2 && (
          <Step2Academic
            form={form}
            enrollmentStatus={enrollmentStatus}
            setEnrollmentStatus={setEnrollmentStatus}
          />
        )}
        {step === 3 && <Step3Security form={form} />}
        {step === 4 && <Step4Optional form={form} />}
        {step === 5 && (
          <Step5Consents consents={consents} setConsents={setConsents} />
        )}
      </div>

      <StepNavigation
        step={step}
        onPrev={handlePrev}
        onNext={handleNext}
        onSubmit={handleSubmit}
        canProceed={canProceed}
        isSubmitting={isSubmitting}
      />
    </form>
  );
}

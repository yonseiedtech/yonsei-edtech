"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useSignupForm } from "./signup-steps/useSignupForm";
import StepProgress from "./signup-steps/StepProgress";
import StepNavigation from "./signup-steps/StepNavigation";
import Step1AccountInfo from "./signup-steps/Step1AccountInfo";
import Step2Academic from "./signup-steps/Step2Academic";
import Step4Optional from "./signup-steps/Step4Optional";
import Step5Consents from "./signup-steps/Step5Consents";
import GuestHistoryPreviewDialog, {
  type GuestHistoryRecord,
} from "./signup-steps/GuestHistoryPreviewDialog";
import { runSignupFlow } from "./signup-steps/runSignupFlow";
import { buildFreshConsents, type UserConsents } from "@/lib/legal";
import type { EnrollmentStatus } from "@/types";

interface Props {
  onSuccess: (autoApproved: boolean) => void;
  defaultName?: string;
  defaultStudentId?: string;
}

// Sprint 67: 5단계 → 4단계 (계정 정보+입학시점+보안 통합)
type StepNum = 1 | 2 | 3 | 4;

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

  // 잠재회원 Phase B — 회원가입 전 비회원 활동 이력 사전 안내 팝업
  const [guestHistoryOpen, setGuestHistoryOpen] = useState(false);
  const [guestHistory, setGuestHistory] = useState<{
    count: number;
    records: GuestHistoryRecord[];
  }>({ count: 0, records: [] });
  // 같은 학번/이메일 조합으로 이미 조회한 키 — 스텝 왕복 시 중복 조회/팝업 방지
  const checkedGuestKeyRef = useRef<string | null>(null);

  /** Step 1 통과 직후 비회원 활동 이력을 1회 조회하고, 있으면 안내 팝업을 띄운다. */
  async function checkGuestHistory() {
    const data = form.getValues();
    const studentId = (data.username || "").trim();
    const email = (data.email || "").trim().toLowerCase();
    if (!/^\d{10}$/.test(studentId) && !email) return;

    const key = `${studentId}|${email}`;
    if (checkedGuestKeyRef.current === key) return;
    checkedGuestKeyRef.current = key;

    try {
      const params = new URLSearchParams();
      if (/^\d{10}$/.test(studentId)) params.set("studentId", studentId);
      if (email) params.set("email", email);
      const res = await fetch(`/api/auth/guest-history-preview?${params}`);
      if (!res.ok) return;
      const json = (await res.json()) as {
        count: number;
        records: GuestHistoryRecord[];
      };
      if (json.count > 0) {
        setGuestHistory({ count: json.count, records: json.records });
        setGuestHistoryOpen(true);
      }
    } catch {
      // 사전 안내는 정보 제공용 — 실패해도 가입 흐름을 막지 않는다.
    }
  }

  async function handleNext() {
    if (step === 4) return;
    const ok = await validateStep(step as 1 | 2 | 3, enrollmentStatus);
    if (!ok) {
      toast.error("입력값을 확인해 주세요.");
      return;
    }
    if (step === 1) void checkGuestHistory();
    setStep((s) => Math.min(4, s + 1) as StepNum);
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
      onSuccess(autoApproved);
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
      <StepProgress current={step} total={4} />

      <div key={step} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {step === 1 && <Step1AccountInfo form={form} />}
        {step === 2 && (
          <Step2Academic
            form={form}
            enrollmentStatus={enrollmentStatus}
            setEnrollmentStatus={setEnrollmentStatus}
          />
        )}
        {step === 3 && <Step4Optional form={form} />}
        {step === 4 && (
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

      <GuestHistoryPreviewDialog
        open={guestHistoryOpen}
        onOpenChange={setGuestHistoryOpen}
        name={form.getValues("name") || ""}
        count={guestHistory.count}
        records={guestHistory.records}
      />
    </form>
  );
}

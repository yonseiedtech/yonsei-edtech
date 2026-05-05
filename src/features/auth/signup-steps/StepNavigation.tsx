"use client";

import { Loader2, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StepNavigationProps {
  step: 1 | 2 | 3 | 4 | 5;
  onPrev: () => void;
  onNext: () => Promise<void> | void;
  onSubmit: () => Promise<void> | void;
  /** Step 5에서 필수 약관 체크되었는지 */
  canProceed: boolean;
  isSubmitting: boolean;
}

export default function StepNavigation({
  step,
  onPrev,
  onNext,
  onSubmit,
  canProceed,
  isSubmitting,
}: StepNavigationProps) {
  const isFirst = step === 1;
  const isLast = step === 5;

  return (
    <div
      className="sticky bottom-0 -mx-4 mt-6 flex items-center justify-between gap-2 border-t bg-background/90 px-4 py-3 backdrop-blur"
      style={{
        paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onPrev}
        disabled={isFirst || isSubmitting}
      >
        <ChevronLeft size={16} className="mr-1" />
        이전
      </Button>

      {isLast ? (
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canProceed || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 size={16} className="mr-1.5 animate-spin" />
          ) : (
            <UserPlus size={16} className="mr-1.5" />
          )}
          {isSubmitting ? "가입 진행 중…" : "가입 완료"}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() => void onNext()}
          disabled={isSubmitting}
        >
          다음
          <ChevronRight size={16} className="ml-1" />
        </Button>
      )}
    </div>
  );
}

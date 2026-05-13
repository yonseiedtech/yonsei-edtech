"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import InlineNotification from "@/components/ui/inline-notification";
import EmptyState from "@/components/ui/empty-state";
import { Send, CheckCircle2 } from "lucide-react";
import { useCreateInquiry } from "@/features/inquiry/useInquiry";

/* ─────────────────────────────────────────────────────────
   접수 완료 상태
───────────────────────────────────────────────────────── */
function SubmittedState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <EmptyState
        icon={CheckCircle2}
        title="문의가 접수되었습니다"
        description="운영진이 24시간 내로 입력하신 이메일로 답변 드리겠습니다. 감사합니다."
        actionLabel="새 문의 작성하기"
        onAction={onReset}
        className="border-0 bg-transparent"
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   문의 폼
───────────────────────────────────────────────────────── */
export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createInquiry } = useCreateInquiry();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      await createInquiry({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        message: formData.get("message") as string,
      });
      setSubmitted(true);
    } catch {
      setSubmitError("문의 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return <SubmittedState onReset={() => setSubmitted(false)} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="문의 작성 폼"
      className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      {/* 이름 */}
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1.5 block text-sm font-semibold"
        >
          이름
        </label>
        <Input
          id="contact-name"
          name="name"
          placeholder="홍길동"
          required
          autoComplete="name"
          className="focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {/* 이메일 */}
      <div>
        <label
          htmlFor="contact-email"
          className="mb-1.5 block text-sm font-semibold"
        >
          이메일
        </label>
        <Input
          id="contact-email"
          type="email"
          name="email"
          placeholder="email@yonsei.ac.kr"
          required
          autoComplete="email"
          className="focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          답변이 발송될 이메일 주소를 입력해주세요.
        </p>
      </div>

      {/* 문의 내용 */}
      <div>
        <label
          htmlFor="contact-message"
          className="mb-1.5 block text-sm font-semibold"
        >
          문의 내용
        </label>
        <Textarea
          id="contact-message"
          name="message"
          placeholder="문의 내용을 자유롭게 작성해주세요. 구체적일수록 더 정확한 답변을 드릴 수 있습니다."
          rows={6}
          required
          className="resize-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {/* 에러 알림 */}
      {submitError && (
        <InlineNotification
          kind="error"
          title="전송 실패"
          description={submitError}
        />
      )}

      {/* 제출 버튼 */}
      <Button
        type="submit"
        className="w-full gap-2"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
              aria-hidden
            />
            전송 중…
          </>
        ) : (
          <>
            <Send size={15} aria-hidden />
            문의 보내기
          </>
        )}
      </Button>
    </form>
  );
}

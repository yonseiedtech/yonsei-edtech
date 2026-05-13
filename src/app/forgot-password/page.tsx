"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InlineNotification from "@/components/ui/inline-notification";
import { ArrowLeft, CheckCircle, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Step = "verify" | "answer" | "done";

/** 단계 표시 — 3개 점 + 활성 강조 */
function StepDots({ current }: { current: Step }) {
  const steps: Step[] = ["verify", "answer", "done"];
  const idx = steps.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden>
      {steps.map((s, i) => (
        <span
          key={s}
          className={
            i < idx
              ? "h-2 w-2 rounded-full bg-primary/40"
              : i === idx
                ? "h-2 w-6 rounded-full bg-primary transition-all duration-300"
                : "h-2 w-2 rounded-full bg-border"
          }
        />
      ))}
    </div>
  );
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("verify");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, birthDate }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error("입력하신 정보와 일치하는 사용자를 찾을 수 없습니다.");
        return;
      }
      setSecurityQuestion(data.securityQuestion || "");
      setStep("answer");
    } catch {
      toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, birthDate, answer }),
      });
      const data = await res.json();
      if (res.status === 429) {
        toast.error("시도 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      if (!res.ok || !data.ok) {
        toast.error("답변이 일치하지 않습니다.");
        return;
      }
      setStep("done");
    } catch {
      toast.error("요청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-2 duration-300">

        {/* 완료 화면 — signup 자동승인 카드 패턴 참고 */}
        {step === "done" ? (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-lg sm:p-10">
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-sky-400/15 text-primary">
              <ShieldCheck size={36} />
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                <CheckCircle size={14} />
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              재설정 링크 발송 완료
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              등록된 이메일로 비밀번호 재설정 링크를 발송했습니다.
              <br />
              메일함을 확인해주세요.
            </p>
            <Link href="/login" className="block mt-6">
              <Button className="w-full" size="lg">
                로그인 페이지로
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Compact hero */}
            <div className="mb-6 flex flex-col items-center text-center">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">비밀번호 찾기</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                본인 확인 후 재설정 링크를 이메일로 발송해 드립니다.
              </p>
              <div className="mt-4">
                <StepDots current={step} />
              </div>
            </div>

            {/* 1단계 — 본인 확인 */}
            {step === "verify" && (
              <form
                onSubmit={handleVerify}
                className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
                aria-label="본인 확인 폼"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  1단계 · 본인 확인
                </p>

                <div>
                  <label htmlFor="fp-name" className="mb-1.5 block text-sm font-medium">
                    이름
                  </label>
                  <Input
                    id="fp-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="홍길동"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label htmlFor="fp-username" className="mb-1.5 block text-sm font-medium">
                    학번 (아이디)
                  </label>
                  <Input
                    id="fp-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="예: 2023432001"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="fp-birth" className="mb-1.5 block text-sm font-medium">
                    생년월일
                  </label>
                  <Input
                    id="fp-birth"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>

                <InlineNotification
                  kind="info"
                  title="가입 시 등록한 정보를 입력해주세요"
                  description="이름·학번·생년월일이 일치해야 다음 단계로 진행됩니다."
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : null}
                  본인 확인
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                  >
                    <ArrowLeft size={13} />
                    로그인 페이지로
                  </Link>
                </p>
              </form>
            )}

            {/* 2단계 — 보안 질문 */}
            {step === "answer" && (
              <form
                onSubmit={handleAnswer}
                className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
                aria-label="보안 질문 답변 폼"
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  2단계 · 보안 질문
                </p>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">보안 질문</label>
                  <div
                    className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm"
                    aria-readonly="true"
                  >
                    {securityQuestion || "—"}
                  </div>
                </div>

                <div>
                  <label htmlFor="fp-answer" className="mb-1.5 block text-sm font-medium">
                    답변
                  </label>
                  <Input
                    id="fp-answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    required
                    placeholder="답변을 입력하세요"
                    autoComplete="off"
                  />
                </div>

                <InlineNotification
                  kind="warning"
                  title="5회 이상 틀리면 잠시 제한됩니다"
                  description="답변을 정확히 입력해주세요."
                />

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : null}
                  확인 및 재설정 링크 받기
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep("verify")}
                  disabled={loading}
                >
                  <ArrowLeft size={14} className="mr-1.5" />
                  이전 단계로
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Step = "verify" | "answer" | "done";

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
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            본인 확인 후 재설정 링크를 이메일로 발송해 드립니다.
          </p>
        </div>

        {step === "verify" && (
          <form
            onSubmit={handleVerify}
            className="space-y-4 rounded-2xl border bg-card p-8 shadow-sm"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">이름</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="홍길동" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">학번 (아이디)</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="예: 2023432001" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">생년월일</label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              본인 확인
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline">로그인 페이지로</Link>
            </p>
          </form>
        )}

        {step === "answer" && (
          <form
            onSubmit={handleAnswer}
            className="space-y-4 rounded-2xl border bg-card p-8 shadow-sm"
          >
            <div>
              <label className="mb-1.5 block text-sm font-medium">보안 질문</label>
              <div className="rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                {securityQuestion || "—"}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">답변</label>
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} required placeholder="답변을 입력하세요" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              확인 및 재설정 링크 받기
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setStep("verify")}
              disabled={loading}
            >
              이전 단계로
            </Button>
          </form>
        )}

        {step === "done" && (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-xl font-bold">재설정 링크 발송 완료</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              등록된 이메일로 비밀번호 재설정 링크를 발송했습니다.
              <br />
              메일함을 확인해주세요.
            </p>
            <Link href="/login">
              <Button className="mt-6 w-full">로그인 페이지로</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

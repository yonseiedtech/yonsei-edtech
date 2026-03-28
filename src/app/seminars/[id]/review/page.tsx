"use client";

import { use, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSeminar } from "@/features/seminar/useSeminar";
import { attendeesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Star, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function ReviewForm({ seminarId }: { seminarId: string }) {
  const seminar = useSeminar(seminarId);
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const reviewQuestions = seminar?.reviewQuestions ?? [];

  async function handleSubmit() {
    if (!name.trim()) { toast.error("이름을 입력하세요."); return; }
    if (!content.trim()) { toast.error("후기 내용을 입력하세요."); return; }

    setSubmitting(true);
    try {
      // 학번 기준 참석자 매칭 시도
      let authorId = `guest_${studentId || name}`;
      if (studentId) {
        try {
          const res = await attendeesApi.checkByStudentId(seminarId, studentId);
          const matches = res.data as unknown as { userId: string }[];
          if (matches.length > 0 && matches[0].userId) {
            authorId = matches[0].userId;
          }
        } catch { /* 매칭 실패해도 진행 */ }
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seminarId,
          type: "attendee",
          content: content.trim(),
          rating,
          authorId,
          authorName: name.trim(),
          studentId: studentId.trim() || undefined,
          questionAnswers: Object.keys(questionAnswers).length > 0 ? questionAnswers : undefined,
        }),
      });
      if (!res.ok) throw new Error("API error");

      setDone(true);
    } catch {
      toast.error("후기 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!seminar) {
    return <div className="py-16 text-center text-muted-foreground">세미나를 찾을 수 없습니다.</div>;
  }

  if (done) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold">후기가 등록되었습니다!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            소중한 의견 감사합니다.
          </p>
          <Link href={`/seminars/${seminarId}`}>
            <Button variant="outline" className="mt-6">
              세미나 페이지로 돌아가기
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="mx-auto max-w-md px-4">
        <Link
          href={`/seminars/${seminarId}`}
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          세미나로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="mb-6 text-center">
          <Image src="/yonsei-emblem.svg" alt="" width={40} height={40} className="mx-auto mb-3" />
          <h1 className="text-xl font-bold">세미나 후기 작성</h1>
          <p className="mt-1 text-sm text-muted-foreground">{seminar.title}</p>
          <p className="text-xs text-muted-foreground">{seminar.date}</p>
        </div>

        {/* 폼 */}
        <div className="space-y-4 rounded-xl border bg-white p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">이름 *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">학번</label>
              <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="2025431009" />
            </div>
          </div>

          {/* 별점 */}
          <div>
            <label className="mb-1 block text-sm font-medium">만족도</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRating(v)}
                  className="p-0.5"
                >
                  <Star
                    size={28}
                    className={cn(
                      "transition-colors",
                      v <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 커스텀 질문 */}
          {reviewQuestions.map((q, i) => (
            <div key={i}>
              <label className="mb-1 block text-sm font-medium">{q}</label>
              <textarea
                value={questionAnswers[q] ?? ""}
                onChange={(e) => setQuestionAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                placeholder="답변을 입력해주세요."
                rows={3}
                className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
          ))}

          {/* 내용 */}
          <div>
            <label className="mb-1 block text-sm font-medium">후기 내용 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="세미나에 대한 소감을 자유롭게 작성해주세요."
              rows={5}
              className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !name.trim() || !content.trim()} className="w-full">
            {submitting ? "등록 중..." : "후기 등록"}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            학번을 입력하시면 세미나 참석 기록과 자동으로 연동됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ReviewForm seminarId={id} />;
}

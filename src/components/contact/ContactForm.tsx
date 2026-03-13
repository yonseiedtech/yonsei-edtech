"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { useInquiryStore } from "@/features/inquiry/inquiry-store";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const addInquiry = useInquiryStore((s) => s.addInquiry);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    addInquiry({
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      message: formData.get("message") as string,
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border bg-white p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10 text-secondary">
          <Send size={28} />
        </div>
        <h3 className="text-xl font-bold">문의가 접수되었습니다</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          빠른 시일 내에 답변 드리겠습니다. 감사합니다.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setSubmitted(false)}
        >
          새 문의 작성
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border bg-white p-8 shadow-sm"
    >
      <div>
        <label className="mb-1.5 block text-sm font-medium">이름</label>
        <Input name="name" placeholder="홍길동" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">이메일</label>
        <Input type="email" name="email" placeholder="email@example.com" required />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">문의 내용</label>
        <Textarea
          name="message"
          placeholder="문의 내용을 입력해주세요."
          rows={5}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        문의하기
      </Button>
    </form>
  );
}

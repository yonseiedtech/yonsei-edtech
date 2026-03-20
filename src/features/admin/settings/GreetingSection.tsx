"use client";

import { useState, useEffect } from "react";
import { useGreeting, useUpdateGreeting, type GreetingData } from "@/features/greeting/useGreeting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";

export default function GreetingSection() {
  const { greeting, recordId, isLoading } = useGreeting();
  const updateMutation = useUpdateGreeting();
  const [form, setForm] = useState<GreetingData>({ presidentName: "", presidentTitle: "", presidentPhoto: "", content: "" });

  useEffect(() => { if (!isLoading) setForm(greeting); }, [isLoading, greeting]);

  function handleSave() {
    updateMutation.mutate({ recordId, greeting: form }, {
      onSuccess: () => toast.success("인사말이 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <Section title="인사말">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">회장 이름</label>
          <Input value={form.presidentName} onChange={(e) => setForm({ ...form, presidentName: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">직책</label>
          <Input value={form.presidentTitle} onChange={(e) => setForm({ ...form, presidentTitle: e.target.value })} />
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-muted-foreground">사진 URL</label>
        <Input value={form.presidentPhoto} onChange={(e) => setForm({ ...form, presidentPhoto: e.target.value })} />
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-muted-foreground">인사말 본문</label>
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
  );
}

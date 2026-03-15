"use client";

import { useState, useEffect } from "react";
import { useGreeting, useUpdateGreeting, type GreetingData } from "@/features/greeting/useGreeting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AdminGreetingTab() {
  const { greeting, recordId, isLoading } = useGreeting();
  const updateMutation = useUpdateGreeting();

  const [form, setForm] = useState<GreetingData>({
    presidentName: "",
    presidentTitle: "",
    presidentPhoto: "",
    content: "",
  });

  useEffect(() => {
    if (!isLoading) {
      setForm(greeting);
    }
  }, [isLoading, greeting]);

  function handleChange(field: keyof GreetingData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ recordId, greeting: form });
      toast.success("인사말이 업데이트되었습니다.");
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    }
  }

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">불러오는 중...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">인사말 관리</h2>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="presidentName" className="text-sm font-medium">회장 이름</label>
          <Input
            id="presidentName"
            value={form.presidentName}
            onChange={(e) => handleChange("presidentName", e.target.value)}
            placeholder="예: 홍길동"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="presidentTitle" className="text-sm font-medium">직책</label>
          <Input
            id="presidentTitle"
            value={form.presidentTitle}
            onChange={(e) => handleChange("presidentTitle", e.target.value)}
            placeholder="예: 연세교육공학회 회장"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="presidentPhoto" className="text-sm font-medium">사진 URL</label>
        <Input
          id="presidentPhoto"
          value={form.presidentPhoto}
          onChange={(e) => handleChange("presidentPhoto", e.target.value)}
          placeholder="https://example.com/photo.jpg"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="content" className="text-sm font-medium">인사말 본문</label>
        <Textarea
          id="content"
          value={form.content}
          onChange={(e) => handleChange("content", e.target.value)}
          rows={10}
          placeholder="인사말 내용을 입력하세요"
        />
      </div>

      <Button onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </div>
  );
}

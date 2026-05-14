"use client";

import { useState, useEffect } from "react";
import { useActivities, useUpdateActivities, type ActivitiesData } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import Section from "./SectionWrapper";
import { toast } from "sonner";

export default function ActivitiesSection() {
  const { value, recordId, isLoading } = useActivities();
  const updateMutation = useUpdateActivities();
  const [form, setForm] = useState<ActivitiesData>(value);

  useEffect(() => { if (!isLoading) setForm(value); }, [isLoading, value]);

  function handleSave() {
    updateMutation.mutate({ recordId, value: form }, {
      onSuccess: () => toast.success("활동 소개가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <div className="space-y-6">
    <Section title="학술활동 소개">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">활동 소개</label>
        <textarea
          value={form.introduction}
          onChange={(e) => setForm({ ...form, introduction: e.target.value })}
          rows={6}
          className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm"
          placeholder="학술활동 페이지에 표시될 소개 텍스트를 입력하세요."
        />
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
    </div>
  );
}

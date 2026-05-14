"use client";

import { useState, useEffect } from "react";
import { useAbout, useUpdateAbout, type AboutData } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import Section from "./SectionWrapper";
import { toast } from "sonner";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Info } from "lucide-react";

export default function AboutSection() {
  const { value, recordId, isLoading } = useAbout();
  const updateMutation = useUpdateAbout();
  const [form, setForm] = useState<AboutData>(value);

  useEffect(() => { if (!isLoading) setForm(value); }, [isLoading, value]);

  function handleSave() {
    updateMutation.mutate({ recordId, value: form }, {
      onSuccess: () => toast.success("학회 소개가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <ConsolePageHeader icon={Info} title="학회 소개" description="학회의 미션, 비전, 핵심 가치를 관리합니다." />
    <Section title="학회 소개 (미션/비전/가치)">
      {(["mission", "vision", "values"] as const).map((key) => (
        <div key={key} className="mt-4 first:mt-0">
          <label className="mb-1 block text-xs text-muted-foreground">
            {{ mission: "미션", vision: "비전", values: "가치" }[key]}
          </label>
          <textarea value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} rows={2} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
        </div>
      ))}
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
    </div>
  );
}

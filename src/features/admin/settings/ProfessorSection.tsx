"use client";

import { useState, useEffect } from "react";
import { useProfessor, useUpdateProfessor, type ProfessorData } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";

export default function ProfessorSection() {
  const { value, recordId, isLoading } = useProfessor();
  const updateMutation = useUpdateProfessor();
  const [form, setForm] = useState<ProfessorData>(value);

  useEffect(() => { if (!isLoading) setForm(value); }, [isLoading, value]);

  function handleSave() {
    updateMutation.mutate({ recordId, value: form }, {
      onSuccess: () => toast.success("주임교수 정보가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <div className="space-y-6">
    <Section title="주임교수">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">이름</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">직함</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">소속</label>
          <Input value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">학과</label>
          <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">이메일</label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">웹사이트</label>
          <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-muted-foreground">사진 URL</label>
        <Input value={form.photo} onChange={(e) => setForm({ ...form, photo: e.target.value })} />
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-muted-foreground">소개</label>
        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
      </div>
      <div className="mt-4">
        <label className="mb-1 block text-xs text-muted-foreground">연구 분야 (줄바꿈으로 구분)</label>
        <textarea value={form.research.join("\n")} onChange={(e) => setForm({ ...form, research: e.target.value.split("\n").filter(Boolean) })} rows={3} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
    </div>
  );
}

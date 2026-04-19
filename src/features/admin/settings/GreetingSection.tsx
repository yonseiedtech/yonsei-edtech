"use client";

import { useState, useEffect } from "react";
import { useGreeting, useUpdateGreeting, type GreetingPerson } from "@/features/greeting/useGreeting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";

interface PersonFormProps {
  label: string;
  value: GreetingPerson;
  onChange: (next: GreetingPerson) => void;
  optional?: boolean;
}

function PersonForm({ label, value, onChange, optional }: PersonFormProps) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <h4 className="mb-3 text-sm font-semibold">
        {label}
        {optional && <span className="ml-2 text-[11px] font-normal text-muted-foreground">(선택 — 비워두면 공개 페이지에 표시되지 않습니다)</span>}
      </h4>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">이름</label>
          <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">직책</label>
          <Input value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-muted-foreground">사진 URL</label>
        <Input value={value.photo} onChange={(e) => onChange({ ...value, photo: e.target.value })} />
      </div>
      <div className="mt-3">
        <label className="mb-1 block text-xs text-muted-foreground">인사말 본문</label>
        <textarea
          value={value.content}
          onChange={(e) => onChange({ ...value, content: e.target.value })}
          rows={6}
          className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
    </div>
  );
}

export default function GreetingSection() {
  const { advisor, president, recordId, isLoading } = useGreeting();
  const updateMutation = useUpdateGreeting();
  const [advisorForm, setAdvisorForm] = useState<GreetingPerson>(advisor);
  const [presidentForm, setPresidentForm] = useState<GreetingPerson>(president);

  useEffect(() => {
    if (!isLoading) {
      setAdvisorForm(advisor);
      setPresidentForm(president);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, advisor.name, advisor.title, advisor.content, president.name, president.title, president.content]);

  function handleSave() {
    updateMutation.mutate(
      { recordId, greeting: { advisor: advisorForm, president: presidentForm } },
      {
        onSuccess: () => toast.success("인사말이 저장되었습니다."),
        onError: () => toast.error("저장 실패"),
      },
    );
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <Section title="인사말">
      <div className="space-y-4">
        <PersonForm label="주임교수 인사말" value={advisorForm} onChange={setAdvisorForm} optional />
        <PersonForm label="학회장 인사말" value={presidentForm} onChange={setPresidentForm} />
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Megaphone } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { useGreeting, useUpdateGreeting, type GreetingData } from "@/features/greeting/useGreeting";
import {
  useProfessor, useUpdateProfessor, type ProfessorData,
  useAbout, useUpdateAbout, type AboutData,
  useFields, useUpdateFields, type FieldItem,
  useHistory, useUpdateHistory, type HistoryItem,
  useContactInfo, useUpdateContactInfo, type ContactInfoData,
  usePastPresidents, useUpdatePastPresidents, type PastPresidentItem,
} from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

// ── 섹션 래퍼 ──
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h3 className="mb-4 text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

// ── 인사말 ──
function GreetingSection() {
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

// ── 주임교수 ──
function ProfessorSection() {
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
    <Section title="주임교수">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">이름</label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="예: 김교수" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">직함</label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 교수" />
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
        <textarea value={form.research.join("\n")} onChange={(e) => setForm({ ...form, research: e.target.value.split("\n").filter(Boolean) })} rows={3} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" placeholder="교육공학&#10;AI 교육&#10;학습과학" />
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
  );
}

// ── 학회 소개 ──
function AboutSection() {
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
  );
}

// ── 연혁 ──
function HistorySection() {
  const { value, recordId, isLoading } = useHistory();
  const updateMutation = useUpdateHistory();
  const [items, setItems] = useState<HistoryItem[]>(value);

  useEffect(() => { if (!isLoading) setItems(value); }, [isLoading, value]);

  function addItem() { setItems([...items, { year: new Date().getFullYear().toString(), title: "", desc: "" }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof HistoryItem, val: string) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  function handleSave() {
    updateMutation.mutate({ recordId, value: items }, {
      onSuccess: () => toast.success("연혁이 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <Section title="연혁">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <Input value={item.year} onChange={(e) => updateItem(i, "year", e.target.value)} className="w-20" placeholder="연도" />
            <Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} className="flex-1" placeholder="제목" />
            <Input value={item.desc} onChange={(e) => updateItem(i, "desc", e.target.value)} className="flex-[2]" placeholder="설명" />
            <button onClick={() => removeItem(i)} className="mt-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" />항목 추가</Button>
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Section>
  );
}

// ── 활동 분야 ──
function FieldsSection() {
  const { value, recordId, isLoading } = useFields();
  const updateMutation = useUpdateFields();
  const [items, setItems] = useState<FieldItem[]>(value);

  useEffect(() => { if (!isLoading) setItems(value); }, [isLoading, value]);

  function addItem() { setItems([...items, { title: "", desc: "", icon: "Lightbulb" }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof FieldItem, val: string) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  function handleSave() {
    updateMutation.mutate({ recordId, value: items }, {
      onSuccess: () => toast.success("활동 분야가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <Section title="활동 분야">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <Input value={item.title} onChange={(e) => updateItem(i, "title", e.target.value)} className="w-32" placeholder="분야명" />
            <Input value={item.desc} onChange={(e) => updateItem(i, "desc", e.target.value)} className="flex-1" placeholder="설명" />
            <button onClick={() => removeItem(i)} className="mt-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" />분야 추가</Button>
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Section>
  );
}

// ── 문의 연락처 ──
function ContactInfoSection() {
  const { value, recordId, isLoading } = useContactInfo();
  const updateMutation = useUpdateContactInfo();
  const [form, setForm] = useState<ContactInfoData>(value);

  useEffect(() => { if (!isLoading) setForm(value); }, [isLoading, value]);

  function handleSave() {
    updateMutation.mutate({ recordId, value: form }, {
      onSuccess: () => toast.success("연락처 정보가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <Section title="문의 연락처">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">이메일</label>
          <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">정기 모임</label>
          <Input value={form.meetingSchedule} onChange={(e) => setForm({ ...form, meetingSchedule: e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs text-muted-foreground">주소</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} className="w-full rounded-lg border bg-muted/50 px-3 py-2 text-sm" />
        </div>
      </div>
      <Button className="mt-4" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? "저장 중..." : "저장"}
      </Button>
    </Section>
  );
}

// ── 역대 회장 ──
function PastPresidentsSection() {
  const { value, recordId, isLoading } = usePastPresidents();
  const updateMutation = useUpdatePastPresidents();
  const [items, setItems] = useState<PastPresidentItem[]>(value);

  useEffect(() => { if (!isLoading) setItems(value); }, [isLoading, value]);

  function addItem() { setItems([...items, { generation: items.length + 1, name: "", term: "", affiliation: "" }]); }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }
  function updateItem(i: number, field: keyof PastPresidentItem, val: string | number) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  }

  function handleSave() {
    updateMutation.mutate({ recordId, value: items }, {
      onSuccess: () => toast.success("역대 회장 정보가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  return (
    <Section title="역대 회장">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <Input value={item.generation} onChange={(e) => updateItem(i, "generation", Number(e.target.value) || 0)} className="w-16" placeholder="기수" type="number" />
            <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} className="w-24" placeholder="이름" />
            <Input value={item.term} onChange={(e) => updateItem(i, "term", e.target.value)} className="w-40" placeholder="임기 (예: 2024~2025)" />
            <Input value={item.affiliation} onChange={(e) => updateItem(i, "affiliation", e.target.value)} className="flex-1" placeholder="소속" />
            <button onClick={() => removeItem(i)} className="mt-2 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Button variant="outline" size="sm" onClick={addItem}><Plus size={14} className="mr-1" />회장 추가</Button>
        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>
    </Section>
  );
}

// ── 메인 탭 ──
export default function AdminGreetingTab() {
  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Megaphone}
        title="사이트 콘텐츠"
        description="인사말, 주임교수, 학회 소개 등 메인 페이지 노출 정보를 편집합니다."
      />
      <ProfessorSection />
      <GreetingSection />
      <AboutSection />
      <HistorySection />
      <FieldsSection />
      <PastPresidentsSection />
      <ContactInfoSection />
    </div>
  );
}

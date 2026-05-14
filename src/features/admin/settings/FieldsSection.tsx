"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { useFields, useUpdateFields, type FieldItem } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";

export default function FieldsSection() {
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
    <div className="space-y-6">
      <ConsolePageHeader icon={Tag} title="활동 분야" description="학회의 주요 활동 분야 목록을 관리합니다." />
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
    </div>
  );
}

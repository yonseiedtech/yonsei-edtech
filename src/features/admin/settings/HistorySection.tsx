"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useHistory, useUpdateHistory, type HistoryItem } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";

export default function HistorySection() {
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

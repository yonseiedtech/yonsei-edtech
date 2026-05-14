"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { usePastPresidents, useUpdatePastPresidents, type PastPresidentItem } from "@/features/site-settings/useSiteContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Section from "./SectionWrapper";
import { toast } from "sonner";

export default function PastPresidentsSection() {
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
    <div className="space-y-6">
    <Section title="역대 회장">
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2">
            <Input value={item.generation} onChange={(e) => updateItem(i, "generation", Number(e.target.value) || 0)} className="w-16" placeholder="기수" type="number" />
            <Input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} className="w-24" placeholder="이름" />
            <Input value={item.term} onChange={(e) => updateItem(i, "term", e.target.value)} className="w-40" placeholder="임기" />
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
    </div>
  );
}

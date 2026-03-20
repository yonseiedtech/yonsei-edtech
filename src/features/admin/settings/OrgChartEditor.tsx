"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, X, Check } from "lucide-react";
import { useOrgChart, useUpdateOrgChart, type OrgPosition } from "./useOrgChart";
import { useMembers } from "@/features/member/useMembers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Section from "./SectionWrapper";
import { toast } from "sonner";

const LEVEL_LABELS: Record<number, string> = {
  0: "회장",
  1: "부회장/감사",
  2: "팀장",
  3: "팀원",
};

function generateId() {
  return `pos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

interface EditDialogProps {
  position: OrgPosition | null;
  allPositions: OrgPosition[];
  open: boolean;
  onClose: () => void;
  onSave: (pos: OrgPosition) => void;
}

function EditDialog({ position, allPositions, open, onClose, onSave }: EditDialogProps) {
  const { members } = useMembers();
  const staffMembers = members.filter((m) => ["staff", "president", "admin"].includes(m.role));

  const [form, setForm] = useState<OrgPosition>(
    position ?? { id: generateId(), title: "", level: 0, order: 0 },
  );

  useEffect(() => {
    if (position) setForm(position);
    else setForm({ id: generateId(), title: "", level: 0, order: allPositions.length });
  }, [position, allPositions.length]);

  const parentOptions = allPositions.filter((p) => p.level < form.level && p.id !== form.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{position ? "직책 수정" : "직책 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">직책명</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 회장, 학술팀장" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">부서/팀명 (선택)</label>
            <Input value={form.department ?? ""} onChange={(e) => setForm({ ...form, department: e.target.value || undefined })} placeholder="예: 학술부, 홍보부" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">계층</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: Number(e.target.value), parentId: undefined })}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              >
                {Object.entries(LEVEL_LABELS).map(([lv, label]) => (
                  <option key={lv} value={lv}>{lv} - {label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">순서</label>
              <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} />
            </div>
          </div>
          {form.level > 0 && parentOptions.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">상위 직책</label>
              <select
                value={form.parentId ?? ""}
                onChange={(e) => setForm({ ...form, parentId: e.target.value || undefined })}
                className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              >
                <option value="">없음</option>
                {parentOptions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}{p.userName ? ` (${p.userName})` : ""}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">담당자</label>
            <select
              value={form.userId ?? ""}
              onChange={(e) => {
                const member = staffMembers.find((m) => m.id === e.target.value);
                setForm({
                  ...form,
                  userId: e.target.value || undefined,
                  userName: member?.name,
                  userPhoto: member?.profileImage,
                });
              }}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <option value="">공석</option>
              {staffMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button onClick={() => { if (!form.title.trim()) { toast.error("직책명을 입력하세요."); return; } onSave(form); onClose(); }}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function OrgChartEditor() {
  const { positions, recordId, isLoading } = useOrgChart();
  const updateMutation = useUpdateOrgChart();
  const [items, setItems] = useState<OrgPosition[]>([]);
  const [editPos, setEditPos] = useState<OrgPosition | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => { if (!isLoading) setItems(positions); }, [isLoading, positions]);

  function handleSavePosition(pos: OrgPosition) {
    setItems((prev) => {
      const exists = prev.find((p) => p.id === pos.id);
      if (exists) return prev.map((p) => p.id === pos.id ? pos : p);
      return [...prev, pos];
    });
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((p) => p.id !== id && p.parentId !== id));
  }

  function handleMoveOrder(id: string, delta: number) {
    setItems((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const item = prev[idx];
      const sameLevel = prev.filter((p) => p.level === item.level).sort((a, b) => a.order - b.order);
      const posInLevel = sameLevel.findIndex((p) => p.id === id);
      const swapIdx = posInLevel + delta;
      if (swapIdx < 0 || swapIdx >= sameLevel.length) return prev;
      const swap = sameLevel[swapIdx];
      return prev.map((p) => {
        if (p.id === item.id) return { ...p, order: swap.order };
        if (p.id === swap.id) return { ...p, order: item.order };
        return p;
      });
    });
  }

  function handleSaveAll() {
    updateMutation.mutate({ recordId, positions: items }, {
      onSuccess: () => toast.success("조직도가 저장되었습니다."),
      onError: () => toast.error("저장 실패"),
    });
  }

  if (isLoading) return <div className="py-4 text-sm text-muted-foreground">불러오는 중...</div>;

  const grouped = new Map<number, OrgPosition[]>();
  for (const item of [...items].sort((a, b) => a.order - b.order)) {
    const list = grouped.get(item.level) ?? [];
    list.push(item);
    grouped.set(item.level, list);
  }
  const levels = [...grouped.keys()].sort();

  return (
    <Section title="운영진 조직도">
      {levels.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">등록된 직책이 없습니다.</p>
      )}

      {levels.map((level) => (
        <div key={level} className="mt-4 first:mt-0">
          <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
            Level {level}: {LEVEL_LABELS[level] ?? `기타`}
          </h4>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {grouped.get(level)!.map((pos) => (
              <div key={pos.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2.5">
                {pos.userName ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {pos.userName[0]}
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">?</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{pos.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {pos.userName ?? "공석"}
                    {pos.department && ` · ${pos.department}`}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button onClick={() => handleMoveOrder(pos.id, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronUp size={14} /></button>
                  <button onClick={() => handleMoveOrder(pos.id, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted"><ChevronDown size={14} /></button>
                  <button onClick={() => { setEditPos(pos); setShowDialog(true); }} className="rounded p-1 text-muted-foreground hover:bg-muted"><Pencil size={14} /></button>
                  <button onClick={() => handleDelete(pos.id)} className="rounded p-1 text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { setEditPos(null); setShowDialog(true); }}>
          <Plus size={14} className="mr-1" />직책 추가
        </Button>
        <Button size="sm" onClick={handleSaveAll} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "저장 중..." : "저장"}
        </Button>
      </div>

      <EditDialog
        position={editPos}
        allPositions={items}
        open={showDialog}
        onClose={() => { setShowDialog(false); setEditPos(null); }}
        onSave={handleSavePosition}
      />
    </Section>
  );
}

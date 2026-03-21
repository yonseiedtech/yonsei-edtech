"use client";

import { useState } from "react";
import { useSeminars, useUpdateSeminar } from "@/features/seminar/useSeminar";
import { createTimeline } from "./timeline-template";
import { resolveDate, isOverdue, formatDDay } from "./timeline-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Check,
  AlertTriangle,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Video,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Seminar, TimelinePhase } from "@/types";

function saveTimeline(
  updateSeminar: ReturnType<typeof useUpdateSeminar>["updateSeminar"],
  seminarId: string,
  timeline: TimelinePhase[],
) {
  // undefined 값 제거 (Firestore 호환)
  const cleaned = timeline.map((p) => {
    const item: Record<string, unknown> = {
      id: p.id,
      label: p.label,
      dDay: p.dDay,
      done: p.done,
      memo: p.memo ?? "",
      assignee: p.assignee ?? "",
    };
    if (p.doneAt) item.doneAt = p.doneAt;
    return item;
  });
  updateSeminar({ id: seminarId, data: { timeline: cleaned } as unknown as Partial<Seminar> });
}

export default function TimelineTab() {
  const { seminars } = useSeminars();
  const { updateSeminar } = useUpdateSeminar();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<{
    mode: "add" | "edit";
    id: string;
    label: string;
    dDay: string;
    assignee: string;
  } | null>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const timeline: TimelinePhase[] = seminar?.timeline ?? [];
  const isOnline = seminar?.isOnline ?? false;

  function handleInit() {
    if (!seminar) return;
    const tl = createTimeline(isOnline);
    saveTimeline(updateSeminar, seminar.id, tl);
    toast.success(
      isOnline
        ? "온라인(ZOOM) 타임라인이 생성되었습니다."
        : "오프라인 타임라인이 생성되었습니다.",
    );
  }

  function handleToggle(phaseId: string) {
    if (!seminar) return;
    const updated = timeline.map((p) =>
      p.id === phaseId
        ? { ...p, done: !p.done, doneAt: !p.done ? new Date().toISOString() : undefined }
        : p,
    );
    saveTimeline(updateSeminar, seminar.id, updated);
  }

  function handleMemoChange(phaseId: string, memo: string) {
    if (!seminar) return;
    const updated = timeline.map((p) =>
      p.id === phaseId ? { ...p, memo } : p,
    );
    saveTimeline(updateSeminar, seminar.id, updated);
  }

  function handleDelete(phaseId: string) {
    if (!seminar) return;
    const updated = timeline.filter((p) => p.id !== phaseId);
    saveTimeline(updateSeminar, seminar.id, updated);
    toast.success("항목이 삭제되었습니다.");
  }

  function openAdd() {
    setEditItem({ mode: "add", id: "", label: "", dDay: "-7", assignee: "" });
  }

  function openEdit(phase: TimelinePhase) {
    setEditItem({ mode: "edit", id: phase.id, label: phase.label, dDay: String(phase.dDay), assignee: phase.assignee ?? "" });
  }

  function handleSaveItem() {
    if (!seminar || !editItem || !editItem.label.trim()) return;
    const dDay = parseInt(editItem.dDay) || 0;

    if (editItem.mode === "add") {
      const newId = `custom_${Date.now()}`;
      const newPhase: TimelinePhase = {
        id: newId,
        label: editItem.label,
        dDay,
        done: false,
        memo: "",
        assignee: editItem.assignee || undefined,
      };
      const updated = [...timeline, newPhase];
      saveTimeline(updateSeminar, seminar.id, updated);
      toast.success("항목이 추가되었습니다.");
    } else {
      const updated = timeline.map((p) =>
        p.id === editItem.id ? { ...p, label: editItem.label, dDay, assignee: editItem.assignee || undefined } : p,
      );
      saveTimeline(updateSeminar, seminar.id, updated);
      toast.success("항목이 수정되었습니다.");
    }
    setEditItem(null);
  }

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div className="flex items-end gap-4">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.date}) {s.isOnline ? "[ZOOM]" : ""}
              </option>
            ))}
          </select>
        </div>
        {seminar && timeline.length === 0 && (
          <Button onClick={handleInit} size="sm">
            <RotateCcw size={14} className="mr-1" />
            {isOnline ? "온라인 타임라인 생성" : "오프라인 타임라인 생성"}
          </Button>
        )}
      </div>

      {/* 타임라인 체크리스트 */}
      {seminar && timeline.length > 0 && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Video size={16} className="text-blue-500" />
                ) : (
                  <MapPin size={16} className="text-muted-foreground" />
                )}
                <span className="text-sm font-medium">
                  {isOnline ? "온라인(ZOOM)" : "오프라인"} | 세미나: {seminar.date} | 완료: {timeline.filter((p) => p.done).length}/{timeline.length}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={openAdd}>
                  <Plus size={14} className="mr-1" />
                  항목 추가
                </Button>
                <Button variant="outline" size="sm" onClick={handleInit}>
                  <RotateCcw size={14} className="mr-1" />
                  초기화
                </Button>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {timeline
              .sort((a, b) => a.dDay - b.dDay)
              .map((phase) => {
                const overdue = isOverdue(seminar.date, phase);
                const targetDate = resolveDate(seminar.date, phase.dDay);

                return (
                  <div
                    key={phase.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      overdue && "bg-red-50",
                    )}
                  >
                    {/* 체크박스 */}
                    <button
                      onClick={() => handleToggle(phase.id)}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded border-2 transition-colors",
                        phase.done
                          ? "border-green-500 bg-green-500 text-white"
                          : overdue
                            ? "border-red-400"
                            : "border-muted-foreground/30",
                      )}
                    >
                      {phase.done && <Check size={14} />}
                    </button>

                    {/* D-day 배지 */}
                    <Badge
                      variant="secondary"
                      className={cn(
                        "w-14 shrink-0 justify-center text-xs",
                        overdue && !phase.done && "bg-red-100 text-red-700",
                      )}
                    >
                      {formatDDay(phase.dDay)}
                    </Badge>

                    {/* 라벨 + 날짜 */}
                    <div className="min-w-0 flex-1">
                      <span className={cn("text-sm", phase.done && "text-muted-foreground line-through")}>
                        {phase.label}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">{targetDate}</span>
                    </div>

                    {/* 경고 아이콘 + 툴팁 */}
                    {overdue && !phase.done && (
                      <span
                        className="shrink-0"
                        title={`기한 초과! 목표일(${targetDate})이 지났습니다. 빠른 처리가 필요합니다.`}
                      >
                        <AlertTriangle size={16} className="text-red-500" />
                      </span>
                    )}

                    {/* 담당자 */}
                    <Input
                      placeholder="담당자"
                      value={phase.assignee ?? ""}
                      onChange={(e) => {
                        if (!seminar) return;
                        const updated = timeline.map((p) =>
                          p.id === phase.id ? { ...p, assignee: e.target.value } : p,
                        );
                        saveTimeline(updateSeminar, seminar.id, updated);
                      }}
                      className="w-20 shrink-0 text-xs"
                    />

                    {/* 메모 */}
                    <Input
                      placeholder="메모"
                      value={phase.memo ?? ""}
                      onChange={(e) => handleMemoChange(phase.id, e.target.value)}
                      className="w-32 shrink-0 text-xs"
                    />

                    {/* 수정/삭제 */}
                    <button
                      onClick={() => openEdit(phase)}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="항목 수정"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDelete(phase.id)}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                      title="항목 삭제"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {seminar && timeline.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
          <p>아직 타임라인이 설정되지 않았습니다.</p>
          <p className="mt-1">
            이 세미나는 <strong>{isOnline ? "온라인(ZOOM)" : "오프라인"}</strong> 세미나입니다.
            &quot;{isOnline ? "온라인 타임라인 생성" : "오프라인 타임라인 생성"}&quot; 버튼을 클릭하세요.
          </p>
        </div>
      )}

      {/* 항목 추가/수정 Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editItem?.mode === "add" ? "타임라인 항목 추가" : "타임라인 항목 수정"}
            </DialogTitle>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">항목명</label>
                <Input
                  value={editItem.label}
                  onChange={(e) => setEditItem({ ...editItem, label: e.target.value })}
                  placeholder="예: 좌장 섭외 확정"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">D-Day 오프셋</label>
                  <Input
                    type="number"
                    value={editItem.dDay}
                    onChange={(e) => setEditItem({ ...editItem, dDay: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    음수 = 이전, 양수 = 이후
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">담당자</label>
                  <Input
                    value={editItem.assignee}
                    onChange={(e) => setEditItem({ ...editItem, assignee: e.target.value })}
                    placeholder="예: 김회장"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>취소</Button>
            <Button onClick={handleSaveItem}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

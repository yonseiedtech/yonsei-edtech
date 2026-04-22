"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSeminars, useUpdateSeminar, useStaffMembers } from "@/features/seminar/useSeminar";
import { useSeminarAdminContext } from "./seminar-admin-store";
import { createTimeline, OFFLINE_TIMELINE, ONLINE_TIMELINE } from "./timeline-template";
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
  ChevronDown,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatKST } from "@/lib/seminar-utils";
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
      description: p.description ?? "",
    };
    if (p.doneAt) item.doneAt = p.doneAt;
    return item;
  });
  updateSeminar({ id: seminarId, data: { timeline: cleaned } as unknown as Partial<Seminar> });
}

type ViewMode = "timeline" | "template";


export default function TimelineTab({ seminarId: propSeminarId }: { seminarId?: string } = {}) {
  const { seminars } = useSeminars();
  const { updateSeminar } = useUpdateSeminar();
  const { staffMembers } = useStaffMembers();
  const activeSeminarId = useSeminarAdminContext((s) => s.activeSeminarId);
  const setActiveSeminarId = useSeminarAdminContext((s) => s.setActiveSeminarId);
  const selectedId = propSeminarId ?? activeSeminarId;
  const setSelectedId = (id: string | null) => setActiveSeminarId(id);
  useEffect(() => {
    if (propSeminarId && propSeminarId !== activeSeminarId) {
      setActiveSeminarId(propSeminarId);
    }
  }, [propSeminarId, activeSeminarId, setActiveSeminarId]);
  const [viewMode, setViewMode] = useState<ViewMode>("timeline");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState<{
    mode: "add" | "edit";
    id: string;
    label: string;
    dDay: string;
    assignee: string;
    description: string;
  } | null>(null);
  // 템플릿 편집
  const [templateType, setTemplateType] = useState<"offline" | "online">("offline");
  const [templateItems, setTemplateItems] = useState<Omit<TimelinePhase, "done" | "doneAt">[]>([]);
  const [editTemplateItem, setEditTemplateItem] = useState<{
    mode: "add" | "edit";
    index: number;
    label: string;
    dDay: string;
    description: string;
  } | null>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const timeline: TimelinePhase[] = seminar?.timeline ?? [];
  const isOnline = seminar?.isOnline ?? false;

  // 템플릿 로드
  function loadTemplate(type: "offline" | "online") {
    setTemplateType(type);
    const source = type === "online" ? ONLINE_TIMELINE : OFFLINE_TIMELINE;
    setTemplateItems([...source]);
  }

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

  const memoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleMemoChange = useCallback((phaseId: string, memo: string) => {
    if (!seminar) return;
    // 로컬 상태는 즉시 업데이트
    const updated = timeline.map((p) =>
      p.id === phaseId ? { ...p, memo } : p,
    );
    // Firestore 저장은 500ms 디바운스
    clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(() => {
      saveTimeline(updateSeminar, seminar.id, updated);
    }, 500);
  }, [seminar, timeline, updateSeminar]);

  function handleDelete(phaseId: string) {
    if (!seminar) return;
    const updated = timeline.filter((p) => p.id !== phaseId);
    saveTimeline(updateSeminar, seminar.id, updated);
    toast.success("항목이 삭제되었습니다.");
    setDeleteConfirmId(null);
  }

  function openAdd() {
    setEditItem({ mode: "add", id: "", label: "", dDay: "-7", assignee: "", description: "" });
  }

  function openEdit(phase: TimelinePhase) {
    setEditItem({
      mode: "edit",
      id: phase.id,
      label: phase.label,
      dDay: String(phase.dDay),
      assignee: phase.assignee ?? "",
      description: phase.description ?? "",
    });
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
        description: editItem.description || undefined,
      };
      const updated = [...timeline, newPhase];
      saveTimeline(updateSeminar, seminar.id, updated);
      toast.success("항목이 추가되었습니다.");
    } else {
      const updated = timeline.map((p) =>
        p.id === editItem.id
          ? { ...p, label: editItem.label, dDay, assignee: editItem.assignee || undefined, description: editItem.description || undefined }
          : p,
      );
      saveTimeline(updateSeminar, seminar.id, updated);
      toast.success("항목이 수정되었습니다.");
    }
    setEditItem(null);
  }

  // 템플릿 항목 저장
  function handleSaveTemplateItem() {
    if (!editTemplateItem || !editTemplateItem.label.trim()) return;
    const dDay = parseInt(editTemplateItem.dDay) || 0;

    if (editTemplateItem.mode === "add") {
      setTemplateItems([...templateItems, {
        id: `tpl_${Date.now()}`,
        label: editTemplateItem.label,
        dDay,
        memo: "",
        description: editTemplateItem.description || undefined,
      }]);
    } else {
      const updated = [...templateItems];
      updated[editTemplateItem.index] = {
        ...updated[editTemplateItem.index],
        label: editTemplateItem.label,
        dDay,
        description: editTemplateItem.description || undefined,
      };
      setTemplateItems(updated);
    }
    setEditTemplateItem(null);
  }

  // 템플릿 적용
  function applyTemplate() {
    if (!seminar) return;
    const tl = templateItems.map((item) => ({
      ...item,
      done: false,
    })) as TimelinePhase[];
    saveTimeline(updateSeminar, seminar.id, tl);
    toast.success("템플릿이 적용되었습니다.");
    setViewMode("timeline");
  }

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
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

      {/* 뷰 모드 탭 */}
      {seminar && (
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          <button
            onClick={() => setViewMode("timeline")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              viewMode === "timeline" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Check size={14} />
            운영 타임라인
          </button>
          <button
            onClick={() => {
              setViewMode("template");
              loadTemplate(isOnline ? "online" : "offline");
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              viewMode === "template" ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText size={14} />
            템플릿 관리
          </button>
        </div>
      )}

      {/* ── 운영 타임라인 뷰 ── */}
      {viewMode === "timeline" && seminar && timeline.length > 0 && (
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
                {timeline.some((p) => !p.done) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!seminar) return;
                      if (!confirm("모든 타임라인 항목을 완료 처리하시겠습니까?")) return;
                      const updated = timeline.map((p) => ({
                        ...p,
                        done: true,
                        doneAt: p.doneAt || new Date().toISOString(),
                      }));
                      saveTimeline(updateSeminar, seminar.id, updated);
                      toast.success("모든 항목이 완료 처리되었습니다.");
                    }}
                  >
                    <Check size={14} className="mr-1" />
                    일괄 완료
                  </Button>
                )}
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
                const isExpanded = expandedId === phase.id;

                return (
                  <div
                    key={phase.id}
                    className={cn(
                      "transition-colors",
                      overdue && "bg-red-50",
                    )}
                  >
                    {/* 메인 행 */}
                    <div className="flex items-center gap-3 px-4 py-3">
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

                      {/* 라벨 + 날짜 (클릭 시 확장) */}
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setExpandedId(isExpanded ? null : phase.id)}
                      >
                        <div className="flex items-center gap-1">
                          <span className={cn("text-sm", phase.done && "text-muted-foreground line-through")}>
                            {phase.label}
                          </span>
                          <span className="ml-1 text-xs text-muted-foreground">{targetDate}</span>
                          <ChevronDown
                            size={13}
                            className={cn(
                              "ml-0.5 text-muted-foreground transition-transform",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </div>
                      </button>

                      {/* 경고 아이콘 */}
                      {overdue && !phase.done && (
                        <span
                          className="shrink-0"
                          title={`기한 초과! 목표일(${targetDate})이 지났습니다.`}
                        >
                          <AlertTriangle size={16} className="text-red-500" />
                        </span>
                      )}

                      {/* 담당자 */}
                      <select
                        value={phase.assignee ?? ""}
                        onChange={(e) => {
                          const updated = timeline.map((p) =>
                            p.id === phase.id ? { ...p, assignee: e.target.value || undefined } : p,
                          );
                          saveTimeline(updateSeminar, seminar.id, updated);
                        }}
                        className="w-full shrink-0 rounded border px-1.5 py-1 text-xs sm:w-24"
                      >
                        <option value="">미정</option>
                        {staffMembers.map((s) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>

                      {/* 완료 시점 KST */}
                      {phase.done && phase.doneAt && (
                        <span className="shrink-0 text-[11px] text-green-600">
                          {formatKST(phase.doneAt)}
                        </span>
                      )}

                      {/* 수정/삭제 */}
                      <button
                        onClick={() => openEdit(phase)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="항목 수정"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(phase.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                        title="항목 삭제"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    {/* 확장 영역: 설명 + 메모 */}
                    {isExpanded && (
                      <div className="border-t border-dashed bg-muted/20 px-4 py-3 pl-[4.5rem]">
                        {/* 설명 */}
                        {phase.description && (
                          <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                            {phase.description}
                          </p>
                        )}
                        {/* 메모 */}
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-muted-foreground">메모</label>
                          <Input
                            placeholder="클릭 후 메모 작성"
                            value={phase.memo ?? ""}
                            onChange={(e) => handleMemoChange(phase.id, e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {viewMode === "timeline" && seminar && timeline.length === 0 && (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-muted-foreground">
          <p>아직 타임라인이 설정되지 않았습니다.</p>
          <p className="mt-1">
            이 세미나는 <strong>{isOnline ? "온라인(ZOOM)" : "오프라인"}</strong> 세미나입니다.
            &quot;{isOnline ? "온라인 타임라인 생성" : "오프라인 타임라인 생성"}&quot; 버튼을 클릭하세요.
          </p>
        </div>
      )}

      {/* ── 템플릿 관리 뷰 ── */}
      {viewMode === "template" && seminar && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">템플릿 편집</span>
                <div className="flex gap-1 rounded-md bg-muted/50 p-0.5">
                  <button
                    onClick={() => loadTemplate("offline")}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      templateType === "offline" ? "bg-white shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    오프라인
                  </button>
                  <button
                    onClick={() => loadTemplate("online")}
                    className={cn(
                      "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                      templateType === "online" ? "bg-white shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    온라인(ZOOM)
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditTemplateItem({ mode: "add", index: -1, label: "", dDay: "-7", description: "" })}
                >
                  <Plus size={14} className="mr-1" />
                  항목 추가
                </Button>
                <Button size="sm" onClick={applyTemplate}>
                  이 템플릿 적용
                </Button>
              </div>
            </div>
          </div>

          <div className="divide-y">
            {[...templateItems]
              .sort((a, b) => a.dDay - b.dDay)
              .map((item) => (
                <div key={item.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="w-14 shrink-0 justify-center text-xs">
                      {formatDDay(item.dDay)}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm">{item.label}</span>
                      {item.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setEditTemplateItem({
                        mode: "edit",
                        index: templateItems.findIndex((t) => t.id === item.id),
                        label: item.label,
                        dDay: String(item.dDay),
                        description: item.description ?? "",
                      })}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => setTemplateItems(templateItems.filter((t) => t.id !== item.id))}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
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
                  <select
                    value={editItem.assignee}
                    onChange={(e) => setEditItem({ ...editItem, assignee: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  >
                    <option value="">미정</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">설명</label>
                <textarea
                  value={editItem.description}
                  onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                  placeholder="이 항목에 대한 상세 설명을 작성하세요"
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>취소</Button>
            <Button onClick={handleSaveItem}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 템플릿 항목 추가/수정 Dialog */}
      <Dialog open={!!editTemplateItem} onOpenChange={(open) => !open && setEditTemplateItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTemplateItem?.mode === "add" ? "템플릿 항목 추가" : "템플릿 항목 수정"}
            </DialogTitle>
          </DialogHeader>
          {editTemplateItem && (
            <div className="grid gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">항목명</label>
                <Input
                  value={editTemplateItem.label}
                  onChange={(e) => setEditTemplateItem({ ...editTemplateItem, label: e.target.value })}
                  placeholder="예: 좌장 섭외 확정"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">D-Day 오프셋</label>
                <Input
                  type="number"
                  value={editTemplateItem.dDay}
                  onChange={(e) => setEditTemplateItem({ ...editTemplateItem, dDay: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  음수 = 이전, 양수 = 이후
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">설명</label>
                <textarea
                  value={editTemplateItem.description}
                  onChange={(e) => setEditTemplateItem({ ...editTemplateItem, description: e.target.value })}
                  placeholder="이 항목에 대한 상세 설명을 작성하세요"
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTemplateItem(null)}>취소</Button>
            <Button onClick={handleSaveTemplateItem}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>항목 삭제</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            이 항목을 삭제하시겠습니까? 삭제된 항목은 복구할 수 없습니다.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>취소</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

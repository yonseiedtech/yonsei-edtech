"use client";

import { useState } from "react";
import { useSeminars } from "@/features/seminar/useSeminar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Seminar } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 선택한 세미나로 초안을 채운다. 호출부는 status draft 유지 책임. */
  onPick: (seminar: Seminar) => void;
  description?: string;
}

/** 세미나 데이터에서 콘텐츠 초안을 자동 채우기 위한 세미나 선택 다이얼로그 (공용). */
export default function SeminarDraftPicker({ open, onOpenChange, onPick, description }: Props) {
  const { seminars, isLoading } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 최신 일자 우선 정렬
  const sorted = [...seminars].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const selected = sorted.find((s) => s.id === selectedId) ?? null;

  function handleConfirm() {
    if (!selected) return;
    onPick(selected);
    setSelectedId(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            세미나에서 초안 자동 채우기
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {description ??
            "세미나를 선택하면 제목·일시·연사·장소·소개가 자동으로 초안에 채워집니다. 채운 뒤 내용을 검토·편집하고 발행하세요."}
        </p>
        <div className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
          {isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">불러오는 중…</p>
          ) : sorted.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              세미나가 없습니다.
            </p>
          ) : (
            sorted.map((s) => {
              const isSel = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                    isSel ? "bg-primary/5" : "hover:bg-muted/30"
                  )}
                  aria-pressed={isSel}
                >
                  <div
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 rounded-full border",
                      isSel ? "border-primary bg-primary" : "border-muted-foreground/40"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.date || "일자 미정"}
                      {s.location ? ` · ${s.location}` : s.isOnline ? " · 온라인" : ""}
                    </span>
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {s.status === "completed" ? "완료" : s.status === "upcoming" ? "예정" : s.status}
                  </Badge>
                </button>
              );
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!selected}>
            <Sparkles size={14} className="mr-1" />
            초안 채우기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

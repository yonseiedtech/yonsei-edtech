"use client";

/**
 * NetworkingProgramManager — 행사 세부 프로그램 관리 (사이클 124 단계2)
 * 행사 등록 후 시간표(시간·제목·발표자·설명)를 추가·편집·삭제·정렬한다.
 * canEdit=true(운영진)면 편집 UI, 아니면 읽기 전용 타임라인.
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Clock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { networkingProgramsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import type { NetworkingEventProgram } from "@/types";
import EmptyState from "@/components/ui/empty-state";

interface Props {
  eventId: string;
  canEdit: boolean;
}

interface RowForm {
  startTime: string;
  endTime: string;
  title: string;
  presenter: string;
  description: string;
}

const EMPTY_ROW: RowForm = { startTime: "", endTime: "", title: "", presenter: "", description: "" };

export default function NetworkingProgramManager({ eventId, canEdit }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [adding, setAdding] = useState(false);
  const [row, setRow] = useState<RowForm>(EMPTY_ROW);

  const { data: programs = [], isLoading } = useQuery({
    queryKey: ["networking-programs", eventId],
    queryFn: async () => {
      const res = await networkingProgramsApi.listByEvent(eventId);
      return (res.data as NetworkingEventProgram[]).sort((a, b) => a.order - b.order);
    },
  });

  const nextOrder = useMemo(
    () => (programs.length ? Math.max(...programs.map((p) => p.order)) + 1 : 0),
    [programs],
  );

  const createM = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("로그인이 필요합니다");
      const now = new Date().toISOString();
      await networkingProgramsApi.create({
        eventId,
        order: nextOrder,
        startTime: row.startTime.trim() || undefined,
        endTime: row.endTime.trim() || undefined,
        title: row.title.trim(),
        presenter: row.presenter.trim() || undefined,
        description: row.description.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["networking-programs", eventId] });
      setRow(EMPTY_ROW);
      setAdding(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "추가 실패"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => networkingProgramsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["networking-programs", eventId] }),
    onError: () => toast.error("삭제 실패"),
  });

  // 회원 화면(읽기)에서 프로그램이 없으면 섹션 자체를 숨김
  if (!canEdit && programs.length === 0 && !isLoading) return null;

  return (
    <section className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">세부 프로그램</h3>
        {canEdit && !adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus size={14} className="mr-1" /> 순서 추가
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">불러오는 중…</p>
      ) : programs.length === 0 && !adding ? (
        <EmptyState
          compact
          title="아직 프로그램이 없습니다"
          description={canEdit ? "'순서 추가'로 시간표를 구성하세요." : undefined}
        />
      ) : (
        <ol className="space-y-1.5">
          {programs.map((p) => (
            <li
              key={p.id}
              className="flex items-start justify-between gap-2 rounded-xl border bg-background px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {(p.startTime || p.endTime) && (
                    <span className="inline-flex items-center gap-1 text-xs text-info">
                      <Clock size={12} />
                      {p.startTime}
                      {p.endTime ? `–${p.endTime}` : ""}
                    </span>
                  )}
                  {p.title}
                </p>
                <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  {p.presenter && (
                    <span className="inline-flex items-center gap-0.5">
                      <UserIcon size={11} />
                      {p.presenter}
                    </span>
                  )}
                  {p.description && <span>{p.description}</span>}
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => deleteM.mutate(p.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="삭제"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}

      {adding && canEdit && (
        <div className="mt-3 space-y-2 rounded-xl border bg-muted/30 p-3">
          <div className="flex gap-2">
            <Input
              value={row.startTime}
              onChange={(e) => setRow((r) => ({ ...r, startTime: e.target.value }))}
              placeholder="시작 18:00"
              className="w-28"
            />
            <Input
              value={row.endTime}
              onChange={(e) => setRow((r) => ({ ...r, endTime: e.target.value }))}
              placeholder="종료 18:30"
              className="w-28"
            />
          </div>
          <Input
            value={row.title}
            onChange={(e) => setRow((r) => ({ ...r, title: e.target.value }))}
            placeholder="프로그램 제목 (예: 개회·환영사)"
          />
          <Input
            value={row.presenter}
            onChange={(e) => setRow((r) => ({ ...r, presenter: e.target.value }))}
            placeholder="진행/발표자 (선택)"
          />
          <Input
            value={row.description}
            onChange={(e) => setRow((r) => ({ ...r, description: e.target.value }))}
            placeholder="설명 (선택)"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setRow(EMPTY_ROW); }}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={() => createM.mutate()}
              disabled={createM.isPending || !row.title.trim()}
            >
              추가
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

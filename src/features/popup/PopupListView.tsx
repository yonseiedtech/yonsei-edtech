"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Edit3, Trash2, Eye, EyeOff } from "lucide-react";
import { popupsApi } from "@/lib/bkend";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { POPUP_AUDIENCE_LABELS, POPUP_POSITION_LABELS, type SitePopup } from "@/types";
import { toast } from "sonner";
import PopupEditor from "./PopupEditor";

export default function PopupListView() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<SitePopup | "new" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["site_popups", "all"],
    queryFn: () => popupsApi.list(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      popupsApi.update(id, { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_popups"] });
      toast.success("상태가 변경되었습니다.");
    },
    onError: () => toast.error("변경에 실패했습니다."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => popupsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_popups"] });
      toast.success("삭제되었습니다.");
    },
    onError: () => toast.error("삭제에 실패했습니다."),
  });

  const popups = data?.data ?? [];
  const today = new Date().toISOString();

  if (editing) {
    return (
      <PopupEditor
        popup={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["site_popups"] });
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={Megaphone}
        title="사이트 팝업 공지"
        description="사이트 진입 시 노출되는 모달 / 배너 공지를 관리합니다. 회장·관리자 권한 필요."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1" /> 새 팝업
          </Button>
        }
      />

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</p>
      ) : popups.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <Megaphone size={32} className="mx-auto text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">아직 등록된 팝업이 없습니다.</p>
          <Button className="mt-4" onClick={() => setEditing("new")}>
            <Plus size={14} className="mr-1" /> 첫 팝업 만들기
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">상태</th>
                <th className="px-3 py-2 text-left font-medium">제목</th>
                <th className="px-3 py-2 text-left font-medium">노출 기간</th>
                <th className="px-3 py-2 text-left font-medium">대상 / 위치</th>
                <th className="px-3 py-2 text-center font-medium">우선순위</th>
                <th className="px-3 py-2 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {popups.map((p) => {
                const isLive = p.active && p.startsAt <= today && today <= p.endsAt;
                const isUpcoming = p.active && p.startsAt > today;
                const isExpired = p.endsAt < today;
                return (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          isLive && "bg-emerald-50 text-emerald-700",
                          isUpcoming && "bg-blue-50 text-blue-700",
                          isExpired && "bg-gray-100 text-gray-500",
                          !p.active && !isExpired && "bg-amber-50 text-amber-700",
                        )}
                      >
                        {isLive ? "노출중" : isUpcoming ? "예정" : isExpired ? "만료" : "비활성"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{p.title}</div>
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {p.content.slice(0, 60)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {p.startsAt.slice(0, 10)} ~ {p.endsAt.slice(0, 10)}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {POPUP_AUDIENCE_LABELS[p.audience]}
                      <br />
                      <span className="text-[10px]">{POPUP_POSITION_LABELS[p.position]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">{p.priority}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleMutation.mutate({ id: p.id, active: !p.active })}
                          title={p.active ? "비활성화" : "활성화"}
                          className="rounded-md p-1.5 hover:bg-muted"
                        >
                          {p.active ? <Eye size={14} /> : <EyeOff size={14} className="text-muted-foreground" />}
                        </button>
                        <button
                          onClick={() => setEditing(p)}
                          title="편집"
                          className="rounded-md p-1.5 hover:bg-muted"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`"${p.title}" 팝업을 삭제할까요?`)) deleteMutation.mutate(p.id);
                          }}
                          title="삭제"
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

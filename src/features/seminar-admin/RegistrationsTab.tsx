"use client";

import { useState } from "react";
import { useSeminars } from "@/features/seminar/useSeminar";
import { registrationsApi } from "@/lib/bkend";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SeminarRegistration } from "@/types";

function exportRegistrationsCSV(seminarTitle: string, regs: SeminarRegistration[]) {
  const header = "이름,이메일,소속,연락처,메모,신청일시";
  const rows = regs.map((r) =>
    [
      r.name,
      r.email,
      r.affiliation ?? "",
      r.phone ?? "",
      r.memo ?? "",
      r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "",
    ].join(","),
  );
  const bom = "\uFEFF";
  const csv = bom + [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `신청자_${seminarTitle.replace(/[^가-힣a-zA-Z0-9]/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RegistrationsTab() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seminar = seminars.find((s) => s.id === selectedId);

  const { data, refetch } = useQuery({
    queryKey: ["registrations", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await registrationsApi.list(selectedId);
      return res.data as unknown as SeminarRegistration[];
    },
    enabled: !!selectedId,
    retry: false,
  });

  const registrations = data ?? [];

  async function handleDelete(id: string) {
    try {
      await registrationsApi.delete(id);
      toast.success("신청이 삭제되었습니다.");
      refetch();
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  }

  return (
    <div className="space-y-6">
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
                {s.title} ({s.date})
              </option>
            ))}
          </select>
        </div>
        {seminar && registrations.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRegistrationsCSV(seminar.title, registrations)}
          >
            <Download size={14} className="mr-1" />
            CSV 내보내기
          </Button>
        )}
      </div>

      {selectedId && (
        <div className="rounded-xl border bg-white">
          <div className="border-b px-4 py-3">
            <span className="text-sm font-medium">
              자체 신청 현황: {registrations.length}명
            </span>
          </div>

          {registrations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              자체 신청 내역이 없습니다.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">이름</th>
                    <th className="px-3 py-2 text-left font-medium">이메일</th>
                    <th className="px-3 py-2 text-left font-medium">소속</th>
                    <th className="px-3 py-2 text-left font-medium">연락처</th>
                    <th className="px-3 py-2 text-left font-medium">메모</th>
                    <th className="px-3 py-2 text-left font-medium">신청일</th>
                    <th className="px-3 py-2 text-left font-medium">삭제</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {registrations.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 font-medium">
                        {r.name}
                        {r.userId && (
                          <Badge variant="secondary" className="ml-1 text-xs">회원</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.affiliation ?? "-"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.phone ?? "-"}</td>
                      <td className="max-w-32 truncate px-3 py-2 text-xs text-muted-foreground" title={r.memo}>
                        {r.memo ?? "-"}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString("ko-KR") : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDelete(r.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

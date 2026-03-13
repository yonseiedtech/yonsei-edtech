"use client";

import { useSeminarStore } from "@/features/seminar/seminar-store";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { Seminar } from "@/types";
import { toast } from "sonner";

const STATUS_LABELS: Record<Seminar["status"], string> = {
  upcoming: "예정",
  completed: "완료",
  cancelled: "취소",
};

const STATUS_COLORS: Record<Seminar["status"], string> = {
  upcoming: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
};

export default function AdminSeminarTab() {
  const { seminars, updateSeminar } = useSeminarStore();

  function handleStatusChange(id: string, status: Seminar["status"]) {
    updateSeminar(id, { status });
    toast.success(`세미나 상태가 "${STATUS_LABELS[status]}"(으)로 변경되었습니다.`);
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-left font-medium">제목</th>
            <th className="px-4 py-3 text-left font-medium">발표자</th>
            <th className="px-4 py-3 text-left font-medium">일시</th>
            <th className="px-4 py-3 text-left font-medium">참석자</th>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-left font-medium">상태 변경</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {seminars.map((s) => (
            <tr key={s.id}>
              <td className="max-w-[200px] truncate px-4 py-3 font-medium">{s.title}</td>
              <td className="px-4 py-3 text-muted-foreground">{s.speaker}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(s.date)} {s.time}
              </td>
              <td className="px-4 py-3">
                {s.attendeeIds.length}
                {s.maxAttendees ? `/${s.maxAttendees}` : ""}명
              </td>
              <td className="px-4 py-3">
                <Badge variant="secondary" className={STATUS_COLORS[s.status]}>
                  {STATUS_LABELS[s.status]}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <select
                  value={s.status}
                  onChange={(e) =>
                    handleStatusChange(s.id, e.target.value as Seminar["status"])
                  }
                  className="rounded-md border px-2 py-1 text-sm"
                >
                  <option value="upcoming">예정</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

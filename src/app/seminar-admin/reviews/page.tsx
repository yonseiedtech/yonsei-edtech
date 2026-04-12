"use client";

import { useState } from "react";
import { useSeminars } from "@/features/seminar/useSeminar";
import ReviewManagement from "@/features/seminar-admin/ReviewManagement";

export default function SeminarAdminReviewsPage() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string>("");
  const seminar = seminars.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium">세미나 선택</label>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
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

      {seminar ? (
        <ReviewManagement seminar={seminar} />
      ) : (
        <div className="rounded-xl border bg-white p-12 text-center text-muted-foreground">
          세미나를 선택하면 후기를 관리할 수 있습니다.
        </div>
      )}
    </div>
  );
}

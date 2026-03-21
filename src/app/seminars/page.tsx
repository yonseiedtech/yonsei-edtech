"use client";

import { useState } from "react";
import Link from "next/link";
import SeminarList from "@/features/seminar/SeminarList";
import SeminarStatusTabs from "@/features/seminar/SeminarStatusTabs";
import { useSeminars } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { isStaffOrAbove } from "@/lib/permissions";
import { getComputedStatus } from "@/lib/seminar-utils";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import type { SeminarStatus } from "@/types";

type StatusFilter = SeminarStatus | "all";

export default function SeminarsPage() {
  const [status, setStatus] = useState<StatusFilter>("all");
  const { user } = useAuthStore();
  const { seminars: allSeminars } = useSeminars();

  const filtered =
    status === "all"
      ? allSeminars
      : allSeminars.filter((s) => getComputedStatus(s) === status);

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="py-16">
      <div className="mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar size={28} className="text-primary" />
            <h1 className="text-3xl font-bold">세미나</h1>
          </div>
          {isStaffOrAbove(user) && (
            <Link href="/seminars/create">
              <Button size="sm">
                <Plus size={16} className="mr-1" />
                세미나 등록
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-6">
          <SeminarStatusTabs active={status} onChange={setStatus} />
        </div>

        <div className="mt-6">
          <SeminarList seminars={sorted} />
        </div>
      </div>
    </div>
  );
}

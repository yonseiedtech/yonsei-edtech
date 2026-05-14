"use client";

import Link from "next/link";
import { useState } from "react";
import { useLabs } from "@/features/labs/useLabs";
import { useAuthStore } from "@/features/auth/auth-store";
import { canManageLabs } from "@/lib/permissions";
import { FlaskConical, Plus, ExternalLink, MessageSquare } from "lucide-react";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import { cn } from "@/lib/utils";
import type { LabStatus, LabKind } from "@/types";

const STATUS_LABEL: Record<LabStatus, string> = {
  draft: "준비중",
  testing: "테스트",
  feedback: "피드백",
  approved: "승인됨",
  archived: "보관",
};

const STATUS_COLOR: Record<LabStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  testing: "bg-amber-100 text-amber-700",
  feedback: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  archived: "bg-zinc-100 text-zinc-500",
};

export default function LabsPage() {
  const { labs, isLoading } = useLabs();
  const { user } = useAuthStore();
  const canManage = canManageLabs(user);
  const [kindFilter, setKindFilter] = useState<"all" | LabKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | LabStatus>("all");

  const filtered = labs.filter(
    (l) =>
      (kindFilter === "all" || l.kind === kindFilter) &&
      (statusFilter === "all" || l.status === statusFilter),
  );

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={FlaskConical}
        title="실험실"
        description="사전 테스트 중인 내부 프로토타입과 학회원 서비스를 공유하는 공간입니다."
        actions={canManage ? (
          <Link
            href="/console/labs/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus size={15} /> 새 실험
          </Link>
        ) : undefined}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { k: "all", label: "전체" },
          { k: "external", label: "외부 링크" },
          { k: "internal", label: "내부 프로토타입" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setKindFilter(f.k as typeof kindFilter)}
            className={cn(
              "rounded-full border px-3 py-1",
              kindFilter === f.k ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="mx-1 self-center text-muted-foreground/40">|</span>
        {(["all", "testing", "feedback", "approved", "archived"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1",
              statusFilter === s ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
            )}
          >
            {s === "all" ? "모든 상태" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          등록된 실험이 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => {
            const reactionTop = Object.entries(l.reactionSummary ?? {})
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);
            return (
              <Link
                key={l.id}
                href={`/console/labs/${l.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md"
              >
                {l.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.thumbnailUrl} alt={l.title} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-primary/5 via-sky-50 to-indigo-50 text-primary/50">
                    <FlaskConical size={42} />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", STATUS_COLOR[l.status])}>
                      {STATUS_LABEL[l.status]}
                    </span>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {l.kind === "external" ? "외부" : "내부"}
                    </span>
                  </div>
                  <h3 className="line-clamp-1 text-base font-semibold group-hover:text-primary">{l.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{l.description}</p>
                  <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                    <span className="truncate">by {l.ownerName}</span>
                    <div className="flex items-center gap-3">
                      {reactionTop.map(([e, n]) => (
                        <span key={e} className="inline-flex items-center gap-0.5">
                          {e} {n}
                        </span>
                      ))}
                      {(l.commentCount ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <MessageSquare size={11} /> {l.commentCount}
                        </span>
                      )}
                      {l.kind === "external" && l.externalUrl && <ExternalLink size={11} />}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { externalActivitiesApi } from "@/lib/bkend";
import { EXTERNAL_ACTIVITY_TYPE_LABELS } from "@/types";
import type { ExternalActivity, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import PortfolioVerifyButtons from "./PortfolioVerifyButtons";

interface Props {
  owner: User;
  /** 비공개 모드 — 검증된 항목만 표시 (외부 시청자용 옵션) */
  verifiedOnly?: boolean;
}

export default function ProfileExternalActivities({ owner, verifiedOnly = false }: Props) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["profile-external-activities", owner.id],
    queryFn: async () => {
      const res = await externalActivitiesApi.listByUser(owner.id);
      return res.data as unknown as ExternalActivity[];
    },
    enabled: !!owner.id,
  });

  if (isLoading) return null;
  const visible = verifiedOnly ? items.filter((x) => x.verified) : items;
  if (visible.length === 0) return null;

  const sorted = [...visible].sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  );

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Globe size={14} className="text-primary" />
        대외활동 <span className="text-xs font-normal text-muted-foreground">({visible.length})</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {sorted.map((x) => (
          <li key={x.id} className="relative rounded-lg border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {x.url ? (
                <a
                  href={x.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary hover:underline"
                >
                  {x.title}
                  <ExternalLink size={10} />
                </a>
              ) : (
                <p className="text-sm font-medium">{x.title}</p>
              )}
              {x.verified ? (
                <Badge variant="default" className="gap-0.5 text-[10px]">
                  <CheckCircle2 size={9} /> 검증됨
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-0.5 text-[10px]">
                  <Clock size={9} /> 검증 대기
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {EXTERNAL_ACTIVITY_TYPE_LABELS[x.type]}
              </Badge>
              <PortfolioVerifyButtons
                kind="external_activities"
                itemId={x.id}
                ownerId={owner.id}
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {x.organization && `${x.organization} · `}
              {x.date}
              {x.role && ` · ${x.role}`}
              {x.location && ` · ${x.location}`}
            </p>
            {x.description && (
              <p className="mt-1.5 text-xs text-foreground/80">{x.description}</p>
            )}
            <p className="mt-1.5 text-[10px] italic text-muted-foreground/80">
              {x.affiliation}
            </p>
            {!x.verified && x.rejectionReason && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] text-rose-700">
                <AlertCircle size={10} /> 반려 사유: {x.rejectionReason}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

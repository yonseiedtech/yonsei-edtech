"use client";

import { useQuery } from "@tanstack/react-query";
import { awardsApi } from "@/lib/bkend";
import { AWARD_SCOPE_LABELS } from "@/types";
import type { Award, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Award as AwardIcon, CheckCircle2, Clock } from "lucide-react";

interface Props {
  owner: User;
}

export default function ProfileAwards({ owner }: Props) {
  const { data: awards = [], isLoading } = useQuery({
    queryKey: ["profile-awards", owner.id],
    queryFn: async () => {
      const res = await awardsApi.listByUser(owner.id);
      return res.data as unknown as Award[];
    },
    enabled: !!owner.id,
  });

  if (isLoading) return null;
  if (awards.length === 0) return null;

  const sorted = [...awards].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));

  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <AwardIcon size={14} className="text-primary" />
        수상 <span className="text-xs font-normal text-muted-foreground">({awards.length})</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {sorted.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border bg-muted/10 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">{a.title}</p>
              {a.verified ? (
                <Badge variant="default" className="gap-0.5 text-[10px]">
                  <CheckCircle2 size={9} /> 검증됨
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-0.5 text-[10px]">
                  <Clock size={9} /> 검증 대기
                </Badge>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {AWARD_SCOPE_LABELS[a.scope]}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {a.organization} · {a.date}
            </p>
            {a.description && (
              <p className="mt-1.5 text-xs text-foreground/80">{a.description}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

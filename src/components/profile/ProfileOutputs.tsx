"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { activityParticipationsApi } from "@/lib/bkend";
import { ACTIVITY_OUTPUT_TYPE_LABELS } from "@/types";
import type { ActivityOutput, ActivityParticipation, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Layers, ExternalLink } from "lucide-react";

interface Props {
  owner: User;
}

interface FlatOutput extends ActivityOutput {
  participationId: string;
}

export default function ProfileOutputs({ owner }: Props) {
  const { data: participations = [], isLoading } = useQuery({
    queryKey: ["profile-participations-outputs", owner.id],
    queryFn: async () => {
      const res = await activityParticipationsApi.listByUser(owner.id);
      return res.data as unknown as ActivityParticipation[];
    },
    enabled: !!owner.id,
  });

  const outputs = useMemo<FlatOutput[]>(() => {
    const flat: FlatOutput[] = [];
    participations.forEach((p) => {
      (p.outputs ?? []).forEach((o) => {
        flat.push({ ...o, participationId: p.id });
      });
    });
    return flat.sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  }, [participations]);

  if (isLoading) return null;
  if (outputs.length === 0) return null;

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Layers size={14} className="text-primary" />
        산출물 <span className="text-xs font-normal text-muted-foreground">({outputs.length})</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {outputs.map((o) => (
          <li key={o.id} className="rounded-lg border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {o.url ? (
                <a
                  href={o.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary hover:underline"
                >
                  {o.title}
                  <ExternalLink size={10} />
                </a>
              ) : (
                <p className="text-sm font-medium">{o.title}</p>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {ACTIVITY_OUTPUT_TYPE_LABELS[o.type]}
              </Badge>
            </div>
            {o.description && (
              <p className="mt-1 text-xs text-foreground/80">{o.description}</p>
            )}
            {o.createdAt && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {o.createdAt.slice(0, 10)}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

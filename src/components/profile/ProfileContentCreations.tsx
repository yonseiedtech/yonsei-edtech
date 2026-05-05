"use client";

import { useQuery } from "@tanstack/react-query";
import { contentCreationsApi } from "@/lib/bkend";
import { CONTENT_CREATION_TYPE_LABELS } from "@/types";
import type { ContentCreation, User } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ExternalLink } from "lucide-react";

interface Props {
  owner: User;
}

export default function ProfileContentCreations({ owner }: Props) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["profile-content-creations", owner.id],
    queryFn: async () => {
      const res = await contentCreationsApi.listByUser(owner.id);
      return res.data as unknown as ContentCreation[];
    },
    enabled: !!owner.id,
  });

  if (isLoading) return null;
  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) =>
    (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""),
  );

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles size={14} className="text-primary" />
        콘텐츠 제작 <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </h2>
      <ul className="mt-3 space-y-2">
        {sorted.map((c) => (
          <li key={c.id} className="rounded-lg border bg-muted/10 p-3">
            <div className="flex flex-wrap items-center gap-2">
              {c.url ? (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:text-primary hover:underline"
                >
                  {c.title}
                  <ExternalLink size={10} />
                </a>
              ) : (
                <p className="text-sm font-medium">{c.title}</p>
              )}
              <Badge variant="secondary" className="text-[10px]">
                {CONTENT_CREATION_TYPE_LABELS[c.type]}
              </Badge>
              {c.autoCollected && (
                <Badge variant="outline" className="text-[10px]">
                  자동수집
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.publishedAt}</p>
            {c.description && (
              <p className="mt-1.5 text-xs text-foreground/80">{c.description}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

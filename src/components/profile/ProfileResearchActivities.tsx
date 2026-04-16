"use client";

import { useState } from "react";
import { ExternalLink, BookMarked } from "lucide-react";
import type { RecentPaper } from "@/types";

interface Props {
  papers?: RecentPaper[];
}

const PAGE_SIZE = 30;

export default function ProfileResearchActivities({ papers }: Props) {
  const [visible, setVisible] = useState<number>(PAGE_SIZE);
  const list = papers ?? [];
  const total = list.length;
  const sliced = list.slice(0, visible);
  const hasMore = total > visible;

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">연구활동 · 최근 논문</h2>
        <span className="text-[11px] text-muted-foreground">총 {total}건</span>
      </div>

      {total === 0 ? (
        <p className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
          <BookMarked size={14} />
          등록된 논문이 없습니다.
        </p>
      ) : (
        <ol className="space-y-3">
          {sliced.map((p, i) => (
            <li key={`${p.title}-${i}`} className="border-b pb-3 last:border-0 last:pb-0">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}.</span>
                <p className="flex-1 text-sm font-semibold leading-snug">{p.title}</p>
              </div>
              <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
                {[p.authors, p.year].filter(Boolean).join(" · ")}
              </p>
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 pl-6 text-[11px] text-primary hover:underline"
                >
                  <ExternalLink size={11} />
                  원문 보기
                </a>
              )}
            </li>
          ))}
        </ol>
      )}

      {hasMore && (
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-lg border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            더 보기 ({total - visible}건 남음)
          </button>
        </div>
      )}
    </section>
  );
}

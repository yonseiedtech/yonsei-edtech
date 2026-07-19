"use client";

/**
 * SearchMissSection — "많이 찾았지만 없는 것" Top 20 (M6, 2026-07-19)
 *
 * search_misses 컬렉션을 count 내림차순으로 최대 20건 표시.
 * 아카이브 콘텐츠 갭 신호로 운영진이 시드 우선순위를 정하는 데 활용한다.
 * read 권한: staff 이상 (firestore.rules).
 */

import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, orderBy, limit, query as buildQuery } from "firebase/firestore";
import { Search } from "lucide-react";
import { db } from "@/lib/firebase";

interface SearchMissRow {
  id: string;
  query: string;
  count: number;
  lastAt: string;
}

async function fetchSearchMisses(): Promise<SearchMissRow[]> {
  const q = buildQuery(
    collection(db, "search_misses"),
    orderBy("count", "desc"),
    limit(20),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const ts = data.lastAt as { toDate?: () => Date } | null | undefined;
    const lastAt = ts?.toDate?.()?.toLocaleDateString("ko-KR") ?? "—";
    return {
      id: d.id,
      query: (data.query as string) ?? d.id,
      count: (data.count as number) ?? 0,
      lastAt,
    };
  });
}

export default function SearchMissSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search-misses-top20"],
    staleTime: 5 * 60_000,
    queryFn: fetchSearchMisses,
  });

  if (isLoading) {
    return <div className="h-32 animate-pulse rounded-2xl border bg-muted/40" />;
  }

  if (isError) {
    return null; // 권한 부족 또는 오류 시 조용히 숨김
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <Search size={15} className="text-primary" />
        많이 찾았지만 없는 것 (Top 20)
        <span className="text-[11px] font-normal text-muted-foreground">
          — 아카이브 콘텐츠 갭 신호
        </span>
      </h2>

      {!data?.length ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          아직 기록된 검색 실패 질의가 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1.5 pr-4 text-left font-medium">#</th>
                <th className="py-1.5 pr-4 text-left font-medium">질의</th>
                <th className="py-1.5 pr-4 text-right font-medium">횟수</th>
                <th className="py-1.5 text-right font-medium">최근</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-1.5 pr-4 tabular-nums text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 pr-4 font-medium">{row.query}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{row.count}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                    {row.lastAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

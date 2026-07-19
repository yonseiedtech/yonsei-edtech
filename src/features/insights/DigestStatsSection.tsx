"use client";

/**
 * DigestStatsSection — 다이제스트 성과 (M7, 2026-07-20)
 *
 * 운영 KPI 탭 내 소섹션. 최근 4주 열람·클릭 수·인기 링크 Top 5를 표시한다.
 * digest_link_clicks · digest_opens 컬렉션 read (staff 이상 — firestore.rules).
 *
 * SearchMissSection 패턴을 따른다: useQuery + isLoading skeleton + isError silent null.
 */

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  orderBy,
  limit,
  query as buildQuery,
} from "firebase/firestore";
import { Mail } from "lucide-react";
import { db } from "@/lib/firebase";

// ── 최근 N주 weekKey 목록 (KST 기준 가장 최근 월요일 소급) ──

function getRecentWeekKeys(n: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - daysToMonday);
  for (let i = 0; i < n; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    // YYYY-MM-DD (en-CA locale = ISO 날짜 형식)
    keys.push(d.toLocaleDateString("en-CA"));
  }
  return keys;
}

// ── 타입 ──

interface ClickRow {
  id: string;
  path: string;
  campaign: string;
  count: number;
}

interface OpenRow {
  weekKey: string;
  count: number;
}

interface DigestStats {
  opens: OpenRow[];
  clicksByWeek: Record<string, number>; // weekKey → 주차 합산 클릭 수
  topLinks: { path: string; totalCount: number }[];
}

// ── Firestore 조회 ──

async function fetchDigestStats(): Promise<DigestStats> {
  const weekKeys = getRecentWeekKeys(4);
  const recentKeySet = new Set(weekKeys);

  // 클릭: count 내림차순 Top 100 (4주치)
  const clicksSnap = await getDocs(
    buildQuery(
      collection(db, "digest_link_clicks"),
      orderBy("count", "desc"),
      limit(100),
    ),
  );
  const allClicks: ClickRow[] = clicksSnap.docs.map((d) => ({
    id: d.id,
    path: (d.data().path as string) ?? d.id,
    campaign: (d.data().campaign as string) ?? "",
    count: (d.data().count as number) ?? 0,
  }));

  // 주차 합산 클릭
  const clicksByWeek: Record<string, number> = {};
  const pathTotal = new Map<string, number>();
  for (const row of allClicks) {
    if (!recentKeySet.has(row.campaign)) continue;
    clicksByWeek[row.campaign] = (clicksByWeek[row.campaign] ?? 0) + row.count;
    pathTotal.set(row.path, (pathTotal.get(row.path) ?? 0) + row.count);
  }

  // Top 5 링크
  const topLinks = [...pathTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, totalCount]) => ({ path, totalCount }));

  // 열람: digest_opens/{weekKey} — 전체 컬렉션 조회 후 필터
  const opensSnap = await getDocs(collection(db, "digest_opens"));
  const opens: OpenRow[] = opensSnap.docs
    .map((d) => ({
      weekKey: (d.data().weekKey as string) ?? d.id,
      count: (d.data().count as number) ?? 0,
    }))
    .filter((r) => recentKeySet.has(r.weekKey));

  return { opens, clicksByWeek, topLinks };
}

// ── 컴포넌트 ──

export default function DigestStatsSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["digest-stats-4w"],
    staleTime: 5 * 60_000,
    queryFn: fetchDigestStats,
  });

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-2xl border bg-muted/40" />;
  }
  if (isError) {
    // 권한 부족 또는 오류 시 조용히 숨김
    return null;
  }

  const weekKeys = getRecentWeekKeys(4);

  const hasAnyData =
    (data?.topLinks?.length ?? 0) > 0 ||
    (data?.opens?.length ?? 0) > 0;

  return (
    <section className="rounded-2xl border bg-card p-5 space-y-5">
      <h2 className="flex items-center gap-2 text-sm font-bold">
        <Mail size={15} className="text-primary" />
        다이제스트 성과 (최근 4주)
        <span className="text-[11px] font-normal text-muted-foreground">
          — 열람 픽셀·CTA 클릭 집계 (이메일 클라이언트 차단 시 열람 미기록)
        </span>
      </h2>

      {!hasAnyData ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          아직 기록된 다이제스트 추적 데이터가 없습니다.
        </p>
      ) : (
        <>
          {/* 열람 수 (픽셀 기반) */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              열람 수 (픽셀 기반 — 참고 지표)
            </p>
            <div className="flex flex-wrap gap-3">
              {weekKeys.map((wk) => {
                const open = data?.opens.find((o) => o.weekKey === wk);
                return (
                  <div
                    key={wk}
                    className="min-w-[96px] rounded-xl border px-3 py-2 text-center"
                  >
                    <p className="text-[11px] text-muted-foreground">{wk}</p>
                    <p className="text-lg font-bold tabular-nums">
                      {open?.count ?? 0}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 클릭 수 */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              클릭 수 (주차별 합산)
            </p>
            <div className="flex flex-wrap gap-3">
              {weekKeys.map((wk) => (
                <div
                  key={wk}
                  className="min-w-[96px] rounded-xl border px-3 py-2 text-center"
                >
                  <p className="text-[11px] text-muted-foreground">{wk}</p>
                  <p className="text-lg font-bold tabular-nums">
                    {data?.clicksByWeek[wk] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 인기 링크 Top 5 */}
          {(data?.topLinks?.length ?? 0) > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">
                인기 링크 Top 5 (4주 합산)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-1.5 pr-4 text-left font-medium">#</th>
                      <th className="py-1.5 pr-4 text-left font-medium">경로</th>
                      <th className="py-1.5 text-right font-medium">클릭</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.topLinks.map((row, i) => (
                      <tr key={row.path} className="border-b last:border-0">
                        <td className="py-1.5 pr-4 tabular-nums text-muted-foreground">
                          {i + 1}
                        </td>
                        <td className="py-1.5 pr-4 font-medium">{row.path}</td>
                        <td className="py-1.5 text-right tabular-nums">
                          {row.totalCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

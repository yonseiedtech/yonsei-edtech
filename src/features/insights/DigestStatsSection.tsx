"use client";

/**
 * DigestStatsSection — 다이제스트 성과 + 발송 타이밍 환류 (M5·v8, 2026-07-20)
 *
 * v7 M3 관찰 단계에서 "인사이트 → 권장안" 소비 완결:
 * - 주차별 열람/클릭/CTR/열람률 추이 + 트렌드 화살표
 * - 발송 후 평균 반응 시간 (lastAt 기반 근사치) + 저성과 주차 플래그
 * - 발송 타이밍 권장안 텍스트 (운영진 읽기 전용 — vercel.json 수동 변경)
 * 신규 컬렉션 없음, 기존 digest_opens·digest_link_clicks·email_logs 소비만.
 *
 * SearchMissSection 패턴을 따른다: useQuery + isLoading skeleton + isError silent null.
 */

import { useQuery } from "@tanstack/react-query";
import {
  collection,
  getDocs,
  orderBy,
  limit,
  where,
  query as buildQuery,
} from "firebase/firestore";
import { Clock, Info, Mail, Minus, TrendingDown, TrendingUp } from "lucide-react";
import EmptyState from "@/components/ui/empty-state";
import { db } from "@/lib/firebase";

// ── 최근 N주 weekKey 목록 (KST 기준 가장 최근 월요일 소급) ──

function getRecentWeekKeys(n: number): string[] {
  // B6: weekKey 를 KST 고정으로 생성 — 저장 키가 서버 todayYmdKst()(KST 월요일)이므로
  //     브라우저 로컬(getDay·en-CA)로 계산하면 비-KST 로케일 관리자에서 월요일이 어긋나
  //     4주 키가 저장 키와 불일치(표 전부 0/"—"). KST 벽시계로 통일한다.
  const kstNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  const dayOfWeek = kstNow.getDay(); // 0=Sun (KST 기준)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(kstNow);
  monday.setDate(monday.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() - i * 7);
    keys.push(fmt(d));
  }
  return keys;
}

// ── 발송 후 경과 시간(h) 계산 ──
// 다이제스트는 매주 월요일 09:00 KST = Monday T00:00:00Z (UTC)

function hoursAfterSend(weekKey: string, lastAt: string | null): number | null {
  if (!lastAt) return null;
  const sendUtc = new Date(weekKey + "T00:00:00Z").getTime(); // 월요일 09:00 KST
  const eventUtc = new Date(lastAt).getTime();
  if (isNaN(sendUtc) || isNaN(eventUtc)) return null;
  const h = (eventUtc - sendUtc) / 3_600_000;
  return h >= 0 && h < 168 ? h : null; // 0~167h (1주) 범위만 유효
}

// ── 타입 ──

interface OpenRow {
  weekKey: string;
  count: number;
  lastAt: string | null;
}

interface DigestStats {
  opens: OpenRow[];
  clicksByWeek: Record<string, number>;
  topLinks: { path: string; totalCount: number }[];
  recipientsByWeek: Record<string, number>;
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
  const clicksByWeek: Record<string, number> = {};
  const pathTotal = new Map<string, number>();
  for (const d of clicksSnap.docs) {
    const data = d.data();
    const campaign = (data.campaign as string) ?? "";
    const path = (data.path as string) ?? d.id;
    const count = (data.count as number) ?? 0;
    if (!recentKeySet.has(campaign)) continue;
    clicksByWeek[campaign] = (clicksByWeek[campaign] ?? 0) + count;
    pathTotal.set(path, (pathTotal.get(path) ?? 0) + count);
  }

  // Top 5 링크
  const topLinks = [...pathTotal.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([path, totalCount]) => ({ path, totalCount }));

  // 열람: digest_opens 전체 조회 후 4주 필터 + lastAt 포함
  const opensSnap = await getDocs(collection(db, "digest_opens"));
  const opens: OpenRow[] = opensSnap.docs
    .map((d) => ({
      weekKey: (d.data().weekKey as string) ?? d.id,
      count: (d.data().count as number) ?? 0,
      lastAt: (d.data().lastAt as string | undefined) ?? null,
    }))
    .filter((r) => recentKeySet.has(r.weekKey));

  // 수신자 수 (email_logs — staff 권한 필요, 실패 시 빈 객체로 graceful)
  // targetId in weekKeys 로 단일 필드 쿼리 → 복합 인덱스 불필요
  const recipientsByWeek: Record<string, number> = {};
  try {
    const logsSnap = await getDocs(
      buildQuery(
        collection(db, "email_logs"),
        where("targetId", "in", weekKeys),
        limit(20), // 4주 × (lock + actual) = 최대 8건
      ),
    );
    for (const d of logsSnap.docs) {
      const data = d.data();
      if ((data.type as string) !== "weekly_digest") continue; // lock 문서 제외
      const targetId = data.targetId as string;
      if (recentKeySet.has(targetId) && !(targetId in recipientsByWeek)) {
        recipientsByWeek[targetId] = (data.recipientCount as number) ?? 0;
      }
    }
  } catch {
    // 권한 부족 등 — 수신자 수 없이 표시 (열람률 % 컬럼만 "—"로 표시)
  }

  return { opens, clicksByWeek, topLinks, recipientsByWeek };
}

// ── 타이밍 인사이트 계산 ──

interface TimingInsight {
  avgHoursAfterSend: number | null; // 평균 반응(마지막 열람) 시간 (null = 데이터 없음)
  weeksWithData: number; // 열람 1건+ 주차 수
  lowOpenWeeks: string[]; // 열람 0인 주차 목록
  lowClickWeeks: string[]; // 열람 있지만 클릭 0인 주차 목록
}

function computeTimingInsight(
  opens: OpenRow[],
  clicksByWeek: Record<string, number>,
  weekKeys: string[],
): TimingInsight {
  const hoursArr: number[] = [];
  for (const o of opens) {
    if (o.count > 0) {
      const h = hoursAfterSend(o.weekKey, o.lastAt);
      if (h !== null) hoursArr.push(h);
    }
  }

  const avgHoursAfterSend =
    hoursArr.length > 0
      ? Math.round(hoursArr.reduce((s, h) => s + h, 0) / hoursArr.length)
      : null;

  const weeksWithData = opens.filter((o) => o.count > 0).length;
  const opensByWk = new Map(opens.map((o) => [o.weekKey, o.count]));
  const lowOpenWeeks = weekKeys.filter((wk) => (opensByWk.get(wk) ?? 0) === 0);
  const lowClickWeeks = weekKeys.filter(
    (wk) => (opensByWk.get(wk) ?? 0) > 0 && (clicksByWeek[wk] ?? 0) === 0,
  );
  return { avgHoursAfterSend, weeksWithData, lowOpenWeeks, lowClickWeeks };
}

// ── 타이밍 권장안 생성 ──

function buildRecommendation(insight: TimingInsight): string {
  if (insight.weeksWithData < 2) {
    return "발송 이력이 아직 부족합니다. 2주 이상 데이터 축적 후 권장안이 생성됩니다.";
  }
  const h = insight.avgHoursAfterSend;
  if (h === null) return "열람 타이밍 데이터를 집계 중입니다.";
  if (h <= 4)
    return `발송 후 평균 ${h}시간 이내 마지막 열람 — 월요일 오전 발송 타이밍이 적절합니다. 현 일정(월 09:00 KST)을 유지하세요.`;
  if (h <= 24)
    return `발송 후 평균 ${h}시간째 마지막 열람 — 당일 내 반응이 발생하고 있습니다. 현 발송 시각(월 09:00 KST)을 유지하거나 더 이른 시간(08:00)을 시험해볼 수 있습니다.`;
  if (h <= 72)
    return `발송 후 평균 ${h}시간(약 ${Math.round(h / 24)}일)째 마지막 열람 — 수·목 반응이 남아 있습니다. 화요일 발송으로 조정하면 주간 활동 피크와 더 겹칠 수 있습니다.`;
  return `발송 후 평균 ${h}시간째 마지막 열람 — 반응이 며칠에 걸쳐 분산됩니다. 발송 시각 유지 후 제목·CTA 문구 개선을 먼저 시도하세요.`;
}

// ── 트렌드 아이콘 ──

function TrendIcon({ prev, curr }: { prev: number; curr: number }) {
  if (curr > prev)
    return (
      <TrendingUp
        size={11}
        className="inline text-success"
      />
    );
  if (curr < prev)
    return <TrendingDown size={11} className="inline text-destructive" />;
  return <Minus size={11} className="inline text-muted-foreground" />;
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
    (data?.topLinks?.length ?? 0) > 0 || (data?.opens?.length ?? 0) > 0;

  const insight = data
    ? computeTimingInsight(data.opens, data.clicksByWeek, weekKeys)
    : null;
  const recommendation = insight ? buildRecommendation(insight) : null;

  const hasRecipientData =
    data && Object.keys(data.recipientsByWeek).length > 0;

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
        <EmptyState
          compact
          icon={Mail}
          title="아직 기록된 다이제스트 추적 데이터가 없습니다."
        />
      ) : (
        <>
          {/* 주차별 열람·클릭 추이 테이블 (CTR + 열람률 포함) */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">
              주차별 열람·클릭 추이
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-1.5 pr-4 text-left font-medium">주차</th>
                    <th className="py-1.5 pr-3 text-right font-medium">열람</th>
                    <th className="py-1.5 pr-3 text-right font-medium">클릭</th>
                    <th className="py-1.5 pr-3 text-right font-medium">CTR</th>
                    {hasRecipientData && (
                      <th className="py-1.5 text-right font-medium">열람률</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {weekKeys.map((wk, idx) => {
                    const opens =
                      data?.opens.find((o) => o.weekKey === wk)?.count ?? 0;
                    const clicks = data?.clicksByWeek[wk] ?? 0;
                    const recipients = data?.recipientsByWeek[wk] ?? 0;
                    const ctr =
                      opens > 0
                        ? `${((clicks / opens) * 100).toFixed(0)}%`
                        : "—";
                    const openRate =
                      recipients > 0
                        ? `${((opens / recipients) * 100).toFixed(0)}%`
                        : "—";

                    const prevWk = weekKeys[idx + 1];
                    const prevOpens = prevWk
                      ? (data?.opens.find((o) => o.weekKey === prevWk)?.count ??
                        0)
                      : null;
                    const prevClicks = prevWk
                      ? (data?.clicksByWeek[prevWk] ?? 0)
                      : null;

                    return (
                      <tr key={wk} className="border-b last:border-0">
                        <td className="py-1.5 pr-4 tabular-nums text-muted-foreground">
                          {wk}
                          {idx === 0 && (
                            <span className="ml-1 rounded bg-primary/10 px-1 text-[10px] text-primary">
                              최근
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          <span className="font-bold">{opens}</span>
                          {prevOpens !== null && (
                            <span className="ml-0.5 align-middle">
                              <TrendIcon prev={prevOpens} curr={opens} />
                            </span>
                          )}
                          {opens === 0 && (
                            <span className="ml-1 rounded bg-destructive/10 px-1 text-[10px] text-destructive">
                              미열람
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums">
                          <span className="font-bold">{clicks}</span>
                          {prevClicks !== null && (
                            <span className="ml-0.5 align-middle">
                              <TrendIcon prev={prevClicks} curr={clicks} />
                            </span>
                          )}
                          {opens > 0 && clicks === 0 && (
                            <span className="ml-1 rounded bg-warning/10 px-1 text-[10px] text-warning">
                              클릭없음
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">
                          {ctr}
                        </td>
                        {hasRecipientData && (
                          <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                            {openRate}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              ※ 열람·클릭은 픽셀/링크 총 히트 수(고유 수신자 아님) — 한 명이 여러 번
              열람·클릭하거나 이미지 프록시 재요청 시 CTR·열람률이 100%를 초과할 수 있습니다.
            </p>
            {!hasRecipientData && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                ※ 열람률은 email_logs 접근 권한 확보 후 자동으로 표시됩니다.
              </p>
            )}
          </div>

          {/* 발송 타이밍 인사이트 */}
          {insight && (
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <Clock size={13} className="text-primary" />
                발송 타이밍 인사이트
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  — 현재 발송: 매주 월요일 09:00 KST (기본 조용한 시간 22:00–08:00
                  이후)
                </span>
              </p>
              {insight.weeksWithData < 2 ? (
                <p className="pl-5 text-xs text-muted-foreground">
                  열람 데이터 축적 중 ({insight.weeksWithData}주 / 최소 2주 필요)
                </p>
              ) : (
                <div className="pl-5 space-y-1">
                  {insight.avgHoursAfterSend !== null && (
                    <p className="text-xs text-muted-foreground">
                      발송 후 평균{" "}
                      <span className="font-semibold text-foreground">
                        {insight.avgHoursAfterSend}시간
                      </span>
                      째 마지막 열람 감지
                      <span className="ml-1 text-[11px]">
                        (픽셀 기반 근사 — 이메일 클라이언트 차단 환경 제외)
                      </span>
                    </p>
                  )}
                  {insight.lowOpenWeeks.length > 0 && (
                    <p className="text-xs text-destructive">
                      미열람 주차: {insight.lowOpenWeeks.join(", ")}
                    </p>
                  )}
                  {insight.lowClickWeeks.length > 0 && (
                    <p className="text-xs text-warning">
                      열람 후 클릭 없음 (저성과 플래그):{" "}
                      {insight.lowClickWeeks.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 발송 타이밍 권장안 (운영진 참고용 — 자동 변경 금지) */}
          {recommendation && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Info size={13} />
                발송 타이밍 권장안 (운영진 참고용)
              </p>
              <p className="pl-5 text-xs text-muted-foreground">
                {recommendation}
              </p>
              <p className="pl-5 text-[11px] text-muted-foreground">
                ※ 발송 시각 변경은{" "}
                <code className="rounded bg-muted px-1 font-mono">
                  vercel.json
                </code>{" "}
                스케줄을 직접 수정하세요 (자동 변경 불가).
              </p>
            </div>
          )}

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
                    {data?.topLinks.map((row, i) => (
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

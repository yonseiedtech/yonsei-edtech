/**
 * 일정 투표 "가능 일정 종합" 공유 페이지 — /gatherings/poll/[id]
 *
 * 서버 컴포넌트 + Firebase Admin SDK 로 networking_events + networking_availability 를 읽어
 * 비로그인도 열람 가능한 공개 종합 페이지를 렌더한다(클라이언트 rules 인증 요구를 admin 으로 우회).
 * 개인정보 최소화: 응답자 이름은 노출하지 않고 인원 수만 집계한다.
 *
 * 보안: 이벤트 id 라우트는 public 이벤트만 허용한다. 비공개(visibility=private)·미게시 이벤트는
 * id 추측으로 열리면 안 되므로 404. (비공개 종합은 shareToken 라우트가 필요 — 현재 스코프 외.)
 */

import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { CalendarCheck, Users, Sparkles, CalendarClock, ShieldCheck } from "lucide-react";
import PageContainer from "@/components/ui/page-container";
import { getAdminDb } from "@/lib/firebase-admin";
import { buildCandidateSlots, eventPollSlots, tallyAvailability, formatSlotLabel, effectivePollTimeSlots } from "@/features/networking/networking-utils";
import type { NetworkingEvent, NetworkingAvailability, SlotTally } from "@/types";
import GuestPollVoter from "@/features/networking/GuestPollVoter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

interface PollData {
  event: NetworkingEvent;
  responses: NetworkingAvailability[];
}

/** 이벤트 + 응답 조회 (요청 내 dedupe — generateMetadata 와 페이지가 공유). public 이벤트만 통과. */
const getPollData = cache(async (id: string): Promise<PollData | null> => {
  try {
    const db = getAdminDb();
    const doc = await db.collection("networking_events").doc(id).get();
    if (!doc.exists) return null;
    const event = { ...doc.data(), id: doc.id } as NetworkingEvent;
    // 비공개·미게시 이벤트는 id 라우트로 열람 불가
    if (event.published === false || event.visibility === "private") return null;
    const availSnap = await db
      .collection("networking_availability")
      .where("eventId", "==", id)
      .get();
    const responses = availSnap.docs.map((d) => d.data() as NetworkingAvailability);
    return { event, responses };
  } catch {
    return null;
  }
});

/** 응답 수 → 히트맵 색상 강도 (인디고). 0이면 무색 */
function heatStyle(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "bg-background text-muted-foreground";
  const ratio = count / max;
  if (ratio >= 1) return "bg-cat-1 text-white";
  if (ratio >= 0.66) return "bg-cat-1/75 text-white";
  if (ratio >= 0.33) return "bg-cat-1/40 text-cat-1";
  return "bg-cat-1/20 text-cat-1";
}

/** "YYYY-MM-DD" → "7/18(금)" */
function dateLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (isNaN(d.getTime())) return date;
  return `${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
}

/** ISO → "2026. 7. 18. 오후 6:00" (KST) */
function formatDeadline(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPollData(id);
  if (!data) return { title: "일정 투표 현황" };
  const { event, responses } = data;
  const { weekday: metaWeekday, weekend: metaWeekend } = eventPollSlots(event);
  const candidateSlots = buildCandidateSlots(
    event.pollPeriodStart ?? "",
    event.pollPeriodEnd ?? "",
    metaWeekday,
    metaWeekend,
  );
  const tallies = tallyAvailability(responses, candidateSlots);
  const top = [...tallies]
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.slot.localeCompare(b.slot))[0];
  const description = top
    ? `현재 최다 가능: ${formatSlotLabel(top.slot)} (${top.count}명) · 응답 ${responses.length}명`
    : `응답 ${responses.length}명 · 가능한 일정을 투표해 주세요`;
  const title = `「${event.title}」 일정 투표 현황`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function PollSummaryPage({ params }: Props) {
  const { id } = await params;
  const data = await getPollData(id);
  if (!data) notFound();
  const { event, responses } = data;

  // 시간대 미설정 이벤트도 기본 시간대 폴백 — 투표 UI(buildCandidateSlots)와 동일 슬롯 체계 유지.
  // 평일/주말 슬롯이 다를 수 있으므로 표 헤더 시간대는 두 세트의 합집합(정렬)으로 구성한다.
  // 특정 날짜에 없는 슬롯은 tally 에 후보가 없어 count 0(빈 칸)으로 렌더된다.
  const { weekday: pollWeekday, weekend: pollWeekend } = eventPollSlots(event);
  const effWeekday = effectivePollTimeSlots(pollWeekday);
  const effWeekend = pollWeekend.length > 0 ? pollWeekend : effWeekday;
  const timeSlots = Array.from(new Set([...effWeekday, ...effWeekend])).sort();
  const hasTime = timeSlots.length > 0;
  const candidateSlots = buildCandidateSlots(
    event.pollPeriodStart ?? "",
    event.pollPeriodEnd ?? "",
    pollWeekday,
    pollWeekend,
  );
  // 후보 기간이 없으면 종합할 것이 없음 → 404
  if (candidateSlots.length === 0) notFound();

  const tallies = tallyAvailability(responses, candidateSlots);
  const tallyBySlot = new Map<string, SlotTally>();
  for (const t of tallies) tallyBySlot.set(t.slot, t);
  const maxCount = Math.max(0, ...tallies.map((t) => t.count));

  const dates = Array.from(new Set(candidateSlots.map((s) => s.split("|")[0]))).sort();
  const responderCount = responses.filter((r) => r.availableSlots.length > 0).length;

  // 최다 가능 일정 상위 3
  const topSlots = [...tallies]
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count || a.slot.localeCompare(b.slot))
    .slice(0, 3);

  // 요일별 종합 (해당 요일의 모든 슬롯 인원 합산)
  const weekdayTotals = new Array(7).fill(0) as number[];
  for (const t of tallies) {
    const d = new Date(`${t.date}T00:00:00`);
    if (!isNaN(d.getTime())) weekdayTotals[d.getDay()] += t.count;
  }
  const weekdayMax = Math.max(0, ...weekdayTotals);

  const deadline = formatDeadline(event.pollDeadline);
  const isClosed = !!event.pollDeadline && new Date(event.pollDeadline).getTime() < Date.now();
  const isConfirmed = event.schedulingMode !== "poll" || !!event.startAt;
  const periodLabel =
    event.pollPeriodStart && event.pollPeriodEnd
      ? `${event.pollPeriodStart} ~ ${event.pollPeriodEnd}`
      : null;

  return (
    <PageContainer width="default">
      <header className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cat-1/10 px-2.5 py-0.5 text-xs font-semibold text-cat-1">
          <CalendarCheck size={12} /> 일정 투표 현황
        </span>
        <h1 className="mt-2.5 text-2xl font-bold leading-snug tracking-tight">{event.title}</h1>
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {periodLabel && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={13} /> 후보 기간 {periodLabel}
            </span>
          )}
          {deadline && (
            <span className="inline-flex items-center gap-1">
              <CalendarClock size={13} /> 투표 마감 {deadline}
              {isClosed && <span className="font-semibold text-destructive"> (마감됨)</span>}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Users size={13} /> 응답 {responderCount}명
          </span>
        </dl>
        {isConfirmed && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck size={13} /> 일정이 확정되었습니다. 아래는 투표 당시 집계입니다.
          </p>
        )}
      </header>

      {/* 작업 2 보완(2026-07-14): 게스트 투표 UI — 공유받은 비로그인 방문자가 이 페이지에서
          학번+이름으로 바로 투표할 수 있도록 한다. 집계 뷰는 아래에 그대로 유지. */}
      {!isConfirmed && (
        <GuestPollVoter
          eventId={event.id}
          candidateSlots={candidateSlots}
          pollDeadline={event.pollDeadline}
        />
      )}

      {/* 최다 가능 일정 상위 3 */}
      <section className="mb-6 rounded-2xl bg-cat-1/10 p-4">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-cat-1">
          <Sparkles size={14} className="text-cat-1" /> 최다 가능 일정 TOP 3
        </h2>
        {topSlots.length > 0 ? (
          <ol className="mt-2.5 space-y-1.5">
            {topSlots.map((t, i) => (
              <li key={t.slot} className="flex items-center gap-2 text-sm text-cat-1">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cat-1 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <b>{dateLabel(t.date)}</b>
                {t.time && <span className="text-cat-1">{t.time}</span>}
                <span className="ml-auto font-semibold tabular-nums">{t.count}명 가능</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">아직 응답이 없습니다.</p>
        )}
      </section>

      {/* 날짜×시간대 집계 표 (히트맵) */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold">날짜별 가능 인원</h2>
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full border-collapse text-center text-xs">
            <thead>
              <tr className="bg-muted/50">
                <th className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-semibold">날짜</th>
                {hasTime ? (
                  timeSlots.map((ts) => (
                    <th key={ts} className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums">
                      {ts}
                    </th>
                  ))
                ) : (
                  <th className="px-3 py-2 font-semibold">가능 인원</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dates.map((date) => (
                <tr key={date} className="border-t">
                  <th className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-2 text-left font-medium">
                    {dateLabel(date)}
                  </th>
                  {hasTime ? (
                    timeSlots.map((ts) => {
                      const count = tallyBySlot.get(`${date}|${ts}`)?.count ?? 0;
                      return (
                        <td key={ts} className="px-1 py-1">
                          <span
                            className={`flex min-h-[32px] items-center justify-center rounded-md tabular-nums ${heatStyle(count, maxCount)}`}
                          >
                            {count > 0 ? count : ""}
                          </span>
                        </td>
                      );
                    })
                  ) : (
                    <td className="px-1 py-1">
                      <span
                        className={`flex min-h-[32px] items-center justify-center rounded-md font-semibold tabular-nums ${heatStyle(tallyBySlot.get(date)?.count ?? 0, maxCount)}`}
                      >
                        {(tallyBySlot.get(date)?.count ?? 0) > 0 ? `${tallyBySlot.get(date)?.count}명` : ""}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 요일별 종합 */}
      {weekdayMax > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold">요일별 종합 (전체 응답 합산)</h2>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w, i) => (
              <div key={w} className="flex flex-col items-center gap-1">
                <span
                  className={`flex aspect-square w-full items-center justify-center rounded-lg text-xs font-semibold tabular-nums ${heatStyle(weekdayTotals[i], weekdayMax)}`}
                >
                  {weekdayTotals[i] > 0 ? weekdayTotals[i] : ""}
                </span>
                <span
                  className={
                    i === 0
                      ? "text-[11px] font-medium text-destructive"
                      : i === 6
                        ? "text-[11px] font-medium text-cat-1"
                        : "text-[11px] font-medium text-muted-foreground"
                  }
                >
                  {w}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 범례 + 프라이버시 안내 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-cat-1/10" /> 적음
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded bg-cat-1" /> 많음
        </span>
      </div>
      <p className="mt-3 rounded-xl border border-dashed bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
        응답자 개인정보 보호를 위해 이름은 표시하지 않고 가능 인원 수만 종합합니다. 로그인 없이 학번과 이름으로도 이 페이지 상단에서 바로 투표할 수 있습니다. 회원은 로그인 후 모임·행사 페이지에서 참여할 수 있습니다.
      </p>
    </PageContainer>
  );
}

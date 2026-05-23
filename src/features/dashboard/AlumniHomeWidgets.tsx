"use client";

/**
 * AlumniHomeWidgets — Phase C 졸업생 전용 대시보드 콘텐츠 (3섹션 단일 컴포넌트)
 *
 * 노출 조건: getUserPersona(user) === "alumni"
 * 졸업생에게 학사 위젯 대신 의미 있는 콘텐츠를 노출.
 *
 * 1) 동문 활동 — 최근 학술활동/세미나 상위 3건 (졸업생도 참여 가능한 이벤트 안내)
 * 2) 논문 추천 — alumni_theses 최신 3건 (학회 등록 졸업생 학위논문 DB)
 * 3) 아카이브 진입 — 교육공학 아카이브 8개 컬렉션 quick link
 *
 * 데이터 fetching:
 *  - React Query 캐시 활용 (staleTime 5분 — 졸업생은 자주 갱신 불필요)
 *  - 본인 외 명단은 fetch 안 함 (alumni 전체 명단 비fetch)
 *  - 빈 상태 우아한 폴백 (alumni_theses 0건이어도 깨지지 않음)
 */

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BookOpenCheck,
  Library,
  ChevronRight,
  Calendar,
  GraduationCap,
  Lightbulb,
  Variable as VariableIcon,
  Ruler,
  FlaskConical,
  BarChart3,
  Anchor,
  PenLine,
  BookText,
} from "lucide-react";
import { alumniThesesApi, activitiesApi, seminarsApi } from "@/lib/bkend";
import type { Activity, AlumniThesis, Seminar } from "@/types";
import WidgetCard from "@/components/ui/widget-card";
import EmptyState from "@/components/ui/empty-state";

interface UpcomingEvent {
  id: string;
  kind: "activity" | "seminar";
  title: string;
  href: string;
  date: string;
  meta: string;
}

interface ArchiveQuickLink {
  href: string;
  label: string;
  icon: typeof Lightbulb;
  tone: string;
}

/**
 * 8개 아카이브 컬렉션 quick link.
 * /archive 랜딩의 동적 컬렉션 5종 + 정적 컬렉션 3종(연구방법/통계방법/기초용어/글쓰기) 매핑.
 * Phase 4 작업 중인 /archive 내부 컴포넌트는 손대지 않고, 라우트 경로만 참조.
 */
const ARCHIVE_QUICK_LINKS: ReadonlyArray<ArchiveQuickLink> = [
  { href: "/archive/concept", label: "개념", icon: Lightbulb, tone: "bg-violet-50 text-violet-700 border-violet-200" },
  { href: "/archive/variable", label: "변인", icon: VariableIcon, tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { href: "/archive/measurement", label: "측정도구", icon: Ruler, tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { href: "/archive/research-methods", label: "연구방법", icon: FlaskConical, tone: "bg-sky-50 text-sky-700 border-sky-200" },
  { href: "/archive/statistical-methods", label: "통계방법", icon: BarChart3, tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { href: "/archive/foundation-terms", label: "기초 용어", icon: Anchor, tone: "bg-slate-50 text-slate-700 border-slate-200" },
  { href: "/archive/writing-tips", label: "글쓰기", icon: PenLine, tone: "bg-rose-50 text-rose-700 border-rose-200" },
  { href: "/archive/apa-style", label: "APA 스타일", icon: BookText, tone: "bg-amber-50 text-amber-700 border-amber-200" },
];

function formatKoreanDate(iso: string): string {
  if (!iso) return "";
  // "YYYY-MM-DD" 형태 → "M/D"
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m) return `${Number(m[2])}/${Number(m[3])}`;
  return iso;
}

function formatAwardedYearMonth(value: string): string {
  // "YYYY-MM" → "YYYY년 M월"
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  return `${m[1]}년 ${Number(m[2])}월`;
}

export default function AlumniHomeWidgets() {
  // ── 1) 최근 학술활동 (status !== completed, 상위 2건) ──
  // MyAcademicActivitiesWidget 와 동일 queryKey ["activities", "all"] 공유.
  const { data: activitiesRes } = useQuery({
    queryKey: ["activities", "all"],
    queryFn: async () => activitiesApi.list(),
    staleTime: 5 * 60_000,
  });

  // ── 2) 다가오는 세미나 (status === upcoming, 상위 1건) ──
  // useSeminars 와 동일 queryKey ["seminars", undefined] 공유 (limit 200).
  const { data: seminarsAll } = useQuery({
    queryKey: ["seminars", undefined],
    queryFn: async () => {
      const res = await seminarsApi.list({ limit: 200 });
      return res.data as unknown as Seminar[];
    },
    staleTime: 5 * 60_000,
  });

  // ── 3) 졸업생 학위논문 추천 (최신 3건) ──
  const { data: thesesRes } = useQuery({
    queryKey: ["alumni-theses", "recent", 3],
    queryFn: () => alumniThesesApi.list({ limit: 3, sort: "awardedYearMonth:desc" }),
    staleTime: 5 * 60_000,
  });

  const upcomingEvents: UpcomingEvent[] = useMemo(() => {
    const list: UpcomingEvent[] = [];
    const activities = (activitiesRes?.data ?? []) as Activity[];
    // 학술활동 — 진행 중·예정만 상위 2건
    const liveActivities = activities
      .filter((a) => a.status !== "completed")
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(0, 2);
    for (const a of liveActivities) {
      list.push({
        id: `activity:${a.id}`,
        kind: "activity",
        title: a.title,
        href: `/activities/${a.type === "study" ? "studies" : a.type === "project" ? "projects" : "external"}/${a.id}`,
        date: a.date ?? "",
        meta: a.type === "study" ? "스터디" : a.type === "project" ? "프로젝트" : "대외학술활동",
      });
    }
    // 세미나 — upcoming 상위 1건
    const liveSeminars = (seminarsAll ?? [])
      .filter((s) => s.status === "upcoming")
      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
      .slice(0, 1);
    for (const s of liveSeminars) {
      list.push({
        id: `seminar:${s.id}`,
        kind: "seminar",
        title: s.title,
        href: `/seminars/${s.id}`,
        date: s.date ?? "",
        meta: "세미나",
      });
    }
    // 날짜 오름차순 정렬 (가까운 일정 먼저)
    list.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    return list.slice(0, 3);
  }, [activitiesRes, seminarsAll]);

  const theses = useMemo(
    () => (thesesRes?.data ?? []) as AlumniThesis[],
    [thesesRes],
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* ── 1) 동문 활동 카드 ── */}
      <WidgetCard
        title="동문 활동"
        icon={Users}
        actions={
          <Link
            href="/activities"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            전체 보기 <ChevronRight size={11} />
          </Link>
        }
      >
        {upcomingEvents.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="진행 중인 활동이 없습니다"
            description="새 학술활동·세미나가 열리면 여기서 안내해드릴게요."
            compact
            className="mt-4 bg-transparent"
            actions={[{ label: "지난 활동 보기", href: "/activities", variant: "outline" }]}
          />
        ) : (
          <ul className="mt-4 space-y-1">
            {upcomingEvents.map((evt) => (
              <li key={evt.id}>
                <Link
                  href={evt.href}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      evt.kind === "activity"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                    aria-hidden="true"
                  >
                    <Calendar size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{evt.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span>{evt.meta}</span>
                      <span className="mx-1" aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatKoreanDate(evt.date)}</span>
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </WidgetCard>

      {/* ── 2) 졸업생 학위논문 추천 ── */}
      <WidgetCard
        title="동문 학위논문 추천"
        icon={BookOpenCheck}
        actions={
          <Link
            href="/alumni/thesis"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
          >
            전체 보기 <ChevronRight size={11} />
          </Link>
        }
      >
        {theses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="등록된 학위논문이 아직 없어요"
            description="학회에서 졸업생 학위논문 DB 를 구축하는 중입니다."
            compact
            className="mt-4 bg-transparent"
            actions={[{ label: "연구 라운지 가기", href: "/research", variant: "outline" }]}
          />
        ) : (
          <ul className="mt-4 space-y-1">
            {theses.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/alumni/thesis/${t.id}`}
                  className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/40"
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
                    aria-hidden="true"
                  >
                    <GraduationCap size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span>{t.authorName}</span>
                      {t.awardedYearMonth && (
                        <>
                          <span className="mx-1" aria-hidden="true">·</span>
                          <span>{formatAwardedYearMonth(t.awardedYearMonth)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </WidgetCard>

      {/* ── 3) 아카이브 진입 카드 (md 그리드에서 전체 폭 차지) ── */}
      <div className="md:col-span-2">
        <WidgetCard
          title="교육공학 아카이브 둘러보기"
          icon={Library}
          actions={
            <Link
              href="/archive"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              랜딩 가기 <ChevronRight size={11} />
            </Link>
          }
        >
          <p className="mt-3 text-xs text-muted-foreground">
            연구·실무에 바로 참조할 수 있는 8개 컬렉션. 졸업 후에도 학회 회원이라면 언제든 열람·즐겨찾기할 수 있어요.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ARCHIVE_QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors hover:opacity-90 ${link.tone}`}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span className="truncate">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </WidgetCard>
      </div>
    </div>
  );
}

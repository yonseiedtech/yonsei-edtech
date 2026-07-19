"use client";

/**
 * 커맨드 팔레트 · 전역 검색 (Ctrl/Cmd+K) — 3차 백로그 G1
 *
 * 핵심: 라우트 50+·feature 50+ 시대의 발견성 회복.
 *   1) 정적 라우트/기능(command-routes.ts)을 **즉시** 검색·이동 — 네트워크 의존 없음(hang 방지).
 *      역할(visibility)로 로그인/운영진 전용 메뉴 분기.
 *   2) 동적 콘텐츠(아카이브 개념·세미나·학술활동·졸업생 논문·공지)는 다이얼로그가
 *      열릴 때 1회 병렬 로드해 **보조로** 합류(react-query 5분 캐시). 로드 전이라도
 *      정적 라우트 검색은 막힘 없이 동작한다.
 *
 * cmdk 의존성 없이 Dialog + 키보드 네비 자체 구현(접근성: combobox/listbox/option).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Lightbulb, Variable as VariableIcon, Ruler,
  Presentation, Users, GraduationCap, ArrowRight, Loader2, Megaphone,
  BookOpen, Layers,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  seminarsApi,
  activitiesApi,
  alumniThesesApi,
  postsApi,
  dataApi,
  courseOfferingsApi,
  flashcardsApi,
} from "@/lib/bkend";
import type {
  ArchiveConcept,
  ArchiveVariable,
  ArchiveMeasurementTool,
  Seminar,
  Activity,
  AlumniThesis,
  Post,
  CourseOffering,
} from "@/types";
import type { Flashcard } from "@/types/flashcard";
import { SEMESTER_TERM_LABELS } from "@/types";
import { cn } from "@/lib/utils";
import { GROUP_ORDER, visibleRoutes, visibleActions } from "./command-routes";
import CommandPaletteCoach from "./CommandPaletteCoach";
import { trackSearchMiss } from "@/lib/search-miss-tracker";

interface SearchItem {
  key: string;
  group: string;
  label: string;
  sub?: string;
  href: string;
  icon: LucideIcon;
  /** 검색 매칭 대상 (label 외 별칭·저자 등) */
  haystack: string;
  /** 우측 표기 단축키(빠른 필터 프리픽스, 예 ">진단") — 빠른 실행 명령에만 존재 */
  shortcut?: string;
}

const ACTIVITY_ROUTE: Record<Activity["type"], string> = {
  study: "studies",
  project: "projects",
  external: "external",
};

const PER_GROUP_LIMIT = 5;

const RECENT_KEY = "global-search.recent";
const RECENT_LIMIT = 5;

/** 커맨드 팔레트 1회 코치마크 — 로그인 회원 최초 1회만 노출 (벤치마크 H1) */
const COACH_KEY = "global-search.coach-dismissed";

function loadRecentKeys(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function saveRecentKey(key: string) {
  try {
    const next = [key, ...loadRecentKeys().filter((k) => k !== key)].slice(0, RECENT_LIMIT);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* localStorage 불가 환경 무시 */
  }
}

export default function GlobalSearch() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ctrl/Cmd+K 전역 단축키
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [recentKeys, setRecentKeys] = useState<string[]>([]);

  // 1회 코치마크: 로그인 회원이며 아직 닫지 않았을 때만 노출
  const [showCoach, setShowCoach] = useState(false);
  useEffect(() => {
    if (!user) {
      setShowCoach(false);
      return;
    }
    try {
      setShowCoach(!window.localStorage.getItem(COACH_KEY));
    } catch {
      setShowCoach(false);
    }
  }, [user]);

  function dismissCoach() {
    setShowCoach(false);
    try {
      window.localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* localStorage 불가 환경 무시 */
    }
  }

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setRecentKeys(loadRecentKeys());
      // 팔레트를 한 번 열면 코치마크 임무 완료 → 닫고 플래그 저장
      setShowCoach(false);
      try {
        window.localStorage.setItem(COACH_KEY, "1");
      } catch {
        /* 무시 */
      }
      // Dialog 마운트 직후 포커스
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 빠른 실행 명령(최상단) — 라우트 이동을 넘어 대표 도구를 즉시 실행
  const actionItems: SearchItem[] = useMemo(() => {
    return visibleActions(user?.role).map((r) => ({
      key: r.key,
      group: r.group,
      label: r.label,
      sub: r.sub,
      href: r.href,
      icon: r.icon,
      shortcut: r.shortcut,
      haystack: `${r.label} ${r.sub ?? ""} ${r.keywords}`,
    }));
  }, [user?.role]);

  // 정적 라우트 — 역할 기반 필터(즉시 사용 가능, 네트워크 무관)
  const routeItems: SearchItem[] = useMemo(() => {
    return visibleRoutes(user?.role).map((r) => ({
      key: r.key,
      group: r.group,
      label: r.label,
      sub: r.sub,
      href: r.href,
      icon: r.icon,
      haystack: `${r.label} ${r.sub ?? ""} ${r.keywords}`,
    }));
  }, [user?.role]);

  // 동적 콘텐츠 — 보조 소스(다이얼로그 열림 시 1회 병렬 로드). 실패해도 정적 검색은 유지.
  const { data: sources, isLoading } = useQuery({
    queryKey: ["global-search-sources", user?.id ?? "anon"],
    queryFn: async () => {
      const [concepts, variables, measurements, seminars, activities, theses, notices, statMethods, resMethods, courses, myCards] =
        await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
          seminarsApi.list({ limit: 200 }),
          activitiesApi.list(),
          alumniThesesApi.list(),
          // 공지: public read 카테고리만 — sort 비움(orderBy 비활성, 인덱스 회피) 후 클라이언트 최신순
          postsApi.list({ category: "notice", limit: 100, sort: "" }),
          // rules 가 published 조건부 read — 무필터 list 는 거부되므로 filter 필수 (posts 교훈)
          dataApi.list<{ id: string; name?: string; summary?: string }>("archive_statistical_methods", { "filter[published]": true, limit: 100 }),
          dataApi.list<{ id: string; name?: string; summary?: string }>("archive_research_methods", { "filter[published]": true, limit: 100 }),
          courseOfferingsApi.list(),
          // 내 암기카드 — 본인 필터 필수(rules). 비로그인은 빈 목록.
          user?.id ? flashcardsApi.listByUser(user.id) : Promise.resolve({ data: [] as Flashcard[] }),
        ]);
      const noticeArr = (notices.data as unknown as Post[]).sort((a, b) =>
        (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
      );
      return {
        concepts: concepts.data as ArchiveConcept[],
        variables: variables.data as ArchiveVariable[],
        measurements: measurements.data as ArchiveMeasurementTool[],
        seminars: seminars.data as unknown as Seminar[],
        activities: activities.data as Activity[],
        theses: theses.data as AlumniThesis[],
        notices: noticeArr,
        statMethods: statMethods.data,
        resMethods: resMethods.data,
        courses: courses.data as unknown as CourseOffering[],
        myCards: myCards.data as unknown as Flashcard[],
      };
    },
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const dynamicItems: SearchItem[] = useMemo(() => {
    if (!sources) return [];
    const items: SearchItem[] = [];
    for (const c of sources.concepts) {
      items.push({
        key: `concept:${c.id}`, group: "아카이브", label: c.name,
        sub: "개념", href: `/archive/concept/${c.id}`, icon: Lightbulb,
        haystack: `${c.name} ${(c.altNames ?? []).join(" ")}`,
      });
    }
    for (const v of sources.variables) {
      items.push({
        key: `variable:${v.id}`, group: "아카이브", label: v.name,
        sub: "변인", href: `/archive/variable/${v.id}`, icon: VariableIcon,
        haystack: `${v.name} ${(v.altNames ?? []).join(" ")}`,
      });
    }
    for (const g of sources.statMethods) {
      items.push({
        key: `stat:${g.id}`, group: "아카이브", label: g.name ?? "",
        sub: "통계 가이드", href: `/archive/statistical-methods/${g.id}`, icon: Ruler,
        haystack: `${g.name ?? ""} ${g.summary ?? ""}`,
      });
    }
    for (const g of sources.resMethods) {
      items.push({
        key: `resm:${g.id}`, group: "아카이브", label: g.name ?? "",
        sub: "연구방법 가이드", href: `/archive/research-methods/${g.id}`, icon: Lightbulb,
        haystack: `${g.name ?? ""} ${g.summary ?? ""}`,
      });
    }
    for (const m of sources.measurements) {
      items.push({
        key: `measurement:${m.id}`, group: "아카이브", label: m.name,
        sub: "측정도구", href: `/archive/measurement/${m.id}`, icon: Ruler,
        haystack: `${m.name} ${((m as { altNames?: string[] }).altNames ?? []).join(" ")}`,
      });
    }
    for (const s of sources.seminars) {
      items.push({
        key: `seminar:${s.id}`, group: "세미나", label: s.title,
        sub: s.date, href: `/seminars/${s.id}`, icon: Presentation,
        haystack: s.title,
      });
    }
    for (const a of sources.activities) {
      items.push({
        key: `activity:${a.id}`, group: "학술활동", label: a.title,
        sub: a.date, href: `/activities/${ACTIVITY_ROUTE[a.type] ?? "studies"}/${a.id}`, icon: Users,
        haystack: a.title,
      });
    }
    for (const t of sources.theses) {
      items.push({
        key: `thesis:${t.id}`, group: "졸업생 논문", label: t.title,
        sub: `${t.authorName} · ${t.awardedYearMonth}`, href: `/alumni/thesis/${t.id}`, icon: GraduationCap,
        haystack: `${t.title} ${t.authorName} ${(t.keywords ?? []).join(" ")}`,
      });
    }
    for (const n of sources.notices) {
      items.push({
        key: `notice:${n.id}`, group: "공지", label: n.title,
        sub: (n.createdAt ?? "").slice(0, 10), href: `/notices/${n.id}`, icon: Megaphone,
        haystack: n.title,
      });
    }
    for (const c of sources.courses) {
      items.push({
        key: `course:${c.id}`, group: "강의", label: c.courseName,
        sub: `${c.year} ${SEMESTER_TERM_LABELS[c.term] ?? ""}${c.professor ? ` · ${c.professor}` : ""}`,
        href: `/courses/${c.id}`, icon: BookOpen,
        haystack: `${c.courseName} ${c.courseCode ?? ""} ${c.professor ?? ""}`,
      });
    }
    for (const f of sources.myCards) {
      items.push({
        key: `card:${f.id}`, group: "암기카드", label: f.front,
        sub: "내 암기카드", href: "/flashcards", icon: Layers,
        haystack: `${f.front} ${f.back}`,
      });
    }
    return items;
  }, [sources]);

  // 빠른 실행(최상단) + 정적 라우트(우선) + 동적 콘텐츠(보조)
  const allItems: SearchItem[] = useMemo(
    () => [...actionItems, ...routeItems, ...dynamicItems],
    [actionItems, routeItems, dynamicItems],
  );

  const results: SearchItem[] = useMemo(() => {
    const raw = query.trim().toLowerCase();
    // '>' 프리픽스 = 빠른 필터: "빠른 실행" 명령만 좁혀 보기 (Linear/Arc 팔레트 관례)
    const actionOnly = raw.startsWith(">");
    const q = actionOnly ? raw.slice(1).trim() : raw;
    const out: SearchItem[] = [];
    const usedKeys = new Set<string>();
    // 빈 쿼리: 최근 선택을 선두 그룹으로 (stale 키는 매칭 실패로 자동 무시)
    if (!actionOnly && !q && recentKeys.length > 0) {
      const byKey = new Map(allItems.map((i) => [i.key, i] as const));
      for (const k of recentKeys) {
        const item = byKey.get(k);
        if (!item) continue;
        out.push({ ...item, group: "최근" });
        usedKeys.add(k);
      }
    }
    const byGroup = new Map<string, SearchItem[]>();
    for (const item of allItems) {
      if (usedKeys.has(item.key)) continue;
      if (actionOnly && item.group !== "빠른 실행") continue;
      if (q && !item.haystack.toLowerCase().includes(q)) continue;
      const list = byGroup.get(item.group) ?? [];
      if (list.length >= PER_GROUP_LIMIT) continue;
      list.push(item);
      byGroup.set(item.group, list);
    }
    for (const g of GROUP_ORDER) out.push(...(byGroup.get(g) ?? []));
    return out;
  }, [allItems, query, recentKeys]);

  // 결과 변경 시 활성 인덱스 보정
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  // M6: 무결과 질의 적재 — debounce 600ms 후 결과 0건 + 2자 이상 조건에서 기록
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      if (!isLoading && results.length === 0) {
        void trackSearchMiss(q);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [open, query, results.length, isLoading]);

  function go(item: SearchItem) {
    // "최근" 그룹에서 선택해도 원본 key 그대로 저장 (group 은 표시용 복제)
    saveRecentKey(item.key);
    setOpen(false);
    router.push(item.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = results[activeIdx];
      if (item) go(item);
    }
  }

  // 활성 항목 스크롤 추적
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <>
      {/* 모바일: 아이콘 / 데스크톱: pill + 단축키 뱃지 (발견성) */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="전역 검색 (Ctrl+K)"
        title="검색 (Ctrl+K)"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
      >
        <Search size={18} />
      </button>
      <div className="relative hidden md:block">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="전역 검색 (Ctrl+K)"
          className="inline-flex h-9 items-center gap-2 rounded-full border bg-muted/40 px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search size={14} />
          검색
          <kbd className="rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] leading-none">
            Ctrl K
          </kbd>
        </button>
        <CommandPaletteCoach show={showCoach} onDismiss={dismissCoach} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg translate-y-0 gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>전역 검색 · 커맨드 팔레트</DialogTitle>
          </DialogHeader>
          <div className="relative border-b">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="페이지 · 기능 · 아카이브 · 세미나 · 논문 검색…"
              className="h-12 rounded-none border-0 pl-11 pr-4 text-sm shadow-none focus-visible:ring-0"
              role="combobox"
              aria-expanded="true"
              aria-controls="global-search-results"
              aria-activedescendant={results[activeIdx] ? `gs-opt-${activeIdx}` : undefined}
            />
          </div>
          <div
            ref={listRef}
            id="global-search-results"
            role="listbox"
            aria-label="검색 결과"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                {query
                  ? `“${query}” 에 대한 결과가 없습니다.`
                  : "페이지나 기능 이름을 입력하세요."}
              </p>
            )}
            {(() => {
              let lastGroup = "";
              return results.map((item, idx) => {
                const showHeader = item.group !== lastGroup;
                lastGroup = item.group;
                const Icon = item.icon;
                return (
                  <div key={item.key}>
                    {showHeader && (
                      <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.group}
                      </p>
                    )}
                    <button
                      type="button"
                      id={`gs-opt-${idx}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={idx === activeIdx}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        idx === activeIdx ? "bg-primary/10 text-primary" : "hover:bg-muted",
                      )}
                    >
                      <Icon size={14} className="shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.sub && (
                        <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">{item.sub}</span>
                      )}
                      {item.shortcut && (
                        <kbd className="shrink-0 rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] leading-none text-muted-foreground">
                          {item.shortcut}
                        </kbd>
                      )}
                      <ArrowRight size={11} className="shrink-0 text-muted-foreground/50" />
                    </button>
                  </div>
                );
              });
            })()}
            {isLoading && (
              <p className="flex items-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> 콘텐츠 검색 데이터를 불러오는 중…
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t px-4 py-2 text-[10px] text-muted-foreground">
            <span>↑↓ 이동</span>
            <span>Enter 열기</span>
            <span>Esc 닫기</span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border bg-background px-1 py-0.5 font-mono">&gt;</kbd>
              빠른 실행만 보기
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

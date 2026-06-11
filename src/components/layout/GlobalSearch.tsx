"use client";

/**
 * 전역 검색 (Ctrl/Cmd+K) — 오케스트라 사이클 15
 *
 * 아카이브(개념·변인·측정도구)·세미나·학술활동·졸업생 논문 + 페이지 바로가기를
 * 한 입력창에서 검색. cmdk 의존성 없이 Dialog + 키보드 네비 자체 구현.
 * 데이터는 다이얼로그가 처음 열릴 때 1회 병렬 로드(react-query 5분 캐시).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Compass, Lightbulb, Variable as VariableIcon, Ruler,
  Presentation, Users, GraduationCap, ArrowRight, Loader2, Megaphone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  archiveConceptsApi,
  archiveVariablesApi,
  archiveMeasurementsApi,
  seminarsApi,
  activitiesApi,
  alumniThesesApi,
  postsApi,
} from "@/lib/bkend";
import type {
  ArchiveConcept,
  ArchiveVariable,
  ArchiveMeasurementTool,
  Seminar,
  Activity,
  AlumniThesis,
  Post,
} from "@/types";
import { cn } from "@/lib/utils";

interface SearchItem {
  key: string;
  group: string;
  label: string;
  sub?: string;
  href: string;
  icon: React.ElementType;
  /** 검색 매칭 대상 (label 외 별칭·저자 등) */
  haystack: string;
}

const ACTIVITY_ROUTE: Record<Activity["type"], string> = {
  study: "studies",
  project: "projects",
  external: "external",
};

const SHORTCUTS: SearchItem[] = [
  { key: "go:dashboard", group: "바로가기", label: "대시보드", href: "/dashboard", icon: Compass, haystack: "대시보드 dashboard 홈" },
  { key: "go:journey", group: "바로가기", label: "나의 논문 여정 · 연구활동", href: "/mypage/research", icon: Compass, haystack: "논문 여정 연구활동 에디터 학위논문 지도 노트 코크핏 journey research" },
  { key: "go:archive", group: "바로가기", label: "교육공학 아카이브", href: "/archive", icon: Lightbulb, haystack: "아카이브 개념 변인 측정도구 archive" },
  { key: "go:seminars", group: "바로가기", label: "세미나", href: "/seminars", icon: Presentation, haystack: "세미나 seminar" },
  { key: "go:activities", group: "바로가기", label: "학술활동", href: "/activities", icon: Users, haystack: "학술활동 스터디 프로젝트 대외활동 activities study" },
  { key: "go:calendar", group: "바로가기", label: "캘린더", href: "/calendar", icon: Compass, haystack: "캘린더 일정 calendar" },
  { key: "go:research", group: "바로가기", label: "연구 흐름 분석", href: "/research", icon: GraduationCap, haystack: "연구 분석 키워드 계보 research" },
  { key: "go:thesis", group: "바로가기", label: "졸업생 학위논문", href: "/alumni/thesis", icon: GraduationCap, haystack: "졸업생 학위논문 alumni thesis" },
];

const GROUP_ORDER = ["바로가기", "공지", "아카이브", "세미나", "학술활동", "졸업생 논문"];
const PER_GROUP_LIMIT = 5;

export default function GlobalSearch() {
  const router = useRouter();
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

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // Dialog 마운트 직후 포커스
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const { data: sources, isLoading } = useQuery({
    queryKey: ["global-search-sources"],
    queryFn: async () => {
      const [concepts, variables, measurements, seminars, activities, theses, notices] =
        await Promise.all([
          archiveConceptsApi.list(),
          archiveVariablesApi.list(),
          archiveMeasurementsApi.list(),
          seminarsApi.list({ limit: 200 }),
          activitiesApi.list(),
          alumniThesesApi.list(),
          // 공지: public read 카테고리만 — sort 비움(orderBy 비활성, 인덱스 회피) 후 클라이언트 최신순
          postsApi.list({ category: "notice", limit: 100, sort: "" }),
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
      };
    },
    enabled: open,
    staleTime: 5 * 60_000,
  });

  const allItems: SearchItem[] = useMemo(() => {
    if (!sources) return SHORTCUTS;
    const items: SearchItem[] = [...SHORTCUTS];
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
        sub: `${t.authorName} · ${t.awardedYearMonth}`, href: "/alumni/thesis", icon: GraduationCap,
        haystack: `${t.title} ${t.authorName}`,
      });
    }
    for (const n of sources.notices) {
      items.push({
        key: `notice:${n.id}`, group: "공지", label: n.title,
        sub: (n.createdAt ?? "").slice(0, 10), href: `/notices/${n.id}`, icon: Megaphone,
        haystack: n.title,
      });
    }
    return items;
  }, [sources]);

  const results: SearchItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byGroup = new Map<string, SearchItem[]>();
    for (const item of allItems) {
      if (q && !item.haystack.toLowerCase().includes(q)) continue;
      const list = byGroup.get(item.group) ?? [];
      if (list.length >= PER_GROUP_LIMIT) continue;
      list.push(item);
      byGroup.set(item.group, list);
    }
    const out: SearchItem[] = [];
    for (const g of GROUP_ORDER) out.push(...(byGroup.get(g) ?? []));
    return out;
  }, [allItems, query]);

  // 결과 변경 시 활성 인덱스 보정
  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  function go(item: SearchItem) {
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="전역 검색 (Ctrl+K)"
        title="검색 (Ctrl+K)"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9 md:w-9"
      >
        <Search size={18} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] max-w-lg translate-y-0 gap-0 p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>전역 검색</DialogTitle>
          </DialogHeader>
          <div className="relative border-b">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="아카이브 · 세미나 · 학술활동 · 졸업생 논문 검색…"
              className="h-12 rounded-none border-0 pl-11 pr-4 text-sm shadow-none focus-visible:ring-0"
              role="combobox"
              aria-expanded="true"
              aria-controls="global-search-results"
            />
          </div>
          <div
            ref={listRef}
            id="global-search-results"
            role="listbox"
            className="max-h-[50vh] overflow-y-auto p-2"
          >
            {isLoading && (
              <p className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin" /> 검색 데이터를 불러오는 중…
              </p>
            )}
            {!isLoading && results.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                &ldquo;{query}&rdquo; 에 대한 결과가 없습니다.
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
                        <span className="shrink-0 text-[10px] text-muted-foreground">{item.sub}</span>
                      )}
                      <ArrowRight size={11} className="shrink-0 text-muted-foreground/50" />
                    </button>
                  </div>
                );
              });
            })()}
          </div>
          <div className="flex items-center gap-3 border-t px-4 py-2 text-[10px] text-muted-foreground">
            <span>↑↓ 이동</span>
            <span>Enter 열기</span>
            <span>Esc 닫기</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

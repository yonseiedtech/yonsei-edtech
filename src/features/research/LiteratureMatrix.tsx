"use client";

/**
 * 문헌 리뷰 매트릭스 (R4, 2026-07-03)
 *
 * '읽은 논문'을 행으로, 대상·설계·결과·시사점을 열로 하는 선행연구 비교표 편집기.
 * 연구 여정 '문헌 고찰' 단계의 전용 도구 — 셀은 논문의 기존 분석 필드
 * (sample·methodology·findings·insights)와 같은 데이터라 논문 상세와 자동 동기화된다.
 * 셀 편집은 포커스 아웃 시 자동 저장. 완성된 표는 복사하거나,
 * 논문 에디터(이론적 배경)·연구보고서(선행연구 분석)의 삽입 버튼으로 가져간다.
 */

import { useMemo, useState } from "react";
import { Table2, Copy, ChevronDown, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useResearchPapers, useUpdateResearchPaper } from "./useResearchPapers";
import {
  MATRIX_COLUMNS,
  ALL_MATRIX_COLUMNS,
  type MatrixColumnKey,
  type AnyMatrixColumnKey,
  hasMatrixData,
  paperLabel,
  buildMatrixTable,
  buildMatrixCsv,
  readonlyCellValue,
} from "./literature-matrix";

type EditableKey = MatrixColumnKey | "myConnection";
type SortKey = "authors" | "year" | "filled";
const PREF_KEY = "lit-matrix-prefs-v1";
import type { User, ResearchPaper } from "@/types";

export default function LiteratureMatrix({ user, readOnly }: { user: User; readOnly?: boolean }) {
  const { papers, isLoading } = useResearchPapers(user.id);
  const update = useUpdateResearchPaper();
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  // 고도화(2026-07-04): 표시 열·정렬 — localStorage 영속 (기기 단위 설정)
  const [visibleKeys, setVisibleKeys] = useState<AnyMatrixColumnKey[]>(() => {
    if (typeof window === "undefined") return MATRIX_COLUMNS.map((c) => c.key);
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as { cols?: AnyMatrixColumnKey[] };
      const valid = (saved.cols ?? []).filter((k) => ALL_MATRIX_COLUMNS.some((c) => c.key === k));
      return valid.length > 0 ? valid : MATRIX_COLUMNS.map((c) => c.key);
    } catch {
      return MATRIX_COLUMNS.map((c) => c.key);
    }
  });
  const [sortKey, setSortKey] = useState<SortKey>(() => {
    if (typeof window === "undefined") return "authors";
    try {
      const saved = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}") as { sort?: SortKey };
      return saved.sort === "year" || saved.sort === "filled" ? saved.sort : "authors";
    } catch {
      return "authors";
    }
  });
  function persistPrefs(cols: AnyMatrixColumnKey[], sort: SortKey) {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify({ cols, sort }));
    } catch {
      /* 저장 실패는 무시 */
    }
  }
  const columns = useMemo(
    () => ALL_MATRIX_COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys],
  );
  // P2(2026-07-04): 두 행 연속 blur 시 첫 행 스피너가 조기 소멸하던 문제 — Set 관리
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // 셀 편집 버퍼 — `${paperId}:${col}` → 값 (blur 시 저장 후 제거)
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const rows = useMemo(() => {
    const list = (papers as ResearchPaper[]).filter((p) => !p.isDraft);
    const filledCountOf = (p: ResearchPaper) =>
      ALL_MATRIX_COLUMNS.filter((c) => readonlyCellValue(p, c.key).trim()).length;
    return list.sort((a, b) => {
      if (sortKey === "year") return (b.year ?? 0) - (a.year ?? 0);
      if (sortKey === "filled") return filledCountOf(b) - filledCountOf(a);
      const an = (a.authors ?? a.title ?? "").localeCompare(b.authors ?? b.title ?? "", "ko");
      if (an !== 0) return an;
      return (a.year ?? 0) - (b.year ?? 0);
    });
  }, [papers, sortKey]);
  const filledCount = useMemo(() => rows.filter(hasMatrixData).length, [rows]);

  function draftKey(id: string, col: EditableKey) {
    return `${id}:${col}`;
  }
  function cellValue(p: ResearchPaper, col: EditableKey): string {
    const k = draftKey(p.id, col);
    return k in drafts ? drafts[k] : (p[col] ?? "");
  }

  async function saveCell(p: ResearchPaper, col: EditableKey) {
    const k = draftKey(p.id, col);
    if (!(k in drafts)) return;
    const next = drafts[k];
    if (next.trim() === (p[col] ?? "").trim()) {
      setDrafts((d) => {
        const { [k]: _omit, ...rest } = d;
        return rest;
      });
      return;
    }
    setSavingIds((prev) => new Set(prev).add(p.id));
    try {
      await update.mutateAsync({ id: p.id, data: { [col]: next.trim() } });
      // QA-v2: 낙관적 캐시 반영 — 저장~refetch 사이 옛 값으로 깜빡이던 문제 방지
      qc.setQueryData(["research_papers", user.id], (prev: unknown) =>
        Array.isArray(prev)
          ? prev.map((pp) => ((pp as ResearchPaper).id === p.id ? { ...(pp as ResearchPaper), [col]: next.trim() } : pp))
          : prev,
      );
      // 성공 후에만 draft 제거 — 실패 시 입력 유지 (QA-v2)
      setDrafts((d) => {
        const { [k]: _omit, ...rest } = d;
        return rest;
      });
    } catch {
      toast.error("셀 저장에 실패했습니다 — 입력은 남아 있으니 잠시 후 다시 시도하세요.");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(p.id);
        return next;
      });
    }
  }

  function mergedRows(): ResearchPaper[] {
    // QA-v2: 마지막 셀 blur 저장이 끝나기 전에도 방금 입력(draft)을 반영
    return rows.map((p) => {
      const patch: Partial<ResearchPaper> = {};
      for (const c of ALL_MATRIX_COLUMNS) {
        if (!c.editable) continue;
        const k = draftKey(p.id, c.key as EditableKey);
        if (k in drafts) patch[c.key as EditableKey] = drafts[k];
      }
      return { ...p, ...patch };
    });
  }

  async function copyTable() {
    const text = buildMatrixTable(mergedRows(), columns);
    if (!text) {
      toast.info("복사할 내용이 없습니다 — 셀을 먼저 채워주세요.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("비교표 텍스트를 복사했습니다 — 보고서·논문·한글 어디든 붙여넣으세요.");
    } catch {
      toast.error("클립보드 복사에 실패했습니다.");
    }
  }

  /** 고도화: CSV 다운로드 (Excel 호환 — BOM + 인젝션 중화) */
  function downloadCsv() {
    const csv = buildMatrixCsv(mergedRows(), columns);
    if (!csv.includes("\n")) {
      toast.info("내보낼 논문이 없습니다.");
      return;
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `문헌매트릭스_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV 파일로 내보냈습니다 — Excel/스프레드시트에서 열 수 있어요.");
  }

  return (
    <section className="mt-6 rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Table2 size={15} className="text-primary" />
          문헌 리뷰 매트릭스
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {filledCount}/{rows.length}편 정리됨
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            선행연구를 대상·설계·결과·시사점 비교표로 — 심사 단골 요구 자료
          </span>
        </span>
        <ChevronDown
          size={15}
          className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t px-5 py-4">
          {isLoading ? (
            <p className="py-6 text-center text-xs text-muted-foreground">불러오는 중…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              아직 등록한 논문이 없습니다 — 위의 &lsquo;논문 읽기&rsquo;에서 논문을 먼저 등록하세요.
            </p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  셀을 채우면 논문 상세의 분석 필드와 함께 저장됩니다(포커스 아웃 시 자동 저장). 정리된 논문은
                  연구보고서 &lsquo;선행연구 분석&rsquo;·논문 &lsquo;이론적 배경&rsquo;에서 비교표로 삽입할 수 있어요.
                </p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void copyTable()}
                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Copy size={11} />
                    표 복사
                  </button>
                  <button
                    type="button"
                    onClick={downloadCsv}
                    className="inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    title="Excel 호환 CSV 로 내려받기 (표시 중인 열 기준)"
                  >
                    <Download size={11} />
                    CSV
                  </button>
                </div>
              </div>

              {/* 고도화(2026-07-04): 열 선택·정렬 */}
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground">열:</span>
                {ALL_MATRIX_COLUMNS.map((c) => {
                  const on = visibleKeys.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const next = on
                          ? visibleKeys.filter((k) => k !== c.key)
                          : ALL_MATRIX_COLUMNS.filter((x) => visibleKeys.includes(x.key) || x.key === c.key).map((x) => x.key);
                        if (next.length === 0) {
                          toast.info("최소 1개 열은 표시해야 합니다.");
                          return;
                        }
                        setVisibleKeys(next);
                        persistPrefs(next, sortKey);
                      }}
                      className={cn(
                        "rounded-full border px-2 py-1 text-[11px] transition-colors",
                        on
                          ? "border-primary/50 bg-primary/10 font-medium text-primary"
                          : "border-dashed text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
                <span className="ml-2 text-[11px] font-semibold text-muted-foreground">정렬:</span>
                <select
                  value={sortKey}
                  onChange={(e) => {
                    const next = e.target.value as SortKey;
                    setSortKey(next);
                    persistPrefs(visibleKeys, next);
                  }}
                  className="h-7 rounded-lg border bg-background px-1.5 text-[11px]"
                  aria-label="정렬 기준"
                >
                  <option value="authors">저자순</option>
                  <option value="year">연도 최신순</option>
                  <option value="filled">완성도순</option>
                </select>
              </div>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[760px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="w-44 px-2.5 py-2 font-semibold">연구자(연도)</th>
                      {columns.map((c) => (
                        <th key={c.key} className="px-2.5 py-2 font-semibold">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.id} className="border-t align-top">
                        <td className="px-2.5 py-2">
                          <p className="font-medium leading-snug">{paperLabel(p)}</p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground" title={p.title}>
                            {p.title}
                          </p>
                          {savingIds.has(p.id) && (
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Loader2 size={9} className="animate-spin" /> 저장 중
                            </p>
                          )}
                        </td>
                        {columns.map((c) =>
                          c.editable ? (
                            <td key={c.key} className="px-1.5 py-1.5">
                              <textarea
                                value={cellValue(p, c.key as EditableKey)}
                                readOnly={readOnly}
                                rows={2}
                                placeholder={readOnly ? "" : `${c.label} 입력`}
                                onChange={(e) =>
                                  setDrafts((d) => ({ ...d, [draftKey(p.id, c.key as EditableKey)]: e.target.value }))
                                }
                                onBlur={() => void saveCell(p, c.key as EditableKey)}
                                className="min-h-[52px] w-full resize-y rounded-lg border bg-background p-1.5 text-[11px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 read-only:opacity-60"
                              />
                            </td>
                          ) : (
                            <td key={c.key} className="px-2 py-2 align-top">
                              <p className="min-w-[80px] text-[11px] leading-relaxed text-foreground/80">
                                {readonlyCellValue(p, c.key) || (
                                  <span className="text-muted-foreground/60">
                                    {c.key === "variables" ? "논문 상세에서 변인 입력" : "—"}
                                  </span>
                                )}
                              </p>
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                💡 팁: 열마다 같은 수준으로 짧게(핵심어 중심) 쓰면 표가 읽기 좋아집니다 — &lsquo;무엇이 밝혀졌고, 무엇이
                엇갈리며, 무엇이 비어 있는지&rsquo;가 행 사이에서 보이면 성공입니다.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

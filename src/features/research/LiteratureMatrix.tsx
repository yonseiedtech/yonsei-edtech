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
import { Table2, Copy, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useResearchPapers, useUpdateResearchPaper } from "./useResearchPapers";
import { MATRIX_COLUMNS, type MatrixColumnKey, hasMatrixData, paperLabel, buildMatrixTable } from "./literature-matrix";
import type { User, ResearchPaper } from "@/types";

export default function LiteratureMatrix({ user, readOnly }: { user: User; readOnly?: boolean }) {
  const { papers, isLoading } = useResearchPapers(user.id);
  const update = useUpdateResearchPaper();
  const [open, setOpen] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // 셀 편집 버퍼 — `${paperId}:${col}` → 값 (blur 시 저장 후 제거)
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const rows = useMemo(
    () =>
      (papers as ResearchPaper[])
        .filter((p) => !p.isDraft)
        .sort((a, b) => {
          const an = (a.authors ?? a.title ?? "").localeCompare(b.authors ?? b.title ?? "", "ko");
          if (an !== 0) return an;
          return (a.year ?? 0) - (b.year ?? 0);
        }),
    [papers],
  );
  const filledCount = useMemo(() => rows.filter(hasMatrixData).length, [rows]);

  function draftKey(id: string, col: MatrixColumnKey) {
    return `${id}:${col}`;
  }
  function cellValue(p: ResearchPaper, col: MatrixColumnKey): string {
    const k = draftKey(p.id, col);
    return k in drafts ? drafts[k] : (p[col] ?? "");
  }

  async function saveCell(p: ResearchPaper, col: MatrixColumnKey) {
    const k = draftKey(p.id, col);
    if (!(k in drafts)) return;
    const next = drafts[k];
    setDrafts((d) => {
      const { [k]: _omit, ...rest } = d;
      return rest;
    });
    if (next.trim() === (p[col] ?? "").trim()) return;
    setSavingId(p.id);
    try {
      await update.mutateAsync({ id: p.id, data: { [col]: next.trim() } });
    } catch {
      toast.error("셀 저장에 실패했습니다 — 잠시 후 다시 시도하세요.");
    } finally {
      setSavingId((cur) => (cur === p.id ? null : cur));
    }
  }

  async function copyTable() {
    const text = buildMatrixTable(rows);
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
                <button
                  type="button"
                  onClick={() => void copyTable()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Copy size={11} />
                  비교표 텍스트 복사
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[760px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="w-44 px-2.5 py-2 font-semibold">연구자(연도)</th>
                      {MATRIX_COLUMNS.map((c) => (
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
                          {savingId === p.id && (
                            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Loader2 size={9} className="animate-spin" /> 저장 중
                            </p>
                          )}
                        </td>
                        {MATRIX_COLUMNS.map((c) => (
                          <td key={c.key} className="px-1.5 py-1.5">
                            <textarea
                              value={cellValue(p, c.key)}
                              readOnly={readOnly}
                              rows={2}
                              placeholder={readOnly ? "" : `${c.label} 입력`}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [draftKey(p.id, c.key)]: e.target.value }))
                              }
                              onBlur={() => void saveCell(p, c.key)}
                              className="min-h-[52px] w-full resize-y rounded-lg border bg-background p-1.5 text-[11px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 read-only:opacity-60"
                            />
                          </td>
                        ))}
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

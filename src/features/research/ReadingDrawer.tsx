"use client";

/**
 * 읽기 서랍 (2026-06-13, 파이프라인 P1) — Reading-to-Write Bridge
 *
 * 논문 에디터 안에서 내 논문 읽기 노트(research_papers)를 검색·열람하고,
 * 인용 스텁과 노트 요지를 클립보드로 복사해 단락에 붙여넣는다.
 * 장 컨텍스트에 따라 우선 표시 필드가 달라진다:
 *   이론적 배경 → 주요 결과·변인 / 연구 방법 → 방법론 / 서론 → 내 연구와의 관련.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronRight, Copy, Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { researchPapersApi } from "@/lib/bkend";
import { logEditorEvent } from "./editor-telemetry";
import type { ResearchPaper, WritingPaperChapterKey } from "@/types";

interface Props {
  userId: string;
  chapter: WritingPaperChapterKey;
}

/** 첫 저자 + "외" 형태의 국문 인용 이름 */
function citeName(authors?: string): string {
  if (!authors?.trim()) return "저자미상";
  const parts = authors.split(/[,;·]/).map((a) => a.trim()).filter(Boolean);
  if (parts.length === 0) return "저자미상";
  return parts.length === 1 ? parts[0] : `${parts[0]} 외`;
}

/** 장 컨텍스트별 우선 표시 필드 */
function primaryNote(p: ResearchPaper, chapter: WritingPaperChapterKey): { label: string; text: string } | null {
  const candidates: { label: string; text?: string }[] =
    chapter === "method"
      ? [
          { label: "방법론", text: p.methodology },
          { label: "주요 결과", text: p.findings },
        ]
      : chapter === "intro"
        ? [
            { label: "내 연구와의 관련", text: p.myConnection },
            { label: "통찰", text: p.insights },
            { label: "주요 결과", text: p.findings },
          ]
        : [
            { label: "주요 결과", text: p.findings },
            { label: "통찰", text: p.insights },
            { label: "내 연구와의 관련", text: p.myConnection },
          ];
  for (const c of candidates) {
    if (c.text?.trim()) return { label: c.label, text: c.text.trim() };
  }
  return null;
}

function variableSummary(p: ResearchPaper): string {
  const v = p.variables;
  if (!v) return "";
  const parts: string[] = [];
  if (v.independent?.length) parts.push(`독립: ${v.independent.join("·")}`);
  if (v.dependent?.length) parts.push(`종속: ${v.dependent.join("·")}`);
  if (v.mediator?.length) parts.push(`매개: ${v.mediator.join("·")}`);
  if (v.moderator?.length) parts.push(`조절: ${v.moderator.join("·")}`);
  return parts.join(" / ");
}

export default function ReadingDrawer({ userId, chapter }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [completedOnly, setCompletedOnly] = useState(false);

  const { data: papers = [], isLoading } = useQuery({
    queryKey: ["research_papers", userId],
    queryFn: async () => (await researchPapersApi.list(userId)).data as ResearchPaper[],
    enabled: open && !!userId,
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return papers
      .filter((p) => !p.isDraft)
      .filter((p) => (completedOnly ? p.readStatus === "completed" : true))
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.title} ${p.authors ?? ""} ${(p.tags ?? []).join(" ")}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 30);
  }, [papers, query, completedOnly]);

  function copy(text: string, message: string) {
    void navigator.clipboard.writeText(text).then(
      () => toast.success(message),
      () => toast.error("복사에 실패했습니다."),
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-success/20 bg-success/5">
      <button
        type="button"
        onClick={() => {
          if (!open) logEditorEvent(userId, "reading_drawer_open");
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-success">
          <BookOpen size={13} />
          읽기 서랍 — 내가 읽은 논문을 인용으로
          <span className="font-normal text-success/70">
            (클릭하면 복사돼요)
          </span>
        </span>
        <ChevronRight
          size={14}
          className={cn(
            "shrink-0 text-success/70 transition-transform",
            open && "rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-success/20 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="제목·저자·태그 검색"
                className="h-7 pl-7 text-[11px]"
              />
            </div>
            <button
              type="button"
              onClick={() => setCompletedOnly((v) => !v)}
              className={cn(
                "shrink-0 rounded-md border px-2 py-1 text-[10px] transition-colors",
                completedOnly ? "border-success bg-success text-white" : "bg-card hover:bg-muted",
              )}
            >
              완독만
            </button>
          </div>

          {isLoading && <p className="py-3 text-center text-[11px] text-muted-foreground">불러오는 중…</p>}

          {!isLoading && filtered.length === 0 && (
            <p className="py-3 text-center text-[11px] text-muted-foreground">
              {papers.length === 0 ? (
                <>
                  아직 읽기 노트가 없습니다 —{" "}
                  <Link href="/mypage/research?tab=reading" className="text-success underline">
                    논문 읽기
                  </Link>
                  에서 읽은 논문을 정리하면 여기서 바로 인용할 수 있어요.
                </>
              ) : (
                "검색 결과가 없습니다."
              )}
            </p>
          )}

          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filtered.map((p) => {
              const cite = `${citeName(p.authors)}(${p.year ?? "____"})`;
              const citeParen = `(${citeName(p.authors).replace(" 외", " 외")}${p.year ? `, ${p.year}` : ""})`;
              const note = primaryNote(p, chapter);
              const vars = chapter !== "method" ? variableSummary(p) : "";
              return (
                <li key={p.id} className="rounded-lg bg-card/70 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[11px] font-semibold leading-snug">
                      {p.title}
                      {typeof p.rating === "number" && (
                        <span className="ml-1 inline-flex items-center gap-0.5 text-[9px] font-normal text-warning">
                          <Star size={8} className="fill-current" />
                          {p.rating}
                        </span>
                      )}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {p.readStatus === "completed" ? "완독" : p.readStatus === "reading" ? "읽는 중" : "예정"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {citeName(p.authors)} ({p.year ?? "연도?"}){p.venue ? ` · ${p.venue}` : ""}
                  </p>
                  {note && (
                    <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-foreground/80">
                      <span className="font-semibold text-success">{note.label} · </span>
                      {note.text}
                    </p>
                  )}
                  {vars && <p className="mt-0.5 text-[10px] text-muted-foreground">{vars}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => copy(cite, `인용 "${cite}" 복사 — 단락에 붙여넣으세요.`)}
                      className="inline-flex items-center gap-1 rounded-full border border-success/40 px-2 py-0.5 text-[10px] text-success transition-colors hover:bg-success hover:text-white"
                    >
                      <Copy size={9} />
                      {cite}
                    </button>
                    {note && (
                      <button
                        type="button"
                        onClick={() =>
                          copy(`${note.text}${citeParen}.`, "요지+인용이 복사되었습니다 — 내 문장으로 다듬어 쓰세요.")
                        }
                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-success/40 px-2 py-0.5 text-[10px] text-success transition-colors hover:bg-success hover:text-white"
                      >
                        <Copy size={9} />
                        요지+인용 복사
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-[10px] text-muted-foreground">
            복사한 요지는 그대로 옮기지 말고 내 문장으로 종합하세요 — 선행연구 고찰은 나열이 아니라 종합입니다.
          </p>
        </div>
      )}
    </div>
  );
}

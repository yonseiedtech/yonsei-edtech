"use client";

import { Badge } from "@/components/ui/badge";
import { Star, Clock, BookOpen, Pencil, Trash2, ExternalLink, GraduationCap, FileText, CheckCircle2 } from "lucide-react";
import type { ResearchPaper, PaperReadStatus } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  paper: ResearchPaper;
  onEdit: () => void;
  onDelete: () => void;
  /** 카드 내 인라인 업데이트(읽기 상태 토글 등). 옵셔널 — 미제공 시 토글 비활성. */
  onQuickUpdate?: (patch: Partial<ResearchPaper>) => void | Promise<void>;
}

const READ_STATUS_LABEL: Record<PaperReadStatus, { label: string; icon: typeof Clock; color: string }> = {
  to_read: { label: "읽을 예정", icon: Clock, color: "bg-amber-50 text-amber-700 border-amber-200" },
  reading: { label: "읽는 중", icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "완독", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

const STATUS_CYCLE: PaperReadStatus[] = ["to_read", "reading", "completed"];
function nextStatus(current: PaperReadStatus | undefined): PaperReadStatus {
  if (!current) return "reading";
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

export default function ResearchPaperCard({ paper, onEdit, onDelete, onQuickUpdate }: Props) {
  const isThesis = paper.paperType === "thesis";
  const TypeIcon = isThesis ? GraduationCap : FileText;
  const updatedDate = paper.updatedAt ? new Date(paper.updatedAt) : null;
  const daysAgo = updatedDate
    ? Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const status = paper.readStatus ? READ_STATUS_LABEL[paper.readStatus] : READ_STATUS_LABEL.to_read;
  const canToggleStatus = !!onQuickUpdate;

  function handleStatusToggle() {
    if (!onQuickUpdate) return;
    const next = nextStatus(paper.readStatus);
    onQuickUpdate({ readStatus: next });
  }

  // 학술논문 권/호/페이지를 한 줄로 정리
  const academicMeta = !isThesis
    ? [
        paper.volume ? `${paper.volume}권` : null,
        paper.issue ? `${paper.issue}호` : null,
        paper.pages ? `pp. ${paper.pages}` : null,
      ].filter(Boolean).join(" · ")
    : "";

  const variableSummary = (() => {
    if (!paper.variables) return null;
    const parts: string[] = [];
    if (paper.variables.independent?.length) parts.push(`독립 ${paper.variables.independent.length}`);
    if (paper.variables.dependent?.length) parts.push(`종속 ${paper.variables.dependent.length}`);
    if (paper.variables.mediator?.length) parts.push(`매개 ${paper.variables.mediator.length}`);
    if (paper.variables.moderator?.length) parts.push(`조절 ${paper.variables.moderator.length}`);
    if (paper.variables.control?.length) parts.push(`통제 ${paper.variables.control.length}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  return (
    <article className="group rounded-2xl border bg-white p-5 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className={isThesis ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}>
            <TypeIcon size={11} className="mr-1" />
            {isThesis ? `학위논문${paper.thesisLevel === "master" ? " · 석사" : paper.thesisLevel === "doctoral" ? " · 박사" : ""}` : "학술논문"}
          </Badge>
          {canToggleStatus ? (
            <button
              type="button"
              onClick={handleStatusToggle}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition hover:scale-105",
                status.color
              )}
              title="클릭하여 다음 상태로 전환 (읽을 예정 → 읽는 중 → 완독)"
            >
              <status.icon size={10} />
              {status.label}
            </button>
          ) : (
            <Badge variant="outline" className={`text-[10px] ${status.color}`}>
              <status.icon size={10} className="mr-1" />
              {status.label}
            </Badge>
          )}
          {paper.rating && (
            <span className="inline-flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: paper.rating }).map((_, i) => (
                <Star key={i} size={11} fill="currentColor" strokeWidth={0} />
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="편집"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="삭제"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h4 className="mt-2 line-clamp-2 text-base font-bold leading-snug">
        {paper.title || <span className="text-muted-foreground">(제목 없음)</span>}
      </h4>

      {(paper.authors || paper.year || paper.venue || academicMeta) && (
        <p className="mt-1 text-xs text-muted-foreground">
          {[paper.authors, paper.year, paper.venue, academicMeta || null].filter(Boolean).join(" · ")}
        </p>
      )}

      {variableSummary && (
        <p className="mt-2 text-[11px] text-muted-foreground">변인: {variableSummary}</p>
      )}

      {paper.findings && (
        <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{paper.findings}</p>
      )}

      {paper.tags && paper.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {paper.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              #{t}
            </span>
          ))}
          {paper.tags.length > 4 && (
            <span className="text-[10px] text-muted-foreground">+{paper.tags.length - 4}</span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {daysAgo !== null && (daysAgo === 0 ? "오늘 수정" : `${daysAgo}일 전 수정`)}
        </span>
        {(paper.url || paper.doi) && (
          <a
            href={paper.url || `https://doi.org/${paper.doi}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            원문 <ExternalLink size={10} />
          </a>
        )}
      </div>
    </article>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Star, Clock, BookOpen, Pencil, Trash2, ExternalLink, GraduationCap, FileText, CheckCircle2, Play, Timer, Square } from "lucide-react";
import type { ResearchPaper, PaperReadStatus } from "@/types";
import { cn } from "@/lib/utils";
import { useStudyTimerStore } from "./study-timer/study-timer-store";
import { useCreateSession, usePaperTotalMinutes } from "./study-timer/useStudySessions";
import { toast } from "sonner";

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
  const { active, start: startTimer, stop: stopTimer } = useStudyTimerStore();
  const { mutateAsync: createSession } = useCreateSession();
  const totalMinutes = usePaperTotalMinutes(paper.id);
  const isTimerActive = active?.paperId === paper.id;

  async function handleStartTimer() {
    if (active) {
      toast.error("이미 진행 중인 세션이 있습니다");
      return;
    }
    try {
      const session = await createSession({
        type: "reading",
        paperId: paper.id,
        targetTitle: paper.title || "(제목 없음)",
      });
      startTimer({
        id: session.id,
        type: "reading",
        paperId: paper.id,
        targetTitle: paper.title || "(제목 없음)",
        startTime: Date.now(),
      });
    } catch {
      toast.error("타이머 시작에 실패했습니다");
    }
  }

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
          <Badge variant="secondary" className={isThesis ? "bg-blue-50 text-blue-700" : "bg-blue-50 text-blue-700"}>
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

      {(paper.readStartedAt || paper.readCompletedAt) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {paper.readStartedAt && (
            <span>시작 {paper.readStartedAt}</span>
          )}
          {paper.readCompletedAt && (
            <span>· 완독 {paper.readCompletedAt}</span>
          )}
          {(() => {
            if (!paper.readStartedAt || !paper.readCompletedAt) return null;
            const s = Date.parse(paper.readStartedAt);
            const e = Date.parse(paper.readCompletedAt);
            if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return null;
            const days = Math.round((e - s) / 86400000);
            return <span className="text-emerald-700">· 소요 {days}일</span>;
          })()}
        </div>
      )}

      {totalMinutes > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-primary">
          <Timer size={11} />
          <span>총 {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}시간 ${Math.round(totalMinutes % 60)}분` : `${Math.round(totalMinutes)}분`}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
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
        {!isTimerActive && paper.readStatus !== "completed" && (
          <button
            type="button"
            onClick={handleStartTimer}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20"
          >
            <Play size={10} />
            {paper.readStatus === "reading" ? "읽기 계속" : "읽기 시작"}
          </button>
        )}
        {isTimerActive && (
          <div className="inline-flex items-center gap-1">
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary animate-pulse">
              <Timer size={10} />
              측정 중
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                stopTimer();
                toast.success(`「${paper.title || "(제목 없음)"}」 읽기 종료됨`);
              }}
              className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
              aria-label="읽기 측정 종료"
              title="읽기 측정 종료"
            >
              <Square size={10} />
              종료
            </button>
          </div>
        )}
      </div>
    </article>
  );
}

"use client";

/**
 * TopicDeepDiveSyncPanel — 핵심 주제(주제 탐색) → 연구보고서 불러오기 패널 (P0-2, 2026-08-05)
 *
 * 주제 탐색에서 저장·지정한 "핵심 주제"의 근거(seed: 대상·소재·접근)를 읽어
 * 연구보고서의 대응 필드를 채운다. ResearchQuestionSyncPanel/VariableSyncPanel 의
 * import/append 비파괴 패턴을 따른다 — **빈 칸만 채우고, 사용자가 이미 입력한 값은 덮어쓰지 않는다.**
 *
 * 최소 매핑(P0-2): seed.topic → fieldSubject, seed.target → fieldAudience,
 *                  seed.approach → researchApproach. (전 필드 매핑은 P1-2에서 확장)
 * 데이터: users.savedTopicDirections[].seed (신규 컬렉션·rules 불필요).
 */

import { Sparkles, ListPlus } from "lucide-react";
import { toast } from "sonner";
import { useCoreTopic } from "@/features/research/topic-explorer/useSavedTopics";
import { RESEARCH_APPROACH_LABELS, type ResearchApproach } from "@/types/research-report";

/** 주제 탐색 접근 라벨(양적/질적/혼합/개발·설계) → 보고서 연구 접근 패러다임. */
function mapApproach(approach: string | undefined): ResearchApproach {
  switch (approach) {
    case "양적":
      return "analytical";
    case "질적":
      return "generative";
    case "혼합":
      return "mixed_methods";
    case "개발·설계":
      return "generative";
    default:
      return "";
  }
}

export interface DeepDivePatch {
  fieldSubject?: string;
  fieldAudience?: string;
  researchApproach?: ResearchApproach;
}

interface Props {
  readOnly?: boolean;
  /** 현재 보고서 값 — 빈 칸 판정용 */
  current: { fieldSubject: string; fieldAudience: string; researchApproach: ResearchApproach };
  onApply: (patch: DeepDivePatch) => void;
}

export default function TopicDeepDiveSyncPanel({ readOnly = false, current, onApply }: Props) {
  const core = useCoreTopic();
  if (readOnly || !core) return null;

  const seed = core.seed;
  const topicVal = (seed?.topic ?? "").trim();
  const targetVal = (seed?.target ?? seed?.subjectTerms?.[0] ?? "").trim();
  const approachVal = mapApproach(seed?.approach ?? core.approach);
  const approachLabel = approachVal ? RESEARCH_APPROACH_LABELS[approachVal] : "";

  // 비파괴: 값이 있고(offer) 현재 비어 있는(empty) 필드만 채움
  const patch: DeepDivePatch = {};
  if (topicVal && !current.fieldSubject.trim()) patch.fieldSubject = topicVal;
  if (targetVal && !current.fieldAudience.trim()) patch.fieldAudience = targetVal;
  if (approachVal && !current.researchApproach) patch.researchApproach = approachVal;
  const fillKeys = Object.keys(patch) as (keyof DeepDivePatch)[];
  const hasFill = fillKeys.length > 0;

  // 미리보기 항목 (제안값 + 이미 채워졌는지)
  const rows: { label: string; value: string; willFill: boolean }[] = [];
  if (topicVal) rows.push({ label: "교과/학습 주제", value: topicVal, willFill: !current.fieldSubject.trim() });
  if (targetVal) rows.push({ label: "대상 학습자", value: targetVal, willFill: !current.fieldAudience.trim() });
  if (approachLabel) rows.push({ label: "연구 접근", value: approachLabel, willFill: !current.researchApproach });

  function handleImport() {
    if (!hasFill) return;
    onApply(patch);
    toast.success(`핵심 주제에서 ${fillKeys.length}개 항목을 불러왔습니다. 자유롭게 수정할 수 있어요.`);
  }

  return (
    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="mt-0.5 text-primary" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">핵심 주제에서 불러오기</p>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              주제 탐색에서 지정한 핵심 주제 &ldquo;{core.label}&rdquo; 의 대상·소재·접근을 아래 빈 칸에 채웁니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleImport}
          disabled={!hasFill}
          title="빈 칸만 채우며, 이미 입력한 값은 덮어쓰지 않습니다."
          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2.5 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ListPlus size={13} />
          빈 칸 채우기
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-primary/15 pt-2.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-1.5 text-[11px]">
              <span className="min-w-[68px] font-medium text-muted-foreground">{r.label}</span>
              <span className="flex-1 truncate text-foreground">{r.value}</span>
              <span
                className={
                  r.willFill
                    ? "rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                    : "rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground"
                }
              >
                {r.willFill ? "채움" : "입력됨"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {!hasFill && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          핵심 주제의 항목이 이미 모두 입력되어 있어 채울 빈 칸이 없습니다.
        </p>
      )}
    </div>
  );
}

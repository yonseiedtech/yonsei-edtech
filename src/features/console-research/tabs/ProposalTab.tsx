"use client";

import { useState } from "react";
import type { ResearchProposal } from "@/types";
import { DetailBlock } from "../components/DetailBlock";
import { KV } from "../components/KV";
import { ProgressBar } from "../components/ProgressBar";
import { ToggleFullButton } from "../components/ToggleFullButton";
import { FullField } from "../components/FullField";
import { formatDate } from "../utils";

export function ProposalTab({
  proposal,
  proposalProgress,
}: {
  proposal?: ResearchProposal;
  proposalProgress: number;
}) {
  const [showFull, setShowFull] = useState(false);
  if (!proposal) {
    return (
      <DetailBlock title="연구 계획서">
        <p className="text-xs text-muted-foreground">아직 작성된 계획서가 없습니다.</p>
      </DetailBlock>
    );
  }
  return (
    <div className="space-y-3">
      <DetailBlock title="연구 계획서">
        <div className="space-y-2 text-xs">
          <KV label="국문 제목" value={proposal.titleKo} />
          <KV label="영문 제목" value={proposal.titleEn} />
          <KV label="연구 목적" value={proposal.purpose?.slice(0, 120)} />
          <KV label="연구 범위" value={proposal.scope?.slice(0, 120)} />
          <KV label="연구 방법" value={proposal.method?.slice(0, 120)} />
          <KV
            label="참고문헌"
            value={`${proposal.referencePaperIds?.length ?? 0}편`}
          />
          <div className="pt-1 text-[11px] text-muted-foreground">
            마지막 수정: {formatDate(proposal.updatedAt ?? proposal.lastSavedAt)}
          </div>
          <div className="pt-1">
            <ProgressBar value={proposalProgress} />
            <div className="mt-1 text-[10px] text-muted-foreground">진행률 {proposalProgress}%</div>
          </div>
          <div className="pt-2">
            <ToggleFullButton showFull={showFull} setShowFull={setShowFull} />
          </div>
        </div>
      </DetailBlock>

      {showFull && (
        <DetailBlock title="연구 계획서 전체">
          <div className="space-y-3 text-[11px]">
            <FullField label="국문 제목" value={proposal.titleKo} />
            <FullField label="영문 제목" value={proposal.titleEn} />
            <FullField label="연구 목적" value={proposal.purpose} />
            <FullField label="연구 범위" value={proposal.scope} />
            <FullField label="연구 방법" value={proposal.method} />
            <FullField label="연구 내용" value={proposal.content} />
          </div>
        </DetailBlock>
      )}
    </div>
  );
}

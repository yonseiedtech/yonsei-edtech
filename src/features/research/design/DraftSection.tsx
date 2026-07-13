"use client";

/** 8. 연구방법 초안 미리보기 (2026-07-13, M1 분리 — 동작·UI 불변) */

import Link from "next/link";
import { ClipboardList, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DraftSection({
  draft,
  readOnly,
  applyingProposal,
  onApplyToProposal,
  onCopyDraft,
}: {
  draft: string;
  readOnly: boolean;
  applyingProposal: boolean;
  onApplyToProposal: () => void;
  onCopyDraft: () => void;
}) {
  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        위 작성 내용을 학위논문 &lsquo;III. 연구방법&rsquo; 아웃라인으로 자동 조립했습니다. 복사해 계획서·논문 작성 탭에서 이어 쓰세요.
      </p>
      <div className="flex flex-wrap gap-2">
        {!readOnly && (
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={onApplyToProposal}
            disabled={applyingProposal}
          >
            <ClipboardList size={12} className="mr-1" /> 연구계획서 연구방법에 반영
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCopyDraft}>
          <Copy size={12} className="mr-1" /> 초안 복사
        </Button>
        <Link
          href="/mypage/research?tab=proposal"
          className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-accent"
        >
          <ClipboardList size={12} /> 연구 계획서에서 이어 쓰기
        </Link>
        <Link
          href="/mypage/research?tab=writing"
          className="inline-flex h-8 items-center gap-1 rounded-md border bg-card px-2.5 text-xs font-medium hover:bg-accent"
        >
          <Sparkles size={12} /> 논문 작성에서 이어 쓰기
        </Link>
      </div>
      <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-[11px] leading-relaxed text-foreground">
        {draft}
      </pre>
    </>
  );
}

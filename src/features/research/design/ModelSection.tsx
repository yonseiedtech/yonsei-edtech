"use client";

/** 2. 연구 모형 (2026-07-13, M1 분리 — 동작·UI 불변) */

import Link from "next/link";
import { Wand2, Link2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ResearchModelDoc } from "@/lib/research-models-api";
import type { FormState } from "./types";

export function ModelSection({
  form,
  readOnly,
  model,
  onLinkModel,
}: {
  form: FormState;
  readOnly: boolean;
  model: ResearchModelDoc | null | undefined;
  onLinkModel: () => void;
}) {
  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">
        변인과 관계를 다이어그램으로 정리한 &lsquo;연구 모형&rsquo;을 연결하면 대상·도구·분석 설계가 일관됩니다.
      </p>
      {model ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
          <div className="min-w-0 text-xs">
            <p className="font-medium text-foreground">{model.title || "내 연구 모형"}</p>
            <p className="text-muted-foreground">
              변인 {model.data?.nodes?.length ?? 0}개 · 관계 {model.data?.edges?.length ?? 0}개
              {form.modelId ? " · 연결됨" : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!readOnly && !form.modelId && (
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onLinkModel}>
                <Link2 size={12} className="mr-1" /> 이 모형 연결
              </Button>
            )}
            <Link
              href="/research-model"
              className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] hover:bg-accent"
            >
              모형 편집 <ExternalLink size={10} />
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4 text-center">
          <p className="text-xs text-muted-foreground">아직 연구 모형이 없습니다.</p>
          <Link
            href="/research-model"
            className="mt-2 inline-flex items-center gap-1 rounded-md border bg-card px-2.5 py-1.5 text-[11px] font-medium hover:bg-accent"
          >
            <Wand2 size={12} /> 연구 모형 그리기
          </Link>
        </div>
      )}
    </>
  );
}

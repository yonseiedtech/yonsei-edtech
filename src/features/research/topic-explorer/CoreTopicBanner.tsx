"use client";

/**
 * 핵심 주제 배너 (2026-07-30 사용자 요청)
 *
 * 주제 탐색에서 지정한 "핵심 주제"를 논문 읽기·연구보고서 등 관련 화면 상단에
 * 노출한다. 핵심 주제가 없으면 아무것도 렌더하지 않는다(미노출).
 * 조회는 공용 훅 useCoreTopic() 재사용.
 */

import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { useCoreTopic } from "./useSavedTopics";

interface Props {
  /** 우측 이동 링크 목적지 (기본: 주제 탐색 탭) */
  href?: string;
}

export default function CoreTopicBanner({ href = "/mypage/research?tab=explore" }: Props) {
  const core = useCoreTopic();
  if (!core) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-warning/30 bg-warning/5 p-3.5">
      <Star size={16} className="mt-0.5 shrink-0 fill-warning text-warning" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-warning">내 핵심 주제</p>
        <p className="mt-0.5 text-sm font-medium leading-snug text-foreground">{core.label}</p>
        {core.approach && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">연구 접근: {core.approach}</p>
        )}
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1 self-center rounded-lg border border-warning/30 bg-card px-2.5 py-1.5 text-[11px] font-medium text-warning transition-colors hover:bg-warning/10"
      >
        주제 탐색 <ArrowRight size={11} />
      </Link>
    </div>
  );
}

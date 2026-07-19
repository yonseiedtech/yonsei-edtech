"use client";

/**
 * CohortKudosSend — 코호트 동기 학습 응원 보내기 블록 (v8-H2).
 *
 * v7-H5 온보딩 CohortSection 의 "이번 주 학습 응원" 블록(헤더 + 안내 + 대상 버튼)을
 * 컴포넌트로 추출해 온보딩·대시보드가 공유한다. 전송 로직은 useCohortKudos 훅.
 *
 * 대상이 없으면 null 렌더(빈 상태 미노출). 순위·비교 없이 양성 전용·주 1회 자연 제한.
 */

import { PartyPopper } from "lucide-react";
import { useCohortKudos } from "./useCohortKudos";
import CohortKudosButtons from "./CohortKudosButtons";
import type { User } from "@/types";

interface Props {
  me: User;
  peers: User[];
  /** 상단 여백 클래스 — 온보딩(mt-5)/대시보드(mt-0) 컨텍스트별 조정 */
  className?: string;
}

export default function CohortKudosSend({ me, peers, className = "mt-5" }: Props) {
  const { kudosTargets, isSent, isSending, sendKudos } = useCohortKudos(me, peers);

  if (kudosTargets.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
        <PartyPopper size={11} aria-hidden /> 이번 주 학습 응원
      </p>
      <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
        이번 주 학습 활동을 이어간 동기예요. 가볍게 응원을 보내보세요. (동기당 주 1회)
      </p>
      <CohortKudosButtons
        targets={kudosTargets}
        isSent={isSent}
        isSending={isSending}
        onSend={sendKudos}
      />
    </div>
  );
}

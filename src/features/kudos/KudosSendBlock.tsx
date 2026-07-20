"use client";

/**
 * KudosSendBlock — 관계 컨텍스트별 "응원 보내기" 블록 (v11-H2).
 *
 * CohortKudosSend(코호트 전용)를 일반화한 목록형 블록. 스터디 참여자·해커톤 팀원 등
 * 여러 대상에게 응원을 보낼 때 재사용한다. 전송/dedup/알림은 useKudosSend 공통 훅,
 * 버튼 UI 는 CohortKudosButtons 를 그대로 재사용한다. 대상이 없으면 null 렌더.
 */

import { PartyPopper } from "lucide-react";
import { useKudosSend, type KudosTarget } from "./useKudosSend";
import CohortKudosButtons from "./CohortKudosButtons";
import type { KudosContext } from "@/types/kudos";

interface Props {
  me: { id: string; name: string } | null | undefined;
  /** 응원 대상 — 호출부가 컨텍스트별로 산정(자기 자신은 제외해서 전달). */
  targets: KudosTarget[];
  context: KudosContext;
  title: string;
  description: string;
  className?: string;
}

export default function KudosSendBlock({
  me,
  targets,
  context,
  title,
  description,
  className = "",
}: Props) {
  const { isSent, isSending, sendKudos } = useKudosSend(me, context);

  // 자기 자신 방어 제거(호출부 누락 대비) + 대상 없으면 미노출.
  const list = me ? targets.filter((t) => t.id && t.id !== me.id) : [];
  if (!me || list.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-primary">
        <PartyPopper size={11} aria-hidden /> {title}
      </p>
      <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">{description}</p>
      <CohortKudosButtons
        targets={list}
        isSent={isSent}
        isSending={isSending}
        onSend={sendKudos}
      />
    </div>
  );
}

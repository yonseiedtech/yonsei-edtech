"use client";

/**
 * KudosInlineButton — 단일 대상 인라인 "응원 보내기" 버튼 (v11-H2).
 *
 * 멘토링 답변 채택처럼 대상이 1명인 컨텍스트에서 한 줄 버튼으로 응원을 보낸다.
 * 전송/dedup/알림은 useKudosSend 공통 훅. 여러 개가 한 화면에 떠도 "kudos-sent"
 * 쿼리를 공유해 react-query 가 중복 조회를 dedup 한다. 이미 보냈으면 비활성.
 */

import { Check, Loader2, PartyPopper } from "lucide-react";
import { useKudosSend, type KudosTarget } from "./useKudosSend";
import type { KudosContext } from "@/types/kudos";

interface Props {
  me: { id: string; name: string } | null | undefined;
  target: KudosTarget;
  context: KudosContext;
  /** 기본 라벨 문구 */
  label?: string;
  className?: string;
}

export default function KudosInlineButton({
  me,
  target,
  context,
  label = "응원 보내기",
  className = "",
}: Props) {
  const { isSent, isSending, sendKudos } = useKudosSend(me, context);

  // 자기 자신·미로그인·대상 없음이면 미노출.
  if (!me || !target.id || target.id === me.id) return null;

  const sent = isSent(target.id);
  const sending = isSending(target.id);

  return (
    <button
      type="button"
      onClick={() => sendKudos(target)}
      disabled={sent || sending}
      aria-label={`${target.name}님에게 응원 보내기`}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
        sent
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
      } ${sending ? "opacity-60" : ""} ${className}`}
    >
      {sending ? (
        <Loader2 size={10} className="animate-spin" aria-hidden />
      ) : sent ? (
        <>
          <Check size={10} aria-hidden /> 응원함
        </>
      ) : (
        <>
          <PartyPopper size={10} aria-hidden /> {label}
        </>
      )}
    </button>
  );
}

"use client";

/**
 * CohortKudosButtons — 응원 대상 버튼 목록 (순수 표현 컴포넌트, v8-H2).
 *
 * 전송 상태·핸들러는 useCohortKudos 훅에서 주입받는다. 온보딩 CohortKudosSend 와
 * 대시보드 KudosWidget 이 동일한 버튼 UI 를 공유한다(중복 방지).
 */

import { Check, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { KudosTarget } from "./useKudosSend";

interface Props {
  targets: KudosTarget[];
  isSent: (peerId: string) => boolean;
  isSending: (peerId: string) => boolean;
  onSend: (peer: KudosTarget) => void;
}

export default function CohortKudosButtons({ targets, isSent, isSending, onSend }: Props) {
  return (
    <ul className="flex flex-wrap gap-2">
      {targets.map((p) => {
        const already = isSent(p.id);
        const sending = isSending(p.id);
        return (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onSend(p)}
              disabled={already || sending}
              aria-label={`${p.name}님에게 응원 보내기`}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                already
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
              } ${sending ? "opacity-60" : ""}`}
            >
              <Avatar className="h-5 w-5 shrink-0">
                {p.profileImage && <AvatarImage src={p.profileImage} alt={p.name} />}
                <AvatarFallback className="text-[9px]">{p.name?.[0] ?? "?"}</AvatarFallback>
              </Avatar>
              <span className="max-w-[8rem] truncate font-medium">{p.name}</span>
              {sending ? (
                <Loader2 size={11} className="animate-spin" aria-hidden />
              ) : already ? (
                <span className="inline-flex items-center gap-0.5 font-medium">
                  <Check size={11} aria-hidden /> 응원함
                </span>
              ) : (
                <span aria-hidden>👏</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

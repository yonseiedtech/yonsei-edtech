"use client";

/**
 * KudosWidget — 대시보드 응원 위젯 (v8-H2).
 *
 * v7-H5 에서 온보딩 CohortSection 에만 있던 응원 루프를 고빈도 화면(대시보드)으로 완성한다.
 *  (1) 이번 주 받은 응원 요약(수 + 발신자 이름) — useReceivedKudos
 *  (2) 코호트 동기에게 응원 보내기 — useCohortKudos + CohortKudosButtons (온보딩과 로직 공유)
 *
 * 개인 학습 수치는 노출하지 않는다(활동 사실 응원만·순위 없음). 받은 응원·보낼 대상이
 * 모두 없으면 null 렌더(데이터 없으면 미노출).
 */

import { PartyPopper } from "lucide-react";
import WidgetCard from "@/components/ui/widget-card";
import { useAuthStore } from "@/features/auth/auth-store";
import { useCohortPeers } from "@/features/kudos/useCohortPeers";
import { useCohortKudos } from "@/features/kudos/useCohortKudos";
import { useReceivedKudos } from "@/features/kudos/useReceivedKudos";
import CohortKudosButtons from "@/features/kudos/CohortKudosButtons";
import EmptyState from "@/components/ui/empty-state";

export default function KudosWidget() {
  const { user } = useAuthStore();
  const { peers } = useCohortPeers(user);
  const { kudosTargets, isSent, isSending, sendKudos } = useCohortKudos(user, peers);
  const { thisWeekCount, thisWeekSenders } = useReceivedKudos(user?.id);

  if (!user) return null;
  // 받은 응원도 없고 보낼 대상도 없으면 미노출
  if (thisWeekCount === 0 && kudosTargets.length === 0) return null;

  const senderPreview = thisWeekSenders.slice(0, 3).join(", ");
  const extraSenders = thisWeekSenders.length - 3;

  return (
    <WidgetCard title="이번 주 응원" icon={PartyPopper} semantic="default">
      {thisWeekCount > 0 ? (
        <div className="mt-3 rounded-xl border bg-card p-4">
          <p className="text-sm">
            이번 주 동기에게{" "}
            <span className="font-bold text-primary">{thisWeekCount}개</span>의 응원을 받았어요 👏
          </p>
          {thisWeekSenders.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {senderPreview}
              {extraSenders > 0 ? ` 외 ${extraSenders}명` : ""}님이 보냈어요.
            </p>
          )}
        </div>
      ) : (
        <EmptyState
          compact
          icon={PartyPopper}
          title="아직 이번 주 받은 응원이 없어요"
          description="먼저 동기를 응원해보는 건 어때요?"
          className="mt-3 bg-transparent"
        />
      )}

      {kudosTargets.length > 0 && (
        <div className="mt-4">
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
      )}
    </WidgetCard>
  );
}

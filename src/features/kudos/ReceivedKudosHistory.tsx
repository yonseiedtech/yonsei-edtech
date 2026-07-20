"use client";

/**
 * ReceivedKudosHistory — 마이페이지 "받은 응원" 이력 소섹션 (v8-H2).
 *
 * 내 활동 탭 하단에 노출(본인만). 코호트 동기가 보낸 학습 응원을 발신자·주차와 함께 모아본다.
 * 개인 학습 수치는 노출하지 않는다("활동 사실"에 대한 응원만). 받은 응원이 없으면 null 렌더.
 */

import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useReceivedKudos } from "./useReceivedKudos";
import type { KudosContext } from "@/types/kudos";

/** 주차 키(월요일 YYYY-MM-DD) → "M월 D일 주" 라벨 */
function weekLabel(weekKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekKey);
  if (!m) return weekKey;
  return `${Number(m[2])}월 ${Number(m[3])}일 주`;
}

/** F4: context 필드 → 표시 라벨 ("cohort" 하위호환 포함) */
function contextLabel(ctx?: KudosContext): string {
  if (ctx === "mentoring") return "멘토링 감사";
  if (ctx === "study") return "스터디 동료";
  if (ctx === "hackathon") return "해커톤 팀원";
  return "학습 활동";
}

export default function ReceivedKudosHistory({ userId }: { userId: string }) {
  const { all, isLoading } = useReceivedKudos(userId);

  if (isLoading || all.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
        <PartyPopper size={15} className="text-primary" aria-hidden />
        받은 응원 ({all.length})
      </h3>
      <ul className="space-y-2">
        {all.map((k) => (
          <li
            key={k.id}
            className="flex items-center gap-3 rounded-2xl border bg-card px-5 py-3.5"
          >
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs">{k.fromName?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {/* F4: fromUserId → 프로필 링크 */}
                <Link href={`/profile/${k.fromUserId}`} className="font-semibold hover:text-primary hover:underline">
                  {k.fromName}
                </Link>
                <span className="text-muted-foreground">님이 응원을 보냈어요 👏</span>
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {weekLabel(k.weekKey)} {contextLabel(k.context)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";

/**
 * StaffItems — 운영진 전용: 승인 대기 회원 / 미답변 문의 요약 행.
 * `MyTodosWidget` 에서 분할 (Phase B 단순 추출 — 기능 변경 X).
 */

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SEMANTIC } from "@/lib/design-tokens";

export interface StaffItemsProps {
  pendingMembersCount: number;
  unansweredInquiriesCount: number;
}

export function StaffItems({
  pendingMembersCount,
  unansweredInquiriesCount,
}: StaffItemsProps) {
  if (pendingMembersCount === 0 && unansweredInquiriesCount === 0) {
    return (
      <p className="rounded-md bg-card px-3 py-2 text-[11px] text-muted-foreground">
        처리할 운영 항목이 없습니다.
      </p>
    );
  }
  return (
    <>
      {pendingMembersCount > 0 && (
        <li>
          <Link
            href="/console/members"
            className="flex items-center justify-between rounded-md bg-card px-2.5 py-2 text-[12px] hover:bg-amber-50"
          >
            <span className="font-medium">
              승인 대기 회원 {pendingMembersCount}명
            </span>
            <Badge className={cn(SEMANTIC.warning.chipBg, SEMANTIC.warning.chipText)}>처리 필요</Badge>
          </Link>
        </li>
      )}
      {unansweredInquiriesCount > 0 && (
        <li>
          <Link
            href="/console/inquiries"
            className="flex items-center justify-between rounded-md bg-card px-2.5 py-2 text-[12px] hover:bg-amber-50"
          >
            <span className="font-medium">
              미답변 문의 {unansweredInquiriesCount}건
            </span>
            <Badge className={cn(SEMANTIC.warning.chipBg, SEMANTIC.warning.chipText)}>답변 필요</Badge>
          </Link>
        </li>
      )}
    </>
  );
}

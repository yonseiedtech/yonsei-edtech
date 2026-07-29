"use client";

import { CalendarDays, ShieldCheck, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** 사전 안내 다이얼로그에 표시할 단일 이력 — guest-history-preview 응답과 동일 형태 */
export interface GuestHistoryRecord {
  kind: "activity" | "seminar";
  title: string;
  date: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 입력한 이름 — 안내 문구 인사말용 */
  name: string;
  count: number;
  records: GuestHistoryRecord[];
}

function formatDate(raw: string): string {
  if (!raw) return "";
  // ISO 또는 YYYY-MM-DD 형태에서 날짜 부분만 추출
  return raw.slice(0, 10);
}

/**
 * 잠재회원 Phase B — 회원가입 전 비회원 활동·세미나 이력 사전 안내 팝업.
 * 가입을 막지 않으며, "확인하고 계속" 으로 닫고 정상 진행한다.
 */
export default function GuestHistoryPreviewDialog({
  open,
  onOpenChange,
  name,
  count,
  records,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* 모바일에서 내용 크기에 맞춰 중앙 정렬(전체 높이 점유 방지) */}
      <DialogContent className="top-1/2 bottom-auto my-0 max-h-[calc(100vh-2rem)] -translate-y-1/2 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>이전 활동 이력이 있습니다</DialogTitle>
          <DialogDescription>
            {name ? `${name}님, ` : ""}비회원으로 참여하신 활동·세미나 이력{" "}
            <strong>{count}건</strong>이 있습니다.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {records.map((rec, idx) => (
            <li
              key={`${rec.kind}-${idx}-${rec.title}`}
              className="flex items-start gap-2 rounded-lg border bg-muted/20 p-2.5"
            >
              <Badge variant={rec.kind === "seminar" ? "secondary" : "outline"}>
                {rec.kind === "seminar" ? "세미나" : "활동"}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{rec.title}</p>
                {formatDate(rec.date) && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays size={12} />
                    {formatDate(rec.date)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-start gap-2.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-primary" size={18} aria-hidden="true" />
          <p className="text-sm text-foreground">
            <strong className="font-semibold">가입하면 이 {count}건이 그대로 지켜집니다.</strong>
            <br />
            <span className="text-muted-foreground">
              지금 입력하신 학번·이메일과 일치하는 기록이라, 남은 단계를 마치고 가입을 완료하면
              위 이력이 자동으로 마이페이지 활동에 연동돼요.
            </span>
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            <UserPlus size={16} className="mr-1.5" />
            이 활동 저장하고 가입 이어가기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

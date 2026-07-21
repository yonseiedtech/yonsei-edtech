"use client";

import { useEffect } from "react";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CheckinResult as CheckinResultType } from "@/types";

interface Props {
  result: CheckinResultType;
  onDismiss: () => void;
}

export default function CheckinResult({ result, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (result.success) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border-2 border-success/20 bg-success/5 p-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={28} className="shrink-0 text-success" />
          <div>
            <p className="font-bold text-success">출석 완료</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-sm text-success">{result.attendee.userName}</span>
              <Badge variant="secondary" className="text-[10px]">
                {result.attendee.userGeneration}기
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result.alreadyCheckedIn) {
    const time = result.attendee.checkedInAt
      ? new Date(result.attendee.checkedInAt).toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border-2 border-warning/20 bg-warning/5 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={28} className="shrink-0 text-warning" />
          <div>
            <p className="font-bold text-warning">이미 체크인됨</p>
            <p className="mt-0.5 text-sm text-warning">
              {result.attendee.userName} — {time}에 출석 완료
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border-2 border-destructive/20 bg-destructive/5 p-4">
      <div className="flex items-center gap-3">
        <XCircle size={28} className="shrink-0 text-destructive" />
        <div>
          <p className="font-bold text-destructive">인식 실패</p>
          <p className="mt-0.5 text-sm text-destructive">{result.message}</p>
        </div>
      </div>
    </div>
  );
}

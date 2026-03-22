"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  FileText,
  Sparkles,
  Instagram,
  Mail,
} from "lucide-react";
import type { SeminarStatus } from "@/types";

interface Props {
  seminarId: string;
  computedStatus: SeminarStatus;
  checkinStats: { checkedIn: number; total: number };
  onTemplatePress: () => void;
  onAiGenerate: (format: "press" | "sns" | "email") => void;
}

export default function StaffTools({
  seminarId,
  computedStatus,
  checkinStats,
  onTemplatePress,
  onAiGenerate,
}: Props) {
  const router = useRouter();

  return (
    <div className="mt-6 rounded-2xl border bg-white p-8">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        <Sparkles size={16} />
        운영진 도구
      </h2>
      <div className="flex flex-wrap gap-2">
        {computedStatus === "upcoming" && (
          <Button
            size="sm"
            onClick={() => router.push(`/seminars/${seminarId}/checkin`)}
          >
            <QrCode size={16} className="mr-1" />
            출석 체크 ({checkinStats.checkedIn}/{checkinStats.total})
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={onTemplatePress}>
          <FileText size={16} className="mr-1" />
          보도자료 (템플릿)
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAiGenerate("press")}>
          <Sparkles size={16} className="mr-1" />
          AI 보도자료
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAiGenerate("sns")}>
          <Instagram size={16} className="mr-1" />
          AI SNS
        </Button>
        <Button variant="outline" size="sm" onClick={() => onAiGenerate("email")}>
          <Mail size={16} className="mr-1" />
          AI 초대장
        </Button>
      </div>
    </div>
  );
}

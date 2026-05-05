"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Loader2, Printer, QrCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { conferenceProgramsApi } from "@/lib/bkend";
import {
  CONFERENCE_SESSION_CATEGORY_COLORS,
  CONFERENCE_SESSION_CATEGORY_LABELS,
  type ConferenceProgram,
} from "@/types";
import { buildCheckinToken } from "./ConferenceCheckinScanner";

interface Props {
  activityId: string;
  activityTitle: string;
}

export default function ConferenceCheckinQrBoard({ activityId, activityTitle }: Props) {
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<ConferenceProgram | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await conferenceProgramsApi.listByActivity(activityId);
        if (!cancelled) setProgram(res?.data?.[0] ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 시간표 불러오는 중…
      </div>
    );
  }

  if (!program) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        아직 시간표가 등록되지 않았습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href={`/activities/external/${activityId}/program`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 시간표로 돌아가기
        </Link>
        <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1">
          <Printer className="h-4 w-4" /> 인쇄
        </Button>
      </div>

      <Card className="border-primary/20 bg-primary/5 print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
            <QrCode className="h-5 w-5 text-primary" />
            {activityTitle} · 세션 체크인 QR 보드
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            세션별 QR을 인쇄해 입구에 부착하세요. 회원이 스캔하면 자동으로 참석이 기록됩니다.
          </p>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          체크인 페이지 안내:{" "}
          <code className="rounded bg-background px-1 py-0.5 text-foreground">
            /activities/external/{activityId}/program/checkin
          </code>
        </CardContent>
      </Card>

      {program.days.map((day) => (
        <section key={day.date} className="space-y-3 print:break-after-page">
          <h2 className="text-base font-semibold text-foreground">
            {day.dayLabel ? `${day.dayLabel} · ` : ""}
            {day.date}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">
            {day.sessions.map((s) => (
              <Card key={s.id} className="break-inside-avoid">
                <CardContent className="space-y-2 p-3">
                  <div className="flex items-center justify-center rounded-md border bg-card p-2">
                    <QRCodeSVG
                      value={buildCheckinToken(program.id, s.id)}
                      size={160}
                      fgColor="#0a2e6c"
                      level="M"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge
                        variant="outline"
                        className={CONFERENCE_SESSION_CATEGORY_COLORS[s.category]}
                      >
                        {CONFERENCE_SESSION_CATEGORY_LABELS[s.category]}
                      </Badge>
                      {s.track && <span className="text-[11px] text-muted-foreground">{s.track}</span>}
                    </div>
                    <p className="text-sm font-medium leading-tight">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {s.startTime}~{s.endTime}
                      {s.location ? ` · ${s.location}` : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";
import { useSessions } from "@/features/seminar/useSeminar";
import type { SeminarSession } from "@/types";

interface Props {
  sessions: SeminarSession[];
  seminarId: string;
  isStaff: boolean;
}

export default function SessionProgram({ sessions: propSessions, seminarId, isStaff }: Props) {
  const { sessions: dbSessions } = useSessions(seminarId);
  // DB 컬렉션 우선, 없으면 세미나 내장 배열 폴백
  const sessions = dbSessions.length > 0 ? dbSessions : propSessions;
  const sorted = [...sessions].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="mt-6 rounded-2xl border bg-white p-8">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
        <Clock size={16} />
        세션 프로그램
      </h2>
      {sorted.length > 0 ? (
        <div className="space-y-3">
          {sorted.map((sess, idx) => (
            <div
              key={sess.id}
              className="flex items-start gap-4 rounded-lg border bg-muted/20 px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                {sess.category && (
                  <Badge variant="secondary" className="mb-1 text-xs">
                    {sess.category}
                  </Badge>
                )}
                <p className="font-medium text-sm">{sess.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sess.speaker}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground mt-0.5">
                {sess.time && sess.time !== "미정" ? (
                  <>{sess.time}{sess.endTime ? `~${sess.endTime}` : ""} ({sess.duration}분)</>
                ) : (
                  <span className="text-amber-500">시간 미정</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-6 text-center">
          <Clock size={32} className="text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">등록된 세션이 없습니다.</p>
          {isStaff && (
            <Link href={`/seminars/${seminarId}/lms`}>
              <Button variant="outline" size="sm" className="mt-3">
                <Plus size={14} className="mr-1" />
                세미나 공간에서 세션 추가
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

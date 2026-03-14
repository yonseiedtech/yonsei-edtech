"use client";

import { useSeminarStore } from "./seminar-store";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX } from "lucide-react";

interface Props {
  seminarId: string;
}

function MiniStat({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center">
      <Icon size={18} className={`mx-auto ${color}`} />
      <p className="mt-1 text-xl font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function CheckinDashboard({ seminarId }: Props) {
  const getCheckinStats = useSeminarStore((s) => s.getCheckinStats);
  const getAttendees = useSeminarStore((s) => s.getAttendees);

  const stats = getCheckinStats(seminarId);
  const attendees = getAttendees(seminarId);
  const sorted = [...attendees].sort((a, b) => {
    if (a.checkedIn !== b.checkedIn) return a.checkedIn ? 1 : -1;
    return a.userName.localeCompare(b.userName);
  });

  const percent = stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0;

  return (
    <div>
      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={Users} label="전체" value={stats.total} color="text-blue-600" />
        <MiniStat icon={UserCheck} label="출석" value={stats.checkedIn} color="text-green-600" />
        <MiniStat icon={UserX} label="미출석" value={stats.remaining} color="text-amber-600" />
      </div>

      {/* 프로그레스 바 */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>출석률</span>
          <span>{percent}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* 참석자 목록 */}
      {sorted.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium">참석자 목록</h4>
          <div className="mt-2 max-h-60 divide-y overflow-y-auto rounded-lg border">
            {sorted.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{att.userName}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {att.userGeneration}기
                  </Badge>
                </div>
                {att.checkedIn ? (
                  <div className="flex items-center gap-1.5">
                    <Badge className="bg-green-100 text-[10px] text-green-700">출석</Badge>
                    {att.checkedInAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(att.checkedInAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-amber-600">
                    미출석
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

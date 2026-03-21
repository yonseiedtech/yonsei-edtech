"use client";

import { useState } from "react";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { exportAttendeesCSV } from "./export-csv";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Users, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";

function GenerationBar({ data }: { data: Record<number, number> }) {
  const entries = Object.entries(data)
    .map(([gen, count]) => ({ gen: Number(gen), count }))
    .sort((a, b) => a.gen - b.gen);
  const max = Math.max(...entries.map((e) => e.count), 1);

  return (
    <div className="space-y-1.5">
      {entries.map(({ gen, count }) => (
        <div key={gen} className="flex items-center gap-2 text-xs">
          <span className="w-12 text-right text-muted-foreground">{gen}기</span>
          <div className="h-4 flex-1 rounded bg-muted/30">
            <div
              className="h-full rounded bg-primary/70 transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

function SeminarReport({ seminarId, seminarTitle }: { seminarId: string; seminarTitle: string }) {
  const { attendees } = useAttendees(seminarId);

  const total = attendees.length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // 기수별 분포
  const genDist: Record<number, number> = {};
  for (const a of attendees) {
    genDist[a.userGeneration] = (genDist[a.userGeneration] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <Users size={20} className="mx-auto mb-1 text-blue-500" />
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">신청</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <UserCheck size={20} className="mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold">{checkedIn}</p>
          <p className="text-xs text-muted-foreground">출석</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <UserX size={20} className="mx-auto mb-1 text-amber-500" />
          <p className="text-2xl font-bold">{total - checkedIn}</p>
          <p className="text-xs text-muted-foreground">미출석</p>
        </div>
      </div>

      {/* 출석률 프로그레스 */}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span>출석률</span>
          <span className="font-medium">{rate}%</span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted/30">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* 기수별 분포 */}
      {Object.keys(genDist).length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium">기수별 분포</h4>
          <GenerationBar data={genDist} />
        </div>
      )}

      {/* 참석자 목록 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-medium">참석자 목록</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportAttendeesCSV(seminarTitle, attendees)}
            disabled={attendees.length === 0}
          >
            <Download size={14} className="mr-1" />
            CSV 내보내기
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto rounded-lg border bg-white">
          {attendees.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">참석자가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">기수</th>
                  <th className="px-3 py-2 text-left font-medium">출석</th>
                  <th className="px-3 py-2 text-left font-medium">시각</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendees
                  .sort((a, b) => (a.checkedIn === b.checkedIn ? 0 : a.checkedIn ? -1 : 1))
                  .map((a) => (
                    <tr key={a.id}>
                      <td className="px-3 py-2">{a.userName}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-xs">{a.userGeneration}기</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {a.checkedIn ? (
                          <Badge className="bg-green-50 text-green-700 text-xs">출석</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">미출석</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {a.checkedInAt
                          ? new Date(a.checkedInAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportTab() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const seminar = seminars.find((s) => s.id === selectedId);

  // 전체 세미나 비교
  const completedSeminars = seminars.filter((s) => s.status === "completed");

  return (
    <div className="space-y-6">
      {/* 세미나 선택 */}
      <div>
        <label className="mb-2 block text-sm font-medium">세미나 선택</label>
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value || null)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">-- 세미나를 선택하세요 --</option>
          {seminars.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title} ({s.date}) - {s.status === "completed" ? "완료" : s.status === "upcoming" ? "예정" : "취소"}
            </option>
          ))}
        </select>
      </div>

      {/* 선택된 세미나 리포트 */}
      {seminar && <SeminarReport seminarId={seminar.id} seminarTitle={seminar.title} />}

      {/* 전체 세미나 비교 */}
      {completedSeminars.length > 1 && (
        <div className="rounded-xl border bg-white p-6">
          <h3 className="mb-4 text-sm font-medium">완료된 세미나 참석률 비교</h3>
          <div className="space-y-2">
            {completedSeminars.map((s) => {
              const count = s.attendeeIds.length;
              const maxCount = Math.max(...completedSeminars.map((cs) => cs.attendeeIds.length), 1);
              return (
                <div key={s.id} className="flex items-center gap-3 text-xs">
                  <span className="w-40 truncate text-muted-foreground" title={s.title}>
                    {s.title}
                  </span>
                  <div className="h-4 flex-1 rounded bg-muted/30">
                    <div
                      className="h-full rounded bg-primary/60 transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right text-muted-foreground">{count}명</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

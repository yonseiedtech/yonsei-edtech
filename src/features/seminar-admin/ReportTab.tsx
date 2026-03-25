"use client";

import { useState, useRef } from "react";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { exportAttendeesCSV } from "./export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Users, UserCheck, UserX, FileSpreadsheet, Link, Loader2, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseExcelFile, parseCSVText, extractSheetId, getSheetCsvUrl } from "@/lib/parse-spreadsheet";
import { attendeesApi, profilesApi } from "@/lib/bkend";
import { useQueryClient } from "@tanstack/react-query";

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
  const qc = useQueryClient();
  const excelRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [registering, setRegistering] = useState(false);

  const total = attendees.length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // 기수별 분포
  const genDist: Record<number, number> = {};
  for (const a of attendees) {
    genDist[a.userGeneration] = (genDist[a.userGeneration] || 0) + 1;
  }

  async function registerFromData(rows: { name: string; studentId: string }[]) {
    if (rows.length === 0) { toast.error("데이터가 없습니다."); return; }
    setRegistering(true);
    let matched = 0;
    let unmatched = 0;
    let skipped = 0;

    const existingIds = new Set(attendees.map((a) => a.userId));

    try {
      // 모든 회원 목록 가져오기
      const allMembers = await profilesApi.list({ limit: 500 });
      const memberList = allMembers.data as unknown as { id: string; name: string; studentId?: string }[];

      for (const row of rows) {
        // 1. 학번으로 매칭 시도
        let member = row.studentId
          ? memberList.find((m) => m.studentId === row.studentId)
          : undefined;
        // 2. 이름으로 매칭 시도
        if (!member) {
          member = memberList.find((m) => m.name === row.name);
        }

        if (member) {
          if (existingIds.has(member.id)) {
            skipped++;
          } else {
            await attendeesApi.add(seminarId, member.id);
            existingIds.add(member.id);
            matched++;
          }
        } else {
          // 미가입자: 학번 기반으로 참석 기록 저장
          await attendeesApi.add(seminarId, `guest_${row.studentId || row.name}`);
          unmatched++;
        }
      }

      qc.invalidateQueries({ queryKey: ["attendees", seminarId] });

      const parts = [];
      if (matched > 0) parts.push(`${matched}명 등록`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      if (unmatched > 0) parts.push(`${unmatched}명 미가입(학번 기반 저장)`);
      toast.success(parts.join(", "));
    } catch {
      toast.error("참석자 등록 중 오류가 발생했습니다.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file, ["이름", "학번"]);
      await registerFromData(rows.map((r) => ({ name: r["이름"], studentId: r["학번"] || "" })));
    } catch { toast.error("파일을 읽을 수 없습니다."); }
    if (excelRef.current) excelRef.current.value = "";
  }

  async function handleSheetLoad() {
    const sheetId = extractSheetId(sheetUrl);
    if (!sheetId) { toast.error("올바른 구글 스프레드시트 URL을 입력하세요."); return; }
    setSheetLoading(true);
    try {
      const csvUrl = getSheetCsvUrl(sheetId);
      const res = await fetch(`/api/sheets?url=${encodeURIComponent(csvUrl)}`);
      if (!res.ok) { const err = await res.json(); toast.error(err.error || "불러오기 실패"); return; }
      const text = await res.text();
      const rows = parseCSVText(text, ["이름", "학번"]);
      await registerFromData(rows.map((r) => ({ name: r["이름"], studentId: r["학번"] || "" })));
      setSheetOpen(false);
      setSheetUrl("");
    } catch { toast.error("스프레드시트 연결에 실패했습니다."); }
    finally { setSheetLoading(false); }
  }

  return (
    <div className="space-y-6">
      {/* 참석자 등록 */}
      <div className="rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-sm font-medium">
            <UserPlus size={16} />
            참석자 등록
          </h4>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => excelRef.current?.click()} disabled={registering}>
              {registering ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileSpreadsheet size={14} className="mr-1" />}
              엑셀 업로드
            </Button>
            <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
            <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} disabled={registering}>
              <Link size={14} className="mr-1" />구글 시트
            </Button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          엑셀(.xlsx/.csv) 또는 구글 스프레드시트에서 이름/학번 목록을 불러와 참석자를 일괄 등록합니다.
          미가입 회원은 학번 기반으로 저장되며, 추후 가입 시 자동 연동됩니다.
        </p>
      </div>

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

      {/* 구글 시트 Dialog */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>구글 스프레드시트에서 참석자 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <p className="text-xs text-muted-foreground">
              스프레드시트가 &quot;링크가 있는 모든 사용자에게 공개&quot;로 설정되어야 합니다.
              첫 번째 시트의 이름/학번 열을 불러와 참석자를 등록합니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>취소</Button>
            <Button onClick={handleSheetLoad} disabled={sheetLoading || !sheetUrl.trim()}>
              {sheetLoading && <Loader2 size={14} className="mr-1 animate-spin" />}
              불러오기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

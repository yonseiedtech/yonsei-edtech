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
import { Download, Users, UserCheck, UserX, FileSpreadsheet, Link, Loader2, UserPlus, ChevronDown, ChevronUp, Share2, BarChart3, Copy, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseExcelFile, parseCSVText, extractSheetId, getSheetCsvUrl } from "@/lib/parse-spreadsheet";
import { attendeesApi, profilesApi, registrationsApi } from "@/lib/bkend";
import { useQueryClient } from "@tanstack/react-query";
import type { SeminarAttendee } from "@/types";

const FORM_COLUMNS = ["이름", "학번", "누적학기", "이메일", "전화번호", "관심분야", "기타 질문사항"];

function HorizontalBar({ label, count, max, color = "bg-primary/70" }: { label: string; count: number; max: number; color?: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-right text-muted-foreground" title={label}>{label}</span>
      <div className="h-4 flex-1 rounded bg-muted/30">
        <div className={cn("h-full rounded transition-all", color)} style={{ width: `${(count / max) * 100}%` }} />
      </div>
      <span className="w-8 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

function AnalysisDashboard({ attendees, seminarTitle, seminarDate }: { attendees: SeminarAttendee[]; seminarTitle: string; seminarDate?: string }) {
  const [shareOpen, setShareOpen] = useState(false);

  // 관심분야 분포
  const interestDist: Record<string, number> = {};
  for (const a of attendees) {
    if (a.interests) {
      for (const interest of a.interests.split(",").map((s) => s.trim()).filter(Boolean)) {
        interestDist[interest] = (interestDist[interest] || 0) + 1;
      }
    }
  }
  const interestEntries = Object.entries(interestDist).sort((a, b) => b[1] - a[1]);
  const interestMax = Math.max(...interestEntries.map(([, c]) => c), 1);

  // 누적학기 분포
  const semesterDist: Record<string, number> = {};
  for (const a of attendees) {
    if (a.semester) semesterDist[a.semester] = (semesterDist[a.semester] || 0) + 1;
  }
  const semesterEntries = Object.entries(semesterDist).sort((a, b) => a[0].localeCompare(b[0]));
  const semesterMax = Math.max(...semesterEntries.map(([, c]) => c), 1);

  // 회원/미가입 비율
  const guests = attendees.filter((a) => a.isGuest).length;
  const members = attendees.length - guests;

  // 질문 목록
  const questions = attendees.filter((a) => a.questions && a.questions !== ".").map((a) => ({ name: a.userName, q: a.questions! }));

  // 강사 공유용 텍스트 생성
  function generateShareText() {
    const lines = [
      `📊 ${seminarTitle} — 참석자 분석 리포트`,
      seminarDate ? `📅 ${seminarDate}` : "",
      "",
      `▸ 총 참석자: ${attendees.length}명 (회원 ${members}명, 미가입 ${guests}명)`,
      "",
    ];

    if (interestEntries.length > 0) {
      lines.push("▸ 관심분야 분포:");
      for (const [interest, count] of interestEntries) {
        lines.push(`  - ${interest}: ${count}명`);
      }
      lines.push("");
    }

    if (semesterEntries.length > 0) {
      lines.push("▸ 누적학기 분포:");
      for (const [sem, count] of semesterEntries) {
        lines.push(`  - ${sem}: ${count}명`);
      }
      lines.push("");
    }

    if (questions.length > 0) {
      lines.push("▸ 사전 질문사항:");
      for (const { name, q } of questions) {
        lines.push(`  - ${name}: ${q}`);
      }
    }

    return lines.filter((l) => l !== undefined).join("\n");
  }

  function handleCopy() {
    navigator.clipboard.writeText(generateShareText());
    toast.success("리포트가 클립보드에 복사되었습니다.");
  }

  function handlePrint() {
    const text = generateShareText();
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>${seminarTitle} 참석자 리포트</title><style>body{font-family:sans-serif;padding:40px;white-space:pre-wrap;line-height:1.8;font-size:14px;}</style></head><body>${text}</body></html>`);
    w.document.close();
    w.print();
  }

  if (attendees.length === 0) return null;

  const hasDashboardData = interestEntries.length > 0 || semesterEntries.length > 0 || questions.length > 0;
  if (!hasDashboardData) return null;

  return (
    <>
      {/* 분석 헤더 */}
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-medium">
          <BarChart3 size={16} />
          참석자 분석
        </h4>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 size={14} className="mr-1" />강사 공유
        </Button>
      </div>

      {/* 회원/미가입 비율 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{members}</p>
          <p className="text-xs text-muted-foreground">가입 회원</p>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{guests}</p>
          <p className="text-xs text-muted-foreground">미가입 참석자</p>
        </div>
      </div>

      {/* 관심분야 분포 */}
      {interestEntries.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">관심분야 분포</h5>
          <div className="space-y-2">
            {interestEntries.map(([interest, count]) => (
              <HorizontalBar key={interest} label={interest} count={count} max={interestMax} color="bg-blue-500/70" />
            ))}
          </div>
        </div>
      )}

      {/* 누적학기 분포 */}
      {semesterEntries.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">누적학기 분포</h5>
          <div className="space-y-2">
            {semesterEntries.map(([sem, count]) => (
              <HorizontalBar key={sem} label={sem} count={count} max={semesterMax} color="bg-emerald-500/70" />
            ))}
          </div>
        </div>
      )}

      {/* 사전 질문사항 */}
      {questions.length > 0 && (
        <div className="rounded-xl border bg-white p-5">
          <h5 className="mb-3 text-sm font-medium">사전 질문사항 ({questions.length}건)</h5>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {questions.map((q, i) => (
              <div key={i} className="rounded-lg border bg-muted/10 px-4 py-3 text-xs">
                <span className="font-medium text-foreground">{q.name}</span>
                <p className="mt-1 leading-relaxed text-muted-foreground">{q.q}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 강사 공유 Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>강사 공유용 리포트</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/10 p-4">
            <pre className="whitespace-pre-wrap text-xs leading-relaxed">{generateShareText()}</pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handlePrint}>
              <Printer size={14} className="mr-1" />인쇄
            </Button>
            <Button onClick={handleCopy}>
              <Copy size={14} className="mr-1" />클립보드 복사
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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

function AttendeeRow({ a }: { a: SeminarAttendee }) {
  const [open, setOpen] = useState(false);
  const hasDetails = a.interests || a.questions || a.semester || a.phone;

  return (
    <>
      <tr className={cn("hover:bg-muted/10", hasDetails && "cursor-pointer")} onClick={() => hasDetails && setOpen(!open)}>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            {a.userName}
            {a.isGuest && <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-200">미가입</Badge>}
          </div>
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">{a.studentId || "-"}</td>
        <td className="px-3 py-2 text-xs text-muted-foreground">{a.email || "-"}</td>
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
        <td className="px-3 py-1 w-6">
          {hasDetails && (open ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />)}
        </td>
      </tr>
      {open && hasDetails && (
        <tr className="bg-muted/5">
          <td colSpan={6} className="px-4 py-2 text-xs text-muted-foreground space-y-0.5">
            {a.semester && <p><span className="font-medium text-foreground">누적학기:</span> {a.semester}</p>}
            {a.phone && <p><span className="font-medium text-foreground">전화번호:</span> {a.phone}</p>}
            {a.interests && <p><span className="font-medium text-foreground">관심분야:</span> {a.interests}</p>}
            {a.questions && <p><span className="font-medium text-foreground">질문사항:</span> {a.questions}</p>}
          </td>
        </tr>
      )}
    </>
  );
}

function SeminarReport({ seminarId, seminarTitle, seminarDate }: { seminarId: string; seminarTitle: string; seminarDate?: string }) {
  const { attendees, refetch: refetchAttendees } = useAttendees(seminarId);
  const qc = useQueryClient();
  const excelRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetLoading, setSheetLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ name: "", studentId: "", email: "", phone: "", semester: "", interests: "" });
  const [syncing, setSyncing] = useState(false);

  async function handleSyncFromRegistrations() {
    setSyncing(true);
    try {
      const regRes = await registrationsApi.list(seminarId);
      const regs = regRes.data as unknown as { name: string; email?: string; phone?: string; studentId?: string; semester?: string; interests?: string; memo?: string; status?: string; userId?: string }[];

      // 기존 참석자 세트 (이름/학번/이메일)
      const existingNames = new Set(attendees.map((a) => a.userName));
      const existingStudentIds = new Set(attendees.filter((a) => a.studentId).map((a) => a.studentId));
      const existingEmails = new Set(attendees.filter((a) => a.email).map((a) => a.email));

      let added = 0;
      let skipped = 0;
      for (const reg of regs) {
        if (reg.status === "cancelled") { skipped++; continue; }
        if (existingNames.has(reg.name)) { skipped++; continue; }
        if (reg.studentId && existingStudentIds.has(reg.studentId)) { skipped++; continue; }
        if (reg.email && existingEmails.has(reg.email)) { skipped++; continue; }

        await attendeesApi.addWithDetails(seminarId, {
          userName: reg.name,
          userId: reg.userId || `guest_${reg.email || reg.name}`,
          studentId: reg.studentId || undefined,
          email: reg.email || undefined,
          phone: reg.phone || undefined,
          semester: reg.semester || undefined,
          interests: reg.interests || undefined,
          questions: reg.memo || undefined,
          isGuest: !reg.userId,
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null,
        });
        existingNames.add(reg.name);
        if (reg.studentId) existingStudentIds.add(reg.studentId);
        if (reg.email) existingEmails.add(reg.email);
        added++;
      }

      await refetchAttendees();
      const parts = [];
      if (added > 0) parts.push(`${added}명 동기화 완료`);
      if (skipped > 0) parts.push(`${skipped}명 중복/취소 건너뜀`);
      toast.success(parts.length > 0 ? parts.join(", ") : "동기화할 신청자가 없습니다.");
    } catch { toast.error("동기화 중 오류가 발생했습니다."); }
    finally { setSyncing(false); }
  }

  async function handleRemoveAttendDuplicates() {
    if (attendees.length < 2) return;
    const seenNames = new Map<string, string>();
    const seenStudentIds = new Map<string, string>();
    const seenEmails = new Map<string, string>();
    const dupeIds: string[] = [];
    for (const a of attendees) {
      let isDupe = false;
      if (a.studentId && seenStudentIds.has(a.studentId)) isDupe = true;
      else if (a.studentId) seenStudentIds.set(a.studentId, a.id);
      if (!isDupe && a.email && seenEmails.has(a.email)) isDupe = true;
      else if (a.email) seenEmails.set(a.email, a.id);
      if (!isDupe && seenNames.has(a.userName)) isDupe = true;
      else if (!isDupe) seenNames.set(a.userName, a.id);
      if (isDupe) dupeIds.push(a.id);
    }
    if (dupeIds.length === 0) { toast.success("중복 참석자가 없습니다."); return; }
    if (!confirm(`${dupeIds.length}명의 중복 참석자를 삭제하시겠습니까?`)) return;
    try {
      for (const id of dupeIds) await attendeesApi.remove(id);
      toast.success(`${dupeIds.length}명 중복 제거 완료`);
      await refetchAttendees();
    } catch { toast.error("중복 제거 중 오류"); }
  }

  const total = attendees.length;
  const checkedIn = attendees.filter((a) => a.checkedIn).length;
  const rate = total > 0 ? Math.round((checkedIn / total) * 100) : 0;

  // 기수별 분포
  const genDist: Record<number, number> = {};
  for (const a of attendees) {
    if (a.userGeneration > 0) genDist[a.userGeneration] = (genDist[a.userGeneration] || 0) + 1;
  }

  interface ParsedRow {
    name: string;
    studentId: string;
    email: string;
    phone: string;
    semester: string;
    interests: string;
    questions: string;
  }

  async function registerFromData(rows: ParsedRow[]) {
    if (rows.length === 0) { toast.error("데이터가 없습니다."); return; }
    setRegistering(true);
    let matched = 0;
    let guest = 0;
    let skipped = 0;

    const existingStudentIds = new Set(attendees.filter((a) => a.studentId).map((a) => a.studentId));
    const existingUserIds = new Set(attendees.map((a) => a.userId));

    try {
      const allMembers = await profilesApi.list({ limit: 500 });
      const memberList = allMembers.data as unknown as { id: string; name: string; studentId?: string }[];

      for (const row of rows) {
        // 중복 체크 (학번 기준)
        if (row.studentId && existingStudentIds.has(row.studentId)) { skipped++; continue; }

        // 회원 매칭: 학번 → 이름
        let member = row.studentId
          ? memberList.find((m) => m.studentId === row.studentId)
          : undefined;
        if (!member) member = memberList.find((m) => m.name === row.name);

        if (member && existingUserIds.has(member.id)) { skipped++; continue; }

        const details: Record<string, unknown> = {
          userName: row.name,
          studentId: row.studentId || undefined,
          email: row.email || undefined,
          phone: row.phone || undefined,
          semester: row.semester || undefined,
          interests: row.interests || undefined,
          questions: row.questions || undefined,
          checkedIn: false,
          checkedInAt: null,
          checkedInBy: null,
        };

        if (member) {
          details.userId = member.id;
          details.isGuest = false;
          existingUserIds.add(member.id);
          matched++;
        } else {
          details.userId = `guest_${row.studentId || row.name}`;
          details.isGuest = true;
          guest++;
        }
        if (row.studentId) existingStudentIds.add(row.studentId);

        await attendeesApi.addWithDetails(seminarId, details);
      }

      await refetchAttendees();

      const parts = [];
      if (matched > 0) parts.push(`${matched}명 회원 등록`);
      if (guest > 0) parts.push(`${guest}명 미가입(학번 저장)`);
      if (skipped > 0) parts.push(`${skipped}명 중복 건너뜀`);
      toast.success(parts.join(", "));
    } catch {
      toast.error("참석자 등록 중 오류가 발생했습니다.");
    } finally {
      setRegistering(false);
    }
  }

  async function handleManualRegister() {
    if (!manualForm.name.trim()) { toast.error("이름을 입력하세요."); return; }
    await registerFromData([{
      name: manualForm.name.trim(),
      studentId: manualForm.studentId.trim(),
      email: manualForm.email.trim(),
      phone: manualForm.phone.trim(),
      semester: manualForm.semester.trim(),
      interests: manualForm.interests.trim(),
      questions: "",
    }]);
    setManualForm({ name: "", studentId: "", email: "", phone: "", semester: "", interests: "" });
    setManualOpen(false);
  }

  function rowsFromParsed(raw: Record<string, string>[]): ParsedRow[] {
    return raw.map((r) => ({
      name: r["이름"] || "",
      studentId: r["학번"] || "",
      email: r["이메일"] || "",
      phone: r["전화번호"] || "",
      semester: r["누적학기"] || "",
      interests: r["관심분야"] || "",
      questions: r["기타 질문사항"] || "",
    }));
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await parseExcelFile(file, FORM_COLUMNS);
      await registerFromData(rowsFromParsed(raw));
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
      const raw = parseCSVText(text, FORM_COLUMNS);
      await registerFromData(rowsFromParsed(raw));
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
            <Button variant="outline" size="sm" onClick={() => setManualOpen(true)} disabled={registering}>
              <UserPlus size={14} className="mr-1" />수기 등록
            </Button>
            <Button variant="outline" size="sm" onClick={handleSyncFromRegistrations} disabled={syncing}>
              {syncing ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Users size={14} className="mr-1" />}
              신청자 동기화
            </Button>
            {attendees.length > 1 && (
              <Button variant="outline" size="sm" onClick={handleRemoveAttendDuplicates}>
                중복 제거
              </Button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          구글폼 응답 엑셀(.xlsx) 또는 구글 스프레드시트에서 참석자를 일괄 등록합니다.
          열 구성: 이름/학번/누적학기/이메일/전화번호/관심분야/질문사항.
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

      {/* 참석자 분석 대시보드 + 강사 공유 */}
      <AnalysisDashboard attendees={attendees} seminarTitle={seminarTitle} seminarDate={seminarDate} />

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
        <div className="max-h-80 overflow-y-auto rounded-lg border bg-white">
          {attendees.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">참석자가 없습니다.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 border-b bg-muted/30">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">학번</th>
                  <th className="px-3 py-2 text-left font-medium">이메일</th>
                  <th className="px-3 py-2 text-left font-medium">출석</th>
                  <th className="px-3 py-2 text-left font-medium">시각</th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendees
                  .sort((a, b) => (a.checkedIn === b.checkedIn ? 0 : a.checkedIn ? -1 : 1))
                  .map((a) => <AttendeeRow key={a.id} a={a} />)}
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
              구글폼 응답 시트의 이름/학번/이메일 등 열을 자동 인식합니다.
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

      {/* 수기 등록 Dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>참석자 수기 등록</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium">이름 *</label>
              <Input value={manualForm.name} onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })} placeholder="홍길동" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">학번</label>
                <Input value={manualForm.studentId} onChange={(e) => setManualForm({ ...manualForm, studentId: e.target.value })} placeholder="2025431009" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">이메일</label>
                <Input value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="email@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium">전화번호</label>
                <Input value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} placeholder="010-1234-5678" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">누적학기</label>
                <Input value={manualForm.semester} onChange={(e) => setManualForm({ ...manualForm, semester: e.target.value })} placeholder="3학기" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">관심분야</label>
              <Input value={manualForm.interests} onChange={(e) => setManualForm({ ...manualForm, interests: e.target.value })} placeholder="학교교육, 인공지능" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>취소</Button>
            <Button onClick={handleManualRegister} disabled={registering || !manualForm.name.trim()}>
              {registering && <Loader2 size={14} className="mr-1 animate-spin" />}
              등록
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

  const completedSeminars = seminars.filter((s) => s.status === "completed");

  return (
    <div className="space-y-6">
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

      {seminar && <SeminarReport seminarId={seminar.id} seminarTitle={seminar.title} seminarDate={seminar.date} />}

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

"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSeminars, useAttendees, useSessions } from "@/features/seminar/useSeminar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SeminarSession } from "@/types";

/** 이름 자간: "홍길동" → "홍 길 동" */
function spacedName(name: string): string {
  return name.split("").join("\u2003");
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/* ─────────────────────────────────────────────
 * 이름표 프리뷰 — 95mm(W) × 123mm(H) × 2면 (펼친 상태: 190mm × 123mm)
 * 왼쪽: 앞면 (행사명 + 이름), 오른쪽: 뒷면 (타임테이블)
 * A4에 인쇄 후 반으로 접어 사용
 * ───────────────────────────────────────────── */
function NametagPreview({
  seminarTitle,
  seminarSubtitle,
  seminarDate,
  recipientName,
  recipientTitle,
  sessions,
}: {
  seminarTitle: string;
  seminarSubtitle?: string;
  seminarDate: string;
  recipientName: string;
  recipientTitle: string;
  sessions: SeminarSession[];
}) {
  return (
    <div
      className="mx-auto bg-white"
      style={{
        width: "190mm",
        height: "123mm",
        display: "flex",
        fontFamily: "'Pretendard', 'Nanum Gothic', sans-serif",
        border: "0.5px solid #ddd",
      }}
    >
      {/* ── 왼쪽 95mm: 앞면 ── */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: "95mm",
          height: "123mm",
          borderRight: "1px dashed #ccc",
          padding: "8mm 6mm",
          boxSizing: "border-box",
        }}
      >
        {/* 상단 네이비 바 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4mm",
            background: "#003876",
          }}
        />

        {/* 로고 */}
        <div style={{ position: "absolute", top: "6mm", right: "5mm" }}>
          <Image src="/yonsei-emblem.svg" alt="" width={14} height={14} style={{ opacity: 0.6 }} />
        </div>

        {/* 행사명 영역 */}
        <div className="text-center" style={{ marginTop: "4mm" }}>
          <p style={{ fontSize: "7pt", color: "#888", letterSpacing: "0.15em", fontWeight: 500, textTransform: "uppercase" }}>
            Yonsei Ed-Tech Association
          </p>
          <p
            style={{
              fontSize: "9.5pt",
              fontWeight: 700,
              color: "#003876",
              marginTop: "2mm",
              letterSpacing: "0.03em",
              lineHeight: 1.4,
            }}
          >
            {seminarTitle}
          </p>
          {seminarSubtitle && (
            <p style={{ fontSize: "7.5pt", color: "#666", marginTop: "1.5mm", lineHeight: 1.3 }}>
              {seminarSubtitle}
            </p>
          )}
        </div>

        {/* 구분선 */}
        <div style={{ width: "20mm", height: "0.5px", background: "#003876", margin: "5mm 0", opacity: 0.3 }} />

        {/* 이름 */}
        <div className="text-center">
          <p
            style={{
              fontSize: "22pt",
              fontWeight: 800,
              letterSpacing: "0.3em",
              color: "#111",
              lineHeight: 1,
            }}
          >
            {recipientName ? spacedName(recipientName) : "___"}
          </p>
          <p
            style={{
              fontSize: "9pt",
              color: "#666",
              marginTop: "3mm",
              fontWeight: 500,
            }}
          >
            {recipientTitle || "참석자"}
          </p>
        </div>

        {/* 하단 */}
        <div
          className="flex items-center gap-1.5"
          style={{ position: "absolute", bottom: "5mm" }}
        >
          <Image src="/yonsei-emblem.svg" alt="" width={12} height={12} />
          <span style={{ fontSize: "6pt", color: "#aaa", fontWeight: 600, letterSpacing: "0.05em" }}>
            연세교육공학회
          </span>
        </div>

        {/* 하단 네이비 라인 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2mm",
            background: "#003876",
          }}
        />
      </div>

      {/* ── 오른쪽 95mm: 뒷면 (타임테이블) ── */}
      <div
        className="relative flex flex-col"
        style={{
          width: "95mm",
          height: "123mm",
          padding: "6mm 5mm",
          boxSizing: "border-box",
        }}
      >
        {/* 상단 바 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4mm",
            background: "linear-gradient(90deg, #003876, #1a5fa0)",
          }}
        />

        {/* 헤더 */}
        <div style={{ marginTop: "4mm", marginBottom: "3mm", textAlign: "center" }}>
          <p
            style={{
              fontSize: "9pt",
              fontWeight: 700,
              color: "#003876",
              letterSpacing: "0.2em",
            }}
          >
            TIME TABLE
          </p>
          <p style={{ fontSize: "6.5pt", color: "#999", marginTop: "1mm" }}>
            {seminarDate}
          </p>
        </div>

        {/* 구분선 */}
        <div style={{ height: "0.5px", background: "#003876", opacity: 0.2, marginBottom: "2mm" }} />

        {/* 세션 목록 */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          {sessions.length === 0 ? (
            <div
              className="flex h-full items-center justify-center text-center"
              style={{ color: "#bbb", fontSize: "7.5pt" }}
            >
              세션 정보가 없습니다
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {sessions
                  .sort((a, b) => a.order - b.order)
                  .map((session, i) => (
                    <tr
                      key={session.id}
                      style={{
                        borderBottom: i < sessions.length - 1 ? "0.5px solid #eee" : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "2.5mm 2mm 2.5mm 0",
                          fontSize: "7pt",
                          fontWeight: 700,
                          color: "#003876",
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          width: "16mm",
                        }}
                      >
                        {session.time}
                      </td>
                      <td
                        style={{
                          padding: "2.5mm 0",
                          fontSize: "7pt",
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#333", lineHeight: 1.3 }}>
                          {session.title}
                        </div>
                        {session.speaker && (
                          <div style={{ fontSize: "6pt", color: "#999", marginTop: "0.5mm" }}>
                            {session.speaker}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 하단 로고 */}
        <div className="flex items-center justify-center gap-1.5" style={{ marginTop: "2mm" }}>
          <Image src="/yonsei-emblem.svg" alt="" width={10} height={10} />
          <span style={{ fontSize: "5.5pt", color: "#bbb", fontWeight: 600 }}>
            연세교육공학회
          </span>
        </div>

        {/* 하단 라인 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2mm",
            background: "#003876",
          }}
        />
      </div>
    </div>
  );
}

export default function NametagGenerator() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [names, setNames] = useState<{ name: string; title: string }[]>([{ name: "", title: "" }]);
  const printRef = useRef<HTMLDivElement>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");
  const { sessions } = useSessions(selectedId ?? "");

  function handleSeminarChange(id: string) {
    setSelectedId(id || null);
    const s = seminars.find((sem) => sem.id === id);
    if (s) setSubtitle(s.description.split("\n")[0].slice(0, 40));
  }

  function loadFromAttendees() {
    if (attendees.length === 0) { toast.error("참석자가 없습니다."); return; }
    setNames(attendees.map((a) => ({ name: a.userName, title: "" })));
    toast.success(`${attendees.length}명의 참석자를 불러왔습니다.`);
  }

  function handleSinglePrint() {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>이름표</title>
      <style>
        @page { size: 190mm 123mm; margin: 0; }
        body { margin: 0; font-family: 'Pretendard', 'Nanum Gothic', sans-serif; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        img { display: inline-block; }
      </style></head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  function handleBatchPrint() {
    if (!printRef.current) return;
    const validNames = names.filter((n) => n.name.trim());
    if (validNames.length === 0) { toast.error("이름을 입력해주세요."); return; }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Generate each nametag by cloning and updating name/title
    const pages: string[] = [];
    for (const n of validNames) {
      const container = printRef.current.cloneNode(true) as HTMLElement;
      const nameEls = container.querySelectorAll("[data-nametag-name]");
      nameEls.forEach((el) => { el.textContent = spacedName(n.name); });
      const titleEls = container.querySelectorAll("[data-nametag-title]");
      titleEls.forEach((el) => { el.textContent = n.title || "참석자"; });
      pages.push(`<div style="page-break-after: always;">${container.innerHTML}</div>`);
    }

    printWindow.document.write(`
      <html><head><title>이름표 일괄</title>
      <style>
        @page { size: 190mm 123mm; margin: 0; }
        body { margin: 0; font-family: 'Pretendard', 'Nanum Gothic', sans-serif; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        img { display: inline-block; }
        div:last-child { page-break-after: auto; }
      </style></head><body>${pages.join("")}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => handleSeminarChange(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>{s.title} ({s.date})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">행사 부제목 (선택)</label>
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="예: 교육공학의 새로운 지평" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">이름 목록</label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadFromAttendees} disabled={!seminar}>참석자 불러오기</Button>
              <Button variant="outline" size="sm" onClick={() => setNames([...names, { name: "", title: "" }])}>
                <Plus size={14} className="mr-1" />추가
              </Button>
            </div>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {names.map((n, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  value={n.name}
                  onChange={(e) => { const u = [...names]; u[i] = { ...n, name: e.target.value }; setNames(u); }}
                  placeholder="이름"
                  className="flex-1"
                />
                <Input
                  value={n.title}
                  onChange={(e) => { const u = [...names]; u[i] = { ...n, title: e.target.value }; setNames(u); }}
                  placeholder="직함"
                  className="w-36"
                />
                <button onClick={() => setNames(names.filter((_, j) => j !== i))} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSinglePrint} disabled={!seminar || !names[0]?.name}>
            <Printer size={16} className="mr-1" />현재 미리보기 인쇄
          </Button>
          <Button variant="outline" onClick={handleBatchPrint} disabled={!seminar}>
            <Printer size={16} className="mr-1" />전체 일괄 인쇄 ({names.filter((n) => n.name.trim()).length}장)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          이름표 크기: 95mm × 123mm (펼친 상태 190mm × 123mm). 인쇄 후 반으로 접어 사용합니다.
        </p>
      </div>

      {seminar && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            미리보기 (190mm × 123mm — 왼쪽: 앞면 / 오른쪽: 뒷면)
          </p>
          <div ref={printRef} className="overflow-auto rounded-lg border shadow-lg" style={{ maxHeight: "80vh" }}>
            <NametagPreview
              seminarTitle={seminar.title}
              seminarSubtitle={subtitle}
              seminarDate={formatKoreanDate(seminar.date)}
              recipientName={names[0]?.name || ""}
              recipientTitle={names[0]?.title || "참석자"}
              sessions={sessions}
            />
          </div>
        </div>
      )}
    </div>
  );
}

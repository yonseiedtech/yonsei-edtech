"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSeminars, useAttendees, useSessions } from "@/features/seminar/useSeminar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SeminarSession } from "@/types";

/** 이름에 자간 추가: "홍길동" → "홍 길 동" */
function spacedName(name: string): string {
  return name.split("").join("  ");
}

/** 세미나 날짜를 한국어 형식으로 */
function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

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
        width: "10.83in",
        height: "7.5in",
        display: "flex",
        fontFamily: "'Pretendard', 'Nanum Gothic', sans-serif",
      }}
    >
      {/* ── 왼쪽면: 행사명 + 이름 ── */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{
          width: "50%",
          height: "100%",
          borderRight: "1px dashed #ccc",
          padding: "40px 30px",
        }}
      >
        {/* 상단 컬러바 */}
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            right: "10px",
            height: "28px",
            background: "linear-gradient(90deg, #003876 0%, #1a5fa0 100%)",
            borderRadius: "4px",
          }}
        />

        {/* 연세 로고 */}
        <div style={{ position: "absolute", top: "14px", right: "20px" }}>
          <Image
            src="/yonsei-emblem.svg"
            alt=""
            width={20}
            height={20}
            style={{ opacity: 0.9 }}
          />
        </div>

        {/* 행사명 */}
        <div className="text-center" style={{ marginTop: "20px" }}>
          <p
            style={{
              fontSize: "11pt",
              fontWeight: 600,
              color: "#333",
              letterSpacing: "0.05em",
            }}
          >
            {seminarTitle}
          </p>
          {seminarSubtitle && (
            <p
              style={{
                fontSize: "9pt",
                color: "#666",
                marginTop: "4px",
                letterSpacing: "0.03em",
              }}
            >
              {seminarSubtitle}
            </p>
          )}
        </div>

        {/* 이름 (대형) */}
        <div className="text-center" style={{ marginTop: "30px" }}>
          <p
            style={{
              fontSize: "28pt",
              fontWeight: 800,
              letterSpacing: "0.4em",
              color: "#000",
            }}
          >
            {recipientName ? spacedName(recipientName) : "___________"}
          </p>
          <p
            style={{
              fontSize: "12pt",
              color: "#555",
              marginTop: "8px",
              fontWeight: 500,
            }}
          >
            {recipientTitle || "참석자"}
          </p>
        </div>

        {/* 하단 로고 */}
        <div
          className="flex items-center gap-2"
          style={{ position: "absolute", bottom: "20px" }}
        >
          <Image
            src="/yonsei-emblem.svg"
            alt="연세대학교"
            width={18}
            height={18}
          />
          <span style={{ fontSize: "8pt", color: "#888", fontWeight: 600 }}>
            연세교육공학회
          </span>
        </div>

        {/* 하단 컬러바 */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "10px",
            right: "10px",
            height: "5px",
            background: "#003876",
            borderRadius: "2px",
          }}
        />
      </div>

      {/* ── 오른쪽면: 타임테이블 ── */}
      <div
        className="relative flex flex-col"
        style={{
          width: "50%",
          height: "100%",
          padding: "40px 30px",
        }}
      >
        {/* 상단 로고 */}
        <div className="flex items-center justify-end gap-2" style={{ marginBottom: "12px" }}>
          <Image
            src="/yonsei-emblem.svg"
            alt=""
            width={18}
            height={18}
            style={{ opacity: 0.7 }}
          />
          <span style={{ fontSize: "8pt", color: "#999" }}>
            Yonsei Educational Technology Association
          </span>
        </div>

        {/* 타임테이블 제목 */}
        <h3
          style={{
            fontSize: "13pt",
            fontWeight: 700,
            color: "#003876",
            marginBottom: "16px",
            textAlign: "center",
            letterSpacing: "0.15em",
          }}
        >
          TIME TABLE
        </h3>

        {/* 날짜 */}
        <p
          style={{
            fontSize: "9pt",
            color: "#666",
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          {seminarDate}
        </p>

        {/* 세션 목록 */}
        <div style={{ flex: 1 }}>
          {sessions.length === 0 ? (
            <div
              className="flex h-full items-center justify-center text-center"
              style={{ color: "#aaa", fontSize: "10pt" }}
            >
              세션 정보가 없습니다.
              <br />
              세미나 관리에서 세션을 추가해주세요.
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
                        borderBottom: i < sessions.length - 1 ? "1px solid #e5e7eb" : "none",
                      }}
                    >
                      <td
                        style={{
                          padding: "8px 8px 8px 0",
                          fontSize: "9pt",
                          fontWeight: 700,
                          color: "#003876",
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          width: "60px",
                        }}
                      >
                        {session.time}
                      </td>
                      <td
                        style={{
                          padding: "8px 0",
                          fontSize: "9pt",
                          verticalAlign: "top",
                        }}
                      >
                        <div style={{ fontWeight: 600, color: "#333" }}>
                          {session.title}
                        </div>
                        {session.speaker && (
                          <div style={{ fontSize: "8pt", color: "#888", marginTop: "2px" }}>
                            {session.speaker}
                            {session.speakerBio && ` — ${session.speakerBio}`}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "8px 0 8px 8px",
                          fontSize: "8pt",
                          color: "#999",
                          whiteSpace: "nowrap",
                          verticalAlign: "top",
                          textAlign: "right",
                        }}
                      >
                        {session.duration}분
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 하단 로고 */}
        <div
          className="flex items-center justify-center gap-2"
          style={{ marginTop: "12px" }}
        >
          <Image
            src="/yonsei-emblem.svg"
            alt=""
            width={24}
            height={24}
          />
          <div style={{ lineHeight: 1.2 }}>
            <p style={{ fontSize: "9pt", fontWeight: 700 }}>연세교육공학회</p>
            <p style={{ fontSize: "6pt", color: "#888" }}>
              Yonsei Ed-Tech Association
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NametagGenerator() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [names, setNames] = useState<{ name: string; title: string }[]>([
    { name: "", title: "" },
  ]);
  const printRef = useRef<HTMLDivElement>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");
  const { sessions } = useSessions(selectedId ?? "");

  function handleSeminarChange(id: string) {
    setSelectedId(id || null);
    const s = seminars.find((sem) => sem.id === id);
    if (s) {
      setSubtitle(s.description.split("\n")[0].slice(0, 40));
    }
  }

  function loadFromAttendees() {
    if (attendees.length === 0) {
      toast.error("참석자가 없습니다.");
      return;
    }
    setNames(
      attendees.map((a) => ({
        name: a.userName,
        title: "",
      })),
    );
    toast.success(`${attendees.length}명의 참석자를 불러왔습니다.`);
  }

  function handlePrint() {
    if (!printRef.current) return;
    const validNames = names.filter((n) => n.name.trim());
    if (validNames.length === 0) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Generate all nametags HTML
    const nametagsHtml = validNames
      .map((n) => {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = printRef.current!.innerHTML;
        return `<div class="nametag-page" style="page-break-after: always;">${printRef.current!.innerHTML}</div>`;
      })
      .join("");

    // We need to render each name individually
    const renderedPages: string[] = [];
    for (const n of validNames) {
      // Clone and update name
      const container = printRef.current!.cloneNode(true) as HTMLElement;
      // Find the name element and update it
      const nameEls = container.querySelectorAll("[data-nametag-name]");
      nameEls.forEach((el) => {
        el.textContent = spacedName(n.name);
      });
      const titleEls = container.querySelectorAll("[data-nametag-title]");
      titleEls.forEach((el) => {
        el.textContent = n.title || "참석자";
      });
      renderedPages.push(
        `<div style="page-break-after: always;">${container.innerHTML}</div>`,
      );
    }

    printWindow.document.write(`
      <html><head><title>이름표</title>
      <style>
        @page { size: 10.83in 7.5in landscape; margin: 0; }
        body { margin: 0; font-family: 'Pretendard', 'Nanum Gothic', sans-serif; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        img { display: inline-block; }
        .nametag-page:last-child { page-break-after: auto; }
      </style></head><body>
      ${renderedPages.join("")}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }

  function handleSinglePrint() {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>이름표</title>
      <style>
        @page { size: 10.83in 7.5in landscape; margin: 0; }
        body { margin: 0; font-family: 'Pretendard', 'Nanum Gothic', sans-serif; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        img { display: inline-block; }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  return (
    <div className="space-y-6">
      {/* 설정 */}
      <div className="rounded-xl border bg-white p-6 space-y-4">
        {/* 세미나 선택 */}
        <div>
          <label className="mb-2 block text-sm font-medium">세미나 선택</label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => handleSeminarChange(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">-- 세미나를 선택하세요 --</option>
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ({s.date})
              </option>
            ))}
          </select>
        </div>

        {/* 부제목 */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">행사 부제목 (선택)</label>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="예: 교육공학의 새로운 지평"
          />
        </div>

        {/* 이름 목록 */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">이름 목록</label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadFromAttendees}
                disabled={!seminar}
              >
                참석자 불러오기
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNames([...names, { name: "", title: "" }])}
              >
                <Plus size={14} className="mr-1" />
                추가
              </Button>
            </div>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {names.map((n, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-6 text-right text-xs text-muted-foreground">{i + 1}</span>
                <Input
                  value={n.name}
                  onChange={(e) => {
                    const updated = [...names];
                    updated[i] = { ...n, name: e.target.value };
                    setNames(updated);
                  }}
                  placeholder="이름"
                  className="flex-1"
                />
                <Input
                  value={n.title}
                  onChange={(e) => {
                    const updated = [...names];
                    updated[i] = { ...n, title: e.target.value };
                    setNames(updated);
                  }}
                  placeholder="직함 (예: 교수님, 대학원생)"
                  className="w-40"
                />
                <button
                  onClick={() => setNames(names.filter((_, j) => j !== i))}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSinglePrint} disabled={!seminar || !names[0]?.name}>
            <Printer size={16} className="mr-1" />
            현재 미리보기 인쇄
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={!seminar}>
            <Printer size={16} className="mr-1" />
            전체 일괄 인쇄 ({names.filter((n) => n.name.trim()).length}장)
          </Button>
        </div>
      </div>

      {/* 미리보기 */}
      {seminar && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            미리보기 (가로 — 왼쪽: 행사명+이름 / 오른쪽: 타임테이블)
          </p>
          <div
            ref={printRef}
            className="overflow-auto rounded-lg border shadow-lg"
            style={{ maxHeight: "80vh" }}
          >
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

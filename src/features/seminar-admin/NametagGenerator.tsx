"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSeminars, useAttendees, useSessions } from "@/features/seminar/useSeminar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SeminarSession } from "@/types";

function spacedName(name: string): string {
  return name.split("").join("\u2003");
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

/* ────────────────────────────────────────────────────
 * 이름표 95mm × 123mm — 펼친 상태 190mm × 123mm
 * 디자인: 대형 장식 원, 그라데이션 헤더, 기수 배지
 * ──────────────────────────────────────────────────── */
function NametagPreview({
  seminarTitle,
  seminarSubtitle,
  seminarDate,
  recipientName,
  recipientStudentId,
  recipientRole = "참가자",
  sessions,
}: {
  seminarTitle: string;
  seminarSubtitle?: string;
  seminarDate: string;
  recipientName: string;
  recipientStudentId?: string;
  recipientRole?: NametagRole;
  sessions: SeminarSession[];
}) {
  return (
    <div
      className="mx-auto"
      style={{
        width: "190mm",
        height: "123mm",
        display: "flex",
        fontFamily: "'Pretendard', 'Nanum Gothic', sans-serif",
        border: "0.5px solid #ddd",
        overflow: "hidden",
      }}
    >
      {/* ════════ 왼쪽 95mm: 앞면 ════════ */}
      <div
        className="relative"
        style={{
          width: "95mm",
          height: "123mm",
          borderRight: "1px dashed #ccc",
          boxSizing: "border-box",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* 배경 장식: 대형 반원 (우하단) */}
        <div
          style={{
            position: "absolute",
            bottom: "-30mm",
            right: "-20mm",
            width: "80mm",
            height: "80mm",
            borderRadius: "50%",
            background: "linear-gradient(135deg, rgba(0,56,118,0.04) 0%, rgba(0,56,118,0.08) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* 배경 장식: 작은 원 (좌상단) */}
        <div
          style={{
            position: "absolute",
            top: "-8mm",
            left: "-8mm",
            width: "28mm",
            height: "28mm",
            borderRadius: "50%",
            background: "rgba(0,56,118,0.03)",
            pointerEvents: "none",
          }}
        />

        {/* 상단 그라데이션 헤더 영역 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "28mm",
            background: "linear-gradient(135deg, #003876 0%, #0052a5 60%, #1a6fc4 100%)",
            clipPath: "polygon(0 0, 100% 0, 100% 75%, 0 100%)",
          }}
        />

        {/* 헤더 위 콘텐츠 */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "5mm 6mm 0",
          }}
        >
          {/* 로고 + 영문 */}
          <div className="flex items-center gap-1.5">
            <Image src="/yonsei-emblem.svg" alt="" width={20} height={20} />
            <span style={{ fontSize: "6pt", color: "rgba(255,255,255,0.9)", letterSpacing: "0.12em", fontWeight: 500 }}>
              YONSEI EDTECH ASSOCIATION
            </span>
          </div>

          {/* 행사명 */}
          <div style={{ marginTop: "3mm" }}>
            <p
              style={{
                fontSize: "11pt",
                fontWeight: 700,
                color: "#fff",
                letterSpacing: "0.02em",
                lineHeight: 1.4,
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              {seminarTitle}
            </p>
            {seminarSubtitle && (
              <p style={{ fontSize: "7pt", color: "rgba(255,255,255,0.75)", marginTop: "1mm", lineHeight: 1.3 }}>
                {seminarSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* 이름 영역 (중앙) */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            position: "absolute",
            top: "32mm",
            left: 0,
            right: 0,
            bottom: "18mm",
          }}
        >
          {/* 역할 배지 */}
          <span
            data-nametag-role
            style={{
              fontSize: "7pt",
              fontWeight: 700,
              color: ROLE_COLORS[recipientRole].text,
              background: ROLE_COLORS[recipientRole].bg,
              padding: "1.5px 8px",
              borderRadius: "10px",
              letterSpacing: "0.08em",
              marginBottom: "2.5mm",
            }}
          >
            {recipientRole}
          </span>

          {/* 이름 */}
          <p
            data-nametag-name
            style={{
              fontSize: "24pt",
              fontWeight: 800,
              letterSpacing: "0.3em",
              color: "#111",
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {recipientName ? spacedName(recipientName) : "___"}
          </p>

          {/* 이름 아래 악센트 라인 */}
          <div
            style={{
              width: "16mm",
              height: "2px",
              background: "linear-gradient(90deg, transparent, #003876, transparent)",
              margin: "3mm 0",
            }}
          />

          {/* 학번 */}
          {recipientStudentId && (
            <span
              data-nametag-studentid
              style={{
                fontSize: "8pt",
                color: "#003876",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              {recipientStudentId}
            </span>
          )}
        </div>

        {/* 하단 바 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "12mm",
            background: "linear-gradient(0deg, rgba(0,56,118,0.06) 0%, transparent 100%)",
          }}
        />

        {/* 하단 로고 */}
        <div
          className="flex items-center justify-center gap-1.5"
          style={{ position: "absolute", bottom: "3.5mm", left: 0, right: 0 }}
        >
          <Image src="/yonsei-emblem.svg" alt="" width={16} height={16} />
          <span style={{ fontSize: "5.5pt", color: "#888", fontWeight: 600, letterSpacing: "0.05em" }}>
            연세교육공학회
          </span>
        </div>
      </div>

      {/* ════════ 오른쪽 95mm: 뒷면 (타임테이블) ════════ */}
      <div
        className="relative"
        style={{
          width: "95mm",
          height: "123mm",
          boxSizing: "border-box",
          background: "#fff",
          overflow: "hidden",
        }}
      >
        {/* 배경 장식: 대형 반원 (좌하단) */}
        <div
          style={{
            position: "absolute",
            bottom: "-25mm",
            left: "-15mm",
            width: "60mm",
            height: "60mm",
            borderRadius: "50%",
            background: "rgba(0,56,118,0.03)",
            pointerEvents: "none",
          }}
        />

        {/* 상단 헤더 */}
        <div
          style={{
            background: "#003876",
            padding: "4mm 5mm 3.5mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <p style={{ fontSize: "9pt", fontWeight: 700, color: "#fff", letterSpacing: "0.18em" }}>
              TIME TABLE
            </p>
          </div>
          <Image src="/yonsei-emblem.svg" alt="" width={18} height={18} />
        </div>

        {/* 날짜 바 */}
        <div
          style={{
            background: "rgba(0,56,118,0.06)",
            padding: "1.5mm 5mm",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "6.5pt", color: "#666", fontWeight: 500, letterSpacing: "0.05em" }}>
            {seminarDate}
          </p>
        </div>

        {/* 세션 목록 */}
        <div style={{ padding: "2mm 4mm", flex: 1, overflow: "hidden" }}>
          {sessions.length === 0 ? (
            <div
              className="flex items-center justify-center text-center"
              style={{ color: "#bbb", fontSize: "7.5pt", height: "70mm" }}
            >
              세션 정보가 없습니다
            </div>
          ) : (
            sessions
              .sort((a, b) => a.order - b.order)
              .map((session, i) => (
                <div
                  key={session.id}
                  style={{
                    display: "flex",
                    gap: "2mm",
                    padding: "2mm 1mm",
                    borderBottom: i < sessions.length - 1 ? "0.5px solid #eee" : "none",
                  }}
                >
                  {/* 시간 표시 (좌측 컬러 도트 + 시간) */}
                  <div style={{ width: "18mm", flexShrink: 0 }}>
                    <div className="flex items-center gap-1">
                      <div
                        style={{
                          width: "4px",
                          height: "4px",
                          borderRadius: "50%",
                          background: "#003876",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "7pt",
                          fontWeight: 700,
                          color: "#003876",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {session.time}
                      </span>
                    </div>
                  </div>
                  {/* 세션 내용 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "7pt", fontWeight: 600, color: "#333", lineHeight: 1.3 }}>
                      {session.title}
                    </p>
                    {session.speaker && (
                      <p style={{ fontSize: "5.5pt", color: "#999", marginTop: "0.3mm" }}>
                        {session.speaker}
                      </p>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>

        {/* 하단 */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "8mm",
            background: "linear-gradient(0deg, rgba(0,56,118,0.05) 0%, transparent 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.5mm",
          }}
        >
          <Image src="/yonsei-emblem.svg" alt="" width={14} height={14} />
          <span style={{ fontSize: "5pt", color: "#999", fontWeight: 600 }}>
            Yonsei EdTech Association
          </span>
        </div>
      </div>
    </div>
  );
}

const ROLE_OPTIONS = ["참가자", "연사", "자문", "학회장", "부학회장", "운영진"] as const;
type NametagRole = (typeof ROLE_OPTIONS)[number];

const ROLE_COLORS: Record<NametagRole, { bg: string; text: string }> = {
  참가자: { bg: "rgba(0,56,118,0.08)", text: "#003876" },
  연사: { bg: "rgba(220,38,38,0.1)", text: "#dc2626" },
  자문: { bg: "rgba(124,58,237,0.1)", text: "#7c3aed" },
  학회장: { bg: "rgba(202,138,4,0.12)", text: "#a16207" },
  부학회장: { bg: "rgba(202,138,4,0.08)", text: "#a16207" },
  운영진: { bg: "rgba(22,163,74,0.1)", text: "#16a34a" },
};

interface NameEntry {
  name: string;
  studentId: string;
  role: NametagRole;
}

export default function NametagGenerator() {
  const { seminars } = useSeminars();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState("");
  const [names, setNames] = useState<NameEntry[]>([{ name: "", studentId: "", role: "참가자" }]);
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
    setNames(attendees.map((a) => ({
      name: a.userName,
      studentId: "",
      role: "참가자" as NametagRole,
    })));
    toast.success(`${attendees.length}명의 참석자를 불러왔습니다.`);
  }

  function updateName(i: number, field: keyof NameEntry, value: string) {
    const updated = [...names];
    updated[i] = { ...updated[i], [field]: value };
    setNames(updated);
  }

  function injectPrintStyle(pageSize: string) {
    const styleId = "nametag-print-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page { size: ${pageSize}; margin: 0; }
        body > *:not(#nametag-print-container) { display: none !important; }
        #nametag-print-container {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 99999 !important;
          background: white !important;
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;
    return styleEl;
  }

  function handleSinglePrint() {
    if (!printRef.current) return;
    const styleEl = injectPrintStyle("190mm 123mm");

    let container = document.getElementById("nametag-print-container");
    if (container) container.remove();
    container = document.createElement("div");
    container.id = "nametag-print-container";
    container.style.display = "none";
    container.innerHTML = printRef.current.innerHTML;
    document.body.appendChild(container);

    const cleanup = () => {
      container?.remove();
      if (styleEl) styleEl.textContent = "";
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 100);
  }

  function handleBatchPrint() {
    if (!printRef.current) return;
    const valid = names.filter((n) => n.name.trim());
    if (valid.length === 0) { toast.error("이름을 입력해주세요."); return; }

    const styleEl = injectPrintStyle("190mm 123mm");

    const pages: string[] = [];
    for (const n of valid) {
      const el = printRef.current.cloneNode(true) as HTMLElement;
      el.querySelectorAll("[data-nametag-name]").forEach((e) => { e.textContent = spacedName(n.name); });
      el.querySelectorAll("[data-nametag-role]").forEach((e) => {
        const colors = ROLE_COLORS[n.role];
        e.textContent = n.role;
        (e as HTMLElement).style.color = colors.text;
        (e as HTMLElement).style.background = colors.bg;
      });
      el.querySelectorAll("[data-nametag-studentid]").forEach((e) => {
        if (n.studentId) { e.textContent = n.studentId; (e as HTMLElement).style.display = "inline"; }
        else { (e as HTMLElement).style.display = "none"; }
      });
      pages.push(`<div style="page-break-after:always;">${el.innerHTML}</div>`);
    }

    let container = document.getElementById("nametag-print-container");
    if (container) container.remove();
    container = document.createElement("div");
    container.id = "nametag-print-container";
    container.style.display = "none";
    container.innerHTML = pages.join("");
    document.body.appendChild(container);

    const cleanup = () => {
      container?.remove();
      if (styleEl) styleEl.textContent = "";
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(() => window.print(), 100);
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
              <Button variant="outline" size="sm" onClick={() => setNames([...names, { name: "", studentId: "", role: "참가자" }])}>
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
                  onChange={(e) => updateName(i, "name", e.target.value)}
                  placeholder="이름"
                  className="flex-1"
                />
                <select
                  value={n.role}
                  onChange={(e) => updateName(i, "role", e.target.value)}
                  className="w-24 rounded-md border px-2 py-1.5 text-sm"
                >
                  {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Input
                  value={n.studentId}
                  onChange={(e) => updateName(i, "studentId", e.target.value)}
                  placeholder="학번"
                  className="w-28"
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
              recipientStudentId={names[0]?.studentId || ""}
              recipientRole={names[0]?.role || "참가자"}
              sessions={sessions}
            />
          </div>
        </div>
      )}
    </div>
  );
}

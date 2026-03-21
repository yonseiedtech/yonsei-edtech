"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { certificatesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Printer, Award, Heart, Plus } from "lucide-react";
import { toast } from "sonner";

type CertType = "completion" | "appreciation";

const CERT_LABELS: Record<CertType, { label: string; icon: React.ReactNode }> = {
  completion: { label: "수료증", icon: <Award size={16} /> },
  appreciation: { label: "감사장", icon: <Heart size={16} /> },
};

/** 이름 자간: "홍길동" → "홍  길  동" */
function spacedName(name: string): string {
  return name.split("").join("\u2003");
}

async function generateCertificateNo(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  try {
    const existing = await certificatesApi.list();
    const count = existing.data.filter((c) => {
      const no = (c as Record<string, unknown>).certificateNo as string | undefined;
      return no && no.startsWith(`${yy}-`);
    }).length;
    return `${yy}-${String(count + 1).padStart(3, "0")}`;
  } catch {
    return `${yy}-001`;
  }
}

/* ─────────────────────────────────────────────
 * 감사장/수료증 프리뷰 — 격식 있는 세로형 디자인
 * 컬러: Yonsei Navy #003876, Gold #B8860B
 * 폰트: 명조 계열 (Batang, Nanum Myeongjo)
 * ───────────────────────────────────────────── */
function CertificatePreview({
  type,
  seminarTitle,
  seminarDate,
  semester,
  recipientName,
  certificateNo,
}: {
  type: CertType;
  seminarTitle: string;
  seminarDate: string;
  semester: string;
  recipientName: string;
  certificateNo: string;
}) {
  const isCompletion = type === "completion";
  const title = isCompletion ? "수 료 증" : "감 사 장";
  const accentColor = isCompletion ? "#003876" : "#8B6914";

  return (
    <div
      className="relative mx-auto bg-white"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Batang', 'Nanum Myeongjo', serif",
        overflow: "hidden",
      }}
    >
      {/* ─── 이중 테두리 프레임 ─── */}
      <div
        style={{
          position: "absolute",
          inset: "14mm",
          border: `1.5px solid ${accentColor}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "17mm",
          border: `0.5px solid ${accentColor}`,
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />

      {/* ─── 네 모서리 장식 ─── */}
      {[
        { top: "14mm", left: "14mm" },
        { top: "14mm", right: "14mm" },
        { bottom: "14mm", left: "14mm" },
        { bottom: "14mm", right: "14mm" },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            ...pos,
            width: "18px",
            height: "18px",
            borderTop: i < 2 ? `2.5px solid ${accentColor}` : "none",
            borderBottom: i >= 2 ? `2.5px solid ${accentColor}` : "none",
            borderLeft: i % 2 === 0 ? `2.5px solid ${accentColor}` : "none",
            borderRight: i % 2 === 1 ? `2.5px solid ${accentColor}` : "none",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ─── 본문 영역 ─── */}
      <div
        className="flex flex-col items-center"
        style={{ padding: "32mm 30mm 28mm" }}
      >
        {/* 증서 번호 */}
        <div style={{ alignSelf: "flex-start", marginBottom: "18mm" }}>
          <span
            style={{
              fontSize: "11pt",
              fontWeight: 700,
              color: "#555",
              letterSpacing: "0.08em",
            }}
          >
            제 {certificateNo || "___"} 호
          </span>
        </div>

        {/* 제목 */}
        <h1
          style={{
            fontSize: "36pt",
            fontWeight: 800,
            letterSpacing: "0.5em",
            color: accentColor,
            marginBottom: "6mm",
            textAlign: "center",
          }}
        >
          {title}
        </h1>

        {/* 구분선 */}
        <div
          style={{
            width: "60px",
            height: "2px",
            background: accentColor,
            marginBottom: "16mm",
            opacity: 0.5,
          }}
        />

        {/* 수여자 이름 */}
        <div style={{ marginBottom: "14mm", textAlign: "right", width: "100%" }}>
          <span
            style={{
              fontSize: "22pt",
              fontWeight: 700,
              letterSpacing: "0.35em",
              color: "#111",
            }}
          >
            {recipientName ? spacedName(recipientName) : "___________"}
          </span>
          <span
            style={{
              fontSize: "13pt",
              marginLeft: "12px",
              fontWeight: 400,
              color: "#444",
            }}
          >
            선생님
          </span>
        </div>

        {/* 워터마크 엠블럼 */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "44%",
            opacity: 0.06,
            width: "240px",
            height: "240px",
            pointerEvents: "none",
          }}
        >
          <Image src="/yonsei-emblem.svg" alt="" width={240} height={240} className="h-full w-full" />
        </div>

        {/* 본문 */}
        <div
          className="relative"
          style={{
            fontSize: "13pt",
            lineHeight: "2.6",
            textAlign: "justify",
            width: "100%",
            maxWidth: "430px",
            margin: "0 auto",
            wordBreak: "keep-all",
            color: "#222",
          }}
        >
          {isCompletion ? (
            <p style={{ textIndent: "1em" }}>
              귀하께서는 {semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량
              강화를 위하여 주관한 연세교육공학 학술대회 &lt;{seminarTitle || "___"}&gt;에
              참석하여 소정의 과정을 이수하였기에 이 수료증을 수여합니다.
            </p>
          ) : (
            <p style={{ textIndent: "1em" }}>
              귀하께서는 {semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량
              강화를 위하여 주관한 연세교육공학 학술대회 &lt;{seminarTitle || "___"}&gt;에서
              귀하께서 가지신 지식과 경험을 헌신적이고 열정적으로 공유해 주심으로서
              구성원들의 성장에 큰 도움을 주셨음에 감사드리며, 연세교육공학회
              구성원들의 마음을 담아 감사장을 드립니다.
            </p>
          )}
        </div>

        {/* 날짜 */}
        <p
          style={{
            fontSize: "13pt",
            marginTop: "20mm",
            letterSpacing: "0.12em",
            textAlign: "center",
            color: "#333",
          }}
        >
          {seminarDate}
        </p>

        {/* 하단 서명 영역 */}
        <div
          className="flex items-center justify-center gap-8"
          style={{ marginTop: "18mm" }}
        >
          <div className="flex items-center gap-3">
            <Image src="/yonsei-emblem.svg" alt="연세대학교" width={36} height={36} />
            <div style={{ lineHeight: 1.4 }}>
              <p style={{ fontSize: "14pt", fontWeight: 700, color: "#222" }}>
                연세교육공학회
              </p>
              <p style={{ fontSize: "7pt", color: "#888", letterSpacing: "0.05em" }}>
                Yonsei Educational Technology Association
              </p>
            </div>
          </div>
          {/* 직인 */}
          <div
            style={{
              width: "56px",
              height: "56px",
              border: "2.5px solid #c0392b",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#c0392b",
              fontSize: "9pt",
              fontWeight: 700,
              lineHeight: 1.2,
              textAlign: "center",
              opacity: 0.85,
            }}
          >
            연세
            <br />
            교육공학회
          </div>
        </div>
      </div>
    </div>
  );
}

function inferSemester(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month >= 3 && month <= 8 ? "1" : "2"}학기`;
}

export default function CertificateGenerator() {
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [certType, setCertType] = useState<CertType>("appreciation");
  const [recipientName, setRecipientName] = useState("");
  const [semester, setSemester] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");

  async function handleSeminarChange(id: string) {
    setSelectedId(id || null);
    const s = seminars.find((sem) => sem.id === id);
    if (s) {
      setSemester(inferSemester(s.date));
      setCertificateNo(await generateCertificateNo());
    }
  }

  function handlePrint() {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${CERT_LABELS[certType].label}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; font-family: 'Batang', 'Nanum Myeongjo', serif; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        img { display: inline-block; }
      </style></head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }

  async function handleSaveRecord() {
    if (!seminar || !recipientName) {
      toast.error("세미나와 수여자 이름을 입력하세요.");
      return;
    }
    try {
      await certificatesApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        recipientName,
        type: certType,
        certificateNo,
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
      toast.success(`${CERT_LABELS[certType].label} 기록이 저장되었습니다.`);
      setCertificateNo(await generateCertificateNo());
    } catch {
      toast.error("저장에 실패했습니다.");
    }
  }

  async function handleBatchCreate() {
    if (!seminar) return;
    const targets = attendees.filter((a) => a.checkedIn);
    if (targets.length === 0) {
      toast.error("출석 체크된 참석자가 없습니다.");
      return;
    }
    for (const att of targets) {
      const no = await generateCertificateNo();
      await certificatesApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        recipientName: att.userName,
        type: "completion",
        certificateNo: no,
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
    }
    toast.success(`${targets.length}명에게 수료증 기록이 생성되었습니다.`);
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
          <label className="mb-2 block text-sm font-medium">종류</label>
          <div className="flex gap-2">
            {(Object.entries(CERT_LABELS) as [CertType, typeof CERT_LABELS[CertType]][]).map(
              ([key, { label, icon }]) => (
                <Button key={key} size="sm" variant={certType === key ? "default" : "outline"} onClick={() => setCertType(key)}>
                  {icon}
                  <span className="ml-1">{label}</span>
                </Button>
              ),
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">수여자 이름</label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="홍길동" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">학기</label>
            <Input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="2026년 1학기" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">증서 번호</label>
            <Input value={certificateNo} onChange={(e) => setCertificateNo(e.target.value)} placeholder="26-001" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePrint} disabled={!seminar}>
            <Printer size={16} className="mr-1" />인쇄 / PDF 저장
          </Button>
          <Button variant="outline" onClick={handleSaveRecord} disabled={!seminar || !recipientName}>
            <Plus size={16} className="mr-1" />발급 기록 저장
          </Button>
          {certType === "completion" && (
            <Button variant="outline" onClick={handleBatchCreate} disabled={!seminar}>
              <Download size={16} className="mr-1" />출석자 일괄 수료증
            </Button>
          )}
        </div>
      </div>

      {seminar && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">미리보기 (A4 세로)</p>
          <div ref={printRef} className="overflow-auto rounded-lg border shadow-lg" style={{ maxHeight: "80vh" }}>
            <CertificatePreview
              type={certType}
              seminarTitle={seminar.title}
              semester={semester || inferSemester(seminar.date)}
              seminarDate={new Date(seminar.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              recipientName={recipientName}
              certificateNo={certificateNo}
            />
          </div>
        </div>
      )}
    </div>
  );
}

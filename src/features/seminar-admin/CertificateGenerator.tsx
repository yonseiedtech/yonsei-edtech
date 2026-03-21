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

/** 이름에 자간 추가: "홍길동" → "홍 길 동" */
function spacedName(name: string): string {
  return name.split("").join(" ");
}

function CertificatePreview({
  type,
  seminarTitle,
  seminarDate,
  semester,
  recipientName,
}: {
  type: CertType;
  seminarTitle: string;
  seminarDate: string;
  semester: string;
  recipientName: string;
}) {
  const isCompletion = type === "completion";
  const title = isCompletion ? "수 료 증" : "감 사 장";

  return (
    <div
      className="relative mx-auto bg-white"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "0",
        fontFamily: "'Batang', 'Nanum Myeongjo', serif",
      }}
    >
      {/* 상단 파란 테두리 */}
      <div style={{ height: "8px", background: "#003876" }} />

      {/* 본문 영역 */}
      <div
        className="flex flex-col items-center"
        style={{ padding: "50px 60px 40px" }}
      >
        {/* 제목 */}
        <h1
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            letterSpacing: "0.4em",
            color: "#000",
            marginBottom: "8px",
          }}
        >
          {title}
        </h1>

        {/* 서브타이틀 */}
        <p
          style={{
            fontSize: "11px",
            color: "#666",
            letterSpacing: "0.1em",
            marginBottom: "2px",
          }}
        >
          Yonsei Educational Technology Association
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "#666",
            letterSpacing: "0.2em",
            marginBottom: "40px",
          }}
        >
          연세교육공학회
        </p>

        {/* 수여자 이름 */}
        <div style={{ marginBottom: "50px", textAlign: "right", width: "100%" }}>
          <span
            style={{
              fontSize: "28px",
              fontWeight: "600",
              letterSpacing: "0.5em",
            }}
          >
            {recipientName ? spacedName(recipientName) : "___________"}
          </span>
          <span
            style={{
              fontSize: "16px",
              marginLeft: "12px",
              fontWeight: "normal",
            }}
          >
            선생님
          </span>
        </div>

        {/* 워터마크 엠블럼 (배경) */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "40%",
            opacity: 0.08,
            width: "320px",
            height: "320px",
            pointerEvents: "none",
          }}
        >
          <Image
            src="/yonsei-emblem.svg"
            alt=""
            width={320}
            height={320}
            className="h-full w-full"
          />
        </div>

        {/* 본문 텍스트 */}
        <div
          className="relative"
          style={{
            fontSize: "18px",
            lineHeight: "2.2",
            textAlign: "left",
            width: "100%",
            maxWidth: "520px",
            margin: "0 auto",
            wordBreak: "keep-all",
          }}
        >
          {isCompletion ? (
            <p>
              귀하께서는 {semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량
              강화를 위하여 주관한 연세교육공학 학술대회 &lt;{seminarTitle || "___________"}&gt;에
              참석하여 소정의 과정을 이수하였기에 이 수료증을 수여합니다.
            </p>
          ) : (
            <p>
              귀하께서는 {semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량
              강화를 위하여 주관한 연세교육공학 학술대회 &lt;{seminarTitle || "___________"}&gt;에서
              귀하께서 가지신 지식과 경험을 헌신적이고 열정적으로 공유해 주심으로서
              구성원들의 성장에 큰 도움을 주셨음에 감사드리며, 연세교육공학회
              구성원들의 마음을 담아 감사장을 드립니다.
            </p>
          )}
        </div>

        {/* 날짜 */}
        <p
          style={{
            fontSize: "18px",
            marginTop: "60px",
            letterSpacing: "0.15em",
          }}
        >
          {seminarDate}
        </p>

        {/* 하단 로고 + 직인 */}
        <div
          className="flex items-center justify-center gap-4"
          style={{ marginTop: "40px" }}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/yonsei-emblem.svg"
              alt="연세대학교"
              width={36}
              height={36}
            />
            <div style={{ lineHeight: 1.3 }}>
              <p style={{ fontSize: "18px", fontWeight: "bold" }}>연세교육공학회</p>
              <p style={{ fontSize: "9px", color: "#666" }}>
                Yonsei Educational Technology Association
              </p>
            </div>
          </div>
          {/* 직인 자리 */}
          <div
            style={{
              width: "56px",
              height: "56px",
              border: "2px solid #cc3333",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#cc3333",
              fontSize: "10px",
              fontWeight: "bold",
              lineHeight: 1.2,
              textAlign: "center",
            }}
          >
            연세
            <br />
            교육공학회
          </div>
        </div>
      </div>

      {/* 하단 파란 테두리 */}
      <div style={{ height: "8px", background: "#003876" }} />
    </div>
  );
}

/** 세미나 날짜에서 학기 추론 */
function inferSemester(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const sem = month >= 3 && month <= 8 ? "1학기" : "2학기";
  return `${year}년 ${sem}`;
}

export default function CertificateGenerator() {
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [certType, setCertType] = useState<CertType>("appreciation");
  const [recipientName, setRecipientName] = useState("");
  const [semester, setSemester] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");

  // 세미나 선택 시 학기 자동 추론
  function handleSeminarChange(id: string) {
    setSelectedId(id || null);
    const s = seminars.find((sem) => sem.id === id);
    if (s) setSemester(inferSemester(s.date));
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
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
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
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
      toast.success(`${CERT_LABELS[certType].label} 기록이 저장되었습니다.`);
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
      await certificatesApi.create({
        seminarId: seminar.id,
        seminarTitle: seminar.title,
        recipientName: att.userName,
        type: "completion",
        issuedAt: new Date().toISOString(),
        issuedBy: user?.id ?? "",
      });
    }
    toast.success(`${targets.length}명에게 수료증 기록이 생성되었습니다.`);
  }

  return (
    <div className="space-y-6">
      {/* 설정 영역 */}
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

        {/* 종류 선택 */}
        <div>
          <label className="mb-2 block text-sm font-medium">종류</label>
          <div className="flex gap-2">
            {(Object.entries(CERT_LABELS) as [CertType, typeof CERT_LABELS[CertType]][]).map(
              ([key, { label, icon }]) => (
                <Button
                  key={key}
                  size="sm"
                  variant={certType === key ? "default" : "outline"}
                  onClick={() => setCertType(key)}
                >
                  {icon}
                  <span className="ml-1">{label}</span>
                </Button>
              ),
            )}
          </div>
        </div>

        {/* 수여자 정보 + 학기 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">수여자 이름</label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">학기</label>
            <Input
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="2026년 1학기"
            />
          </div>
          <div className="flex items-end">
            {/* 빈 공간 */}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={handlePrint} disabled={!seminar}>
            <Printer size={16} className="mr-1" />
            인쇄 / PDF 저장
          </Button>
          <Button variant="outline" onClick={handleSaveRecord} disabled={!seminar || !recipientName}>
            <Plus size={16} className="mr-1" />
            발급 기록 저장
          </Button>
          {certType === "completion" && (
            <Button variant="outline" onClick={handleBatchCreate} disabled={!seminar}>
              <Download size={16} className="mr-1" />
              출석자 일괄 수료증 기록
            </Button>
          )}
        </div>
      </div>

      {/* 미리보기 */}
      {seminar && (
        <div>
          <p className="mb-2 text-sm font-medium text-muted-foreground">미리보기 (A4 세로)</p>
          <div
            ref={printRef}
            className="overflow-auto rounded-lg border shadow-lg"
            style={{ maxHeight: "80vh" }}
          >
            <CertificatePreview
              type={certType}
              seminarTitle={seminar.title}
              semester={semester || inferSemester(seminar.date)}
              seminarDate={new Date(seminar.date).toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
              recipientName={recipientName}
            />
          </div>
        </div>
      )}
    </div>
  );
}

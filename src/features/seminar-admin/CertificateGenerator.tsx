"use client";

import { useState, useRef } from "react";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { certificatesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, Award, Heart, Plus, Settings } from "lucide-react";
import { toast } from "sonner";

type CertType = "completion" | "appreciation";

const CERT_LABELS: Record<CertType, { label: string; icon: React.ReactNode }> = {
  completion: { label: "수료증", icon: <Award size={16} /> },
  appreciation: { label: "감사장", icon: <Heart size={16} /> },
};

/** 이름 자간: "홍길동" → "홍 길 동" */
function spacedName(name: string): string {
  return name.split("").join("\u2002");
}

async function generateCertificateNo(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  try {
    const existing = await certificatesApi.list();
    let maxNum = 0;
    for (const c of existing.data) {
      const no = (c as Record<string, unknown>).certificateNo as string | undefined;
      if (no && no.startsWith(`${yy}-`)) {
        const num = parseInt(no.split("-")[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
    return `${yy}-${String(maxNum + 1).padStart(3, "0")}`;
  } catch {
    return `${yy}-001`;
  }
}

/* ─────────────────────────────────────────────
 * 감사장/수료증 프리뷰 — pptx 원본 기반 디자인
 * 폰트: 페이퍼로지 8 ExtraBold (로컬) / 웹 대체
 * ───────────────────────────────────────────── */

interface CertStyle {
  fontFamily: string;
  borderColor: string;
}

function CertificatePreview({
  type,
  seminarTitle,
  seminarDate,
  semester,
  recipientName,
  certificateNo,
  bodyText,
  style,
}: {
  type: CertType;
  seminarTitle: string;
  seminarDate: string;
  semester: string;
  recipientName: string;
  certificateNo: string;
  bodyText: string;
  style: CertStyle;
}) {
  const isCompletion = type === "completion";
  const title = isCompletion ? "수 료 증" : "감사장";
  const accentColor = style.borderColor;

  return (
    <div
      className="relative mx-auto bg-white"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: style.fontFamily,
        overflow: "hidden",
      }}
    >
      {/* ─── 이중 프레임 ─── */}
      <div
        style={{
          position: "absolute",
          inset: "10mm",
          border: `2.5px solid ${accentColor}`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "13mm",
          border: `0.8px solid ${accentColor}`,
          opacity: 0.35,
          pointerEvents: "none",
        }}
      />

      {/* ─── 네 모서리 꼭짓점 장식 ─── */}
      {[
        { top: "10mm", left: "10mm", bt: true, bl: true },
        { top: "10mm", right: "10mm", bt: true, br: true },
        { bottom: "10mm", left: "10mm", bb: true, bl: true },
        { bottom: "10mm", right: "10mm", bb: true, br: true },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: pos.top, bottom: pos.bottom,
            left: pos.left, right: pos.right,
            width: "20px",
            height: "20px",
            borderTop: pos.bt ? `3px solid ${accentColor}` : "none",
            borderBottom: pos.bb ? `3px solid ${accentColor}` : "none",
            borderLeft: pos.bl ? `3px solid ${accentColor}` : "none",
            borderRight: pos.br ? `3px solid ${accentColor}` : "none",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ─── 본문 영역 ─── */}
      <div
        className="flex flex-col items-center"
        style={{ padding: "22mm 36mm 18mm" }}
      >
        {/* 증서 번호 */}
        <div style={{ alignSelf: "flex-start", marginBottom: "20mm" }}>
          <span
            style={{
              fontSize: "11pt",
              fontWeight: 700,
              color: "#666",
              letterSpacing: "0.08em",
            }}
          >
            제 {certificateNo || "0"} 호
          </span>
        </div>

        {/* 제목 */}
        <h1
          style={{
            fontSize: "42pt",
            fontWeight: 800,
            letterSpacing: "0.3em",
            color: accentColor,
            marginBottom: "5mm",
            textAlign: "center",
          }}
        >
          {title}
        </h1>

        {/* 제목 하단 장식선 */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18mm" }}>
          <div style={{ width: "40px", height: "1px", background: accentColor, opacity: 0.4 }} />
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: accentColor, opacity: 0.3 }} />
          <div style={{ width: "40px", height: "1px", background: accentColor, opacity: 0.4 }} />
        </div>

        {/* 수여자 이름 */}
        <div style={{ marginBottom: "14mm", textAlign: "right", width: "100%" }}>
          <span
            style={{
              fontSize: "26pt",
              fontWeight: 800,
              letterSpacing: "0.25em",
              color: "#111",
            }}
          >
            {recipientName || "___________"}
          </span>
          <span
            style={{
              fontSize: "13pt",
              marginLeft: "6px",
              fontWeight: 600,
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
            top: "40%",
            opacity: 0.06,
            width: "300px",
            height: "300px",
            pointerEvents: "none",
          }}
        >
          <img src="/cert-emblem.png" alt="" style={{ width: "100%", height: "100%" }} />
        </div>

        {/* 본문 */}
        <div
          className="relative"
          style={{
            fontSize: "12.5pt",
            lineHeight: "2.5",
            textAlign: "justify",
            width: "100%",
            maxWidth: "460px",
            margin: "0 auto",
            wordBreak: "keep-all",
            color: "#222",
            fontWeight: 700,
          }}
        >
          <p style={{ textIndent: "1em", whiteSpace: "pre-wrap" }}>
            {bodyText}
          </p>
        </div>

        {/* 날짜 */}
        <p
          style={{
            fontSize: "13pt",
            fontWeight: 700,
            marginTop: "22mm",
            letterSpacing: "0.15em",
            textAlign: "center",
            color: "#222",
          }}
        >
          {seminarDate}
        </p>

        {/* ─── 하단 서명 영역 ─── */}
        <div
          style={{
            marginTop: "18mm",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0",
          }}
        >
          {/* 구분선 */}
          <div style={{ width: "50px", height: "1.5px", background: accentColor, opacity: 0.25, marginBottom: "14mm" }} />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
            }}
          >
            {/* 학회 엠블럼 */}
            <img
              src="/cert-emblem.png"
              alt="연세대학교"
              style={{ width: "48px", height: "48px" }}
            />

            {/* 학회명 + 영문명 */}
            <div style={{ textAlign: "center" }}>
              <p
                style={{
                  fontSize: "26px",
                  fontWeight: 800,
                  color: accentColor,
                  fontFamily: style.fontFamily,
                  letterSpacing: "0.2em",
                  lineHeight: 1.2,
                  margin: 0,
                }}
              >
                연세교육공학회
              </p>
              <p
                style={{
                  fontSize: "8px",
                  color: "#999",
                  fontFamily: style.fontFamily,
                  letterSpacing: "0.08em",
                  margin: "2px 0 0",
                }}
              >
                Yonsei Educational Technology Association
              </p>
            </div>

            {/* 직인 이미지 */}
            <img
              src="/cert-seal.jpeg"
              alt="직인"
              style={{ width: "52px", height: "52px" }}
            />
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

function getDefaultBody(type: CertType, semester: string, seminarTitle: string): string {
  if (type === "completion") {
    return `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle || "___"}>에 참석하여 소정의 과정을 이수하였기에 이 수료증을 수여합니다.`;
  }
  return `귀하께서는 ${semester} 연세교육공학회에서 구성원들의 교육공학 핵심 역량강화를 위하여 주관한 연세교육공학 학술대회 <${seminarTitle || "___"}>에서 귀하께서가 지신 지식과 경험을 헌신적이고 열정적으로 공유해주심으로서 구성원들의 성장에 큰 도움을 주셨음에 감사드리며, 연세교육공학회 구성원들의 마음을 담아 감사장을 드립니다.`;
}

const FONT_PRESETS = [
  { label: "페이퍼로지 (로컬)", value: "'페이퍼로지 8 ExtraBold', '페이퍼로지 8', serif" },
  { label: "바탕체", value: "'Batang', 'Nanum Myeongjo', serif" },
  { label: "나눔명조", value: "'Nanum Myeongjo', 'Batang', serif" },
  { label: "굴림", value: "'Gulim', 'Malgun Gothic', sans-serif" },
];

export default function CertificateGenerator() {
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [certType, setCertType] = useState<CertType>("appreciation");
  const [recipientName, setRecipientName] = useState("");
  const [semester, setSemester] = useState("");
  const [certificateNo, setCertificateNo] = useState("");
  const [showEditMode, setShowEditMode] = useState(false);
  const [bodyText, setBodyText] = useState("");
  const [fontFamily, setFontFamily] = useState(FONT_PRESETS[0].value);
  const [borderColor, setBorderColor] = useState("#003378");
  const printRef = useRef<HTMLDivElement>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");

  const currentSemester = semester || (seminar ? inferSemester(seminar.date) : "2026년 1학기");
  const currentBody = bodyText || getDefaultBody(certType, currentSemester, seminar?.title || "세미나 제목");

  async function handleSeminarChange(id: string) {
    setSelectedId(id || null);
    const s = seminars.find((sem) => sem.id === id);
    if (s) {
      setSemester(inferSemester(s.date));
      setCertificateNo(await generateCertificateNo());
      setBodyText("");
    }
  }

  function handleTypeChange(type: CertType) {
    setCertType(type);
    setBodyText("");
  }

  function handlePrint() {
    if (!printRef.current) return;

    // 인쇄 전용 스타일을 동적으로 주입
    const styleId = "cert-print-style";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 0; }
        body > *:not(#cert-print-container) { display: none !important; }
        #cert-print-container {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          z-index: 99999 !important;
          background: white !important;
          transform: none !important;
          width: 210mm !important;
          min-height: 297mm !important;
          overflow: visible !important;
        }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      }
    `;

    // 인쇄 전용 컨테이너 생성 (원본 DOM을 클론)
    let container = document.getElementById("cert-print-container");
    if (container) container.remove();
    container = document.createElement("div");
    container.id = "cert-print-container";
    container.style.display = "none";
    container.innerHTML = printRef.current.innerHTML;
    document.body.appendChild(container);

    // 인쇄 후 정리
    const cleanup = () => {
      container?.remove();
      if (styleEl) styleEl.textContent = "";
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);

    setTimeout(() => window.print(), 100);
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

    // 기존 수료증 조회 (중복 방지)
    const existingRes = await certificatesApi.list(seminar.id);
    const existingNames = new Set(
      (existingRes.data as unknown as { recipientName: string }[]).map((c) => c.recipientName)
    );

    const newTargets = targets.filter((a) => !existingNames.has(a.userName));
    if (newTargets.length === 0) {
      toast.error("모든 출석자에게 이미 수료증이 발급되었습니다.");
      return;
    }

    for (const att of newTargets) {
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

    const skipped = targets.length - newTargets.length;
    toast.success(
      `${newTargets.length}명 수료증 생성 완료` + (skipped > 0 ? ` (${skipped}명 중복 스킵)` : "")
    );
  }

  // 참석자 목록에서 선택하여 수기 추가
  async function handleAddFromAttendee(name: string) {
    if (!seminar) return;

    // 중복 확인
    const existingRes = await certificatesApi.list(seminar.id);
    const existingNames = new Set(
      (existingRes.data as unknown as { recipientName: string }[]).map((c) => c.recipientName)
    );
    if (existingNames.has(name)) {
      toast.error(`${name}님에게 이미 수료증이 발급되었습니다.`);
      return;
    }

    const no = await generateCertificateNo();
    await certificatesApi.create({
      seminarId: seminar.id,
      seminarTitle: seminar.title,
      recipientName: name,
      type: certType,
      certificateNo: no,
      issuedAt: new Date().toISOString(),
      issuedBy: user?.id ?? "",
    });
    setRecipientName(name);
    toast.success(`${name}님 ${certType === "completion" ? "수료증" : "감사장"} 생성 완료`);
  }

  const previewDate = seminar
    ? new Date(seminar.date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* 좌측: 설정 패널 */}
      <div className="w-full shrink-0 space-y-4 lg:w-80">
        <div className="rounded-xl border bg-white p-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">세미나 선택</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => handleSeminarChange(e.target.value)}
              className="w-full rounded-lg border px-3 py-2 text-sm"
            >
              <option value="">-- 세미나 선택 --</option>
              {seminars.map((s) => (
                <option key={s.id} value={s.id}>{s.title} ({s.date})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">종류</label>
            <div className="flex gap-2">
              {(Object.entries(CERT_LABELS) as [CertType, typeof CERT_LABELS[CertType]][]).map(
                ([key, { label, icon }]) => (
                  <Button key={key} size="sm" variant={certType === key ? "default" : "outline"} onClick={() => handleTypeChange(key)}>
                    {icon}
                    <span className="ml-1">{label}</span>
                  </Button>
                ),
              )}
            </div>
          </div>

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
            <Input value={certificateNo} readOnly disabled placeholder="자동 생성" className="bg-gray-50" />
          </div>

          {/* 편집 모드 토글 */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowEditMode(!showEditMode)}
          >
            <Settings size={14} className="mr-1" />
            {showEditMode ? "편집 모드 닫기" : "편집 모드 열기"}
          </Button>

          {showEditMode && (
            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <div>
                <label className="mb-1 block text-xs font-medium">폰트</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="w-full rounded-md border px-2 py-1.5 text-sm"
                >
                  {FONT_PRESETS.map((fp) => (
                    <option key={fp.value} value={fp.value}>{fp.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  페이퍼로지는 로컬 설치 시 인쇄에 적용됩니다.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">테두리 색상</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded border"
                  />
                  <Input
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="#003378"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">본문 내용 편집</label>
                <Textarea
                  value={bodyText || currentBody}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={6}
                  className="text-xs"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 text-xs"
                  onClick={() => setBodyText("")}
                >
                  기본 텍스트로 초기화
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Button className="w-full" onClick={handlePrint} disabled={!seminar}>
              <Printer size={16} className="mr-1" />인쇄 / PDF 저장
            </Button>
            <Button className="w-full" variant="outline" onClick={handleSaveRecord} disabled={!seminar || !recipientName}>
              <Plus size={16} className="mr-1" />발급 기록 저장
            </Button>
            {certType === "completion" && (
              <Button className="w-full" variant="outline" onClick={handleBatchCreate} disabled={!seminar}>
                <Download size={16} className="mr-1" />출석자 일괄 수료증
              </Button>
            )}
          </div>

          {/* 참석자 목록에서 수기 추가 */}
          {seminar && attendees.length > 0 && (
            <div className="mt-4 rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">참석자 목록에서 개별 추가</p>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {attendees.map((att) => (
                  <div key={att.id} className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-white">
                    <span>
                      {att.userName}
                      {att.checkedIn && <span className="ml-1 text-green-600">(출석)</span>}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => handleAddFromAttendee(att.userName)}
                    >
                      <Plus size={10} className="mr-0.5" />추가
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 우측: 미리보기 (항상 표시) */}
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-medium text-muted-foreground">미리보기 (A4 세로)</p>
        <div
          ref={printRef}
          className="overflow-auto rounded-lg border shadow-lg"
          style={{ maxHeight: "85vh", transform: "scale(0.6)", transformOrigin: "top left", width: "166.7%" }}
        >
          <CertificatePreview
            type={certType}
            seminarTitle={seminar?.title || "세미나 제목"}
            semester={currentSemester}
            seminarDate={previewDate || "2026년 1월 1일"}
            recipientName={recipientName}
            certificateNo={certificateNo}
            bodyText={currentBody}
            style={{ fontFamily, borderColor }}
          />
        </div>
      </div>
    </div>
  );
}

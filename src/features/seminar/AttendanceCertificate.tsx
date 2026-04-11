"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface AttendanceCertificateProps {
  seminarTitle: string;
  seminarDate: string;
  seminarLocation: string;
  attendeeName: string;
  generation?: number;
  checkedInAt?: string | null;
}

const SOCIAL_LINKS = [
  {
    name: "LinkedIn",
    icon: (
      <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
    color: "bg-[#0077B5] hover:bg-[#006399] text-white",
    share: (title: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&title=${encodeURIComponent(title)}`,
  },
  {
    name: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    color: "bg-[#1877F2] hover:bg-[#166FE5] text-white",
    share: (title: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(title)}`,
  },
];

export default function AttendanceCertificate({
  seminarTitle,
  seminarDate,
  seminarLocation,
  attendeeName,
  generation,
  checkedInAt,
}: AttendanceCertificateProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [showShare, setShowShare] = useState(false);

  const formattedDate = (() => {
    const d = new Date(seminarDate);
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  })();

  const issuedDate = (() => {
    const d = checkedInAt ? new Date(checkedInAt) : new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  })();

  async function getCanvas() {
    if (!certRef.current) return null;
    const html2canvas = (await import("html2canvas-pro")).default;
    return html2canvas(certRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
      pdf.save(`참석확인서_${attendeeName}_${seminarTitle}.pdf`);
      toast.success("참석 확인서가 다운로드되었습니다.");
    } catch {
      toast.error("다운로드 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveImage() {
    setDownloading(true);
    try {
      const canvas = await getCanvas();
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = `참석확인서_${attendeeName}_${seminarTitle}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("이미지가 저장되었습니다. 인스타그램 스토리에 업로드하세요!");
    } catch {
      toast.error("이미지 저장 중 오류가 발생했습니다.");
    } finally {
      setDownloading(false);
    }
  }

  function handleSocialShare(url: string) {
    window.open(url, "_blank", "width=600,height=400");
  }

  const shareText = `${seminarTitle} 세미나에 참석했습니다! #연세교육공학회 #세미나 #교육공학`;

  return (
    <div className="flex items-center gap-2">
      <Button onClick={handleDownload} disabled={downloading} size="sm" variant="outline">
        {downloading ? <Loader2 size={16} className="mr-1 animate-spin" /> : <Download size={16} className="mr-1" />}
        PDF
      </Button>

      <div className="relative">
        <Button
          onClick={() => setShowShare(!showShare)}
          size="sm"
          variant="outline"
        >
          <Share2 size={16} className="mr-1" />
          공유
        </Button>

        {showShare && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-white p-2 shadow-lg">
            <button
              onClick={() => { handleSaveImage(); setShowShare(false); }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <ImageIcon size={14} />
              이미지 저장 (인스타용)
            </button>
            {SOCIAL_LINKS.map((social) => (
              <button
                key={social.name}
                onClick={() => {
                  handleSocialShare(social.share(shareText));
                  setShowShare(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
              >
                {social.icon}
                {social.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 오프스크린 렌더링 */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div
          ref={certRef}
          style={{
            width: "1122px",
            height: "793px",
            background: "#ffffff",
            fontFamily: "'Noto Serif KR', 'Batang', serif",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* 테두리 장식 */}
          <div style={{ position: "absolute", inset: "20px", border: "3px solid #1e3a5f", borderRadius: "4px" }} />
          <div style={{ position: "absolute", inset: "26px", border: "1px solid #1e3a5f", borderRadius: "2px" }} />

          {/* 내용 */}
          <div
            style={{
              position: "relative",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 80px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "14px", color: "#666", letterSpacing: "4px", marginBottom: "8px" }}>
              연세대학교 교육공학회
            </div>

            <h1
              style={{
                fontSize: "42px",
                fontWeight: 700,
                color: "#1e3a5f",
                letterSpacing: "12px",
                marginBottom: "40px",
              }}
            >
              참석 확인서
            </h1>

            <div style={{ fontSize: "20px", color: "#333", lineHeight: 2, marginBottom: "30px" }}>
              <div>
                <span style={{ color: "#666", fontSize: "16px" }}>성 명 : </span>
                <span style={{ fontWeight: 700, fontSize: "24px", borderBottom: "2px solid #1e3a5f", padding: "0 20px" }}>
                  {attendeeName}
                </span>
                {generation && (
                  <span style={{ marginLeft: "16px", color: "#666", fontSize: "16px" }}>({generation}기)</span>
                )}
              </div>
            </div>

            <div style={{ fontSize: "17px", color: "#444", lineHeight: 2.2, maxWidth: "700px", wordBreak: "keep-all" }}>
              <p>위 사람은 아래 세미나에 참석하였음을 확인합니다.</p>
            </div>

            <div style={{ marginTop: "24px", marginBottom: "36px", textAlign: "left", fontSize: "15px", color: "#444", lineHeight: 2 }}>
              <div>
                <span style={{ display: "inline-block", width: "80px", fontWeight: 600, color: "#1e3a5f" }}>세미나</span>
                <span>{seminarTitle}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", width: "80px", fontWeight: 600, color: "#1e3a5f" }}>일 시</span>
                <span>{formattedDate}</span>
              </div>
              <div>
                <span style={{ display: "inline-block", width: "80px", fontWeight: 600, color: "#1e3a5f" }}>장 소</span>
                <span>{seminarLocation}</span>
              </div>
            </div>

            <div style={{ fontSize: "16px", color: "#555", marginBottom: "30px" }}>{issuedDate}</div>

            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1e3a5f" }}>
              연세대학교 교육공학회 회장
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

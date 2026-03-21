"use client";

import { useState, useRef } from "react";
import { useSeminars, useAttendees } from "@/features/seminar/useSeminar";
import { useAuthStore } from "@/features/auth/auth-store";
import { certificatesApi } from "@/lib/bkend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, Award, Heart, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CertType = "completion" | "appreciation";

const CERT_LABELS: Record<CertType, { label: string; icon: React.ReactNode }> = {
  completion: { label: "수료증", icon: <Award size={16} /> },
  appreciation: { label: "감사장", icon: <Heart size={16} /> },
};

function CertificatePreview({
  type,
  seminarTitle,
  seminarDate,
  recipientName,
  recipientAffiliation,
}: {
  type: CertType;
  seminarTitle: string;
  seminarDate: string;
  recipientName: string;
  recipientAffiliation?: string;
}) {
  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isCompletion = type === "completion";

  return (
    <div
      className="relative mx-auto aspect-[1.414/1] w-full max-w-2xl overflow-hidden bg-white"
      style={{
        border: "3px solid #1e3a5f",
        padding: "48px",
      }}
    >
      {/* 테두리 장식 */}
      <div
        className="absolute inset-3 border-2"
        style={{ borderColor: "#c4a35a" }}
      />

      <div className="relative flex h-full flex-col items-center justify-between text-center">
        {/* 상단: 로고 영역 */}
        <div>
          <p className="text-xs tracking-[0.3em] text-muted-foreground">
            연세대학교 교육공학회
          </p>
          <p className="text-xs text-muted-foreground">
            Yonsei Educational Technology Association
          </p>
        </div>

        {/* 중앙: 제목 */}
        <div className="space-y-6">
          <h1
            className="text-4xl font-bold tracking-wider"
            style={{ color: "#1e3a5f" }}
          >
            {isCompletion ? "수 료 증" : "감 사 장"}
          </h1>

          {/* 수여자 */}
          <div className="space-y-1">
            <p className="text-2xl font-semibold">{recipientName || "___________"}</p>
            {recipientAffiliation && (
              <p className="text-sm text-muted-foreground">{recipientAffiliation}</p>
            )}
          </div>

          {/* 본문 */}
          <div className="mx-auto max-w-md space-y-2 text-sm leading-relaxed">
            {isCompletion ? (
              <p>
                위 사람은 연세교육공학회 주최 &ldquo;{seminarTitle || "___________"}&rdquo;
                세미나({seminarDate || "____년 __월 __일"})에 참석하여 소정의 과정을
                이수하였기에 이 증서를 수여합니다.
              </p>
            ) : (
              <p>
                위 사람은 연세교육공학회 주최 &ldquo;{seminarTitle || "___________"}&rdquo;
                세미나({seminarDate || "____년 __월 __일"})에서 귀중한 발표와 학술적
                기여를 해주신 데 대하여 깊은 감사의 뜻을 전하며 이 감사장을 드립니다.
              </p>
            )}
          </div>
        </div>

        {/* 하단: 날짜 + 서명 */}
        <div className="w-full space-y-4">
          <p className="text-sm">{today}</p>
          <div className="flex items-end justify-center gap-2">
            <span className="text-sm font-medium">연세교육공학회장</span>
            <span className="inline-block w-20 border-b border-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">(인)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificateGenerator() {
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [certType, setCertType] = useState<CertType>("completion");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAffiliation, setRecipientAffiliation] = useState("");
  const [batchMode, setBatchMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const seminar = seminars.find((s) => s.id === selectedId);
  const { attendees } = useAttendees(selectedId ?? "");

  function handlePrint() {
    if (!printRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${CERT_LABELS[certType].label}</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
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
        recipientAffiliation: recipientAffiliation || undefined,
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
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium">세미나 선택</label>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
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

        {/* 수여자 정보 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium">수여자 이름</label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              소속 <span className="text-muted-foreground">(선택)</span>
            </label>
            <Input
              value={recipientAffiliation}
              onChange={(e) => setRecipientAffiliation(e.target.value)}
              placeholder="연세대학교 교육학과"
            />
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
        <div ref={printRef}>
          <CertificatePreview
            type={certType}
            seminarTitle={seminar.title}
            seminarDate={new Date(seminar.date).toLocaleDateString("ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            recipientName={recipientName}
            recipientAffiliation={recipientAffiliation}
          />
        </div>
      )}
    </div>
  );
}

"use client";

// ── 인쇄용 명함 섹션 (마이페이지 "내 명함" 내 추가 블록, 2026-07-19) ──
//
// 기존 모바일 명함(BusinessCard, 세로 화면용)은 그대로 두고, 인쇄소 제출용 가로 명함(90×50mm)
// 미리보기 + 고품질 PDF 다운로드를 추가 기능으로 제공한다.
// PDF 는 클라이언트에서 생성(선택 필드만 문서에 포함 → 개인정보 최소화). QR·엠블럼은 캔버스로
// 고해상 PNG 를 만들어 임베드, 텍스트/도형은 @react-pdf 벡터(300dpi 이상 충족).

import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import PrintBusinessCard from "@/features/card/PrintBusinessCard";
import {
  PRINT_CARD_COLORS,
  PRINT_CARD_CONTACT_STORAGE_KEY,
  PRINT_CARD_VARIANT_LABELS,
  buildPrintCardLines,
  formatPhone,
  printCardFilename,
  type PrintCardVariant,
} from "@/features/card/print-card";

const VARIANTS: PrintCardVariant[] = ["light", "navy"];

/** SVG(public 동일 출처) → 고해상 PNG data URL. 실패 시 undefined(텍스트 배지 폴백). */
async function svgToPngDataUrl(src: string, size: number): Promise<string | undefined> {
  try {
    const img = new Image();
    img.decoding = "async";
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("emblem load failed"));
    });
    img.src = src;
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, size, size);
    return canvas.toDataURL("image/png");
  } catch {
    return undefined;
  }
}

export default function PrintCardSection({
  user,
  profileUrl,
}: {
  user: User;
  profileUrl: string;
}) {
  const [variant, setVariant] = useState<PrintCardVariant>("light");
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(false);
  const [showField, setShowField] = useState(true);
  const [includeBack, setIncludeBack] = useState(true);
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // 연락처 입력값 — 초기값은 프로필 기본값(SSR/CSR 일치), 마운트 후 localStorage 로 복원.
  const profileDefaults = buildPrintCardLines(user);
  const [emailInput, setEmailInput] = useState(profileDefaults.email);
  const [phoneInput, setPhoneInput] = useState(profileDefaults.phone);

  // 마운트 시 저장값 복원 (있을 때만 덮어씀 → 하이드레이션 불일치 회피)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRINT_CARD_CONTACT_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as { email?: string; phone?: string };
      if (typeof saved.email === "string") setEmailInput(saved.email);
      if (typeof saved.phone === "string") setPhoneInput(saved.phone);
    } catch {
      /* 무시 — 저장값 손상 시 프로필 기본값 유지 */
    }
  }, []);

  // 입력값 변경 시 localStorage 유지
  useEffect(() => {
    try {
      localStorage.setItem(
        PRINT_CARD_CONTACT_STORAGE_KEY,
        JSON.stringify({ email: emailInput, phone: phoneInput }),
      );
    } catch {
      /* 무시 — 저장 실패는 치명적이지 않음 */
    }
  }, [emailInput, phoneInput]);

  const qrFg = PRINT_CARD_COLORS.light.qrFg; // 항상 진한 네이비(양 변형 공통) — 인쇄 대비

  async function handleDownloadPdf() {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const qrDataUrl = qrCanvasRef.current?.toDataURL("image/png");
      if (!qrDataUrl) throw new Error("QR 생성 실패");
      const emblemDataUrl = await svgToPngDataUrl("/yonsei-emblem.svg", 256);

      const [{ pdf }, { BusinessCardPrintPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/features/card/BusinessCardPrintPdfDocument"),
      ]);

      const lines = buildPrintCardLines(user);
      const blob = await pdf(
        <BusinessCardPrintPdfDocument
          fields={{
            ...lines,
            name: user.name,
            email: emailInput,
            phone: formatPhone(phoneInput),
          }}
          colors={PRINT_CARD_COLORS[variant]}
          showEmail={showEmail}
          showPhone={showPhone}
          fieldTag={showField ? user.field : undefined}
          profileUrl={profileUrl}
          qrDataUrl={qrDataUrl}
          emblemDataUrl={emblemDataUrl}
          includeBack={includeBack}
          showCropMarks={showCropMarks}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = printCardFilename(user.name);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("인쇄용 명함 PDF를 저장했습니다.");
    } catch (e) {
      toast.error(`PDF 생성 실패: ${e instanceof Error ? e.message : "알 수 없는 오류"}`);
    } finally {
      setIsGenerating(false);
    }
  }

  const toggleClass = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
      active
        ? "border-primary bg-primary/5 text-primary"
        : "border-border text-muted-foreground hover:bg-muted",
    );

  return (
    <section className="mt-8 rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">인쇄용 명함 (인쇄소 제출용)</h3>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        실제 명함 규격(90×50mm)으로 제작해 인쇄소에 그대로 제출할 수 있는 고품질 PDF를 내려받습니다.
      </p>

      {/* 미리보기 (앞면 + 선택 시 뒷면) */}
      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1.5 text-center text-[11px] font-medium text-muted-foreground">앞면</p>
          <PrintBusinessCard
            user={user}
            variant={variant}
            showEmail={showEmail}
            showPhone={showPhone}
            showField={showField}
            email={emailInput}
            phone={formatPhone(phoneInput)}
            showGuides={showGuides}
            profileUrl={profileUrl}
            side="front"
          />
        </div>
        {includeBack && (
          <div>
            <p className="mb-1.5 text-center text-[11px] font-medium text-muted-foreground">뒷면</p>
            <PrintBusinessCard
              user={user}
              variant={variant}
              showEmail={showEmail}
              showPhone={showPhone}
              showField={showField}
              email={emailInput}
              phone={formatPhone(phoneInput)}
              showGuides={showGuides}
              profileUrl={profileUrl}
              side="back"
            />
          </div>
        )}
        {showGuides && (
          <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-4 border-t" style={{ borderColor: "rgba(229,72,77,0.85)" }} aria-hidden />
              재단선(자르는 선)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-4 border-t border-dashed" style={{ borderColor: "rgba(59,130,246,0.9)" }} aria-hidden />
              안전영역(글자 배치 한계)
            </span>
          </div>
        )}
      </div>

      {/* 디자인 변형 */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">디자인</p>
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              aria-pressed={variant === v}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                variant === v
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              <span
                className="h-3 w-3 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: PRINT_CARD_COLORS[v].bg }}
                aria-hidden
              />
              {PRINT_CARD_VARIANT_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* 표시 필드 선택 (개인정보는 본인 선택만 포함) */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">명함에 표시할 정보</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setShowEmail((v) => !v)} aria-pressed={showEmail} className={toggleClass(showEmail)}>
            이메일
          </button>
          <button type="button" onClick={() => setShowPhone((v) => !v)} aria-pressed={showPhone} className={toggleClass(showPhone)}>
            전화번호
          </button>
          <button type="button" onClick={() => setShowField((v) => !v)} aria-pressed={showField} className={toggleClass(showField)}>
            관심분야
          </button>
          <button type="button" onClick={() => setIncludeBack((v) => !v)} aria-pressed={includeBack} className={toggleClass(includeBack)}>
            뒷면 포함
          </button>
          <button type="button" onClick={() => setShowCropMarks((v) => !v)} aria-pressed={showCropMarks} className={toggleClass(showCropMarks)}>
            재단선(PDF)
          </button>
          <button type="button" onClick={() => setShowGuides((v) => !v)} aria-pressed={showGuides} className={toggleClass(showGuides)}>
            미리보기 가이드
          </button>
        </div>
      </div>

      {/* 연락처 입력 (프로필 기본값 · 자유 수정 · 자동 저장) */}
      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">연락처 (직접 수정 가능 · 자동 저장)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">전화번호</span>
            <input
              type="tel"
              inputMode="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="010-1234-5678"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">이메일</span>
            <input
              type="email"
              inputMode="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="name@example.com"
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          위 &quot;명함에 표시할 정보&quot;에서 전화번호·이메일이 켜져 있고 값이 있을 때만 명함에 표기됩니다.
        </p>
      </div>

      {/* 다운로드 */}
      <div className="mt-4">
        <Button onClick={handleDownloadPdf} disabled={isGenerating} className="w-full sm:w-auto">
          {isGenerating ? (
            <Loader2 size={16} className="mr-1.5 animate-spin" />
          ) : (
            <Download size={16} className="mr-1.5" />
          )}
          {isGenerating ? "PDF 생성 중…" : "인쇄용 PDF 다운로드"}
        </Button>
      </div>

      {/* 인쇄 안내 */}
      <div className="mt-4 flex gap-2 rounded-xl border bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p>재단 크기 90×50mm · 작업 크기 94×54mm(사방 2mm 재단여백 포함) · 안전영역 86×46mm 규격으로 생성됩니다.</p>
          <p>재단선(crop marks)은 여백 영역에만 표기되어 재단 후 남지 않습니다. 인쇄소 제출 시 켜두는 것을 권장합니다.</p>
          <p>글자·도형은 벡터라 해상도 제한이 없습니다(300dpi 이상 인쇄 품질 충족).</p>
          <p>색상은 RGB로 저장됩니다. 인쇄소에서 CMYK 변환을 권장하며, 엠블럼·QR 이미지는 RGB로 포함됩니다.</p>
          <p>QR은 본인 공개 프로필로 연결됩니다.</p>
        </div>
      </div>

      {/* PDF 임베드용 고해상 QR (화면 비노출) */}
      <div className="sr-only" aria-hidden>
        <QRCodeCanvas ref={qrCanvasRef} value={profileUrl} size={600} level="M" fgColor={qrFg} bgColor="#ffffff" />
      </div>
    </section>
  );
}

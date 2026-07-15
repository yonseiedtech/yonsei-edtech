"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/auth/auth-store";
import { rasterizePdf } from "@/lib/pdf-rasterize";
import { uploadToStorage } from "@/lib/storage";
import { slideDecksApi } from "@/lib/bkend";
import type { SeminarSlideDeck } from "@/types/seminar-live";

interface SlideUploaderProps {
  seminarId: string;
  onUploaded: (deck: SeminarSlideDeck) => void;
}

type UploadPhase =
  | { kind: "idle" }
  | { kind: "rasterizing"; done: number; total: number }
  | { kind: "uploading_pdf" }
  | { kind: "uploading_images"; done: number; total: number }
  | { kind: "saving" }
  | { kind: "done" };

function phaseLabel(phase: UploadPhase): string {
  switch (phase.kind) {
    case "rasterizing":
      return phase.total > 0
        ? `페이지 변환 중 ${phase.done}/${phase.total}`
        : "페이지 변환 준비 중…";
    case "uploading_pdf":
      return "원본 PDF 업로드 중…";
    case "uploading_images":
      return `이미지 업로드 중 ${phase.done}/${phase.total}`;
    case "saving":
      return "저장 중…";
    case "done":
      return "완료";
    default:
      return "";
  }
}

function progressPct(phase: UploadPhase): number {
  switch (phase.kind) {
    case "rasterizing":
      return phase.total > 0 ? Math.round((phase.done / phase.total) * 35) : 5;
    case "uploading_pdf":
      return 35;
    case "uploading_images":
      return 40 + (phase.total > 0 ? Math.round((phase.done / phase.total) * 50) : 0);
    case "saving":
      return 92;
    case "done":
      return 100;
    default:
      return 0;
  }
}

/**
 * 장표(PDF) 업로드 컴포넌트.
 * 선택 → rasterizePdf → PDF 업로드 → 페이지 PNG 업로드 → slideDecksApi.create → onUploaded
 */
export default function SlideUploader({ seminarId, onUploaded }: SlideUploaderProps) {
  const { user } = useAuthStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<UploadPhase>({ kind: "idle" });

  const busy = phase.kind !== "idle" && phase.kind !== "done";

  async function handleFile(file: File) {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }
    if (file.type !== "application/pdf") {
      toast.error("PDF 파일만 업로드할 수 있습니다.");
      return;
    }

    try {
      // 1. PDF → 페이지 PNG 래스터화
      setPhase({ kind: "rasterizing", done: 0, total: 0 });
      const pages = await rasterizePdf(file, (done, total) =>
        setPhase({ kind: "rasterizing", done, total }),
      );

      // Firebase Storage 제품이 이 프로젝트에 미설정(firebase deploy --only storage 불가)이라
      // 신규 seminar-slides/ 규칙을 배포할 수 없다. 대신 이미 라이브에서 동작하는 기존 규칙 경로를 재사용:
      //  - 페이지 PNG → posters/**(공개 read + 인증 이미지 write) → 게스트 포함 슬라이드 열람 가능
      //  - 원본 PDF → activity-materials/**(PDF 허용, 인증 read) → 회원 원본 다운로드
      const imageFolder = `posters/seminar-slides/${seminarId}`;
      const pdfFolder = `activity-materials/seminar-${seminarId}`;

      // 2. 원본 PDF 업로드
      setPhase({ kind: "uploading_pdf" });
      const { url: sourcePdfUrl } = await uploadToStorage(file, pdfFolder);

      // 3. 페이지 PNG 업로드 (순서 보장)
      setPhase({ kind: "uploading_images", done: 0, total: pages.length });
      const pageImageUrls: string[] = [];
      for (let i = 0; i < pages.length; i++) {
        const { url } = await uploadToStorage(pages[i].file, imageFolder);
        pageImageUrls.push(url);
        setPhase({ kind: "uploading_images", done: i + 1, total: pages.length });
      }

      // 4. 덱 레코드 생성
      setPhase({ kind: "saving" });
      const deck = await slideDecksApi.create({
        seminarId,
        title: file.name.replace(/\.pdf$/i, ""),
        sourcePdfUrl,
        pageImageUrls,
        pageCount: pages.length,
        lectureNotes: {},
        uploadedBy: user.id,
      });

      setPhase({ kind: "done" });
      toast.success("장표가 업로드되었습니다.");
      onUploaded(deck);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
      setPhase({ kind: "idle" });
    }
  }

  const pct = progressPct(phase);
  const label = phaseLabel(phase);

  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="mb-3 text-sm font-semibold text-foreground">장표(PDF) 업로드</p>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          // 같은 파일 재업로드 허용
          e.target.value = "";
        }}
      />

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn("gap-1.5")}
        >
          <Upload size={14} />
          PDF 선택
        </Button>

        {busy && (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
        {phase.kind === "done" && (
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            업로드 완료
          </span>
        )}
      </div>

      {busy && (
        <div className="mt-3 space-y-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-right text-[11px] text-muted-foreground">{pct}%</p>
        </div>
      )}
    </div>
  );
}

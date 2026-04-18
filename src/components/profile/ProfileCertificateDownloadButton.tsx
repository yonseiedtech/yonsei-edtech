"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  ownerId: string;
  ownerName: string;
  /** true면 본인판(미검증 포함) 다운로드. false면 공개판(verified만). */
  full: boolean;
}

export default function ProfileCertificateDownloadButton({
  ownerId,
  ownerName,
  full,
}: Props) {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const headers: HeadersInit = {};
      if (full) {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          toast.error("로그인이 필요합니다.");
          setBusy(false);
          return;
        }
        headers["Authorization"] = `Bearer ${token}`;
      }
      const url = `/api/profile/${ownerId}/certificate${full ? "" : "?public=true"}`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`PDF 생성 실패: ${res.status} ${detail.slice(0, 200)}`);
      }
      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const suffix = full ? "본인판" : "공개판";
      link.download = `연세교육공학회_학술포트폴리오_${ownerName}_${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
      toast.success("증명서 PDF가 생성되었습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF 생성 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
    >
      {busy ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
      증명서 PDF{full ? "" : " (공개판)"}
    </button>
  );
}

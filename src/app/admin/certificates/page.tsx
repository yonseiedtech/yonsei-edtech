"use client";

import { useState, useMemo, useRef } from "react";
import { useCertificates, useDeleteCertificate } from "@/features/admin/useCertificates";
import { useSeminars } from "@/features/seminar/useSeminar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Award, Heart, Trash2, Eye, Printer, FileDown, Loader2, ListPlus, CheckSquare, Square } from "lucide-react";
import { registrationsApi } from "@/lib/bkend";
import type { SeminarRegistration } from "@/types";
import { useAuthStore } from "@/features/auth/auth-store";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import type { Certificate } from "@/types";
import {
  CertificatePreview,
  DEFAULT_AREA_STYLES,
  CERT_STYLE_STORAGE_KEY,
  getDefaultBody,
  inferSemester,
} from "@/features/seminar-admin/CertificateGenerator";
import type { AreaKey, AreaStyle } from "@/features/seminar-admin/CertificateGenerator";

type TypeFilter = "all" | "completion" | "appreciation";

const FONT_DEFAULT = "'Hahmlet', serif";
const BORDER_COLOR = "#003378";

function loadSavedAreaStyles(): Record<AreaKey, AreaStyle> {
  if (typeof window === "undefined") return { ...DEFAULT_AREA_STYLES };
  try {
    const saved = localStorage.getItem(CERT_STYLE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const merged = {} as Record<AreaKey, AreaStyle>;
      for (const k of Object.keys(DEFAULT_AREA_STYLES) as AreaKey[]) {
        merged[k] = { ...DEFAULT_AREA_STYLES[k], ...(parsed[k] ?? {}) };
      }
      return merged;
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_AREA_STYLES };
}

export default function CertificatesPage() {
  const { seminars } = useSeminars();
  const { user } = useAuthStore();
  const [seminarId, setSeminarId] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

  // ── 일괄 발급 state ──
  const [showBatch, setShowBatch] = useState(false);
  const [batchSeminarId, setBatchSeminarId] = useState("");
  const [batchType, setBatchType] = useState<"completion" | "appreciation">("completion");
  const [batchRegistrations, setBatchRegistrations] = useState<SeminarRegistration[]>([]);
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchFetching, setBatchFetching] = useState(false);

  async function handleLoadRegistrations(sid: string) {
    if (!sid) { setBatchRegistrations([]); setBatchSelected(new Set()); return; }
    setBatchFetching(true);
    try {
      const res = await registrationsApi.list(sid);
      const confirmed = res.data.filter((r) => !r.status || r.status === "confirmed" || r.status === "pending");
      setBatchRegistrations(confirmed);
      setBatchSelected(new Set(confirmed.map((r) => r.id)));
    } catch {
      setBatchRegistrations([]);
    } finally {
      setBatchFetching(false);
    }
  }

  function toggleBatchSelect(id: string) {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBatchIssue() {
    if (!batchSeminarId || batchSelected.size === 0) return;
    setBatchLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const recipients = batchRegistrations
        .filter((r) => batchSelected.has(r.id))
        .map((r) => ({ name: r.name, email: r.email, type: batchType }));
      const res = await fetch("/api/certificates/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ seminarId: batchSeminarId, recipients, issuedBy: user?.name ?? "관리자" }),
      });
      const data = await res.json();
      if (res.ok) {
        const { toast } = await import("sonner");
        toast.success(`${data.created}건 발급 완료${data.errors.length > 0 ? ` (실패 ${data.errors.length}건)` : ""}`);
        setShowBatch(false);
        setBatchRegistrations([]);
        setBatchSelected(new Set());
        setBatchSeminarId("");
      } else {
        const { toast } = await import("sonner");
        toast.error(data.error || "발급에 실패했습니다.");
      }
    } catch {
      const { toast } = await import("sonner");
      toast.error("일괄 발급 중 오류가 발생했습니다.");
    } finally {
      setBatchLoading(false);
    }
  }

  const { certificates, isLoading } = useCertificates(seminarId || undefined);
  const deleteMut = useDeleteCertificate();

  const filtered = certificates.filter((c: Certificate) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (search && !c.recipientName.includes(search)) return false;
    return true;
  });

  const completionCount = certificates.filter((c: Certificate) => c.type === "completion").length;
  const appreciationCount = certificates.filter((c: Certificate) => c.type === "appreciation").length;

  function handleDelete(cert: Certificate) {
    if (!confirm(`"${cert.recipientName}" (${cert.certificateNo})을(를) 삭제하시겠습니까?`)) return;
    deleteMut.mutate(cert.id, {
      onSuccess: () => toast.success("삭제되었습니다."),
      onError: () => toast.error("삭제에 실패했습니다."),
    });
  }

  const previewRef = useRef<HTMLDivElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function generatePdfBlob(fileName: string): Promise<Blob | null> {
    if (!previewRef.current) return null;
    const target = previewRef.current.firstElementChild as HTMLElement | null;
    if (!target) return null;
    const clone = target.cloneNode(true) as HTMLElement;
    clone.style.transform = "none";
    const walk = (src: HTMLElement, dst: HTMLElement) => {
      const cs = window.getComputedStyle(src);
      const fontSizePx = parseFloat(cs.fontSize) || 16;
      const ls = src.style.letterSpacing;
      if (ls && ls.endsWith("em")) {
        const em = parseFloat(ls);
        if (!isNaN(em)) dst.style.letterSpacing = `${em * fontSizePx}px`;
      }
      for (let i = 0; i < src.children.length; i++) {
        walk(src.children[i] as HTMLElement, dst.children[i] as HTMLElement);
      }
    };
    walk(target, clone);
    const res = await fetch("/api/certificates/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: clone.outerHTML, fileName }),
    });
    if (!res.ok) throw new Error(`서버 응답 오류: ${res.status}`);
    return await res.blob();
  }

  async function handleDownload() {
    if (!previewCert) return;
    setPdfLoading(true);
    try {
      const fileName = `${previewCert.type === "completion" ? "수료증" : "감사장"}_${previewCert.recipientName}_${previewCert.certificateNo || "번호없음"}.pdf`;
      const blob = await generatePdfBlob(fileName);
      if (!blob) throw new Error("미리보기 요소 없음");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF가 다운로드되었습니다.");
    } catch (e) {
      console.error("[cert] PDF 다운로드 실패:", e);
      toast.error("PDF 생성에 실패했습니다.");
    } finally {
      setPdfLoading(false);
    }
  }

  async function handlePrint() {
    if (!previewCert) return;
    setPdfLoading(true);
    try {
      const fileName = `${previewCert.type === "completion" ? "수료증" : "감사장"}_${previewCert.recipientName}.pdf`;
      const blob = await generatePdfBlob(fileName);
      if (!blob) throw new Error("미리보기 요소 없음");
      const url = URL.createObjectURL(blob);
      const w = window.open(url, "_blank");
      if (!w) {
        toast.error("팝업 차단을 해제해주세요.");
      } else {
        w.addEventListener("load", () => {
          try { w.focus(); w.print(); } catch { /* ignore */ }
        });
      }
      // URL은 창이 쓸 때까지 유지 — revoke는 일정 시간 후
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error("[cert] 인쇄 실패:", e);
      toast.error("인쇄용 PDF 생성에 실패했습니다.");
    } finally {
      setPdfLoading(false);
    }
  }

  const savedAreaStyles = useMemo(() => loadSavedAreaStyles(), []);

  // CertificatePreview용 props 생성
  function buildPreviewProps(cert: Certificate) {
    const seminar = seminars.find((s) => s.id === cert.seminarId);
    const dateStr = cert.issuedAt || new Date().toISOString();
    const semester = inferSemester(dateStr);
    const seminarDate = new Date(dateStr).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const certType = cert.type as "completion" | "appreciation";
    const bodyText = getDefaultBody(certType, semester, cert.seminarTitle || seminar?.title || "");

    return {
      type: certType,
      seminarTitle: cert.seminarTitle || seminar?.title || "",
      seminarDate,
      semester,
      recipientName: cert.recipientName,
      certificateNo: cert.certificateNo || "",
      bodyText,
      style: { fontFamily: FONT_DEFAULT, borderColor: BORDER_COLOR },
      areaStyles: savedAreaStyles,
    };
  }

  return (
    <div className="space-y-6">
      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">세미나</label>
          <select value={seminarId} onChange={(e) => setSeminarId(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="">전체</option>
            {seminars.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">유형</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="rounded-lg border px-3 py-2 text-sm">
            <option value="all">전체</option>
            <option value="completion">수료증</option>
            <option value="appreciation">감사장</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">수여자 검색</label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="수여자명..." className="w-48" />
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={() => setShowBatch(true)}>
            <ListPlus size={14} className="mr-1" /> 일괄 발급
          </Button>
        </div>
      </div>

      {/* 통계 */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium">전체 {certificates.length}건</span>
        <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700">수료증 {completionCount}건</span>
        <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">감사장 {appreciationCount}건</span>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">발급 이력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-2 py-2 font-medium sm:px-4 sm:py-3">증서번호</th>
                <th className="px-2 py-2 font-medium sm:px-4 sm:py-3">세미나명</th>
                <th className="px-2 py-2 font-medium sm:px-4 sm:py-3">수여자</th>
                <th className="px-2 py-2 font-medium sm:px-4 sm:py-3">유형</th>
                <th className="px-2 py-2 font-medium sm:px-4 sm:py-3">발급일</th>
                <th className="px-2 py-2 font-medium sm:px-4 sm:py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: Certificate) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-2 py-2 font-mono sm:px-4 sm:py-3">{c.certificateNo || "-"}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3 line-clamp-1">{c.seminarTitle}</td>
                  <td className="px-2 py-2 font-medium sm:px-4 sm:py-3">{c.recipientName}</td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.type === "completion" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                      {c.type === "completion" ? <Award size={12} /> : <Heart size={12} />}
                      {c.type === "completion" ? "수료증" : "감사장"}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-muted-foreground sm:px-4 sm:py-3">
                    {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-2 py-2 sm:px-4 sm:py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPreviewCert(c)} title="미리보기">
                        <Eye size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(c)} disabled={deleteMut.isPending} title="삭제">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 일괄 발급 Dialog */}
      <Dialog open={showBatch} onOpenChange={(open) => { setShowBatch(open); if (!open) { setBatchRegistrations([]); setBatchSelected(new Set()); setBatchSeminarId(""); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ListPlus size={18} /> 일괄 발급</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">세미나 선택</label>
                <select
                  value={batchSeminarId}
                  onChange={(e) => { setBatchSeminarId(e.target.value); handleLoadRegistrations(e.target.value); }}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="">선택...</option>
                  {seminars.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">증서 유형</label>
                <select
                  value={batchType}
                  onChange={(e) => setBatchType(e.target.value as "completion" | "appreciation")}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                >
                  <option value="completion">수료증</option>
                  <option value="appreciation">감사장</option>
                </select>
              </div>
            </div>

            {batchFetching && (
              <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
            )}

            {!batchFetching && batchRegistrations.length > 0 && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">수여 대상자 ({batchSelected.size}/{batchRegistrations.length}명)</span>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                    if (batchSelected.size === batchRegistrations.length) setBatchSelected(new Set());
                    else setBatchSelected(new Set(batchRegistrations.map((r) => r.id)));
                  }}>
                    {batchSelected.size === batchRegistrations.length ? "전체 해제" : "전체 선택"}
                  </Button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
                  {batchRegistrations.map((r) => (
                    <div key={r.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/30" onClick={() => toggleBatchSelect(r.id)}>
                      {batchSelected.has(r.id) ? <CheckSquare size={16} className="text-primary shrink-0" /> : <Square size={16} className="text-muted-foreground shrink-0" />}
                      <span className="flex-1 text-sm font-medium">{r.name}</span>
                      <span className="text-xs text-muted-foreground">{r.email || "-"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!batchFetching && batchSeminarId && batchRegistrations.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">신청자가 없습니다.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatch(false)}>취소</Button>
            <Button onClick={handleBatchIssue} disabled={batchLoading || batchSelected.size === 0}>
              {batchLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Award size={14} className="mr-1" />}
              {batchSelected.size}건 발급
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 미리보기 Dialog */}
      <Dialog open={!!previewCert} onOpenChange={(open) => !open && setPreviewCert(null)}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewCert?.type === "completion" ? <Award size={18} /> : <Heart size={18} />}
              {previewCert?.type === "completion" ? "수료증" : "감사장"} 미리보기
              <span className="text-xs font-normal text-muted-foreground">({previewCert?.certificateNo})</span>
            </DialogTitle>
          </DialogHeader>
          {previewCert && (
            <div
              ref={previewRef}
              className="overflow-auto rounded-lg border"
              style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", maxHeight: "70vh" }}
            >
              <CertificatePreview {...buildPreviewProps(previewCert)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewCert(null)}>닫기</Button>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileDown size={14} className="mr-1" />}
              PDF 저장
            </Button>
            <Button size="sm" onClick={handlePrint} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Printer size={14} className="mr-1" />}
              인쇄
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

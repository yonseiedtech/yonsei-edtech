"use client";

import { useState } from "react";
import { useCertificates, useDeleteCertificate } from "@/features/admin/useCertificates";
import { useSeminars } from "@/features/seminar/useSeminar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Award, Heart, Trash2, Eye, Printer } from "lucide-react";
import { toast } from "sonner";
import type { Certificate } from "@/types";
import {
  CertificatePreview,
  DEFAULT_AREA_STYLES,
  getDefaultBody,
  inferSemester,
} from "@/features/seminar-admin/CertificateGenerator";

type TypeFilter = "all" | "completion" | "appreciation";

const FONT_DEFAULT = "'Hahmlet', serif";
const BORDER_COLOR = "#003378";

export default function CertificatesPage() {
  const { seminars } = useSeminars();
  const [seminarId, setSeminarId] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);

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

  function handlePrint() {
    window.print();
  }

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
      areaStyles: DEFAULT_AREA_STYLES,
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
              className="overflow-auto rounded-lg border"
              style={{ transform: "scale(0.5)", transformOrigin: "top left", width: "200%", maxHeight: "70vh" }}
            >
              <CertificatePreview {...buildPreviewProps(previewCert)} />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewCert(null)}>닫기</Button>
            <Button size="sm" onClick={handlePrint}><Printer size={14} className="mr-1" />인쇄</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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

type TypeFilter = "all" | "completion" | "appreciation";

function spacedName(name: string): string {
  return name.split("").join("\u2002");
}

/** 미리보기용 증서 렌더 */
function CertPreview({ cert }: { cert: Certificate }) {
  const isCompletion = cert.type === "completion";
  const title = isCompletion ? "수 료 증" : "감 사 장";
  const color = "#003378";
  const date = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <div className="mx-auto w-full max-w-md rounded-sm bg-white p-4" style={{ fontFamily: "'Batang', 'Nanum Myeongjo', serif" }}>
      <div className="rounded-sm p-4" style={{ border: `3px double ${color}` }}>
        <div className="flex flex-col items-center gap-4 p-4 text-center" style={{ border: `1px solid ${color}` }}>
          {/* 증서번호 */}
          <p className="self-end text-[10px] text-gray-400">제 {cert.certificateNo} 호</p>

          {/* 제목 */}
          <h1 className="text-2xl font-extrabold tracking-[0.3em]" style={{ color }}>{title}</h1>

          {/* 수여자 */}
          <div className="w-full text-right">
            <span className="text-lg font-extrabold">{spacedName(cert.recipientName)}</span>
            <span className="ml-2 text-sm">선생님</span>
          </div>

          {/* 구분선 */}
          <div className="w-3/5" style={{ height: "1px", background: color }} />

          {/* 본문 */}
          <p className="px-2 text-xs leading-7" style={{ textAlign: "justify" }}>
            {isCompletion
              ? `위 사람은 연세교육공학회가 주관한 「${cert.seminarTitle}」 세미나에 참석하여 소정의 과정을 성실히 수료하였기에 이 증서를 수여합니다.`
              : `위 사람은 연세교육공학회가 주관한 「${cert.seminarTitle}」에서 귀중한 시간을 내어 발표해주시고 학문적 교류에 기여해주셨기에 깊은 감사의 뜻을 담아 이 감사장을 드립니다.`
            }
          </p>

          {/* 날짜 */}
          <p className="text-xs text-gray-500">{date}</p>

          {/* 학회명 */}
          <div className="mt-2">
            <p className="text-sm font-bold" style={{ color }}>연세교육공학회</p>
            <p className="text-[9px] text-gray-400">Yonsei Educational Technology Society</p>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <DialogContent className="max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewCert?.type === "completion" ? <Award size={18} /> : <Heart size={18} />}
              {previewCert?.type === "completion" ? "수료증" : "감사장"} 미리보기
              <span className="text-xs font-normal text-muted-foreground">({previewCert?.certificateNo})</span>
            </DialogTitle>
          </DialogHeader>
          {previewCert && <CertPreview cert={previewCert} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPreviewCert(null)}>닫기</Button>
            <Button size="sm" onClick={handlePrint}><Printer size={14} className="mr-1" />인쇄</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

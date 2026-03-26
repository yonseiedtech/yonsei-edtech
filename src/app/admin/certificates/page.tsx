"use client";

import { useState } from "react";
import { useCertificates, useDeleteCertificate } from "@/features/admin/useCertificates";
import { useSeminars } from "@/features/seminar/useSeminar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Award, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Certificate } from "@/types";

type TypeFilter = "all" | "completion" | "appreciation";

export default function CertificatesPage() {
  const { seminars } = useSeminars();
  const [seminarId, setSeminarId] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

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

  return (
    <div className="space-y-6">
      {/* 필터 */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium">세미나</label>
          <select
            value={seminarId}
            onChange={(e) => setSeminarId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="">전체</option>
            {seminars.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">유형</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            <option value="all">전체</option>
            <option value="completion">수료증</option>
            <option value="appreciation">감사장</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">수여자 검색</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="수여자명..."
            className="w-48"
          />
        </div>
      </div>

      {/* 통계 */}
      <div className="flex gap-4 text-sm">
        <span className="rounded-lg bg-gray-100 px-3 py-1.5 font-medium">
          전체 {certificates.length}건
        </span>
        <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700">
          수료증 {completionCount}건
        </span>
        <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-700">
          감사장 {appreciationCount}건
        </span>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">불러오는 중...</p>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">발급 이력이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium">증서번호</th>
                <th className="px-4 py-3 font-medium">세미나명</th>
                <th className="px-4 py-3 font-medium">수여자</th>
                <th className="px-4 py-3 font-medium">유형</th>
                <th className="px-4 py-3 font-medium">발급일</th>
                <th className="px-4 py-3 font-medium w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: Certificate) => (
                <tr key={c.id} className="border-b last:border-b-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{c.certificateNo || "-"}</td>
                  <td className="px-4 py-3">{c.seminarTitle}</td>
                  <td className="px-4 py-3 font-medium">{c.recipientName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.type === "completion"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-amber-50 text-amber-700"
                    }`}>
                      {c.type === "completion" ? <Award size={12} /> : <Heart size={12} />}
                      {c.type === "completion" ? "수료증" : "감사장"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.issuedAt
                      ? new Date(c.issuedAt).toLocaleDateString("ko-KR")
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDelete(c)}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useInquiryStore } from "@/features/inquiry/inquiry-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { CheckCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminInquiryTab() {
  const { inquiries, updateStatus, deleteInquiry } = useInquiryStore();

  function handleReply(id: string) {
    updateStatus(id, "확인 후 이메일로 답변 드렸습니다.");
    toast.success("답변 완료 처리되었습니다.");
  }

  function handleDelete(id: string) {
    deleteInquiry(id);
    toast.success("문의가 삭제되었습니다.");
  }

  if (inquiries.length === 0) {
    return (
      <div className="rounded-xl border bg-white p-8 text-center text-muted-foreground">
        문의 내역이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <th className="px-4 py-3 text-left font-medium">상태</th>
            <th className="px-4 py-3 text-left font-medium">이름</th>
            <th className="px-4 py-3 text-left font-medium">이메일</th>
            <th className="px-4 py-3 text-left font-medium">내용</th>
            <th className="px-4 py-3 text-left font-medium">날짜</th>
            <th className="px-4 py-3 text-left font-medium">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {inquiries.map((inq) => (
            <tr key={inq.id}>
              <td className="px-4 py-3">
                <Badge
                  variant="secondary"
                  className={
                    inq.status === "pending"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-green-50 text-green-700"
                  }
                >
                  {inq.status === "pending" ? "대기" : "답변완료"}
                </Badge>
              </td>
              <td className="px-4 py-3 font-medium">{inq.name}</td>
              <td className="px-4 py-3 text-muted-foreground">{inq.email}</td>
              <td className="max-w-[250px] truncate px-4 py-3 text-muted-foreground">
                {inq.message}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(inq.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  {inq.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReply(inq.id)}
                    >
                      <CheckCircle size={14} className="mr-1" />
                      답변완료
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => handleDelete(inq.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

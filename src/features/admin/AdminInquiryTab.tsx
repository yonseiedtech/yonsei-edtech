"use client";

import { useState } from "react";
import { useInquiries, useUpdateInquiryStatus, useDeleteInquiry } from "@/features/inquiry/useInquiry";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { streamAI } from "@/lib/ai-client";
import { CheckCircle, Trash2, Sparkles, Send, Loader2, Mail, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import ConsolePageHeader from "@/components/admin/ConsolePageHeader";
import type { Inquiry } from "@/types";

export default function AdminInquiryTab() {
  const { inquiries } = useInquiries();
  const { updateInquiryStatus } = useUpdateInquiryStatus();
  const { deleteInquiry } = useDeleteInquiry();

  const [replyDialog, setReplyDialog] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  function handleQuickReply(id: string) {
    updateInquiryStatus({ id, reply: "확인 후 이메일로 답변 드렸습니다." });
    toast.success("답변 완료 처리되었습니다.");
  }

  function handleDelete(id: string) {
    deleteInquiry(id);
    toast.success("문의가 삭제되었습니다.");
  }

  function openReplyDialog(inq: Inquiry) {
    setReplyDialog(inq);
    setReplyText(inq.reply ?? "");
  }

  async function handleAiGenerate() {
    if (!replyDialog) return;
    setIsGenerating(true);
    setReplyText("");

    try {
      await streamAI(
        "/api/ai/inquiry-reply",
        {
          inquiryName: replyDialog.name,
          inquiryEmail: replyDialog.email,
          inquiryMessage: replyDialog.message,
        },
        (chunk) => setReplyText((prev) => prev + chunk),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI 답변 생성 실패");
    } finally {
      setIsGenerating(false);
    }
  }

  const [isSending, setIsSending] = useState(false);

  async function sendReplyEmail(inq: Inquiry, reply: string) {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;
      await fetch("/api/email/inquiry-reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: inq.email,
          name: inq.name,
          message: inq.message,
          reply,
        }),
      });
    } catch {
      // 이메일 발송 실패는 조용히 무시 (답변 저장은 성공)
    }
  }

  async function handleSendReply(withEmail: boolean) {
    if (!replyDialog || !replyText.trim()) return;
    setIsSending(true);
    try {
      updateInquiryStatus({ id: replyDialog.id, reply: replyText.trim() });
      if (withEmail && replyDialog.email) {
        await sendReplyEmail(replyDialog, replyText.trim());
        toast.success("답변이 저장되고 이메일이 발송되었습니다.");
      } else {
        toast.success("답변이 저장되었습니다.");
      }
    } finally {
      setIsSending(false);
      setReplyDialog(null);
      setReplyText("");
    }
  }

  if (inquiries.length === 0) {
    return (
      <div className="space-y-6">
        <ConsolePageHeader
          icon={HelpCircle}
          title="문의 관리"
          description="회원/외부 문의에 답변하고 처리 상태를 추적합니다."
        />
        <AdminEmptyState
          icon={HelpCircle}
          title="문의 내역이 없습니다."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        icon={HelpCircle}
        title="문의 관리"
        description="회원/외부 문의에 답변하고 처리 상태를 추적합니다."
      />
      {/* 모바일 카드 뷰 */}
      <div className="space-y-2 sm:hidden">
        {inquiries.map((inq) => (
          <div key={inq.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-[10px]",
                      inq.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-green-50 text-green-700"
                    )}
                  >
                    {inq.status === "pending" ? "대기" : "답변완료"}
                  </Badge>
                  <span className="text-sm font-medium">{inq.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{inq.email}</p>
                <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{inq.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(inq.createdAt)}</p>
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {inq.status === "pending" ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openReplyDialog(inq)}>
                      <Sparkles size={14} />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleQuickReply(inq.id)}>
                      <CheckCircle size={14} />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => openReplyDialog(inq)}>
                    답변
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDelete(inq.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크톱 테이블 */}
      <div className="hidden overflow-x-auto rounded-xl border bg-card sm:block">
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
                    {inq.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openReplyDialog(inq)}
                        >
                          <Sparkles size={14} className="mr-1" />
                          AI 답변
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickReply(inq.id)}
                        >
                          <CheckCircle size={14} className="mr-1" />
                          답변완료
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-muted-foreground"
                        onClick={() => openReplyDialog(inq)}
                      >
                        답변 보기
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

      {/* AI 답변 작성 Dialog */}
      <Dialog
        open={!!replyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReplyDialog(null);
            setReplyText("");
            setIsGenerating(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>문의 답변</DialogTitle>
          </DialogHeader>

          {replyDialog && (
            <div className="space-y-4">
              {/* 원문 */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="mb-1 font-medium">
                  {replyDialog.name} ({replyDialog.email})
                </div>
                <p className="text-muted-foreground">{replyDialog.message}</p>
              </div>

              {/* 답변 입력 */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">답변</span>
                  {replyDialog.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiGenerate}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <Loader2 size={14} className="mr-1 animate-spin" />
                      ) : (
                        <Sparkles size={14} className="mr-1" />
                      )}
                      {isGenerating ? "생성 중..." : "AI 초안 생성"}
                    </Button>
                  )}
                </div>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={6}
                  placeholder="답변을 직접 작성하거나 AI 초안을 생성하세요..."
                  className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  readOnly={replyDialog.status === "replied"}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReplyDialog(null)}>
              닫기
            </Button>
            {replyDialog?.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => handleSendReply(false)}
                  disabled={!replyText.trim() || isGenerating || isSending}
                >
                  <Send size={14} className="mr-1" />
                  저장만
                </Button>
                <Button
                  onClick={() => handleSendReply(true)}
                  disabled={!replyText.trim() || isGenerating || isSending || !replyDialog.email}
                >
                  {isSending ? (
                    <Loader2 size={14} className="mr-1 animate-spin" />
                  ) : (
                    <Mail size={14} className="mr-1" />
                  )}
                  {isSending ? "발송 중..." : "저장 + 이메일 발송"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import PageContainer from "@/components/ui/page-container";
import PageHeader from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/useAuth";
import { userFeedbackApi } from "@/lib/bkend";
import type { FeedbackCategory, FeedbackArea } from "@/types";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: "bug", label: "버그 / 오류" },
  { value: "ui", label: "UI / 디자인" },
  { value: "feature-request", label: "기능 요청" },
  { value: "performance", label: "성능 문제" },
  { value: "other", label: "기타" },
];

const AREA_OPTIONS: { value: FeedbackArea; label: string }[] = [
  { value: "dashboard", label: "대시보드" },
  { value: "checklist", label: "시작하기 체크리스트" },
  { value: "archive", label: "교육공학 아카이브" },
  { value: "activities", label: "학술활동" },
  { value: "seminars", label: "세미나" },
  { value: "courses", label: "수강과목" },
  { value: "notifications", label: "알림" },
  { value: "settings", label: "설정" },
  { value: "general", label: "전체 / 기타" },
];

const EMPTY_FORM = {
  category: "" as FeedbackCategory | "",
  area: "" as FeedbackArea | "",
  title: "",
  body: "",
  email: "",
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.category || !form.area) {
      toast.error("카테고리와 영역을 선택해주세요.");
      return;
    }
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!form.body.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await userFeedbackApi.create({
        ...(user ? { userId: user.id, userName: user.name } : {}),
        category: form.category as FeedbackCategory,
        area: form.area as FeedbackArea,
        title: form.title.trim(),
        body: form.body.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        status: "new",
        createdAt: new Date().toISOString(),
      });
      toast.success("피드백 감사합니다!");
      setSubmitted(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "오류가 발생했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setSubmitted(false);
  }

  return (
    <PageContainer width="narrow">
      <PageHeader
        icon={<MessageSquare size={20} />}
        title="피드백 보내기"
        description="서비스 개선에 도움이 되는 의견을 남겨주세요. 익명으로도 제출할 수 있습니다."
      />

      {submitted ? (
        <div className="mt-8 rounded-2xl border bg-success/5 p-8 text-center">
          <CheckCircle2 size={40} className="mx-auto mb-4 text-success" />
          <h2 className="mb-2 text-lg font-bold text-success">피드백이 전달되었습니다!</h2>
          <p className="mb-6 text-sm text-success">
            소중한 의견 감사합니다. 다음 개선에 반영하겠습니다.
          </p>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw size={14} className="mr-1.5" />
            추가 의견 작성하기
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* 카테고리 + 영역 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="category" className="text-sm font-medium">
                카테고리 <span className="text-destructive">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">선택하세요</option>
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="area" className="text-sm font-medium">
                영역 <span className="text-destructive">*</span>
              </label>
              <select
                id="area"
                name="area"
                value={form.area}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">선택하세요</option>
                {AREA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 제목 */}
          <div className="space-y-1.5">
            <label htmlFor="title" className="text-sm font-medium">
              제목 <span className="text-destructive">*</span>
            </label>
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="한 줄로 요약해주세요"
              maxLength={100}
              required
            />
          </div>

          {/* 본문 */}
          <div className="space-y-1.5">
            <label htmlFor="body" className="text-sm font-medium">
              내용 <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="body"
              name="body"
              value={form.body}
              onChange={handleChange}
              placeholder="구체적으로 작성할수록 반영에 도움이 됩니다."
              rows={5}
              maxLength={2000}
              required
            />
            <p className="text-right text-xs text-muted-foreground">
              {form.body.length} / 2000
            </p>
          </div>

          {/* 회신 이메일 (선택) */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">
              회신 이메일{" "}
              <span className="text-xs font-normal text-muted-foreground">(선택)</span>
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="답변을 받으실 이메일 주소"
            />
          </div>

          {/* 로그인 안내 */}
          {!user && (
            <p className="rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
              비로그인 상태로 익명 제출됩니다. 로그인하면 회원 정보가 자동 첨부됩니다.
            </p>
          )}

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "제출 중..." : "피드백 보내기"}
          </Button>
        </form>
      )}
    </PageContainer>
  );
}

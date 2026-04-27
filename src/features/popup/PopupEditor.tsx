"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Monitor, Smartphone } from "lucide-react";
import { popupsApi } from "@/lib/bkend";
import { useAuthStore } from "@/features/auth/auth-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  POPUP_AUDIENCE_LABELS,
  POPUP_POSITION_LABELS,
  POPUP_DISMISS_LABELS,
  type SitePopup,
  type PopupAudience,
  type PopupPosition,
  type PopupDismissDuration,
} from "@/types";
import { toast } from "sonner";
import SitePopupModal from "@/components/popup/SitePopupModal";
import { todayYmdLocal } from "@/lib/dday";

interface Props {
  popup: SitePopup | null;
  onClose: () => void;
  onSaved: () => void;
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return todayYmdLocal(d);
}

export default function PopupEditor({ popup, onClose, onSaved }: Props) {
  const { user } = useAuthStore();
  const isNew = popup === null;

  const [form, setForm] = useState({
    title: popup?.title ?? "",
    content: popup?.content ?? "",
    imageUrl: popup?.imageUrl ?? "",
    ctaLabel: popup?.ctaLabel ?? "",
    ctaUrl: popup?.ctaUrl ?? "",
    startsAt: popup?.startsAt?.slice(0, 10) ?? todayPlus(0),
    endsAt: popup?.endsAt?.slice(0, 10) ?? todayPlus(7),
    audience: popup?.audience ?? ("all" as PopupAudience),
    position: popup?.position ?? ("center" as PopupPosition),
    dismissDuration: popup?.dismissDuration ?? ("1d" as PopupDismissDuration),
    active: popup?.active ?? true,
    priority: popup?.priority ?? 0,
  });

  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        content: form.content,
        imageUrl: form.imageUrl || undefined,
        ctaLabel: form.ctaLabel || undefined,
        ctaUrl: form.ctaUrl || undefined,
        startsAt: new Date(`${form.startsAt}T00:00:00+09:00`).toISOString(),
        endsAt: new Date(`${form.endsAt}T23:59:59+09:00`).toISOString(),
        audience: form.audience,
        position: form.position,
        dismissDuration: form.dismissDuration,
        active: form.active,
        priority: Number(form.priority) || 0,
        createdBy: popup?.createdBy ?? user?.id ?? "",
      };
      return isNew ? popupsApi.create(payload) : popupsApi.update(popup!.id, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? "팝업이 생성되었습니다." : "팝업이 수정되었습니다.");
      onSaved();
    },
    onError: () => toast.error("저장에 실패했습니다."),
  });

  function handleSave() {
    if (!form.title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }
    if (!form.content.trim()) {
      toast.error("본문을 입력해주세요.");
      return;
    }
    if (form.startsAt > form.endsAt) {
      toast.error("종료일이 시작일보다 빠릅니다.");
      return;
    }
    saveMutation.mutate();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} /> 목록으로
        </button>
        <Button onClick={handleSave} disabled={saveMutation.isPending}>
          <Save size={14} className="mr-1" />
          {saveMutation.isPending ? "저장 중..." : isNew ? "생성" : "저장"}
        </Button>
      </div>

      <h1 className="text-xl font-bold">{isNew ? "새 팝업" : "팝업 편집"}</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
        {/* 편집 폼 */}
        <div className="space-y-4 rounded-xl border bg-white p-5">
          <Field label="제목" required>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 2026년 봄 신입회원 모집"
              className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="본문" required>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={4}
              placeholder="공지 내용을 입력하세요. 줄바꿈이 그대로 표시됩니다."
              className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm leading-relaxed"
            />
          </Field>

          <Field label="이미지 URL (선택)">
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
              className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="버튼 텍스트 (선택)">
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="자세히 보기"
                className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="버튼 URL">
              <input
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                placeholder="/seminars/123"
                className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일">
              <input
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="종료일">
              <input
                type="date"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="노출 대상">
            <select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value as PopupAudience })}
              className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              {Object.entries(POPUP_AUDIENCE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="노출 위치">
            <select
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value as PopupPosition })}
              className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              {Object.entries(POPUP_POSITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <Field label="닫기 옵션 (사용자가 '다시 보지 않기' 누를 때 적용 기간)">
            <select
              value={form.dismissDuration}
              onChange={(e) => setForm({ ...form, dismissDuration: e.target.value as PopupDismissDuration })}
              className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              {Object.entries(POPUP_DISMISS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="우선순위 (높을수록 먼저)">
              <input
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                className="w-full rounded-md border bg-muted/30 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="활성 상태">
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                노출 활성화
              </label>
            </Field>
          </div>
        </div>

        {/* 실시간 미리보기 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2">
            <span className="text-xs font-medium text-muted-foreground">실시간 미리보기</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPreviewMode("desktop")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
                  previewMode === "desktop" ? "bg-primary text-white" : "hover:bg-muted",
                )}
              >
                <Monitor size={12} /> PC
              </button>
              <button
                onClick={() => setPreviewMode("mobile")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
                  previewMode === "mobile" ? "bg-primary text-white" : "hover:bg-muted",
                )}
              >
                <Smartphone size={12} /> Mobile
              </button>
            </div>
          </div>

          {form.title.trim() || form.content.trim() ? (
            <SitePopupModal
              popup={{
                title: form.title || "(제목 없음)",
                content: form.content || "(본문 없음)",
                imageUrl: form.imageUrl || undefined,
                ctaLabel: form.ctaLabel || undefined,
                ctaUrl: form.ctaUrl || undefined,
                position: form.position,
                dismissDuration: form.dismissDuration,
              }}
              onClose={() => {}}
              onDismissUntil={() => {}}
              preview={previewMode}
            />
          ) : (
            <div className="flex h-[480px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              제목·본문을 입력하면 미리보기가 표시됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
